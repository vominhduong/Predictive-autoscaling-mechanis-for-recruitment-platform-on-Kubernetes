import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowLeft, BriefcaseBusiness, CalendarDays, Clock3, MapPin, Send, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { applicationApi, jobApi, type JobFilters } from '../../api/services';
import { normalizeError } from '../../api/errors';
import { Empty, ErrorState, Page, Pager, Status } from '../../components/Ui';
import { Skeleton } from '../../components/DesignSystem';
import type { EmploymentType } from '../../types/api';
import { isUuid } from '../../utils/validation';
import { useAuth } from '../auth/AuthContext';
import { FilterSidebar, employmentOptions, sortOptions } from './FilterSidebar';
import { JobCard } from './JobCard';
import { SearchBar, type SearchValues } from './SearchBar';
import { formatDate, formatSalary, isJobOpen, relativePublished } from './jobDisplay';

const validEmployment = new Set<EmploymentType>(employmentOptions.map(option => option.value));
const validSort = new Set(sortOptions.map(option => option.value));

function readFilters(params: URLSearchParams): JobFilters {
  const employment = params.get('employmentType') as EmploymentType | null;
  const salary = params.get('salaryMin');
  const locationId = params.get('locationId');
  const categoryId = params.get('categoryId');
  const sort = params.get('sort');
  return {
    keyword: params.get('keyword')?.trim() || undefined,
    locationId: locationId && isUuid(locationId) ? locationId : undefined,
    categoryId: categoryId && isUuid(categoryId) ? categoryId : undefined,
    employmentType: employment && validEmployment.has(employment) ? employment : undefined,
    salaryMin: salary !== null && salary !== '' && Number.isFinite(Number(salary)) && Number(salary) >= 0 ? Number(salary) : undefined,
    sort: sort && validSort.has(sort) ? sort : 'newest',
    page: Math.max(0, Number(params.get('page') ?? 0) || 0), size: 10,
  };
}

function writeParam(params: URLSearchParams, key: string, value?: string) {
  const next = new URLSearchParams(params);
  if (value) next.set(key, value); else next.delete(key);
  if (key !== 'page') next.set('page', '0');
  return next;
}

export function JobsPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const filters = useMemo(() => readFilters(params), [params]);
  const searchValues: SearchValues = { keyword: params.get('keyword') ?? '', locationId: params.get('locationId') ?? '', categoryId: params.get('categoryId') ?? '' };
  const query = useQuery({ queryKey: ['jobs', filters], queryFn: () => jobApi.search(filters), placeholderData: keepPreviousData });
  const activeEntries = [
    filters.keyword && { key: 'keyword', label: `Từ khóa: ${filters.keyword}` }, filters.locationId && { key: 'locationId', label: `Địa điểm: ${filters.locationId.slice(0, 8)}…` }, filters.categoryId && { key: 'categoryId', label: `Danh mục: ${filters.categoryId.slice(0, 8)}…` },
    filters.employmentType && { key: 'employmentType', label: employmentOptions.find(option => option.value === filters.employmentType)?.label ?? filters.employmentType }, filters.salaryMin != null && { key: 'salaryMin', label: `Lương từ ${filters.salaryMin.toLocaleString('vi-VN')}` },
  ].filter(Boolean) as Array<{ key: string; label: string }>;
  const change = (key: keyof JobFilters, value: string) => setParams(writeParam(params, key, value));
  const submitSearch = (values: SearchValues) => { const next = new URLSearchParams(params); (['keyword', 'locationId', 'categoryId'] as const).forEach(key => values[key] ? next.set(key, values[key]) : next.delete(key)); next.set('page', '0'); setParams(next); };
  const clearAll = () => { const next = new URLSearchParams(); if (filters.sort && filters.sort !== 'newest') next.set('sort', filters.sort); setParams(next); };
  const changePage = (page: number) => { setParams(writeParam(params, 'page', String(page))); window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); };

  return <Page title="Tìm việc IT phù hợp" eyebrow="Cơ hội nghề nghiệp" description="Khám phá các vị trí đang tuyển và theo dõi cơ hội phù hợp với định hướng của bạn.">
    <SearchBar values={searchValues} onSubmit={submitSearch} />
    <div className="mobile-filter-row"><button className="button button-secondary" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}><SlidersHorizontal /> Bộ lọc {activeEntries.length > 0 && <span className="filter-count">{activeEntries.length}</span>}</button><select aria-label="Sắp xếp việc làm" value={filters.sort} onChange={event => change('sort', event.target.value)}>{sortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
    {activeEntries.length > 0 && <div className="active-filters" aria-label="Bộ lọc đang áp dụng">{activeEntries.map(item => <button key={item.key} onClick={() => change(item.key as keyof JobFilters, '')}>{item.label}<X aria-hidden="true" /></button>)}<button className="clear-filters" onClick={clearAll}>Xóa tất cả</button></div>}
    <div className="jobs-layout"><FilterSidebar open={filtersOpen} filters={filters} activeCount={activeEntries.length} onChange={change} onClear={clearAll} onClose={() => setFiltersOpen(false)} /><section className="job-results" ref={resultsRef} aria-busy={query.isFetching}><div className="results-head"><div><h2>{query.data ? `${query.data.totalElements.toLocaleString('vi-VN')} việc làm` : 'Kết quả tìm kiếm'}</h2><p>{query.isFetching && !query.isPending ? 'Đang cập nhật kết quả…' : 'Các vị trí được sắp xếp theo lựa chọn của bạn.'}</p></div><span className="desktop-sort">Sắp xếp: {sortOptions.find(option => option.value === filters.sort)?.label}</span></div>
      {query.isPending ? <Skeleton rows={5} /> : query.isError ? <ErrorState message={normalizeError(query.error).message} retry={() => query.refetch()} /> : query.data.content.length === 0 ? <Empty title="Không tìm thấy việc làm phù hợp" text="Thử xóa bớt bộ lọc hoặc dùng từ khóa rộng hơn." action={<button className="button button-secondary" onClick={clearAll}>Xóa bộ lọc</button>} /> : <><div className={`job-list ${query.isFetching ? 'results-refreshing' : ''}`}>{query.data.content.map(job => <JobCard key={job.id} job={job} />)}</div><Pager page={query.data.page} total={query.data.totalPages} onPage={changePage} /></>}
    </section></div>
  </Page>;
}

