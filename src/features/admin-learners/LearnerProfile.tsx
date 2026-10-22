import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, Award, BookOpen, Camera, KeyRound, ListChecks, Lock, LockOpen, ShoppingBag, Target, UserRound } from 'lucide-react';
import { Badge, Button, ConfirmModal, Mini, MiniStrip, Panel, SampleDataNotice, StatCell, SummaryStrip, TextLink } from '../../components/ui';
import { auditUsesFixtures } from '../../domains/admin-audit/config';
import { historyPath } from '../../domains/admin-audit/mappers';
import { learnersUseFixtures } from '../../domains/admin-learners/api';
import { FIXTURE_NOW } from '../../domains/admin-learners/fixtures';
import { banReasonError, formatAgo, formatDate, STATUS_META } from '../../domains/admin-learners/mappers';
import { usePasswordReset, useLearner, useSetBan } from '../../domains/admin-learners/queries';
import type { AdminLearnerDetail, TimelineKind } from '../../domains/admin-learners/types';
import { formatShopItemTypeLabel } from '../../domains/shop/mappers';
import { CARD_STATES } from '../../domains/admin-analytics/mappers';
import { scanErrorLabel } from '../../domains/scan/labels';
import { navigate } from '../../lib/router';
import { cn } from '../../lib/utils';
import { LearnerAvatar } from './LearnerAvatar';
import { useToast } from '../../components/ui/Toast';

const fmt = (n: number) => n.toLocaleString('vi-VN');
/** Event type is read from the glyph; colour stays neutral (design.md §3.2). */
const TIMELINE_ICON: Record<TimelineKind, React.ReactNode> = {
  STUDY: <BookOpen size={13} />, QUIZ: <ListChecks size={13} />, SCAN: <Camera size={13} />, MISSION: <Target size={13} />,
  PURCHASE: <ShoppingBag size={13} />, BADGE: <Award size={13} />, ACCOUNT: <UserRound size={13} />,
};
/** FSRS-derived learning states, coloured from the same scale as Phân tích › Trạng thái thẻ (gray → green with progress). */
const colorOf = (key: (typeof CARD_STATES)[number]['key']) => CARD_STATES.find((s) => s.key === key)!.color;
const STATES = [
  { key: 'newCount', label: 'Mới', color: colorOf('new') },
  { key: 'learning', label: 'Đang học', color: colorOf('learning') },
  { key: 'reviewing', label: 'Đang ôn', color: colorOf('review') },
  { key: 'mastered', label: 'Thành thạo', color: colorOf('mastered') },
] as const;

type Dialog = 'ban' | 'unban' | 'reset' | null;

