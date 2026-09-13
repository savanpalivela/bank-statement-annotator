import type { LookupMatchMode, Rule, RuleCondition, Transaction } from '../types';

// ── Rule normalisation ──────────────────────────────────────────────────────
/**
 * Bring a rule (possibly saved in the old single-condition shape) into the
 * current shape: a `conditions` array plus `match` / `appliesTo` defaults.
 */
export function normalizeRule(rule: Rule): Rule {
  let conditions = rule.conditions;
  if (conditions === undefined) {
    conditions =
      rule.field && rule.operator
        ? [{ field: rule.field, operator: rule.operator, value: rule.value ?? '' }]
        : [];
  }
  const action = rule.action ?? 'categorize';
  return {
    id: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    targetCategory: rule.targetCategory,
    action,
    conditions,
    match: rule.match ?? 'all',
    appliesTo: rule.appliesTo ?? (action === 'exclude' ? 'all' : 'uncategorized'),
    accountId: rule.accountId ?? 'ALL',
    // 'annotateFromFile' rules only — carried through untouched so the mapper
    // hints and last-run stats survive a normalize (localStorage load, export, etc).
    matchMode: rule.matchMode,
    matchColumnHint: rule.matchColumnHint,
    categoryColumnHint: rule.categoryColumnHint,
    lastRun: rule.lastRun,
  };
}

export function normalizeRules(rules: Rule[]): Rule[] {
  return rules.map(normalizeRule);
}

export function ruleConditions(rule: Rule): RuleCondition[] {
  return normalizeRule(rule).conditions ?? [];
}

// ── Condition evaluation ────────────────────────────────────────────────────
function amountMagnitude(tx: Transaction, direction: RuleCondition['direction']): number {
  if (direction === 'in') return tx.credit;
  if (direction === 'out') return tx.debit;
  return Math.abs(tx.amount); // 'either' / undefined
}

function toleranceFor(nearest: number, cond: RuleCondition, fallback: string): number {
  const raw = cond.value2 && cond.value2.trim() !== '' ? cond.value2 : fallback;
  const n = parseFloat(raw);
  if (isNaN(n)) return 0;
  return cond.toleranceMode === 'absolute' ? Math.abs(n) : Math.abs(nearest) * (n / 100);
}

export function evaluateCondition(cond: RuleCondition, tx: Transaction): boolean {
  if (cond.field === 'description' || cond.field === 'date') {
    const source = (cond.field === 'description' ? tx.description : tx.date || '').toLowerCase().trim();
    const target = (cond.value || '').toLowerCase().trim();
    if (target === '') return false;
    switch (cond.operator) {
      case 'contains':
        return source.includes(target);
      case 'equals':
        return source === target;
      case 'startsWith':
        return source.startsWith(target);
      default:
        return false;
    }
  }

  // amount
  const amt = amountMagnitude(tx, cond.direction);
  const base = parseFloat(cond.value);
  switch (cond.operator) {
    case 'greaterThan':
      return !isNaN(base) && amt > base;
    case 'lessThan':
      return !isNaN(base) && amt < base;
    case 'equals':
      return !isNaN(base) && Math.abs(amt - base) < 0.005;
    case 'approxEquals': {
      if (isNaN(base)) return false;
      return Math.abs(amt - base) <= toleranceFor(base, cond, '1.5');
    }
    case 'between': {
      const hi = parseFloat(cond.value2 || '');
      if (isNaN(base) || isNaN(hi)) return false;
      const lo = Math.min(base, hi);
      const up = Math.max(base, hi);
      return amt >= lo && amt <= up;
    }
    case 'multipleOf': {
      if (isNaN(base) || base <= 0 || amt <= 0) return false;
      const k = Math.round(amt / base);
      if (k < 1) return false;
      const nearest = k * base;
      // Tolerance is measured against the unit (base), not the nearest multiple —
      // otherwise a percentage window grows with k until every large amount matches.
      return Math.abs(amt - nearest) <= toleranceFor(base, cond, '1.5');
    }
    default:
      return false;
  }
}

// ── Rule matching ───────────────────────────────────────────────────────────
/** Account + applies-to scope check, shared by condition rules and file-lookup rules. */
export function ruleScopeMatches(rule: Rule, tx: Transaction, overrideExisting = false): boolean {
  const norm = normalizeRule(rule);

  // scope: account
  if (norm.accountId && norm.accountId !== 'ALL' && tx.accountId !== norm.accountId) return false;

  // scope: applies-to
  const isCategorized = !!tx.category && tx.category !== 'Uncategorized';
  let appliesTo = norm.appliesTo ?? 'uncategorized';
  if (appliesTo === 'uncategorized' && overrideExisting) appliesTo = 'all';
  if (appliesTo === 'uncategorized' && isCategorized) return false;
  if (appliesTo === 'categorized' && !isCategorized) return false;

  return true;
}

export function ruleMatches(rule: Rule, tx: Transaction, overrideExisting = false): boolean {
  if (!ruleScopeMatches(rule, tx, overrideExisting)) return false;

  const norm = normalizeRule(rule);
  const conds = norm.conditions ?? [];
  if (conds.length === 0) return true;
  return (norm.match ?? 'all') === 'any'
    ? conds.some((c) => evaluateCondition(c, tx))
    : conds.every((c) => evaluateCondition(c, tx));
}

