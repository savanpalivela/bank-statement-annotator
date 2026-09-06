export interface Transaction {
  id: string;
  originalRowIndex: number;
  date: string;
  description: string;
  credit: number;
  debit: number;
  amount: number; // credit - debit
  type: 'income' | 'expense' | 'neutral';
  category: string;
  runningBalance?: number;
  /** Raw closing balance for this row as read from the statement's balance column (never overwritten by the merged running balance) */
  statementBalance?: number;
  /** Internal transfer (e.g. to an OD / overdraft account) — kept in the balance but excluded from income/expense totals and category charts */
  excluded?: boolean;
  /** Free-text note / comment the user attached to this transaction (stored in IndexedDB, mirrored here) */
  note?: string;
  rawRow: Record<string, any>;
  /** Which account/file this transaction belongs to */
  accountId: string;
  accountLabel: string;
}

export interface Account {
  id: string;
  label: string;      // display name (derived from filename)
  fileName: string;
  columns: string[];
  mapping: ColumnMapping;
  color: string;      // badge color class (tailwind)
}

export type AmountMode = 'single' | 'split';

export interface ColumnMapping {
  dateCol: string;
  descCol: string;
  amountMode: AmountMode;
  amountCol: string;
  debitCol: string;
  creditCol: string;
  balanceCol: string;
  categoryCol: string;
}

export type RuleAction = 'categorize' | 'exclude';

export type ConditionField = 'description' | 'amount' | 'date';

export type ConditionOperator =
  | 'contains'
  | 'equals'
  | 'startsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'multipleOf'
  | 'approxEquals'
  | 'between';

/** For amount conditions: which side of the transaction to test */
export type AmountDirection = 'out' | 'in' | 'either';

export type ToleranceMode = 'percent' | 'absolute';

export interface RuleCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
  /** upper bound for 'between'; tolerance for 'multipleOf' / 'approxEquals' */
  value2?: string;
  /** amount conditions only */
  direction?: AmountDirection;
  toleranceMode?: ToleranceMode;
}

/** Which transactions a rule is allowed to touch, before its conditions are tested */
export type RuleAppliesTo = 'uncategorized' | 'all' | 'categorized';

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  targetCategory: string;
  /** 'categorize' (default) sets the category; 'exclude' flags the transaction as an internal transfer */
  action?: RuleAction;
  /** how the conditions combine — default 'all' */
  match?: 'all' | 'any';
  /** an empty / missing list matches every transaction in scope */
  conditions?: RuleCondition[];
  /** restrict to one account id; undefined or 'ALL' = every account */
  accountId?: string;
  /** default 'uncategorized' for categorize rules, 'all' for exclude rules */
  appliesTo?: RuleAppliesTo;

  // ---- legacy single-condition shape (auto-migrated by normalizeRule) ----
  field?: ConditionField;
  operator?: ConditionOperator;
  value?: string;
}

export interface CategoryStructure {
  income: string[];
  expense: string[];
}

export interface SummaryData {
  totalIncome: number; // Sum of ALL Credit values
  totalExpenses: number; // Sum of ALL Debit values
  openingBalance: number;
  closingBalance: number;
  netBalance: number; // totalIncome - totalExpenses (excluding internal transfers)
  transferTotal: number; // net outflow of transactions flagged as internal transfers
  transferCount: number;
  transactionCount: number;
  annotatedCount: number;
  expenseCategoryTotals: Record<string, number>;
  incomeCategoryTotals: Record<string, number>;
  /** Number of (non-excluded) transactions per category, incl. an 'Uncategorized' key */
  expenseCategoryCounts: Record<string, number>;
  incomeCategoryCounts: Record<string, number>;
}

// Preset color palette for accounts (Tailwind utility strings)
export const ACCOUNT_COLORS: string[] = [
  'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'bg-amber-500/20 text-amber-300 border-amber-500/40',
  'bg-rose-500/20 text-rose-300 border-rose-500/40',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  'bg-purple-500/20 text-purple-300 border-purple-500/40',
  'bg-orange-500/20 text-orange-300 border-orange-500/40',
  'bg-teal-500/20 text-teal-300 border-teal-500/40',
];

export const PRESET_EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Shopping',
  'Utilities & Bills',
  'Housing & Rent',
  'Transportation & Fuel',
  'Entertainment & Subscriptions',
  'Healthcare & Medical',
  'Business & Supplies',
  'Personal Care',
  'Uncategorized',
];

export const PRESET_INCOME_CATEGORIES = [
  'Income & Salary',
  'Freelance & Side Income',
  'Investments & Dividends',
  'Refunds & Cashbacks',
  'Other Income',
  'Uncategorized',
];
