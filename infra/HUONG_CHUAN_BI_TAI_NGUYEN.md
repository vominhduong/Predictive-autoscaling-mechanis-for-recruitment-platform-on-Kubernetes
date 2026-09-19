# Hướng chuẩn bị tài nguyên cho khóa luận

Ngày lập: 19/09/2026. Căn cứ: toàn bộ 10 trang của `DeCuongKLTN_23520377_NguyenKhanhDuy_23520358_VoMinhDuong.pdf`.

Đây là kế hoạch chuẩn bị đề xuất, chưa phải cấu hình đã triển khai hoặc kết quả benchmark. Đã xác định dùng hai máy cá nhân, VMware Workstation và kết nối cùng mạng Wi-Fi. Máy A có thể dành tối đa 16 GB RAM / 8 cores; máy B khoảng 9–10 GB RAM / 4 cores. Tạm hiểu đây là ngân sách cấp cho VM, đã chừa tài nguyên cho Windows; cần giảm cấu hình nếu đó là tổng tài nguyên vật lý.

## 1. Hướng triển khai nên chốt

Xây dựng luồng: **k6 → ứng dụng microservices trên Kubernetes + Istio → Prometheus → dữ liệu → XGBoost → bộ tính số Pod → Kubernetes API**. Grafana phục vụ kiểm tra và trình bày số liệu.

Giá trị nghiên cứu cần kiểm chứng là: thông tin quan hệ gọi giữa các dịch vụ có giúp dự báo và autoscaling tốt hơn hay không. Chuẩn bị ngay ba phương án đối chứng theo trang 7 của đề cương:

1. HPA phản ứng theo CPU, với cấu hình được công bố rõ.
2. XGBoost sử dụng lịch sử riêng của từng dịch vụ.
3. XGBoost bổ sung đặc trưng quan hệ giữa các dịch vụ.

Hai phương án dự báo cần dùng cùng cách tính replicas, giới hạn và cơ chế ổn định để tách được tác dụng của đặc trưng quan hệ. Thêm dự báo giữ nguyên giá trị gần nhất làm mốc đánh giá ML.

Ưu tiên dựng môi trường đo, tạo dữ liệu và đo năng lực Pod trước khi tinh chỉnh ML. Giữ phạm vi ở dịch vụ stateless, số node cố định, XGBoost; chưa mở rộng sang GNN, reinforcement learning hay node autoscaling.

## 2. Máy tính và hạ tầng

### Giai đoạn đang triển khai: hai VM trên máy A

Theo cập nhật mới nhất của nhóm, bắt đầu bằng master 4 GB RAM và worker 8 GB RAM trên cùng máy A. Đề xuất cấp master 2 vCPU và worker 4 vCPU, tổng 12 GB RAM / 6 vCPU. Chưa triển khai các VM trên máy B ở giai đoạn này.

