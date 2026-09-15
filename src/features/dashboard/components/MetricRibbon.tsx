import React from 'react';
import { MetricRibbonCard } from '../../../domains/dashboard/types';
import { TrendingUp, ArrowUpRight } from 'lucide-react';

interface MetricRibbonProps {
  cards: MetricRibbonCard[];
  onNavigate?: (navId: string) => void;
}

export const MetricRibbon: React.FC<MetricRibbonProps> = ({ cards, onNavigate }) => {
  const getThemeStyles = (theme: MetricRibbonCard['statusTheme']) => {
    switch (theme) {
      case 'primary':
        return {
          badge: 'bg-primary-light text-primary border-primary/20',
          accent: 'border-l-primary',
          hover: 'hover:border-primary/50',
          ring: 'focus-visible:ring-primary',
        };
      case 'snapy':
        return {
          badge: 'bg-snapy-light text-snapy border-snapy/20',
          accent: 'border-l-snapy',
          hover: 'hover:border-snapy/50',
          ring: 'focus-visible:ring-snapy',
        };
      case 'reward':
        return {
          badge: 'bg-reward-light text-[#9A7000] border-reward/30',
          accent: 'border-l-reward',
          hover: 'hover:border-reward/50',
          ring: 'focus-visible:ring-amber-500',
        };
      case 'info':
        return {
          badge: 'bg-info-light text-info border-info/20',
          accent: 'border-l-info',
          hover: 'hover:border-info/50',
          ring: 'focus-visible:ring-info',
        };
      case 'danger':
        return {
          badge: 'bg-danger-light text-danger border-danger/20',
          accent: 'border-l-danger',
          hover: 'hover:border-danger/50',
          ring: 'focus-visible:ring-danger',
        };
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {cards.map((card) => {
        const theme = getThemeStyles(card.statusTheme);
        const hasLink = Boolean(card.deepLinkNav);

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => card.deepLinkNav && onNavigate?.(card.deepLinkNav)}
            disabled={!hasLink}
            aria-label={`${card.title}: ${card.value}${card.subValue ? ` (${card.subValue})` : ''}. ${card.changeText}. ${card.deepLinkTip || ''}`}
            className={`w-full text-left bg-surface border border-border border-l-[4px] ${theme.accent} rounded-xl p-3.5 shadow-card transition-all group ${theme.hover} hover:shadow-elevated focus-visible:ring-2 ${theme.ring} focus-visible:outline-none ${
              hasLink ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            {/* Header: Title & Deep Link Arrow */}
            <div className="flex items-center justify-between gap-1 mb-2 select-none">
              <span className="text-xs font-bold tracking-wider text-text-muted uppercase">
                {card.title}
              </span>
              {hasLink && (
                <ArrowUpRight
                  size={14}
                  className="text-text-muted opacity-60 group-hover:opacity-100 group-hover:text-primary transition-all"
                />
              )}
            </div>

            {/* Main Value & SubValue */}
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-2xl font-extrabold text-text font-mono tracking-tight select-text">
                {card.value}
              </div>
              {card.subValue && (
                <span className="text-xs font-semibold text-text-muted font-mono truncate select-text">
                  {card.subValue}
                </span>
              )}
            </div>

            {/* Footer: Trend badge & Sparkline */}
            <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 font-medium text-text-muted truncate select-text">
                <TrendingUp size={13} className="text-primary shrink-0 select-none" />
                <span className="truncate">{card.changeText}</span>
              </div>

              {/* Micro Sparkline Preview */}
              <div
                className="w-14 h-4 shrink-0 flex items-end gap-[2px] select-none"
                role="img"
                aria-label={`Biểu đồ xu hướng: ${card.sparkline.join(' → ')}`}
              >
                {card.sparkline.map((val, i) => {
                  const max = Math.max(...card.sparkline);
                  const min = Math.min(...card.sparkline);
                  const hPercent = Math.max(((val - min) / (max - min || 1)) * 100, 20);
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-neutral-300 group-hover:bg-primary/70 rounded-[1px] transition-colors"
                      style={{ height: `${hPercent}%` }}
                    />
                  );
                })}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

