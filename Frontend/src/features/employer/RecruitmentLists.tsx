import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useCallback, useState} from 'react';
import {Link, useLocation, useParams, useSearchParams} from 'react-router-dom';
import {applicationApi, companyApi, jobApi} from '../../api/services';
import {normalizeError} from '../../api/errors';
import {Dialog, Skeleton} from '../../components/DesignSystem';
import {Empty, ErrorState, Field, Page, Pager, Status, statusLabels} from '../../components/Ui';
import {applicationTransitions, isUuid} from '../../utils/validation';
import type {Application, ApplicationStatus, Job, JobStatus} from '../../types/api';
import {remember} from '../company/registry';

const transitions: Record<JobStatus, JobStatus[]> = {
    DRAFT: ['PUBLISHED', 'CLOSED'],
    PUBLISHED: ['HIDDEN', 'CLOSED'],
    HIDDEN: ['PUBLISHED', 'CLOSED'],
    CLOSED: []
};
const jobActions: Record<JobStatus, string> = {
    DRAFT: 'Lưu bản nháp',
    PUBLISHED: 'Đăng tuyển',
    HIDDEN: 'Ẩn tin',
    CLOSED: 'Đóng tin'
};
const applicationActions: Partial<Record<ApplicationStatus, string>> = {
    SCREENING: 'Chuyển sang xem xét',
    INTERVIEW: 'Mời phỏng vấn',
    OFFER: 'Gửi đề nghị',
    HIRED: 'Xác nhận đã tuyển',
    REJECTED: 'Từ chối hồ sơ'
};

