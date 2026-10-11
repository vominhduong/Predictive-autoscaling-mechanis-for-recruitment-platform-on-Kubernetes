"""Prepare application load data using public APIs; Python standard library only."""
import argparse
import base64
import json
import math
import os
import secrets
import time
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError


def plan(mode, rate, duration):
    if rate <= 0 or duration <= 0 or not float(rate).is_integer():
        raise ValueError('rate phải là số nguyên dương và duration phải > 0')
    if mode == 'smoke':
        return 1, 0
    if mode == 'constant':
        return math.ceil(rate * duration) + 1, duration
    # 60s 1→2, 60s 2→5, hold 5, 60s 5→1
    return math.ceil(480 + 5 * duration) + 1, duration + 180


def pdf():
    stream = b'BT /F1 12 Tf 50 750 Td (Synthetic Candidate - Load Test CV) Tj ET'
    objects = [b'<< /Type /Catalog /Pages 2 0 R >>',
               b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
               b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
               b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
               b'<< /Length ' + str(len(stream)).encode() + b' >>\nstream\n' + stream + b'\nendstream']
    data = b'%PDF-1.4\n'; offsets = [0]
    for i, obj in enumerate(objects, 1):
        offsets.append(len(data)); data += f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n'
    start = len(data)
    data += b'xref\n0 6\n0000000000 65535 f \n'
    data += b''.join(f'{o:010d} 00000 n \n'.encode() for o in offsets[1:])
    return data + f'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{start}\n%%EOF\n'.encode()


class API:
    def __init__(self, base): self.base = base.rstrip('/')
    def call(self, method, path, body=None, token=None, content_type='application/json'):
        headers = {'Content-Type': content_type}
        if token: headers['Authorization'] = 'Bearer ' + token
        if body is not None and not isinstance(body, bytes): body = json.dumps(body).encode()
        try:
            with urlopen(Request(self.base + path, data=body, headers=headers, method=method), timeout=20) as r:
                response = json.load(r)
        except HTTPError as e:
            # Do not expose response bodies that may contain personal data.
            raise RuntimeError(f'{method} {path.split("?")[0]}: HTTP {e.code}') from None
        if not response.get('success'): raise RuntimeError(f'{method} {path}: success=false')
        return response['data']


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--config', default='application.config.json')
    p.add_argument('--mode', choices=['smoke', 'constant', 'ramp'], default='smoke')
    p.add_argument('--rate', type=float, default=1)
    p.add_argument('--duration', type=int, default=300, help='seconds; ramp hold duration')
    p.add_argument('--output', default='application-runtime.json')
    p.add_argument('--create-count', type=int, default=0, help='explicit number of test accounts to create')
    args = p.parse_args()
    cfg = json.loads(Path(args.config).read_text(encoding='utf-8-sig'))
    api = API(os.getenv('BASE_URL', cfg.get('baseUrl', 'http://192.168.110.156:3000')))
    required, seconds = plan(args.mode, args.rate, args.duration)
    run_id = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + secrets.token_hex(3)
    accounts = json.loads(Path(cfg['accountsFile']).read_text(encoding='utf-8-sig'))
    # Validate job pool BEFORE mutating account data.
    job_ids = list(dict.fromkeys(cfg['jobIds']))
    if not job_ids: raise ValueError('jobIds trống')
    for jid in job_ids:
        job = api.call('GET', '/api/v1/jobs/' + jid)
        if job['status'] != 'PUBLISHED' or job['applicationDeadline'] < date.today().isoformat():
            raise ValueError('Job đóng hoặc hết hạn: ' + jid)
    for i in range(args.create_count):
        account = {'email': f'load-{run_id}-{i}@example.invalid', 'password': 'Lt!9aA' + secrets.token_hex(12)}
        api.call('POST', '/api/v1/auth/register', {**account, 'role': 'CANDIDATE'})
        accounts.append(account)
        Path(cfg['accountsFile']).write_text(json.dumps(accounts, indent=2), encoding='utf-8')
    if not accounts: raise ValueError('Cần tài khoản có sẵn hoặc --create-count')
    pairs, sessions = [], []
    seen_candidates = set()
    for account in accounts:
        login = api.call('POST', '/api/v1/auth/login', account)
        token = login['accessToken']
        claims = json.loads(base64.urlsafe_b64decode(token.split('.')[1] + '==='))
        candidate = claims['sub']
        if candidate in seen_candidates: raise ValueError('Tài khoản ứng viên bị lặp')
        seen_candidates.add(candidate)
        existing, page = set(), 0
        while True:
            batch = api.call('GET', f'/api/v1/applications/me?page={page}&size=100&sort=newest', token=token)
            existing.update(x['jobId'] for x in batch['content'])
            if batch['last']: break
            page += 1
        available = [j for j in job_ids if j not in existing]
        if not available: continue
        cvs = api.call('GET', '/api/v1/candidates/me/cvs', token=token)
        if not cvs:
            boundary = 'load-' + secrets.token_hex(12)
            body = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="load-test.pdf"\r\nContent-Type: application/pdf\r\n\r\n'.encode()
                    + pdf() + f'\r\n--{boundary}--\r\n'.encode())
            cvs = [api.call('POST', '/api/v1/candidates/me/cvs?isDefault=true', body, token, 'multipart/form-data; boundary=' + boundary)]
        cv = next((c for c in cvs if c['isDefault']), cvs[0])
        idx = len(sessions)
        sessions.append({'accessToken': token, 'expiresAt': claims['exp'], 'candidateId': candidate})
        pairs.extend({'session': idx, 'candidateId': candidate, 'jobId': j, 'cvId': cv['id']} for j in available)
    if len(pairs) < required: raise ValueError(f'Chỉ có {len(pairs)} cặp; cần tối thiểu {required}')
    if min(s['expiresAt'] for s in sessions) < time.time() + seconds + 120:
        raise ValueError('Token không đủ hạn: rút ngắn test hoặc chuẩn bị lại. Không refresh chung phiên.')
    result = {'runId': run_id, 'preparedAt': datetime.now(timezone.utc).isoformat(), 'baseUrl': api.base,
              'mode': args.mode, 'rate': args.rate, 'duration': args.duration, 'plannedSeconds': seconds,
              'requiredPairs': required, 'sessions': sessions, 'pairs': pairs}
    Path(args.output).write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(f'Prepared run {run_id}: {len(pairs)} cặp. Chạy ngay để token còn hạn.')


if __name__ == '__main__':
    try: main()
    except Exception as e:
        raise SystemExit(str(e))
