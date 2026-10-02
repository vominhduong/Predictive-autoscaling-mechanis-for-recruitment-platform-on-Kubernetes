import {ReferenceSelect} from './ReferenceSelect';
import {useJobMetadata} from '../../api/jobMetadata';
import {isUuid} from '../../utils/validation';
import {Search, X} from 'lucide-react';
import {useEffect, useState, type FormEvent} from 'react';

export interface SearchValues {
    keyword: string;
    locationId: string;
    categoryId: string
}

export function SearchBar({values, onSubmit, compact = false}: {
    values: SearchValues;
    onSubmit: (values: SearchValues) => void;
    compact?: boolean
}) {
    const metadata = useJobMetadata();
    const [form, setForm] = useState(values);
    useEffect(() => setForm({
        keyword: values.keyword,
        locationId: values.locationId,
        categoryId: values.categoryId
    }), [values.keyword, values.locationId, values.categoryId]);
    const submit = (event: FormEvent) => {
        event.preventDefault();
        onSubmit({
            keyword: form.keyword.trim(),
            locationId: isUuid(form.locationId) && (!metadata.locations.isSuccess || metadata.locations.data.some(option => option.id === form.locationId)) ? form.locationId : '',
            categoryId: isUuid(form.categoryId) && (!metadata.categories.isSuccess || metadata.categories.data.some(option => option.id === form.categoryId)) ? form.categoryId : ''
        });
    };
    return <form className={`job-search ${compact ? 'job-search-compact' : ''}`} role="search"
                 aria-label="Tìm kiếm việc làm" onSubmit={submit}>
        <label className="search-field search-keyword"><span>Từ khóa</span><Search aria-hidden="true"/><input
            value={form.keyword} onChange={event => setForm({...form, keyword: event.target.value})}
            placeholder="Vị trí hoặc kỹ năng"/>{form.keyword &&
            <button type="button" className="search-clear" aria-label="Xóa từ khóa"
                    onClick={() => setForm({...form, keyword: ''})}><X/></button>}</label>
        <ReferenceSelect kind="location" value={form.locationId}
                         onChange={locationId => setForm({...form, locationId})}/>
        <ReferenceSelect kind="category" value={form.categoryId}
                         onChange={categoryId => setForm({...form, categoryId})}/>
        <button className="button search-submit" type="submit"><Search/> {compact ? 'Tìm việc ngay' : 'Tìm việc'}
        </button>
    </form>;
}
