/**
 * Labelled sample data for the Learners screen while the admin users API does not exist (MOCK scope).
 * Deterministic, and shaped by real catalogs: badge codes/thresholds from `badges`, item codes from `shop_items`,
 * mission names from `mission_templates`, scan error codes from `ScanErrorCode`.
 * ponytail: fixture-only; delete with the flag once GET /api/admin/users ships.
 */
import type { AdminLearnerDetail, AdminLearnerRow, LearnerListParams, LearnerListResponse, LearnerStatus, ScanErrorCode } from './types';
import { activityOf, matchesQuery } from './mappers';

/** Fixed clock so fixtures, screenshots and tests agree. */
export const FIXTURE_NOW = new Date('2026-10-19T09:30:00+07:00');
const DAY = 86_400_000;

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const iso = (ms: number) => new Date(ms).toISOString();
const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

const FAMILY = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const MIDDLE = ['Văn', 'Thị', 'Minh', 'Ngọc', 'Thanh', 'Hữu', 'Gia', 'Bảo', 'Khánh', 'Thu', 'Quốc', 'Đức'];
const GIVEN = ['An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hiếu', 'Hoa', 'Huy', 'Khoa', 'Lan', 'Linh', 'Long', 'Mai', 'Nam', 'Nga', 'Phúc', 'Quân', 'Quỳnh', 'Sơn', 'Tâm', 'Thảo', 'Trang', 'Tuấn', 'Uyên', 'Vy', 'Yến'];

const BADGES = [
  { code: 'WORDS_10', name: 'Mười Từ Đầu Tiên', metric: 'words', at: 10 }, { code: 'WORDS_100', name: 'Kho Từ Trăm Chữ', metric: 'words', at: 100 },
  { code: 'WORDS_500', name: 'Thư Viện Sống', metric: 'words', at: 500 }, { code: 'STREAK_7', name: 'Một Tuần Bền Bỉ', metric: 'streak', at: 7 },
  { code: 'STREAK_30', name: 'Tháng Không Nghỉ', metric: 'streak', at: 30 }, { code: 'STREAK_100', name: 'Trăm Ngày Kiên Trì', metric: 'streak', at: 100 },
  { code: 'QUIZ_1', name: 'Bài Quiz Đầu Tiên', metric: 'quiz', at: 1 }, { code: 'QUIZ_10', name: 'Quen Tay Quiz', metric: 'quiz', at: 10 },
  { code: 'QUIZ_50', name: 'Chiến Binh Quiz', metric: 'quiz', at: 50 }, { code: 'PERFECT_1', name: 'Điểm Tuyệt Đối', metric: 'perfect', at: 1 },
  { code: 'PERFECT_10', name: 'Mười Lần Tuyệt Đối', metric: 'perfect', at: 10 }, { code: 'PERFECT_50', name: 'Năm Mươi Lần Tuyệt Đối', metric: 'perfect', at: 50 },
] as const;
const MISSION_REWARDS = [
  ['Góp Nhặt Từ Mới', 15], ['Trí Nhớ Siêu Phàm', 20], ['Hai Bài Quiz Ngắn', 15], ['Quiz Ngắn Hoàn Hảo', 25], ['Giữ Lửa Mỗi Ngày', 10],
] as const;
const SCAN_LABELS = ['cup', 'laptop', 'bottle', 'chair', 'plant', 'keyboard', 'backpack', 'umbrella', 'clock', 'lamp', 'thermos', 'notebook'];
const SCAN_ERRORS: ScanErrorCode[] = ['AI_UNAVAILABLE', 'AI_QUEUE_FULL', 'AI_TIMEOUT', 'INTERRUPTED'];