export function CompanyJobsPage() {
    const {companyId = ''} = useParams();
    const location = useLocation();
    const [params, setParams] = useSearchParams();
    const selectedStatus = params.get('status') as JobStatus;
    const status = selectedStatus in transitions ? selectedStatus : undefined;
    const page = /^\d+$/.test(params.get('page') ?? '') ? Number(params.get('page')) : 0;
    const applicationsView = params.get('view') === 'applications';
    const [selection, setSelection] = useState<{ job: Job; next: JobStatus } | null>(null);
    const close = useCallback(() => setSelection(null), []);
    const qc = useQueryClient();
    const query = useQuery({
        queryKey: ['employerJobs', companyId, status, page], queryFn: async () => {
            const result = await jobApi.employer(companyId, status, page);
            // Only remember after the protected list has verified membership.
            try {
                remember(await companyApi.get(companyId));
            } catch { /* Optional company summary. */
            }
            return result;
        }, enabled: isUuid(companyId), retry: false
    });
    const change = useMutation({
        mutationFn: ({job, next}: {
            job: Job;
            next: JobStatus
        }) => jobApi.status(job.id, next, job.version), onSuccess: () => {
            setSelection(null);
            qc.invalidateQueries({queryKey: ['employerJobs', companyId]});
            qc.invalidateQueries({queryKey: ['employerJob', companyId]});
            qc.invalidateQueries({queryKey: ['jobs']});
            qc.invalidateQueries({queryKey: ['job']});
        }
    });
    if (!isUuid(companyId)) return <Page title="Không tìm thấy công ty"><Empty title="Đường dẫn công ty không hợp lệ"
                                                                               action={<Link to="/employer/jobs">Chọn
                                                                                   công ty</Link>}/></Page>;
    return <Page title={applicationsView ? 'Chọn tin để xem hồ sơ ứng tuyển' : 'Tin tuyển dụng của công ty'}
                 eyebrow="Nhà tuyển dụng" actions={!applicationsView &&
        <Link className="button" to={'/employer/jobs/new?companyId=' + companyId}>Đăng tin tuyển dụng</Link>}>
        <Link className="back-link" to="/employer/jobs">Chọn công ty khác</Link>
        {(location.state as { saved?: boolean } | null)?.saved &&
            <p className="notice success" role="status">Đã lưu tin tuyển dụng. Với bản nháp, chọn “Đăng tuyển” khi đã
                sẵn sàng.</p>}
        {change.isSuccess && <p className="notice success" role="status">Đã cập nhật trạng thái tin tuyển dụng.</p>}
        <Field label="Trạng thái tin"><select value={status ?? ''} onChange={event => {
            const next = new URLSearchParams(params);
            next.set('status', event.target.value);
            next.set('page', '0');
            setParams(next);
        }}>
            <option value="">Tất cả</option>
            {Object.keys(transitions).map(value => <option key={value} value={value}>{statusLabels[value]}</option>)}
        </select></Field>
        {query.isPending ? <Skeleton/> : query.isError ? <ErrorState message={normalizeError(query.error).message}
                                                                     retry={() => query.refetch()}/> : query.data.content.length === 0 ?
            <Empty title={status ? 'Không có tin ở trạng thái này' : 'Chưa có tin tuyển dụng'}
                   text={status ? 'Chọn trạng thái khác để xem thêm tin.' : 'Tạo bản nháp đầu tiên, sau đó đăng tuyển để nhận hồ sơ.'}
                   action={status ? <button onClick={() => setParams({})}>Xóa bộ lọc</button> :
                       <Link className="button" to={'/employer/jobs/new?companyId=' + companyId}>Đăng tin tuyển
                           dụng</Link>}/> : <>
                <div className="cards">{query.data.content.map(job => <article className="panel employer-job"
                                                                               key={job.id}>
                    <div><Status value={job.status}/><h2>{job.title}</h2><p>Hạn ứng
                        tuyển: {new Date(job.applicationDeadline).toLocaleDateString('vi-VN')}</p></div>
                    <div className="actions"><Link className="button button-secondary"
                                                   to={'/employer/jobs/' + job.id + '/applications'}
                                                   state={{companyId}}>Hồ sơ ứng tuyển</Link>{!applicationsView && <>
                        <Link className="button button-secondary"
                              to={'/employer/jobs/' + job.id + '/edit?companyId=' + companyId}>Chỉnh
                            sửa</Link>{transitions[job.status].filter(next => next !== 'PUBLISHED' || job.applicationDeadline > new Date().toISOString().slice(0, 10)).map(next =>
                        <button className={next === 'CLOSED' ? 'button button-danger' : 'button'} key={next}
                                disabled={change.isPending} onClick={() => {
                            change.reset();
                            setSelection({job, next});
                        }}>{jobActions[next]}</button>)}</>}</div>
                </article>)}</div>
                <Pager page={query.data.page} total={query.data.totalPages} onPage={value => {
                    const next = new URLSearchParams(params);
                    next.set('page', String(value));
                    setParams(next);
                }}/></>}
        <Dialog open={Boolean(selection)} title={selection ? jobActions[selection.next] + '?' : ''}
                danger={selection?.next === 'CLOSED' || selection?.next === 'HIDDEN'}
                description={<><p>{selection?.job.title}</p>
                    <p>{selection?.next === 'CLOSED' ? 'Tin sẽ ngừng nhận hồ sơ và không thể mở lại.' : selection?.next === 'HIDDEN' ? 'Tin sẽ tạm ngừng hiển thị trong kết quả tìm việc.' : 'Tin sẽ hiển thị công khai và bắt đầu nhận hồ sơ.'}</p>{change.isError &&
                        <div role="alert">{normalizeError(change.error).message}
                            <button onClick={() => {
                                close();
                                query.refetch();
                            }}>Tải lại dữ liệu
                            </button>
                        </div>}</>} confirmLabel={selection ? jobActions[selection.next] : 'Xác nhận'}
                pending={change.isPending} onClose={close} onConfirm={() => {
            if (selection && !change.isPending) change.mutate(selection);
        }}/>
    </Page>;
}

