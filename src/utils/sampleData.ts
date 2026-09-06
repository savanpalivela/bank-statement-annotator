import type { ColumnMapping, Transaction } from '../types';

export const SAMPLE_RAW_DATA: Record<string, any>[] = [
  { 'Txn Date': '2026-08-01', 'Transaction Description': 'Payroll Direct Deposit Acme Corp', 'Debit (₹)': 0, 'Credit (₹)': 150000.00, 'Balance (₹)': 200000.00, 'Existing Category': 'Income & Salary' },
  { 'Txn Date': '2026-08-02', 'Transaction Description': 'Starbucks Coffee #4928', 'Debit (₹)': 450.00, 'Credit (₹)': 0, 'Balance (₹)': 199550.00, 'Existing Category': '' },
  { 'Txn Date': '2026-08-03', 'Transaction Description': 'Walmart Supercenter Grocery', 'Debit (₹)': 4500.00, 'Credit (₹)': 0, 'Balance (₹)': 195050.00, 'Existing Category': '' },
  { 'Txn Date': '2026-08-04', 'Transaction Description': 'Netflix Subscription Monthly', 'Debit (₹)': 649.00, 'Credit (₹)': 0, 'Balance (₹)': 194401.00, 'Existing Category': '' },
  { 'Txn Date': '2026-08-05', 'Transaction Description': 'Shell Gas Station Refill', 'Debit (₹)': 2500.00, 'Credit (₹)': 0, 'Balance (₹)': 191901.00, 'Existing Category': '' },
  { 'Txn Date': '2026-08-06', 'Transaction Description': 'City Water & Power Electric Bill', 'Debit (₹)': 3200.00, 'Credit (₹)': 0, 'Balance (₹)': 188701.00, 'Existing Category': 'Utilities & Bills' },
  { 'Txn Date': '2026-08-07', 'Transaction Description': 'Freelance Client Payment - Design Work', 'Debit (₹)': 0, 'Credit (₹)': 25000.00, 'Balance (₹)': 213701.00, 'Existing Category': '' },
  { 'Txn Date': '2026-08-09', 'Transaction Description': 'Amazon Online Order Electronics', 'Debit (₹)': 3499.00, 'Credit (₹)': 0, 'Balance (₹)': 210202.00, 'Existing Category': 'Shopping' },
  { 'Txn Date': '2026-08-10', 'Transaction Description': 'Uber Ride Airport Drop', 'Debit (₹)': 850.00, 'Credit (₹)': 0, 'Balance (₹)': 209352.00, 'Existing Category': '' },
  { 'Txn Date': '2026-08-12', 'Transaction Description': 'Whole Foods Market', 'Debit (₹)': 2250.00, 'Credit (₹)': 0, 'Balance (₹)': 207102.00, 'Existing Category': '' },
  { 'Txn Date': '2026-08-15', 'Transaction Description': 'Monthly Apartment Rent', 'Debit (₹)': 28000.00, 'Credit (₹)': 0, 'Balance (₹)': 179102.00, 'Existing Category': 'Housing & Rent' },
  { 'Txn Date': '2026-08-18', 'Transaction Description': 'CVS Pharmacy Prescription', 'Debit (₹)': 750.00, 'Credit (₹)': 0, 'Balance (₹)': 178352.00, 'Existing Category': '' },
  { 'Txn Date': '2026-08-20', 'Transaction Description': 'Starbucks Coffee Downtown', 'Debit (₹)': 380.00, 'Credit (₹)': 0, 'Balance (₹)': 177972.00, 'Existing Category': '' },
  { 'Txn Date': '2026-08-22', 'Transaction Description': 'Dividend Income Stock Portfolio', 'Debit (₹)': 0, 'Credit (₹)': 4500.00, 'Balance (₹)': 182472.00, 'Existing Category': '' },
  { 'Txn Date': '2026-08-25', 'Transaction Description': 'Gym Membership Renewal', 'Debit (₹)': 1800.00, 'Credit (₹)': 0, 'Balance (₹)': 180672.00, 'Existing Category': 'Personal Care' },
];

export const DEFAULT_SAMPLE_COLUMNS = ['Txn Date', 'Transaction Description', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)', 'Existing Category'];