function makeRow(i: number): AdminLearnerRow {
  const r = rng(i + 1);
  const now = FIXTURE_NOW.getTime();
  const family = pick(r, FAMILY), middle = pick(r, MIDDLE), given = pick(r, GIVEN);
  const status: LearnerStatus = [7, 23].includes(i) ? 'BANNED' : [3, 18, 31, 44].includes(i) ? 'PENDING' : 'ACTIVE';
  const ageDays = 2 + r() * 65;
  const created = now - ageDays * DAY;
  const bucket = r();
  let last: number | null = null;
  if (status !== 'PENDING') {
    if (bucket < 0.35) last = now - r() * 20 * 3_600_000;
    else if (bucket < 0.6) last = now - (1 + r() * 6) * DAY;
    else if (bucket < 0.78) last = now - (8 + r() * 22) * DAY;
    else if (bucket < 0.92) last = now - (31 + r() * 29) * DAY;
    if (last !== null && last < created) last = created + r() * (now - created);
  }
  // A banned learner cannot sign in, so nothing after the ban (3 days ago, see makeDetail).
  if (status === 'BANNED' && last !== null) last = Math.max(created, Math.min(last, now - 3.5 * DAY));
  const studiedRecently = last !== null && now - last < 1.5 * DAY;
  const streakDays = studiedRecently ? 1 + Math.floor(r() * Math.min(ageDays, 45)) : 0;
  const words = last === null ? Math.floor(r() * 4) : Math.min(900, Math.floor(ageDays * (1 + r() * 8)));
  return {
    id: 101 + i,
    displayName: `${family} ${middle} ${given}`,
    email: `${fold(given)}.${fold(family)}${101 + i}@${r() < 0.6 ? 'gmail.com' : 'stu.ptit.edu.vn'}`,
    avatarUrl: null,
    status,
    createdAt: iso(created),
    lastStudiedAt: last === null ? null : iso(last),
    streakDays,
    longestStreakDays: Math.max(streakDays, Math.floor(r() * Math.min(ageDays, 60))),
    wordsSaved: words,
    coin: last === null ? 0 : Math.floor(r() * Math.min(ageDays * 40, 2400)),
    exp: last === null ? Math.floor(r() * 20) : Math.floor(words * 3 + r() * 1500),
  };
}

