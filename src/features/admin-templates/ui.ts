import { ApiClientError } from '../../lib/api-client';

/** Read errors come from the real GETs; write codes are the ones proposed in templates_ui.md §8.4. */
export function templateErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'VERSION_CONFLICT') return 'Mẫu vừa được sửa ở nơi khác. Tải lại để xem bản mới trước khi lưu.';
    const d = (error.details ?? {}) as Record<string, unknown>;
    // Also counts the server-only (hidden) bindings this screen cannot see, so it can refuse what the checks here passed.
    if (error.code === 'TEMPLATE_BINDING_INVALID') return `Máy chủ từ chối: Quiz ${d.mode ?? ''} không đọc được mẫu này (${d.kind === 'AMBIGUOUS' ? 'vai trò gán cho nhiều thuộc tính' : 'thiếu vai trò'} ${d.role ?? ''}).`;
    if (error.code === 'VALIDATION_ERROR' && d.field === 'elements') return 'Mỗi mặt thẻ cần ít nhất một trường hiển thị (mẫu đang có mặt trống).';
    if (error.code === 'VALIDATION_ERROR') return d.field ? `Máy chủ từ chối nội dung ở ${String(d.field)}.` : 'Máy chủ từ chối nội dung: kiểm tra các ô được đánh dấu.';
    if (error.code === 'TEMPLATE_NOT_FOUND' || error.statusCode === 404) return 'Không tìm thấy mẫu thẻ hệ thống này; có thể nó vừa bị xóa hoặc máy chủ chưa có API ghi mẫu thẻ.';
    if (error.statusCode === 403) return 'Bạn không có quyền với mẫu thẻ.';
    if (error.statusCode === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (error.statusCode === 0) return 'Không thể kết nối đến máy chủ. Vui lòng thử lại.';
  }
  return 'Không tải được dữ liệu mẫu thẻ. Vui lòng thử lại.';
}
