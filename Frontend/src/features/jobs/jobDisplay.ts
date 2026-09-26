import type { Job } from '../../types/api';

export function formatSalary(job: Pick<Job, 'salaryNegotiable' | 'salaryMin' | 'salaryMax' | 'salaryCurrency'>) {
  if (job.salaryNegotiable) return 'Thỏa thuận';
  const currency = job.salaryCurrency || '';
  const format = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value);
  if (job.salaryMin != null && job.salaryMax != null) return `${format(job.salaryMin)} – ${format(job.salaryMax)} ${currency}`.trim();
  if (job.salaryMin != null) return `Từ ${format(job.salaryMin)} ${currency}`.trim();
  if (job.salaryMax != null) return `Đến ${format(job.salaryMax)} ${currency}`.trim();
  return 'Chưa công bố';
}

export function isJobOpen(job: Pick<Job, 'status' | 'applicationDeadline'>) {
  const deadline = new Date(`${job.applicationDeadline}T23:59:59`);
  return job.status === 'PUBLISHED' && deadline.getTime() >= Date.now();
}

export function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value)) : 'Chưa công bố';
}

export function relativePublished(value: string | null) {
  if (!value) return 'Chưa công bố';
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return 'Đăng hôm nay';
  if (days === 1) return 'Đăng hôm qua';
  return `Đăng ${days} ngày trước`;
}
