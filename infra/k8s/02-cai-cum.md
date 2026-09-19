# Cài cụm Kubernetes hai VM

Trạng thái: đã chuẩn bị bộ cài, chưa thực thi hoặc xác nhận Ready trên VM. Người dùng chạy qua phiên SSH của mình. Giữ Docker hiện có trên worker; không xóa image, container, volume hoặc dữ liệu Docker.

| Node | SSH | CPU/RAM | Runtime trước cài |
|---|---|---|---|
| Master | `duy@192.168.123.134` | 2 vCPU / 4 GB | Chưa có |
| Worker | `khanhduy@192.168.123.148` | 4 vCPU / 8 GB | containerd.io 2.3.3, CRI bị tắt; Docker active, không có container chạy |

Master còn 6,5 GB đĩa, worker còn 20 GB. Master có ít chỗ dự phòng cho images/logs. Nên tăng đĩa master lên khoảng 40 GB trước giai đoạn chạy dài; mở rộng ổ ảo VMware chưa tự mở rộng partition/filesystem. Chưa hướng dẫn grow partition khi chưa có `lsblk -f`. Có thể thử cài cụm cơ bản trước nhưng phải theo dõi `df -h /`; không cài monitoring/dataset lên master.

## 1. Điều kiện trước khi chạy

- Đã hoàn thành `01-chuan-bi-node.md`: swap tắt, kernel modules và forwarding đã cấu hình. Script sẽ kiểm tra swap và IPv4 forwarding.
- Hai VM kết nối được hai chiều. UFW đang inactive theo kết quả đã gửi; không cần tắt thêm firewall nào.
- Giữ `.134` và `.148` ổn định qua DHCP reservation hoặc IP tĩnh đã kiểm tra trước khi init. Không đổi IP master sau khi init tùy ý.
- Pod CIDR `10.244.0.0/16` và Service CIDR `10.96.0.0/12` không được trùng mạng VPN/host khác. Chúng không trùng các route VM đã gửi.
- Đây là lần cài mới. Script từ chối node đã có `kubelet.conf`/`admin.conf`; không dùng `kubeadm reset` để vượt qua lỗi.

## 2. Chép bộ cài từ Windows

Chạy trong PowerShell của Windows:

```powershell
scp -r D:/KLTN/infra/k8s duy@192.168.123.134:~/kltn-k8s
scp -r D:/KLTN/infra/k8s khanhduy@192.168.123.148:~/kltn-k8s
```

Các lệnh trên giả định thư mục đích chưa tồn tại. Nếu đã chép trước đó, dùng `scp D:/KLTN/infra/k8s/* USER@IP:~/kltn-k8s/` để cập nhật trực tiếp, tránh lồng thư mục `k8s`.

## 3. Cài runtime và gói Kubernetes

Trên master, chạy trước:

```bash
cd ~/kltn-k8s
sudo bash 02-install-node.sh master
```

Script cài containerd từ Ubuntu nếu chưa có. Trên worker, script giữ gói containerd.io đang dùng. Cả hai được bật CRI và `SystemdCgroup=true` theo đúng schema cấu hình; có backup và giữ các giá trị cấu hình khác. Nếu imports khớp tệp cấu hình thực hoặc có runtime tùy chỉnh, script dừng và chỉ rõ để kiểm tra. Mẫu import wildcard chưa khớp tệp nào được giữ nguyên và không chặn cài đặt.

Nếu `/etc/containerd/config.toml` chưa tồn tại, `config.before.toml` trong thư mục staging là bản sinh từ `containerd config default`, không phải bản sao của tệp đang có. Khi helper dừng trước bước install, tệp cấu hình chính vẫn chưa được tạo. Lỗi này không liên quan tới thư mục làm việc của terminal.

Khi thành công, master in `NODE PACKAGES READY` và `K8S_PACKAGE_VERSION=...`. Dùng chính giá trị phiên bản đó làm tham số thứ hai trên worker:

```bash
cd ~/kltn-k8s
sudo bash 02-install-node.sh worker PHIEN_BAN_TU_MASTER
```

Thay `PHIEN_BAN_TU_MASTER` bằng giá trị thật, không gõ nguyên placeholder. Ví dụ cấu trúc phiên bản là `1.35.x-1.1`; không tự dùng chữ `x`.

Kiểm tra kết quả trên mỗi node:

```bash
sudo crictl --runtime-endpoint unix:///run/containerd/containerd.sock info
cat /var/lib/kltn-setup/kubernetes-package-version
```

`RuntimeReady` phải là `true`. `NetworkReady=false` trước khi cài CNI là bình thường. Kubelet có thể chưa hoạt động ổn định trước init/join; không coi riêng trạng thái này là lỗi runtime.

## 4. Khởi tạo master

Chỉ chạy trên master, sau khi cả hai node đã cài gói thành công và hai phiên bản Kubernetes giống nhau:

```bash
sudo kubeadm init \
  --kubernetes-version="$(kubeadm version -o short)" \
  --apiserver-advertise-address=192.168.123.134 \
  --control-plane-endpoint=192.168.123.134:6443 \
  --node-name=duy-virtual-machine \
  --pod-network-cidr=10.244.0.0/16 \
  --service-cidr=10.96.0.0/12 \
  --cri-socket=unix:///run/containerd/containerd.sock
```