export const DEFAULT_SAMPLE_MAPPING: ColumnMapping = {
  dateCol: 'Txn Date',
  descCol: 'Transaction Description',
  amountMode: 'split',
  amountCol: '',
  debitCol: 'Debit (₹)',
  creditCol: 'Credit (₹)',
  balanceCol: 'Balance (₹)',
  categoryCol: 'Existing Category',
};

/**
 * Validates if a raw value represents a valid date format.
 */
export function isValidDateFormat(val: any): boolean {
  if (val === null || val === undefined) return false;
  const strVal = String(val).trim();
  if (!strVal) return false;

  // 1. Check numeric Excel serial date number
  if (/^\d{4,5}(\.\d+)?$/.test(strVal)) {
    const num = parseFloat(strVal);
    if (num > 10000 && num < 80000) return true;
  }

  // 2. Regex for standard date patterns
  const dateRegex = /^(?:\d{1,4}[-/\.]\d{1,2}[-/\.]\d{1,4})|(?:\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})|(?:[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4})$/;
  if (dateRegex.test(strVal)) return true;

  // 3. Fallback: JS Date.parse check
  const timestamp = Date.parse(strVal);
  return !isNaN(timestamp);
}

/**
 * Parse raw rows into Transaction objects, tagging each with accountId & accountLabel.
 */
export function parseRawDataToTransactions(
  rawData: Record<string, any>[],
  mapping: ColumnMapping,
  accountId: string = 'default',
  accountLabel: string = 'Account 1'
): Transaction[] {
  const validTransactions: Transaction[] = [];

  rawData.forEach((row, idx) => {
    const dateRaw = row[mapping.dateCol];

    // IGNORE row if the Date column doesn't have a value in valid date format
    if (!isValidDateFormat(dateRaw)) {
      return;
    }

    const dateStr = String(dateRaw).trim();
    const descStr = String(row[mapping.descCol] || '').trim();
    const existingCategory = String(row[mapping.categoryCol] || '').trim();

    let credit = 0;
    let debit = 0;
    let amount = 0;
    let type: 'income' | 'expense' | 'neutral' = 'neutral';

    if (mapping.amountMode === 'single') {
      const val = parseFloat(String(row[mapping.amountCol] || '0').replace(/[^0-9.-]+/g, ''));
      const numVal = isNaN(val) ? 0 : val;
      amount = numVal;
      if (numVal > 0) {
        credit = numVal;
        type = 'income';
      } else if (numVal < 0) {
        debit = Math.abs(numVal);
        type = 'expense';
      }
    } else {
      const debitRaw = parseFloat(String(row[mapping.debitCol] || '0').replace(/[^0-9.-]+/g, ''));
      const creditRaw = parseFloat(String(row[mapping.creditCol] || '0').replace(/[^0-9.-]+/g, ''));

      debit = isNaN(debitRaw) ? 0 : Math.abs(debitRaw);
      credit = isNaN(creditRaw) ? 0 : Math.abs(creditRaw);
      amount = credit - debit;

      if (credit > 0 && debit === 0) {
        type = 'income';
      } else if (debit > 0 && credit === 0) {
        type = 'expense';
      } else if (credit > 0 || debit > 0) {
        type = amount >= 0 ? 'income' : 'expense';
      }
    }

    // Running Balance column if provided (per-account; will be overridden by merged balance)
    let runningBalance: number | undefined = undefined;
    let statementBalance: number | undefined = undefined;
    if (mapping.balanceCol && row[mapping.balanceCol] !== undefined && row[mapping.balanceCol] !== '') {
      const bVal = parseFloat(String(row[mapping.balanceCol]).replace(/[^0-9.-]+/g, ''));
      if (!isNaN(bVal)) {
        runningBalance = bVal;
        statementBalance = bVal;
      }
    }

    validTransactions.push({
      id: `tx-${accountId}-${idx}-${Date.now()}`,
      originalRowIndex: idx,
      date: dateStr,
      description: descStr,
      credit,
      debit,
      amount,
      type,
      category: existingCategory || 'Uncategorized',
      runningBalance,
      statementBalance,
      rawRow: row,
      accountId,
      accountLabel,
    });
  });

  // Normalise to oldest → newest. Many banks list the newest transaction first;
  // reversing here keeps every downstream balance calculation order-independent.
  if (validTransactions.length >= 2) {
    const firstTime = new Date(validTransactions[0].date).getTime() || 0;
    const lastTime = new Date(validTransactions[validTransactions.length - 1].date).getTime() || 0;
    if (firstTime > lastTime) validTransactions.reverse();
  }

  return validTransactions;
}

