import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useCallback, useRef, useState} from 'react';
import {Link, useLocation, useSearchParams} from 'react-router-dom';
import {profileApi} from '../../api/services';
import {normalizeError} from '../../api/errors';
import {Dialog, Skeleton} from '../../components/DesignSystem';
import {Empty, ErrorState, Page, Status} from '../../components/Ui';
import {safeReturnPath} from '../../utils/navigation';
import {validateCv} from '../../utils/validation';
import type {Cv} from '../../types/api';

export function CvsPage() {
    const qc = useQueryClient();
    const location = useLocation();
    const [params] = useSearchParams();
    const returnTo = safeReturnPath(params.get('returnTo'), '/jobs');
    const [file, setFile] = useState<File | null>(null);
    const [isDefault, setDefault] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<Cv | null>(null);
    const input = useRef<HTMLInputElement>(null);
    const close = useCallback(() => setDeleting(null), []);
    const query = useQuery({queryKey: ['cvs'], queryFn: profileApi.cvs});
    const upload = useMutation({
        mutationFn: () => profileApi.upload(file!, isDefault), onSuccess: () => {
            setFile(null);
            if (input.current) input.current.value = '';
            qc.invalidateQueries({queryKey: ['cvs']});
        }
    });
    const remove = useMutation({
        mutationFn: profileApi.deleteCv, onSuccess: () => {
            setDeleting(null);
            qc.invalidateQueries({queryKey: ['cvs']});
        }
    });
    return <Page title="CV của tôi" eyebrow="Hồ sơ ứng viên"
                 description="Tải CV PDF để sử dụng khi ứng tuyển. Bạn có thể lưu nhiều phiên bản.">
        {params.has('returnTo') &&
            <Link className="back-link" to={returnTo} state={location.state}>Quay lại việc làm đang xem</Link>}
        <form className="panel form-grid" onSubmit={event => {
            event.preventDefault();
            if (file && !validateCv(file) && !upload.isPending) upload.mutate();
        }}>
            <h2>Tải CV</h2><p id="cv-hint">Chấp nhận PDF, tối đa 5 MB. Kiểm tra đúng phiên bản trước khi tải lên.</p>
            <label htmlFor="cv-file">Chọn CV PDF</label><input id="cv-file" ref={input} type="file"
                                                               accept="application/pdf,.pdf"
                                                               aria-describedby="cv-hint cv-error"
                                                               aria-invalid={Boolean(fileError)}
                                                               disabled={upload.isPending} onChange={event => {
            const next = event.target.files?.[0] ?? null;
            setFile(next);
            setFileError(validateCv(next));
            upload.reset();
        }}/>
            {file && <p>{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
            <div id="cv-error" role={fileError ? 'alert' : undefined}>{fileError}</div>
            <label className="check"><input type="checkbox" checked={isDefault} disabled={upload.isPending}
                                            onChange={event => setDefault(event.target.checked)}/> Đặt làm CV mặc
                định</label>
            {upload.isError &&
                <div className="notice error" role="alert">{normalizeError(upload.error).message} Tệp đã chọn vẫn được
                    giữ để bạn thử lại.</div>}
            <button className="button"
                    disabled={!file || Boolean(fileError) || upload.isPending}>{upload.isPending ? 'Đang tải CV…' : upload.isError ? 'Thử tải lại' : 'Tải lên'}</button>
        </form>
        {upload.isSuccess &&
            <div className="notice success" role="status">Đã tải CV thành công. {params.has('returnTo') &&
                <Link to={returnTo} state={location.state}>Quay lại việc làm để ứng tuyển</Link>}</div>}
        {remove.isSuccess && <p className="notice success" role="status">Đã xóa CV.</p>}
        {query.isPending ? <Skeleton/> : query.isError ? <ErrorState message={normalizeError(query.error).message}
                                                                     retry={() => query.refetch()}/> : query.data.length === 0 ?
            <Empty title="Chưa có CV" text="Tải CV đầu tiên để bắt đầu ứng tuyển."
                   action={<button className="button button-secondary" onClick={() => input.current?.click()}>Chọn CV để
                       tải lên</button>}/> :
            <div className="cards">{query.data.map(cv => <article className="panel cv-card" key={cv.id}>
                <div><h2>{cv.fileName}</h2><p>{(cv.sizeBytes / 1024).toFixed(0)} KB
                    · {new Date(cv.createdAt).toLocaleDateString('vi-VN')}</p>{cv.isDefault &&
                    <Status value="DEFAULT"/>}</div>
                <button className="button button-danger" aria-label={'Xóa ' + cv.fileName} onClick={() => {
                    remove.reset();
                    setDeleting(cv);
                }}>Xóa CV
                </button>
            </article>)}</div>}
        <Dialog open={Boolean(deleting)} title="Xóa CV này?"
                description={<><p>{deleting?.fileName} sẽ bị xóa khỏi danh sách CV. Thao tác này không thể hoàn
                    tác.</p>{remove.isError && <p role="alert">{normalizeError(remove.error).message}</p>}</>} danger
                confirmLabel={remove.isError ? 'Thử xóa lại' : 'Xóa CV'} pending={remove.isPending} onClose={close}
                onConfirm={() => {
                    if (deleting && !remove.isPending) remove.mutate(deleting.id);
                }}/>
    </Page>;
}
