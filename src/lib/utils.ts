import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge must know the custom font sizes of tailwind.config.js (text-2xs, text-body, text-figure); otherwise
 * it reads them as text colours and drops them next to text-text / text-text-muted.
 */
const twMerge = extendTailwindMerge({ extend: { classGroups: { 'font-size': [{ text: ['2xs', 'body', 'figure'] }] } } });

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Case- and accent-insensitive search key, so "nguyen" finds "Nguyễn" and "dang" finds "Đặng". */
export function foldVi(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

/** Rows → CSV that Excel opens as UTF-8 (BOM, every cell quoted). */
export const toCsv = (rows: (string | number)[][]) =>
  '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');

/** Saves `text` as a file through a temporary link. */
export function downloadCsv(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  link.click();
  URL.revokeObjectURL(url);
}
