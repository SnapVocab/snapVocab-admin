import { ApiClientError } from '../../lib/api-client';

/** Read errors come from the real GETs; write codes are the ones proposed in templates_ui.md §8.4. */
export function templateErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'VERSION_CONFLICT') return 'Mẫu vừa được sửa ở nơi khác. Tải lại để xem bản mới trước khi lưu.';
    if (error.code === 'TEMPLATE_BINDING_INVALID') return 'Máy chủ từ chối: Quiz không đọc được mẫu này (thiếu hoặc trùng vai trò).';
    if (error.code === 'VALIDATION_ERROR') return 'Máy chủ từ chối nội dung: kiểm tra các ô được đánh dấu.';
    if (error.code === 'TEMPLATE_NOT_FOUND') return 'Không tìm thấy mẫu thẻ này; có thể nó vừa bị xóa.';
    if (error.statusCode === 404) return 'Máy chủ này chưa có API cần dùng (đọc hoặc ghi mẫu thẻ).';
    if (error.statusCode === 403) return 'Bạn không có quyền với mẫu thẻ.';
    if (error.statusCode === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (error.statusCode === 0) return 'Không thể kết nối đến máy chủ. Vui lòng thử lại.';
  }
  return 'Không tải được dữ liệu mẫu thẻ. Vui lòng thử lại.';
}
