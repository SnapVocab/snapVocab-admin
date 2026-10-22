/**
 * Dashboard C · "Cần xử lý": every rule the page checks, pass or fail (admin_product_review_2026-10-19 §6).
 * NOW rules read the real Shop and Missions catalogs; MOCK rules read the overview contract (types.ts).
 */
import type { AdminShopItemDTO } from '../shop/types';
import { deriveSaleState, formatShopItemStatusLabel, formatVnDateTime, MAX_COIN_PER_DAY, priceBand, priceHint } from '../shop/mappers';
import type { MissionTemplate } from '../admin-missions/types';
import { catalogSummary, CLIENTS, dailyOutlook, poolShortage } from '../admin-missions/mappers';
import { scanErrorLabel } from '../scan/labels';
import type { AdminOverview } from './types';

export type Severity = 'danger' | 'warning' | 'info';
export type CheckArea = 'MISSIONS' | 'SHOP' | 'SCAN';
export interface Issue {
  severity: Severity;
  title: string;
  detail: string;
  cta: string;
  /** Deep link: the one object when there is one, else its list. */
  path: string;
}
export interface Check {
  id: string;
  area: CheckArea;
  scope: 'NOW' | 'MOCK';
  /** What is checked, phrased as the healthy state. */
  rule: string;
  issue: Issue | null;
}

/**
 * Thresholds of the hint rules. UI hints only, nothing blocks on them (design.md P7).
 * ponytail: fixed numbers; move to the overview API once the PO sets them (dashboard_ui.md §3).
 */
export const THRESHOLDS = {
  endingSoonDays: 7,
  endingUrgentDays: 2,
  staleDraftDays: 14,
  scanErrorRate: 0.05,
  scanErrorRateDanger: 0.15,
  scanP95Ms: 10_000,
  unmappedScans7d: 10,
  missionMinRate: 0.25,
  missionMinAssigned: 20,
};

const DAY = 86_400_000;
const RANK: Record<Severity, number> = { danger: 0, warning: 1, info: 2 };

export const pct = (x: number) => `${(x * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
/** "2,4 giây"; "—" when there is nothing to measure (no scan finished in the range). */
export const seconds = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} giây`);
const pathFor = (base: string, ids: number[]) => (ids.length === 1 ? `${base}/${ids[0]}` : base);
const list = (xs: string[], max = 3) => xs.slice(0, max).join('; ') + (xs.length > max ? `; và ${xs.length - max} mục khác` : '');

