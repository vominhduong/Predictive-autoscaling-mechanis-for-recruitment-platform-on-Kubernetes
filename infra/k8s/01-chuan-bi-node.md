# Bước 1: chuẩn bị hai VM trước khi cài runtime và khởi tạo cụm

Trạng thái: hướng dẫn để người dùng chạy qua SSH; chưa xác nhận thực thi trên VM.

| Node | SSH | OS | CPU/RAM |
|---|---|---|---|
| Master | `duy@192.168.123.134` | Ubuntu 22.04.5 | 2 vCPU / 4 GB |
| Worker | `khanhduy@192.168.123.148` | Ubuntu 24.04.2 | 4 vCPU / 8 GB |

Giữ hai hostname hiện có vì chúng đã khác nhau. Cả hai IP hiện lấy qua DHCP, cần giữ nguyên hoặc thiết lập reservation phù hợp trước khi init cluster. Chưa đổi Netplan từ xa khi chưa kiểm tra cấu hình mạng VMware.

Trên master, kiểm tra đường tới worker:

```bash
ping -c 3 192.168.123.148
```

Trên worker, kiểm tra đường tới master:

```bash
ping -c 3 192.168.123.134
```

Nếu ICMP bị chặn, cần kiểm tra TCP/SSH thay vì kết luận mất kết nối chỉ từ ping.

## Chạy trên cả hai VM

Khối sau tắt swap hiện tại và comment các mục swap trong fstab, sau khi sao lưu fstab. Không xóa file swap. Thiết lập module và forwarding cho mạng Pod. Khối chạy trong Bash riêng, dừng nếu có lỗi.

```bash
bash <<'PREPARE'
set -euo pipefail
sudo -v
if sudo test -f /etc/kubernetes/kubelet.conf; then
  echo 'Node đã có cấu hình Kubernetes. Dừng để kiểm tra trước.'
  exit 1
fi

sudo cp -a /etc/fstab "/etc/fstab.before-k8s-$(date +%Y%m%d-%H%M%S)"
sudo swapoff -a
sudo sed -i '/^[^#].*[[:space:]]swap[[:space:]]/s/^/# /' /etc/fstab

sudo modprobe overlay
sudo modprobe br_netfilter
printf 'overlay\nbr_netfilter\n' | sudo tee /etc/modules-load.d/kltn-k8s.conf
sudo tee /etc/sysctl.d/99-kltn-k8s.conf >/dev/null <<'SYSCTL'
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
SYSCTL
sudo sysctl -p /etc/sysctl.d/99-kltn-k8s.conf

sudo apt-get update
sudo apt-get install -y ca-certificates curl gpg
echo 'Hoàn tất chuẩn bị cơ bản.'
swapon --show
PREPARE
```

Chỉ tiếp tục nếu có dòng hoàn tất và `swapon --show` không còn liệt kê swap. Chưa cài hoặc thay đổi containerd/Docker trong bước này.

## Thu thông tin runtime trên cả hai VM

```bash
hostname
containerd --version
dpkg-query -W -f='${Package} ${Version}\n' containerd containerd.io docker.io docker-ce 2>/dev/null
sudo systemctl is-active containerd docker
sudo grep -nE 'disabled_plugins|SystemdCgroup|imports' /etc/containerd/config.toml
sudo ufw status
df -h /
```

Lệnh báo chưa tìm thấy containerd hoặc config là thông tin cần ghi lại, không tự tạo/ghi đè config ở bước này. Riêng worker có Docker, chạy thêm:

```bash
sudo docker ps --format 'table {{.Names}}\t{{.Status}}'
```

Gửi kết quả runtime của hai node và lỗi nếu bước chuẩn bị thất bại. Dựa vào đó chọn đúng gói containerd, bật CRI và systemd cgroup mà không ghi đè mù cấu hình Docker. Sau đó cài cùng bản kubeadm/kubelet/kubectl, init master, cài Calico với pool riêng và join worker.

Pod CIDR dự kiến `10.244.0.0/16`, Service CIDR `10.96.0.0/12`; không dùng pool Calico `192.168.0.0/16` vì chồng mạng VM. Vẫn cần kiểm tra mạng VPN/host trước khi khởi tạo.

Nguồn: [cài kubeadm 1.35](https://v1-35.docs.kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/), [container runtimes](https://v1-35.docs.kubernetes.io/docs/setup/production-environment/container-runtimes/).
