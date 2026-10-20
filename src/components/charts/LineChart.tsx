import React, { useRef, useState } from 'react';
import { areaPath, formatChartNumber, linePath, type Point } from './chart-utils';
import { ChartTooltip } from './ChartTooltip';

export interface LineChartSeries {
  name: string;
  color: string;
  data: number[];
  /** Flat fill under the line (single-series charts). */
  fill?: boolean;
}

export interface LineChartProps {
  labels: string[];
  series: LineChartSeries[];
  height?: number;
  showLegend?: boolean;
  className?: string;
  /** Axis ticks (compact: 1,4k). */
  yFormat?: (val: number) => string;
  /** Tooltip values (exact: 1.372). */
  valueFormat?: (val: number) => string;
  /** Extra tooltip line for the hovered index, e.g. "10/44 người học". */
  detail?: (index: number) => string | undefined;
  /** Points worth calling out on the chart itself, e.g. the biggest drop. */
  marks?: { index: number; note: string }[];
}

const X_LABEL_ROW = 18;
const LEGEND_ROW = 20;

/**
 * Line chart drawn in a 100×100 SVG stretched to the box; strokes keep their width (non-scaling-stroke) and every
 * label is HTML, so nothing distorts at any width. Straight segments, no point markers until hover.
 */
const exact = (v: number) => v.toLocaleString('vi-VN');

export const LineChart: React.FC<LineChartProps> = ({ labels, series, height = 160, showLegend = true, className = '', yFormat = formatChartNumber, valueFormat = exact, detail, marks = [] }) => {
  const plotRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  if (!labels.length || !series.length) {
    return <div className={`flex items-center justify-center text-xs text-text-muted ${className}`} style={{ height }}>Không có dữ liệu</div>;
  }

  const n = labels.length;
  const values = series.flatMap((s) => s.data);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 50);
  const y = (v: number) => 100 - ((v - min) / range) * 100;
  const ticks = [max, min + range / 2, min];
  const legend = showLegend && series.length > 1;
  const plotHeight = height - X_LABEL_ROW - (legend ? LEGEND_ROW : 0);
  const xLabels = [...new Set([0, Math.floor((n - 1) / 2), n - 1])];

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHovered(Math.round(ratio * (n - 1)));
  };

  return (
    <div className={`w-full select-none ${className}`} style={{ height }}>
      {legend && (
        <div className="flex h-5 items-start justify-end gap-3 text-xs text-text-muted">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 rounded" style={{ backgroundColor: s.color }} />{s.name}</span>
          ))}
        </div>
      )}
      <div className="ml-9 mr-1">
        <div ref={plotRef} className="relative" style={{ height: plotHeight }} onMouseMove={onMove} onMouseLeave={() => setHovered(null)}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            {ticks.map((t, i) => (
              <line key={i} x1={0} x2={100} y1={y(t)} y2={y(t)} stroke={i === ticks.length - 1 ? '#D1D5DB' : '#EEF0F2'} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}
            {marks.map((m) => (
              <line key={`m${m.index}`} x1={x(m.index)} x2={x(m.index)} y1={0} y2={100} stroke="#9CA3AF" strokeDasharray="3 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}
            {series.map((s) => {
              const pts: Point[] = s.data.map((v, i) => ({ x: x(i), y: y(v) }));
              return (
                <g key={s.name}>
                  {s.fill && <path d={areaPath(pts, y(min))} fill={s.color} fillOpacity={0.1} />}
                  <path d={linePath(pts)} fill="none" stroke={s.color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                </g>
              );
            })}
          </svg>

          {ticks.map((t, i) => (
            <span key={i} className="absolute right-full mr-2 -translate-y-1/2 text-2xs tabular-nums text-text-light" style={{ top: `${y(t)}%` }}>{yFormat(Math.round(t))}</span>
          ))}
          {xLabels.map((i) => (
            <span key={i} className="absolute top-full mt-1 text-2xs tabular-nums text-text-light" style={{ left: `${x(i)}%`, transform: i === 0 ? undefined : i === n - 1 ? 'translateX(-100%)' : 'translateX(-50%)' }}>{labels[i]}</span>
          ))}
          {marks.map((m) => (
            <span key={`n${m.index}`} className="absolute -top-1 ml-1 whitespace-nowrap rounded bg-surface/90 px-1 text-2xs text-text-muted" style={{ left: `${x(m.index)}%`, transform: x(m.index) > 75 ? 'translateX(calc(-100% - 8px))' : undefined }}>{m.note}</span>
          ))}

          {hovered !== null && (
            <>
              <div className="pointer-events-none absolute inset-y-0 w-px bg-border-strong" style={{ left: `${x(hovered)}%` }} />
              {series.map((s) => (
                <span key={s.name} className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-surface" style={{ left: `${x(hovered)}%`, top: `${y(s.data[hovered])}%`, borderColor: s.color }} />
              ))}
              <ChartTooltip title={labels[hovered]} left={x(hovered)} detail={detail?.(hovered)}
                rows={series.map((s) => ({ name: s.name, value: valueFormat(s.data[hovered]), color: s.color }))} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
