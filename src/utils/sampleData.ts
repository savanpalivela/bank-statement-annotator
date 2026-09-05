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
    if (mapping.balanceCol && row[mapping.balanceCol] !== undefined && row[mapping.balanceCol] !== '') {
      const bVal = parseFloat(String(row[mapping.balanceCol]).replace(/[^0-9.-]+/g, ''));
      if (!isNaN(bVal)) runningBalance = bVal;
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
      rawRow: row,
      accountId,
      accountLabel,
    });
  });

  return validTransactions;
}

/**
 * Compute a merged running balance across all transactions (sorted chronologically).
 * The merged balance starts at 0 (sum of opening balances is tracked in App-level summary).
 * Each transaction's running balance = previous + credit - debit.
 */
export function computeMergedRunningBalance(transactions: Transaction[]): Transaction[] {
  // Sort by date ascending (stable – preserving original order for same-day)
  const sorted = [...transactions].sort((a, b) => {
    const ta = new Date(a.date).getTime() || 0;
    const tb = new Date(b.date).getTime() || 0;
    return ta - tb;
  });

  let running = 0;
  return sorted.map((tx) => {
    running += tx.credit - tx.debit;
    return { ...tx, runningBalance: Math.round(running * 100) / 100 };
  });
}