export function LearnerProfile({ id }: { id: number }) {
  const learner = useLearner(id);
  const [dialog, setDialog] = useState<Dialog>(null);
  const { show: flash, node: toastNode } = useToast();
  const now = learnersUseFixtures ? FIXTURE_NOW : new Date();
  const back = <Button icon={<ArrowLeft />} label="Quay lại danh sách" onClick={() => navigate('/learners')} />;

  if (!learner.data) {
    return learner.isError ? (
      <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle size={28} className="text-danger" />
        <p className="text-body font-semibold">{(learner.error as { statusCode?: number })?.statusCode === 404 ? 'Không tìm thấy người học này.' : 'Không tải được hồ sơ người học.'}</p>
        <div className="flex gap-2">{back}<Button variant="primary" onClick={() => void learner.refetch()}>Thử lại</Button></div>
      </div>
    ) : (
      <div role="status" aria-label="Đang tải hồ sơ" className="space-y-4">
        <div className="h-20 animate-pulse rounded-lg bg-surface-subtle" />
        <div className="h-16 animate-pulse rounded-lg bg-surface-subtle" />
        <div className="h-64 animate-pulse rounded-lg bg-surface-subtle" />
      </div>
    );
  }

  const l: AdminLearnerDetail = learner.data;
  const meta = STATUS_META[l.status];
  const p = l.progress;
  const peak = Math.max(1, ...l.activity30d);

  return (
    <div className="space-y-4 pb-10">
      {toastNode}

      {/* Who, account state, and the two support actions (the dangerous one set apart). */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {back}
          <LearnerAvatar name={l.displayName} url={l.avatarUrl} size={44} />
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">{l.displayName}{l.status !== 'ACTIVE' && <Badge tone={meta.tone}>{meta.label}</Badge>}</h1>
            <p className="flex flex-wrap gap-x-4 text-xs text-text-muted">
              <span>{l.email}</span>
              <span className="tabular-nums">ID {l.id}</span>
              <span>Tham gia {formatDate(l.createdAt)}</span>
              <span>Học gần nhất: {formatAgo(l.lastStudiedAt, now).toLowerCase()}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={<KeyRound />} disabled={l.status === 'PENDING'} title={l.status === 'PENDING' ? 'Tài khoản chưa kích hoạt email' : undefined} onClick={() => setDialog('reset')}>
            Gửi link đặt lại mật khẩu
          </Button>
          {l.status === 'BANNED'
            ? <Button icon={<LockOpen />} onClick={() => setDialog('unban')}>Mở khóa</Button>
            : <Button variant="danger-outline" icon={<Lock />} onClick={() => setDialog('ban')}>Khóa tài khoản</Button>}
        </div>
      </header>

      {learnersUseFixtures && <SampleDataNotice>Hồ sơ chờ <code className="font-mono">GET /api/admin/users/{'{id}'}</code>; số liệu sinh từ danh mục thật (huy hiệu, vật phẩm, nhiệm vụ, lỗi scan).</SampleDataNotice>}

      {l.ban && (
        <div role="alert" className="flex flex-col gap-2 rounded-lg border border-danger/30 bg-danger-light p-3 text-body text-danger-dark sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2"><Lock size={16} className="mt-0.5 shrink-0" /><span>Đã khóa {formatDate(l.ban.at)} bởi {l.ban.by}. Lý do: <strong className="font-semibold">{l.ban.reason}</strong> Người học không đăng nhập được; dữ liệu học giữ nguyên.</span></span>
          <Button size="sm" icon={<LockOpen />} onClick={() => setDialog('unban')}>Mở khóa</Button>
        </div>
      )}

      <SummaryStrip label="Tóm tắt học tập">
        <StatCell value={fmt(l.wordsSaved)} label="Từ đã lưu" />
        <StatCell value={fmt(p.mastered)} label="Thành thạo" hint="Thẻ đang ôn với độ ổn định từ 21 ngày" />
        <StatCell value={fmt(p.dueToday)} label="Đến hạn hôm nay" />
        <StatCell value={l.streakDays} label={`Streak · kỷ lục ${l.longestStreakDays}`} />
        <StatCell value={p.quizAccuracy === null ? '—' : `${p.quizAccuracy}%`} label={`Độ chính xác · ${p.quizzesCompleted} quiz`} />
        <StatCell value={fmt(l.exp)} label="XP" />
        <StatCell value={fmt(l.coin)} label="Coin" />
      </SummaryStrip>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <Panel title="Học tập" meta="chỉ xem: admin không sửa tiến độ hay lịch ôn của người học">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-subtle" role="img" aria-label="Phân bố trạng thái thẻ">
              {STATES.map((s) => <div key={s.key} style={{ width: `${(p[s.key] / Math.max(1, l.wordsSaved)) * 100}%`, backgroundColor: s.color }} />)}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {STATES.map((s) => <span key={s.key} className="inline-flex items-center gap-1.5 text-text-muted"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />{s.label} <strong className="font-medium tabular-nums text-text">{fmt(p[s.key])}</strong></span>)}
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-xs text-text-muted"><span>Lượt học mỗi ngày, 30 ngày</span><span>{l.activity30d.filter(Boolean).length}/30 ngày có học</span></div>
              <div className="flex h-16 items-end gap-[3px]" role="img" aria-label="Biểu đồ hoạt động 30 ngày">
                {l.activity30d.map((n, i) => <div key={i} title={`${n} lượt`} className={cn('flex-1 rounded-sm', n ? 'bg-primary' : 'bg-surface-subtle')} style={{ height: `${n ? Math.max(8, (n / peak) * 100) : 6}%` }} />)}
              </div>
              <div className="mt-1 flex justify-between text-2xs text-text-light"><span>30 ngày trước</span><span>Hôm nay</span></div>
            </div>
          </Panel>

          <Panel title="Hoạt động gần đây">
            {l.timeline.length ? (
              <ol className="space-y-2">
                {l.timeline.map((e, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-text-muted">{TIMELINE_ICON[e.kind]}</span>
                    <span className="min-w-0 flex-1 pt-0.5 text-text">{e.text}</span>
                    <span className="shrink-0 pt-0.5 tabular-nums text-text-muted">{formatAgo(e.at, now)}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-xs text-text-muted">Chưa có hoạt động.</p>}
          </Panel>

          <Panel title="Scan" meta={`hôm nay ${l.scans.today}/${l.scans.dailyLimit} lượt`}>
            <p className="text-xs text-text-muted">30 ngày: <span className="font-medium tabular-nums text-text">{l.scans.last30d}</span> lượt, <span className={cn('font-medium tabular-nums', l.scans.failed30d ? 'text-danger-dark' : 'text-text')}>{l.scans.failed30d}</span> lỗi.</p>
            {l.scans.recent.length > 0 && (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border text-text-muted"><tr><th className="py-1.5 font-medium">Thời điểm</th><th className="py-1.5 font-medium">Kết quả</th><th className="py-1.5 text-right font-medium">Từ đã lưu</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {l.scans.recent.map((s, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-3 text-text-muted">{formatAgo(s.at, now)}</td>
                      <td className="py-1.5 pr-3">{s.status === 'FAILED' ? <Badge tone="danger" title={s.errorCode ?? undefined}>{s.errorCode ? scanErrorLabel(s.errorCode) : 'Lỗi'}</Badge> : <span className="font-mono">{s.labels.join(', ')}</span>}</td>
                      <td className="py-1.5 text-right tabular-nums">{s.savedWords}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel title="Nhiệm vụ 7 ngày">
            <MiniStrip cols="grid-cols-3">
              <Mini value={l.missions7d.assigned} label="Đã cấp" />
              <Mini value={l.missions7d.completed} label="Hoàn thành" />
              <Mini value={l.missions7d.claimed} label="Nhận thưởng" />
            </MiniStrip>
            {l.missions7d.completed > l.missions7d.claimed && <p className="text-xs text-warning-dark">{l.missions7d.completed - l.missions7d.claimed} nhiệm vụ đã hoàn thành nhưng chưa nhận thưởng.</p>}
          </Panel>

          <Panel title="Huy hiệu" meta={`${l.badges.length}/12`}>
            {l.badges.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {l.badges.map((b) => <li key={b.code}><Badge tone="reward" title={`Đạt ${formatDate(b.earnedAt)}`}>{b.name}</Badge></li>)}
              </ul>
            ) : <p className="text-xs text-text-muted">Chưa đạt huy hiệu nào.</p>}
          </Panel>

          <Panel title="Kinh tế" meta={`${fmt(l.coin)} Coin hiện có`}>
            {l.wallet.recent.length > 0 ? (
              <ul className="divide-y divide-border text-xs">
                {l.wallet.recent.map((t, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="min-w-0 truncate">{t.note}</span>
                    <span className="flex shrink-0 items-center gap-3"><span className="text-text-muted">{formatAgo(t.at, now)}</span><span className={cn('w-12 text-right font-medium tabular-nums', t.amount > 0 ? 'text-primary-dark' : 'text-text')}>{t.amount > 0 ? '+' : ''}{t.amount}</span></span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-text-muted">Chưa có giao dịch Coin.</p>}
            <div className="border-t border-border pt-2.5">
              <p className="mb-1.5 text-xs font-medium text-text-muted">Vật phẩm</p>
              {l.items.length ? (
                <ul className="space-y-1.5 text-xs">
                  {l.items.map((it) => (
                    <li key={it.code} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-text">{it.name}{it.quantity > 1 && ` ×${it.quantity}`}</span>
                      <span className="text-text-muted">{formatShopItemTypeLabel(it.type)}</span>
                      {it.equipped && <Badge tone="success">Đang dùng</Badge>}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-text-muted">Chưa có vật phẩm.</p>}
            </div>
          </Panel>

          <Panel title="Tài khoản">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
              <dt className="text-text-muted">Email</dt><dd className="truncate">{l.email}</dd>
              <dt className="text-text-muted">Trạng thái</dt><dd>{meta.label}</dd>
              <dt className="text-text-muted">Ngôn ngữ</dt><dd>{l.nativeLanguage ?? '—'} → {l.learningLanguage ?? '—'}</dd>
              <dt className="text-text-muted">Tham gia</dt><dd className="tabular-nums">{formatDate(l.createdAt)}</dd>
              <dt className="text-text-muted">ID</dt><dd className="tabular-nums">{l.id}</dd>
            </dl>
            <p className="border-t border-border pt-2 text-xs text-text-muted">
              Khóa, mở khóa và đặt lại mật khẩu chưa ghi vào nhật ký hoạt động: chờ API admin người học.
              {auditUsesFixtures && <> <TextLink to={historyPath({ type: 'LEARNER', id: String(l.id) })}>Xem nhật ký mẫu</TextLink></>}
            </p>
          </Panel>
        </aside>
      </div>

      {dialog === 'ban' && <BanDialog learner={l} onClose={() => setDialog(null)} onDone={() => { setDialog(null); flash('Đã khóa tài khoản.'); }} />}
      {dialog === 'unban' && <UnbanDialog learner={l} onClose={() => setDialog(null)} onDone={() => { setDialog(null); flash('Đã mở khóa tài khoản.'); }} />}
      {dialog === 'reset' && <ResetDialog learner={l} onClose={() => setDialog(null)} onDone={() => { setDialog(null); flash(learnersUseFixtures ? 'Đã ghi nhận gửi link (dữ liệu mẫu, không gửi email thật).' : 'Đã gửi link đặt lại mật khẩu.'); }} />}
    </div>
  );
}

interface DialogProps { learner: AdminLearnerDetail; onClose: () => void; onDone: () => void }

function BanDialog({ learner, onClose, onDone }: DialogProps) {
  const ban = useSetBan(learner.id);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const error = banReasonError(reason);
  return (
    <ConfirmModal
      title={`Khóa tài khoản ${learner.displayName}?`}
      tone="danger"
      confirmLabel="Khóa tài khoản"
      busy={ban.isPending}
      confirmDisabled={Boolean(error)}
      onClose={onClose}
      onConfirm={() => { setTouched(true); if (!error) ban.mutate({ banned: true, reason: reason.trim() }, { onSuccess: onDone }); }}
      description={learner.email}
    >
      <ul className="list-disc space-y-1 pl-4 text-text-muted">
        <li>Người học không đăng nhập được; các phiên đang mở bị thu hồi.</li>
        <li>Từ đã lưu, tiến độ, Coin và vật phẩm giữ nguyên. Mở khóa được bất cứ lúc nào.</li>
      </ul>
      <label className="block space-y-1.5 font-semibold">
        <span>Lý do <span className="text-danger-dark">*</span></span>
        <textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} onBlur={() => setTouched(true)}
          aria-invalid={touched && error ? true : undefined}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-body font-normal focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="VD: Tạo nhiều tài khoản để nhận thưởng nhiệm vụ." />
        <span className={cn('block font-normal', touched && error ? 'text-danger-dark' : 'text-text-muted')}>{touched && error ? error : 'Ghi vào nhật ký thao tác và hiện trên hồ sơ.'}</span>
      </label>
      {ban.isError && <p role="alert" className="text-danger-dark">Khóa thất bại: {ban.error.message}</p>}
    </ConfirmModal>
  );
}

function UnbanDialog({ learner, onClose, onDone }: DialogProps) {
  const unban = useSetBan(learner.id);
  const [note, setNote] = useState('');
  return (
    <ConfirmModal title={`Mở khóa ${learner.displayName}?`} tone="info" confirmLabel="Mở khóa" busy={unban.isPending} onClose={onClose}
      onConfirm={() => unban.mutate({ banned: false, reason: note.trim() }, { onSuccess: onDone })} description={learner.email}>
      {learner.ban && <p className="text-text-muted">Lý do khóa trước đó: {learner.ban.reason}</p>}
      <label className="block space-y-1.5 font-semibold">
        <span>Ghi chú (không bắt buộc)</span>
        <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-body font-normal focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </label>
      {unban.isError && <p role="alert" className="text-danger-dark">Mở khóa thất bại: {unban.error.message}</p>}
    </ConfirmModal>
  );
}

function ResetDialog({ learner, onClose, onDone }: DialogProps) {
  const reset = usePasswordReset(learner.id);
  return (
    <ConfirmModal title="Gửi link đặt lại mật khẩu?" tone="info" confirmLabel="Gửi link" busy={reset.isPending} onClose={onClose}
      onConfirm={() => reset.mutate(undefined, { onSuccess: onDone })} description={`Tới ${learner.email}`}>
      <p className="text-text-muted">Người học tự đặt mật khẩu mới qua link, theo luồng quên mật khẩu của ứng dụng; mọi phiên cũ bị thu hồi sau khi đổi. Admin không xem hay đặt mật khẩu thay người học.</p>
      {reset.isError && <p role="alert" className="text-danger-dark">Gửi thất bại: {reset.error.message}</p>}
    </ConfirmModal>
  );
}
