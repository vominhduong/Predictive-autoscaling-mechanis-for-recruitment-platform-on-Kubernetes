import {useEffect, useRef, useState} from 'react';
import axios from 'axios';
import {applicationApi} from '../../api/services';

export function ApplicationCv({id, fileName}: {id: string; fileName?: string}) {
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState('');
    const [preview, setPreview] = useState<string | null>(null);
    const resources = useRef({urls: new Set<string>(), timers: new Set<ReturnType<typeof setTimeout>>(), request: null as AbortController | null});
    useEffect(() => {
        const owned = resources.current;
        return () => {
            owned.request?.abort();
            owned.timers.forEach(clearTimeout);
            owned.urls.forEach(url => URL.revokeObjectURL(url));
            owned.urls.clear();
        };
    }, []);

    function closePreview() {
        if (preview) {
            URL.revokeObjectURL(preview);
            resources.current.urls.delete(preview);
            setPreview(null);
        }
    }

    async function load(download: boolean) {
        if (resources.current.request) return;
        const controller = new AbortController();
        resources.current.request = controller;
        setPending(true);
        setMessage('');
        closePreview();
        try {
            const response = await applicationApi.cv(id, download, controller.signal);
            if (controller.signal.aborted) return;
            const blob = response.data;
            if (!blob.size) throw new Error('EMPTY_CV');
            const url = URL.createObjectURL(blob);
            resources.current.urls.add(url);
            if (!download && blob.type.split(';')[0] === 'application/pdf') {
                setPreview(url);
            } else {
                const link = document.createElement('a');
                link.href = url;
                const baseName = (fileName || 'cv').split(/[\\/]/).pop() || 'cv';
                link.download = Array.from(baseName, char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127
                    || '";:*?<>|'.includes(char) ? '_' : char).join('');
                document.body.append(link);
                link.click();
                link.remove();
                const timer = setTimeout(() => {
                    URL.revokeObjectURL(url);
                    resources.current.urls.delete(url);
                    resources.current.timers.delete(timer);
                }, 60000);
                resources.current.timers.add(timer);
                setMessage(download ? 'Đã bắt đầu tải CV.' : 'Định dạng này không hỗ trợ xem trực tiếp (ví dụ DOC/DOCX). Đã bắt đầu tải CV để mở trên máy.');
            }
        } catch (error) {
            if (controller.signal.aborted) return;
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;
            setMessage(status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
                : status === 403 ? 'Bạn không có quyền xem CV của đơn ứng tuyển này.'
                : status === 404 ? 'Không tìm thấy CV. File có thể đã bị xóa hoặc đơn không có CV.'
                : 'Không thể tải nội dung CV. Vui lòng thử lại.');
        } finally {
            if (!controller.signal.aborted) setPending(false);
            resources.current.request = null;
        }
    }

    return <div>
        <div className="actions">
            <button type="button" disabled={pending || !fileName} onClick={() => void load(false)}>Xem CV</button>
            <button type="button" className="button button-secondary" disabled={pending || !fileName} onClick={() => void load(true)}>Tải CV</button>
        </div>
        {!fileName && <p role="status">Đơn ứng tuyển chưa có CV.</p>}
        {pending && <p role="status">Đang tải nội dung CV…</p>}
        {message && <p role="status">{message}</p>}
        {preview && <section aria-label="Nội dung CV">
            <button type="button" onClick={closePreview}>Đóng CV</button>
            <p>Nếu trình duyệt không hiển thị PDF, hãy chọn “Tải CV”.</p>
            <iframe title={`CV: ${fileName}`} src={preview} style={{width: '100%', height: '70vh', border: 0}}/>
        </section>}
    </div>;
}
