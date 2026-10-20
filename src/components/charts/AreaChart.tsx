import React from 'react';
import { formatChartNumber } from './chart-utils';
import { LineChart } from './LineChart';

export interface AreaChartDataPoint {
  label: string;
  value: number;
  /** Extra tooltip line, e.g. "10/44 người học". */
  subValue?: string;
}

export interface AreaChartProps {
  data: AreaChartDataPoint[];
  /** Series name in the tooltip. */
  name?: string;
  height?: number;
  color?: string;
  yAxisFormatter?: (val: number) => string;
  className?: string;
}

/** One filled series: the LineChart with a flat fill under the line. */
export const AreaChart: React.FC<AreaChartProps> = ({ data, name = 'Giá trị', height = 160, color = '#58CC02', yAxisFormatter = formatChartNumber, className }) => (
  <LineChart
    labels={data.map((d) => d.label)}
    series={[{ name, color, data: data.map((d) => d.value), fill: true }]}
    height={height}
    showLegend={false}
    yFormat={yAxisFormatter}
    detail={(i) => data[i]?.subValue}
    className={className}
  />
);
