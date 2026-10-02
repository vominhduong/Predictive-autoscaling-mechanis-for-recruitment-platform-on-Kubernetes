export {CompanyJobsPage, EmployerApplicationsPage} from './RecruitmentLists';
import {Dialog} from '../../components/DesignSystem';
import {JobForm} from './JobForm';
import {findEmployerJob} from '../../api/lookups';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Building2, Plus, UserPlus} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {Link, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {companyApi, jobApi, type JobWrite} from '../../api/services';
import {normalizeError} from '../../api/errors';
import {Empty, ErrorState, Field, Loading, Page} from '../../components/Ui';
import {isUuid} from '../../utils/validation';
import {companies, remember} from '../company/registry';
import {type JobInput} from '../jobs/schemas';

export function CompaniesPage() {
    const [list, setList] = useState(companies());
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const mutation = useMutation({
        mutationFn: () => companyApi.create({
            name: name.trim(),
            description: description.trim(),
            address: address.trim()
        }), onSuccess: c => {
            setList(remember(c, true));
            setName('');
            setDescription('');
            setAddress('')
        }
    });
    return <Page title="Công ty của tôi" eyebrow="Nhà tuyển dụng">
        <div className="detail-grid">
            <form className="panel form-grid" onSubmit={e => {
                e.preventDefault();
                if (!mutation.isPending) mutation.mutate()
            }}><h2>Tạo hồ sơ công ty</h2>{mutation.isSuccess &&
                <div className="notice success" role="status">Đã tạo công ty. <Link
                    to={'/employer/jobs/new?companyId=' + mutation.data.id}>Đăng tin tuyển dụng đầu tiên</Link>
                </div>}{mutation.isError &&
                <div className="notice error" role="alert">{normalizeError(mutation.error).message}</div>}<Field
                label="Tên công ty"><input required maxLength={255} value={name}
                                           onChange={e => setName(e.target.value)}/></Field><Field
                label="Mô tả"><textarea maxLength={10000} value={description}
                                        onChange={e => setDescription(e.target.value)}/></Field><Field
                label="Địa chỉ"><input maxLength={500} value={address}
                                       onChange={e => setAddress(e.target.value)}/></Field>
                <button className="button" disabled={!name.trim() || mutation.isPending}>
                    <Plus/> {mutation.isPending ? 'Đang tạo…' : 'Tạo công ty'}</button>
            </form>
            <section>
                <div className="notice">Danh sách này chỉ ghi nhớ công ty bạn đã kết nối trên trình duyệt này. Nếu đã có
                    công ty, hãy mở đường dẫn do chủ sở hữu cung cấp.
                </div>
                {list.length === 0 ? <Empty title="Chưa có công ty" text="Điền tên công ty trong biểu mẫu để bắt đầu."
                                            action={<Link to="/employer/jobs">Mở công ty sẵn có</Link>}/> :
                    <div className="cards">{list.map(c => <Link className="panel company-card"
                                                                to={`/employer/companies/${c.id}`}
                                                                key={c.id}><Building2/>
                        <div><h2>{c.name}</h2><p>{c.address || 'Chưa có địa chỉ'}</p></div>
                    </Link>)}</div>}</section>
        </div>
    </Page>
}

export function CompanyPage() {
    const {id = ''} = useParams();
    const qc = useQueryClient();
    const query = useQuery({queryKey: ['company', id], queryFn: () => companyApi.get(id), enabled: isUuid(id)});
    const [form, setForm] = useState({name: '', description: '', address: ''});
    const [member, setMember] = useState('');
    useEffect(() => {
        if (query.data) setForm({
            name: query.data.name,
            description: query.data.description ?? '',
            address: query.data.address ?? ''
        })
    }, [query.data]);
    const update = useMutation({
        mutationFn: () => companyApi.update(id, form), onSuccess: c => {
            remember(c);
            qc.setQueryData(['company', id], c)
        }
    });
    const add = useMutation({mutationFn: () => companyApi.addMember(id, member), onSuccess: () => setMember('')});
    if (!isUuid(id)) return <ErrorState message="Đường dẫn công ty không hợp lệ. Hãy mở lại từ danh sách công ty."/>;
    if (query.isPending) return <Loading/>;
    if (query.isError) return <ErrorState message={normalizeError(query.error).message} retry={() => query.refetch()}/>;
    return <Page title={query.data.name} eyebrow="Quản lý công ty"
                 actions={<Link className="button" to={`/employer/companies/${id}/jobs`}>Tin tuyển dụng</Link>}>
        <p>{companies().find(c => c.id === id)?.knownOwner ? 'Chủ sở hữu (OWNER)' : 'Chưa có thông tin vai trò trên trình duyệt này. Bạn vẫn có thể mở tin tuyển dụng nếu được cấp quyền.'}</p>
        <div className="detail-grid">
            <form className="panel form-grid" onSubmit={e => {
                e.preventDefault();
                if (!update.isPending) update.mutate()
            }}><h2>Thông tin công ty</h2>{update.isSuccess &&
                <div className="notice success" role="status">Đã lưu thông tin công ty.</div>}
                <fieldset
                    disabled={!companies().find(c => c.id === id)?.knownOwner || update.isPending}>{update.isError &&
                    <div className="notice error" role="alert">{normalizeError(update.error).message}</div>}<Field
                    label="Tên"><input required value={form.name}
                                       onChange={e => setForm({...form, name: e.target.value})}/></Field><Field
                    label="Mô tả"><textarea rows={5} value={form.description} onChange={e => setForm({
                    ...form,
                    description: e.target.value
                })}/></Field><Field label="Địa chỉ"><input value={form.address}
                                                           onChange={e => setForm({...form, address: e.target.value})}/></Field>
                    <button className="button" disabled={update.isPending}>Lưu thay đổi</button>
                </fieldset>
            </form>
            {companies().find(c => c.id === id)?.knownOwner && <form className="panel form-grid" onSubmit={e => {
                e.preventDefault();
                if (!add.isPending) add.mutate()
            }}><UserPlus/><h2>Thêm người tuyển dụng</h2><Field label="Mã tài khoản thành viên"
                                                               error={member && !isUuid(member) ? 'Mã tài khoản chưa hợp lệ' : undefined}><input
                value={member} onChange={e => setMember(e.target.value)}/></Field>{add.isSuccess &&
                <div className="notice success" role="status">Đã thêm người tuyển dụng.</div>}{add.isError &&
                <div className="notice error" role="alert">{normalizeError(add.error).message}</div>}
                <button className="button secondary"
                        disabled={!isUuid(member) || add.isPending}>{add.isPending ? 'Đang thêm…' : 'Thêm thành viên'}</button>
            </form>}</div>
    </Page>
}

const defaults = (companyId: string): JobInput => ({
    companyId,
    title: '',
    description: '',
    requirements: '',
    locationId: '',
    categoryId: '',
    employmentType: 'FULL_TIME',
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: 'VND',
    salaryNegotiable: false,
    applicationDeadline: '',
    version: null
});

export function JobEditorPage() {
    const [reload, setReload] = useState(false);
    const [revision, setRevision] = useState(0);
    const {id} = useParams();
    const [params] = useSearchParams();
    const companyId = params.get('companyId') ?? '';
    const navigate = useNavigate();
    const qc = useQueryClient();
    const list = useQuery({
        queryKey: ['employerJob', companyId, id],
        queryFn: () => findEmployerJob(companyId, id!),
        enabled: !!id && isUuid(companyId),
        retry: false
    });
    const existing = list.data;
    const initial = useMemo(() => existing ? {
        companyId: existing.companyId,
        title: existing.title,
        description: existing.description,
        requirements: existing.requirements,
        locationId: existing.location.id,
        categoryId: existing.category.id,
        employmentType: existing.employmentType,
        salaryMin: existing.salaryMin,
        salaryMax: existing.salaryMax,
        salaryCurrency: existing.salaryCurrency,
        salaryNegotiable: existing.salaryNegotiable,
        applicationDeadline: existing.applicationDeadline,
        version: existing.version
    } : defaults(companyId), [existing, companyId]);
    const mutation = useMutation({
        mutationFn: (v: JobInput) => id ? jobApi.update(id, v as JobWrite) : jobApi.create(v as JobWrite),
        onSuccess: async j => {
            qc.setQueryData(['employerJob', j.companyId, j.id], j);
            qc.invalidateQueries({queryKey: ['job', j.id]});
            qc.invalidateQueries({queryKey: ['jobs']});
            await qc.invalidateQueries({queryKey: ['employerJobs', j.companyId]});
            navigate(`/employer/companies/${j.companyId}/jobs`, {state: {saved: true}})
        }
    });
    if (!isUuid(companyId) || (id && !isUuid(id))) return <Page title="Chọn công ty để đăng tin"><Empty
        title="Chưa chọn công ty hợp lệ" action={<Link to="/employer/jobs">Chọn công ty</Link>}/></Page>;
    if (list.isError) return <ErrorState message={normalizeError(list.error).message} retry={() => list.refetch()}/>;
    if (id && list.isPending) return <Loading/>;
    if (id && !existing) return <ErrorState
        message="Không tìm thấy tin tuyển dụng trong công ty này. Hãy quay lại danh sách tin."/>;
    return <Page title={id ? 'Chỉnh sửa tin tuyển dụng' : 'Đăng tin tuyển dụng'} eyebrow="Nhà tuyển dụng">
        <div className="notice">Chọn ngành nghề và địa điểm đang hoạt động trong danh mục để đăng tin tuyển dụng.
        </div>
        <JobForm key={(id ?? companyId) + ':' + revision} initial={initial} pending={mutation.isPending}
                 error={mutation.error ? normalizeError(mutation.error).message : undefined} onSave={v => {
            if (!mutation.isPending) mutation.mutate(v)
        }}/>{mutation.error && normalizeError(mutation.error).code === 'OPTIMISTIC_LOCK_CONFLICT' &&
        <button className="button button-secondary" onClick={() => setReload(true)}>Tải lại bản mới
            nhất</button>}<Dialog open={reload} title="Tải lại tin tuyển dụng?"
                                  description="Nội dung chưa lưu sẽ được thay bằng bản mới nhất. Hãy sao chép nội dung cần giữ trước khi tiếp tục."
                                  confirmLabel="Tải lại dữ liệu" pending={list.isFetching}
                                  onClose={() => setReload(false)} onConfirm={async () => {
        const result = await list.refetch();
        if (result.isSuccess) {
            setRevision(v => v + 1);
            mutation.reset();
            setReload(false)
        }
    }}/></Page>
}