export function EmployerApplicationsPage() {
    const {jobId = ''} = useParams();
    const [params, setParams] = useSearchParams();
    const page = /^\d+$/.test(params.get('page') ?? '') ? Number(params.get('page')) : 0;
    const [selection, setSelection] = useState<{ application: Application; status: ApplicationStatus } | null>(null);
    const [note, setNote] = useState('');
    const close = useCallback(() => setSelection(null), []);
    const qc = useQueryClient();
    const query = useQuery({
        queryKey: ['employerApplications', jobId, page],
        queryFn: () => applicationApi.forJob(jobId, page),
        enabled: isUuid(jobId),
        retry: false
    });
    const change = useMutation({
        mutationFn: () => applicationApi.status(selection!.application.id, selection!.status, note.trim() || undefined, selection!.application.version),
        onSuccess: result => {
            qc.setQueryData(['application', result.application.id], result);
            qc.invalidateQueries({queryKey: ['employerApplications', jobId]});
            qc.invalidateQueries({queryKey: ['applications']});
            setSelection(null);
        }
    });
    if (!isUuid(jobId)) return <Page title="Không tìm thấy tin tuyển dụng"><Link to="/employer/applications">Chọn tin
        tuyển dụng</Link></Page>;
    return <Page title="Hồ sơ ứng tuyển" eyebrow="Nhà tuyển dụng"
                 description={query.data?.content[0]?.jobTitle ?? 'Hồ sơ được gửi cho tin tuyển dụng đã chọn.'}>
        <Link className="back-link" to="/employer/applications">Chọn tin tuyển dụng khác</Link>
        {change.isSuccess && <p className="notice success" role="status">Đã cập nhật trạng thái hồ sơ.</p>}
        {query.isPending ? <Skeleton/> : query.isError ? <ErrorState message={normalizeError(query.error).message}
                                                                     retry={() => query.refetch()}/> : query.data.content.length === 0 ?
            <Empty title="Chưa có hồ sơ ứng tuyển" text="Hồ sơ sẽ xuất hiện tại đây khi ứng viên gửi CV cho tin này."
                   action={<Link className="button button-secondary" to="/employer/jobs">Xem tin tuyển
                       dụng</Link>}/> : <>
                <div className="cards">{query.data.content.map(application => <article className="panel employer-job"
                                                                                       key={application.id}>
                    <div><Status value={application.status}/><h2>{application.candidateIdentity}</h2>
                        <p>{application.jobTitle}</p>
                        <p>{application.cvFileName} · {new Date(application.createdAt).toLocaleDateString('vi-VN')}</p>
                        <Link to={'/employer/applications/' + application.id}>Xem chi tiết hồ sơ</Link></div>
                    <div className="actions">{applicationTransitions[application.status].map(status => <button
                        className={status === 'REJECTED' ? 'button button-danger' : 'button'} key={status}
                        disabled={change.isPending} onClick={() => {
                        change.reset();
                        setNote('');
                        setSelection({application, status});
                    }}>{applicationActions[status]}</button>)}</div>
                </article>)}</div>
                <Pager page={query.data.page} total={query.data.totalPages}
                       onPage={value => setParams({page: String(value)})}/></>}
        <Dialog open={Boolean(selection)} title={selection ? applicationActions[selection.status] + '?' : ''}
                danger={selection?.status === 'REJECTED'}
                confirmLabel={selection ? applicationActions[selection.status] : undefined} pending={change.isPending}
                onClose={close} onConfirm={() => {
            if (selection && !change.isPending) change.mutate();
        }} description={<>
            <p>{selection?.application.candidateIdentity} · {selection?.application.jobTitle}</p>{selection?.status === 'REJECTED' &&
            <p>Hồ sơ bị từ chối sẽ kết thúc quy trình và không thể chuyển lại trạng thái trước.</p>}<Field
            label="Ghi chú (không bắt buộc)" hint="Tối đa 2.000 ký tự. Ứng viên có thể đọc ghi chú này."><textarea
            rows={4} maxLength={2000} value={note}
            onChange={event => setNote(event.target.value)}/></Field>{change.isError &&
            <p role="alert">{normalizeError(change.error).message}
                <button onClick={() => {
                    close();
                    query.refetch();
                }}>Tải lại dữ liệu
                </button>
            </p>}</>}/>
    </Page>;
}