/** Count how many of the supplied transactions a single rule would match (ignores enabled). */
export function ruleMatchCount(rule: Rule, transactions: Transaction[], overrideExisting = false): number {
  return transactions.reduce((n, tx) => (ruleMatches(rule, tx, overrideExisting) ? n + 1 : n), 0);
}

export function applyRulesToTransactions(
  transactions: Transaction[],
  rules: Rule[],
  overrideExisting: boolean = false
): { updatedTransactions: Transaction[]; matchesCount: number } {
  let matchesCount = 0;

  // Active rules, with condition-bearing rules evaluated before catch-all rules.
  // 'annotateFromFile' rules are excluded: they carry no conditions and no fixed
  // target category (the category comes per-row from an uploaded file at Run time),
  // so they must never be evaluated by this generic condition-matching loop.
  const activeRules = rules
    .filter((r) => r.enabled && (r.action ?? 'categorize') !== 'annotateFromFile')
    .map(normalizeRule)
    .sort((a, b) => {
      const ac = (a.conditions ?? []).length === 0 ? 1 : 0;
      const bc = (b.conditions ?? []).length === 0 ? 1 : 0;
      return ac - bc;
    });

  const updatedTransactions = transactions.map((tx) => {
    for (const rule of activeRules) {
      if (!ruleMatches(rule, tx, overrideExisting)) continue;

      if (rule.action === 'exclude') {
        if (tx.excluded) return tx;
        matchesCount++;
        return { ...tx, excluded: true };
      }

      matchesCount++;
      return { ...tx, category: rule.targetCategory };
    }
    return tx;
  });

  return { updatedTransactions, matchesCount };
}

// ── File-lookup rules ('annotateFromFile') ──────────────────────────────────
// Unlike condition rules, these carry no persisted data — only a small config
// (match mode, scope). The actual identifier→category pairs live only in memory
// for the duration of one "Run" and are supplied fresh by the caller each time.

function matchDescription(description: string, value: string, mode: LookupMatchMode = 'contains'): boolean {
  const source = description.toLowerCase().trim();
  const target = value.toLowerCase().trim();
  if (!target) return false;
  switch (mode) {
    case 'equals':
      return source === target;
    case 'startsWith':
      return source.startsWith(target);
    default:
      return source.includes(target);
  }
}

export interface FileLookupRunResult {
  updatedTransactions: Transaction[];
  /** Transactions that received a category from this run */
  matched: number;
  /** Rows in the file that had both an identifier and a category (the rest are skipped) */
  usableRows: number;
  /** Total rows parsed from the file */
  totalRows: number;
  /** Transactions whose description matched more than one row (first match wins) */
  collisions: number;
}

/**
 * Apply one 'annotateFromFile' rule against freshly-parsed lookup rows. `lookupRows`
 * is never persisted — it's read from the uploaded file and passed in for this
 * call only; the rule itself only remembers which columns were used (as name
 * hints) and summary counts, via the caller updating `matchColumnHint` /
 * `categoryColumnHint` / `lastRun` on the Rule after this returns.
 */
export function applyFileLookupRule(
  transactions: Transaction[],
  rule: Rule,
  lookupRows: Record<string, any>[],
  matchColumn: string,
  categoryColumn: string,
  overrideExisting: boolean = false
): FileLookupRunResult {
  const mode = rule.matchMode ?? 'contains';
  const entries = lookupRows
    .map((row) => ({
      id: String(row[matchColumn] ?? '').trim(),
      category: String(row[categoryColumn] ?? '').trim(),
    }))
    .filter((e) => e.id !== '' && e.category !== '');

  let matched = 0;
  let collisions = 0;
  const updatedTransactions = transactions.map((tx) => {
    if (!ruleScopeMatches(rule, tx, overrideExisting)) return tx;
    const hits = entries.filter((e) => matchDescription(tx.description, e.id, mode));
    if (hits.length === 0) return tx;
    if (hits.length > 1) collisions++;
    matched++;
    return { ...tx, category: hits[0].category };
  });

  return { updatedTransactions, matched, usableRows: entries.length, totalRows: lookupRows.length, collisions };
}

export const INITIAL_RULES: Rule[] = [
  {
    id: 'rule-1',
    name: 'Coffee Shops',
    enabled: true,
    conditions: [{ field: 'description', operator: 'contains', value: 'Starbucks' }],
    targetCategory: 'Food & Dining',
  },
  {
    id: 'rule-2',
    name: 'Supermarkets',
    enabled: true,
    conditions: [{ field: 'description', operator: 'contains', value: 'Walmart' }],
    targetCategory: 'Groceries',
  },
  {
    id: 'rule-3',
    name: 'Payroll/Salary',
    enabled: true,
    conditions: [{ field: 'description', operator: 'contains', value: 'Payroll' }],
    targetCategory: 'Income & Salary',
  },
  {
    id: 'rule-4',
    name: 'Streaming Services',
    enabled: true,
    conditions: [{ field: 'description', operator: 'contains', value: 'Netflix' }],
    targetCategory: 'Entertainment & Subscriptions',
  },
  {
    id: 'rule-5',
    name: 'Fuel / Gas',
    enabled: true,
    conditions: [{ field: 'description', operator: 'contains', value: 'Shell' }],
    targetCategory: 'Transportation & Fuel',
  },
  {
    id: 'rule-6',
    name: 'Transfer to OD Account',
    enabled: false,
    action: 'exclude',
    appliesTo: 'all',
    conditions: [{ field: 'description', operator: 'contains', value: 'OD Transfer' }],
    targetCategory: 'Uncategorized',
  },
];
