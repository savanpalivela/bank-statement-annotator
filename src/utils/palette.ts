// Shared chart palette + helpers, used by the on-screen dashboard and the PDF export.

/** Categorical palette for the stacked "share" bar (validated for the dark surface, fixed order). */
export const SLICE_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
export const OTHER_COLOR = '#64748b';

/** Single-hue sequential ramps (dark → light) for the ranked bars: darkest = largest. */
export const INCOME_BAR_RAMP = ['#065f46', '#059669', '#10b981', '#34d399', '#6ee7b7'];
export const EXPENSE_BAR_RAMP = ['#9f1239', '#f43f5e', '#fb7185', '#fda4af', '#ffe4e6'];

export interface CatRow {
  name: string;
  value: number;
}

export const hexToRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const rgbToHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');

/** `t` in [0,1] across the ramp stops (0 = first / darkest, 1 = last / lightest). */
export function lerpRamp(stops: string[], t: number): string {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  const pos = clamped * (stops.length - 1);
  const i = Math.floor(pos);
  if (i >= stops.length - 1) return stops[stops.length - 1];
  const f = pos - i;
  const a = hexToRgb(stops[i]);
  const b = hexToRgb(stops[i + 1]);
  return rgbToHex(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
}

/** Collapse everything past `max` categories into a single "Other (N)" row. */
export function bucketTop(rows: CatRow[], max: number): CatRow[] {
  if (rows.length <= max) return rows;
  const head = rows.slice(0, max - 1);
  const rest = rows.slice(max - 1);
  const otherValue = rest.reduce((s, r) => s + r.value, 0);
  return [...head, { name: `Other (${rest.length})`, value: Math.round(otherValue * 100) / 100 }];
}

export const sliceColor = (name: string, index: number) =>
  name.startsWith('Other') ? OTHER_COLOR : SLICE_COLORS[index % SLICE_COLORS.length];
