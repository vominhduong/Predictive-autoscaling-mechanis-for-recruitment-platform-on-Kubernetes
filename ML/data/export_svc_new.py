#!/usr/bin/env python3
"""Export recruitment service metrics to svc.csv (Python standard library only).

CPU/RAM exclude istio-proxy by default. CPU/RAM are totals across replicas.
Pod mapping assumes Deployment pods named SERVICE-REPLICASETHASH-SUFFIX.
Missing/nonfinite values remain blank. HTTP errors cover only HTTP 5xx.
"""

import argparse
import csv
import json
import math
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urlencode
from urllib.request import urlopen


SERVICES = [
    "auth-service",
    "user-service",
    "job-service",
    "application-service",
    "notification-service",
    "api-gateway",
    "frontend",
]


def queries(namespace, window, include_sidecar):
    names = "|".join(SERVICES)
    istio = (
        f'reporter="destination",destination_workload_namespace="{namespace}",'
        f'destination_workload=~"{names}"'
    )

    def request_rate(extra=""):
        return (
            "sum by (destination_workload) (rate(istio_requests_total"
            f"{{{istio}{extra}}}[{window}]))"
        )

    def rename(q, source):
        return f'label_replace(({q}), "service", "$1", "{source}", "(.*)")'

    rps = request_rate()
    errors = request_rate(',response_code=~"5.."')
    error_zero = f"({errors}) or (0 * ({rps}))"
    result = {"rps": rename(rps, "destination_workload")}

    for percentile, name in [
        (0.5, "latency_p50_ms"),
        (0.95, "latency_p95_ms"),
    ]:
        q = (
            f"histogram_quantile({percentile}, "
            "sum by (le, destination_workload) "
            "(rate(istio_request_duration_milliseconds_bucket"
            f"{{{istio}}}[{window}])))"
        )
        result[name] = rename(q, "destination_workload")

    result["http_5xx_rps"] = rename(error_zero, "destination_workload")
    result["http_5xx_error_rate"] = rename(
        f"({error_zero}) / ({rps})",
        "destination_workload",
    )

    containers = (
        f'job="kubernetes-nodes-cadvisor",namespace="{namespace}",'
        f'pod=~"({names})-[a-z0-9]+-[a-z0-9]+",container!="",container!="POD"'
    )
    if not include_sidecar:
        containers += ',container!="istio-proxy"'

    def resource(q):
        return (
            f'sum by (service) (label_replace(({q}), "service", "$1", '
            '"pod", "(.*)-[a-z0-9]+-[a-z0-9]+"))'
        )

    result["cpu_cores_total"] = resource(
        f"rate(container_cpu_usage_seconds_total{{{containers}}}[{window}])"
    )
    result["memory_mib_total"] = (
        resource(f"container_memory_working_set_bytes{{{containers}}}")
        + " / 1024 / 1024"
    )

    # Optional: needs kube-state-metrics. max deduplicates exporter copies.
    replicas = (
        "max by (deployment) (kube_deployment_status_replicas_available"
        f'{{namespace="{namespace}",deployment=~"{names}"}})'
    )
    result["replicas_available"] = rename(replicas, "deployment")

    return result


def parse_time(value):
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        raise ValueError("Thời gian phải có múi giờ, ví dụ +07:00 hoặc Z.")

    return int(dt.timestamp())


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--url", default="http://192.168.110.156:30090")
    p.add_argument("--namespace", default="recruitment")
    p.add_argument("--hours", type=float, default=1)
    p.add_argument(
        "--step",
        type=int,
        default=30,
        help="Khoảng cách điểm xuất, giây",
    )
    p.add_argument("--window", default="2m", help="Cửa sổ tính rate và latency")
    p.add_argument("--start", help="ISO timestamp có múi giờ")
    p.add_argument("--end", help="ISO timestamp có múi giờ")
    p.add_argument("--include-sidecar", action="store_true")
    p.add_argument("--output", default="svc.csv")
    a = p.parse_args()

    if a.step <= 0 or a.hours <= 0:
        p.error("--step và --hours phải lớn hơn 0")
    if bool(a.start) != bool(a.end):
        p.error("Cần cung cấp cả --start và --end")

    end = parse_time(a.end) if a.end else int(time.time()) // a.step * a.step
    start = parse_time(a.start) if a.start else end - int(a.hours * 3600)
    if start >= end:
        p.error("--start phải nhỏ hơn --end")

    qs = queries(a.namespace, a.window, a.include_sidecar)
    data = {}
    observed = set()

    for column, query in qs.items():
        params = urlencode(dict(query=query, start=start, end=end, step=a.step))
        url = a.url.rstrip("/") + "/api/v1/query_range?" + params

        # Abort on query/connection errors; do not overwrite output with partial results.
        with urlopen(url, timeout=90) as response:
            payload = json.load(response)

        if payload.get("status") != "success":
            raise RuntimeError(f'{column}: {payload.get("error", payload)}')

        for warning in payload.get("warnings", []):
            print(f"WARNING {column}: {warning}", file=sys.stderr)

        series_list = payload["data"]["result"]
        print(f"{column}: {len(series_list)} series")
        if not series_list:
            print(
                f"WARNING: {column} không có dữ liệu; cột sẽ để trống.",
                file=sys.stderr,
            )

        for series in series_list:
            service = series["metric"].get("service")
            if service not in SERVICES:
                continue

            observed.add(service)
            for ts, raw in series["values"]:
                key = (int(float(ts)), service)
                if column in data.get(key, {}):
                    raise RuntimeError(f"Trùng series {column}: {key}")

                value = float(raw)
                data.setdefault(key, {})[column] = (
                    value if math.isfinite(value) else ""
                )

    if not observed:
        raise RuntimeError(
            "Không có metric nào; kiểm tra URL, namespace và khoảng thời gian."
        )

    fields = ["timestamp_utc", "service", *qs]
    with open(a.output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()

        # Full time grid for observed services makes missing data explicit.
        for ts in range(start, end + 1, a.step):
            for service in sorted(observed):
                writer.writerow(
                    dict(
                        timestamp_utc=datetime.fromtimestamp(
                            ts, timezone.utc
                        ).isoformat(),
                        service=service,
                        **data.get((ts, service), {}),
                    )
                )

    print(f"Đã lưu: {a.output}; {len(observed)} service; thời gian UTC.")
    print("CPU/RAM là tổng các replica. users phải lấy riêng từ Locust.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"LỖI: {exc}", file=sys.stderr)
        sys.exit(1)
