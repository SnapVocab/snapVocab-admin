import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureBoard, LB_FIXTURE_NOW } from '../src/domains/admin-leaderboard/fixtures';
import {
  ANOMALY, activeDayCounts, daysCovered, flagsOf, gapAbove, learnerView, matchesFilter, matchesQuery, reachedLabel, scoringRule,
  summarize, timeLeft, vnDayTime, weekRange, xpBands,
} from '../src/domains/admin-leaderboard/mappers';
import { fixtureLearnerRows } from '../src/domains/admin-learners/fixtures';
import type { AdminLeaderboardRow } from '../src/domains/admin-leaderboard/types';

const row = (userId: number, score: number, rank: number, extra: Partial<AdminLeaderboardRow> = {}): AdminLeaderboardRow => ({
  rank, tied: false, userId, displayName: `Người ${userId}`, email: `u${userId}@example.com`, score, reachedAt: '2026-10-20T03:00:00Z',
  reviewXp: 0, quizXp: score, bonusXp: 0, events: 1, activeDays: 1, peakHourXp: score, rankChange: null, ...extra,
});
// leaderboard_backend.md §3.3: scores 120, 90, 90, 90, 40.
const spec = [row(7, 120, 1), row(3, 90, 2, { tied: true }), row(9, 90, 2, { tied: true }), row(12, 90, 2, { tied: true }), row(5, 40, 5)];

test('LB1: fixture boards follow LB-03/LB-04 and add up', () => {
  const eligible = fixtureLearnerRows().filter(r => r.status === 'ACTIVE').map(r => r.id);
  for (const week of ['CURRENT', 'PREVIOUS'] as const) {
    const b = fixtureBoard(week);
    assert.equal(b.eligibleLearners, eligible.length);
    assert.equal(b.participants, b.entries.length);
    assert.equal(b.totalXp, b.entries.reduce((s, r) => s + r.score, 0));
    b.entries.forEach((r, i) => {
      assert.ok(eligible.includes(r.userId), `${r.userId} is activated, not locked, not admin`);
      assert.ok(r.score > 0);
      assert.equal(r.reviewXp + r.quizXp, r.score);
      assert.ok(r.peakHourXp <= r.score && r.bonusXp <= r.score / 2);
      assert.equal(r.rank, b.entries.findIndex(x => x.score === r.score) + 1, 'shared rank: 1 + people with more XP');
      assert.equal(r.tied, b.entries.filter(x => x.score === r.score).length > 1);
      const prev = b.entries[i - 1];
      if (prev) assert.ok(prev.score > r.score || (prev.score === r.score && (prev.reachedAt < r.reachedAt || (prev.reachedAt === r.reachedAt && prev.userId < r.userId))), `order at ${i}`);
    });
  }
  const current = fixtureBoard('CURRENT');
  const tie = current.entries.filter(r => r.userId === 117 || r.userId === 130);
  assert.deepEqual(tie.map(r => [r.userId, r.rank, r.tied]), [[117, tie[0].rank, true], [130, tie[0].rank, true]], 'same XP, 117 reached it first');
  assert.ok(current.entries.some(r => r.rankChange !== null && r.rankChange !== 0), 'mid-week: the trend against 00:00 means something');
  assert.ok(fixtureBoard('PREVIOUS').entries.every(r => r.rankChange === null));
  assert.deepEqual([fixtureBoard('PREVIOUS').isFinal, current.isFinal], [true, false]);
});

test('LB2: gap to pass the group above (LB-07) uses the lowest row of that group', () => {
  assert.equal(gapAbove(spec, spec[0]), null);
  assert.deepEqual(gapAbove(spec, spec[2]), { xp: 31, rank: 1 });
  assert.deepEqual(gapAbove(spec, spec[4]), { xp: 51, rank: 2 });
});

test('LB3: "Cần xem" thresholds are inclusive and explain themselves', () => {
  assert.deepEqual(flagsOf(row(1, 2000, 1, { peakHourXp: ANOMALY.peakHourXp - 1 })), []);
  assert.deepEqual(flagsOf(row(1, 2000, 1, { peakHourXp: ANOMALY.peakHourXp })).map(f => f.key), ['PEAK_HOUR']);
  const farm = row(2, 2400, 1, { reviewXp: 2000, quizXp: 400, activeDays: 2, peakHourXp: 400 });
  assert.deepEqual(flagsOf(farm).map(f => f.key), ['REVIEW_BURST']);
  assert.match(flagsOf(farm)[0].detail, /1\.000 XP ôn thẻ mỗi ngày học/);
  const flagged = fixtureBoard('CURRENT').entries.filter(r => flagsOf(r).length).map(r => [r.userId, flagsOf(r)[0].key]);
  assert.deepEqual(flagged, [[126, 'PEAK_HOUR'], [143, 'REVIEW_BURST']]);
  assert.deepEqual(fixtureBoard('PREVIOUS').entries.filter(r => flagsOf(r).length), []);
});

