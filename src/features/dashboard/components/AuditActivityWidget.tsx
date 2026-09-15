import React from 'react';
import {
  AuditEventProjection,
  InfraServiceHealth,
  InfraHealthSummary,
} from '../../../domains/dashboard/types';
import { History, Shield, CheckCircle2, AlertTriangle, AlertOctagon, ArrowRight } from 'lucide-react';

interface AuditActivityWidgetProps {
  auditTrail: AuditEventProjection[];
  infraServices: InfraServiceHealth[];
  infraHealthSummary?: InfraHealthSummary;
  r2Storage: { usedGb: number; quotaGb: number };
  onNavigate?: (navId: string) => void;
}

export const AuditActivityWidget: React.FC<AuditActivityWidgetProps> = ({
  auditTrail,
  infraServices,
  infraHealthSummary,
  r2Storage,
  onNavigate,
}) => {
  const getActionBadge = (type: AuditEventProjection['type']) => {
    switch (type) {
      case 'status_change':
        return 'bg-primary-light text-primary border-primary/20';
      case 'ai_correction':
        return 'bg-snapy-light text-snapy border-snapy/20';
      case 'import':
        return 'bg-info-light text-info border-info/20';
      case 'guardrail':
        return 'bg-reward-light text-[#9A7000] border-reward/30';
    }
  };

  const onlineCount = infraServices.filter((s) => s.status === 'online').length;
  const isHealthy = !infraHealthSummary || infraHealthSummary.overallStatus === 'healthy';
  const isDegraded = infraHealthSummary?.overallStatus === 'degraded';
  const isOutage = infraHealthSummary?.overallStatus === 'outage';

  const healthBadgeText = infraHealthSummary
    ? infraHealthSummary.detailText
    : `${onlineCount}/${infraServices.length} trực tuyến`;

  const healthBadgeStyle = isOutage
    ? 'bg-danger-light text-danger border-danger/30'
    : isDegraded
    ? 'bg-amber-100 text-amber-800 border-amber-300'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-card flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center select-none">
              <History size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">Nhật Ký Kiểm Toán & Trạng Thái Hạ Tầng</h3>
              <p className="text-xs text-text-muted">
                Audit Trail sự kiện vận hành thời gian thực & Kết nối dịch vụ (SS-17)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate?.('activity-log')}
            aria-label="Xem toàn bộ nhật ký kiểm toán"
            className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded px-1.5 py-0.5 select-none"
          >
            <span>Toàn bộ Log</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* 2-Column inner layout: Left = Audit Trail Stream, Right = Service Health */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-3.5">
          {/* Audit Events List */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-text-light uppercase tracking-wider mb-1 select-none">
              Sự kiện kiểm toán gần nhất
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {auditTrail.map((ev) => (
                <div
                  key={ev.id}
                  className="p-2.5 rounded-lg bg-surface-subtle/70 border border-border/80 hover:bg-surface-subtle transition-all text-xs"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-text truncate select-text">{ev.operator}</span>
                      <span className="text-text-light select-none">·</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold border select-none ${getActionBadge(
                          ev.type
                        )}`}
                      >
                        {ev.action}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-text-muted shrink-0 select-text">
                      {ev.timestamp}
                    </span>
                  </div>

                  <div className="text-xs text-text font-medium truncate select-text">
                    Đối tượng: <span className="font-bold text-primary">{ev.target}</span>
                  </div>
                  <div className="text-xs text-text-muted line-clamp-2 italic mt-0.5 select-text">
                    "{ev.reason}"
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Infrastructure Services Health Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-text-light uppercase tracking-wider mb-1">
              <span className="select-none">Hạ tầng & Dịch vụ (SS-17)</span>
              <span
                className={`font-mono font-bold text-xs px-2 py-0.5 rounded border select-text ${healthBadgeStyle}`}
              >
                {healthBadgeText}
              </span>
            </div>

            <div className="space-y-2">
              {infraServices.map((svc) => {
                const svcOnline = svc.status === 'online';
                const svcDegraded = svc.status === 'degraded';

                return (
                  <div
                    key={svc.name}
                    className="p-2 px-2.5 rounded-lg bg-surface-subtle/50 border border-border flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {svcOnline ? (
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0 select-none" />
                      ) : svcDegraded ? (
                        <AlertTriangle size={14} className="text-amber-500 shrink-0 select-none" />
                      ) : (
                        <AlertOctagon size={14} className="text-danger shrink-0 select-none" />
                      )}
                      <div>
                        <div className="font-medium text-text text-xs leading-tight select-text">
                          {svc.name}
                        </div>
                        <div className="text-[11px] text-text-muted select-text">{svc.detail}</div>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold select-text ${
                        svcOnline
                          ? 'text-emerald-600'
                          : svcDegraded
                          ? 'text-amber-600'
                          : 'text-danger'
                      }`}
                    >
                      {svc.latencyMs}ms
                    </span>
                  </div>
                );
              })}
            </div>

            {/* R2 Storage bar */}
            <div className="p-2.5 rounded-lg bg-surface-subtle/50 border border-border text-xs mt-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-muted font-medium select-none">
                  Cloudflare R2 Storage:
                </span>
                <span className="font-mono font-bold text-text select-text">
                  {r2Storage.usedGb} GB / {r2Storage.quotaGb} GB
                </span>
              </div>
              <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden select-none">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${(r2Storage.usedGb / r2Storage.quotaGb) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2.5 border-t border-border flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-1.5 select-none">
          <Shield size={13} className="text-primary" />
          <span>Mọi thay đổi trạng thái đều bắt buộc ghi nhận lý do kiểm toán</span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('settings')}
          aria-label="Mở trang Cấu hình hệ thống"
          className="text-xs font-semibold text-text hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded px-1"
        >
          Cấu hình hệ thống →
        </button>
      </div>
    </div>
  );
};

