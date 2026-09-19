#!/usr/bin/env bash
# Read-only inventory; run as the normal VM user. No sudo required.
set -u

printf '\n=== Identity and OS ===\n'
hostname
whoami
cat /etc/os-release
uname -r

printf '\n=== CPU, RAM, disk, swap ===\n'
nproc
free -h
df -h /
swapon --show

printf '\n=== IPv4 addresses and routes ===\n'
ip -br -4 addr
ip -4 route

printf '\n=== Existing Kubernetes and runtime ===\n'
for binary in kubeadm kubelet kubectl containerd; do
  if command -v "$binary" >/dev/null 2>&1; then
    command -v "$binary"
    "$binary" --version 2>/dev/null || true
  fi
done
for service in containerd kubelet; do
  printf '%s: ' "$service"
  systemctl is-active "$service" 2>/dev/null || true
done

printf '\n=== Clock synchronization ===\n'
timedatectl show -p NTPSynchronized -p Timezone
