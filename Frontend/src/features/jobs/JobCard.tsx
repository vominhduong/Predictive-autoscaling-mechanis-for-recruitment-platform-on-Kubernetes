import { ArrowRight, BriefcaseBusiness, CalendarDays, Clock3, MapPin, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Job } from '../../types/api';
import { Status } from '../../components/Ui';
import { useAuth } from '../auth/AuthContext';
import { formatDate, formatSalary, isJobOpen, relativePublished } from './jobDisplay';

export function JobCard({ job }: { job: Job }) {
  const { session } = useAuth();
  const open = isJobOpen(job);
  const detailPath = `/jobs/${job.id}`;
  const applyPath = `/jobs/${job.id}/apply`;
  const companyInitial = job.companyId.slice(0, 1).toUpperCase();
  return <article className="job-card job-card-v2">
    <div className="company-avatar" aria-hidden="true">{companyInitial || <BriefcaseBusiness />}</div>
    <div className="job-card-content">
      <div className="job-card-heading"><div><p className="job-company">Công ty <span title={job.companyId}>{job.companyId.slice(0, 8)}</span></p><h2><Link to={detailPath}>{job.title}</Link></h2></div><Status value={open ? 'PUBLISHED' : 'CLOSED'} /></div>
      <div className="job-tags"><Status value={job.employmentType} /><span>{job.category.name}</span></div>
      <dl className="job-meta-grid"><div><dt><MapPin /> Địa điểm</dt><dd>{job.location.name}</dd></div><div><dt><BriefcaseBusiness /> Mức lương</dt><dd>{formatSalary(job)}</dd></div><div><dt><CalendarDays /> Hạn ứng tuyển</dt><dd>{formatDate(job.applicationDeadline)}</dd></div></dl>
      <div className="job-card-footer"><span><Clock3 /> {relativePublished(job.publishedAt)}</span><div className="job-card-actions"><Link className="button button-secondary button-small" to={detailPath}>Xem chi tiết <ArrowRight /></Link>{open && session?.role === 'CANDIDATE' && <Link className="button button-primary button-small" to={applyPath}><Send /> Ứng tuyển</Link>}</div></div>
    </div>
  </article>;
}