/**
 * Normalise a description for duplicate matching: lower-case, collapse whitespace.
 */
function normalizeDescription(desc: string): string {
  return desc.trim().toLowerCase().replace(/\s+/g, ' ');
}

const rowSignature = (tx: Transaction): string =>
  [tx.date.trim(), normalizeDescription(tx.description), tx.debit.toFixed(2), tx.credit.toFixed(2)].join('|');

/**
 * Collapse transactions that are the same real-world entry showing up in more than
 * one uploaded statement — but ONLY when we can be sure the two statements are the
 * same real account, never on a fuzzy row match alone.
 *
 * A row is removed as a duplicate only if BOTH of these hold:
 *  1. Another account is a re-upload of, or a chronological continuation of, this one
 *     — detected by that account's opening balance appearing as a running-balance
 *     point of the other. Two genuinely different accounts that merely share some
 *     transactions are left completely intact.
 *  2. The row matches on date + description + amount + running balance.
 * A single file is always trusted for its own rows.
 */
export function dedupeAcrossAccounts(transactions: Transaction[]): {
  transactions: Transaction[];
  duplicatesRemoved: number;
  duplicateAccounts: Set<string>;
  /** continuation accountId → canonical accountId (statements that are the same real account) */
  accountMerges: Map<string, string>;
} {
  const accountMerges = new Map<string, string>();
  const canonical = (id: string): string => {
    let c = id;
    while (accountMerges.has(c)) c = accountMerges.get(c)!;
    return c;
  };

  const byAccount = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (!byAccount.has(tx.accountId)) byAccount.set(tx.accountId, []);
    byAccount.get(tx.accountId)!.push(tx);
  }
  const accountIds = [...byAccount.keys()];

  // ── 1. Whole accounts that are an exact re-upload of another account ──
  const seenAccountSig = new Map<string, string>();
  const duplicateAccounts = new Set<string>();
  for (const id of accountIds) {
    const txs = byAccount.get(id)!;
    if (txs.length === 0) continue;
    const sig = txs.map(rowSignature).sort().join('§');
    const original = seenAccountSig.get(sig);
    if (original) {
      duplicateAccounts.add(id);
      accountMerges.set(canonical(id), canonical(original));
    } else {
      seenAccountSig.set(sig, id);
    }
  }
  const liveIds = accountIds.filter((id) => !duplicateAccounts.has(id));

  // ── 2. Opening balance + set of running-balance points, per live account ──
  const openingOf = new Map<string, number | undefined>();
  const pointsOf = new Map<string, Set<string>>();
  for (const id of liveIds) {
    const txs = byAccount.get(id)!;
    const opening = computeStatementOpeningBalance(txs);
    openingOf.set(id, opening);
    const pts = new Set<string>();
    if (opening !== undefined) pts.add(opening.toFixed(2));
    for (const t of txs) if (t.statementBalance !== undefined) pts.add(t.statementBalance.toFixed(2));
    pointsOf.set(id, pts);
  }

  // ── 3. Link "B is a continuation of A" — B's opening balance is one of A's points ──
  for (const b of liveIds) {
    const bOpen = openingOf.get(b);
    if (bOpen === undefined) continue;
    const bOpenKey = bOpen.toFixed(2);
    for (const a of liveIds) {
      if (a === b || canonical(a) === canonical(b)) continue;
      if (pointsOf.get(a)!.has(bOpenKey)) {
        accountMerges.set(canonical(b), canonical(a));
        break;
      }
    }
  }

  // ── 4. Within each merged group, drop rows that repeat (date+desc+amount+balance) ──
  const firstOwnerByKey = new Map<string, string>();
  const kept: Transaction[] = [];
  let duplicatesRemoved = 0;

  for (const tx of transactions) {
    if (duplicateAccounts.has(tx.accountId)) {
      duplicatesRemoved++;
      continue;
    }
    if (tx.statementBalance === undefined) {
      kept.push(tx);
      continue;
    }

    const key = [canonical(tx.accountId), rowSignature(tx), tx.statementBalance.toFixed(2)].join('::');
    const owner = firstOwnerByKey.get(key);
    if (owner === undefined) {
      firstOwnerByKey.set(key, tx.accountId);
      kept.push(tx);
    } else if (owner === tx.accountId) {
      kept.push(tx); // same file — a genuine repeat, trust it
    } else {
      duplicatesRemoved++; // same entry, same real account, different statement
    }
  }

  return { transactions: kept, duplicatesRemoved, duplicateAccounts, accountMerges };
}

