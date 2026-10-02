import {useId, type Ref} from 'react';
import {useJobMetadata} from '../../api/jobMetadata';

export function ReferenceSelect({kind, value, onChange, required = false, error, inputRef}: {
    kind: 'location' | 'category';
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    error?: string;
    inputRef?: Ref<HTMLSelectElement>
}) {
    const id = useId();
    const metadata = useJobMetadata();
    const query = kind === 'location' ? metadata.locations : metadata.categories;
    const options = query.data ?? [];
    const label = kind === 'location' ? 'Địa điểm' : 'Ngành nghề';
    const missing = Boolean(value && query.isSuccess && !options.some(option => option.id === value));
    const message = error || (missing && required ? 'Lựa chọn đã ngừng hoạt động hoặc không còn tồn tại. Vui lòng chọn lại.' : undefined);
    return <div className="reference-select" aria-busy={query.isPending}>
        <label htmlFor={id}>{label}{required ? ' *' : ''}</label>
        <select ref={inputRef} id={id} required={required} disabled={query.isPending || query.isError}
                aria-invalid={Boolean(message)} aria-describedby={id + '-help'}
                value={value} onChange={event => onChange(event.target.value)}>
            <option value="">{required ? 'Chọn ' + label.toLowerCase() : 'Tất cả ' + label.toLowerCase()}</option>
            {value && !options.some(option => option.id === value) && <option value={value} disabled>
                {missing ? 'Lựa chọn không còn khả dụng' : 'Lựa chọn đã lưu — đang xác minh'}
            </option>}
            {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
        <div id={id + '-help'}>
            {query.isPending &&
                <small className="metadata-skeleton" role="status">Đang tải {label.toLowerCase()}…</small>}
            {query.isError && <><small role="alert">Chưa tải được {label.toLowerCase()}.</small>
                <button type="button" onClick={() => query.refetch()}>Thử lại {label.toLowerCase()}</button>
            </>}
            {query.isSuccess && options.length === 0 && <small>Chưa có {label.toLowerCase()} khả dụng.</small>}
            {message && <small className="field-error" role="alert">{message}</small>}
        </div>
    </div>;
}
