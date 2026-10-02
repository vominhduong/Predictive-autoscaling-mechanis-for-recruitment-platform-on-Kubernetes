import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {useState} from 'react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {describe, expect, it, vi} from 'vitest';
import {AppLayout} from '../app/AppLayout';
import {AuthProvider} from '../features/auth/AuthContext';
import {LoginPage} from '../features/auth/AuthPages';
import {createSession, setSession} from '../features/auth/session';
import {CandidateDashboard, EmployerDashboard} from '../features/dashboard/DashboardPages';
import {JobDetailPage, JobsPage} from '../features/jobs/JobBoardPages';
import {CvsPage} from '../features/candidate/CvManager';
import {ApplicationDetailPage, ApplicationsPage} from '../features/candidate/CandidatePages';
import {JobForm} from '../features/employer/JobForm';
import {EmployerApplicationsPage, CompanyJobsPage} from '../features/employer/RecruitmentLists';
import {Dialog} from '../components/DesignSystem';
import {findApplication, findEmployerJob} from '../api/lookups';
import {normalizeError} from '../api/errors';
import {safeReturnPath} from '../utils/navigation';
import {companies, remember} from '../features/company/registry';
import type {Application, Company, Role} from '../types/api';
import {envelope, job, jwt, page} from './fixtures';
import {server} from './server';

const base = 'http://localhost:8080/api/v1';
const cv = {
    id: '55555555-5555-4555-8555-555555555555',
    fileName: 'resume.pdf',
    sizeBytes: 1024,
    contentType: 'application/pdf',
    isDefault: true,
    createdAt: '2026-01-01'
};
const application: Application = {
    id: '66666666-6666-4666-8666-666666666666',
    jobId: job.id,
    companyId: job.companyId,
    candidateId: cv.id,
    cvId: cv.id,
    cvFileName: cv.fileName,
    jobTitle: job.title,
    candidateIdentity: 'candidate@example.com',
    coverLetter: null,
    status: 'APPLIED',
    version: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
};

function login(role: Role) {
    setSession(createSession({
        accessToken: jwt(role),
        refreshToken: 'test',
        tokenType: 'Bearer',
        expiresIn: 1800,
        refreshExpiresIn: 3600
    }));
}

function wrap(element: React.ReactNode, entry = '/', route = '*') {
    return render(<QueryClientProvider
        client={new QueryClient({defaultOptions: {queries: {retry: false}, mutations: {retry: false}}})}><MemoryRouter
        initialEntries={[entry]}><AuthProvider><Routes><Route path={route}
                                                              element={element}/></Routes></AuthProvider></MemoryRouter></QueryClientProvider>);
}

function candidateData(cvs: unknown[] = [], applied: Application[] = []) {
    server.use(http.get(base + '/candidates/me', () => HttpResponse.json({code: 'PROFILE_NOT_FOUND'}, {status: 404})), http.get(base + '/candidates/me/cvs', () => HttpResponse.json(envelope(cvs))), http.get(base + '/applications/me', () => HttpResponse.json(envelope(page(applied)))), http.get(base + '/jobs/' + job.id, () => HttpResponse.json(envelope(job))));
}