/**
 * Opening balance of a single statement/account: the balance shown on the
 * chronologically EARLIEST transaction, walked back by that row's own credit/debit
 * effect. The earliest row is detected from the dates, so newest-first statements
 * are handled correctly.
 *   opening = earliestRow.statementBalance - (earliestRow.credit - earliestRow.debit)
 * Returns undefined when the statement has no usable balance column.
 */
export function computeStatementOpeningBalance(accountTransactions: Transaction[]): number | undefined {
  const withBalance = accountTransactions.filter((t) => t.statementBalance !== undefined);
  if (withBalance.length === 0) return undefined;

  const earliest = [...withBalance].sort((a, b) => {
    const ta = new Date(a.date).getTime() || 0;
    const tb = new Date(b.date).getTime() || 0;
    if (ta !== tb) return ta - tb;
    return a.originalRowIndex - b.originalRowIndex;
  })[0];

  const opening = earliest.statementBalance! - (earliest.credit - earliest.debit);
  return Math.round(opening * 100) / 100;
}

/**
 * Aggregate opening balance across every account: the sum of each individual
 * statement's opening balance. Accounts without a balance column contribute 0.
 * `accountMerges` (from dedupeAcrossAccounts) links overlapping statements of the
 * same real account so their opening balance is only counted once.
 */
export function computeAggregateOpeningBalance(
  transactions: Transaction[],
  accountMerges?: Map<string, string>
): number {
  const resolve = (id: string): string => {
    let c = id;
    while (accountMerges?.has(c)) c = accountMerges.get(c)!;
    return c;
  };

  const byAccount = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = resolve(tx.accountId);
    if (!byAccount.has(key)) byAccount.set(key, []);
    byAccount.get(key)!.push(tx);
  }
  let total = 0;
  for (const accountTxs of byAccount.values()) {
    total += computeStatementOpeningBalance(accountTxs) ?? 0;
  }
  return Math.round(total * 100) / 100;
}

/**
 * Compute a merged running balance across all transactions (sorted chronologically).
 * `startingBalance` is the combined opening balance; when omitted it is derived from
 * each statement's own opening balance. Each transaction's running balance =
 * previous + credit - debit.
 */
export function computeMergedRunningBalance(
  transactions: Transaction[],
  startingBalance?: number
): Transaction[] {
  // Sort by date ascending (stable – preserving original order for same-day)
  const sorted = [...transactions].sort((a, b) => {
    const ta = new Date(a.date).getTime() || 0;
    const tb = new Date(b.date).getTime() || 0;
    return ta - tb;
  });

  // Single statement with its own balance column → show that column verbatim so
  // the balance always matches the source file (even if the file doesn't reconcile).
  const singleAccount = new Set(sorted.map((t) => t.accountId)).size === 1;
  if (singleAccount && sorted.length > 0 && sorted.every((t) => t.statementBalance !== undefined)) {
    return sorted.map((tx) => ({ ...tx, runningBalance: tx.statementBalance }));
  }

  let running = startingBalance ?? computeAggregateOpeningBalance(transactions);
  return sorted.map((tx) => {
    running += tx.credit - tx.debit;
    return { ...tx, runningBalance: Math.round(running * 100) / 100 };
  });
}
