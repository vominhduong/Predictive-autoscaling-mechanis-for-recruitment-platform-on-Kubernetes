import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobCard } from '../features/jobs/JobCard';
import { SearchBar } from '../features/jobs/SearchBar';
import { FilterSidebar } from '../features/jobs/FilterSidebar';
import { JobDetailPage, JobsPage } from '../features/jobs/JobBoardPages';
import { JobApplyPage } from '../features/candidate/JobApplyPage';
import { AuthProvider } from '../features/auth/AuthContext';
import { formatSalary } from '../features/jobs/jobDisplay';
import { setSession } from '../features/auth/session';
import type { Job, Role, Session } from '../types/api';
import { envelope, job, jwt, page } from './fixtures';
import { server } from './server';

function session(role: Role): Session { return { accessToken: jwt(role), refreshToken: 'refresh', tokenType: 'Bearer', expiresIn: 1800, refreshExpiresIn: 3600, expiresAt: Date.now() + 1_800_000, role, email: `${role.toLowerCase()}@example.com` }; }
function wrap(node: React.ReactNode, entry = '/', route = '*') {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><MemoryRouter initialEntries={[entry]}><AuthProvider><Routes><Route path={route} element={node} /><Route path="*" element={<div>destination</div>} /></Routes></AuthProvider></MemoryRouter></QueryClientProvider>);
}
const salaryJob = (overrides: Partial<Job>) => ({ ...job, ...overrides });

