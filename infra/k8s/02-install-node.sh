#!/usr/bin/env bash
# Usage: sudo bash 02-install-node.sh master|worker [exact-apt-package-version]
# Fresh-node installation only. Does not init/join or remove Docker data.
set -euo pipefail
trap 'echo "STOP: command failed at line $LINENO. Send the error before continuing." >&2' ERR

[[ $EUID -eq 0 ]] || { echo 'Run with sudo bash.'; exit 1; }
role=${1:-}
requested_version=${2:-}
case "$role" in
  master) expected_ip=192.168.123.134 ;;
  worker) expected_ip=192.168.123.148 ;;
  *) echo 'Specify master or worker.'; exit 1 ;;
esac
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
test -f "$script_dir/configure_runtime.py"
. /etc/os-release
[[ $ID == ubuntu && ( $VERSION_ID == 22.04 || $VERSION_ID == 24.04 ) ]] || {
  echo 'This installer is for the two inspected Ubuntu VMs only.'; exit 1;
}
ip -4 -o addr show dev ens33 | grep -Fq " $expected_ip/" || {
  echo "Expected $expected_ip on ens33. Check DHCP/IP before continuing."; exit 1;
}
if [[ -f /etc/kubernetes/kubelet.conf || -f /etc/kubernetes/admin.conf ]]; then
  echo 'Existing Kubernetes node detected; refusing fresh installation.'; exit 1
fi
if [[ -n $(swapon --noheadings --show) ]]; then
  echo 'Swap is still enabled. Complete step 1 first.'; exit 1
fi
[[ $(sysctl -n net.ipv4.ip_forward) == 1 ]] || {
  echo 'IPv4 forwarding is disabled. Complete step 1 first.'; exit 1;
}
if systemctl is-active --quiet docker; then
  running=$(docker ps -q)
  [[ -z $running ]] || {
    echo 'Docker has running containers. Stop and inspect before changing runtime.'; exit 1;
  }
fi

apt-get update
apt-get install -y ca-certificates curl gpg python3-toml
if ! command -v containerd >/dev/null 2>&1; then
  apt-get install -y containerd
fi
runtime_major=$(containerd --version | sed -E 's/.* v?([0-9]+)\.[0-9]+\.[0-9]+.*/\1/')
[[ $runtime_major =~ ^[12]$ ]] || { echo 'Unexpected containerd version.'; exit 1; }

# Staging directory may contain runtime configuration; keep it root-only.
stage=$(mktemp -d /var/tmp/kltn-k8s.XXXXXX)
echo "Configuration backup/staging directory: $stage"
install -d -m 755 /etc/containerd
had_config=false
if [[ -f /etc/containerd/config.toml ]]; then
  cp -a /etc/containerd/config.toml "$stage/config.before.toml"
  had_config=true
  echo 'Source: existing /etc/containerd/config.toml (backup saved).'
else
  containerd config default > "$stage/config.before.toml"
  echo 'Source: generated default template; /etc/containerd/config.toml does not exist yet.'
fi
python3 "$script_dir/configure_runtime.py" "$stage/config.before.toml" \
  "$stage/config.after.toml" "$runtime_major"
containerd --config "$stage/config.after.toml" config dump > "$stage/config.effective.toml"
install -m 600 "$stage/config.after.toml" /etc/containerd/config.toml
systemctl enable containerd
if ! systemctl restart containerd; then
  echo "Runtime restart failed. See journalctl -u containerd. Backup: $stage"
  if [[ $had_config == true ]]; then
    cp -a "$stage/config.before.toml" /etc/containerd/config.toml
    systemctl restart containerd || true
  fi
  exit 1
fi

install -d -m 755 /etc/apt/keyrings
curl --fail --show-error --location --retry 3 \
  https://pkgs.k8s.io/core:/stable:/v1.35/deb/Release.key -o "$stage/kubernetes.key"
gpg --batch --yes --dearmor -o "$stage/kubernetes.gpg" "$stage/kubernetes.key"
install -m 644 "$stage/kubernetes.gpg" /etc/apt/keyrings/kltn-kubernetes.gpg
repo=/etc/apt/sources.list.d/kltn-kubernetes.list
[[ ! -f $repo ]] || cp -a "$repo" "$stage/kubernetes.list.before"
printf '%s\n' 'deb [signed-by=/etc/apt/keyrings/kltn-kubernetes.gpg] https://pkgs.k8s.io/core:/stable:/v1.35/deb/ /' > "$repo"
apt-get update
if [[ -z $requested_version ]]; then
  requested_version=$(apt-cache madison kubeadm | awk '$3 ~ /^1\.35\./ {if (!v) v=$3} END {print v}')
fi
[[ $requested_version =~ ^1\.35\.[0-9]+-[0-9.]+$ ]] || {
  echo 'No valid 1.35 package version. Inspect apt-cache madison kubeadm.'; exit 1;
}
apt-get install -y "kubeadm=$requested_version" "kubelet=$requested_version" "kubectl=$requested_version" cri-tools
apt-mark hold kubeadm kubelet kubectl cri-tools
systemctl enable kubelet

crictl --runtime-endpoint unix:///run/containerd/containerd.sock info > "$stage/cri-info.json"
python3 - "$stage/cri-info.json" <<'PY'
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
conditions = {c['type']: c['status'] for c in data['status']['conditions']}
if conditions.get('RuntimeReady') is not True:
    raise SystemExit('CRI is reachable but RuntimeReady is not true.')
print('CRI RuntimeReady=true. NetworkReady may be false before installing CNI.')
PY

install -d -m 755 /var/lib/kltn-setup
printf '%s\n' "$requested_version" > /var/lib/kltn-setup/kubernetes-package-version
echo "NODE PACKAGES READY: role=$role ip=$expected_ip"
echo "K8S_PACKAGE_VERSION=$requested_version"
containerd --version
kubeadm version -o short
df -h /
