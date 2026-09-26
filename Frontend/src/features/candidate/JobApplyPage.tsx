import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, FileText, Send } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { applicationApi, jobApi, profileApi } from '../../api/services';
import { normalizeError } from '../../api/errors';
import { Empty, ErrorState, Field, Page, Status } from '../../components/Ui';
import { Dialog, Skeleton } from '../../components/DesignSystem';
import { isUuid } from '../../utils/validation';
import { formatDate, formatSalary, isJobOpen } from '../jobs/jobDisplay';

export function JobApplyPage() {
  const { jobId = '' } = useParams();
  const navigate = useNavigate();
  const [cvId, setCvId] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [confirming, setConfirming] = useState(false);
  const job = useQuery({ queryKey: ['job', jobId], queryFn: () => jobApi.detail(jobId), enabled: isUuid(jobId), retry: false });
  const cvs = useQuery({ queryKey: ['cvs'], queryFn: profileApi.cvs });
  const applications = useQuery({ queryKey: ['applications', 'mine', 'apply-check'], queryFn: () => applicationApi.mine(0) });
  const mutation = useMutation({ mutationFn: () => applicationApi.apply(jobId, cvId, coverLetter.trim() || undefined), onSuccess: application => navigate(`/candidate/applications/${application.id}`, { replace: true }) });
  const selectedCv = cvs.data?.find(cv => cv.id === cvId);
  const duplicate = applications.data?.content.some(application => application.jobId === jobId) ?? false;
  const coverError = coverLetter.length > 10000 ? 'Thư giới thiệu không được vượt quá 10.000 ký tự.' : undefined;
  if (!isUuid(jobId)) return <Page title="Không thể ứng tuyển"><ErrorState message="Mã việc làm không hợp lệ." /></Page>;
  if (job.isPending || cvs.isPending || applications.isPending) return <Page title="Chuẩn bị hồ sơ ứng tuyển" eyebrow="Ứng tuyển"><Skeleton rows={3} /></Page>;
  if (job.isError || cvs.isError || applications.isError) { const error = job.error ?? cvs.error ?? applications.error; return <Page title="Không thể chuẩn bị hồ sơ"><ErrorState message={normalizeError(error).message} retry={() => { job.refetch(); cvs.refetch(); applications.refetch(); }} /></Page>; }
  if (!isJobOpen(job.data)) return <Page title="Vị trí không còn nhận hồ sơ" eyebrow="Ứng tuyển"><Empty title="Tin tuyển dụng đã đóng" text="Hạn ứng tuyển đã qua hoặc nhà tuyển dụng đã đóng vị trí này." action={<Link className="button button-secondary" to="/jobs">Tìm việc khác</Link>} /></Page>;
  if (duplicate) return <Page title="Bạn đã ứng tuyển vị trí này" eyebrow="Ứng tuyển"><Empty title="Hồ sơ đã được gửi" text="Bạn có thể theo dõi tiến trình trong danh sách đơn ứng tuyển." action={<Link className="button" to="/candidate/applications">Xem đơn ứng tuyển</Link>} /></Page>;
  return <Page title="Xác nhận ứng tuyển" eyebrow="Candidate portal" description="Chọn CV phù hợp và kiểm tra thông tin trước khi gửi." breadcrumbs={[{ label: 'Việc làm', to: '/jobs' }, { label: job.data.title, to: `/jobs/${jobId}` }, { label: 'Ứng tuyển' }]}>
    <Link className="back-link" to={`/jobs/${jobId}`}><ArrowLeft /> Quay lại chi tiết việc làm</Link>
    <div className="apply-flow-grid"><section className="panel apply-form-panel"><div className="application-step"><span>1</span><div><h2>Chọn CV</h2><p>Chỉ CV thuộc tài khoản của bạn mới có thể được sử dụng.</p></div></div>{cvs.data.length === 0 ? <Empty title="Bạn chưa có CV" text="Tải lên ít nhất một CV PDF trước khi ứng tuyển." action={<Link className="button" to="/candidate/cvs">Quản lý CV</Link>} /> : <div className="cv-options" role="radiogroup" aria-label="Chọn CV ứng tuyển">{cvs.data.map(cv => <label key={cv.id} className={cv.id === cvId ? 'selected' : ''}><input type="radio" name="cv" value={cv.id} checked={cv.id === cvId} onChange={() => setCvId(cv.id)} /><FileText /><span><strong>{cv.fileName}</strong><small>{(cv.sizeBytes / 1024).toFixed(0)} KB · {formatDate(cv.createdAt)}{cv.isDefault ? ' · Mặc định' : ''}</small></span></label>)}</div>}
      {cvs.data.length > 0 && <><div className="application-step step-two"><span>2</span><div><h2>Thư giới thiệu</h2><p>Không bắt buộc. Tối đa 10.000 ký tự theo API contract.</p></div></div><Field label="Nội dung" error={coverError}><textarea rows={7} maxLength={10001} value={coverLetter} onChange={event => setCoverLetter(event.target.value)} placeholder="Giới thiệu ngắn gọn vì sao bạn phù hợp với vị trí…" /></Field>{mutation.isError && <div className="notice error" role="alert">{normalizeError(mutation.error).message}</div>}<button className="button apply-submit" disabled={!cvId || Boolean(coverError) || mutation.isPending} onClick={() => setConfirming(true)}><Send /> Kiểm tra và gửi hồ sơ</button></>}
    </section><aside className="panel application-summary"><p className="eyebrow">Tóm tắt ứng tuyển</p><h2>{job.data.title}</h2><p>Công ty {job.data.companyId.slice(0, 8)}</p><dl><div><dt>Mức lương</dt><dd>{formatSalary(job.data)}</dd></div><div><dt>Địa điểm</dt><dd>{job.data.location.name}</dd></div><div><dt>Hạn ứng tuyển</dt><dd><CalendarDays /> {formatDate(job.data.applicationDeadline)}</dd></div><div><dt>CV đã chọn</dt><dd>{selectedCv?.fileName ?? 'Chưa chọn CV'}</dd></div></dl><Status value={job.data.employmentType} /></aside></div>
    <Dialog open={confirming} title="Gửi hồ sơ ứng tuyển?" description={<span>CV <strong>{selectedCv?.fileName}</strong> sẽ được gửi cho vị trí <strong>{job.data.title}</strong>. Bạn không thể gửi lại hồ sơ thứ hai cho cùng vị trí.</span>} confirmLabel="Gửi hồ sơ" pending={mutation.isPending} onClose={() => !mutation.isPending && setConfirming(false)} onConfirm={() => mutation.mutate()} />
  </Page>;
}