function makeDetail(row: AdminLearnerRow): AdminLearnerDetail {
  const r = rng(row.id * 97);
  const now = FIXTURE_NOW.getTime();
  const created = new Date(row.createdAt).getTime();
  const last = row.lastStudiedAt ? new Date(row.lastStudiedAt).getTime() : null;
  const saved = row.wordsSaved;
  const mastered = Math.floor(saved * (0.1 + r() * 0.3));
  const reviewing = Math.floor((saved - mastered) * (0.2 + r() * 0.4));
  const learning = Math.floor((saved - mastered - reviewing) * (0.3 + r() * 0.4));
  const quizzes = last === null ? 0 : Math.floor((saved / 10) * r() * 1.5);
  const perfect = Math.floor(quizzes * r() * 0.3);

  // Activity: nothing before sign-up or after the last study day; streak days are always active.
  const activity30d = Array.from({ length: 30 }, (_, d) => {
    const dayStart = now - (29 - d) * DAY;
    if (last === null || dayStart > last + DAY || dayStart + DAY < created) return 0;
    if (29 - d < row.streakDays || dayStart <= last && last < dayStart + DAY) return 3 + Math.floor(r() * 25);
    return r() < 0.45 ? Math.floor(r() * 20) : 0;
  });
  const activeDays7 = activity30d.slice(-7).filter((n) => n > 0).length;
  const assigned = activeDays7 * 5;
  const completed = Math.floor(assigned * (0.4 + r() * 0.5));
  const claimed = Math.max(0, completed - Math.floor(r() * Math.min(2, completed + 1)));

  const metric = { words: saved, streak: row.longestStreakDays, quiz: quizzes, perfect } as const;
  const span = Math.max(1, (last ?? created) - created);
  const badges = BADGES.filter((b) => metric[b.metric] >= b.at).map((b, k) => ({ code: b.code, name: b.name, earnedAt: iso(created + span * Math.min(0.95, 0.15 + k * 0.12)) }));

  const items: AdminLearnerDetail['items'] = [];
  if (quizzes > 3 && r() < 0.6) items.push({ code: 'XP_BOOSTER_X2_30M', name: 'Thẻ ×2 Kinh nghiệm · 30 phút', type: 'XP_BOOSTER', equipped: false, quantity: 1 + Math.floor(r() * 3) });
  if (saved > 150 && r() < 0.6) items.push({ code: 'FRAME_BRONZE_LEARNER', name: 'Khung Đồng Mở Lối', type: 'AVATAR_FRAME', equipped: true, quantity: 1 });
  if (saved > 300 && r() < 0.4) items.push({ code: 'THEME_MIDNIGHT_NEON', name: 'Đêm Neon Huyền Ảo', type: 'THEME', equipped: r() < 0.7, quantity: 1 });

  const recentCoins: AdminLearnerDetail['wallet']['recent'] = [];
  if (last !== null) {
    for (let k = 0; k < 6; k++) {
      const at = last - k * (0.6 + r()) * DAY;
      if (at < created) break;
      const buy = items[k] && r() < 0.5;
      if (buy) recentCoins.push({ at: iso(at), amount: items[k].type === 'XP_BOOSTER' ? -100 : -350, source: 'SHOP_PURCHASE', note: `Mua ${items[k].name}` });
      else {
        const [name, coin] = pick(r, MISSION_REWARDS);
        recentCoins.push({ at: iso(at), amount: coin, source: 'MISSION_REWARD', note: `Nhiệm vụ ${name}` });
      }
    }
  }

  const sinceMidnightVn = (now + 7 * 3_600_000) % DAY;
  const studiedToday = last !== null && now - last < sinceMidnightVn;
  const scans30 = last === null ? 0 : Math.floor(r() * 25);
  const failed30 = Math.floor(scans30 * r() * 0.25);
  const recentScans: AdminLearnerDetail['scans']['recent'] = Array.from({ length: Math.min(4, scans30) }, (_, k) => {
    const failed = k < failed30 && r() < 0.6;
    const labels = failed ? [] : Array.from({ length: 1 + Math.floor(r() * 3) }, () => pick(r, SCAN_LABELS));
    return { at: iso((last ?? now) - k * (0.4 + r() * 2) * DAY), status: failed ? 'FAILED' : 'DONE', errorCode: failed ? pick(r, SCAN_ERRORS) : null, labels: [...new Set(labels)], savedWords: failed ? 0 : Math.floor(r() * (labels.length + 1)) };
  });

  const timeline: AdminLearnerDetail['timeline'] = [{ at: row.createdAt, kind: 'ACCOUNT', text: 'Tạo tài khoản' }];
  if (last !== null) {
    timeline.push({ at: row.lastStudiedAt!, kind: 'STUDY', text: `Ôn ${8 + Math.floor(r() * 30)} thẻ, ${Math.floor(r() * 8)} thẻ mới` });
    if (quizzes) timeline.push({ at: iso(last - r() * DAY), kind: 'QUIZ', text: `Hoàn thành quiz ${pick(r, [5, 10, 20])} câu · ${55 + Math.floor(r() * 45)}%` });
  }
  recentScans.slice(0, 2).forEach((s) => timeline.push({ at: s.at, kind: 'SCAN', text: s.status === 'FAILED' ? `Scan lỗi: ${s.errorCode}` : `Scan: ${s.labels.join(', ')} · lưu ${s.savedWords} từ` }));
  recentCoins.slice(0, 3).forEach((c) => timeline.push({ at: c.at, kind: c.source === 'SHOP_PURCHASE' ? 'PURCHASE' : 'MISSION', text: `${c.note} (${c.amount > 0 ? '+' : ''}${c.amount} Coin)` }));
  badges.slice(-2).forEach((b) => timeline.push({ at: b.earnedAt, kind: 'BADGE', text: `Đạt huy hiệu ${b.name}` }));
  // Hours apart per learner, so two bans never share a timestamp (the audit fixture lists them).
  const ban = row.status === 'BANNED' ? { reason: 'Tạo nhiều tài khoản trên cùng thiết bị để nhận thưởng nhiệm vụ.', at: iso(now - 3 * DAY - (row.id % 7) * 3_600_000), by: 'admin@snapvocab.com' } : null;
  if (ban) timeline.push({ at: ban.at, kind: 'ACCOUNT', text: `Bị khóa: ${ban.reason}` });
  timeline.sort((a, b) => b.at.localeCompare(a.at));

  return {
    ...row,
    nativeLanguage: 'vi',
    learningLanguage: 'en',
    ban,
    progress: {
      newCount: saved - mastered - reviewing - learning, learning, reviewing, mastered,
      dueToday: last === null ? 0 : Math.floor((reviewing + learning) * (0.05 + r() * 0.2)),
      quizzesCompleted: quizzes,
      quizAccuracy: quizzes ? Math.round(55 + r() * 40) : null,
    },
    activity30d,
    missions7d: { assigned, completed, claimed },
    badges,
    wallet: { recent: recentCoins },
    items,
    scans: { today: studiedToday ? Math.floor(r() * 6) : 0, dailyLimit: 20, last30d: scans30, failed30d: failed30, recent: recentScans },
    timeline: timeline.slice(0, 10),
  };
}

