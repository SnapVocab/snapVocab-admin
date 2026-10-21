import React, { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmModal } from '../../components/ui';
import { patchAdminBadge } from '../../domains/admin-badges/api';
import { formatCount } from '../../domains/admin-badges/catalog';
import { badgeKeys, useRefillEstimate } from '../../domains/admin-badges/queries';
import type { AdminBadge } from '../../domains/admin-badges/types';
import { formatVnDateTime } from '../../domains/shop/mappers';
import { badgeErrorMessage } from './ui';

/**
 * Bật/Tắt one badge (P2, badges.md §10). Bật counts who would be granted on their next sync (PD-BDG-13d); an estimate
 * that fails or is missing says so and never shows 0, and never blocks Bật.
 */
export function ToggleBadgeDialog({ badge, onClose, onDone }: { badge: AdminBadge; onClose: () => void; onDone: (b: AdminBadge) => void }) {
  const client = useQueryClient();
  const on = !badge.isActive;
  const estimate = useRefillEstimate(badge.id, on);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const flight = useRef(false);

  async function confirm() {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError('');
    try {
      const next = await patchAdminBadge(badge.id, { version: badge.version ?? 0, isActive: on });
      client.setQueryData(badgeKeys.detail(next.id), next);
      await client.invalidateQueries({ queryKey: badgeKeys.list });
      onDone(next);
    } catch (e) {
      setError(`${badgeErrorMessage(e)} Danh sách đang được tải lại; đóng hộp thoại để xem trạng thái hiện tại.`);
      void client.invalidateQueries({ queryKey: ['adminBadges'] });
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }

  return (
    <ConfirmModal title={on ? 'Bật huy hiệu?' : 'Tắt huy hiệu?'} tone={on ? 'primary' : 'warning'} confirmVariant="primary"
      confirmLabel={on ? 'Bật huy hiệu' : 'Tắt huy hiệu'} busy={busy} confirmDisabled={!!error} onClose={onClose} onConfirm={() => void confirm()}>
      <p><span className="font-semibold">{badge.name}</span><span className="ml-2 font-mono text-2xs text-text-light">{badge.code}</span></p>
      {on ? (
        <>
          <p className="rounded-md bg-surface-subtle p-3">
            {estimate.isPending ? 'Đang đếm số tài khoản sẽ được cấp bù…'
              : estimate.data ? <>Tại thời điểm kiểm tra ({formatVnDateTime(estimate.data.calculatedAt)}), có <strong className="font-semibold tabular-nums">{formatCount(estimate.data.eligibleCount)} tài khoản</strong> đủ điều kiện và chưa nhận.</>
              : 'Chưa có ước tính.'}
          </p>
          <p className="text-text-muted">Huy hiệu được cấp khi từng tài khoản đồng bộ, nên số thực tế có thể thay đổi. Người học chưa đạt thấy huy hiệu này trên kệ từ lần tải kế tiếp.</p>
        </>
      ) : (
        <p>
          Ngừng cấp trong các lần đồng bộ tiếp theo. Người đã đạt vẫn giữ huy hiệu
          {badge.earnerCount ? <> (<span className="tabular-nums">{formatCount(badge.earnerCount)}</span> người)</> : ''}; người chưa đạt không còn thấy nó trên màn Thành tựu.
        </p>
      )}
      {error && <p role="alert" className="rounded-md bg-danger-light p-2 text-danger-dark">{error}</p>}
    </ConfirmModal>
  );
}
