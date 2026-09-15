import React from 'react';
import { LiveOpsProjection } from '../../../domains/dashboard/types';
import { ShoppingBag, ShieldCheck, Flame, ArrowRight, Coins, Scale } from 'lucide-react';

interface LiveOpsEconomyWidgetProps {
  liveops: LiveOpsProjection;
  onNavigate?: (navId: string) => void;
}

export const LiveOpsEconomyWidget: React.FC<LiveOpsEconomyWidgetProps> = ({
  liveops,
  onNavigate,
}) => {
  const { coins, streak, guardrails } = liveops;

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-card flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-reward-light text-[#9A7000] flex items-center justify-center select-none">
              <ShoppingBag size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">LiveOps Console & Sức Khỏe Kinh Tế Coins</h3>
              <p className="text-xs text-text-muted">
                Cân đối dòng tiền tệ Coins (Faucet/Sink), Chuỗi Streak và Hàng rào An toàn
              </p>
            </div>
          </div>

          {/* Guardrail status indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold select-none ${
              guardrails.violations > 0
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            <ShieldCheck size={13} />
            <span>Guardrails: {guardrails.violations} Vi phạm</span>
          </div>
        </div>

        {/* Currency Faucet vs Sink Grid: Responsive 1-col on mobile, 2-col on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3.5">
          {/* Card 1: Coins Cashflow (Faucet vs Sink) */}
          <div className="p-3.5 rounded-lg bg-surface-subtle border border-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-text select-none">
                  <span className="w-5 h-5 rounded-full bg-reward/20 text-[#9A7000] flex items-center justify-center">
                    <Coins size={12} />
                  </span>
                  <span>Dòng Tiền Coins (Hôm nay)</span>
                </div>
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 select-text">
                  F/S: {coins.faucetSinkRatio}x
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted select-none">Phát hành (Faucet - Nhiệm vụ / Streak):</span>
                  <span className="font-mono font-semibold text-emerald-700 select-text">
                    +{(coins.faucet / 1000).toFixed(0)}k Coins
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted select-none">Tiêu thụ Shop (Sink - Khung / Freeze):</span>
                  <span className="font-mono font-semibold text-amber-700 select-text">
                    -{(coins.sink / 1000).toFixed(0)}k Coins
                  </span>
                </div>

                {/* Faucet/Sink ratio bar */}
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden flex mt-2.5 select-none">
                  <div
                    className="bg-emerald-500 h-full"
                    style={{ width: `${(coins.faucet / (coins.faucet + coins.sink)) * 100}%` }}
                    title={`Phát hành: ${((coins.faucet / (coins.faucet + coins.sink)) * 100).toFixed(1)}%`}
                  />
                  <div
                    className="bg-amber-500 h-full"
                    style={{ width: `${(coins.sink / (coins.faucet + coins.sink)) * 100}%` }}
                    title={`Tiêu thụ: ${((coins.sink / (coins.faucet + coins.sink)) * 100).toFixed(1)}%`}
                  />
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-border/60 text-[11px] text-text-muted flex items-center justify-between">
              <span>Cân đối dòng tiền</span>
              <span className="font-medium text-text">Ngưỡng chuẩn 1.2x – 1.5x</span>
            </div>
          </div>

          {/* Card 2: Net Circulation & Inflation Control */}
          <div className="p-3.5 rounded-lg bg-surface-subtle border border-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-text select-none">
                  <span className="w-5 h-5 rounded-full bg-info/20 text-info flex items-center justify-center">
                    <Scale size={12} />
                  </span>
                  <span>Lưu Thông Ròng & Cân Bằng</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 select-text">
                  +{(coins.netCirculation / 1000).toFixed(0)}k Coins ròng
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted select-none">Tỷ lệ hấp thụ chi tiêu (Absorption):</span>
                  <span className="font-mono font-semibold text-text select-text">
                    {coins.absorptionRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted select-none">Kiểm soát lạm phát kinh tế ảo:</span>
                  <span className="font-mono font-semibold text-emerald-600 select-text">
                    &lt; 2.5% / tháng (Lành mạnh)
                  </span>
                </div>

                {/* Absorption rate progress bar */}
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden flex mt-2.5 select-none">
                  <div
                    className="bg-primary h-full"
                    style={{ width: `${Math.min(coins.absorptionRate, 100)}%` }}
                    title={`Hấp thụ qua Shop: ${coins.absorptionRate}%`}
                  />
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-border/60 text-[11px] text-text-muted flex items-center justify-between">
              <span>Hấp thụ qua Shop / Freeze</span>
              <span className="font-medium text-text">{coins.absorptionRate}% phát hành</span>
            </div>
          </div>
        </div>

        {/* Streak Monitor & Support Tools */}
        <div className="p-3 rounded-lg bg-snapy-light/60 border border-snapy/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-snapy-light border border-snapy/30 text-snapy flex items-center justify-center shrink-0 select-none">
              <Flame size={16} />
            </div>
            <div className="text-xs">
              <div className="font-bold text-text flex items-center gap-2">
                <span className="select-text">Streak TB: {streak.avgDays} ngày</span>
                <span className="text-xs text-text-muted font-normal select-text">
                  ({streak.over7Days.toLocaleString('vi-VN')} người học &gt; 7 ngày)
                </span>
              </div>
              <div className="text-xs text-text-muted mt-0.5 select-text">
                {streak.recoveryPending > 0
                  ? `Có ${streak.recoveryPending} yêu cầu khôi phục chuỗi do lỗi kỹ thuật cần phê duyệt`
                  : 'Không có yêu cầu khôi phục streak nào đang chờ'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate?.('learners')}
            aria-label="Mở Streak Support Tool"
            className="px-3 py-1.5 rounded-md bg-surface text-text font-bold text-xs border border-border hover:bg-surface-subtle transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            Mở Streak Tool
          </button>
        </div>
      </div>

      {/* Footer Deep Link */}
      <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-xs text-text-muted">
        <span className="select-none">Giới hạn trần thưởng: 1,000 Coins mỗi nhiệm vụ | Kiểm soát lạm phát tự động</span>
        <button
          type="button"
          onClick={() => onNavigate?.('shop')}
          aria-label="Mở trang Quản lý Cửa hàng & Nhiệm vụ"
          className="text-xs font-semibold text-[#9A7000] hover:underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none rounded px-1"
        >
          <span>Quản lý Cửa hàng & Nhiệm vụ</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};

