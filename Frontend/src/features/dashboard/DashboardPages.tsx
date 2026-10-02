import {useQuery} from '@tanstack/react-query';
import {CheckCircle2, Circle} from 'lucide-react';
import {Link} from 'react-router-dom';
import {applicationApi, profileApi} from '../../api/services';
import {normalizeError} from '../../api/errors';
import {Empty, ErrorState, Page, Status} from '../../components/Ui';
import {Skeleton} from '../../components/DesignSystem';
import {companies} from '../company/registry';

export function CandidateDashboard() {
    const profile = useQuery({queryKey: ['profile'], queryFn: profileApi.get, retry: false});
    const cvs = useQuery({queryKey: ['cvs'], queryFn: profileApi.cvs});
    const applications = useQuery({queryKey: ['applications', 'mine', 0], queryFn: () => applicationApi.mine(0)});
    const missing = profile.isError && normalizeError(profile.error).code === 'PROFILE_NOT_FOUND';
    const ready = Boolean(profile.data?.fullName && profile.data?.headline);
    const hasCv = Boolean(cvs.data?.length);
    const pending = profile.isPending || cvs.isPending || applications.isPending;
    const next = !ready ? {
        to: '/candidate/profile',
        label: missing ? 'Tạo hồ sơ' : 'Hoàn thiện hồ sơ'
    } : !hasCv ? {to: '/candidate/cvs', label: 'Tải CV'} : {to: '/jobs', label: 'Tìm việc'};
    const steps = [
        {
            to: '/candidate/profile',
            label: 'Hoàn thiện hồ sơ',
            complete: ready,
            detail: 'Thêm họ tên và chức danh nghề nghiệp.'
        },
        {
            to: '/candidate/cvs',
            label: 'Tải CV',
            complete: hasCv,
            detail: cvs.isError ? 'Chưa kiểm tra được CV.' : (cvs.data?.length ?? 0) + ' CV đã tải lên.'
        },
        {to: '/jobs', label: 'Tìm việc', complete: false, detail: 'Khám phá vị trí phù hợp với bạn.'},
        {
            to: '/candidate/applications',
            label: 'Theo dõi ứng tuyển',
            complete: Boolean(applications.data?.totalElements),
            detail: applications.isError ? 'Chưa kiểm tra được hồ sơ ứng tuyển.' : (applications.data?.totalElements ?? 0) + ' hồ sơ đã gửi.'
        },
    ];
    return <Page title="Chào mừng trở lại" eyebrow="Tổng quan ứng viên"
                 description="Chuẩn bị hồ sơ và bắt đầu tìm cơ hội phù hợp."
                 actions={!pending && <Link className="button" to={next.to}>{next.label}</Link>}>
        {pending ? <Skeleton rows={3}/> : <>
            {profile.isError && !missing &&
                <ErrorState message={normalizeError(profile.error).message} retry={() => profile.refetch()}/>}
            {cvs.isError && <ErrorState message={normalizeError(cvs.error).message} retry={() => cvs.refetch()}/>}
            <div className="dashboard-grid">
                <section className="panel checklist"><h2>Bước tiếp theo của bạn</h2>{steps.map(step => <Link
                    key={step.to} to={step.to}>{step.complete ? <CheckCircle2 aria-label="Đã hoàn thành"/> : <Circle
                    aria-label="Bước tiếp theo"/>}<span><strong>{step.label}</strong><small>{step.detail}</small></span></Link>)}
                </section>
                <section className="panel"><h2>Việc đã ứng tuyển gần đây</h2>{applications.isError ?
                    <ErrorState message={normalizeError(applications.error).message}
                                retry={() => applications.refetch()}/> : applications.data?.content.length ? <>
                            <div className="compact-list">{applications.data.content.slice(0, 4).map(item => <Link
                                to={'/candidate/applications/' + item.id} key={item.id}>
                                <div>
                                    <strong>{item.jobTitle}</strong><small>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</small>
                                </div>
                                <Status value={item.status}/></Link>)}</div>
                            <Link to="/candidate/applications">Xem tất cả việc đã ứng tuyển</Link></> :
                        <Empty title="Bạn chưa ứng tuyển việc làm nào"
                               text="Chọn một công việc phù hợp để gửi CV đầu tiên."
                               action={<Link className="button button-secondary" to="/jobs">Tìm việc</Link>}/>}
                </section>
            </div>
        </>}
    </Page>;
}

export function EmployerDashboard() {
    const list = companies();
    return <Page title="Tổng quan tuyển dụng" eyebrow="Nhà tuyển dụng"
                 description="Bắt đầu từ công ty, đăng tin và theo dõi hồ sơ ứng tuyển."
                 actions={<Link className="button"
                                to={list.length ? '/employer/jobs' : '/employer/companies'}>{list.length ? 'Đăng tin tuyển dụng' : 'Tạo hồ sơ công ty'}</Link>}>
        {list.length ? <section className="panel"><h2>Công ty đã kết nối trên trình duyệt này</h2>
            <div className="company-grid">{list.map(company => <article className="company-tile" key={company.id}>
                <div><h3>{company.name}</h3>
                    <p>{company.knownOwner ? 'Chủ sở hữu (OWNER)' : 'Quyền quản lý được kiểm tra khi mở tin tuyển dụng.'}</p>
                    <Link to={'/employer/companies/' + company.id + '/jobs'}>Xem tin tuyển dụng</Link><p><Link
                        to={'/employer/jobs/new?companyId=' + company.id}>Đăng tin tuyển dụng</Link></p></div>
            </article>)}</div>
        </section> : <Empty title="Tạo hồ sơ công ty để bắt đầu"
                            text="Bạn cần hồ sơ công ty trước khi đăng tin tuyển dụng. Nếu đã được mời vào công ty, mở đường dẫn do chủ sở hữu cung cấp."
                            action={<Link className="button button-secondary" to="/employer/companies">Tạo công ty hoặc
                                kết nối công ty sẵn có</Link>}/>}
    </Page>;
}