function missionChecks(missions: MissionTemplate[], shop?: AdminShopItemDTO[]): Check[] {
  const s = catalogSummary(missions);
  const out: Check[] = [{
    id: 'mission-invariant', area: 'MISSIONS', scope: 'NOW', rule: 'Catalog nhiệm vụ đủ để cấp 5 nhiệm vụ mỗi ngày',
    issue: s.inactive
      ? { severity: 'warning', title: 'Chưa kích hoạt nhiệm vụ hằng ngày', detail: 'Không có mẫu nào đang bật nên người học chưa nhận nhiệm vụ.', cta: 'Mở Nhiệm vụ', path: '/missions' }
      : !s.valid
        ? { severity: 'danger', title: 'Catalog nhiệm vụ không đủ cấp 5 nhiệm vụ mỗi ngày', detail: `Đang bật ${s.core} mẫu cốt lõi và ${s.slotFive} mẫu slot 5 không có điều kiện cấp. ${poolShortage(missions)}`, cta: 'Mở Nhiệm vụ', path: '/missions' }
        : null,
  }];

  if (shop) {
    // ponytail: the catalog is one page of 100 (TD-ADS-10); past that a reward item can look missing when it is not.
    const byCode = new Map(shop.map((i) => [i.code, i]));
    const broken = missions.filter((m) => m.isActive && m.rewardItemCode && byCode.get(m.rewardItemCode)?.status !== 'PUBLISHED');
    const statusOf = (m: MissionTemplate) => byCode.get(m.rewardItemCode!)?.status;
    const missing = broken.some((m) => !statusOf(m));
    const draft = broken.some((m) => statusOf(m) === 'DRAFT');
    out.push({
      id: 'mission-reward-item', area: 'MISSIONS', scope: 'NOW', rule: 'Vật phẩm thưởng của nhiệm vụ đang bật còn ở trạng thái Đã phát hành',
      issue: broken.length ? {
        severity: missing ? 'danger' : draft ? 'warning' : 'info',
        title: `${broken.length} nhiệm vụ có vật phẩm thưởng không còn phát hành`,
        detail: `${list(broken.map((m) => `${m.name} → ${byCode.get(m.rewardItemCode!)?.name ?? `mã ${m.rewardItemCode}`} (${statusOf(m) ? formatShopItemStatusLabel(statusOf(m)) : 'không tồn tại'})`))}. ${
          missing ? 'Vật phẩm không tồn tại: nhận thưởng sẽ lỗi.'
            : draft ? 'Vật phẩm nháp: người học nhận Coin dự phòng thay vật phẩm.'
              : 'Vật phẩm đã lưu trữ vẫn được cấp, nhưng sửa thưởng hoặc bật lại mẫu sẽ bị chặn.'}`,
        cta: 'Sửa phần thưởng', path: pathFor('/missions', broken.map((m) => m.id)),
      } : null,
    });
  }

  const top = dailyOutlook(missions, [CLIENTS.current]).coin?.[1] ?? 0;
  out.push({
    id: 'mission-budget', area: 'MISSIONS', scope: 'NOW', rule: `Thưởng tối đa mỗi người/ngày ≤ ${MAX_COIN_PER_DAY} Coin`,
    issue: top > MAX_COIN_PER_DAY ? {
      severity: 'warning', title: `Thưởng nhiệm vụ lên tới ${top} Coin/ngày`,
      detail: `Vượt ${MAX_COIN_PER_DAY} Coin/ngày, mức kinh tế đã duyệt; giá Cửa hàng đang quy ra "ngày đủ" theo mức này.`,
      cta: 'Mở Nhiệm vụ', path: '/missions',
    } : null,
  });
  return out;
}

function shopChecks(shop: AdminShopItemDTO[], now: Date): Check[] {
  const onSale = shop.filter((i) => deriveSaleState(i, now).state === 'ON_SALE');
  const left = (i: AdminShopItemDTO) => (i.availableUntil ? new Date(i.availableUntil).getTime() - now.getTime() : Infinity);
  const ending = onSale.filter((i) => left(i) < THRESHOLDS.endingSoonDays * DAY).sort((a, b) => left(a) - left(b));
  const offBand = onSale
    .map((i) => ({ i, hint: priceHint(i.price, priceBand(shop, i.type, i.id, now)) }))
    .filter((x) => x.hint);
  const stale = shop.filter((i) => i.status === 'DRAFT' && now.getTime() - new Date(i.updatedAt).getTime() > THRESHOLDS.staleDraftDays * DAY);

  return [
    {
      id: 'shop-ending', area: 'SHOP', scope: 'NOW', rule: `Không có vật phẩm đang bán hết hạn trong ${THRESHOLDS.endingSoonDays} ngày tới`,
      issue: ending.length ? {
        severity: left(ending[0]) < THRESHOLDS.endingUrgentDays * DAY ? 'warning' : 'info',
        title: `${ending.length} vật phẩm sắp hết thời gian bán`,
        detail: `${list(ending.map((i) => `${i.name} đến ${formatVnDateTime(i.availableUntil)}`))}. Gia hạn, hoặc để hết hạn nếu đúng kế hoạch.`,
        cta: 'Xem vật phẩm', path: pathFor('/shop', ending.map((i) => i.id)),
      } : null,
    },
    {
      id: 'shop-price', area: 'SHOP', scope: 'NOW', rule: 'Giá vật phẩm đang bán nằm trong dải giá cùng loại (×1,5)',
      issue: offBand.length ? {
        severity: 'warning',
        title: `${offBand.length} vật phẩm có giá lệch dải cùng loại`,
        detail: `${list(offBand.map(({ i, hint }) => `${i.name}: ${i.price} Coin, ${hint === 'ABOVE' ? 'cao' : 'thấp'} bất thường`))}. Gợi ý để rà lại, không chặn bán.`,
        cta: 'Rà giá', path: pathFor('/shop', offBand.map(({ i }) => i.id)),
      } : null,
    },
    {
      id: 'shop-stale-draft', area: 'SHOP', scope: 'NOW', rule: `Không có bản nháp bỏ dở quá ${THRESHOLDS.staleDraftDays} ngày`,
      issue: stale.length ? {
        severity: 'info',
        title: `${stale.length} bản nháp chưa động tới quá ${THRESHOLDS.staleDraftDays} ngày`,
        detail: `${list(stale.map((i) => i.name))}. Phát hành hoặc xóa để kệ nháp gọn.`,
        cta: 'Rà bản nháp', path: pathFor('/shop', stale.map((i) => i.id)),
      } : null,
    },
  ];
}

