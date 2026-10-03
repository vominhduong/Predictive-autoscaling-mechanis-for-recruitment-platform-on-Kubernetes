import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {http, HttpResponse} from 'msw';
import {ApplicationCv} from '../features/employer/ApplicationCv';
import {server} from './server';
import {createSession, setSession} from '../features/auth/session';
import {jwt} from './fixtures';

const endpoint = 'http://localhost:8080/api/v1/applications/app-1/cv';
beforeEach(() => {
    vi.stubGlobal('URL', Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:cv-preview'), revokeObjectURL: vi.fn()
    }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('application CV content', () => {
    it('fetches PDF with Bearer authorization and releases the viewer URL on close', async () => {
        const token = jwt();
        setSession(createSession({accessToken: token, refreshToken: 'refresh', tokenType: 'Bearer', expiresIn: 300, refreshExpiresIn: 600}));
        server.use(http.get(endpoint, ({request}) => {
            expect(request.headers.get('Authorization')).toBe(`Bearer ${token}`);
            expect(new URL(request.url).searchParams.get('download')).toBe('false');
            return new HttpResponse('%PDF-1.4\nCV content\n%%EOF', {headers: {'Content-Type': 'application/pdf'}});
        }));
        render(<ApplicationCv id="app-1" fileName="cv.pdf"/>);
        fireEvent.click(screen.getByText('Xem CV'));
        expect(screen.getByText('Đang tải nội dung CV…')).toBeInTheDocument();
        expect(await screen.findByTitle('CV: cv.pdf')).toHaveAttribute('src', 'blob:cv-preview');
        expect(URL.createObjectURL).toHaveBeenCalledWith(expect.objectContaining({type: 'application/pdf', size: '%PDF-1.4\nCV content\n%%EOF'.length}));
        fireEvent.click(screen.getByText('Đóng CV'));
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:cv-preview');
        expect(screen.queryByTitle('CV: cv.pdf')).not.toBeInTheDocument();
    });

    it('downloads unsupported formats and cleans URLs when unmounted', async () => {
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        server.use(http.get(endpoint, () => new HttpResponse('docx bytes', {headers: {'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}})));
        const view = render(<ApplicationCv id="app-1" fileName="cv.docx"/>);
        fireEvent.click(screen.getByText('Xem CV'));
        expect(await screen.findByText(/Định dạng này không hỗ trợ/)).toBeInTheDocument();
        expect(click).toHaveBeenCalledOnce();
        expect(screen.queryByTitle('CV: cv.docx')).not.toBeInTheDocument();
        view.unmount();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:cv-preview');
    });

    it('requests attachment mode for downloads', async () => {
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        server.use(http.get(endpoint, ({request}) => {
            expect(new URL(request.url).searchParams.get('download')).toBe('true');
            return new HttpResponse('%PDF-content', {headers: {'Content-Type': 'application/pdf'}});
        }));
        const view = render(<ApplicationCv id="app-1" fileName="cv.pdf"/>);
        fireEvent.click(screen.getByText('Tải CV'));
        await screen.findByText('Đã bắt đầu tải CV.');
        view.unmount();
        expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it.each([[401, /Phiên đăng nhập đã hết hạn/], [403, /Bạn không có quyền/], [404, /Không tìm thấy CV/], [503, /Không thể tải nội dung CV/]] as const)(
        'shows an actionable error for HTTP %s', async (status, message) => {
            server.use(http.get(endpoint, () => HttpResponse.json({code: 'ERROR'}, {status})));
            render(<ApplicationCv id="app-1" fileName="cv.pdf"/>);
            fireEvent.click(screen.getByText('Xem CV'));
            expect(await screen.findByText(message)).toBeInTheDocument();
            await waitFor(() => expect(screen.getByText('Xem CV')).toBeEnabled());
            expect(URL.createObjectURL).not.toHaveBeenCalled();
        });

    it('explains a missing CV without issuing a request', () => {
        render(<ApplicationCv id="app-1"/>);
        expect(screen.getByText('Xem CV')).toBeDisabled();
        expect(screen.getByText('Đơn ứng tuyển chưa có CV.')).toBeInTheDocument();
    });
});
