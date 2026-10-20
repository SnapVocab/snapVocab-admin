import React from 'react';

export interface ChartTooltipProps {
  /** X label of the hovered point, e.g. "19/10". */
  title: string;
  rows: { name: string; value: string; color: string }[];
  detail?: string;
  /** Horizontal position in % of the plot; the box flips inward near the edges. */
  left: number;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({ title, rows, detail, left }) => (
  <div
    className="pointer-events-none absolute top-0 z-30 min-w-[120px] whitespace-nowrap rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-elevated"
    style={{ left: `${left}%`, transform: left < 15 ? 'translateX(8px)' : left > 85 ? 'translateX(calc(-100% - 8px))' : 'translateX(-50%)' }}
  >
    <div className="mb-0.5 text-2xs text-text-muted">{title}</div>
    {rows.map((r) => (
      <div key={r.name} className="flex items-center gap-1.5">
        <span className="h-0.5 w-2.5 shrink-0 rounded" style={{ backgroundColor: r.color }} />
        {rows.length > 1 && <span className="text-text-muted">{r.name}</span>}
        <span className="ml-auto font-semibold tabular-nums text-text">{r.value}</span>
      </div>
    ))}
    {detail && <div className="mt-0.5 text-2xs text-text-muted">{detail}</div>}
  </div>
);
