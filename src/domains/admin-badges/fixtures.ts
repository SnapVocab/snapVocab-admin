import { fixtureBadgeHolders } from '../admin-learners/fixtures';
import { ApiClientError } from '../../lib/api-client';
import { EMBLEM_LABELS } from './catalog';
import type { AdminBadge, BadgeActivePatch, BadgeContentPatch, BadgeRefillEstimate } from './types';

// SEED mirrors BadgeCatalogSeeder (badges.md §4.1) and is the reference set for tests; EDGE adds the boundary cases the
// seed lacks. The MOCK catalog at the bottom (config.ts) is what dev/demo builds show while P2 is not built.

const AT = '2026-10-07T00:00:00Z';
const badge = (id: number, sortOrder: number, code: string, metric: string, threshold: number, name: string,
  description: string, iconKey: string, extra: Partial<AdminBadge> = {}): AdminBadge => ({
  id, code, name, description, metric, threshold, iconKey, sortOrder,
  isActive: true, version: 0, earnerCount: null, createdAt: AT, updatedAt: AT, ...extra,
});

const SEED: AdminBadge[] = [
  badge(1, 10, 'STREAK_7', 'LONGEST_STREAK_DAYS', 7, 'Một Tuần Bền Bỉ', 'Học (quiz, ôn thẻ hoặc lưu từ đã quét) 7 ngày trong một chuỗi không đứt', 'flame'),
  badge(2, 11, 'STREAK_30', 'LONGEST_STREAK_DAYS', 30, 'Tháng Không Nghỉ', 'Học (quiz, ôn thẻ hoặc lưu từ đã quét) 30 ngày trong một chuỗi không đứt', 'flame'),
  badge(3, 12, 'STREAK_100', 'LONGEST_STREAK_DAYS', 100, 'Trăm Ngày Kiên Trì', 'Học (quiz, ôn thẻ hoặc lưu từ đã quét) 100 ngày trong một chuỗi không đứt', 'flame'),
  badge(4, 20, 'QUIZ_1', 'QUIZ_COMPLETED', 1, 'Bài Quiz Đầu Tiên', 'Hoàn thành 1 quiz', 'clipboard-check'),
  badge(5, 21, 'QUIZ_10', 'QUIZ_COMPLETED', 10, 'Quen Tay Quiz', 'Hoàn thành 10 quiz', 'clipboard-check'),
  badge(6, 22, 'QUIZ_50', 'QUIZ_COMPLETED', 50, 'Chiến Binh Quiz', 'Hoàn thành 50 quiz', 'clipboard-check'),
  badge(7, 30, 'PERFECT_1', 'PERFECT_QUIZ', 1, 'Điểm Tuyệt Đối', 'Đúng tất cả câu (hoặc tất cả cặp) trong 1 quiz', 'target'),
  badge(8, 31, 'PERFECT_10', 'PERFECT_QUIZ', 10, 'Mười Lần Tuyệt Đối', 'Đạt điểm tuyệt đối 10 lần (mỗi quiz đúng tất cả câu hoặc cặp)', 'target'),
  badge(9, 32, 'PERFECT_50', 'PERFECT_QUIZ', 50, 'Năm Mươi Lần Tuyệt Đối', 'Đạt điểm tuyệt đối 50 lần (mỗi quiz đúng tất cả câu hoặc cặp)', 'target'),
  badge(10, 40, 'WORDS_10', 'DISTINCT_WORDS_ADDED', 10, 'Mười Từ Đầu Tiên', 'Tự thêm 10 từ khác nhau vào bộ sưu tập của bạn', 'book-open'),
  badge(11, 41, 'WORDS_100', 'DISTINCT_WORDS_ADDED', 100, 'Kho Từ Trăm Chữ', 'Tự thêm 100 từ khác nhau vào bộ sưu tập của bạn', 'book-open'),
  badge(12, 42, 'WORDS_500', 'DISTINCT_WORDS_ADDED', 500, 'Thư Viện Sống', 'Tự thêm 500 từ khác nhau vào bộ sưu tập của bạn', 'book-open'),
];

// Illustrative earner counts (G6 does not exist): only there to exercise the "Đã đạt" column and status reasons.
const EARNERS = [2418, 604, 37, 9102, 3977, 811, 6530, 1288, 96, 4015, 702, 58];
const SEED_G6 = SEED.map((b, i) => ({ ...b, earnerCount: EARNERS[i] }));

const EDGE: AdminBadge[] = [
  ...SEED_G6,
  // Inactive, nobody earned it; also makes "Vốn từ tự xây" a four-milestone series.
  badge(13, 43, 'WORDS_250', 'DISTINCT_WORDS_ADDED', 250, 'Hai Trăm Rưỡi Từ', 'Tự thêm 250 từ khác nhau vào bộ sưu tập của bạn', 'book-open', { isActive: false, earnerCount: 0 }),
  // Inactive with earners: they keep seeing it, nobody else does.
  badge(14, 13, 'STREAK_14', 'LONGEST_STREAK_DAYS', 14, 'Hai Tuần Liền', 'Học (quiz, ôn thẻ hoặc lưu từ đã quét) 14 ngày trong một chuỗi không đứt', 'flame', { isActive: false, earnerCount: 340, version: 2 }),
  // Inactive with the smallest sortOrder of the whole catalog: the admin lists "Quiz hoàn thành" first, while a learner
  // who never earned it sees that shelf after "Chuỗi ngày học" (rev 2 §2.4).
  badge(15, 5, 'QUIZ_5', 'QUIZ_COMPLETED', 5, 'Năm Bài Quiz', 'Hoàn thành 5 quiz', 'clipboard-check', { isActive: false, earnerCount: 75, version: 1 }),
  // iconKey the app cannot draw; also makes "Điểm tuyệt đối" a four-milestone series.
  badge(16, 33, 'PERFECT_25', 'PERFECT_QUIZ', 25, 'Hai Lăm Lần Tuyệt Đối', 'Đạt điểm tuyệt đối 25 lần (mỗi quiz đúng tất cả câu hoặc cặp)', 'rocket', { earnerCount: 210 }),
  // Metric the admin does not map (a deferred scan badge, badges.md §4.2), with an unknown icon too.
  badge(17, 50, 'SCAN_10', 'SCAN_SAVED', 10, 'Mười Lần Quét', 'Quét ảnh và lưu từ 10 lần', 'camera', { isActive: false, earnerCount: 0 }),
];

