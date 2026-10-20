import { BookOpen, Flame, Layers, ListChecks, RotateCcw, ScanLine, ShoppingBag } from 'lucide-react';
import { ApiClientError } from '../../lib/api-client';
export const categoryIcons = { SCAN: ScanLine, VOCABULARY: BookOpen, FLASHCARD: Layers, SRS: RotateCcw, QUIZ: ListChecks, RETENTION: Flame, SHOP: ShoppingBag };
export const isApiError = (e: unknown, code: string) => e instanceof ApiClientError && e.code === code;
export const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-surface-subtle disabled:text-text-muted';
export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const messages: Record<string, string> = {
      VERSION_CONFLICT: 'Mẫu nhiệm vụ đã được người khác cập nhật. Nội dung đang nhập được giữ; tải bản mới để đối chiếu.',
      MISSION_POOL_INSUFFICIENT: 'Thao tác làm catalog không đủ cấp 5 nhiệm vụ mỗi ngày. Cần ít nhất 4 mẫu cốt lõi và 1 mẫu slot 5 không có điều kiện cấp, hoặc 5 mẫu cốt lõi không có điều kiện cấp.',
      MISSION_TEMPLATE_CODE_EXISTS: 'Mã nhiệm vụ đã tồn tại.', REWARD_ITEM_NOT_ELIGIBLE: 'Vật phẩm thưởng phải tồn tại và ở trạng thái Đã phát hành.',
      FIELD_LOCKED: 'Mã nhiệm vụ không thể thay đổi sau khi tạo.', MISSION_TEMPLATE_NOT_FOUND: 'Không tìm thấy mẫu nhiệm vụ này.',
    };
    if (messages[error.code]) return messages[error.code];
    if (error.statusCode === 404) return 'Không tìm thấy dữ liệu nhiệm vụ trên máy chủ (API quản trị nhiệm vụ chưa sẵn sàng hoặc mục này đã bị xóa).';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Không thể hoàn tất thao tác. Vui lòng thử lại.';
}
