/**
 * Labelled sample audit log while admin_audit_logs does not exist (MOCK scope).
 * Objects are real: ids, codes, names and current values come from the local DB clone (2026-10-20), so every link
 * opens the right screen. Cửa hàng and Nhiệm vụ follow each object's real lifecycle: create, publish and the last edit
 * sit at the real timestamps with the real version, and the value after the last write is today's value. Who, older
 * values and reasons are samples. Bans come from the Learners fixture (same learner, time, reason and admin).
 * ponytail: fixture-only; delete with the flag once GET /api/admin/audit-log ships.
 */
import { toCsv } from '../../lib/utils';
import { FIXTURE_NOW, fixtureBans, fixtureLearnerRows } from '../admin-learners/fixtures';
import { auditCsvRows, hasKind, KINDS, matchesAuditQuery, periodDays, vnDay } from './mappers';
import type { AuditAction, AuditArea, AuditChange, AuditEntry, AuditKind, AuditLogParams, AuditLogResponse, AuditTarget } from './types';

export { FIXTURE_NOW };

type Actor = AuditEntry['actor'];
const ADMIN: Actor = { id: 1, email: 'admin@snapvocab.com' };
const EDITOR: Actor = { id: 2, email: 'bientap@snapvocab.com' };
/** Seeders and imports write without an admin. */
const SYSTEM: Actor = null;

const raw: Omit<AuditEntry, 'id'>[] = [];
const c = (field: string, before: unknown, after: unknown): AuditChange => ({ field, before, after });
type Extra = { reason?: string; guardrail?: string };
const add = (at: string, actor: Actor, area: AuditArea, action: AuditAction, target: AuditTarget, changes: AuditChange[], x: Extra & { version?: number } = {}) =>
  raw.push({ at, actor, area, action, target, changes, reason: x.reason ?? null, guardrail: x.guardrail ?? null, version: x.version ?? null });

/** One write per step; the version is the step's index (create = 0), as the optimistic lock counts. */
type Step = [at: string, actor: Actor, action: AuditAction, changes: AuditChange[], x?: Extra];
const lifecycle = (area: 'SHOP' | 'MISSIONS', target: AuditTarget, steps: Step[]) =>
  steps.forEach(([at, actor, action, changes, x], version) => add(at, actor, area, action, target, changes, { ...x, version }));

/* ── Cửa hàng: real lifecycle of every item in the clone ───────────────────── */

const item = (id: number, code: string, name: string): AuditTarget => ({ type: 'SHOP_ITEM', id: String(id), name, code });
const icon = (uuid: string) => c('iconKey', null, `public/shop/${uuid}.webp`);
const frame = (uuid: string) => c('frameAssetKey', null, `public/shop/${uuid}.png`);
const PUBLISH = [c('status', 'DRAFT', 'PUBLISHED')];

/** Seeded item (create + publish by the seeder), then the admin uploaded its icon on 06/10. */
function seeded(t: AuditTarget, created: AuditChange[], at: { c: string; p: string; icon: string }, uuid: string) {
  lifecycle('SHOP', t, [
    [at.c, SYSTEM, 'SHOP_ITEM_CREATED', [c('name', null, t.name), ...created]],
    [at.p, SYSTEM, 'SHOP_ITEM_PUBLISHED', PUBLISH],
    [at.icon, ADMIN, 'SHOP_ITEM_UPDATED', [icon(uuid)]],
  ]);
}
const booster = (price: number | null, minutes: number) => [c('type', null, 'XP_BOOSTER'), price === null ? c('purchasable', null, false) : c('price', null, price), c('boostDurationMinutes', null, minutes)];

seeded(item(1, 'XP_BOOSTER_X2_30M', 'Thẻ ×2 Kinh nghiệm · 30 phút'), booster(100, 30),
  { c: '2026-09-15T04:16:12Z', p: '2026-09-16T04:16:26Z', icon: '2026-10-06T07:30:14Z' }, '17c12dc8-5ac5-444d-946b-9ab608fae926');
