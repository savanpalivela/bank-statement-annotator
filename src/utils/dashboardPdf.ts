import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SummaryData } from '../types';
import { formatCurrency, formatShort } from './format';
import {
  EXPENSE_BAR_RAMP,
  INCOME_BAR_RAMP,
  OTHER_COLOR,
  bucketTop,
  hexToRgb,
  lerpRamp,
  sliceColor,
} from './palette';

// jsPDF's standard fonts have no ₹ glyph — render it as "Rs ".
const money = (v: number) => formatCurrency(v).replace('₹', 'Rs ');
const short = (v: number) => formatShort(v).replace('₹', 'Rs ');

interface Row {
  name: string;
  value: number;
  count: number;
  uncategorized?: boolean;
}

/** Sorted category rows + a trailing "Uncategorized" row, for one transaction type. */
function buildRows(
  totals: Record<string, number> | undefined,
  counts: Record<string, number> | undefined,
  typeTotal: number
): { rows: Row[]; grandTotal: number } {
  const rows: Row[] = Object.entries(totals || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100, count: (counts || {})[name] || 0 }));

  const categorized = rows.reduce((s, r) => s + r.value, 0);
  const uncatValue = Math.max(0, Math.round((typeTotal - categorized) * 100) / 100);
  const uncatCount = (counts || {}).Uncategorized || 0;
  if (uncatValue > 0.005 || uncatCount > 0) {
    rows.push({ name: 'Uncategorized', value: uncatValue, count: uncatCount, uncategorized: true });
  }
  return { rows, grandTotal: rows.reduce((s, r) => s + r.value, 0) };
}

interface Section {
  title: string;
  ramp: string[];
  accent: [number, number, number];
  totals?: Record<string, number>;
  counts?: Record<string, number>;
  typeTotal: number;
}

const TEXT = { primary: [15, 23, 42], secondary: [71, 85, 105], muted: [148, 163, 184] } as const;
const M = 40; // page margin (pt)

/**
 * Build a multi-page PDF of the whole Category Breakdown dashboard: metric
 * summary, then for BOTH expense and income — a full ranked bar chart (every
 * category, not just the top 12) and the full category table.
 */
