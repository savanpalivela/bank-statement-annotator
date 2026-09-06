import type { Rule, RuleCondition, Transaction } from '../types';

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
export function ruleMatches(rule: Rule, tx: Transaction, overrideExisting = false): boolean {
  const norm = normalizeRule(rule);

  // scope: account
  if (norm.accountId && norm.accountId !== 'ALL' && tx.accountId !== norm.accountId) return false;

  // scope: applies-to
  const isCategorized = !!tx.category && tx.category !== 'Uncategorized';
  let appliesTo = norm.appliesTo ?? 'uncategorized';
  if (appliesTo === 'uncategorized' && overrideExisting) appliesTo = 'all';
  if (appliesTo === 'uncategorized' && isCategorized) return false;
  if (appliesTo === 'categorized' && !isCategorized) return false;

  // conditions
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

  // Active rules, with condition-bearing rules evaluated before catch-all rules
  const activeRules = rules
    .filter((r) => r.enabled)
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
