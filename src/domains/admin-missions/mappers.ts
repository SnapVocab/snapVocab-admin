import type { CreateMission, MissionContent, MissionForm, MissionTemplate, SaveMission } from './types';

export const categoryLabels = { SCAN: 'Quét ảnh', VOCABULARY: 'Từ vựng', FLASHCARD: 'Flashcard', SRS: 'Ôn tập SRS', QUIZ: 'Quiz', RETENTION: 'Duy trì học', SHOP: 'Cửa hàng' };
export const eligibilityLabels = { NONE: 'Không có điều kiện cấp', HAS_IDLE_XP_BOOSTER: 'Có booster XP chưa dùng', HAS_PURCHASABLE_ITEM: 'Có vật phẩm mua được' };
export const invariantHint = 'Chỉ kiểm tra invariant tối thiểu của catalog. Không đảm bảo mọi nhiệm vụ đều khả dụng cho mọi người học hoặc catalog đã sẵn sàng production.';
export const presets = [
  { key: 'ADD_5_WORDS', label: 'Thêm từ mới', category: 'VOCABULARY', triggerEvent: 'TOPIC_ITEM_CREATED', eligibilityRule: 'NONE', targetValue: '5', minQuizAccuracyPercent: '', quizRequestedCount: '', unit: 'từ' },
  { key: 'QUIZ_SCORE_80', label: 'Quiz đạt độ chính xác', category: 'QUIZ', triggerEvent: 'QUIZ_COMPLETED', eligibilityRule: 'NONE', targetValue: '1', minQuizAccuracyPercent: '80', quizRequestedCount: '', unit: 'quiz' },
  { key: 'FINISH_2_SHORT_QUIZZES', label: 'Hoàn thành quiz ngắn', category: 'QUIZ', triggerEvent: 'QUIZ_COMPLETED', eligibilityRule: 'NONE', targetValue: '2', minQuizAccuracyPercent: '', quizRequestedCount: '5', unit: 'quiz' },
  { key: 'PERFECT_MINI_QUIZ', label: 'Quiz ngắn hoàn hảo', category: 'QUIZ', triggerEvent: 'QUIZ_COMPLETED', eligibilityRule: 'NONE', targetValue: '1', minQuizAccuracyPercent: '100', quizRequestedCount: '5', unit: 'quiz' },
  { key: 'KEEP_DAILY_STREAK', label: 'Có hoạt động học trong ngày', category: 'RETENTION', triggerEvent: 'LEARNING_ACTIVITY_RECORDED', eligibilityRule: 'NONE', targetValue: '1', minQuizAccuracyPercent: '', quizRequestedCount: '', unit: 'hoạt động' },
  { key: 'USE_XP_BOOSTER', label: 'Kích hoạt booster XP', category: 'SHOP', triggerEvent: 'BOOSTER_USED', eligibilityRule: 'HAS_IDLE_XP_BOOSTER', targetValue: '1', minQuizAccuracyPercent: '', quizRequestedCount: '', unit: 'lần' },
  { key: 'BUY_SHOP_ITEM', label: 'Mua vật phẩm Shop', category: 'SHOP', triggerEvent: 'SHOP_ITEM_PURCHASED', eligibilityRule: 'HAS_PURCHASABLE_ITEM', targetValue: '1', minQuizAccuracyPercent: '', quizRequestedCount: '', unit: 'lần' },
] as const;
export function supportedPreset(value: Pick<MissionContent, 'category' | 'triggerEvent' | 'eligibilityRule'>) {
  return presets.find(p => p.category === value.category && p.triggerEvent === value.triggerEvent && p.eligibilityRule === value.eligibilityRule);
}
// Quiz presets differ only by filters: a quiz matching none of them is custom, never labelled as a preset.
export function matchPreset(f: Pick<MissionForm, 'category' | 'triggerEvent' | 'eligibilityRule' | 'minQuizAccuracyPercent' | 'quizRequestedCount'>) {
  return presets.find(p => p.category === f.category && p.triggerEvent === f.triggerEvent && p.eligibilityRule === f.eligibilityRule
    && (f.triggerEvent !== 'QUIZ_COMPLETED' || (p.quizRequestedCount === f.quizRequestedCount
      && (p.key === 'QUIZ_SCORE_80' ? f.minQuizAccuracyPercent !== '' : p.minQuizAccuracyPercent === f.minQuizAccuracyPercent))));
}
export function catalogSummary(items: MissionTemplate[]) {
  const active = items.filter(i => i.isActive);
  const none = active.filter(i => i.eligibilityRule === 'NONE');
  const core = none.filter(i => ['SCAN', 'VOCABULARY', 'FLASHCARD', 'SRS', 'QUIZ'].includes(i.category)).length;
  const slotFive = none.length - core;
  // No active template = "not activated" (spec §7.7): allowed by backend, not a violation.
  return { active: active.length, core, slotFive, inactive: !active.length, valid: core >= 4 && (slotFive >= 1 || core >= 5) };
}
export const eligibilityHints = {
  NONE: 'Không có eligibility gate khi chọn nhiệm vụ. Không có nghĩa mọi người học đều hoàn thành được.',
  HAS_IDLE_XP_BOOSTER: 'Chỉ được chọn cho người học đang có booster XP chưa dùng.',
  HAS_PURCHASABLE_ITEM: 'Chỉ được chọn cho người học có vật phẩm có thể mua.',
};
// Explains how far a (projected) catalog is from the invariant; backend remains the authority.
export function poolShortage(items: MissionTemplate[]) {
  const s = catalogSummary(items);
  if (s.valid || s.inactive) return '';
  const core = 4 - s.core;
  if (core <= 0) return 'Dự kiến thiếu 1 mẫu slot 5 NONE đang bật (hoặc thêm 1 mẫu cốt lõi NONE).';
  return `Dự kiến thiếu ${core} mẫu cốt lõi NONE đang bật${s.slotFive < 1 ? ', cộng 1 mẫu slot 5 NONE hoặc 1 mẫu cốt lõi nữa' : ''}.`;
}
export function emptyForm(): MissionForm {
  const p = presets[0];
  return { code: '', name: '', description: '', category: p.category, triggerEvent: p.triggerEvent, eligibilityRule: p.eligibilityRule,
    targetValue: p.targetValue, minQuizAccuracyPercent: '', quizRequestedCount: '', rewardCoin: '0', rewardXp: '0', rewardItemCode: null, rewardItemFallbackCoin: '', weight: '1' };
}
export function toForm(item: MissionTemplate): MissionForm {
  return { code: item.code, name: item.name, description: item.description, category: item.category, triggerEvent: item.triggerEvent,
    eligibilityRule: item.eligibilityRule, rewardItemCode: item.rewardItemCode,
    targetValue: String(item.targetValue), rewardCoin: String(item.rewardCoin), rewardXp: String(item.rewardXp), weight: String(item.weight),
    minQuizAccuracyPercent: item.minQuizAccuracyPercent === null ? '' : String(item.minQuizAccuracyPercent),
    quizRequestedCount: item.quizRequestedCount === null ? '' : String(item.quizRequestedCount),
    rewardItemFallbackCoin: item.rewardItemFallbackCoin === null ? '' : String(item.rewardItemFallbackCoin) };
}
export function validateForm(f: MissionForm): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [field, max] of [['code', 64], ['name', 100], ['description', 255]] as const) {
    if (!f[field].trim()) errors[field] = 'Vui lòng nhập trường này.';
    else if (f[field].length > max) errors[field] = `Tối đa ${max} ký tự.`;
  }
  for (const [field, min, max] of [['targetValue', 1, 2147483647], ['weight', 1, 2147483647], ['rewardCoin', 0, 2147483647], ['rewardXp', 0, 2147483647],
    ...(f.minQuizAccuracyPercent !== '' ? [['minQuizAccuracyPercent', 1, 100] as const] : []),
    ...(f.rewardItemCode ? [['rewardItemFallbackCoin', 0, 2147483647] as const] : [])] as const) {
    const raw = f[field]; const n = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isInteger(n) || n < min || n > max) errors[field] = `Nhập số nguyên từ ${min} đến ${max}.`;
  }
  if (f.quizRequestedCount !== '' && !['5', '10', '20'].includes(f.quizRequestedCount)) errors.quizRequestedCount = 'Chọn 5, 10 hoặc 20 câu.';
  if (f.triggerEvent !== 'QUIZ_COMPLETED' && (f.quizRequestedCount || f.minQuizAccuracyPercent)) errors.quizRequestedCount = 'Bộ lọc này chỉ dùng cho quiz.';
  if (!f.rewardItemCode && Number(f.rewardCoin) <= 0 && Number(f.rewardXp) <= 0) errors.rewardCoin = 'Cần Coin, XP hoặc một vật phẩm thưởng.';
  return errors;
}
export function createPayload(f: MissionForm): CreateMission {
  return { code: f.code.trim(), name: f.name.trim(), description: f.description.trim(), category: f.category, triggerEvent: f.triggerEvent,
    eligibilityRule: f.eligibilityRule, targetValue: Number(f.targetValue), weight: Number(f.weight), rewardCoin: Number(f.rewardCoin), rewardXp: Number(f.rewardXp),
    minQuizAccuracyPercent: f.minQuizAccuracyPercent === '' ? null : Number(f.minQuizAccuracyPercent),
    quizRequestedCount: f.quizRequestedCount === '' ? null : Number(f.quizRequestedCount) as 5 | 10 | 20,
    rewardItemCode: f.rewardItemCode, rewardItemFallbackCoin: f.rewardItemCode ? Number(f.rewardItemFallbackCoin) : null };
}
export function savePayload(f: MissionForm, original: MissionTemplate): SaveMission {
  const { code: _code, ...content } = createPayload(f);
  const patch: SaveMission = { version: original.version };
  for (const key of Object.keys(content) as (keyof MissionContent)[]) {
    if (content[key] !== original[key]) Object.assign(patch, { [key]: content[key] });
  }
  if ('rewardItemCode' in patch || 'rewardItemFallbackCoin' in patch) {
    patch.rewardItemCode = content.rewardItemCode;
    patch.rewardItemFallbackCoin = content.rewardItemFallbackCoin;
  }
  return patch;
}
const formLabels: Record<keyof MissionForm, string> = { code: 'Mã', name: 'Tên hiển thị', description: 'Mô tả', category: 'Nhóm', triggerEvent: 'Sự kiện', eligibilityRule: 'Điều kiện cấp',
  targetValue: 'Mục tiêu', quizRequestedCount: 'Số câu quiz', minQuizAccuracyPercent: 'Độ chính xác tối thiểu (%)', rewardCoin: 'Coin', rewardXp: 'XP',
  rewardItemCode: 'Vật phẩm thưởng', rewardItemFallbackCoin: 'Coin dự phòng', weight: 'Trọng số' };
/** Fields where the draft differs from the server copy, for the conflict comparison. */
export function formDiff(draft: MissionForm, server: MissionForm) {
  return (Object.keys(formLabels) as (keyof MissionForm)[]).filter(k => (draft[k] ?? '') !== (server[k] ?? ''))
    .map(k => ({ key: k, label: formLabels[k], draft: draft[k] || '—', server: server[k] || '—' }));
}
export function objective(item: Pick<MissionContent, 'targetValue' | 'triggerEvent' | 'quizRequestedCount' | 'minQuizAccuracyPercent'>) {
  const verb = { TOPIC_ITEM_CREATED: 'Thêm từ mới', QUIZ_COMPLETED: 'Hoàn thành quiz', LEARNING_ACTIVITY_RECORDED: 'Ghi nhận hoạt động học', SHOP_ITEM_PURCHASED: 'Mua vật phẩm', BOOSTER_USED: 'Kích hoạt booster' }[item.triggerEvent];
  return `${verb}: ${item.targetValue}${item.quizRequestedCount ? ` · ${item.quizRequestedCount} câu/bài` : ''}${item.minQuizAccuracyPercent ? ` · chính xác ≥ ${item.minQuizAccuracyPercent}%` : ''}`;
}