seeded(item(2, 'XP_BOOSTER_X2_60M', 'Thẻ ×2 Kinh nghiệm · 60 phút'), [...booster(180, 60), c('availableUntil', null, '2026-10-20T04:16:00Z')],
  { c: '2026-09-25T04:16:12Z', p: '2026-09-26T04:16:26Z', icon: '2026-10-06T07:30:48Z' }, '93c40067-1968-4ff7-9230-b8733cf58eef');
seeded(item(3, 'XP_BOOSTER_WEEKEND_120M', 'Thẻ ×2 XP cuối tuần · 120 phút'), [...booster(300, 120), c('availableFrom', null, '2026-10-09T04:16:00Z'), c('availableUntil', null, '2026-10-11T04:16:00Z')],
  { c: '2026-10-04T04:16:12Z', p: '2026-10-05T04:16:26Z', icon: '2026-10-06T07:30:53Z' }, '2e53277c-92e5-4aff-a720-4d9308cb4cd8');
seeded(item(4, 'XP_BOOSTER_AUTUMN_45M', 'Thẻ ×2 XP mùa thu · 45 phút'), [...booster(120, 45), c('availableFrom', null, '2026-09-06T04:16:00Z'), c('availableUntil', null, '2026-10-04T04:16:00Z')],
  { c: '2026-09-04T04:16:12Z', p: '2026-09-05T04:16:26Z', icon: '2026-10-06T07:30:57Z' }, '73d29f2b-977c-45c2-b9b6-9b465fb18e11');
seeded(item(5, 'XP_BOOSTER_REWARD_15M', 'Thẻ ×2 XP · 15 phút (quà nhiệm vụ)'), booster(null, 15),
  { c: '2026-09-20T04:16:12Z', p: '2026-09-21T04:16:26Z', icon: '2026-10-06T07:31:02Z' }, '23b15494-a3ba-4d26-90ac-428b3b4d8b15');
lifecycle('SHOP', item(6, 'XP_BOOSTER_X2_10M_LEGACY', 'Thẻ ×2 XP · 10 phút (bản cũ)'), [
  ['2026-08-06T04:16:12Z', SYSTEM, 'SHOP_ITEM_CREATED', [c('name', null, 'Thẻ ×2 XP · 10 phút (bản cũ)'), ...booster(60, 10)]],
  ['2026-08-07T04:16:26Z', SYSTEM, 'SHOP_ITEM_PUBLISHED', PUBLISH],
  ['2026-09-15T04:30:00Z', ADMIN, 'SHOP_ITEM_UPDATED', [c('purchasable', true, false)], { reason: 'Đã có Thẻ ×2 Kinh nghiệm · 30 phút thay thế, ngừng bán bản 10 phút.' }],
  ['2026-10-06T07:31:06Z', ADMIN, 'SHOP_ITEM_ARCHIVED', [c('status', 'PUBLISHED', 'ARCHIVED')], { reason: 'Không còn nhiệm vụ nào thưởng vật phẩm này.' }],
]);
seeded(item(7, 'THEME_MIDNIGHT_NEON', 'Đêm Neon Huyền Ảo'), [c('type', null, 'THEME'), c('price', null, 500)],
  { c: '2026-09-15T04:16:12Z', p: '2026-09-16T04:16:26Z', icon: '2026-10-06T07:31:11Z' }, '6f375fea-b23e-4940-92ec-4d027a1f9e2e');
seeded(item(8, 'THEME_SUNSET_AMBER', 'Hoàng Hôn Hổ Phách'), [c('type', null, 'THEME'), c('price', null, 400), c('availableUntil', null, '2026-11-05T04:16:00Z')],
  { c: '2026-09-30T04:16:12Z', p: '2026-10-01T04:16:26Z', icon: '2026-10-06T07:31:15Z' }, '11fbeeab-f7ea-4381-9e30-80a89fda57e9');