describe('job board components', () => {
  beforeEach(() => setSession(null));
  it('formats every salary shape from the backend contract', () => {
    expect(formatSalary(salaryJob({ salaryMin: 10, salaryMax: 20 }))).toBe('10 – 20 USD');
    expect(formatSalary(salaryJob({ salaryMin: 10, salaryMax: null }))).toBe('Từ 10 USD');
    expect(formatSalary(salaryJob({ salaryMin: null, salaryMax: 20 }))).toBe('Đến 20 USD');
    expect(formatSalary(salaryJob({ salaryMin: null, salaryMax: null }))).toBe('Chưa công bố');
    expect(formatSalary(salaryJob({ salaryNegotiable: true }))).toBe('Thỏa thuận');
  });

  it('renders JobCard data and Candidate apply action', () => {
    setSession(session('CANDIDATE'));
    wrap(<JobCard job={job} />);
    expect(screen.getByRole('heading', { name: job.title })).toBeInTheDocument();
    expect(screen.getByText(job.location.name)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ứng tuyển/ })).toHaveAttribute('href', `/jobs/${job.id}/apply`);
  });

  it('does not show apply action to an Employer', () => {
    setSession(session('EMPLOYER'));
    wrap(<JobCard job={job} />);
    expect(screen.queryByRole('link', { name: /Ứng tuyển/ })).not.toBeInTheDocument();
  });

  it('submits and clears shared SearchBar values', async () => {
    const submit = vi.fn();
    wrap(<SearchBar values={{ keyword: 'Java', locationId: '', categoryId: '' }} onSubmit={submit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Xóa từ khóa' }));
    await userEvent.type(screen.getByLabelText('Từ khóa'), 'React');
    await userEvent.keyboard('{Enter}');
    expect(submit).toHaveBeenCalledWith({ keyword: 'React', locationId: '', categoryId: '' });
  });

  it('changes and resets FilterSidebar values', async () => {
    const change = vi.fn(); const clear = vi.fn();
    wrap(<FilterSidebar open filters={{ sort: 'newest' }} activeCount={1} onChange={change} onClear={clear} onClose={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText('Loại công việc'), 'CONTRACT');
    expect(change).toHaveBeenCalledWith('employmentType', 'CONTRACT');
    await userEvent.click(screen.getByRole('button', { name: 'Xóa tất cả bộ lọc' }));
    expect(clear).toHaveBeenCalledOnce();
  });
});

describe('job board pages through HTTP boundary', () => {
  it('keeps filters in URL, renders total, and clears one filter', async () => {
    let query = '';
    server.use(http.get('http://localhost:8080/api/v1/jobs', ({ request }) => { query = new URL(request.url).search; return HttpResponse.json(envelope(page([job]))); }));
    wrap(<JobsPage />, '/jobs?keyword=java&employmentType=FULL_TIME&sort=salaryDesc');
    expect(await screen.findByText('1 việc làm')).toBeInTheDocument();
    expect(query).toContain('employmentType=FULL_TIME');
    await userEvent.click(screen.getByRole('button', { name: /Từ khóa: java/ }));
    await waitFor(() => expect(query).not.toContain('keyword=java'));
  });

  it('whitelists unsupported sort values', async () => {
    let sort = '';
    server.use(http.get('http://localhost:8080/api/v1/jobs', ({ request }) => { sort = new URL(request.url).searchParams.get('sort') ?? ''; return HttpResponse.json(envelope(page([]))); }));
    wrap(<JobsPage />, '/jobs?sort=dropTable');
    await screen.findByText('Không tìm thấy việc làm phù hợp');
    expect(sort).toBe('newest');
  });

  it('renders detail and guest login CTA', async () => {
    server.use(http.get(`http://localhost:8080/api/v1/jobs/${job.id}`, () => HttpResponse.json(envelope(job))));
    wrap(<JobDetailPage />, `/jobs/${job.id}`, '/jobs/:jobId');
    expect(await screen.findByText(job.description)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng nhập để ứng tuyển' })).toBeInTheDocument();
  });

  it('shows a closed state for an expired Job', async () => {
    const expired = salaryJob({ applicationDeadline: '2020-01-01' });
    server.use(http.get(`http://localhost:8080/api/v1/jobs/${job.id}`, () => HttpResponse.json(envelope(expired))));
    wrap(<JobDetailPage />, `/jobs/${job.id}`, '/jobs/:jobId');
    expect(await screen.findByText('Tin tuyển dụng đã đóng')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ứng tuyển ngay/ })).not.toBeInTheDocument();
  });

  it('blocks apply when Candidate has no CV', async () => {
    setSession(session('CANDIDATE'));
    server.use(
      http.get(`http://localhost:8080/api/v1/jobs/${job.id}`, () => HttpResponse.json(envelope(job))),
      http.get('http://localhost:8080/api/v1/candidates/me/cvs', () => HttpResponse.json(envelope([]))),
      http.get('http://localhost:8080/api/v1/applications/me', () => HttpResponse.json(envelope(page([])))),
    );
    wrap(<JobApplyPage />, `/jobs/${job.id}/apply`, '/jobs/:jobId/apply');
    expect(await screen.findByText('Bạn chưa có CV')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gửi hồ sơ/i })).not.toBeInTheDocument();
  });

  it('confirms one Application request and prevents double submit', async () => {
    setSession(session('CANDIDATE'));
    let submissions = 0;
    const cv = { id: '55555555-5555-4555-8555-555555555555', fileName: 'resume.pdf', contentType: 'application/pdf', sizeBytes: 1024, isDefault: true, createdAt: '2026-01-01T00:00:00Z' };
    server.use(
      http.get(`http://localhost:8080/api/v1/jobs/${job.id}`, () => HttpResponse.json(envelope(job))),
      http.get('http://localhost:8080/api/v1/candidates/me/cvs', () => HttpResponse.json(envelope([cv]))),
      http.get('http://localhost:8080/api/v1/applications/me', () => HttpResponse.json(envelope(page([])))),
      http.post('http://localhost:8080/api/v1/applications', async () => { submissions += 1; await new Promise(resolve => setTimeout(resolve, 50)); return HttpResponse.json(envelope({ id: '66666666-6666-4666-8666-666666666666' }), { status: 201 }); }),
    );
    wrap(<JobApplyPage />, `/jobs/${job.id}/apply`, '/jobs/:jobId/apply');
    await userEvent.click(await screen.findByRole('radio', { name: /resume.pdf/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra và gửi hồ sơ' }));
    const confirm = screen.getByRole('button', { name: 'Gửi hồ sơ' });
    await userEvent.click(confirm);
    expect(confirm).toBeDisabled();
    await userEvent.click(confirm);
    await screen.findByText('destination');
    expect(submissions).toBe(1);
  });
});
