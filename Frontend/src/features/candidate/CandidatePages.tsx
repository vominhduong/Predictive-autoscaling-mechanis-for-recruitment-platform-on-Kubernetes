import {CompanySummary} from '../company/CompanySummary';
import {ApplicationCv} from '../employer/ApplicationCv';

export {CvsPage} from './CvManager';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import {Link, useLocation, useNavigate, useParams} from 'react-router-dom';
import {applicationApi, jobApi, profileApi} from '../../api/services';
import {normalizeError} from '../../api/errors';
import {Empty, ErrorState, Field, Loading, Page, Pager, Status} from '../../components/Ui';
import {isUuid} from '../../utils/validation';

export function ProfilePage() {
    const qc = useQueryClient();
    const query = useQuery({
        queryKey: ['profile'],
        queryFn: profileApi.get,
        retry: (n, e) => normalizeError(e).status !== 404 && n < 1
    });
    const [form, setForm] = useState({fullName: '', phone: '', headline: '', summary: '', locationId: ''});
    useEffect(() => {
        if (query.data) setForm({
            fullName: query.data.fullName ?? '',
            phone: query.data.phone ?? '',
            headline: query.data.headline ?? '',
            summary: query.data.summary ?? '',
            locationId: query.data.locationId ?? ''
        })
    }, [query.data]);
    const mutation = useMutation({
        mutationFn: () => profileApi.update({...form, locationId: form.locationId || null}),
        onSuccess: d => {
            qc.setQueryData(['profile'], d)
        }
    });
    if (query.isPending) return <Loading/>;
    const missing = query.isError && normalizeError(query.error).code === 'PROFILE_NOT_FOUND';
    if (query.isError && !missing) return <ErrorState message={normalizeError(query.error).message}
                                                      retry={() => query.refetch()}/>;
    return <Page title={missing ? 'Tạo hồ sơ ứng viên' : 'Hồ sơ ứng viên'} eyebrow="Ứng viên">
        <form className="panel form-grid" onSubmit={e => {
            e.preventDefault();
            if (!mutation.isPending && (!form.locationId || isUuid(form.locationId))) mutation.mutate()
        }}>{mutation.isSuccess &&
            <div className="notice success" role="status">Đã lưu hồ sơ. <Link to="/candidate/cvs">Tiếp tục tải CV</Link>
            </div>}{mutation.isError &&
            <div className="notice error" role="alert">{normalizeError(mutation.error).message}</div>}<Field
            label="Họ và tên"><input maxLength={150} value={form.fullName}
                                     onChange={e => setForm({...form, fullName: e.target.value})}/></Field><Field
            label="Số điện thoại"><input maxLength={30} value={form.phone}
                                         onChange={e => setForm({...form, phone: e.target.value})}/></Field><Field
            label="Chức danh nghề nghiệp"><input maxLength={255} value={form.headline}
                                                 onChange={e => setForm({...form, headline: e.target.value})}/></Field>
            <details>
                <summary>Địa điểm (không bắt buộc)</summary>
                <Field label="Mã địa điểm" hint="Dùng mã do quản trị viên cung cấp."
                       error={form.locationId && !isUuid(form.locationId) ? 'Mã địa điểm chưa hợp lệ' : undefined}><input
                    value={form.locationId} onChange={e => setForm({...form, locationId: e.target.value})}/></Field>
            </details>
            <Field label="Giới thiệu"><textarea maxLength={5000} rows={6} value={form.summary}
                                                onChange={e => setForm({...form, summary: e.target.value})}/></Field>
            <button className="button"
                    disabled={mutation.isPending}>{mutation.isPending ? 'Đang lưu…' : 'Lưu hồ sơ'}</button>
        </form>
    </Page>
}