export async function exportDashboardPdf(summary: SummaryData, opts?: { fileName?: string }): Promise<void> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  let y = M;

  const ensure = (need: number) => {
    if (y + need > PH - M) {
      doc.addPage();
      y = M;
    }
  };
  const fit = (s: string, maxW: number) => {
    if (doc.getTextWidth(s) <= maxW) return s;
    let t = s;
    while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1);
    return t + '…';
  };

  // ── Title ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...TEXT.primary);
  doc.text('Category Breakdown', M, y);
  y += 8;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(M, y, PW - M, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT.secondary);
  doc.text(
    `Generated ${new Date().toLocaleString()}  ·  ${summary.transactionCount} transactions  ·  ${summary.annotatedCount} tagged`,
    M,
    y
  );
  y += 22;

  // ── Metrics ──────────────────────────────────────────────────────────────
  const metrics: [string, string][] = [
    ['Opening balance', money(summary.openingBalance)],
    ['Total income', money(summary.totalIncome)],
    ['Total expenses', money(summary.totalExpenses)],
    ['Closing balance', money(summary.closingBalance)],
  ];
  const cw = (PW - 2 * M) / metrics.length;
  metrics.forEach(([label, val], i) => {
    const x = M + i * cw;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT.muted);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...TEXT.primary);
    doc.text(val, x, y + 14);
  });
  y += 30;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT.secondary);
  doc.text(`Net (excl. transfers): ${money(summary.netBalance)}`, M, y);
  y += 14;
  if (summary.transferCount > 0) {
    doc.setTextColor(180, 83, 9);
    doc.text(
      `Internal transfers excluded: ${money(summary.transferTotal)} across ${summary.transferCount} transaction(s).`,
      M,
      y
    );
    y += 14;
  }
  y += 8;

  const sections: Section[] = [
    {
      title: 'Expense categories',
      ramp: EXPENSE_BAR_RAMP,
      accent: [190, 18, 60],
      totals: summary.expenseCategoryTotals,
      counts: summary.expenseCategoryCounts,
      typeTotal: summary.totalExpenses,
    },
    {
      title: 'Income categories',
      ramp: INCOME_BAR_RAMP,
      accent: [4, 120, 87],
      totals: summary.incomeCategoryTotals,
      counts: summary.incomeCategoryCounts,
      typeTotal: summary.totalIncome,
    },
  ];

  sections.forEach((sec, si) => {
    const { rows, grandTotal } = buildRows(sec.totals, sec.counts, sec.typeTotal);

    // Each type starts on a fresh page for a predictable layout.
    if (si > 0 || y > PH - 220) {
      doc.addPage();
      y = M;
    }

    // Section heading
    ensure(36);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(sec.accent[0], sec.accent[1], sec.accent[2]);
    doc.text(sec.title, M, y);
    y += 6;
    doc.setDrawColor(sec.accent[0], sec.accent[1], sec.accent[2]);
    doc.setLineWidth(1.2);
    doc.line(M, y, PW - M, y);
    doc.setLineWidth(0.5);
    y += 16;

    if (rows.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(...TEXT.muted);
      doc.text(`No ${sec.title.toLowerCase()} recorded.`, M, y);
      y += 26;
      return;
    }

    const catRows = rows.filter((r) => !r.uncategorized);
    const topN = Math.min(5, catRows.length);
    const topShare =
      grandTotal && topN > 0
        ? Math.round((catRows.slice(0, topN).reduce((s, r) => s + r.value, 0) / grandTotal) * 100)
        : 0;
    const smallCount = catRows.filter((r) => r.value < 5000).length;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT.secondary);
    doc.text(
      `${catRows.length} categories  ·  ${money(grandTotal)} total  ·  top ${topN} = ${topShare}%` +
        (smallCount ? `  ·  ${smallCount} below Rs 5K` : ''),
      M,
      y
    );
    y += 18;

    // ── Share bar (top 6 + Other) ─────────────────────────────────────────
    const shareRows = bucketTop(catRows, 7);
    const shareTotal = shareRows.reduce((s, r) => s + r.value, 0);
    if (shareTotal > 0) {
      ensure(40);
      const barW = PW - 2 * M;
      const barH = 10;
      let sx = M;
      shareRows.forEach((s, i) => {
        const segW = (s.value / shareTotal) * barW;
        const [r, g, b] = hexToRgb(sliceColor(s.name, i));
        doc.setFillColor(r, g, b);
        doc.rect(sx, y, Math.max(segW - 1, 0.6), barH, 'F');
        sx += segW;
      });
      y += barH + 12;

      doc.setFontSize(7);
      let lx = M;
      shareRows.forEach((s, i) => {
        const label = `${s.name}  ${short(s.value)}`;
        const w = doc.getTextWidth(label) + 20;
        if (lx + w > PW - M) {
          lx = M;
          y += 12;
        }
        const [r, g, b] = hexToRgb(sliceColor(s.name, i));
        doc.setFillColor(r, g, b);
        doc.rect(lx, y - 6, 6, 6, 'F');
        doc.setTextColor(...TEXT.secondary);
        doc.text(label, lx + 10, y);
        lx += w;
      });
      y += 20;
    }

    // ── Ranked bars — EVERY category ──────────────────────────────────────
    ensure(24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT.muted);
    doc.text(`${sec.title.toUpperCase()} — RANKED (${rows.length})`, M, y);
    y += 12;

    const maxVal = Math.max(...rows.map((r) => r.value), 1);
    const labelW = 132;
    const valW = 66;
    const barX = M + labelW + 8;
    const barMaxW = PW - M - valW - barX - 6;
    const rowH = 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    rows.forEach((r, i) => {
      ensure(rowH);
      const midY = y + rowH / 2;
      const grey = r.uncategorized;

      doc.setTextColor(grey ? 148 : 51, grey ? 163 : 65, grey ? 184 : 85);
      doc.text(fit(r.name, labelW), M + labelW, midY, { align: 'right', baseline: 'middle' });

      const w = Math.max((r.value / maxVal) * barMaxW, 0.6);
      const [cr, cg, cb] = grey
        ? hexToRgb(OTHER_COLOR)
        : hexToRgb(lerpRamp(sec.ramp, rows.length > 1 ? i / (rows.length - 1) : 0));
      doc.setFillColor(cr, cg, cb);
      doc.rect(barX, y + 2.5, w, rowH - 5, 'F');

      doc.setTextColor(...TEXT.secondary);
      doc.text(short(r.value), PW - M, midY, { align: 'right', baseline: 'middle' });
      y += rowH;
    });
    y += 16;

    // ── Full table ───────────────────────────────────────────────────────
    const tableTotalValue = rows.reduce((s, r) => s + r.value, 0);
    ensure(80);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Category', 'Transactions', 'Amount', 'Share']],
      body: rows.map((r) => [
        r.name,
        String(r.count),
        money(r.value),
        tableTotalValue ? ((r.value / tableTotalValue) * 100).toFixed(1) + '%' : '0.0%',
      ]),
      foot: [
        [
          `Total — ${rows.length} categories`,
          String(rows.reduce((s, r) => s + r.count, 0)),
          money(tableTotalValue),
          '100%',
        ],
      ],
      styles: { fontSize: 8, cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [226, 232, 240], halign: 'left' },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: {
        1: { halign: 'right', cellWidth: 80 },
        2: { halign: 'right', cellWidth: 90 },
        3: { halign: 'right', cellWidth: 60 },
      },
      theme: 'grid',
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26;
  });

  // ── Page numbers ─────────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT.muted);
    doc.text(`${i} / ${pages}`, PW - M, PH - 20, { align: 'right' });
    doc.text('Bank Statement Annotator', M, PH - 20);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(opts?.fileName || `category-breakdown-${stamp}.pdf`);
}