function overviewChecks(o: AdminOverview, missions?: MissionTemplate[]): Check[] {
  const t = o.scan.today;
  const rate = t.total ? t.failed / t.total : 0;
  const topError = [...o.scan.errors7d].sort((a, b) => b.count - a.count)[0];
  const labels = o.unmappedLabels.filter((l) => l.scans7d >= THRESHOLDS.unmappedScans7d);
  const low = o.missions.filter((m) => m.assigned7d >= THRESHOLDS.missionMinAssigned && m.completed7d / m.assigned7d < THRESHOLDS.missionMinRate);
  const template = (code: string) => missions?.find((m) => m.code === code);

  return [
    {
      id: 'scan-errors', area: 'SCAN', scope: 'MOCK', rule: `Tỉ lệ scan lỗi hôm nay ≤ ${pct(THRESHOLDS.scanErrorRate)}`,
      issue: rate > THRESHOLDS.scanErrorRate ? {
        severity: rate > THRESHOLDS.scanErrorRateDanger ? 'danger' : 'warning',
        title: `Scan lỗi ${pct(rate)} hôm nay`,
        detail: `${t.failed}/${t.total} lượt lỗi${topError ? `; lỗi gặp nhiều nhất 7 ngày: ${scanErrorLabel(topError.code).toLowerCase()} (${topError.count} lượt)` : ''}. Lượt lỗi không trừ quota của người học.`,
        cta: 'Xem vận hành scan', path: '/ai-scan',
      } : null,
    },
    {
      id: 'scan-p95', area: 'SCAN', scope: 'MOCK', rule: `p95 thời gian xử lý scan ≤ ${seconds(THRESHOLDS.scanP95Ms)}`,
      issue: t.p95Ms !== null && t.p95Ms > THRESHOLDS.scanP95Ms ? {
        severity: 'warning', title: `Scan chậm: p95 ${seconds(t.p95Ms)}`,
        detail: `p50 ${seconds(t.p50Ms)}; máy chủ có ${o.scan.config.workers} worker xử lý lần lượt. Báo đội kỹ thuật kiểm tra dịch vụ AI.`,
        cta: 'Xem vận hành scan', path: '/ai-scan',
      } : null,
    },
    {
      id: 'scan-queue', area: 'SCAN', scope: 'MOCK', rule: 'Hàng đợi scan không bị đầy hôm nay',
      issue: t.queueFull > 0 ? {
        severity: 'warning', title: `Hàng đợi scan đầy ${t.queueFull} lần hôm nay`,
        detail: `Máy chủ có ${o.scan.config.workers} worker và hàng đợi ${o.scan.config.queueCapacity} chỗ; người học bị báo "${scanErrorLabel('AI_QUEUE_FULL')}" và phải chụp lại. Tăng worker hoặc hàng đợi là cấu hình máy chủ.`,
        cta: 'Xem vận hành scan', path: '/ai-scan',
      } : null,
    },
    {
      id: 'scan-unmapped', area: 'SCAN', scope: 'MOCK', rule: `Nhãn scan gặp ≥ ${THRESHOLDS.unmappedScans7d} lượt/7 ngày đều đã có từ`,
      issue: labels.length ? {
        severity: 'info', title: `${labels.length} nhãn hay gặp chưa ra từ vựng`,
        detail: `${list(labels.map((l) => `"${l.label}" ${l.scans7d} lượt`))}. Người học scan ra nhãn nhưng không lưu được từ.`,
        // Navigation only: label → word mapping (F-DICT-06) is not built, so the button must not promise it.
        cta: 'Mở AI Scan', path: '/ai-scan',
      } : null,
    },
    {
      id: 'mission-completion', area: 'MISSIONS', scope: 'MOCK', rule: `Nhiệm vụ được giao ≥ ${THRESHOLDS.missionMinAssigned} lần có tỉ lệ hoàn thành ≥ ${pct(THRESHOLDS.missionMinRate)} (7 ngày)`,
      issue: low.length ? {
        severity: 'info', title: `${low.length} nhiệm vụ ít người hoàn thành`,
        detail: `${list(low.map((m) => `${template(m.code)?.name ?? m.code}: ${pct(m.completed7d / m.assigned7d)} (${m.completed7d}/${m.assigned7d})`))}. Có thể quá khó hoặc bị bỏ qua.`,
        cta: 'Xem nhiệm vụ', path: pathFor('/missions', low.map((m) => template(m.code)?.id).filter((id): id is number => id !== undefined)),
      } : null,
    },
  ];
}