// In-memory store: ban/unban mutate it so the UX can be walked end to end.
const rows: AdminLearnerRow[] = Array.from({ length: 48 }, (_, i) => makeRow(i));
const details = new Map<number, AdminLearnerDetail>();
const detailOf = (row: AdminLearnerRow) => {
  if (!details.has(row.id)) details.set(row.id, makeDetail(row));
  return details.get(row.id)!;
};
const wait = <T,>(value: T) => new Promise<T>((res) => setTimeout(() => res(structuredClone(value)), 180));
const notFound = () => Object.assign(new Error('Không tìm thấy người học.'), { code: 'USER_NOT_FOUND', statusCode: 404 });

export function fixtureList(params: LearnerListParams = {}): Promise<LearnerListResponse> {
  const { q = '', status = 'ALL', activity = 'ALL', sort = 'lastStudied', page = 0, size = 20 } = params;
  const act = (r: AdminLearnerRow) => activityOf(r.lastStudiedAt, FIXTURE_NOW);
  const filtered = rows
    .filter((r) => matchesQuery(r, q) && (status === 'ALL' || r.status === status) && (activity === 'ALL' || act(r) === activity))
    .sort((a, b) => {
      if (sort === 'createdAt') return b.createdAt.localeCompare(a.createdAt);
      if (sort === 'streak') return b.streakDays - a.streakDays;
      if (sort === 'words') return b.wordsSaved - a.wordsSaved;
      return (b.lastStudiedAt ?? '').localeCompare(a.lastStudiedAt ?? '');
    });
  return wait({
    data: filtered.slice(page * size, page * size + size),
    meta: { page, size, total: filtered.length, pages: Math.max(1, Math.ceil(filtered.length / size)) },
    summary: {
      total: rows.length,
      active7d: rows.filter((r) => act(r) === 'ACTIVE_7D').length,
      dormant30d: rows.filter((r) => act(r) === 'DORMANT_30D').length,
      never: rows.filter((r) => act(r) === 'NEVER').length,
      pending: rows.filter((r) => r.status === 'PENDING').length,
      banned: rows.filter((r) => r.status === 'BANNED').length,
    },
  });
}

export function fixtureDetail(id: number): Promise<AdminLearnerDetail> {
  const row = rows.find((r) => r.id === id);
  return row ? wait(detailOf(row)) : Promise.reject(notFound());
}

export function fixtureSetBan(id: number, banned: boolean, reason: string): Promise<AdminLearnerDetail> {
  const row = rows.find((r) => r.id === id);
  if (!row) return Promise.reject(notFound());
  const d = detailOf(row);
  row.status = d.status = banned ? 'BANNED' : 'ACTIVE';
  d.ban = banned ? { reason, at: FIXTURE_NOW.toISOString(), by: 'Bạn (dữ liệu mẫu)' } : null;
  d.timeline.unshift({ at: FIXTURE_NOW.toISOString(), kind: 'ACCOUNT', text: banned ? `Bị khóa: ${reason}` : `Mở khóa${reason ? `: ${reason}` : ''}` });
  return wait(d);
}

export const fixturePasswordReset = (id: number) => (rows.some((r) => r.id === id) ? wait(undefined) : Promise.reject(notFound()));

/** For the audit fixture: the same sample learners and bans, so Nhật ký and the profile agree. */
export const fixtureLearnerRows = (): readonly AdminLearnerRow[] => rows;
export const fixtureBans = () =>
  rows.flatMap((r) => {
    const ban = detailOf(r).ban;
    return ban ? [{ id: r.id, name: r.displayName, ...ban }] : [];
  });
/** For the badges fixture: who holds which badge and the metrics behind it, so earner counts match the profiles. */
export const fixtureBadgeHolders = () =>
  rows.map((r) => {
    const d = detailOf(r);
    return { activated: r.status !== 'PENDING', codes: d.badges.map((b) => b.code), streak: r.longestStreakDays, quizzes: d.progress.quizzesCompleted, words: r.wordsSaved };
  });
