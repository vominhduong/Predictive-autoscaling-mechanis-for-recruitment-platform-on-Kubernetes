import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BriefcaseBusiness, Building2, CheckCircle2, FileText, Search, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { applicationApi, profileApi } from '../../api/services';
import { normalizeError } from '../../api/errors';
import { Empty, ErrorState, Page, Status } from '../../components/Ui';
import { Skeleton } from '../../components/DesignSystem';
import { companies } from '../company/registry';

export function CandidateDashboard() {
  const profile = useQuery({ queryKey: ['profile'], queryFn: profileApi.get, retry: false });
  const cvs = useQuery({ queryKey: ['cvs'], queryFn: profileApi.cvs });
  const applications = useQuery({ queryKey: ['applications', 'mine', 0], queryFn: () => applicationApi.mine(0) });
  const completeFields = profile.data ? [profile.data.fullName, profile.data.phone, profile.data.headline, profile.data.summary, profile.data.locationId].filter(Boolean).length : 0;
  const completion = completeFields * 20;
  const pending = profile.isPending || cvs.isPending || applications.isPending;
  return <Page title="Chào mừng trở lại" eyebrow="Tổng quan ứng viên" description="Theo dõi hồ sơ và những cơ hội bạn đang quan tâm." actions={<Link className="button" to="/jobs"><Search /> Tìm việc làm</Link>}>
    {pending ? <Skeleton rows={3} /> : <><section className="metric-grid" aria-label="Tổng quan hồ sơ"><article className="metric-card"><span><UserRound /></span><div><small>Hoàn thiện hồ sơ</small><strong>{completion}%</strong></div></article><article className="metric-card"><span><FileText /></span><div><small>CV đã tải lên</small><strong>{cvs.data?.length ?? 0}</strong></div></article><article className="metric-card"><span><BriefcaseBusiness /></span><div><small>Đơn ứng tuyển</small><strong>{applications.data?.totalElements ?? 0}</strong></div></article></section>
      <div className="dashboard-grid"><section className="panel dashboard-panel"><div className="panel-head"><div><p className="eyebrow">Hoạt động gần đây</p><h2>Đơn ứng tuyển</h2></div><Link to="/candidate/applications">Xem tất cả <ArrowRight /></Link></div>{applications.isError ? <ErrorState message={normalizeError(applications.error).message} retry={() => applications.refetch()} /> : applications.data?.content.length ? <div className="compact-list">{applications.data.content.slice(0, 4).map(item => <Link to={`/candidate/applications/${item.id}`} key={item.id}><div><strong>{item.jobTitle}</strong><small>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</small></div><Status value={item.status} /></Link>)}</div> : <Empty title="Chưa có đơn ứng tuyển" text="Các đơn đã gửi sẽ xuất hiện tại đây." action={<Link className="button button-secondary" to="/jobs">Khám phá việc làm</Link>} />}</section>
      <aside className="panel checklist"><p className="eyebrow">Bước tiếp theo</p><h2>Sẵn sàng ứng tuyển</h2><Link to="/candidate/profile"><CheckCircle2 /> Hoàn thiện thông tin cá nhân</Link><Link to="/candidate/cvs"><CheckCircle2 /> Chuẩn bị CV phù hợp</Link><Link to="/jobs"><CheckCircle2 /> Tìm cơ hội dành cho bạn</Link></aside></div></>}
  </Page>;
}

export function EmployerDashboard() {
  const storedCompanies = companies();
  return <Page title="Tổng quan tuyển dụng" eyebrow="Employer portal" description="Quản lý công ty, tin tuyển dụng và ứng viên từ một nơi." actions={<Link className="button" to="/employer/companies"><Building2 /> Quản lý công ty</Link>}>
    <section className="metric-grid"><article className="metric-card"><span><Building2 /></span><div><small>Công ty trên trình duyệt này</small><strong>{storedCompanies.length}</strong></div></article><article className="metric-card metric-wide"><div><small>Dữ liệu tuyển dụng</small><p>Chọn một công ty để xem số việc làm và hồ sơ thực tế từ API.</p></div></article></section>
    <section className="panel dashboard-panel"><div className="panel-head"><div><p className="eyebrow">Không gian làm việc</p><h2>Công ty của bạn</h2></div></div>{storedCompanies.length ? <div className="company-grid">{storedCompanies.map(company => <Link className="company-tile" to={`/employer/companies/${company.id}`} key={company.id}><span><Building2 /></span><div><strong>{company.name}</strong><small>{company.address || 'Chưa cập nhật địa chỉ'}</small></div><ArrowRight /></Link>)}</div> : <Empty title="Bắt đầu với hồ sơ công ty" text="Tạo công ty đầu tiên để đăng tin và quản lý ứng viên." action={<Link className="button" to="/employer/companies">Tạo công ty</Link>} />}</section>
  </Page>;
}
