import {EmployerWorkspace} from '../features/employer/EmployerWorkspace';
import {createBrowserRouter, Link, Navigate, Outlet} from 'react-router-dom';
import {AppLayout as Layout} from '../app/AppLayout';
import {Guest, Protected} from '../app/Guards';
import {JobBoardHome as HomePage} from '../features/jobs/JobBoardHome';
import {JobDetailPage, JobsPage} from '../features/jobs/JobBoardPages';
import {LoginPage, RegisterPage} from '../features/auth/AuthPages';
import {AuthProvider} from '../features/auth/AuthContext';
import {ApplicationDetailPage, ApplicationsPage, CvsPage, ProfilePage} from '../features/candidate/CandidatePages';
import {JobApplyPage} from '../features/candidate/JobApplyPage';
import {
    CompaniesPage,
    CompanyJobsPage,
    CompanyPage,
    EmployerApplicationsPage,
    JobEditorPage
} from '../features/employer/EmployerPages';
import {CandidateDashboard, EmployerDashboard} from '../features/dashboard/DashboardPages';
import {Page} from '../components/Ui';

function Forbidden() {
    return <Page title="Không có quyền truy cập" eyebrow="403">
        <div className="state"><p>Tài khoản của bạn không được phép mở trang này.</p><Link className="button" to="/">Về
            trang chủ</Link></div>
    </Page>
}

function NotFound() {
    return <Page title="Không tìm thấy trang" eyebrow="404">
        <div className="state"><p>Đường dẫn không tồn tại hoặc đã được thay đổi.</p><Link className="button" to="/jobs">Tìm
            việc</Link></div>
    </Page>
}

function Notifications() {
    return <Page title="Thông báo" eyebrow="Thông báo qua email">
        <div className="state"><h2>Thông báo được gửi qua email</h2><p>Kiểm tra email đã đăng ký để nhận thông báo về hồ
            sơ ứng tuyển.</p></div>
    </Page>
}

function Providers() {
    return <AuthProvider><Outlet/></AuthProvider>
}

export const router = createBrowserRouter([{
    element: <Providers/>, children: [{
        element: <Layout/>,
        children: [{path: '/', element: <HomePage/>}, {
            path: '/login',
            element: <Guest><LoginPage/></Guest>
        }, {path: '/register', element: <Guest><RegisterPage/></Guest>}, {
            path: '/jobs',
            element: <JobsPage/>
        }, {path: '/jobs/:jobId', element: <JobDetailPage/>}, {
            path: '/jobs/:jobId/apply',
            element: <Protected role="CANDIDATE"><JobApplyPage/></Protected>
        }, {
            path: '/candidate/dashboard',
            element: <Protected role="CANDIDATE"><CandidateDashboard/></Protected>
        }, {
            path: '/candidate/profile',
            element: <Protected role="CANDIDATE"><ProfilePage/></Protected>
        }, {
            path: '/candidate/cvs',
            element: <Protected role="CANDIDATE"><CvsPage/></Protected>
        }, {
            path: '/candidate/applications',
            element: <Protected role="CANDIDATE"><ApplicationsPage/></Protected>
        }, {
            path: '/candidate/applications/:id',
            element: <Protected role="CANDIDATE"><ApplicationDetailPage/></Protected>
        }, {
            path: '/employer/jobs',
            element: <Protected role="EMPLOYER"><EmployerWorkspace/></Protected>
        }, {
            path: '/employer/applications',
            element: <Protected role="EMPLOYER"><EmployerWorkspace applications/></Protected>
        }, {
            path: '/employer/applications/:id',
            element: <Protected role="EMPLOYER"><ApplicationDetailPage/></Protected>
        }, {
            path: '/employer/dashboard',
            element: <Protected role="EMPLOYER"><EmployerDashboard/></Protected>
        }, {
            path: '/employer/companies',
            element: <Protected role="EMPLOYER"><CompaniesPage/></Protected>
        }, {
            path: '/employer/companies/:id',
            element: <Protected role="EMPLOYER"><CompanyPage/></Protected>
        }, {
            path: '/employer/companies/:companyId/jobs',
            element: <Protected role="EMPLOYER"><CompanyJobsPage/></Protected>
        }, {
            path: '/employer/jobs/new',
            element: <Protected role="EMPLOYER"><JobEditorPage/></Protected>
        }, {
            path: '/employer/jobs/:id/edit',
            element: <Protected role="EMPLOYER"><JobEditorPage/></Protected>
        }, {
            path: '/employer/jobs/:jobId/applications',
            element: <Protected role="EMPLOYER"><EmployerApplicationsPage/></Protected>
        }, {path: '/notifications', element: <Notifications/>}, {path: '/403', element: <Forbidden/>}, {
            path: '/404',
            element: <NotFound/>
        }, {path: '*', element: <Navigate to="/404" replace/>}]
    }]
}]);
