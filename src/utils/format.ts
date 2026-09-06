/** Full-precision INR, e.g. ₹28,000.00 */
export function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val);
}

/** ₹ with Indian short suffixes: K = thousand, L = lakh (1,00,000), Cr = crore. */
export function formatShort(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  const trim = (n: number) => n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0).replace(/\.?0+$/, '');
  if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)}L`;
  if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)}K`;
  return `${sign}₹${Math.round(abs)}`;
}
