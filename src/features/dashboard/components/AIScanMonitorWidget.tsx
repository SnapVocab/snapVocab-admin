import React from 'react';
import { AIScanProjection } from '../../../domains/dashboard/types';
import { Camera, Clock, CheckCircle2, BarChart2, ArrowRight } from 'lucide-react';

interface AIScanMonitorWidgetProps {
  aiScan: AIScanProjection;
  onNavigate?: (navId: string) => void;
}

export const AIScanMonitorWidget: React.FC<AIScanMonitorWidgetProps> = ({
  aiScan,
  onNavigate,
}) => {
  const maxHourly = Math.max(...aiScan.hourlyPoints.map((p) => p.value), 1);

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-card flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-snapy-light text-snapy flex items-center justify-center select-none">
              <Camera size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">AI Scan Monitor & Chẩn Đoán Kỹ Thuật</h3>
              <p className="text-xs text-text-muted">
                Gemini Vision Object Detection & Active Feedback Loop
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold select-none">
            <CheckCircle2 size={12} className="text-emerald-600" />
            <span>{aiScan.confidenceRate}% Tin cậy cao</span>
          </div>
        </div>

        {/* 3 Technical Diagnostic Metrics */}
        <div className="grid grid-cols-3 gap-2.5 my-3.5">
          <div className="p-2.5 rounded-lg bg-surface-subtle border border-border">
            <div className="text-xs text-text-muted select-none">Tổng Scan Hôm nay</div>
            <div className="text-base font-bold font-mono text-text mt-0.5 select-text">
              {aiScan.todayScans.toLocaleString('vi-VN')}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-subtle border border-border">
            <div className="text-xs text-text-muted select-none">Độ trễ phản hồi TB</div>
            <div className="text-base font-bold font-mono text-text mt-0.5 flex items-center gap-1 select-text">
              <Clock size={13} className="text-text-muted select-none" />
              {aiScan.avgLatencyMs}ms
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-subtle border border-border">
            <div className="text-xs text-text-muted select-none">Tỷ lệ tự động đạt</div>
            <div className="text-base font-bold font-mono text-emerald-600 mt-0.5 select-text">
              {aiScan.confidenceRate}%
            </div>
          </div>
        </div>

        {/* Diagnostic Chart: Hourly Scan Throughput */}
        <div className="p-3 rounded-lg bg-surface-subtle/50 border border-border">
          <div className="flex items-center justify-between text-xs font-bold text-text-muted mb-2 select-none">
            <div className="flex items-center gap-1.5">
              <BarChart2 size={13} className="text-snapy" />
              <span>Lưu lượng Scan theo giờ (Throughput)</span>
            </div>
            <span className="text-[11px] font-mono text-text-muted">Đỉnh: {maxHourly} scan/h</span>
          </div>

          {/* Micro Bar Chart */}
          <div className="h-16 flex items-end gap-2 pt-2 border-b border-border/60">
            {aiScan.hourlyPoints.map((pt) => {
              const hPercent = Math.max((pt.value / maxHourly) * 100, 10);

              return (
                <div key={pt.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                  <div
                    className="w-full bg-snapy/40 group-hover:bg-snapy rounded-t transition-all"
                    style={{ height: `${hPercent}%` }}
                    title={`${pt.label}: ${pt.value} scan`}
                  />
                  <span className="text-[10px] font-mono text-text-muted group-hover:text-text select-none">
                    {pt.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer link to AI Studio */}
      <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-xs text-text-muted">
        <span>Active Learning Feedback Loop: Đang chạy</span>
        <button
          type="button"
          onClick={() => onNavigate?.('ai-queue')}
          aria-label="Xem chi tiết hàng đợi AI Queue"
          className="flex items-center gap-1 text-xs font-bold text-snapy hover:text-snapy-hover transition-colors focus-visible:ring-2 focus-visible:ring-snapy focus-visible:outline-none rounded px-1.5 py-0.5"
        >
          <span>Chi tiết AI Review Queue ({aiScan.pendingQueueCount})</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};

