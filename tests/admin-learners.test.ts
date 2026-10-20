import test from 'node:test';
import assert from 'node:assert/strict';
import { activityOf, banReasonError, foldVi, formatAgo, initials, matchesQuery } from '../src/domains/admin-learners/mappers';
import { FIXTURE_NOW, fixtureDetail, fixtureList, fixtureSetBan } from '../src/domains/admin-learners/fixtures';

const ago = (h: number) => new Date(FIXTURE_NOW.getTime() - h * 3_600_000).toISOString();

test('L1. activity buckets and relative time follow last_studied_at', () => {
  assert.equal(activityOf(null, FIXTURE_NOW), 'NEVER');
  assert.equal(activityOf(ago(2), FIXTURE_NOW), 'ACTIVE_7D');
  assert.equal(activityOf(ago(24 * 7), FIXTURE_NOW), 'ACTIVE_7D');
  assert.equal(activityOf(ago(24 * 15), FIXTURE_NOW), 'IDLE');
  assert.equal(activityOf(ago(24 * 31), FIXTURE_NOW), 'DORMANT_30D');
  assert.equal(formatAgo(null, FIXTURE_NOW), 'Chưa học');
  assert.equal(formatAgo(ago(0.5), FIXTURE_NOW), '30 phút trước');
  assert.equal(formatAgo(ago(3), FIXTURE_NOW), '3 giờ trước');
  assert.equal(formatAgo(ago(30), FIXTURE_NOW), 'Hôm qua');
  assert.equal(formatAgo(ago(24 * 6), FIXTURE_NOW), '6 ngày trước');
});

test('L2. search ignores case and Vietnamese accents (đ → d), and matches email', () => {
  assert.equal(foldVi('Đặng Thị Hà'), 'dang thi ha');
  const row = { displayName: 'Đặng Thị Hà', email: 'ha.dang@gmail.com' };
  for (const q of ['dang', 'ĐẶNG', 'thi ha', 'HA.DANG', '  ']) assert.ok(matchesQuery(row, q), q);
  assert.ok(!matchesQuery(row, 'nguyen'));
  assert.equal(initials('Nguyễn Văn An'), 'VA');
});

test('L3. a ban needs a 10–500 character reason', () => {
  assert.match(banReasonError('spam')!, /ít nhất 10/);
  assert.equal(banReasonError('  Tạo nhiều tài khoản  '), null);
  assert.match(banReasonError('x'.repeat(501))!, /Tối đa/);
});

test('L4. fixture list: summary counts the whole population; cells filter; pages are stable', async () => {
  const all = await fixtureList({ size: 100 });
  const s = all.summary;
  assert.equal(s.total, 48);
  assert.equal(all.meta.total, 48);
  assert.equal(s.pending, 4);
  assert.equal(s.banned, 2);
  const active = await fixtureList({ activity: 'ACTIVE_7D', size: 100 });
  assert.equal(active.meta.total, s.active7d);
  assert.deepEqual(active.summary, s, 'summary ignores filters');
  assert.ok(active.data.every((r) => activityOf(r.lastStudiedAt, FIXTURE_NOW) === 'ACTIVE_7D'));
  const pending = await fixtureList({ status: 'PENDING', size: 100 });
  assert.ok(pending.data.every((r) => r.status === 'PENDING' && r.lastStudiedAt === null), 'pending accounts never studied');
  const p2 = await fixtureList({ page: 2, size: 20 });
  assert.equal(p2.data.length, 8);
  assert.equal(p2.meta.pages, 3);
});

test('L5. fixture detail is internally consistent with real catalogs', async () => {
  for (const row of (await fixtureList({ size: 100 })).data) {
    const d = await fixtureDetail(row.id);
    const p = d.progress;
    assert.equal(p.newCount + p.learning + p.reviewing + p.mastered, row.wordsSaved, `states sum #${row.id}`);
    assert.ok(d.missions7d.claimed <= d.missions7d.completed && d.missions7d.completed <= d.missions7d.assigned);
    assert.ok(d.badges.every((b) => !b.code.startsWith('WORDS_') || row.wordsSaved >= Number(b.code.split('_')[1])), 'word badges match thresholds');
    assert.ok(d.scans.failed30d <= d.scans.last30d && d.scans.today <= d.scans.dailyLimit);
    if (row.lastStudiedAt === null) assert.equal(d.activity30d.reduce((a, b) => a + b, 0), 0, 'no activity without study');
    if (d.ban && row.lastStudiedAt) assert.ok(row.lastStudiedAt < d.ban.at, `banned #${row.id} cannot study after the ban`);
  }
});

test('L6. ban then unban round-trips status, reason and timeline', async () => {
  const id = (await fixtureList({ status: 'ALL', size: 1 })).data[0].id;
  const banned = await fixtureSetBan(id, true, 'Spam tạo tài khoản');
  assert.equal(banned.status, 'BANNED');
  assert.equal(banned.ban?.reason, 'Spam tạo tài khoản');
  assert.match(banned.timeline[0].text, /Bị khóa/);
  assert.equal((await fixtureList({ size: 100 })).summary.banned, 3);
  const back = await fixtureSetBan(id, false, '');
  assert.equal(back.status, 'ACTIVE');
  assert.equal(back.ban, null);
  await assert.rejects(fixtureDetail(99999), /Không tìm thấy/);
});
