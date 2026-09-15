import React from 'react';
import { OperationalActionItem } from '../../../domains/dashboard/types';
import {
  AlertTriangle,
  AlertOctagon,
  Clock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface ActionCenterWidgetProps {
  items: OperationalActionItem[];
  onNavigate?: (navId: string) => void;
}

export const ActionCenterWidget: React.FC<ActionCenterWidgetProps> = ({
  items,
  onNavigate,
}) => {
  // Empty state: All systems normal, no pending urgent actions
  if (!items || items.length === 0) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 sm:p-4 flex items-center justify-between text-xs transition-all">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div className="font-bold text-text text-xs sm:text-sm">
              Hệ Thống Ổn Định · Không Có Tác Vụ Khẩn Cấp
            </div>
            <div className="text-text-muted text-[11px] sm:text-xs">
              Mọi báo cáo sự cố, hàng đợi AI scan và duyệt nội dung đều trong ngưỡng an toàn
            </div>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
          SLA 100% OK
        </span>
      </div>
    );
  }

  const criticalCount = items.filter((i) => i.severity === 'critical').length;
  const warningCount = items.filter((i) => i.severity === 'warning').length;

  return (
    <section
      aria-labelledby="action-center-title"
      className="bg-surface border-2 border-danger/30 rounded-xl p-3 sm:p-4 shadow-card transition-all"
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-danger-light text-danger flex items-center justify-center shrink-0">
            <AlertOctagon size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="action-center-title"
                className="text-sm sm:text-base font-extrabold text-text tracking-tight uppercase"
              >
                Cần Xử Lý Ngay (Action Center)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-danger text-white text-[10px] font-mono font-bold">
                {items.length} tác vụ
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Ưu tiên xử lý theo mức độ nghiêm trọng (Severity) và thời hạn cam kết SLA
            </p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 select-none">
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-danger/10 text-danger border border-danger/30 text-[11px] font-bold">
              {criticalCount} Khẩn cấp (Critical)
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/30 text-[11px] font-bold">
              {warningCount} Cảnh báo (Warning)
            </span>
          )}
        </div>
      </div>

      {/* Action Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
        {items.map((item) => {
          const isCritical = item.severity === 'critical';
          const isWarning = item.severity === 'warning';

          const cardBorder = isCritical
            ? 'border-l-4 border-l-danger border-border bg-danger-light/30 hover:border-danger/60'
            : isWarning
            ? 'border-l-4 border-l-amber-500 border-border bg-amber-50/40 hover:border-amber-500/60'
            : 'border-l-4 border-l-primary border-border bg-surface hover:border-primary/60';

          const badgeStyle = isCritical
            ? 'bg-danger text-white'
            : isWarning
            ? 'bg-amber-600 text-white'
            : 'bg-primary text-white';

          const slaBadge =
            item.slaState === 'breached'
              ? 'bg-danger-light text-danger border border-danger/30'
              : item.slaState === 'at-risk'
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300';

          const slaLabel =
            item.slaState === 'breached'
              ? 'Quá hạn SLA'
              : item.slaState === 'at-risk'
              ? 'Sắp đến hạn SLA'
              : 'Trong hạn SLA';

          return (
            <div
              key={item.id}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all shadow-xs ${cardBorder}`}
            >
              <div>
                {/* Top badges */}
                <div className="flex items-center justify-between gap-1.5 mb-2 select-none">
                  <div className="flex items-center gap-1.5">
                    {item.priority && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${badgeStyle}`}>
                        {item.priority}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${slaBadge}`}>
                      {slaLabel}
                    </span>
                  </div>

                  {item.slaDeadlineAt && (
                    <span className="text-[11px] font-mono text-text-muted flex items-center gap-1">
                      <Clock size={11} />
                      {item.slaDeadlineAt}
                    </span>
                  )}
                </div>

                {/* Title & Count */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-text text-xs sm:text-sm select-text leading-snug">
                    {item.title}
                  </h3>
                  <span className="font-mono text-base sm:text-lg font-extrabold text-text shrink-0 select-text">
                    {item.count}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-text-muted mt-1 select-text line-clamp-2">
                  {item.description}
                </p>
              </div>

              {/* Action Button CTA */}
              <div className="mt-3 pt-2.5 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => onNavigate?.(item.targetNav)}
                  aria-label={`${item.actionLabel} cho ${item.title}`}
                  className="w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none bg-surface hover:bg-surface-subtle text-text border border-border shadow-xs hover:text-primary group"
                >
                  <span>{item.actionLabel}</span>
                  <ArrowRight
                    size={13}
                    className="group-hover:translate-x-0.5 transition-transform text-text-muted group-hover:text-primary"
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
