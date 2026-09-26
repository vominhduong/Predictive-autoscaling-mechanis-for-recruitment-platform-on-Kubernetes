import { Search, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

export interface SearchValues { keyword: string; locationId: string; categoryId: string }
export function SearchBar({ values, onSubmit, compact = false }: { values: SearchValues; onSubmit: (values: SearchValues) => void; compact?: boolean }) {
  const [form, setForm] = useState(values);
  useEffect(() => setForm({ keyword: values.keyword, locationId: values.locationId, categoryId: values.categoryId }), [values.keyword, values.locationId, values.categoryId]);
  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit({ keyword: form.keyword.trim(), locationId: form.locationId.trim(), categoryId: form.categoryId.trim() }); };
  return <form className={`job-search ${compact ? 'job-search-compact' : ''}`} role="search" aria-label="Tìm kiếm việc làm" onSubmit={submit}>
    <label className="search-field search-keyword"><span>Từ khóa</span><Search aria-hidden="true" /><input value={form.keyword} onChange={event => setForm({ ...form, keyword: event.target.value })} placeholder="Vị trí hoặc kỹ năng" />{form.keyword && <button type="button" className="search-clear" aria-label="Xóa từ khóa" onClick={() => setForm({ ...form, keyword: '' })}><X /></button>}</label>
    <label className="search-field"><span>Địa điểm</span><input value={form.locationId} onChange={event => setForm({ ...form, locationId: event.target.value })} placeholder="UUID địa điểm" /></label>
    <label className="search-field"><span>Danh mục</span><input value={form.categoryId} onChange={event => setForm({ ...form, categoryId: event.target.value })} placeholder="UUID danh mục" /></label>
    <button className="button search-submit" type="submit"><Search /> Tìm việc</button>
  </form>;
}
