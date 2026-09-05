import type { Rule, Transaction } from '../types';

export function evaluateRule(rule: Rule, tx: Transaction): boolean {
  if (!rule.enabled) return false;

  let sourceValueStr = '';
  if (rule.field === 'description') {
    sourceValueStr = tx.description || '';
  } else if (rule.field === 'date') {
    sourceValueStr = tx.date || '';
  } else if (rule.field === 'amount') {
    sourceValueStr = String(tx.amount);
  }

  const ruleVal = rule.value.toLowerCase().trim();
  const sourceValLower = sourceValueStr.toLowerCase().trim();

  switch (rule.operator) {
    case 'contains':
      return sourceValLower.includes(ruleVal);
    case 'equals':
      return sourceValLower === ruleVal;
    case 'startsWith':
      return sourceValLower.startsWith(ruleVal);
    case 'greaterThan': {
      const numSource = parseFloat(sourceValueStr);
      const numRule = parseFloat(rule.value);
      return !isNaN(numSource) && !isNaN(numRule) && numSource > numRule;
    }
    case 'lessThan': {
      const numSource = parseFloat(sourceValueStr);
      const numRule = parseFloat(rule.value);
      return !isNaN(numSource) && !isNaN(numRule) && numSource < numRule;
    }
    default:
      return false;
  }
}

export function applyRulesToTransactions(
  transactions: Transaction[],
  rules: Rule[],
  overrideExisting: boolean = false
): { updatedTransactions: Transaction[]; matchesCount: number } {
  let matchesCount = 0;
  const activeRules = rules.filter((r) => r.enabled);

  const updatedTransactions = transactions.map((tx) => {
    // Skip if already has category and overrideExisting is false
    if (!overrideExisting && tx.category && tx.category !== 'Uncategorized') {
      return tx;
    }

    for (const rule of activeRules) {
      if (evaluateRule(rule, tx)) {
        matchesCount++;
        return {
          ...tx,
          category: rule.targetCategory,
        };
      }
    }
    return tx;
  });

  return { updatedTransactions, matchesCount };
}

export const INITIAL_RULES: Rule[] = [
  {
    id: 'rule-1',
    name: 'Coffee Shops',
    field: 'description',
    operator: 'contains',
    value: 'Starbucks',
    targetCategory: 'Food & Dining',
    enabled: true,
  },
  {
    id: 'rule-2',
    name: 'Supermarkets',
    field: 'description',
    operator: 'contains',
    value: 'Walmart',
    targetCategory: 'Groceries',
    enabled: true,
  },
  {
    id: 'rule-3',
    name: 'Payroll/Salary',
    field: 'description',
    operator: 'contains',
    value: 'Payroll',
    targetCategory: 'Income & Salary',
    enabled: true,
  },
  {
    id: 'rule-4',
    name: 'Streaming Services',
    field: 'description',
    operator: 'contains',
    value: 'Netflix',
    targetCategory: 'Entertainment & Subscriptions',
    enabled: true,
  },
  {
    id: 'rule-5',
    name: 'Fuel / Gas',
    field: 'description',
    operator: 'contains',
    value: 'Shell',
    targetCategory: 'Transportation & Fuel',
    enabled: true,
  },
];
