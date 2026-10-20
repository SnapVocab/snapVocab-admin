/**
 * Operator wording for scan enums, shared by Dashboard, Phân tích and the learner profile so the same code never reads
 * two ways. The raw code stays available in tooltips for support (design.md §3.7).
 */
import type { ScanErrorCode } from '../admin-learners/types';

export const SCAN_ERROR_LABEL: Record<ScanErrorCode, string> = {
  AI_QUEUE_FULL: 'Hàng đợi đầy',
  AI_TIMEOUT: 'AI quá thời gian chờ',
  INVALID_IMAGE: 'Ảnh không hợp lệ',
  AI_UNAVAILABLE: 'Dịch vụ AI không phản hồi',
  AI_ERROR: 'AI lỗi khi chạy mô hình',
  INTERRUPTED: 'Gián đoạn do máy chủ khởi động lại',
  QUOTA_EXCEEDED: 'Hết lượt trong ngày',
};

export const scanErrorLabel = (code: string) => SCAN_ERROR_LABEL[code as ScanErrorCode] ?? code;

/** `reliability` buckets of the AI service (per detection source). Never shown as a confidence %. */
export const RELIABILITY_LABEL: Record<'HIGH' | 'MEDIUM' | 'LOW', string> = { HIGH: 'Cao', MEDIUM: 'Trung bình', LOW: 'Thấp' };
