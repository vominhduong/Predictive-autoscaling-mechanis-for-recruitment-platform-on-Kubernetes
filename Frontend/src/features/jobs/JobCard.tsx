import {CompanySummary} from '../company/CompanySummary';
import {ArrowRight, BriefcaseBusiness, CalendarDays, Clock3, MapPin, Send} from 'lucide-react';
import {Link, useLocation} from 'react-router-dom';
import type {Job} from '../../types/api';
import {Status} from '../../components/Ui';
import {useAuth} from '../auth/AuthContext';
import {formatDate, formatSalary, isJobOpen, relativePublished} from './jobDisplay';

export function JobCard({job}: { job: Job }) {
    const {session} = useAuth();
    const location = useLocation();
    const context = {
        list: location.pathname === '/jobs' ? location.pathname + location.search : '/jobs',
        scroll: window.scrollY
    };
    const open = isJobOpen(job);
    const detailPath = `/jobs/${job.id}`;
    const applyPath = `/jobs/${job.id}/apply`;
    const companyInitial = '';
    return <article className="job-card job-card-v2">
        <div className="company-avatar" aria-hidden="true">{companyInitial || <BriefcaseBusiness/>}</div>
        <div className="job-card-content">
            <div className="job-card-heading">
                <div><h2><Link to={detailPath} state={context}>{job.title}</Link></h2><p className="job-company">
                    <CompanySummary id={job.companyId}/></p></div>
                <Status value={open ? 'PUBLISHED' : 'CLOSED'}/></div>
            <div className="job-tags"><Status value={job.employmentType}/><span>{job.category.name}</span></div>
            <dl className="job-meta-grid">
                <div>
                    <dt><MapPin/> Địa điểm</dt>
                    <dd>{job.location.name}</dd>
                </div>
                <div>
                    <dt><BriefcaseBusiness/> Mức lương</dt>
                    <dd>{formatSalary(job)}</dd>
                </div>
                <div>
                    <dt><CalendarDays/> Hạn ứng tuyển</dt>
                    <dd>{formatDate(job.applicationDeadline)}</dd>
                </div>
            </dl>
            <div className="job-card-footer"><span><Clock3/> {relativePublished(job.publishedAt)}</span>
                <div className="job-card-actions"><Link className="button button-secondary button-small" to={detailPath}
                                                        state={context}>Xem chi
                    tiết <ArrowRight/></Link>{open && session?.role === 'CANDIDATE' &&
                    <Link className="button button-primary button-small" to={applyPath} state={context}><Send/> Ứng
                        tuyển</Link>}</div>
            </div>
        </div>
    </article>;
}
