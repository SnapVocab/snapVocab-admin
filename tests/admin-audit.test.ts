import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURE_NOW, fixtureAuditCsv, fixtureAuditLog } from '../src/domains/admin-audit/fixtures';
import { fixtureBans } from '../src/domains/admin-learners/fixtures';
import { changeLines, dayHeading, formatValue, groupByDay, hasKind, historyPath, KINDS, parseHistoryPath, targetPath, vnDay } from '../src/domains/admin-audit/mappers';
import type { AuditEntry, AuditLogParams } from '../src/domains/admin-audit/types';

const all = async (p: AuditLogParams = {}) => (await fixtureAuditLog({ days: 90, size: 1000, ...p })).data;
const latest = (entries: AuditEntry[], type: AuditEntry['target']['type'], id: string) => entries.find((e) => e.target.type === type && e.target.id === id)!;

test('AU1. Cửa hàng and Nhiệm vụ follow the real lifecycle: one version per write, last write = the 2026-10-20 clone', async () => {
  const entries = await all();
  for (let i = 1; i < entries.length; i++) assert.ok(entries[i - 1].at >= entries[i].at, 'newest first');
  const writes = new Map<string, number[]>();
  for (const e of [...entries].reverse().filter((x) => x.area === 'SHOP' || x.area === 'MISSIONS')) {
    const key = `${e.target.type}:${e.target.id}`;
    writes.set(key, [...(writes.get(key) ?? []), e.version!]);
  }
  for (const [key, versions] of writes) assert.deepEqual(versions, versions.map((_, i) => i), key);
  assert.equal(writes.size, 19 + 7, 'every shop item and mission template of the clone');

  const golden = latest(entries, 'SHOP_ITEM', '11');
  assert.deepEqual([golden.at, golden.version, golden.changes], ['2026-10-06T07:33:58Z', 4, [{ field: 'price', before: 900, after: 950 }]]);
  const cherry = latest(entries, 'SHOP_ITEM', '12');
  assert.deepEqual([cherry.at, cherry.version], ['2026-10-06T07:34:02Z', 3]);
  assert.deepEqual(cherry.changes.map((c) => c.after), [null, false], 'draft kept as a gift: no price, not for sale');
  assert.equal(latest(entries, 'SHOP_ITEM', '6').action, 'SHOP_ITEM_ARCHIVED');
  const words = latest(entries, 'MISSION_TEMPLATE', '1');
  assert.deepEqual([words.at, words.version, words.changes[0].after], ['2026-10-06T08:22:36Z', 2, 15]);
  assert.ok(entries.filter((e) => e.area === 'MISSIONS' && e.action === 'MISSION_TEMPLATE_CREATED').every((e) => e.actor === null), 'the seeder, not an admin');
});

test('AU2. sensitive writes carry a reason (design.md §8.3); bans are the Learners fixture bans', async () => {
  const entries = await all();
  for (const e of entries.filter((x) => x.guardrail || x.action === 'LEARNER_BANNED' || x.action === 'SHOP_ITEM_ARCHIVED')) {
    assert.ok((e.reason ?? '').length >= 10, `${e.id} ${e.action} needs a reason`);
  }
  const bans = fixtureBans();
  const logged = entries.filter((e) => e.action === 'LEARNER_BANNED');
  assert.equal(logged.length, bans.length);
  assert.ok(bans.length >= 2 && bans[0].at !== bans[1].at, 'two bans, different times');
  for (const b of bans) {
    const e = logged.find((x) => x.target.id === String(b.id))!;
    assert.deepEqual([e.at, e.reason, e.actor?.email, e.target.name], [b.at, b.reason, b.by, b.name]);
  }
});

test('AU3. period, strip questions, day, actor, search, object history and paging', async () => {
  const r30 = await fixtureAuditLog({});
  const r7 = await fixtureAuditLog({ days: 7 });
  assert.ok(r7.summary.total < r30.summary.total);
  assert.equal(r30.summary.daily.length, 30);
  assert.equal(r30.summary.daily.at(-1)!.day, vnDay(FIXTURE_NOW));
  assert.equal(r30.summary.daily.reduce((s, d) => s + d.count, 0), r30.summary.total);
  assert.equal(r30.summary.areas.reduce((s, a) => s + a.count, 0), r30.summary.total);
  assert.equal(r30.summary.areas[0].area, 'SHOP', 'most active first');
  assert.ok(r30.summary.areas.every((a, i, xs) => a.count > 0 && (i === 0 || xs[i - 1].count >= a.count)));
  assert.equal(r30.summary.byKind.GUARDRAIL, 2);

  for (const kind of KINDS) {
    const f = await fixtureAuditLog({ kind, size: 1000 });
    assert.equal(f.meta.total, r30.summary.byKind[kind], kind);
    assert.ok(f.data.every((e) => hasKind(e, kind)), kind);
    assert.equal(f.summary.total, r30.summary.total, 'the strip ignores its own filter');
  }

  const peak = r30.summary.daily.reduce((p, d) => (d.count > p.count ? d : p));
  assert.equal(peak.day, '2026-10-06', 'the frame launch');
  assert.equal((await fixtureAuditLog({ day: peak.day, size: 1000 })).meta.total, peak.count);

  const system = await fixtureAuditLog({ days: 90, actor: 'SYSTEM', size: 1000 });
  assert.ok(system.meta.total > 0 && system.data.every((e) => e.actor === null));
  assert.equal(r30.summary.actors[0].actor?.email, 'admin@snapvocab.com');

  const found = await fixtureAuditLog({ days: 90, q: 'hoang kim' });
  assert.ok(found.meta.total === 5 && found.data.every((e) => e.target.code === 'FRAME_GOLDEN_WORDSMITH'), 'accent-insensitive');

  const history = await fixtureAuditLog({ days: 90, target: { type: 'SHOP_ITEM', id: '11' } });
  assert.deepEqual([history.meta.total, history.summary.total], [5, 5]);

  const [p0, p1] = await Promise.all([fixtureAuditLog({ days: 90, size: 20 }), fixtureAuditLog({ days: 90, size: 20, page: 1 })]);
  assert.equal(p0.meta.pages, Math.ceil(p0.meta.total / 20));
  assert.ok(p0.data.at(-1)!.at >= p1.data[0].at);
});