- Worker: `192.168.123.148/24`, user `khanhduy`, hostname `ubuntu`, Ubuntu 24.04.2 LTS, 4 vCPU, RAM 8 GB. Có bridge Docker `172.17.0.0/16` và `172.18.0.0/16`; containerd.io 2.3.3 và docker-ce 29.7.2 đang active, CRI bị tắt, không có container Docker đang chạy. UFW inactive, root còn khoảng 20 GB. Swap `/swap.img` bật trong lần kiểm tra đầu, đang chờ xác nhận sau bước chuẩn bị.
- Master: `192.168.123.134/24`, user `duy`, hostname `duy-virtual-machine`, Ubuntu 22.04.5 LTS, 2 vCPU, RAM 4 GB. Đã cài containerd 2.2.1 và runc 1.3.4 từ Ubuntu theo log người dùng; script đã qua kiểm tra swap/forwarding. Script dừng khi kiểm tra imports trong cấu hình mặc định sinh ra ở staging `/var/tmp/kltn-k8s.qX2bpC`, chưa tạo `/etc/containerd/config.toml` và chưa cài gói Kubernetes. Đã sửa helper để chỉ chặn imports có tệp thực hoặc đường dẫn tệp bắt buộc bị thiếu; chờ người dùng chép bản sửa và chạy lại. UFW inactive, root còn khoảng 6,5 GB trước lần cài runtime.
- Cả hai dùng `ens33`, gateway `192.168.123.2`, địa chỉ cấp qua DHCP. Cần giữ IP ổn định trước init và sau reboot, kiểm tra hai VM kết nối trực tiếp, runtime và firewall.
- Dự kiến Pod CIDR `10.244.0.0/16`, Service CIDR `10.96.0.0/12`, không trùng các route VM đã cung cấp; kiểm tra thêm VPN/mạng host trước khi chốt. Không dùng Calico default pool `192.168.0.0/16` vì chồng với LAN `192.168.123.0/24`.
- Chọn kubeadm + containerd; dự kiến Kubernetes nhánh 1.35, Calico nhánh 3.32 (tài liệu Calico hiện liệt kê hỗ trợ thử nghiệm Kubernetes 1.34–1.36), phù hợp bảng hỗ trợ Istio 1.31. Chốt bản patch khả dụng và lưu lại sau khi kiểm tra repository trên VM.
- Nguồn kiểm tra: [Calico requirements](https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements), [Istio supported releases](https://istio.io/latest/docs/releases/supported-releases/).
- Trạng thái: người dùng đang cài qua SSH bằng mật khẩu, master đã cài runtime nhưng chưa hoàn thành cấu hình; cluster chưa được init/join. Kết nối SSH không tương tác của agent chưa đăng nhập được bằng khóa.
- Đã chuẩn bị bộ cài trong `infra/k8s/02-install-node.sh`, bộ sửa cấu hình runtime và hướng dẫn đầy đủ `infra/k8s/02-cai-cum.md`. Đã kiểm tra logic bảo toàn cấu hình và xử lý schema containerd bằng kiểm tra cục bộ; chưa thực thi cài đặt hoặc kiểm chứng Ready trên VM.

### Phương án mở rộng sang máy B sau khi cụm cơ bản hoạt động

Các mức dưới đây là **phân bổ đề xuất cho phần cứng nhóm đã cung cấp**, chưa được kiểm chứng với tải của đề tài. Bắt đầu bằng 4 VM, tạo một cluster gồm 1 control plane và 2 worker; chỉ worker của máy A chạy ứng dụng benchmark.

| Máy vật lý | VM | vCPU | RAM | Ổ đĩa ảo đề xuất | Vai trò |
|---|---|---:|---:|---:|---|
| Máy A: ngân sách 8 cores / 16 GB | `k8s-cp` | 2 | 3 GB | 30 GB | API server, etcd, scheduler, controller manager |
| Máy A | `k8s-app` | 6 | 12 GB | 70 GB | Ứng dụng benchmark, sidecar Istio và ingress gateway |
| Máy B: ngân sách 4 cores / 9–10 GB | `k8s-infra` | 2 | 6 GB | 80 GB | Worker chạy Prometheus, Grafana, istiod, metrics components và predictive controller |
| Máy B | `loadgen` | 2 | 3 GB | 25 GB | k6, script xuất dữ liệu; nằm ngoài cluster |
| **Tổng máy A** | | **8** | **15 GB** | **100 GB** | Còn 1 GB so với ngân sách RAM cấp cho VM |
| **Tổng máy B** | | **4** | **9 GB** | **105 GB** | Không mặc định dùng được 10 GB |

Dung lượng đĩa là mức provision dự kiến, chưa gồm ISO, snapshot và dữ liệu xuất. Kiểm tra SSD trống trên từng máy trước khi tạo VM. Dùng một bản Ubuntu Server LTS còn hỗ trợ và tương thích bộ công cụ đã chọn, cài tối giản không GUI. Trong VMware, có thể đặt 1 virtual processor và số cores per processor tương ứng 2 hoặc 6; tích hai giá trị là số vCPU của VM. vCPU không phải lõi vật lý được dành riêng: vẫn phải đo cạnh tranh CPU trên host.

Cấu hình control plane đáp ứng mốc tối thiểu 2 CPU và từ 2 GB RAM trong [hướng dẫn kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/); mức RAM còn lại là dự toán cho lab này, không phải bảo đảm toàn bộ stack sẽ vừa.

**Lý do bố trí:** máy A dành phần lớn CPU/RAM cho các Pod ứng dụng. Máy B phục vụ đo đạc và phát tải. Các dịch vụ benchmark cùng ở `k8s-app`, nên giao tiếp liên dịch vụ chủ yếu không đi qua Wi-Fi giữa hai máy. Horizontal Pod Autoscaling vẫn thay đổi được số Pod trên một worker; đề tài không yêu cầu mở rộng số node. Giới hạn cần công bố: kết quả chưa đánh giá ứng dụng phân tán trên nhiều máy vật lý.

Tách vai trò bằng node labels và nodeSelector/affinity cho các Deployment, gồm Pod mới do scale tạo ra. Giữ taint mặc định của control plane. `k8s-infra` vẫn chạy các thành phần DaemonSet cần thiết của node nhưng không nhận Pod benchmark. k6 và monitoring nằm cùng máy B nên chưa hoàn toàn độc lập về CPU/đĩa; phải kiểm tra cả hai trong pilot.

### Kết nối qua Wi-Fi

- Chọn **Bridged** cho NIC của cả 4 VM, gắn bridge vào đúng card Wi-Fi đang dùng. VM cần IP riêng, có thể liên lạc hai chiều giữa hai host. [Tài liệu VMware/Broadcom](https://knowledge.broadcom.com/external/article/309842/understanding-networking-types-in-hosted.html) mô tả Bridged đưa VM vào LAN của host, còn NAT/Host-only tạo mạng riêng theo từng host.
- Cùng SSID chưa bảo đảm VM thông nhau: router có thể bật client isolation, mạng khách có thể chặn ngang, hoặc adapter/AP không hỗ trợ bridge như mong đợi. Kiểm tra thực tế trước khi cài Kubernetes.
- Bài kiểm tra đầu tiên: mỗi máy tạo một VM Linux; kiểm tra IP, ping hai chiều nếu ICMP được phép, SSH/TCP và truyền dữ liệu giữa hai VM. Kiểm tra độ trễ, mất gói và throughput vài phút, không chỉ một lần ping.
- Khi thông mạng, cấp IP cố định hoặc DHCP reservation ngoài nguy cơ trùng địa chỉ. Chọn Pod CIDR và Service CIDR không chồng với LAN, VPN hoặc mạng VMware. Kubernetes yêu cầu các node kết nối đầy đủ và Pod network không trùng host network: [hướng dẫn dựng cluster](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/).
- Khi chọn CNI, ghi rõ backend, MTU và các cổng cần mở trong firewall; chỉ cài một CNI. Kiểm tra Pod-to-Pod, DNS và ClusterIP sau khi join node. Istio không thay thế CNI mạng Pod cơ bản.
- Với lab local, đưa Istio ingress gateway ra NodePort trên IP `k8s-app`; k6 truy cập địa chỉ đó. Không dùng port-forward làm đường phát tải chính thức. Không giả định Service LoadBalancer sẽ tự có IP ngoài.
- Trong phép đo chính thức, giữ nguyên vị trí máy, nguồn điện và trạng thái Wi-Fi; dừng tải file lớn/đồng bộ nền, tắt sleep. Theo dõi độ trễ mạng và tải thực phát: latency k6 đầu cuối bao gồm cả Wi-Fi.
- Nếu bridge không hoạt động, dừng ở bước mạng để xử lý adapter/router; hai mạng NAT mặc định trên hai host không tự trở thành một mạng cluster. Phương án dự phòng là để cluster hoạt động trên máy A, máy B chỉ phát tải qua endpoint truy cập được; khi đó phải giảm stack giám sát và thử lại ngân sách RAM/CPU.

Không cần mua GPU ở bước đầu. Chọn huấn luyện XGBoost trên CPU, đo thời gian thực tế rồi mới xem xét bổ sung tài nguyên; thư viện có lựa chọn thiết bị CPU/GPU trong [tài liệu XGBoost](https://xgboost.readthedocs.io/en/stable/parameter.html).

Với VMware đã chọn, cài Kubernetes trực tiếp trong VM Linux bằng **kubeadm + containerd**, cùng một CNI tương thích. Bỏ phương án WSL2/kind khỏi kế hoạch chính. Khóa phiên bản Kubernetes, runtime, CNI và Istio sau khi xác nhận tương thích; chưa chọn số phiên bản chỉ dựa vào bản mới nhất.

Chạy XGBoost training ở một phiên riêng trên `loadgen` hoặc máy phát triển sau khi xuất dữ liệu; nếu tăng tài nguyên VM để train, phải đưa về cấu hình đo chuẩn trước run tiếp theo. Không train song song với benchmark chính thức. Khởi đầu 2–3 dịch vụ stateless được autoscale, thử khoảng 1–3 replicas mỗi dịch vụ rồi kiểm tra mức dùng và khả năng schedule; chưa chốt đây là giới hạn cuối.

Pilot bắt đầu bằng 1 replica/dịch vụ, tắt load generator có sẵn, Kiali và tracing nếu chưa dùng đến. Giới hạn retention Prometheus ban đầu khoảng 24–48 giờ, xuất dữ liệu mỗi phiên và điều chỉnh sau khi đo tốc độ tăng dung lượng. Nếu giám sát vượt ngân sách 2 vCPU/6 GB hoặc ứng dụng thiếu chỗ scale, giảm cardinality, tải hoặc phạm vi benchmark theo số đo.

Trước khi chốt quy mô tải:

- Lập bảng CPU/memory requests và limits cho ứng dụng, sidecar, giám sát, controller và thành phần nền.
- Tính ngân sách ở **số replicas tối đa**, không chỉ lúc khởi động; phải có chỗ cho Pod mới được schedule.
- Chừa tài nguyên cho hệ điều hành và công cụ phát tải. Các VM trên cùng máy vẫn dùng chung CPU, RAM, SSD và card mạng vật lý.
- Đo dung lượng Prometheus tăng mỗi ngày trước khi quyết định retention. Xuất dataset ra ngoài vòng đời cluster.
- Ghi cấu hình CPU/RAM, giới hạn VM, phiên bản phần mềm, vị trí chạy k6 và trạng thái mạng vào mỗi đợt thực nghiệm. Chỉ chốt cấu hình khi không có OOM, paging kéo dài ở host hoặc Pod Pending do hết tài nguyên trong miền tải dự định đo.

## 3. Phần mềm và ứng dụng mẫu

| Thành phần | Lựa chọn đề xuất | Đầu ra cần có |
|---|---|---|
| Nền tảng | VMware + Linux VM; kubeadm, containerd, một CNI, kubectl, Helm | Tạo lại được cluster từ cấu hình đã lưu |
| Service mesh | Istio sidecar cho bản đầu tiên | Quan sát được lời gọi HTTP/gRPC và cặp nguồn–đích |
| Giám sát | Prometheus + Grafana | Truy vấn được RPS, latency, lỗi và tài nguyên |
| Nguồn số liệu Kubernetes | Metrics Server; kube-state-metrics và số liệu kubelet/cAdvisor theo cấu hình giám sát | HPA đọc được metrics; dataset có trạng thái Pod và CPU/RAM |
| Phát tải | k6 | Script có seed, lịch tải và tỉ lệ luồng nghiệp vụ |
| Xử lý dữ liệu/ML | Python, pandas, NumPy, scikit-learn, XGBoost, PyArrow | Script xuất dữ liệu, tạo features, train và evaluate |
| Điều khiển | Python Kubernetes client | Chế độ dry-run, quyết định replicas và nhật ký |
| Tái lập | Git, manifests/Helm values, tệp khóa dependencies | Biết chính xác mã nguồn và cấu hình của từng run |

Chọn bộ Kubernetes–Istio tương thích từ [bảng hỗ trợ Istio](https://istio.io/latest/docs/releases/supported-releases/), sau đó khóa phiên bản. Không để các đợt đo tự động lấy image `latest`.

**Ứng dụng đề xuất: Google Online Boutique.** Repo có luồng xem hàng, giỏ hàng, thanh toán; các dịch vụ giao tiếp gRPC và có hướng dẫn triển khai cùng Istio. Chọn 3–5 dịch vụ stateless làm đối tượng scaling sau khi đo điểm nghẽn; vẫn triển khai các phụ thuộc cần thiết cho luồng thử nghiệm. Giữ Redis ở cấu hình cố định và theo dõi nó. Khi dùng k6, tắt load generator tích hợp để tránh tải nền không kiểm soát. Nguồn: [repo chính thức Online Boutique](https://github.com/GoogleCloudPlatform/microservices-demo).

Nếu máy quá hạn chế, dùng ứng dụng nhỏ với chuỗi gọi và nhánh gọi để kiểm tra pipeline trước; việc thay benchmark chính thức cần thống nhất với giảng viên.

Với baseline CPU, HPA thường lấy dữ liệu qua Metrics Server. Chỉ cần adapter cho custom metrics nếu chọn HPA theo chỉ số tùy chỉnh. Đề xuất controller riêng cập nhật Deployment qua scale API; không cho HPA và controller cùng ghi replicas của một workload. Xem [tài liệu HPA](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/).

## 4. Dữ liệu cần chuẩn bị

**Dataset chính nên tự thu từ đúng môi trường thực nghiệm.** Dữ liệu công khai có thể bổ sung hình dạng tải để phát lại, nhưng không thay thế được số liệu quan hệ dịch vụ, năng lực Pod và độ trễ trên hệ thống của nhóm.

Chuẩn bị ba bảng tách biệt:

| Bảng | Các trường cần có |
|---|---|
| Theo dịch vụ và thời gian | `timestamp_utc`, `run_id`, `service`, RPS, latency histogram hoặc số liệu tổng hợp, lỗi HTTP/gRPC, CPU, memory, desired/ready replicas |
| Theo cạnh của đồ thị | `timestamp_utc`, `run_id`, source/destination namespace và workload, request rate, trạng thái lỗi |
| Metadata của run | Kịch bản, seed, lịch tải, tỉ lệ nghiệp vụ, phiên bản image, requests/limits, controller, thời điểm bắt đầu/kết thúc, cấu hình SLO |

Lưu riêng kết quả k6 ở đầu vào: tải dự định phát, tải thực phát, throughput hoàn thành, latency, timeout, failed checks và dropped iterations. RPS hoàn thành tại service có thể giảm khi quá tải nên không được coi là toàn bộ nhu cầu đầu vào.

Quy ước ban đầu để thử nghiệm, có thể điều chỉnh sau pilot:

- Scrape và bước dữ liệu 15 giây; tính rate trên cửa sổ quá khứ đủ mẫu, thử 60 giây.
- Thu pilot khoảng 2 giờ để kiểm tra pipeline; sau đó lập nhiều phiên tổng 24–48 giờ với mức tải và luồng khác nhau. Đây là mốc khởi đầu, không bảo đảm đủ dữ liệu học.
- Cửa sổ đầu vào thử 5–10 phút. Chọn horizon sau khi đo thời gian từ quyết định scale đến Pod thực sự phục vụ, cộng độ trễ thu thập và suy luận; thử các mức 30/60/120 giây nếu phù hợp số đo.
- Xuất dữ liệu thô và bảng đã xử lý ra Parquet/CSV; giữ UTC và phân biệt mất dữ liệu với tải bằng 0. Prometheus hỗ trợ truy vấn theo khoảng qua [HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/).
- Với Istio, thống nhất một phía reporter, chẳng hạn `destination` khi đủ độ phủ; giữ namespace và định danh workload khi tổng hợp. Kiểm tra thiếu nhãn hoặc cạnh không quan sát được. Xử lý lỗi gRPC theo `grpc_response_status` bên cạnh lỗi HTTP. Nguồn nhãn và metrics: [Istio Standard Metrics](https://istio.io/latest/docs/reference/config/metrics/).
- Đo latency đầu cuối tại k6/gateway; không cộng p95 của các service. Lưu histogram khi cần tính lại percentile.
- Chia train/validation/test theo thời gian và phiên phát tải, có khoảng cách phù hợp horizon; không random split các hàng gần nhau. Chỉ dùng thông tin đã có ở thời điểm quyết định; fit mọi phép biến đổi từ train.
- Chỉ bổ sung đặc trưng giờ/ngày khi dữ liệu thật sự có nhiều chu kỳ tương ứng. Một vài giờ phát tải nhân tạo chưa đủ chứng minh quy luật theo tuần.

## 5. Tài nguyên thực nghiệm cần có trước mô hình ML

1. **Bảng năng lực Pod:** đo RPS phục vụ được dưới mục tiêu latency với requests/limits cố định. Giữ downstream đủ năng lực khi khảo sát một service, và kiểm tra lại dưới nhiều tỉ lệ nghiệp vụ.
2. **Bảng độ trễ scale:** timestamp quyết định, tạo Pod, scheduled, ready và bắt đầu nhận traffic; phân biệt trường hợp image có sẵn và phải pull.
3. **Quy tắc SLO:** ngưỡng latency, phần trăm request cần đạt, cửa sổ đánh giá; chốt sau pilot và trước chạy so sánh chính thức. Báo riêng lỗi và timeout.
4. **Bộ tải:** ổn định, tăng dần, dao động/chu kỳ, spike, thay đổi tỉ lệ xem hàng–giỏ hàng–thanh toán. Với thay đổi tỉ lệ nghiệp vụ, cố gắng giữ tổng tốc độ giao dịch đầu vào để kiểm tra đóng góp của đồ thị.
5. **Ma trận đối chứng:** ba controller × năm nhóm tải × ít nhất ba lần lặp ban đầu = 45 run đánh giá, chưa tính thu dữ liệu và hiệu chỉnh. Chạy pilot ngắn để dự toán thời gian.

Đề xuất dùng k6 arrival-rate để tốc độ bắt đầu giao dịch ít phụ thuộc thời gian phản hồi. Arrival rate là số iteration/giao dịch mỗi đơn vị thời gian, chỉ bằng HTTP RPS nếu mỗi iteration có đúng một request; luôn ghi số request thực phát. Cơ chế này được mô tả trong [tài liệu mô hình tải k6](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/).

Khi cùng một cụm nhỏ, chạy các phương án lần lượt, reset trạng thái, warm-up nhất quán và thay đổi thứ tự chạy giữa các lần lặp. Chạy đồng thời trên hạ tầng dùng chung có thể khiến chúng tranh tài nguyên. Đề cương trang 6 ghi “song song”; cần làm rõ đây là so sánh đối chứng hay bắt buộc chạy đồng thời.

Thu MAE/RMSE, quy tắc MAPE khi tải gần 0, latency đầu cuối p95/p99, tỉ lệ request vượt ngưỡng, tỉ lệ cửa sổ vi phạm SLO, CPU/RAM cấp phát và sử dụng, replica-seconds, số lần scaling, overhead giám sát và ML. Không giả định dự báo sẽ đoán được spike ngẫu nhiên không có tín hiệu báo trước; cần đánh giá cả trường hợp này và cơ chế dự phòng.

## 6. Tài liệu nên đọc theo thứ tự

| Ưu tiên | Tài liệu | Câu hỏi cần trả lời sau khi đọc |
|---|---|---|
| 1 | Tài liệu HPA, Istio metrics, Prometheus API và k6 đã dẫn ở trên | Đo bằng gì, scale theo gì, dữ liệu có bị đếm trùng hoặc sai tải không? |
| 2 | XGBoost parameters và cách đánh giá chuỗi thời gian | Target/horizon là gì, features nào có sẵn ở thời điểm dự báo? |
| 3 | Bài [2], [3] trong đề cương | HPA thích nghi thế nào, tác giả đo nhu cầu tài nguyên ra sao? |
| 4 | PBScaler [7], GRAF [6], FIRM [8] trong đề cương | Cách dùng quan hệ dịch vụ, nhận diện bottleneck và đánh giá SLO |

Lập bảng đọc bài với các cột: bài báo, dữ liệu, đầu vào, đầu ra, baseline, hạ tầng, chỉ số đánh giá, mã nguồn, giới hạn và ý tưởng có thể áp dụng. Các bài báo ở đây được lấy từ danh mục đề cương; chưa kiểm chứng lại toàn bộ metadata hoặc khả năng truy cập. Đặc biệt, chính đề cương đánh dấu [4] chưa xác minh nơi công bố/DOI, nên chưa dùng làm căn cứ chính cho kết luận.

## 7. Kế hoạch chuẩn bị hai tuần đầu

| Thời điểm | Việc làm | Điều kiện hoàn thành |
|---|---|---|
| Ngày 1–2 | Tạo hai VM thử Bridged qua Wi-Fi; xác nhận ngân sách guest và SSD; chọn benchmark | VM liên lạc được qua hai máy, có bảng tài nguyên và phạm vi dịch vụ |
| Ngày 3–4 | Dựng Kubernetes, ứng dụng và Istio | Một luồng nghiệp vụ chạy thành công, thấy cạnh nguồn–đích |
| Ngày 5–7 | Prometheus, Grafana, Metrics Server, k6 tải nhẹ | Có RPS, latency, CPU/RAM và replicas trên cùng timeline |
| Ngày 8–10 | Đo năng lực Pod, thời gian scale; kiểm tra HPA | Có bảng đo pilot và SLO/horizon đề xuất |
| Ngày 11–14 | Xuất dataset pilot, kiểm tra thiếu/trùng dữ liệu và chia tập | Có dataset đọc được, metadata đầy đủ và báo cáo chất lượng |

Phân công đề xuất cho nhóm hai người: một người phụ trách cluster, mesh, giám sát và tích hợp controller; người còn lại phụ trách k6, dataset, ML và đánh giá. Cả hai cùng chốt schema dữ liệu và SLO ngay từ đầu; kiểm tra chéo bằng cách chạy lại một thí nghiệm của nhau.

Mốc 21/09–18/12/2026 trong đề cương tương ứng gần 13 tuần, trong khi biểu đồ trang 9 có 15 tuần. Nên xác nhận mốc nộp với giảng viên. Tạm lập kế hoạch 13 tuần: tuần 1–2 hạ tầng/pilot; 3–4 dữ liệu; 5–6 ML; 7–8 controller; 9–11 đối chứng; 12–13 phân tích và hoàn thiện. Viết báo cáo và lưu bằng chứng xuyên suốt.

## 8. Checklist để bắt đầu triển khai

- [x] Xác định môi trường: hai máy cá nhân, VMware Workstation, cùng mạng Wi-Fi.
- [ ] Xác nhận 16 GB và 9–10 GB là RAM dành cho VM; kiểm tra SSD và CPU thực tế.
- [ ] Kiểm tra kết nối Bridged giữa hai máy trước khi dựng cluster.
- [ ] Chọn benchmark, luồng nghiệp vụ và dịch vụ được autoscale.
- [ ] Chốt các phiên bản tương thích và lưu manifests/values.
- [ ] Chốt schema, nhãn định danh, timestamp UTC và thư mục lưu dataset.
- [ ] Chạy pilot chứng minh thu được cả metrics dịch vụ và quan hệ nguồn–đích.
- [ ] Đo năng lực Pod và độ trễ scale trước khi chọn horizon.
- [ ] Chốt SLO và ma trận đối chứng trước thí nghiệm chính thức.

Gợi ý cấu trúc khi bắt đầu viết mã: `infra/`, `workloads/`, `loadtests/`, `collector/`, `ml/`, `controller/`, `experiments/`, `data/raw/`, `data/processed/`, `results/`, `docs/`. Dữ liệu lớn và model artifacts lưu riêng, Git giữ mã, cấu hình và metadata cần tái lập.
