import { BriefcaseBusiness, Building2, FileText, LayoutDashboard, LogOut, Menu, Search, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../api/client';
import { ToastProvider } from '../components/DesignSystem';
import { useAuth } from '../features/auth/AuthContext';

const candidateLinks = [
  { to: '/candidate/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/candidate/profile', label: 'Hồ sơ cá nhân', icon: UserRound },
  { to: '/candidate/cvs', label: 'Quản lý CV', icon: FileText },
  { to: '/candidate/applications', label: 'Đơn ứng tuyển', icon: BriefcaseBusiness },
];
const employerLinks = [
  { to: '/employer/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/employer/companies', label: 'Công ty & tuyển dụng', icon: Building2 },
];
function Brand() { return <Link className="brand" to="/" aria-label="TalentHub — Trang chủ"><span className="brand-mark"><BriefcaseBusiness /></span><span>Talent<span>Hub</span></span></Link>; }

export function AppLayout() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const portal = Boolean(session && (location.pathname.startsWith('/candidate') || location.pathname.startsWith('/employer')));
  const links = session?.role === 'CANDIDATE' ? candidateLinks : employerLinks;
  useEffect(() => setOpen(false), [location.pathname]);
  const leave = async () => { await logout(); navigate('/'); };
  return <ToastProvider><div className={`shell ${portal ? 'portal-shell' : ''}`}>
    <a className="skip-link" href="#main-content">Bỏ qua đến nội dung</a>
    {portal && <button className={`portal-overlay ${open ? 'visible' : ''}`} aria-label="Đóng điều hướng" onClick={() => setOpen(false)} />}
    {portal && <aside className={`sidebar ${open ? 'open' : ''}`} aria-label={session?.role === 'CANDIDATE' ? 'Điều hướng ứng viên' : 'Điều hướng nhà tuyển dụng'}>
      <div className="sidebar-brand"><Brand /><button className="icon-button sidebar-close" aria-label="Đóng menu" onClick={() => setOpen(false)}><X /></button></div>
      <div className="workspace-label"><span>Không gian làm việc</span><strong>{session?.role === 'CANDIDATE' ? 'Ứng viên' : 'Nhà tuyển dụng'}</strong></div>
      <nav className="sidebar-nav">{links.map(item => <NavLink key={item.to} to={item.to}><item.icon />{item.label}</NavLink>)}</nav>
      <div className="sidebar-account"><span className="avatar">{session?.email.slice(0, 1).toUpperCase()}</span><div><strong>{session?.email}</strong><small>{session?.role === 'CANDIDATE' ? 'Ứng viên' : 'Nhà tuyển dụng'}</small></div><button className="icon-button" aria-label="Đăng xuất" onClick={leave}><LogOut /></button></div>
    </aside>}
    <div className={portal ? 'portal-main' : ''}>
      <header className={portal ? 'portal-topbar' : 'topbar'}>
        {portal ? <><button className="icon-button portal-menu" aria-label="Mở menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu /></button><Link className="mobile-brand" to="/"><BriefcaseBusiness /> TalentHub</Link><Link className="header-search" to="/jobs"><Search /> Tìm cơ hội mới</Link><div className="header-user"><span className="avatar">{session?.email.slice(0, 1).toUpperCase()}</span><span>{session?.email}</span></div></> : <><Brand /><button className="menu icon-button" aria-label={open ? 'Đóng menu' : 'Mở menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button><nav className={open ? 'nav open' : 'nav'} aria-label="Điều hướng chính"><NavLink to="/jobs">Việc làm</NavLink><a href="/#candidate">Dành cho ứng viên</a><a href="/#employer">Dành cho nhà tuyển dụng</a>{session ? <><Link className="button button-secondary button-small" to={session.role === 'CANDIDATE' ? '/candidate/dashboard' : '/employer/dashboard'}>Vào portal</Link><button className="button button-ghost button-small" onClick={leave}><LogOut /> Đăng xuất</button></> : <><NavLink to="/login">Đăng nhập</NavLink><Link className="button button-primary button-small" to="/register">Bắt đầu miễn phí</Link></>}</nav></>}
      </header>
      <Outlet />
      {!portal && <footer className="site-footer"><div className="footer-main"><div><Brand /><p>Nền tảng tuyển dụng giúp ứng viên và doanh nghiệp tiến về phía trước bằng một quy trình rõ ràng.</p></div><div><h2>Khám phá</h2><Link to="/jobs">Việc làm</Link><Link to="/register">Tạo tài khoản</Link></div><div><h2>Hỗ trợ</h2><span>Thông báo qua email</span><span>API được bảo vệ qua Gateway</span></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} TalentHub</span><span>Trải nghiệm tuyển dụng minh bạch.</span></div></footer>}
    </div>
  </div></ToastProvider>;
}
