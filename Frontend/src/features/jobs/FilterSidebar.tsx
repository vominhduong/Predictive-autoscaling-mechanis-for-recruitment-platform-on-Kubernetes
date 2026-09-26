import { SlidersHorizontal, X } from 'lucide-react';
import type { EmploymentType } from '../../types/api';
import type { JobFilters } from '../../api/services';

export const employmentOptions: Array<{ value: EmploymentType; label: string }> = [
  { value: 'FULL_TIME', label: 'Toàn thời gian' }, { value: 'PART_TIME', label: 'Bán thời gian' }, { value: 'CONTRACT', label: 'Hợp đồng' }, { value: 'INTERNSHIP', label: 'Thực tập' }, { value: 'FREELANCE', label: 'Tự do' },
];
export const sortOptions = [{ value: 'newest', label: 'Mới nhất' }, { value: 'oldest', label: 'Cũ nhất' }, { value: 'salaryAsc', label: 'Lương tăng dần' }, { value: 'salaryDesc', label: 'Lương giảm dần' }];

export function FilterSidebar({ open, filters, activeCount, onChange, onClear, onClose }: { open: boolean; filters: JobFilters; activeCount: number; onChange: (key: keyof JobFilters, value: string) => void; onClear: () => void; onClose: () => void }) {
  return <><button className={`filter-backdrop ${open ? 'visible' : ''}`} aria-label="Đóng bộ lọc" onClick={onClose} /><aside className={`filter-sidebar ${open ? 'open' : ''}`} aria-label="Bộ lọc việc làm"><div className="filter-head"><div><SlidersHorizontal /><h2>Bộ lọc</h2>{activeCount > 0 && <span>{activeCount}</span>}</div><button className="icon-button filter-close" aria-label="Đóng bộ lọc" onClick={onClose}><X /></button></div>
    <div className="filter-group"><label htmlFor="employment-filter">Loại công việc</label><select id="employment-filter" value={filters.employmentType ?? ''} onChange={event => onChange('employmentType', event.target.value)}><option value="">Tất cả</option>{employmentOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
    <div className="filter-group"><label htmlFor="salary-filter">Lương tối thiểu</label><input id="salary-filter" type="number" min="0" inputMode="numeric" value={filters.salaryMin ?? ''} onChange={event => onChange('salaryMin', event.target.value)} placeholder="Ví dụ: 15000000" /></div>
    <div className="filter-group"><label htmlFor="sort-filter">Sắp xếp</label><select id="sort-filter" value={filters.sort ?? 'newest'} onChange={event => onChange('sort', event.target.value)}>{sortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
    {activeCount > 0 && <button className="button button-secondary filter-reset" onClick={onClear}>Xóa tất cả bộ lọc</button>}
  </aside></>;
}