lifecycle('SHOP', item(9, 'THEME_FOREST_MINT', 'Rừng Bạc Hà'), [
  ['2026-10-05T04:16:12Z', SYSTEM, 'SHOP_ITEM_CREATED', [c('name', null, 'Rừng Bạc Hà'), c('type', null, 'THEME')]],
  ['2026-10-06T07:20:30Z', ADMIN, 'SHOP_ITEM_UPDATED', [c('price', null, 450)]],
  ['2026-10-06T07:31:20Z', ADMIN, 'SHOP_ITEM_UPDATED', [icon('b6ebbb25-8b04-4555-b467-5c0b92587199')]],
]);
lifecycle('SHOP', item(10, 'FRAME_BRONZE_LEARNER', 'Khung Đồng Mở Lối'), [
  ['2026-10-05T04:16:12Z', SYSTEM, 'SHOP_ITEM_CREATED', [c('name', null, 'Khung Đồng Mở Lối'), c('type', null, 'AVATAR_FRAME'), c('price', null, 300)]],
  ['2026-10-06T07:24:40Z', ADMIN, 'SHOP_ITEM_UPDATED', [icon('6bf5d6b9-5f7c-4316-99a3-38e28766d48d'), frame('e2037841-069c-49d2-8a09-e90631729c70')]],
  ['2026-10-06T07:28:10Z', ADMIN, 'SHOP_ITEM_UPDATED', [c('price', 300, 350)]],
  ['2026-10-06T07:32:01Z', ADMIN, 'SHOP_ITEM_PUBLISHED', PUBLISH],
  ['2026-10-06T07:33:55Z', ADMIN, 'SHOP_ITEM_UPDATED', [c('sortOrder', 20, 10)]],
]);
lifecycle('SHOP', item(11, 'FRAME_GOLDEN_WORDSMITH', 'Bậc Thầy Hoàng Kim'), [
  ['2026-10-05T04:16:12Z', SYSTEM, 'SHOP_ITEM_CREATED', [c('name', null, 'Bậc Thầy Hoàng Kim'), c('type', null, 'AVATAR_FRAME'), c('price', null, 1200)]],
  ['2026-10-06T07:25:20Z', ADMIN, 'SHOP_ITEM_UPDATED', [icon('0f614353-1e55-410b-8db6-dfe681b7947a'), frame('6db714cd-b626-4edf-8ff5-98f8dda23f7a')]],
  ['2026-10-06T07:29:05Z', ADMIN, 'SHOP_ITEM_UPDATED', [c('price', 1200, 900)]],
  ['2026-10-06T07:32:05Z', ADMIN, 'SHOP_ITEM_PUBLISHED', PUBLISH],
  ['2026-10-06T07:33:58Z', ADMIN, 'SHOP_ITEM_UPDATED', [c('price', 900, 950)], { reason: 'Đặt giữa Cú Đêm Chăm Học (880) và Giấc Mơ Vũ Trụ (1.100).' }],
]);
lifecycle('SHOP', item(12, 'FRAME_CHERRY_BLOSSOM', 'Hoa Anh Đào Mùa Xuân'), [
  ['2026-10-05T04:16:12Z', SYSTEM, 'SHOP_ITEM_CREATED', [c('name', null, 'Hoa Anh Đào Mùa Xuân'), c('type', null, 'AVATAR_FRAME'), c('price', null, 600)]],
  ['2026-10-06T07:26:10Z', ADMIN, 'SHOP_ITEM_UPDATED', [icon('8b280b1c-ba68-4976-a5d2-650786a59772'), frame('4cdf733d-9fe6-4712-8f2c-9fdc0a2154b0')]],
  ['2026-10-06T07:33:50Z', ADMIN, 'SHOP_ITEM_UPDATED', [c('price', 600, 2400)], {
    reason: 'Khung giới hạn mùa xuân, định giá cao hơn Huyền Thoại Bất Hủ.',
    guardrail: 'Giá 2.400 Coin cao hơn 1,5 lần giá cao nhất của Khung avatar đang bán (Huyền Thoại Bất Hủ, 1.500 Coin).',
  }],
  ['2026-10-06T07:34:02Z', ADMIN, 'SHOP_ITEM_UPDATED', [c('price', 2400, null), c('purchasable', true, false)], { reason: 'Giữ làm quà nhiệm vụ mùa xuân, không bán trong Cửa hàng.' }],
]);
/** The 06/10 frame launch: created and published by the admin within seconds. */
const LAUNCH: [id: number, code: string, name: string, price: number, created: string, published: string][] = [
  [25, 'FRAME_SILVER_SCHOLAR', 'Học Giả Bạc', 600, '07:32:33', '07:32:44'],
  [26, 'FRAME_FIRE_STREAK', 'Ngọn Lửa Bất Diệt', 850, '07:32:51', '07:32:54'],
  [27, 'FRAME_NATURE_EXPLORER', 'Nhà Khám Phá Tự Nhiên', 550, '07:33:01', '07:33:03'],
  [28, 'FRAME_NIGHT_OWL', 'Cú Đêm Chăm Học', 880, '07:33:11', '07:33:13'],
  [29, 'FRAME_OCEAN_VOYAGER', 'Nhà Du Hành Đại Dương', 800, '07:33:20', '07:33:22'],
  [30, 'FRAME_SPACE_DREAMER', 'Giấc Mơ Vũ Trụ', 1100, '07:33:30', '07:33:32'],
  [31, 'FRAME_LEGENDARY', 'Huyền Thoại Bất Hủ', 1500, '07:33:39', '07:33:42'],
];
for (const [id, code, name, price, created, published] of LAUNCH) {
  lifecycle('SHOP', item(id, code, name), [
    [`2026-10-06T${created}Z`, ADMIN, 'SHOP_ITEM_CREATED', [c('name', null, name), c('type', null, 'AVATAR_FRAME'), c('price', null, price)]],
    [`2026-10-06T${published}Z`, ADMIN, 'SHOP_ITEM_PUBLISHED', PUBLISH],
  ]);
}

