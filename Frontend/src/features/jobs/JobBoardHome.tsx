import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { jobApi } from '../../api/services';
import { normalizeError } from '../../api/errors';
import { Empty, ErrorState } from '../../components/Ui';
import { Skeleton } from '../../components/DesignSystem';
import { JobCard } from './JobCard';
import { MarketingSections } from './MarketingSections';
import { SearchBar, type SearchValues } from './SearchBar';

export function JobBoardHome() {
  const navigate = useNavigate();
  const jobs = useQuery({ queryKey: ['jobs', 'latest'], queryFn: () => jobApi.search({ page: 0, size: 4, sort: 'newest' }) });
  const search = (values: SearchValues) => { const params = new URLSearchParams(); (Object.keys(values) as Array<keyof SearchValues>).forEach(key => { if (values[key]) params.set(key, values[key]); }); navigate(`/jobs${params.size ? `?${params.toString()}` : ''}`); };
  return <main id="main-content"><section className="hero job-board-hero"><div><p className="eyebrow">Nơi tài năng IT gặp đúng đội ngũ</p><h1>Công việc tiếp theo.<br /><em>Đúng hướng của bạn.</em></h1><p>Khám phá cơ hội minh bạch, chọn CV phù hợp và theo dõi hành trình ứng tuyển trong một không gian thống nhất.</p><SearchBar values={{ keyword: '', locationId: '', categoryId: '' }} onSubmit={search} compact /><div className="hero-actions"><Link to="/jobs">Khám phá việc làm</Link><Link to="/register">Bắt đầu tuyển dụng <ArrowRight /></Link></div></div><aside aria-label="Lợi ích chính"><span className="hero-number">01</span><p>Tìm kiếm có trọng tâm</p><span className="hero-number">02</span><p>Ứng tuyển bằng CV sẵn có</p><span className="hero-number">03</span><p>Trạng thái minh bạch</p></aside></section>
    <section className="section"><div className="section-title"><div><p className="eyebrow">Cơ hội mới</p><h2>Việc làm mới nhất</h2></div><Link to="/jobs">Xem tất cả <ArrowRight /></Link></div>{jobs.isPending ? <Skeleton rows={4} /> : jobs.isError ? <ErrorState message={normalizeError(jobs.error).message} retry={() => jobs.refetch()} /> : jobs.data.content.length === 0 ? <Empty title="Chưa có việc làm mới" text="Hãy quay lại sau để khám phá các cơ hội mới nhất." /> : <div className="job-list">{jobs.data.content.map(job => <JobCard key={job.id} job={job} />)}</div>}</section><MarketingSections />
  </main>;
}
