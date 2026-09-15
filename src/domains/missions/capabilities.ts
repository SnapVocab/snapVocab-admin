// ====================================================
// BACKEND MISSION CAPABILITY REGISTRY
// Source of Truth: docs/spec/buss_mainflow.md (§BF-12B, §BF-12C, §BF-15A)
// Mô phỏng API hợp đồng Backend: GET /admin/missions/capabilities
// ====================================================

import {
  MissionActionType,
  MissionCategory,
  MissionTriggerEvent,
  MissionAggregationType,
  NavigationParams,
  CompletionRule,
} from './types';

export interface RuleFieldDefinition {
  key: keyof CompletionRule;
  label: string;
  type: 'boolean' | 'number' | 'text';
  tooltip: string;
  defaultValue?: any;
}

export interface MissionCapability {
  actionType: MissionActionType;
  name: string;
  description: string;
  category: MissionCategory;
  allowedEvents: MissionTriggerEvent[];
  defaultTriggerEvent: MissionTriggerEvent;
  allowedAggregations: MissionAggregationType[];
  defaultAggregation: MissionAggregationType;
  defaultUnit: string;
  suggestedTargetCount: number;
  supportedClientVersion: string;
  defaultNavigation: NavigationParams;
  ruleFields: RuleFieldDefinition[];
}

export const BACKEND_CAPABILITY_REGISTRY: Record<MissionActionType, MissionCapability> = {
  SCAN_OBJECT: {
    actionType: 'SCAN_OBJECT',
    name: 'AI Camera Scan',
    description: 'Nhận diện đồ vật qua ảnh và bắt buộc lưu từ vựng (F-GAME-11).',
    category: 'SCAN_CAPTURE',
    allowedEvents: ['WORD_SCANNED_AND_SAVED'],
    defaultTriggerEvent: 'WORD_SCANNED_AND_SAVED',
    allowedAggregations: ['COUNT', 'UNIQUE_COUNT'],
    defaultAggregation: 'COUNT',
    defaultUnit: 'lượt scan có lưu từ',
    suggestedTargetCount: 3,
    supportedClientVersion: 'v1.0.0',
    defaultNavigation: {
      targetScreen: 'CAMERA_SCAN',
      ctaLabel: 'Mở Camera AI',
    },
    ruleFields: [
      {
        key: 'requireSavedWord',
        label: 'Bắt buộc lưu từ vào sổ tay (F-GAME-11)',
        type: 'boolean',
        tooltip: 'Học viên phải lưu ít nhất 1 từ vựng từ ảnh scan để ngăn chặn spam ảnh rỗng.',
        defaultValue: true,
      },
      {
        key: 'uniqueWordOnly',
        label: 'Chỉ tính các từ khác nhau',
        type: 'boolean',
        tooltip: 'Không tính lượt scan nếu học viên quét đi quét lại cùng 1 từ vựng.',
        defaultValue: false,
      },
    ],
  },

  REVIEW_SRS: {
    actionType: 'REVIEW_SRS',
    name: 'Ôn Tập Flashcard SRS',
    description: 'Ôn tập thẻ từ vựng đến hạn lặp ngắt quãng FSRS/SM-2 (BF-10).',
    category: 'FLASHCARD_SRS',
    allowedEvents: ['SRS_REVIEW_COMPLETED'],
    defaultTriggerEvent: 'SRS_REVIEW_COMPLETED',
    allowedAggregations: ['COUNT', 'PERCENTAGE'],
    defaultAggregation: 'COUNT',
    defaultUnit: 'thẻ SRS',
    suggestedTargetCount: 15,
    supportedClientVersion: 'v1.0.0',
    defaultNavigation: {
      targetScreen: 'SRS_REVIEW',
      ctaLabel: 'Vào Hàng Đợi Ôn Tập',
    },
    ruleFields: [
      {
        key: 'clearSnapshotOnly',
        label: 'Chỉ tính thẻ thuộc SRS Snapshot đầu ngày',
        type: 'boolean',
        tooltip: 'Theo BF-12A bước 10: item mới đến hạn sau lúc cấp mission sẽ không làm tăng chỉ tiêu.',
        defaultValue: true,
      },
    ],
  },

  LEARN_NEW_WORDS: {
    actionType: 'LEARN_NEW_WORDS',
    name: 'Học Từ Mới Theo Chủ Đề',
    description: 'Học và ghi nhớ từ vựng mới trong Decks hoặc Topics (BF-08).',
    category: 'VOCAB_BUILDING',
    allowedEvents: ['FLASHCARD_REVIEWED', 'TOPIC_COMPLETED'],
    defaultTriggerEvent: 'FLASHCARD_REVIEWED',
    allowedAggregations: ['COUNT', 'UNIQUE_COUNT'],
    defaultAggregation: 'COUNT',
    defaultUnit: 'từ mới',
    suggestedTargetCount: 5,
    supportedClientVersion: 'v1.0.0',
    defaultNavigation: {
      targetScreen: 'FLASHCARD_STUDY',
      ctaLabel: 'Chọn Chủ Đề Học',
    },
    ruleFields: [
      {
        key: 'uniqueWordOnly',
        label: 'Mỗi từ chỉ tính 1 lần duy nhất trong ngày',
        type: 'boolean',
        tooltip: 'Tránh việc học viên lật đi lật lại 1 thẻ từ để hoàn thành nhiệm vụ.',
        defaultValue: true,
      },
    ],
  },

  QUIZ_PERFECT: {
    actionType: 'QUIZ_PERFECT',
    name: 'Kiểm Tra / Làm Quiz',
    description: 'Đánh giá năng lực ghi nhớ qua Quiz trắc nghiệm (BF-09).',
    category: 'QUIZ_ACCURACY',
    allowedEvents: ['QUIZ_COMPLETED'],
    defaultTriggerEvent: 'QUIZ_COMPLETED',
    allowedAggregations: ['COUNT', 'PERCENTAGE', 'STREAK'],
    defaultAggregation: 'PERCENTAGE',
    defaultUnit: 'bài quiz',
    suggestedTargetCount: 1,
    supportedClientVersion: 'v1.0.0',
    defaultNavigation: {
      targetScreen: 'QUIZ_SETUP',
      ctaLabel: 'Bắt Đầu Làm Quiz',
    },
    ruleFields: [
      {
        key: 'minAccuracyPercent',
        label: 'Tỷ lệ chính xác tối thiểu (%)',
        type: 'number',
        tooltip: 'Ví dụ: 80 hoặc 100%. Quiz phải đạt độ chính xác này mới kích hoạt event hoàn thành.',
        defaultValue: 80,
      },
      {
        key: 'requireConsecutiveStreak',
        label: 'Số câu đúng liên tiếp tối thiểu',
        type: 'number',
        tooltip: 'Áp dụng cho dạng thử thách chuỗi trả lời đúng liên tục.',
        defaultValue: 0,
      },
    ],
  },

  MAINTAIN_STREAK: {
    actionType: 'MAINTAIN_STREAK',
    name: 'Duy Trì Chuỗi Streak',
    description: 'Thực hiện hoạt động học bất kỳ để bảo toàn ngọn lửa Streak (BF-11).',
    category: 'RETENTION_GAMIFICATION',
    allowedEvents: ['STREAK_MAINTAINED'],
    defaultTriggerEvent: 'STREAK_MAINTAINED',
    allowedAggregations: ['COUNT'],
    defaultAggregation: 'COUNT',
    defaultUnit: 'ngày streak',
    suggestedTargetCount: 1,
    supportedClientVersion: 'v1.0.0',
    defaultNavigation: {
      targetScreen: 'STREAK_DETAIL',
      ctaLabel: 'Xem Chuỗi Streak',
    },
    ruleFields: [],
  },

  EXPLORE_TOPIC: {
    actionType: 'EXPLORE_TOPIC',
    name: 'Khám Phá & Hoàn Thành Chủ Đề',
    description: 'Khám phá toàn bộ từ vựng trong 1 topic mới.',
    category: 'VOCAB_BUILDING',
    allowedEvents: ['TOPIC_COMPLETED'],
    defaultTriggerEvent: 'TOPIC_COMPLETED',
    allowedAggregations: ['COUNT'],
    defaultAggregation: 'COUNT',
    defaultUnit: 'chủ đề',
    suggestedTargetCount: 1,
    supportedClientVersion: 'v1.1.0',
    defaultNavigation: {
      targetScreen: 'TOPIC_EXPLORE',
      ctaLabel: 'Duyệt Thư Viện Chủ Đề',
    },
    ruleFields: [],
  },

  LISTEN_AUDIO: {
    actionType: 'LISTEN_AUDIO',
    name: 'Luyện Nghe Phát Âm Từ Vựng',
    description: 'Nghe phát âm bản xứ từ vựng qua audio player.',
    category: 'RETENTION_GAMIFICATION',
    allowedEvents: ['AUDIO_LISTENED'],
    defaultTriggerEvent: 'AUDIO_LISTENED',
    allowedAggregations: ['COUNT', 'UNIQUE_COUNT'],
    defaultAggregation: 'COUNT',
    defaultUnit: 'lượt nghe',
    suggestedTargetCount: 10,
    supportedClientVersion: 'v1.0.0',
    defaultNavigation: {
      targetScreen: 'HOME_HUB',
      ctaLabel: 'Mở Thư Viện Từ Vựng',
    },
    ruleFields: [
      {
        key: 'uniqueWordOnly',
        label: 'Chỉ tính các từ khác nhau',
        type: 'boolean',
        tooltip: 'Nghe nhiều lần cùng 1 từ chỉ tính 1 lượt.',
        defaultValue: true,
      },
    ],
  },
};