/* ── Nhiệm vụ: the seeder created all 7 templates; only "Góp Nhặt Từ Mới" was edited (v2) ── */

const MISSIONS: [id: number, code: string, name: string, coin: number, xp: number, target: number][] = [
  [1, 'ADD_5_WORDS', 'Góp Nhặt Từ Mới', 15, 25, 5], [2, 'QUIZ_SCORE_80', 'Trí Nhớ Siêu Phàm', 20, 40, 1],
  [3, 'FINISH_2_SHORT_QUIZZES', 'Hai Bài Quiz Ngắn', 15, 30, 2], [4, 'PERFECT_MINI_QUIZ', 'Quiz Ngắn Hoàn Hảo', 25, 45, 1],
  [5, 'KEEP_DAILY_STREAK', 'Giữ Lửa Mỗi Ngày', 10, 20, 1], [6, 'USE_XP_BOOSTER', 'Tăng Tốc Học Tập', 5, 10, 1],
  [7, 'BUY_SHOP_ITEM', 'Ghé Thăm Cửa Hàng', 5, 10, 1],
];
for (const [id, code, name, coin, xp, target] of MISSIONS) {
  const created: Step = ['2026-10-06T01:15:50Z', SYSTEM, 'MISSION_TEMPLATE_CREATED', [c('name', null, name), c('rewardCoin', null, coin), c('rewardXp', null, xp), c('targetValue', null, target)]];
  lifecycle('MISSIONS', { type: 'MISSION_TEMPLATE', id: String(id), name, code }, id !== 1 ? [created] : [
    created,
    ['2026-10-06T08:20:05Z', ADMIN, 'MISSION_TEMPLATE_UPDATED', [c('rewardCoin', 15, 40)], {
      reason: 'Thử thưởng cao hơn cho tuần ra mắt.',
      guardrail: 'Thưởng mỗi ngày lên 105–110 Coin, vượt mức 85 Coin/ngày đã duyệt.',
    }],
    ['2026-10-06T08:22:36Z', ADMIN, 'MISSION_TEMPLATE_UPDATED', [c('rewardCoin', 40, 15)], { reason: 'Quay lại mức kinh tế đã duyệt.' }],
  ]);
}

/* ── Nội dung, AI Scan, thông báo: sample writes on real objects ──────────── */

