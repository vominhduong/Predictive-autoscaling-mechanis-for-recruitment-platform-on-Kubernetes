import axios from 'axios';
import type {ApiErrorBody} from '../types/api';

const messages: Record<string, string> = {
    FILE_TOO_LARGE: 'CV vượt quá dung lượng cho phép. Hãy chọn PDF nhỏ hơn 5 MB.',
    UNSUPPORTED_FILE_TYPE: 'Hãy chọn tệp PDF hợp lệ.',
    CV_IN_USE: 'CV đang được sử dụng trong hồ sơ ứng tuyển và chưa thể xóa. Hãy tải lên bản mới.',
    EMAIL_ALREADY_EXISTS: 'Email đã được đăng ký. Hãy đăng nhập bằng tài khoản của bạn.',
    CATEGORY_NOT_FOUND: 'Không tìm thấy ngành nghề. Hãy kiểm tra mã do quản trị viên cung cấp.',
    LOCATION_NOT_FOUND: 'Không tìm thấy địa điểm. Hãy kiểm tra mã do quản trị viên cung cấp.',
    VALIDATION_ERROR: 'Vui lòng kiểm tra lại thông tin.',
    INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
    UNAUTHORIZED: 'Phiên đăng nhập không hợp lệ.',
    FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này. Hãy quay lại tổng quan hoặc liên hệ người quản lý.',
    ACCESS_DENIED: 'Bạn không có quyền thực hiện thao tác này. Hãy quay lại tổng quan hoặc liên hệ người quản lý.',
    RESOURCE_FORBIDDEN: 'Bạn không có quyền xem nội dung này. Hãy quay lại danh sách hoặc liên hệ người quản lý.',
    PROFILE_NOT_FOUND: 'Chưa có hồ sơ ứng viên.',
    CV_NOT_FOUND: 'Không tìm thấy CV.',
    JOB_NOT_FOUND: 'Không tìm thấy việc làm.',
    JOB_APPLICATION_CLOSED: 'Việc làm không còn nhận hồ sơ.',
    APPLICATION_ALREADY_EXISTS: 'Bạn đã ứng tuyển công việc này.',
    DUPLICATE_APPLICATION: 'Bạn đã ứng tuyển công việc này.',
    INVALID_STATUS_TRANSITION: 'Không thể chuyển sang trạng thái đã chọn.',
    INVALID_APPLICATION_STATUS_TRANSITION: 'Không thể chuyển sang trạng thái đã chọn.',
    OPTIMISTIC_LOCK_CONFLICT: 'Dữ liệu vừa được cập nhật ở nơi khác. Hãy tải lại.',
    DEPENDENCY_UNAVAILABLE: 'Dịch vụ tạm thời không khả dụng.',
    UPSTREAM_SERVICE_UNAVAILABLE: 'Dịch vụ tạm thời không khả dụng.',
    UPSTREAM_SERVICE_TIMEOUT: 'Dịch vụ phản hồi quá lâu.'
};

export class AppError extends Error {
    constructor(public code: string, message: string, public fields: ApiErrorBody['fieldErrors'] = [], public status?: number) {
        super(message)
    }
}

export function normalizeError(error: unknown) {
    if (error instanceof AppError) return error;
    if (axios.isAxiosError<ApiErrorBody>(error)) {
        const body = error.response?.data;
        const code = body?.code ?? 'UNKNOWN_ERROR';
        return new AppError(code, messages[code] ?? (error.response?.status === 403 ? 'Bạn không có quyền thực hiện thao tác này. Hãy quay lại tổng quan hoặc liên hệ người quản lý. Hãy liên hệ chủ sở hữu công ty.' : error.response?.status === 404 ? 'Không tìm thấy nội dung. Hãy quay lại danh sách.' : 'Không thể hoàn tất thao tác. Vui lòng kiểm tra kết nối và thử lại.'), body?.fieldErrors ?? [], error.response?.status)
    }
    return new AppError('UNKNOWN_ERROR', 'Đã có lỗi xảy ra. Vui lòng thử lại.')
}