export function JobDetailPage() {
  const { jobId = '', id = '' } = useParams();
  const resolvedId = jobId || id;
  const { session } = useAuth();
  const job = useQuery({ queryKey: ['job', resolvedId], queryFn: () => jobApi.detail(resolvedId), enabled: isUuid(resolvedId), retry: false });
  const applications = useQuery({ queryKey: ['applications', 'mine', 'job-check'], queryFn: () => applicationApi.mine(0), enabled: session?.role === 'CANDIDATE' && isUuid(resolvedId), retry: false });
  if (!isUuid(resolvedId)) return <Page title="Không tìm thấy việc làm" eyebrow="404"><ErrorState message="Mã việc làm không hợp lệ." /></Page>;
  if (job.isPending) return <Page title="Đang tải việc làm"><div className="detail-skeleton"><Skeleton rows={3} /></div></Page>;
  if (job.isError) return <Page title="Không tìm thấy việc làm" eyebrow="Job Board"><ErrorState message={normalizeError(job.error).message} retry={() => job.refetch()} /></Page>;
  const item = job.data;
  const open = isJobOpen(item);
  const applied = applications.data?.content.some(application => application.jobId === item.id) ?? false;
  return <Page title={item.title} eyebrow={item.category.name} breadcrumbs={[{ label: 'Việc làm', to: '/jobs' }, { label: item.title }]} actions={<Status value={open ? 'PUBLISHED' : 'CLOSED'} />}>
    <Link className="back-link" to="/jobs"><ArrowLeft /> Quay lại danh sách</Link>
    <section className="job-detail-header panel"><div className="company-avatar company-avatar-large" aria-hidden="true">{item.companyId.slice(0, 1).toUpperCase()}</div><div><p className="job-company">Công ty {item.companyId.slice(0, 8)}</p><div className="job-tags"><Status value={item.employmentType} /><span>{item.category.name}</span></div><dl className="job-header-meta"><div><dt><MapPin /> Địa điểm</dt><dd>{item.location.name}</dd></div><div><dt><BriefcaseBusiness /> Mức lương</dt><dd>{formatSalary(item)}</dd></div><div><dt><CalendarDays /> Hạn ứng tuyển</dt><dd>{formatDate(item.applicationDeadline)}</dd></div><div><dt><Clock3 /> Ngày đăng</dt><dd>{relativePublished(item.publishedAt)}</dd></div></dl></div></section>
    <div className="detail-grid job-detail-grid"><article className="panel prose job-prose"><section><h2>Mô tả công việc</h2><p>{item.description}</p></section><section><h2>Yêu cầu ứng viên</h2><p>{item.requirements}</p></section></article><aside className="panel apply-panel"><p className="eyebrow">Ứng tuyển vị trí này</p><h2>{open ? 'Sẵn sàng cho bước tiếp theo?' : 'Tin tuyển dụng đã đóng'}</h2>{!open ? <p>Vị trí này đã hết hạn hoặc không còn nhận hồ sơ.</p> : applied ? <><Status value="APPLIED" /><p>Bạn đã gửi hồ sơ cho vị trí này.</p><Link className="button button-secondary" to="/candidate/applications">Xem đơn ứng tuyển</Link></> : session?.role === 'CANDIDATE' ? <Link className="button" to={`/jobs/${item.id}/apply`}><Send /> Ứng tuyển ngay</Link> : session?.role === 'EMPLOYER' ? <p>Tài khoản nhà tuyển dụng có thể xem thông tin việc làm nhưng không thể ứng tuyển.</p> : <><p>Đăng nhập bằng tài khoản ứng viên để chọn CV và ứng tuyển.</p><Link className="button" to="/login" state={{ from: `/jobs/${item.id}/apply` }}>Đăng nhập để ứng tuyển</Link></>}<small>Hạn nhận hồ sơ: {formatDate(item.applicationDeadline)}</small></aside></div>
  </Page>;
}