add('2026-09-17T02:56:56Z', SYSTEM, 'TOPICS', 'COLLECTION_CREATED', { type: 'COLLECTION', id: '1', name: 'Vocabulary', code: null }, [c('name', null, 'Vocabulary'), c('topicCount', null, 201)]);
// A8: id = notifications.id, code = the dedupeKey the admin sent.
add('2026-10-07T03:05:00Z', ADMIN, 'NOTIFICATIONS', 'SYSTEM_NOTIFICATION_SENT', { type: 'NOTIFICATION', id: '12', name: 'Khung avatar mới đã lên kệ', code: 'frames-launch-2026-10' },
  [c('title', null, 'Khung avatar mới đã lên kệ'), c('content', null, 'Bảy khung mới, từ Học Giả Bạc đến Huyền Thoại Bất Hủ. Ghé Cửa hàng để xem.'), c('recipientCount', null, 41)]);

const word = (w: string): AuditTarget => ({ type: 'WORD', id: w, name: w, code: null });
add('2026-10-09T08:40:00Z', EDITOR, 'DICTIONARY', 'WORD_UPDATED', word('kettle'), [c('definitionVi', 'Cái ấm.', 'Ấm đun nước.')], { reason: 'Nghĩa cũ quá chung, người học nhầm với ấm trà.' });
add('2026-10-14T09:05:00Z', EDITOR, 'DICTIONARY', 'WORD_UPDATED', word('thermos'), [c('definitionVi', 'Cái phích.', 'Cái phích, cái tecmôt ((thường) thermos bottle, thermos flask…')]);
add('2026-10-18T02:50:00Z', EDITOR, 'DICTIONARY', 'WORD_UPDATED', word('fox'), [c('ipa', ['/fɑks/'], ['/fɑks/', '/fɒks/'])], { reason: 'Thêm cách đọc Anh–Anh.' });
add('2026-10-19T01:55:00Z', EDITOR, 'DICTIONARY', 'WORD_UPDATED', word('mug'), [c('definitionVi', 'Ca; chén vại.', 'Ca; chén vại; ca (đầy), chén (đầy).')]);

// Labels that the Dashboard and Phân tích fixtures still list as unmapped (thermos, power bank…) are left out.
const label = (l: string): AuditTarget => ({ type: 'SCAN_LABEL', id: l, name: l, code: null });
add('2026-10-10T02:10:00Z', EDITOR, 'AI_SCAN', 'SCAN_LABEL_MAPPED', label('electric kettle'), [c('word', null, 'kettle')]);
add('2026-10-15T04:30:00Z', EDITOR, 'AI_SCAN', 'SCAN_LABEL_MAPPED', label('school backpack'), [c('word', null, 'backpack')]);
add('2026-10-15T04:32:00Z', EDITOR, 'AI_SCAN', 'SCAN_LABEL_MAPPED', label('coffee mug'), [c('word', null, 'mug')]);
add('2026-10-18T06:40:00Z', EDITOR, 'AI_SCAN', 'SCAN_LABEL_MAPPED', label('phone charger'), [c('word', null, 'charger')]);
add('2026-10-19T02:12:00Z', EDITOR, 'AI_SCAN', 'SCAN_LABEL_MAPPED', label('office stapler'), [c('word', null, 'stapler')]);

const topic = (id: number, name: string): AuditTarget => ({ type: 'TOPIC', id: String(id), name, code: null, parents: [1, 18] });
const FOOD = topic(23, 'Food and Drink');
add('2026-10-13T07:45:00Z', EDITOR, 'TOPICS', 'TOPIC_TEMPLATE_CHANGED', FOOD, [c('template', 'Thẻ Chuẩn (Chữ -> Nghĩa)', 'Đảo Mặt Thẻ (Nghĩa -> Đoán từ)')], { reason: 'Thử cho người học đoán từ từ nghĩa.' });
add('2026-10-14T03:20:00Z', EDITOR, 'TOPICS', 'TOPIC_TEMPLATE_CHANGED', FOOD, [c('template', 'Đảo Mặt Thẻ (Nghĩa -> Đoán từ)', 'Thẻ Chuẩn (Chữ -> Nghĩa)')], { reason: 'Quay lại mẫu chuẩn: đảo mặt khó với từ mới.' });
// POST /api/topics/{id}/items adds one item per call, so one row per word.
['charger', 'keyboard', 'router', 'webcam', 'printer', 'headphones', 'laptop'].forEach((w, k) =>
  add(new Date(Date.parse('2026-10-17T08:15:00Z') + k * 41_000).toISOString().replace('.000Z', 'Z'), EDITOR, 'TOPICS', 'TOPIC_ITEM_ADDED',
    topic(32, 'Technology and Computers'), [c('item', null, w)]));