export function ApplyPage() {
    const {jobId = ''} = useParams();
    const navigate = useNavigate();
    const [cvid, setCv] = useState('');
    const [cover, setCover] = useState('');
    const job = useQuery({queryKey: ['job', jobId], queryFn: () => jobApi.detail(jobId), enabled: isUuid(jobId)});
    const cvs = useQuery({queryKey: ['cvs'], queryFn: profileApi.cvs});
    const mutation = useMutation({
        mutationFn: () => applicationApi.apply(jobId, cvid, cover.trim() || undefined),
        onSuccess: a => navigate(`/candidate/applications/${a.id}`)
    });
    if (job.isPending || cvs.isPending) return <Loading/>;
    if (job.isError || cvs.isError) return <ErrorState message={normalizeError(job.error ?? cvs.error).message}/>;
    return <Page title={`Ứng tuyển ${job.data.title}`} eyebrow="Bước cuối">
        <form className="panel form-grid" onSubmit={e => {
            e.preventDefault();
            mutation.mutate()
        }}>{mutation.isError &&
            <div className="notice error" role="alert">{normalizeError(mutation.error).message}</div>}<Field
            label="Chọn CV"><select required value={cvid} onChange={e => setCv(e.target.value)}>
            <option value="">Chọn CV</option>
            {cvs.data.map(c => <option key={c.id} value={c.id}>{c.fileName}{c.isDefault ? ' — mặc định' : ''}</option>)}
        </select></Field><Field label="Thư giới thiệu"><textarea maxLength={10000} rows={8} value={cover}
                                                                 onChange={e => setCover(e.target.value)}/></Field>
            <button className="button"
                    disabled={!cvid || mutation.isPending}>{mutation.isPending ? 'Đang gửi…' : 'Gửi hồ sơ'}</button>
        </form>
    </Page>
}

export function ApplicationsPage() {
    const [page, setPage] = useState(0);
    const query = useQuery({queryKey: ['applications', 'mine', page], queryFn: () => applicationApi.mine(page)});
    return <Page title="Việc đã ứng tuyển" eyebrow="Ứng viên">{query.isPending ? <Loading/> : query.isError ?
        <ErrorState message={normalizeError(query.error).message}
                    retry={() => query.refetch()}/> : query.data.content.length === 0 ?
            <Empty title="Chưa có hồ sơ ứng tuyển" text="Khám phá việc làm và gửi hồ sơ đầu tiên."
                   action={<Link className="button" to="/jobs">Tìm việc</Link>}/> : <>
                <div className="cards">{query.data.content.map(a => <article className="panel application-card"
                                                                             key={a.id}>
                    <div><p className="eyebrow">{new Date(a.createdAt).toLocaleDateString('vi-VN')}</p><h2><Link
                        to={`/candidate/applications/${a.id}`}>{a.jobTitle}</Link></h2><p><CompanySummary
                        id={a.companyId}/></p></div>
                    <div><Status value={a.status}/><p><Link to={`/candidate/applications/${a.id}`}>Xem chi tiết</Link>
                    </p></div>
                </article>)}</div>
                <Pager page={query.data.page} total={query.data.totalPages} onPage={setPage}/></>}</Page>
}

export function ApplicationDetailPage() {
    const location = useLocation();
    const {id = ''} = useParams();
    const query = useQuery({
        queryKey: ['application', id],
        queryFn: () => applicationApi.detail(id),
        enabled: isUuid(id)
    });
    if (!isUuid(id)) return <Page title="Không tìm thấy hồ sơ"><Empty title="Đường dẫn không hợp lệ"
                                                                      action={<Link to="/">Về trang
                                                                          chủ</Link>}/></Page>;
    if (query.isPending) return <Loading/>;
    if (query.isError) return <ErrorState message={normalizeError(query.error).message} retry={() => query.refetch()}/>;
    const {application: a, history} = query.data;
    return <Page title={a.jobTitle} eyebrow="Chi tiết ứng tuyển"
                 actions={<Status value={a.status}/>}>{(location.state as { applied?: boolean } | null)?.applied &&
        <div className="notice success" role="status">Ứng tuyển thành công! Nhà tuyển dụng đã nhận hồ sơ của bạn. <Link
            to="/candidate/applications">Xem việc đã ứng tuyển</Link></div>}
        <div className="detail-grid">
            <article className="panel prose"><h2>Thông tin hồ sơ</h2><p><CompanySummary id={a.companyId}/></p><p>
                <strong>CV:</strong> {a.cvFileName}</p>
                {location.pathname.startsWith('/employer/') && <ApplicationCv key={a.id} id={a.id} fileName={a.cvFileName}/>}
                <p><strong>Ngày ứng
                tuyển:</strong> {new Date(a.createdAt).toLocaleString('vi-VN')}</p><h3>Thư giới thiệu</h3>
                <p>{a.coverLetter || 'Không có thư giới thiệu.'}</p></article>
            <aside className="panel timeline"><h2>Tiến trình</h2>{history.map(h => <div className="timeline-item"
                                                                                        key={h.id}><i/>
                <div><Status value={h.toStatus}/><p>{new Date(h.createdAt).toLocaleString('vi-VN')}</p>{h.note &&
                    <p>{h.note}</p>}</div>
            </div>)}</aside>
        </div>
    </Page>
}
