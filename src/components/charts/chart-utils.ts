/** Helpers for the hand-written SVG charts (design.md §10: no chart library). */

export interface Point {
  x: number;
  y: number;
}

/**
 * Compact number for axis ticks: 14820 -> 14.8k, 1280000 -> 1.28M.
 */
export function formatChartNumber(val: number): string {
  if (Math.abs(val) >= 1_000_000) {
    return (val / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (Math.abs(val) >= 1_000) {
    return (val / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return val.toLocaleString('vi-VN');
}

/**
 * Straight segments between data points. Daily counts are discrete; a smoothed curve would draw values
 * between days that never happened and overshoot below zero.
 */
export function linePath(points: Point[]): string {
  return points.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}

/** The line closed down to the baseline, for a flat area fill. */
export function areaPath(points: Point[], baselineY: number): string {
  if (!points.length) return '';
  const last = points[points.length - 1];
  return `${linePath(points)} L ${last.x.toFixed(2)} ${baselineY} L ${points[0].x.toFixed(2)} ${baselineY} Z`;
}