Nếu lỗi, dừng và gửi phần báo lỗi; không chạy lại init/reset liên tục. Khi có `Your Kubernetes control-plane has initialized successfully!`, chạy bằng user `duy`:

```bash
mkdir -p "$HOME/.kube"
if [ -f "$HOME/.kube/config" ]; then
  cp -p "$HOME/.kube/config" "$HOME/.kube/config.before-kltn-$(date +%Y%m%d-%H%M%S)"
fi
sudo install -m 600 -o "$(id -u)" -g "$(id -g)" \
  /etc/kubernetes/admin.conf "$HOME/.kube/config"
kubectl get nodes -o wide
```

Master có thể `NotReady` vì chưa có mạng Pod. Giữ taint control plane mặc định để ứng dụng không được schedule lên master.

## 5. Join worker

Trên master, tạo lệnh join hiệu lực một giờ:

```bash
sudo kubeadm token create --ttl 1h --print-join-command
```

Copy lệnh được in ra và chạy trên worker với `sudo`, thêm cuối lệnh:

```text
--cri-socket=unix:///run/containerd/containerd.sock --node-name=ubuntu
```

Ví dụ hình thức, KHÔNG chạy nguyên placeholder:

```text
sudo kubeadm join 192.168.123.134:6443 --token TOKEN_THAT --discovery-token-ca-cert-hash sha256:HASH_THAT --cri-socket=unix:///run/containerd/containerd.sock --node-name=ubuntu
```

Giữ token trong hai terminal, không lưu vào Git hoặc gửi lên chat. Nếu token hết hạn, tạo lại trên master bằng lệnh trên.

## 6. Cài Calico trên master

Dùng Calico 3.32.2 operator, dataplane iptables + VXLAN, tắt BGP; pool và interface được cấu hình trong `calico-installation.yaml`. Chỉ tạo Installation cơ bản, chưa bật API server/UI/flow collector tùy chọn.

Trên master:

```bash
cd ~/kltn-k8s
curl -fL --retry 3 -o calico-crds-v3.32.2.yaml \
  https://raw.githubusercontent.com/projectcalico/calico/v3.32.2/manifests/v1_crd_projectcalico_org.yaml
curl -fL --retry 3 -o tigera-operator-v3.32.2.yaml \
  https://raw.githubusercontent.com/projectcalico/calico/v3.32.2/manifests/tigera-operator.yaml
```

Chỉ chạy phần sau khi cả hai lệnh tải đều thành công:

```bash
kubectl create -f calico-crds-v3.32.2.yaml
kubectl create -f tigera-operator-v3.32.2.yaml
kubectl wait --for=condition=Established \
  crd/installations.operator.tigera.io --timeout=120s
kubectl apply -f calico-installation.yaml
```

Nếu `kubectl create` báo AlreadyExists do chạy lại, kiểm tra resource và tiếp tục từ bước còn thiếu, không xóa CRD của cluster.

## 7. Kiểm tra cụm

Trên master:

```bash
kubectl wait --for=condition=Ready nodes --all --timeout=300s
kubectl get nodes -o wide
kubectl get pods -A -o wide
kubectl get tigerastatus
```

Mục tiêu: đúng 2 node `duy-virtual-machine` và `ubuntu` đều Ready; Pod hệ thống không CrashLoopBackOff/Pending kéo dài; Calico Available=true, Degraded=false. Nếu tải image chậm có thể cần thêm thời gian, nhưng phải kiểm tra events thay vì mặc định coi cụm đã xong:

```bash
kubectl get events -A --sort-by=.metadata.creationTimestamp | tail -n 30
```

Kiểm tra DNS + Service trên worker bằng hai Pod tạm trong namespace riêng:

```bash
kubectl create namespace kltn-smoke
kubectl -n kltn-smoke create deployment web --image=nginx:1.28-alpine
kubectl -n kltn-smoke expose deployment web --port=80
kubectl -n kltn-smoke rollout status deployment/web --timeout=180s
kubectl -n kltn-smoke run client --image=busybox:1.37 --restart=Never \
  --command -- sh -c 'nslookup kubernetes.default.svc.cluster.local && wget -qO- http://web'
kubectl -n kltn-smoke wait --for=jsonpath='{.status.phase}'=Succeeded pod/client --timeout=120s
kubectl -n kltn-smoke logs client
```

Sau khi thành công, xóa đúng namespace kiểm thử này:

```bash
kubectl delete namespace kltn-smoke
```

Phép thử này xác nhận DNS và Service với ứng dụng chạy trên worker, chưa phải kiểm thử đầy đủ traffic ứng dụng giữa nhiều worker. Gửi `kubectl get nodes -o wide`, `kubectl get pods -A` và kết quả smoke test để xác nhận trước khi chuyển sang Istio/monitoring.

## Nguồn kỹ thuật

- [Kubeadm 1.35](https://v1-35.docs.kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/)
- [Tạo cụm bằng kubeadm](https://v1-35.docs.kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)
- [Containerd CRI và cgroup](https://github.com/containerd/containerd/blob/main/docs/cri/config.md)
- [Calico operator trên on-premises](https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises)