/** Checks for every source that has loaded; a source still loading or failed contributes none. */
export function runChecks(src: { missions?: MissionTemplate[]; shop?: AdminShopItemDTO[]; overview?: AdminOverview; now: Date }): Check[] {
  return [
    ...(src.missions ? missionChecks(src.missions, src.shop) : []),
    ...(src.shop ? shopChecks(src.shop, src.now) : []),
    ...(src.overview ? overviewChecks(src.overview, src.missions) : []),
  ];
}

/** Failing checks, most severe first; NOW before MOCK at the same severity. */
export const openIssues = (checks: Check[]) =>
  checks.filter((c): c is Check & { issue: Issue } => c.issue !== null)
    .sort((a, b) => RANK[a.issue.severity] - RANK[b.issue.severity] || (a.scope === b.scope ? 0 : a.scope === 'NOW' ? -1 : 1));

export interface ChangeEvent { at: string; area: 'SHOP' | 'MISSIONS'; name: string; code: string; event: string; version: number; path: string }

/**
 * Latest lifecycle timestamps of Shop items and mission templates. Not an audit log: who changed what
 * needs admin_audit_logs (design.md §8); this only shows when.
 */
export function recentChanges(shop: AdminShopItemDTO[] = [], missions: MissionTemplate[] = [], limit = 8): ChangeEvent[] {
  const after = (a: string, b: string | null) => !b || new Date(a).getTime() - new Date(b).getTime() > 60_000;
  const events: ChangeEvent[] = [];
  for (const i of shop) {
    const base = { area: 'SHOP' as const, name: i.name, code: i.code, version: i.version, path: `/shop/${i.id}` };
    events.push({ ...base, at: i.createdAt, event: 'Tạo bản nháp' });
    if (i.publishedAt) events.push({ ...base, at: i.publishedAt, event: 'Phát hành' });
    if (after(i.updatedAt, i.publishedAt ?? i.createdAt)) events.push({ ...base, at: i.updatedAt, event: i.status === 'ARCHIVED' ? 'Sửa gần nhất · đã lưu trữ' : 'Sửa gần nhất' });
  }
  for (const m of missions) {
    const base = { area: 'MISSIONS' as const, name: m.name, code: m.code, version: m.version, path: `/missions/${m.id}` };
    events.push({ ...base, at: m.createdAt, event: 'Tạo mẫu' });
    if (after(m.updatedAt, m.createdAt)) events.push({ ...base, at: m.updatedAt, event: m.isActive ? 'Sửa gần nhất' : 'Sửa gần nhất · đang tắt' });
  }
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}
