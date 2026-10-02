import {zodResolver} from '@hookform/resolvers/zod';
import {useJobMetadata} from '../../api/jobMetadata';
import {useForm} from 'react-hook-form';
import {useState} from 'react';
import {Field} from '../../components/Ui';
import {jobSchema, type JobInput} from '../jobs/schemas';
import {ReferenceSelect} from '../jobs/ReferenceSelect';
import {formatSalary} from '../jobs/jobDisplay';

export function JobForm({initial, onSave, pending, error}: {
    initial: JobInput;
    onSave: (value: JobInput) => void;
    pending: boolean;
    error?: string
}) {
    const form = useForm<JobInput>({resolver: zodResolver(jobSchema), defaultValues: initial});
    const metadata = useJobMetadata();
    const categoryId = form.watch('categoryId');
    const locationId = form.watch('locationId');
    const validMetadata = metadata.categories.isSuccess && metadata.locations.isSuccess
        && metadata.categories.data.some(option => option.id === categoryId)
        && metadata.locations.data.some(option => option.id === locationId);
    const [review, setReview] = useState<JobInput | null>(null);
    const negotiable = form.watch('salaryNegotiable');
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return <form className="panel form-grid job-editor" noValidate onSubmit={form.handleSubmit(value => {
        if (!pending && validMetadata) onSave(value);
    })}>
        <p>Các trường có dấu * là bắt buộc. Tin mới được lưu thành bản nháp trước khi đăng tuyển.</p>
        {error && <div className="notice error" role="alert">{error} Nội dung bạn đã nhập vẫn được giữ.</div>}
        <section><h2>1. Thông tin cơ bản</h2><Field label="Tiêu đề *"
                                                    error={form.formState.errors.title?.message}><input
            maxLength={255} {...form.register('title')} /></Field><Field
            label="Loại công việc *"><select {...form.register('employmentType')}>
            <option value="FULL_TIME">Toàn thời gian</option>
            <option value="PART_TIME">Bán thời gian</option>
            <option value="CONTRACT">Hợp đồng</option>
            <option value="INTERNSHIP">Thực tập</option>
            <option value="FREELANCE">Tự do</option>
        </select></Field></section>
        <section><h2>2. Mô tả công việc</h2><Field label="Mô tả *"
                                                   error={form.formState.errors.description?.message}><textarea rows={6}
                                                                                                                maxLength={20000} {...form.register('description')} /></Field>
        </section>
        <section><h2>3. Yêu cầu ứng viên</h2><Field label="Yêu cầu *"
                                                    error={form.formState.errors.requirements?.message}><textarea
            rows={6} maxLength={20000} {...form.register('requirements')} /></Field></section>
        <section><h2>4. Ngành nghề và địa điểm</h2><ReferenceSelect kind="category"
                                                                    error={form.formState.errors.categoryId?.message}
                                                                    inputRef={form.register('categoryId').ref} required
                                                                    value={form.watch('categoryId')}
                                                                    onChange={value => form.setValue('categoryId', value, {shouldValidate: true})}/><ReferenceSelect
            kind="location" error={form.formState.errors.locationId?.message} inputRef={form.register('locationId').ref}
            required value={form.watch('locationId')}
            onChange={value => form.setValue('locationId', value, {shouldValidate: true})}/></section>
        <section><h2>5. Mức lương</h2><label className="check"><input
            type="checkbox" {...form.register('salaryNegotiable', {
            onChange: event => {
                if (event.target.checked) {
                    form.setValue('salaryMin', null, {shouldValidate: true});
                    form.setValue('salaryMax', null, {shouldValidate: true});
                }
            }
        })} /> Lương thỏa thuận</label>{negotiable ?
            <p>Mức lương hiển thị là “Thỏa thuận”. Không cần nhập khoảng lương.</p> : <><Field label="Lương tối thiểu"
                                                                                               error={form.formState.errors.salaryMin?.message}><input
                type="number"
                min="0" {...form.register('salaryMin', {setValueAs: value => value === '' ? null : Number(value)})} /></Field><Field
                label="Lương tối đa" error={form.formState.errors.salaryMax?.message}><input type="number"
                                                                                             min="0" {...form.register('salaryMax', {setValueAs: value => value === '' ? null : Number(value)})} /></Field></>}<Field
            label="Mã tiền tệ *" hint="Ví dụ: VND hoặc USD."
            error={form.formState.errors.salaryCurrency?.message}><input
            maxLength={3} {...form.register('salaryCurrency')} /></Field></section>
        <section><h2>6. Hạn ứng tuyển</h2><Field label="Hạn ứng tuyển *" hint="Chọn ngày từ ngày mai trở đi."
                                                 error={form.formState.errors.applicationDeadline?.message}><input
            type="date" min={tomorrow.toISOString().slice(0, 10)} {...form.register('applicationDeadline')} /></Field>
        </section>
        {review && <section aria-live="polite"><h2>Xem lại tin tuyển dụng</h2><h3>{review.title}</h3>
            <p>{formatSalary(review)}</p><p>Hạn ứng tuyển: {review.applicationDeadline}</p><p
                className="preserve-lines">{review.description}</p><p
                className="preserve-lines">{review.requirements}</p><small>Đây là bản xem trước tại thời điểm nhấn “Xem
                lại”.</small></section>}
        <div className="sticky-actions">
            <button type="button" className="button button-secondary"
                    onClick={() => form.handleSubmit(value => setReview(value))()}>Xem lại
            </button>
            <button className="button"
                    disabled={pending || !validMetadata}>{pending ? 'Đang lưu…' : initial.version == null ? 'Lưu bản nháp' : 'Cập nhật'}</button>
        </div>
    </form>;
}