export function getCapabilityByAction(actionType: MissionActionType): MissionCapability {
  return BACKEND_CAPABILITY_REGISTRY[actionType];
}

export function getAllCapabilities(): MissionCapability[] {
  return Object.values(BACKEND_CAPABILITY_REGISTRY);
}

export function getCapabilitiesByCategory(category: MissionCategory): MissionCapability[] {
  return getAllCapabilities().filter((c) => c.category === category);
}

export function getSlotCategoryLabel(category: MissionCategory): string {
  switch (category) {
    case 'SCAN_CAPTURE':
      return 'Slot 1: Scan & Capture (AI)';
    case 'VOCAB_BUILDING':
      return 'Slot 2: Xây Dựng Từ Vựng';
    case 'FLASHCARD_SRS':
      return 'Slot 3: Flashcard & Ôn SRS';
    case 'QUIZ_ACCURACY':
      return 'Slot 4: Quiz & Kiểm Tra';
    case 'RETENTION_GAMIFICATION':
      return 'Slot 5: Duy Trì & Gamification';
    default:
      return category;
  }
}

export function getSlotCategoryBadge(category: MissionCategory): { label: string; color: string } {
  switch (category) {
    case 'SCAN_CAPTURE':
      return { label: 'Slot 1: Scan', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'VOCAB_BUILDING':
      return { label: 'Slot 2: Vocab', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'FLASHCARD_SRS':
      return { label: 'Slot 3: SRS', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'QUIZ_ACCURACY':
      return { label: 'Slot 4: Quiz', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'RETENTION_GAMIFICATION':
      return { label: 'Slot 5: Habit', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    default:
      return { label: category, color: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
}
