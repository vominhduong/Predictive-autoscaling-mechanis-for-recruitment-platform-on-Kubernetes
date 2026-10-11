import http from 'k6/http';
import {check} from 'k6';
import execution from 'k6/execution';
import {Counter, Trend} from 'k6/metrics';

const data = JSON.parse(open(__ENV.DATA_FILE || './application-runtime.json'));
const base = (__ENV.BASE_URL || data.baseUrl).replace(/\/$/, '');
const vus = Number(__ENV.PREALLOCATED_VUS || 30);
const maximum = Number(__ENV.MAX_VUS || 150);
const timeout = __ENV.REQUEST_TIMEOUT || '10s';
const successes = new Counter('workflow_completed');
const failures = new Counter('workflow_failed');
const elapsed = new Trend('workflow_duration_ms', true);
const stages = [
    {duration: '60s', target: 2}, {duration: '60s', target: 5},
    {duration: `${data.duration}s`, target: 5}, {duration: '60s', target: 1},
];
const scenario = data.mode === 'smoke'
    ? {executor: 'shared-iterations', vus: 1, iterations: 1, maxDuration: '60s'}
    : data.mode === 'constant'
        ? {
            executor: 'constant-arrival-rate',
            rate: data.rate,
            timeUnit: '1s',
            duration: `${data.duration}s`,
            preAllocatedVUs: vus,
            maxVUs: maximum
        }
        : {
            executor: 'ramping-arrival-rate',
            startRate: 1,
            timeUnit: '1s',
            stages,
            preAllocatedVUs: vus,
            maxVUs: maximum
        };
export const options = {
    scenarios: {application_submit: {...scenario, gracefulStop: '30s', tags: {workflow: 'application_submit'}}},
    thresholds: {checks: ['rate>0.99'], http_req_failed: ['rate<0.01'], dropped_iterations: ['count==0']},
    summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
    if (data.pairs.length < data.requiredPairs) execution.test.abort('Thiếu cặp dữ liệu');
    const keys = new Set(data.pairs.map(p => `${p.candidateId}:${p.jobId}`));
    if (keys.size !== data.pairs.length) execution.test.abort('Có cặp trùng trong manifest');
    const end = Date.now() / 1000 + data.plannedSeconds + 120;
    if (data.sessions.some(s => s.expiresAt < end)) execution.test.abort('Token không đủ hạn; chạy lại prepare');
    if (__ENV.EMAIL_TEST_ACK !== 'yes') execution.test.abort('Cần EMAIL_TEST_ACK=yes sau khi cấu hình thông báo thử');
}

function request(method, path, body, session, step, expected) {
    const response = http.request(method, base + path, body == null ? null : JSON.stringify(body), {
        headers: {'Authorization': `Bearer ${session.accessToken}`, 'Content-Type': 'application/json'},
        tags: {name: step, step}, timeout,
    });
    let envelope;
    try {
        envelope = response.json();
    } catch (_) {
        envelope = null;
    }
    const valid = check(response, {[`${step}: status và envelope`]: () => response.status === expected && envelope?.success === true});
    return valid ? envelope.data : null;
}

export default function () {
    const pair = data.pairs[execution.scenario.iterationInTest];
    if (!pair) execution.test.abort('Hết cặp chưa ứng tuyển; không quay vòng dữ liệu');
    const session = data.sessions[pair.session];
    const started = Date.now();
    let ok = false;
    try {
        if (!request('GET', `/api/v1/jobs/${pair.jobId}`, null, session, 'view_job', 200)) return;
        const app = request('POST', '/api/v1/applications', {
            jobId: pair.jobId, cvId: pair.cvId, coverLetter: `Synthetic load test ${data.runId}`,
        }, session, 'submit_application', 201);
        if (!app || !check(app, {'created ID exists': a => Boolean(a.id)})) return;
        const detail = request('GET', `/api/v1/applications/${app.id}`, null, session, 'verify_application', 200);
        if (!detail) return;
        ok = check(detail.application, {
            'application matches input': a => Boolean(a) && a.id === app.id && a.candidateId === pair.candidateId && a.jobId === pair.jobId && a.cvId === pair.cvId,
        });
    } finally {
        (ok ? successes : failures).add(1);
        elapsed.add(Date.now() - started);
    }
}

export function handleSummary(summary) {
    const metadata = {
        runId: data.runId, preparedAt: data.preparedAt,
        // Includes setup/graceful stop approximately; metric duration is measured test duration.
        endedAt: new Date().toISOString(), mode: data.mode, rate: data.rate,
        duration: data.duration, plannedSeconds: data.plannedSeconds,
        completed: summary.metrics.workflow_completed?.values.count || 0,
        failed: summary.metrics.workflow_failed?.values.count || 0,
        measuredDurationMs: summary.state.testRunDurationMs,
    };
    metadata.startedAt = new Date(Date.now() - summary.state.testRunDurationMs).toISOString();
    return {
        [`/scripts/output/${data.runId}-summary.json`]: JSON.stringify(summary, null, 2),
        [`/scripts/output/${data.runId}-metadata.json`]: JSON.stringify(metadata, null, 2),
        stdout: JSON.stringify(metadata, null, 2) + '\n',
    };
}
