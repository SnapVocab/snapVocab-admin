import React from 'react';
import { AuditLogEntry } from '../../../domains/audit/types';
import {
  ShieldAlert,
  Flame,
  Coins,
  ShoppingBag,
  AlertOctagon,
  ArrowRight,
  ExternalLink,
  Clock,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface LiveOpsGuardrailsTabProps {
  logs: AuditLogEntry[];
  onSelectEntry: (entry: AuditLogEntry) => void;
  onNavigateToLearner?: (learnerId: string) => void;
  onNavigateToShop?: () => void;
}

export const LiveOpsGuardrailsTab: React.FC<LiveOpsGuardrailsTabProps> = ({
  logs,
  onSelectEntry,
  onNavigateToLearner,
  onNavigateToShop,
}) => {
  const liveopsLogs = logs.filter(
    (l) => l.domain === 'LIVEOPS_ECONOMY' || l.action === 'STREAK_RECOVERED' || l.action === 'CURRENCY_COMPENSATED'
  );

  const guardrailViolations = logs.filter(
    (l) => l.action === 'GUARDRAIL_TRIGGERED' || l.severity === 'CRITICAL'
  );

  return (
    <div className="space-y-3 select-none">
      {/* Top Banner Information */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-reward-light border border-reward/20 text-reward-hover flex items-center justify-center text-lg shadow-xs">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-text tracking-tight">
                Hàng Rào An Toàn LiveOps & Kiểm Soát Kinh Tế Ảo (§7.3)
              </h2>
              <span className="px-2 py-0.2 rounded-full bg-reward-light text-[#9A7000] text-[10px] font-bold border border-reward/20">
                Guardrails & Economy
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Theo dõi hoạt động kinh tế và các can thiệp vận hành kèm mã Ticket.
            </p>
          </div>
        </div>

        {/* Guardrail status pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span>Hàng Rào An Toàn: ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Guardrail Violation Alert Card if exists */}
      {guardrailViolations.length > 0 && (
        <div className="bg-danger-light/30 border border-danger/30 rounded-xl p-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-danger-light text-danger flex items-center justify-center shrink-0 border border-danger/20 mt-0.5">
              <AlertOctagon size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-danger flex items-center gap-2">
                <span>Phát hiện {guardrailViolations.length} nỗ lực vượt trần hoặc vi phạm an toàn kinh tế bị chặn!</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-danger text-white font-mono font-extrabold">
                  BLOCKED
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Xem chi tiết sự kiện và lý do kiểm toán trước khi xử lý.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectEntry(guardrailViolations[0])}
            className="px-2.5 py-1 rounded-lg bg-surface border border-danger/30 text-danger hover:bg-danger-light text-xs font-bold shrink-0 transition-colors shadow-xs"
          >
            Soi Cảnh Báo Gần Nhất
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-subtle/80 border-b border-border text-[11px] font-bold text-text-muted uppercase tracking-wider">
                <th className="p-3 w-40">Thời Gian & Ticket</th>
                <th className="p-3 w-40">Hành Động LiveOps</th>
                <th className="p-3 min-w-[200px]">Học Viên / Thực Thể Nhận</th>
                <th className="p-3 min-w-[200px]">Thông Số Can Thiệp</th>
                <th className="p-3 min-w-[240px]">Lý Do Kiểm Toán & Mã Ticket</th>
                <th className="p-3 w-36">Người Quyết Định</th>
                <th className="p-3 w-16 text-right">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {liveopsLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-text-muted">
                    <Clock size={28} className="mx-auto mb-2 opacity-30 text-text-muted" />
                    <p className="font-semibold text-sm">Không có dữ liệu can thiệp LiveOps phù hợp</p>
                  </td>
                </tr>
              ) : (
                liveopsLogs.map((entry) => {
                  const isGuardrail = entry.action === 'GUARDRAIL_TRIGGERED';
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => onSelectEntry(entry)}
                      className={`hover:bg-surface-subtle/50 transition-colors cursor-pointer group ${
                        isGuardrail ? 'bg-danger-light/10' : ''
                      }`}
                    >
                      {/* Timestamp & Ticket */}
                      <td className="p-3 align-top">
                        <div className="font-mono text-xs text-text font-bold">
                          {new Date(entry.timestamp).toLocaleDateString('vi-VN')}
                        </div>
                        <div className="text-[10px] text-text-muted font-mono">
                          {new Date(entry.timestamp).toLocaleTimeString('vi-VN')}
                        </div>
                        {entry.ticketId ? (
                          <div className="mt-1">
                            <span className="px-1.5 py-0.2 rounded bg-surface-subtle border border-border text-[10px] font-mono font-bold text-primary">
                              {entry.ticketId}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <span className="text-[9px] font-mono text-text-muted italic">
                              Hệ thống tự động
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="p-3 align-top">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isGuardrail
                              ? 'bg-danger-light text-danger border-danger/30 font-extrabold'
                              : 'bg-reward-light text-[#9A7000] border-reward/20'
                          }`}
                        >
                          {isGuardrail ? <AlertOctagon size={11} /> : <Coins size={11} />}
                          <span>{entry.actionLabel}</span>
                        </span>
                      </td>

                      {/* Target entity */}
                      <td className="p-3 align-top">
                        <div className="font-bold text-text text-xs flex items-center gap-1.5">
                          <span>{entry.targetEntity.title}</span>
                          {entry.targetEntity.type === 'LEARNER' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToLearner?.(entry.targetEntity.id);
                              }}
                              className="text-text-muted hover:text-primary p-0.5"
                              title="Mở hồ sơ Learner 360"
                            >
                              <ExternalLink size={11} />
                            </button>
                          )}
                          {entry.targetEntity.type === 'SHOP_ITEM' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToShop?.();
                              }}
                              className="text-text-muted hover:text-reward-hover p-0.5"
                              title="Mở Shop & Economy"
                            >
                              <ExternalLink size={11} />
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] text-text-muted mt-0.5 font-mono">
                          {entry.targetEntity.id}
                        </div>
                      </td>

                      {/* Diff */}
                      <td className="p-3 align-top">
                        {entry.diff ? (
                          <div className="bg-surface-subtle/70 p-1.5 rounded-lg border border-border/60 text-[11px] space-y-0.5">
                            {Object.keys(entry.diff.after || {}).map((key) => {
                              const bVal = (entry.diff?.before as any)?.[key];
                              const aVal = (entry.diff?.after as any)?.[key];
                              return (
                                <div key={key} className="flex items-center gap-1 truncate text-[10px]">
                                  <span className="font-mono text-text-muted">{key}:</span>
                                  {bVal !== undefined && (
                                    <>
                                      <span className="line-through text-text-muted">{String(bVal)}</span>
                                      <ArrowRight size={10} className="text-text-muted shrink-0" />
                                    </>
                                  )}
                                  <span
                                    className={`font-bold ${
                                      isGuardrail ? 'text-danger' : 'text-primary'
                                    }`}
                                  >
                                    {String(aVal)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[10px] text-text-muted italic">—</span>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="p-3 align-top">
                        <div className="bg-surface-subtle/50 p-2 rounded-lg border border-border/50 text-[11px] text-text leading-relaxed italic line-clamp-3">
                          "{entry.reason}"
                        </div>
                        {entry.metadata.guardrailRule && (
                          <div className="mt-1 text-[10px] font-mono text-danger font-bold">
                            Khóa chặn: {entry.metadata.guardrailRule}
                          </div>
                        )}
                      </td>

                      {/* Operator */}
                      <td className="p-3 align-top">
                        <div className="font-bold text-text text-[11px]">
                          {entry.operator.name}
                        </div>
                        <div className="text-[9px] font-mono text-text-muted uppercase">
                          {entry.operator.role}
                        </div>
                      </td>

                      {/* CTA */}
                      <td className="p-3 align-top text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEntry(entry);
                          }}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border bg-surface hover:bg-primary-light hover:text-primary transition-all text-text-muted"
                        >
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