/* ── Người học: the Learners fixture's bans, plus two password-reset links ─── */

const learner = (r: { id: number; name: string }): AuditTarget => ({ type: 'LEARNER', id: String(r.id), name: r.name, code: null });
for (const b of fixtureBans()) add(b.at, ADMIN, 'LEARNERS', 'LEARNER_BANNED', learner(b), [c('accountStatus', 'ACTIVE', 'BANNED')], { reason: b.reason });
const active = fixtureLearnerRows().filter((r) => r.status === 'ACTIVE' && r.lastStudiedAt);
for (const [r, at, reason] of [
  [active[4], '2026-10-16T08:10:00Z', 'Người học báo không nhận được email đặt lại.'],
  [active[11], '2026-10-18T10:15:00Z', 'Hỗ trợ qua fanpage: quên mật khẩu.'],
] as const) add(at, ADMIN, 'LEARNERS', 'LEARNER_PASSWORD_RESET_SENT', learner({ id: r.id, name: r.displayName }), [c('sentTo', null, r.email)], { reason });

/** Newest first, ids in write order. */
const ENTRIES: AuditEntry[] = raw
  .map((e, i) => ({ e, i }))
  .sort((a, b) => a.e.at.localeCompare(b.e.at) || a.i - b.i)
  .map(({ e }, k) => ({ id: 1001 + k, ...e }))
  .reverse();

/* ── The proposed endpoints over the sample ────────────────────────────────── */

function select(p: AuditLogParams) {
  const { days = 30, day = null, area = 'ALL', actor = 'ALL', kind = 'ALL', target = null, q = '' } = p;
  const span = periodDays(days, FIXTURE_NOW);
  const base = ENTRIES.filter((e) => vnDay(e.at) >= span[0] && (!target || (e.target.type === target.type && e.target.id === target.id)));
  const rows = base.filter((e) => (!day || vnDay(e.at) === day)
    && (area === 'ALL' || e.area === area)
    && (actor === 'ALL' || (actor === 'SYSTEM' ? e.actor === null : e.actor?.id === actor))
    && (kind === 'ALL' || hasKind(e, kind))
    && matchesAuditQuery(e, q));
  return { span, base, rows };
}

function summarize(base: AuditEntry[], span: string[]): AuditLogResponse['summary'] {
  const perDay = new Map<string, number>();
  const areas = new Map<AuditArea, number>();
  const actors = new Map<string, { actor: Actor; count: number }>();
  for (const e of base) {
    perDay.set(vnDay(e.at), (perDay.get(vnDay(e.at)) ?? 0) + 1);
    areas.set(e.area, (areas.get(e.area) ?? 0) + 1);
    const key = e.actor?.email ?? '';
    actors.set(key, { actor: e.actor, count: (actors.get(key)?.count ?? 0) + 1 });
  }
  return {
    total: base.length,
    byKind: Object.fromEntries(KINDS.map((k) => [k, base.filter((e) => hasKind(e, k)).length])) as Record<AuditKind, number>,
    daily: span.map((day) => ({ day, count: perDay.get(day) ?? 0 })),
    areas: [...areas].map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count),
    actors: [...actors.values()].sort((a, b) => b.count - a.count),
  };
}

const wait = <T,>(value: T) => new Promise<T>((res) => setTimeout(() => res(structuredClone(value)), 160));

export function fixtureAuditLog(p: AuditLogParams = {}): Promise<AuditLogResponse> {
  const { page = 0, size = 50 } = p;
  const { span, base, rows } = select(p);
  return wait({
    data: rows.slice(page * size, page * size + size),
    meta: { page, size, total: rows.length, pages: Math.max(1, Math.ceil(rows.length / size)) },
    summary: summarize(base, span),
  });
}

export const fixtureAuditCsv = (p: AuditLogParams = {}): Promise<string> => wait(toCsv(auditCsvRows(select(p).rows)));
