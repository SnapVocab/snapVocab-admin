import { ApiClientError } from '../../lib/api-client';

export function badgeErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'BADGE_NOT_FOUND') return 'Không tìm thấy huy hiệu này.';
    if (error.code === 'VERSION_CONFLICT') {
      const v = error.details?.currentVersion;
      return `Huy hiệu vừa được sửa ở nơi khác${v !== undefined ? ` (máy chủ đang ở phiên bản ${v})` : ''}.`;
    }
    if (error.code === 'VALIDATION_ERROR') return 'Máy chủ từ chối nội dung: kiểm tra các trường được đánh dấu.';
    if (error.code === 'FIELD_LOCKED') return 'Mã, chuỗi và ngưỡng không đổi được sau khi tạo.';
    if (error.statusCode === 404) return 'API quản trị huy hiệu chưa sẵn sàng trên máy chủ này.';
    if (error.statusCode === 403) return 'Bạn không có quyền xem catalog huy hiệu.';
    if (error.statusCode === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (error.statusCode === 0) return 'Không thể kết nối đến máy chủ. Vui lòng thử lại.';
  }
  return 'Không tải được dữ liệu huy hiệu. Vui lòng thử lại.';
}