test('AU4. links, object history paths and value labels', async () => {
  const t = (type: AuditEntry['target']['type'], id: string, parents?: number[]) => ({ type, id, name: '', code: null, parents });
  assert.equal(targetPath(t('SHOP_ITEM', '11')), '/shop/11');
  assert.equal(targetPath(t('MISSION_TEMPLATE', '1')), '/missions/1');
  assert.equal(targetPath(t('TOPIC', '23', [1, 18])), '/topics/1/18/23');
  assert.equal(targetPath(t('WORD', 'remote control')), '/dictionary/remote%20control');
  assert.equal(targetPath(t('LEARNER', '108')), '/learners/108');
  assert.equal(targetPath(t('NOTIFICATION', 'x')), null);

  const word = { type: 'WORD' as const, id: 'remote control' };
  assert.equal(historyPath(word), '/activity-log/tu/remote%20control');
  assert.deepEqual(parseHistoryPath(historyPath(word).split('/').slice(2)), word);
  assert.equal(parseHistoryPath(['khong-co', '1']), null);
  assert.equal(parseHistoryPath([]), null);

  assert.equal(formatValue('price', 1500), '1.500 Coin');
  assert.equal(formatValue('price', null), '—');
  assert.equal(formatValue('status', 'ARCHIVED'), 'Đã lưu trữ');
  assert.equal(formatValue('isActive', false), 'Đang tắt');
  assert.equal(formatValue('purchasable', false), 'Không');
  assert.equal(formatValue('availableUntil', '2026-10-20T04:16:00Z'), '20/10/2026 11:16');
  assert.equal(formatValue('iconKey', 'public/shop/17c12dc8-5ac5-444d-946b-9ab608fae926.webp'), '17c12dc8….webp');
  assert.equal(formatValue('ipa', ['/fɑks/', '/fɒks/']), '/fɑks/, /fɒks/');
  assert.equal(formatValue('accountStatus', 'BANNED'), 'Đã khóa');

  const entries = await all();
  const launch = entries.find((e) => e.action === 'SHOP_ITEM_CREATED' && e.target.id === '31')!;
  assert.deepEqual(changeLines(launch).map((c) => `${c.label}: ${c.before ?? ''}${c.after}`), ['Loại: Khung avatar', 'Giá: 1.500 Coin'], 'creations show values, not "— →" or the name');
  const upload = entries.find((e) => e.target.id === '10' && e.changes.some((c) => c.field === 'frameAssetKey'))!;
  assert.deepEqual(changeLines(upload).map((c) => `${c.label}: ${c.after}`), ['Ảnh biểu tượng: Tải ảnh lên', 'Ảnh khung: Tải ảnh lên'], 'uploads in words; file ids stay in the drawer');
});

test('AU5. days are calendar days in UTC+7', async () => {
  assert.equal(vnDay('2026-10-18T17:30:00Z'), '2026-10-19');
  assert.equal(dayHeading('2026-10-19', FIXTURE_NOW), 'Hôm nay, 19/10/2026');
  assert.equal(dayHeading('2026-10-18', FIXTURE_NOW), 'Hôm qua, 18/10/2026');
  assert.equal(dayHeading('2026-10-06', FIXTURE_NOW), 'Thứ Ba, 06/10/2026');
  const entries = await all();
  const groups = groupByDay(entries);
  assert.equal(groups.reduce((s, g) => s + g.entries.length, 0), entries.length);
  assert.equal(new Set(groups.map((g) => g.day)).size, groups.length, 'one group per day');
});

test('AU6. CSV export: every filtered row, Vietnamese labels, readable changes', async () => {
  const csv = await fixtureAuditCsv({ days: 90, target: { type: 'SHOP_ITEM', id: '12' } });
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 1 + 4);
  assert.ok(lines[0].startsWith('﻿"Thời điểm (giờ Việt Nam)","Người làm","Khu vực"'));
  assert.match(csv, /"06\/10\/2026 14:33:50","admin@snapvocab\.com","Cửa hàng","Sửa","Vật phẩm","Hoa Anh Đào Mùa Xuân","FRAME_CHERRY_BLOSSOM","12","Giá: 600 Coin → 2\.400 Coin"/);
  assert.match(csv, /"Hệ thống","Cửa hàng","Tạo bản nháp"/);
});