describe('UX journeys', () => {
    it.each(['https://evil.test', '//evil.test', '/\\evil.test', '/%2f%2fevil.test', '/%5cevil.test', '/%00evil', '/login', '/register'])('rejects unsafe or looping return path %s', value => expect(safeReturnPath(value, '/candidate/dashboard')).toBe('/candidate/dashboard'));
    it('preserves safe query and hash', () => expect(safeReturnPath('/jobs?keyword=java&page=2#results')).toBe('/jobs?keyword=java&page=2#results'));
    it('returns to the intended Job after login', async () => {
        server.use(http.post(base + '/auth/login', () => HttpResponse.json(envelope({
            accessToken: jwt(),
            refreshToken: 'test',
            tokenType: 'Bearer',
            expiresIn: 1800,
            refreshExpiresIn: 3600
        }))));
        render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={[{
            pathname: '/login',
            state: {from: '/jobs?keyword=java&page=2'}
        }]}><AuthProvider><Routes><Route path="/login" element={<LoginPage/>}/><Route path="/jobs"
                                                                                      element={<p>Đã quay lại tìm
                                                                                          việc</p>}/></Routes></AuthProvider></MemoryRouter></QueryClientProvider>);
        await userEvent.type(screen.getByLabelText('Email'), 'candidate@example.com');
        await userEvent.type(screen.getByLabelText('Mật khẩu'), 'Strong#123');
        await userEvent.click(screen.getByRole('button', {name: 'Đăng nhập'}));
        expect(await screen.findByText('Đã quay lại tìm việc')).toBeInTheDocument();
    });
    it.each(['CANDIDATE', 'EMPLOYER'] as const)('shows only navigation for %s', role => {
        login(role);
        wrap(<AppLayout/>);
        expect(screen.getByRole('link', {name: role === 'CANDIDATE' ? 'CV của tôi' : 'Công ty'})).toBeInTheDocument();
        expect(screen.queryByRole('link', {name: role === 'CANDIDATE' ? 'Công ty' : 'CV của tôi'})).not.toBeInTheDocument();
    });
    it('onboards a new Candidate using real missing-profile and empty-CV responses', async () => {
        candidateData();
        wrap(<CandidateDashboard/>);
        expect(await screen.findByRole('link', {name: 'Tạo hồ sơ'})).toHaveAttribute('href', '/candidate/profile');
        expect(screen.queryByLabelText('Đã hoàn thành')).not.toBeInTheDocument();
        expect(screen.queryByText('PROFILE_NOT_FOUND')).not.toBeInTheDocument();
    });
    it('guides Employer to Company creation', () => {
        wrap(<EmployerDashboard/>);
        expect(screen.getByRole('link', {name: 'Tạo hồ sơ công ty'})).toHaveAttribute('href', '/employer/companies');
    });
    it('scopes remembered Companies by account and advances known-owner onboarding', () => {
        login('EMPLOYER');
        remember({id: job.companyId, name: 'Công ty A'} as Company, true);
        wrap(<EmployerDashboard/>);
        expect(screen.getByText('Chủ sở hữu (OWNER)')).toBeInTheDocument();
        login('CANDIDATE');
        expect(companies()).toHaveLength(0);
    });
    it('retains filter and page on return from Job detail', async () => {
        candidateData();
        wrap(<Routes><Route path="/jobs" element={<JobsPage/>}/><Route path="/jobs/:jobId" element={<JobDetailPage/>}/></Routes>, '/jobs?keyword=java&page=2');
        await userEvent.click(await screen.findByRole('link', {name: job.title}));
        expect(await screen.findByRole('link', {name: 'Quay lại danh sách'})).toHaveAttribute('href', '/jobs?keyword=java&page=2');
    });
    it('opens filter drawer, traps focus, closes with Escape and returns focus', async () => {
        wrap(<JobsPage/>);
        const trigger = screen.getByRole('button', {name: 'Bộ lọc'});
        await userEvent.click(trigger);
        const dialog = screen.getByRole('dialog', {name: 'Bộ lọc việc làm'});
        const last = within(dialog).getByRole('button', {name: 'Xem kết quả'});
        last.focus();
        await userEvent.tab();
        expect(dialog.contains(document.activeElement), document.activeElement?.outerHTML).toBe(true);
        await userEvent.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });
    it('offers upload before applying when Candidate has no CV', async () => {
        login('CANDIDATE');
        candidateData();
        wrap(<JobDetailPage/>, '/jobs/' + job.id, '/jobs/:jobId');
        expect(await screen.findByRole('link', {name: 'Tải CV lên để ứng tuyển'})).toHaveAttribute('href', '/candidate/cvs?returnTo=' + encodeURIComponent('/jobs/' + job.id));
    });
    it('offers apply when Candidate has CV and has not applied', async () => {
        login('CANDIDATE');
        candidateData([cv]);
        wrap(<JobDetailPage/>, '/jobs/' + job.id, '/jobs/:jobId');
        expect(await screen.findByRole('link', {name: 'Ứng tuyển ngay'})).toBeInTheDocument();
    });
    it('shows already applied instead of a new submission', async () => {
        login('CANDIDATE');
        candidateData([cv], [application]);
        wrap(<JobDetailPage/>, '/jobs/' + job.id, '/jobs/:jobId');
        expect(await screen.findByText('Bạn đã gửi hồ sơ cho vị trí này.')).toBeInTheDocument();
        expect(screen.queryByRole('link', {name: 'Ứng tuyển ngay'})).not.toBeInTheDocument();
    });
    it('finds previous applications and employer jobs beyond page one', async () => {
        server.use(http.get(base + '/applications/me', ({request}) => HttpResponse.json(envelope(new URL(request.url).searchParams.get('page') === '0' ? {
            ...page([]),
            totalPages: 2,
            last: false
        } : page([application])))), http.get(base + '/employer/jobs', ({request}) => HttpResponse.json(envelope(new URL(request.url).searchParams.get('page') === '0' ? {
            ...page([]),
            totalPages: 2,
            last: false
        } : page([job])))));
        expect((await findApplication(job.id))?.id).toBe(application.id);
        expect((await findEmployerJob(job.companyId, job.id))?.id).toBe(job.id);
    });
    it('uploads CV with feedback and preserves the Job return path', async () => {
        candidateData();
        server.use(http.post(base + '/candidates/me/cvs', () => HttpResponse.json(envelope(cv), {status: 201})));
        wrap(<CvsPage/>, '/candidate/cvs?returnTo=' + encodeURIComponent('/jobs/' + job.id));
        await userEvent.upload(screen.getByLabelText('Chọn CV PDF'), new File(['%PDF-test'], 'resume.pdf', {type: 'application/pdf'}));
        await userEvent.click(screen.getByRole('button', {name: 'Tải lên'}));
        expect(await screen.findByRole('link', {name: 'Quay lại việc làm để ứng tuyển'})).toHaveAttribute('href', '/jobs/' + job.id);
    });
    it('confirms CV deletion and presents recoverable errors', async () => {
        candidateData([cv]);
        server.use(http.delete(base + '/candidates/me/cvs/' + cv.id, () => HttpResponse.json({
            code: 'CV_IN_USE',
            message: 'SQL private object'
        }, {status: 409})));
        wrap(<CvsPage/>);
        await userEvent.click(await screen.findByRole('button', {name: 'Xóa resume.pdf'}));
        await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name: 'Xóa CV'}));
        expect(await screen.findByText(/CV đang được sử dụng/)).toBeInTheDocument();
        expect(screen.queryByText(/SQL/)).not.toBeInTheDocument();
    });
    it('provides empty-state CTA and retries Application loading', async () => {
        let count = 0;
        server.use(http.get(base + '/applications/me', () => ++count === 1 ? HttpResponse.json({
            code: 'UNKNOWN',
            message: 'Entity not found'
        }, {status: 503}) : HttpResponse.json(envelope(page([])))));
        wrap(<ApplicationsPage/>);
        await userEvent.click(await screen.findByRole('button', {name: 'Thử lại'}));
        expect(await screen.findByRole('link', {name: 'Tìm việc'})).toBeInTheDocument();
        expect(screen.queryByText('Entity not found')).not.toBeInTheDocument();
    });
    it('shows persistent application success and real history only', async () => {
        server.use(http.get(base + '/applications/' + application.id, () => HttpResponse.json(envelope({
            application,
            history: []
        }))));
        render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={[{
            pathname: '/candidate/applications/' + application.id,
            state: {applied: true}
        }]}><Routes><Route path="/candidate/applications/:id"
                           element={<ApplicationDetailPage/>}/></Routes></MemoryRouter></QueryClientProvider>);
        expect(await screen.findByText(/Ứng tuyển thành công!/)).toBeInTheDocument();
        expect(document.querySelectorAll('.timeline-item')).toHaveLength(0);
    });
    it('validates and focuses missing Job title while preserving edits after API error', async () => {
        const initial = {
            companyId: job.companyId,
            title: '',
            description: job.description,
            requirements: job.requirements,
            categoryId: job.category.id,
            locationId: job.location.id,
            employmentType: job.employmentType,
            salaryMin: 1,
            salaryMax: 2,
            salaryCurrency: 'USD',
            salaryNegotiable: false,
            applicationDeadline: '2099-12-31',
            version: null
        };

        function Form() {
            const [error, setError] = useState('');
            return <JobForm initial={{...initial}} error={error} pending={false}
                            onSave={() => setError('Không thể lưu. Thử lại.')}/>;
        }

        wrap(<Form/>);
        await userEvent.click(screen.getByRole('button', {name: 'Lưu bản nháp'}));
        expect(await screen.findByText('Nhập tiêu đề')).toBeInTheDocument();
        expect(screen.getByLabelText('Tiêu đề *')).toHaveFocus();
        await userEvent.type(screen.getByLabelText('Tiêu đề *'), 'Kỹ sư mới');
        await userEvent.click(screen.getByRole('button', {name: 'Lưu bản nháp'}));
        expect(await screen.findByText(/Nội dung bạn đã nhập vẫn được giữ/)).toBeInTheDocument();
        expect(screen.getByLabelText('Tiêu đề *')).toHaveValue('Kỹ sư mới');
    });
    it('exposes only valid Application transitions and confirms rejection once', async () => {
        let updates = 0;
        server.use(http.get(base + '/employer/jobs/' + job.id + '/applications', () => HttpResponse.json(envelope(page([application])))), http.patch(base + '/applications/' + application.id + '/status', async ({request}) => {
            updates++;
            const body = await request.json() as { newStatus: string };
            expect(body.newStatus).toBe('REJECTED');
            return HttpResponse.json(envelope({
                application: {...application, status: 'REJECTED', version: 1},
                history: []
            }));
        }));
        wrap(
            <EmployerApplicationsPage/>, '/employer/jobs/' + job.id + '/applications', '/employer/jobs/:jobId/applications');
        await userEvent.click(await screen.findByRole('button', {name: 'Từ chối hồ sơ'}));
        expect(screen.queryByRole('button', {name: 'Mời phỏng vấn'})).not.toBeInTheDocument();
        const dialog = screen.getByRole('dialog');
        await userEvent.type(within(dialog).getByLabelText('Ghi chú (không bắt buộc)'), 'Chưa phù hợp');
        await userEvent.click(within(dialog).getByRole('button', {name: 'Từ chối hồ sơ'}));
        expect(await screen.findByText('Đã cập nhật trạng thái hồ sơ.')).toBeInTheDocument();
        expect(updates).toBe(1);
    });
    it('asks for confirmation before closing a Job', async () => {
        server.use(http.get(base + '/employer/jobs', () => HttpResponse.json(envelope(page([job])))));
        wrap(
            <CompanyJobsPage/>, '/employer/companies/' + job.companyId + '/jobs', '/employer/companies/:companyId/jobs');
        await userEvent.click(await screen.findByRole('button', {name: 'Đóng tin'}));
        expect(screen.getByRole('dialog', {name: 'Đóng tin?'})).toBeInTheDocument();
        expect(screen.getByText(/không thể mở lại/)).toBeInTheDocument();
    });
    it('traps dialog keyboard focus and restores its trigger', async () => {
        function Example() {
            const [open, setOpen] = useState(false);
            return <>
                <button onClick={() => setOpen(true)}>Mở xác nhận</button>
                <Dialog open={open} title="Xóa?" description="Xác nhận xóa" onClose={() => setOpen(false)}
                        onConfirm={vi.fn()}/></>;
        }

        wrap(<Example/>);
        const trigger = screen.getByRole('button', {name: 'Mở xác nhận'});
        await userEvent.click(trigger);
        const confirm = screen.getByRole('button', {name: 'Xác nhận'});
        confirm.focus();
        await userEvent.tab();
        expect(screen.getByRole('button', {name: 'Đóng hộp thoại'})).toHaveFocus();
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(trigger).toHaveFocus());
    });
    it('does not expose unknown raw API errors', () => {
        const error = normalizeError({
            isAxiosError: true,
            response: {status: 500, data: {code: 'DATABASE_ERROR', message: 'SQL private key'}}
        });
        expect(error.message).not.toMatch(/SQL|private|DATABASE_ERROR/);
    });
});
