import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Copy, Lock } from 'lucide-react';
import { Button } from '../../components/ui';
import { ActiveBadge, ErrorBanner } from '../admin-missions/components';
import { EMBLEM_LABELS, isKnownEmblem, metricInfo, previewShelf, ruleSentence, statusReason } from '../../domains/admin-badges/catalog';
import type { AdminBadge } from '../../domains/admin-badges/types';
import { BadgeArtifact } from './BadgeArtifact';

const date = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
    <dt className="text-xs font-semibold text-text-muted">{label}</dt>
    <dd className="m-0 min-w-0 break-words text-sm">{children}</dd>
  </div>
);

/** P1 read-only view of one badge (rev 2 §3.2). Editing, activation and creation belong to P2/P3. */
export function BadgeDetail({ badge, all, onBack }: { badge: AdminBadge; all: AdminBadge[]; onBack: () => void }) {
  const [copied, setCopied] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [badge.id]);
  const info = metricInfo(badge.metric);
  const shelf = previewShelf(all, badge);
  const knownIcon = isKnownEmblem(badge.iconKey);
  const reason = statusReason(badge);
  const copyCode = () => void navigator.clipboard?.writeText(badge.code)
    .then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); })
    .catch(() => undefined);

  return (
    <div className="space-y-4">
      <div className="sticky -top-4 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-top-6 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-3">
          <Button size="sm" icon={<ArrowLeft />} label="Quay lại danh sách" onClick={onBack} />
          <div>
            <h1 ref={heading} tabIndex={-1} className="text-xl font-extrabold tracking-tight">{badge.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <ActiveBadge active={badge.isActive} />
              {badge.version !== null && <span>Phiên bản {badge.version}</span>}
              {reason && <span>· {reason}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <div className="min-w-0 space-y-4">
          <section aria-labelledby="bdg-rule" className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <h2 id="bdg-rule" className="text-sm font-bold">Điều kiện đạt</h2>
              <span className="flex items-center gap-1 text-[11px] text-text-muted"><Lock size={12} />Khóa sau khi tạo</span>
            </div>
            <div className="space-y-1.5 rounded-lg bg-surface-subtle p-3">
              <p className="text-[11px] text-text-muted">Người học nhận khi</p>
              <p className="text-[15px] font-extrabold">{ruleSentence(badge)}</p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-text-muted">
                <span>Chuỗi: <strong className="text-text">{info?.title ?? 'Chỉ số chưa hỗ trợ'}</strong> <span className="font-mono text-[11px]">{badge.metric}</span></span>
                <span>Ngưỡng: <strong className="text-text tabular-nums">≥ {badge.threshold.toLocaleString('vi-VN')}{info ? ` ${info.unit}` : ''}</strong></span>
                <span className="flex items-center gap-1">Mã: <strong className="font-mono text-[11px] text-text">{badge.code}</strong>
                  <Button variant="ghost" size="sm" className="h-6 w-6" icon={copied ? <Check /> : <Copy />} label="Sao chép mã" onClick={copyCode} />
                </span>
              </div>
            </div>
            {info
              ? <p className="rounded-lg bg-info-light p-3 text-xs text-info-dark">{info.rule}</p>
              : <ErrorBanner message={`Admin chưa hỗ trợ chỉ số “${badge.metric}”: chưa có tên chuỗi, đơn vị và cách đếm. Huy hiệu này chỉ xem được.`} />}
            <p className="text-xs text-text-muted">Mã, chuỗi và ngưỡng không đổi được, kể cả khi huy hiệu đang tắt.</p>
          </section>

          <section aria-labelledby="bdg-show" className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-card">
            <h2 id="bdg-show" className="text-sm font-bold">Hiển thị cho người học</h2>
            <dl className="m-0 space-y-3">
              <Row label="Tên hiển thị">{badge.name}</Row>
              <Row label="Mô tả (điều kiện người học đọc)">{badge.description}</Row>
              <Row label="Biểu tượng">
                <span className="inline-flex items-center gap-2">
                  {knownIcon ? EMBLEM_LABELS[badge.iconKey] : 'Không hỗ trợ'} <span className="font-mono text-[11px] text-text-muted">{badge.iconKey}</span>
                </span>
                {!knownIcon && <p className="mt-1 text-xs font-semibold text-warning-dark">Ứng dụng sẽ hiện biểu tượng mặc định vì “{badge.iconKey}” không có trong bộ biểu tượng.</p>}
              </Row>
            </dl>
          </section>

          <details className="rounded-xl border border-border bg-surface p-4">
            <summary className="cursor-pointer text-sm font-bold">Cấu hình nâng cao</summary>
            <dl className="m-0 mt-3">
              <Row label="Thứ tự hiển thị"><span className="tabular-nums">{badge.sortOrder}</span>
                <p className="mt-1 text-xs text-text-muted">Quyết định thứ tự giữa các kệ (theo số nhỏ nhất của chuỗi) và thứ tự phụ trên Hồ sơ. Trong chuỗi, mốc luôn xếp theo ngưỡng.</p>
              </Row>
            </dl>
          </details>
        </div>

        <aside className="min-w-0 space-y-3 lg:sticky lg:top-20" aria-label="Xem trước trên ứng dụng">
          <div className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-card">
            <p className="text-xs font-bold tracking-wide text-text-muted">XEM TRƯỚC TRÊN ỨNG DỤNG</p>
            <div className="flex justify-around">
              <figure className="m-0 grid justify-items-center gap-1"><BadgeArtifact metric={badge.metric} iconKey={badge.iconKey} size={64} threshold={badge.threshold} /><figcaption className="text-[11px] text-text-muted">Người học đã đạt</figcaption></figure>
              <figure className="m-0 grid justify-items-center gap-1"><BadgeArtifact metric={badge.metric} iconKey={badge.iconKey} state="locked" size={64} threshold={badge.threshold} /><figcaption className="text-[11px] text-text-muted">Người học chưa đạt</figcaption></figure>
            </div>
            <p className="text-xs font-semibold">Kệ “{info?.title ?? badge.metric}” của người học chưa đạt mốc nào</p>
            <div className="flex items-end justify-center gap-4 overflow-x-auto rounded-lg bg-surface-subtle px-2 pb-1.5 pt-3">
              {shelf.map(b => (
                <div key={b.id} className={`grid justify-items-center gap-1 text-[11px] tabular-nums ${b.id === badge.id ? 'font-bold text-text' : 'text-text-muted'}`}>
                  <BadgeArtifact metric={b.metric} iconKey={b.iconKey} state="locked" size={40} focused={b.id === badge.id} />
                  {b.threshold.toLocaleString('vi-VN')}
                </div>
              ))}
            </div>
            {!badge.isActive && <p className="text-xs text-text-muted">Người học chưa đạt hiện không thấy huy hiệu này; kệ trên là khi huy hiệu được bật.</p>}
            {shelf.length >= 4 && <p className="text-xs text-text-muted">Chuỗi có {shelf.length} mốc: app chuyển kệ sang dạng cuộn ngang.</p>}
            <div className="space-y-1 rounded-xl border border-border p-3">
              <p className="text-sm font-extrabold">{badge.name}</p>
              <p className="text-xs text-text-muted">{badge.description}</p>
              {info?.sheetNote && <p className="rounded-md bg-surface-subtle p-2 text-[11px] text-text-muted">{info.sheetNote}</p>}
            </div>
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-muted">
            <span>ID #{badge.id}</span><span>Tạo {date(badge.createdAt)}</span><span>Cập nhật {date(badge.updatedAt)}</span>
          </p>
        </aside>
      </div>
    </div>
  );
}
