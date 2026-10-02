import {useFocusScope} from '../components/useFocusScope';
import {
    BriefcaseBusiness,
    Building2,
    FileText,
    LayoutDashboard,
    LogOut,
    Menu,
    Search,
    UserRound,
    X
} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Link, NavLink, Outlet, useLocation, useNavigate} from 'react-router-dom';
import {logout} from '../api/client';
import {ToastProvider} from '../components/DesignSystem';
import {useAuth} from '../features/auth/AuthContext';

const candidateLinks = [
    {to: '/candidate/dashboard', label: 'Tổng quan', icon: LayoutDashboard},
    {to: '/jobs', label: 'Tìm việc', icon: Search},
    {to: '/candidate/profile', label: 'Hồ sơ cá nhân', icon: UserRound},
    {to: '/candidate/cvs', label: 'CV của tôi', icon: FileText},
    {to: '/candidate/applications', label: 'Việc đã ứng tuyển', icon: BriefcaseBusiness},
];
const employerLinks = [
    {to: '/employer/dashboard', label: 'Tổng quan', icon: LayoutDashboard},
    {to: '/employer/companies', label: 'Công ty', icon: Building2},
    {to: '/employer/jobs', label: 'Tin tuyển dụng', icon: BriefcaseBusiness},
    {to: '/employer/applications', label: 'Hồ sơ ứng tuyển', icon: FileText},
];

function Brand() {
    return <Link className="brand" to="/" aria-label="TalentHub — Trang chủ"><span
        className="brand-mark"><BriefcaseBusiness/></span><span>Talent<span>Hub</span></span></Link>;
}

export function AppLayout() {
    const {session} = useAuth();
    const [open, setOpen] = useState(false);
    const location = useLocation();
    const drawerRef = useRef<HTMLElement>(null);
    const close = useCallback(() => setOpen(false), []);
    useFocusScope(drawerRef, open, close);
    const navigate = useNavigate();
    const portal = Boolean(session);
    const links = session?.role === 'CANDIDATE' ? candidateLinks : employerLinks;
    useEffect(() => setOpen(false), [location.pathname]);
    const activePortal = session?.role === 'EMPLOYER' ? (/applications/.test(location.pathname) ? '/employer/applications' : /\/jobs(?:\/|$)/.test(location.pathname) && location.pathname.startsWith('/employer') ? '/employer/jobs' : location.pathname.startsWith('/employer/companies') ? '/employer/companies' : '/employer/dashboard') : links.find(item => location.pathname === item.to || location.pathname.startsWith(item.to + '/'))?.to;
    const leave = async () => {
        try {
            await logout();
        } catch { /* Local session is cleared by logout. */
        }
        navigate('/');
    };
    return <ToastProvider>
        <div className={`shell ${portal ? 'portal-shell' : ''}`}>
            <a className="skip-link" href="#main-content">Bỏ qua đến nội dung</a>
            {portal && <button className={`portal-overlay ${open ? 'visible' : ''}`} aria-label="Đóng điều hướng"
                               onClick={() => setOpen(false)}/>}
            {portal &&
                <aside ref={drawerRef} role={open ? 'dialog' : undefined} aria-modal={open || undefined} tabIndex={-1}
                       className={`sidebar ${open ? 'open' : ''}`}
                       aria-label={session?.role === 'CANDIDATE' ? 'Điều hướng ứng viên' : 'Điều hướng nhà tuyển dụng'}>
                    <div className="sidebar-brand"><Brand/>
                        <button className="icon-button sidebar-close" aria-label="Đóng menu"
                                onClick={() => setOpen(false)}><X/></button>
                    </div>
                    <div className="workspace-label">
                        <span>Không gian làm việc</span><strong>{session?.role === 'CANDIDATE' ? 'Ứng viên' : 'Nhà tuyển dụng'}</strong>
                    </div>
                    <nav className="sidebar-nav">{links.map(item => <Link key={item.to} to={item.to}
                                                                          className={activePortal === item.to ? 'active' : undefined}
                                                                          aria-current={activePortal === item.to ? 'page' : undefined}>
                        <item.icon/>
                        {item.label}</Link>)}</nav>
                    <div className="sidebar-account"><span
                        className="avatar">{session?.email.slice(0, 1).toUpperCase()}</span>
                        <div>
                            <strong>{session?.email}</strong><small>{session?.role === 'CANDIDATE' ? 'Ứng viên' : 'Nhà tuyển dụng'}</small>
                        </div>
                        <button className="icon-button" aria-label="Đăng xuất" onClick={leave}><LogOut/></button>
                    </div>
                </aside>}
            <div className={portal ? 'portal-main' : ''}>
                <header className={portal ? 'portal-topbar' : 'topbar'}>
                    {portal ? <>
                        <button className="icon-button portal-menu" aria-label="Mở menu" aria-expanded={open}
                                onClick={() => setOpen(true)}><Menu/></button>
                        <Link className="mobile-brand" to="/"><BriefcaseBusiness/> TalentHub</Link><Link
                        className="header-search"
                        to={session?.role === 'EMPLOYER' ? '/employer/jobs' : '/jobs'}><Search/> {session?.role === 'EMPLOYER' ? 'Tin tuyển dụng' : 'Tìm việc'}
                    </Link>
                        <div className="header-user"><span
                            className="avatar">{session?.email.slice(0, 1).toUpperCase()}</span><span>{session?.email}</span>
                        </div>
                    </> : <><Brand/>
                        <button className="menu icon-button" aria-label={open ? 'Đóng menu' : 'Mở menu'}
                                aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
                        <nav ref={drawerRef} role={open ? 'dialog' : undefined} aria-modal={open || undefined}
                             tabIndex={-1} className={open ? 'nav open' : 'nav'} aria-label="Điều hướng chính">{open &&
                            <button className="button button-secondary mobile-nav-close" onClick={close}><X/> Đóng menu
                            </button>}<NavLink to="/" end>Trang chủ</NavLink><NavLink to="/jobs">Việc làm</NavLink><Link
                            to="/register?role=EMPLOYER">Nhà tuyển dụng</Link>{session ? <><Link
                            className="button button-secondary button-small"
                            to={session.role === 'CANDIDATE' ? '/candidate/dashboard' : '/employer/dashboard'}>Tổng
                            quan</Link>
                            <button className="button button-ghost button-small" onClick={leave}><LogOut/> Đăng xuất
                            </button>
                        </> : <><NavLink to="/login">Đăng nhập</NavLink><Link
                            className="button button-primary button-small" to="/register">Đăng ký</Link></>}</nav>
                    </>}
                </header>
                <Outlet/>
                {!portal && <footer className="site-footer">
                    <div className="footer-main">
                        <div><Brand/><p>Nền tảng tuyển dụng giúp ứng viên và doanh nghiệp tiến về phía trước bằng một
                            quy trình rõ ràng.</p></div>
                        <div><h2>Khám phá</h2><Link to="/jobs">Việc làm</Link><Link to="/register">Tạo tài khoản</Link>
                        </div>
                        <div><h2>Hỗ trợ</h2><span>Thông báo qua email</span><span>Theo dõi hồ sơ trong tài khoản</span>
                        </div>
                    </div>
                    <div className="footer-bottom"><span>© {new Date().getFullYear()} TalentHub</span><span>Trải nghiệm tuyển dụng minh bạch.</span>
                    </div>
                </footer>}
            </div>
        </div>
    </ToastProvider>;
}