test('LB4: filters and search; ids match exactly, names ignore accents', () => {
  const b = fixtureBoard('CURRENT');
  const s = summarize(b);
  assert.equal(b.entries.filter(r => matchesFilter(r, 'FLAGGED')).length, s.flagged);
  assert.equal(b.entries.filter(r => matchesFilter(r, 'TIED')).length, s.tied);
  assert.equal(b.entries.filter(r => matchesFilter(r, 'BOOSTER')).length, s.booster);
  assert.equal(s.reviewXp + s.quizXp, b.totalXp);
  const lan = row(12, 10, 1, { displayName: 'Phạm Thanh Lan', email: 'lan@example.com' });
  assert.ok(matchesQuery(lan, 'thanh lan') && matchesQuery(lan, 'LAN@') && matchesQuery(lan, '#12') && matchesQuery(lan, '12'));
  assert.ok(!matchesQuery(lan, '1') && !matchesQuery(lan, '#120'));
});

test('LB5: XP bands use a round width and keep outliers in their own columns', () => {
  const b = fixtureBoard('CURRENT');
  const bands = xpBands(b.entries);
  assert.equal(bands.reduce((s, x) => s + x.count, 0), b.participants);
  assert.equal(bands.reduce((s, x) => s + x.flagged, 0), summarize(b).flagged);
  assert.equal(bands[0].to, 500);
  assert.ok(bands.at(-1)!.to > b.entries[0].score);
  assert.deepEqual(xpBands([]), []);
  assert.deepEqual(activeDayCounts(b.entries, daysCovered(b)).length, 3, 'Wednesday: three days so far');
  assert.equal(activeDayCounts(b.entries, 3).reduce((s, n) => s + n, 0), b.participants);
});

test('LB6: what one learner sees on the app: the top three, then the row above theirs and their own', () => {
  const rows = Array.from({ length: 12 }, (_, i) => row(100 + i, 1000 - i * 10, i + 1));
  const ids = (userId: number) => learnerView(rows, userId).map(l => (l === 'gap' ? '…' : `${l.row.userId}${l.me ? '*' : ''}`));
  assert.deepEqual(ids(101), ['100', '101*', '102']);
  assert.deepEqual(ids(103), ['100', '101', '102', '103*']);
  assert.deepEqual(ids(104), ['100', '101', '102', '103', '104*']);
  assert.deepEqual(ids(109), ['100', '101', '102', '…', '108', '109*']);
});

test('LB7: words and times an operator reads', () => {
  assert.equal(scoringRule(['FLASHCARD_REVIEW', 'QUIZ']), 'XP tuần là XP ôn thẻ và quiz, gồm cả phần Booster; không tính XP nhiệm vụ. Tuần tính từ 00:00 Thứ Hai, giờ Việt Nam.');
  assert.match(scoringRule(['FLASHCARD_REVIEW', 'QUIZ', 'MISSION_REWARD']), /XP ôn thẻ, quiz và nhiệm vụ, gồm cả phần Booster\. /);
  const b = fixtureBoard('CURRENT');
  assert.equal(weekRange(b), '19/10 – 25/10');
  assert.equal(timeLeft(b.endsAt, LB_FIXTURE_NOW.getTime()), 'Còn 4 ngày 9 giờ');
  assert.equal(timeLeft(b.endsAt, Date.parse(b.endsAt) - 90 * 60_000), 'Còn 1 giờ 30 phút');
  assert.equal(timeLeft(b.endsAt, Date.parse(b.endsAt)), 'Đang chốt');
  assert.equal(vnDayTime(fixtureBoard('PREVIOUS').asOf), '00:02 19/10');
  assert.equal(reachedLabel('2026-10-21T01:42:20Z', b.asOf), 'Hôm nay 08:42');
  assert.equal(reachedLabel('2026-10-20T14:17:00Z', b.asOf), 'Thứ 3 21:17');
  assert.equal(reachedLabel('2026-10-18T16:59:59Z', b.asOf), 'CN 23:59');
});
