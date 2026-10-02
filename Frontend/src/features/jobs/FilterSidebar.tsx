import {useCallback, useRef} from 'react';
import {ReferenceSelect} from './ReferenceSelect';
import {useFocusScope} from '../../components/useFocusScope';
import {SlidersHorizontal, X} from 'lucide-react';
import type {EmploymentType} from '../../types/api';
import type {JobFilters} from '../../api/services';

export const employmentOptions: Array<{ value: EmploymentType; label: string }> = [
    {value: 'FULL_TIME', label: 'Toàn thời gian'}, {value: 'PART_TIME', label: 'Bán thời gian'}, {
        value: 'CONTRACT',
        label: 'Hợp đồng'
    }, {value: 'INTERNSHIP', label: 'Thực tập'}, {value: 'FREELANCE', label: 'Tự do'},
];
export const sortOptions = [{value: 'newest', label: 'Mới nhất'}, {
    value: 'oldest',
    label: 'Cũ nhất'
}, {value: 'salaryAsc', label: 'Lương tăng dần'}, {value: 'salaryDesc', label: 'Lương giảm dần'}];

export function FilterSidebar({open, filters, activeCount, onChange, onClear, onClose}: {
    open: boolean;
    filters: JobFilters;
    activeCount: number;
    onChange: (key: keyof JobFilters, value: string) => void;
    onClear: () => void;
    onClose: () => void
}) {
    const panel = useRef<HTMLElement>(null);
    const close = useCallback(() => onClose(), [onClose]);
    useFocusScope(panel, open, close);
    return <>
        <button className={`filter-backdrop ${open ? 'visible' : ''}`} aria-label="Đóng bộ lọc" onClick={onClose}/>
        <aside ref={panel} role={open ? 'dialog' : undefined} aria-modal={open || undefined} tabIndex={-1}
               className={`filter-sidebar ${open ? 'open' : ''}`} aria-label="Bộ lọc việc làm">
            <div className="filter-head">
                <div><SlidersHorizontal/><h2>Bộ lọc</h2>{activeCount > 0 && <span>{activeCount}</span>}</div>
                <button className="icon-button filter-close" aria-label="Đóng bộ lọc" onClick={onClose}><X/></button>
            </div>
            <div className="filter-group"><ReferenceSelect kind="category" value={filters.categoryId ?? ''}
                                                           onChange={value => onChange('categoryId', value)}/></div>
            <div className="filter-group"><ReferenceSelect kind="location" value={filters.locationId ?? ''}
                                                           onChange={value => onChange('locationId', value)}/></div>
            <div className="filter-group"><label htmlFor="employment-filter">Loại công việc</label><select
                id="employment-filter" value={filters.employmentType ?? ''}
                onChange={event => onChange('employmentType', event.target.value)}>
                <option value="">Tất cả</option>
                {employmentOptions.map(option => <option key={option.value}
                                                         value={option.value}>{option.label}</option>)}</select></div>
            <div className="filter-group"><label htmlFor="salary-filter">Lương tối thiểu</label><input
                id="salary-filter" type="number" min="0" inputMode="numeric" key={filters.salaryMin ?? 'none'}
                defaultValue={filters.salaryMin ?? ''} onBlur={event => {
                if (event.target.value !== String(filters.salaryMin ?? '')) onChange('salaryMin', event.target.value);
            }} onKeyDown={event => {
                if (event.key === 'Enter') event.currentTarget.blur();
            }} placeholder="Ví dụ: 15000000"/></div>
            {activeCount > 0 &&
                <button className="button button-secondary filter-reset" onClick={onClear}>Xóa tất cả bộ lọc</button>}
            <button className="button filter-done" onClick={onClose}>Xem kết quả</button>
        </aside>
    </>;
}