export type DatasetKey = 'seed' | 'seed-g6' | 'edge';
export const DATASETS: Record<DatasetKey, { label: string; items: AdminBadge[] }> = {
  seed: { label: 'Seed 12 · chưa có số người đạt (như backend hiện tại)', items: SEED },
  'seed-g6': { label: 'Seed 12 · có số người đạt (minh họa G6)', items: SEED_G6 },
  edge: { label: 'Tình huống biên (17 huy hiệu)', items: EDGE },
};

// ── MOCK P2 catalog (config.ts `badgesUseFixtures`) ─────────────────────────────────────────────────────────────────
// The 12 seed badges plus one milestone a migration added but nobody switched on yet (PD-BDG-13c), so Bật and the
// refill estimate have something to act on. Earner counts and estimates come from the Learners screen's sample people.
// ponytail: in-memory, lost on reload; delete with the flag once PATCH and the estimate API ship.

const holders = () => fixtureBadgeHolders();
const metricOf = (h: ReturnType<typeof fixtureBadgeHolders>[number], metric: string) =>
  ({ LONGEST_STREAK_DAYS: h.streak, QUIZ_COMPLETED: h.quizzes, DISTINCT_WORDS_ADDED: h.words } as Record<string, number | undefined>)[metric];

let store: AdminBadge[] | null = null;
function catalog(): AdminBadge[] {
  if (!store) {
    const all = holders();
    const earners = (code: string) => all.filter((h) => h.codes.includes(code)).length;
    store = [
      ...SEED.map((b) => ({ ...b, earnerCount: earners(b.code) })),
      badge(13, 23, 'QUIZ_25', 'QUIZ_COMPLETED', 25, 'Hai Mươi Lăm Bài Quiz', 'Hoàn thành 25 quiz', 'clipboard-check',
        { isActive: false, earnerCount: 0, createdAt: '2026-10-20T03:12:00Z', updatedAt: '2026-10-20T03:12:00Z' }),
    ];
  }
  return store;
}

const wait = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(structuredClone(value)), 160));
const fail = (code: string, status: number, details?: ConstructorParameters<typeof ApiClientError>[3]) =>
  new Promise<never>((_, reject) => setTimeout(() => reject(new ApiClientError(code, code, status, details)), 160));

export const fixtureBadges = () => wait(catalog());

export function fixtureBadge(id: number) {
  const b = catalog().find((x) => x.id === id);
  return b ? wait(b) : fail('BADGE_NOT_FOUND', 404);
}

/** Same rules as the planned PATCH (badges.md §8.4): version check, trim, lengths, icon whitelist. */
export function fixturePatchBadge(id: number, body: BadgeContentPatch | BadgeActivePatch) {
  const list = catalog();
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return fail('BADGE_NOT_FOUND', 404);
  if (body.version !== list[i].version) return fail('VERSION_CONFLICT', 409, { currentVersion: list[i].version ?? undefined });
  const next: AdminBadge = { ...list[i], version: (list[i].version ?? 0) + 1, updatedAt: new Date().toISOString() };
  if ('isActive' in body) next.isActive = body.isActive;
  else {
    const errors: { field: string; code: string; message: string }[] = [];
    const name = body.name?.trim(), description = body.description?.trim();
    if (name !== undefined && (name.length < 1 || name.length > 100)) errors.push({ field: 'name', code: 'SIZE', message: 'Tên dài 1–100 ký tự.' });
    if (description !== undefined && (description.length < 1 || description.length > 255)) errors.push({ field: 'description', code: 'SIZE', message: 'Mô tả dài 1–255 ký tự.' });
    if (body.iconKey !== undefined && !(body.iconKey in EMBLEM_LABELS)) errors.push({ field: 'iconKey', code: 'INVALID', message: 'Biểu tượng không có trong ứng dụng.' });
    if (errors.length) return fail('VALIDATION_ERROR', 400, { errors });
    Object.assign(next, Object.fromEntries(Object.entries({ name, description, iconKey: body.iconKey, sortOrder: body.sortOrder }).filter(([, v]) => v !== undefined)));
  }
  list[i] = next;
  return wait(next);
}

export function fixtureRefillEstimate(id: number): Promise<BadgeRefillEstimate> {
  const b = catalog().find((x) => x.id === id);
  if (!b) return fail('BADGE_NOT_FOUND', 404);
  const eligibleCount = holders().filter((h) => h.activated && (metricOf(h, b.metric) ?? 0) >= b.threshold && !h.codes.includes(b.code)).length;
  return wait({ eligibleCount, calculatedAt: new Date().toISOString(), version: b.version ?? 0 });
}
