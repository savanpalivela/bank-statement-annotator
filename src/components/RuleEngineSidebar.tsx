import React, { useRef, useState } from 'react';
import type {
  Account,
  ConditionField,
  ConditionOperator,
  Rule,
  RuleAppliesTo,
  RuleCondition,
  Transaction,
} from '../types';
import { Plus, Trash2, CheckCircle2, Play, AlertCircle, Pencil, Copy, Download, Upload } from 'lucide-react';
import { ruleMatchCount } from '../utils/ruleEngine';

interface RuleEngineSidebarProps {
  rules: Rule[];
  categories: string[];
  accounts: Account[];
  transactions: Transaction[];
  onAddRule: (rule: Rule) => void;
  onUpdateRule: (rule: Rule) => void;
  onDeleteRule: (id: string) => void;
  onDuplicateRule: (id: string) => void;
  onToggleRule: (id: string) => void;
  onRunRules: (overrideExisting: boolean) => void;
  onRunSingleRule: (id: string, overrideExisting: boolean) => void;
  onExportRules: () => void;
  onImportRules: (text: string) => void;
}

const TEXT_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'startsWith', label: 'Starts With' },
];

const AMOUNT_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'greaterThan', label: 'Greater than' },
  { value: 'lessThan', label: 'Less than' },
  { value: 'multipleOf', label: 'Is a multiple of' },
  { value: 'approxEquals', label: '≈ Approximately' },
  { value: 'between', label: 'Is between' },
];

const operatorsFor = (field: ConditionField) =>
  field === 'amount' ? AMOUNT_OPERATORS : TEXT_OPERATORS;

const needsSecondValue = (op: ConditionOperator) =>
  op === 'between' || op === 'multipleOf' || op === 'approxEquals';

const emptyCondition = (): RuleCondition => ({
  field: 'description',
  operator: 'contains',
  value: '',
});

function describeCondition(c: RuleCondition): string {
  const dir = c.field === 'amount' && c.direction && c.direction !== 'either' ? ` (${c.direction})` : '';
  const tol =
    c.value2 && needsSecondValue(c.operator) && c.operator !== 'between'
      ? ` ±${c.value2}${c.toleranceMode === 'absolute' ? '' : '%'}`
      : '';
  switch (c.operator) {
    case 'multipleOf':
      return `amount is a multiple of ${c.value}${tol}${dir}`;
    case 'approxEquals':
      return `amount ≈ ${c.value}${tol}${dir}`;
    case 'between':
      return `amount between ${c.value} and ${c.value2 ?? '?'}${dir}`;
    case 'greaterThan':
      return `amount > ${c.value}${dir}`;
    case 'lessThan':
      return `amount < ${c.value}${dir}`;
    default:
      return `${c.field} ${c.operator} "${c.value}"`;
  }
}

export const RuleEngineSidebar: React.FC<RuleEngineSidebarProps> = ({
  rules,
  categories,
  accounts,
  transactions,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onDuplicateRule,
  onToggleRule,
  onRunRules,
  onRunSingleRule,
  onExportRules,
  onImportRules,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [overrideExisting, setOverrideExisting] = useState(true);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImportRules(String(reader.result || ''));
    reader.onerror = () => onImportRules('');
    reader.readAsText(file);
  };

  // Form state
  const [name, setName] = useState('');
  const [action, setAction] = useState<'categorize' | 'exclude'>('categorize');
  const [accountId, setAccountId] = useState<string>('ALL');
  const [appliesTo, setAppliesTo] = useState<RuleAppliesTo>('uncategorized');
  const [matchMode, setMatchMode] = useState<'all' | 'any'>('all');
  const [conditions, setConditions] = useState<RuleCondition[]>([emptyCondition()]);
  const [targetCategory, setTargetCategory] = useState(categories[0] || 'Uncategorized');

  const accountLabel = (id?: string) =>
    !id || id === 'ALL' ? 'All accounts' : accounts.find((a) => a.id === id)?.label ?? 'Unknown account';

  const resetForm = () => {
    setName('');
    setAction('categorize');
    setAccountId('ALL');
    setAppliesTo('uncategorized');
    setMatchMode('all');
    setConditions([emptyCondition()]);
    setTargetCategory(categories[0] || 'Uncategorized');
    setShowAddForm(false);
    setEditingRuleId(null);
  };

  const handleOpenAddForm = () => {
    resetForm();
    setShowAddForm(true);
  };

  const handleOpenEditForm = (rule: Rule) => {
    setShowAddForm(false);
    setEditingRuleId(rule.id);
    setName(rule.name);
    const act = rule.action ?? 'categorize';
    setAction(act);
    setAccountId(rule.accountId ?? 'ALL');
    setAppliesTo(rule.appliesTo ?? (act === 'exclude' ? 'all' : 'uncategorized'));
    setMatchMode(rule.match ?? 'all');
    setConditions(
      rule.conditions && rule.conditions.length > 0
        ? rule.conditions.map((c) => ({ ...c }))
        : rule.field && rule.operator
        ? [{ field: rule.field, operator: rule.operator, value: rule.value ?? '' }]
        : []
    );
    setTargetCategory(rule.targetCategory || categories[0] || 'Uncategorized');
  };

  const updateCondition = (idx: number, patch: Partial<RuleCondition>) => {
    setConditions((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const next = { ...c, ...patch };
        // keep operator valid when the field changes
        if (patch.field && !operatorsFor(patch.field).some((o) => o.value === next.operator)) {
          next.operator = patch.field === 'amount' ? 'equals' : 'contains';
        }
        if (patch.field === 'amount' && !next.direction) next.direction = 'either';
        if (patch.field === 'amount' && !next.toleranceMode) next.toleranceMode = 'percent';
        return next;
      })
    );
  };

  const defaultRuleName = () => {
    const scope = accountId === 'ALL' ? '' : ` — ${accountLabel(accountId)}`;
    if (conditions.length === 0) return `${action === 'exclude' ? 'Exclude all' : 'Catch-all'}${scope}`;
    return `${action === 'exclude' ? 'Exclude: ' : ''}${describeCondition(conditions[0])}${scope}`;
  };

  const draftRule: Rule = {
    id: editingRuleId ?? 'draft',
    name: name.trim() || 'draft',
    enabled: true,
    action,
    match: matchMode,
    conditions,
    accountId,
    appliesTo,
    targetCategory,
  };
  const liveCount = ruleMatchCount(draftRule, transactions, action === 'categorize' && overrideExisting);

  const conditionsValid = conditions.every(
    (c) => c.value.trim() !== '' && (!needsSecondValue(c.operator) ? true : c.operator === 'between' ? (c.value2 ?? '').trim() !== '' : true)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conditionsValid) return;

    const base: Rule = {
      id: editingRuleId ?? `rule-${Date.now()}`,
      name: name.trim() || defaultRuleName(),
      enabled: editingRuleId ? rules.find((r) => r.id === editingRuleId)?.enabled ?? true : true,
      action,
      match: matchMode,
      conditions: conditions.map((c) => ({ ...c, value: c.value.trim() })),
      accountId,
      appliesTo,
      targetCategory,
    };

    if (editingRuleId) onUpdateRule(base);
    else onAddRule(base);
    resetForm();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header row — import / export / add */}
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={onExportRules}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
          title="Export rules to a .json file"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={() => importInputRef.current?.click()}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
          title="Import rules from a .json file"
        >
          <Upload className="w-4 h-4" />
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          className="hidden"
        />
        <button
          onClick={handleOpenAddForm}
          className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg border border-indigo-500/30 transition-colors"
          title="Add New Rule"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Main Run Action */}
      <div className="bg-slate-900/90 border border-indigo-500/20 rounded-xl p-3 mb-4 space-y-3">
        <button
          onClick={() => onRunRules(overrideExisting)}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Play className="w-4 h-4 fill-white" />
          Run Active Rules Now
        </button>

        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={overrideExisting}
            onChange={(e) => setOverrideExisting(e.target.checked)}
            className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
          />
          Overwrite existing categories
        </label>
      </div>

      {/* Add/Edit Rule Form */}
      {(showAddForm || editingRuleId) && (
        <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-indigo-500/40 rounded-xl p-3.5 mb-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300">
              {editingRuleId ? '✏️ Edit Smart Rule' : '➕ Create Auto-Rule'}
            </span>
            <button type="button" onClick={resetForm} className="text-xs text-slate-400 hover:text-white">
              Cancel
            </button>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">Rule Name (Optional)</label>
            <input
              type="text"
              placeholder={defaultRuleName()}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Scope */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="ALL">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Applies to</label>
              <select
                value={appliesTo}
                onChange={(e) => setAppliesTo(e.target.value as RuleAppliesTo)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="uncategorized">Uncategorized only</option>
                <option value="all">All transactions</option>
                <option value="categorized">Categorized only</option>
              </select>
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-slate-400">
                Conditions{' '}
                {conditions.length > 1 && (
                  <select
                    value={matchMode}
                    onChange={(e) => setMatchMode(e.target.value as 'all' | 'any')}
                    className="ml-1 bg-slate-800 border border-slate-700 text-slate-300 rounded px-1 py-0.5 text-[10px]"
                  >
                    <option value="all">match ALL</option>
                    <option value="any">match ANY</option>
                  </select>
                )}
              </label>
              <button
                type="button"
                onClick={() => setConditions((p) => [...p, emptyCondition()])}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add condition
              </button>
            </div>

            {conditions.length === 0 && (
              <p className="text-[11px] text-slate-500 italic">
                No conditions — matches every transaction in the selected scope.
              </p>
            )}

            {conditions.map((c, idx) => (
              <div key={idx} className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-2 space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={c.field}
                    onChange={(e) => updateCondition(idx, { field: e.target.value as ConditionField })}
                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-1.5 py-1 text-[11px] focus:outline-none"
                  >
                    <option value="description">Description</option>
                    <option value="amount">Amount</option>
                    <option value="date">Date</option>
                  </select>
                  <select
                    value={c.operator}
                    onChange={(e) => updateCondition(idx, { operator: e.target.value as ConditionOperator })}
                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-1.5 py-1 text-[11px] focus:outline-none"
                  >
                    {operatorsFor(c.field).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder={c.field === 'amount' ? 'e.g. 8.55' : 'e.g. Starbucks'}
                    value={c.value}
                    onChange={(e) => updateCondition(idx, { value: e.target.value })}
                    className="flex-1 bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-[11px] focus:outline-none"
                  />
                  {needsSecondValue(c.operator) && (
                    <input
                      type="text"
                      placeholder={c.operator === 'between' ? 'upper' : 'tol'}
                      value={c.value2 ?? ''}
                      onChange={(e) => updateCondition(idx, { value2: e.target.value })}
                      className="w-16 bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-[11px] focus:outline-none"
                    />
                  )}
                  {conditions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setConditions((p) => p.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Remove condition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {c.field === 'amount' && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={c.direction ?? 'either'}
                      onChange={(e) => updateCondition(idx, { direction: e.target.value as RuleCondition['direction'] })}
                      className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-1.5 py-1 text-[10px] focus:outline-none"
                    >
                      <option value="either">Money in or out</option>
                      <option value="out">Money out (debit)</option>
                      <option value="in">Money in (credit)</option>
                    </select>
                    {needsSecondValue(c.operator) && c.operator !== 'between' && (
                      <select
                        value={c.toleranceMode ?? 'percent'}
                        onChange={(e) =>
                          updateCondition(idx, { toleranceMode: e.target.value as RuleCondition['toleranceMode'] })
                        }
                        className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-1.5 py-1 text-[10px] focus:outline-none"
                      >
                        <option value="percent">tolerance %</option>
                        <option value="absolute">tolerance ₹</option>
                      </select>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action */}
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">Action</label>
            <select
              value={action}
              onChange={(e) => {
                const a = e.target.value as 'categorize' | 'exclude';
                setAction(a);
                setAppliesTo(a === 'exclude' ? 'all' : 'uncategorized');
              }}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="categorize">Set category</option>
              <option value="exclude">Exclude as internal transfer</option>
            </select>
          </div>

          {action === 'categorize' ? (
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Set Category To</label>
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-[11px] text-amber-300/80 bg-amber-950/20 border border-amber-500/20 rounded-lg px-2.5 py-2">
              Matching transactions are kept in the running balance but excluded from Total Expenses,
              Net, and the category charts.
            </p>
          )}

          {/* Live match preview */}
          <div className="text-[11px] text-slate-400 bg-slate-800/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5">
            Currently matches{' '}
            <strong className={liveCount > 0 ? 'text-emerald-300' : 'text-slate-300'}>
              {liveCount}
            </strong>{' '}
            transaction{liveCount === 1 ? '' : 's'}
            {!conditionsValid && <span className="text-rose-400"> — fill in every condition value</span>}
          </div>

          <button
            type="submit"
            disabled={!conditionsValid}
            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow"
          >
            {editingRuleId ? 'Update Rule' : 'Save Rule'}
          </button>
        </form>
      )}

      {/* Rules List */}
      <div className="space-y-2">
        {rules.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
            No rules added yet. Click + to add your first rule.
          </div>
        ) : (
          rules.map((rule) => {
            const conds = rule.conditions ?? (rule.field && rule.operator ? [{ field: rule.field, operator: rule.operator, value: rule.value ?? '' } as RuleCondition] : []);
            const isExclude = (rule.action ?? 'categorize') === 'exclude';
            return (
              <div
                key={rule.id}
                className={`p-3 rounded-xl border transition-all ${
                  editingRuleId === rule.id
                    ? 'bg-indigo-950/50 border-indigo-500 ring-1 ring-indigo-500'
                    : rule.enabled
                    ? 'bg-slate-900/60 border-slate-700/80 hover:border-slate-600'
                    : 'bg-slate-900/20 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleRule(rule.id)}
                      className={`p-0.5 rounded transition-colors ${
                        rule.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-600 hover:text-slate-400'
                      }`}
                      title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-semibold text-slate-200">{rule.name}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onRunSingleRule(rule.id, overrideExisting)}
                      className="text-slate-400 hover:text-emerald-300 p-1 transition-colors"
                      title="Run only this rule now"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEditForm(rule)}
                      className="text-slate-400 hover:text-indigo-300 p-1 transition-colors"
                      title="Edit Rule"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDuplicateRule(rule.id)}
                      className="text-slate-400 hover:text-indigo-300 p-1 transition-colors"
                      title="Duplicate Rule"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
                  <div>
                    <span className="text-slate-500">Scope:</span> {accountLabel(rule.accountId)}
                    <span className="text-slate-600"> · {rule.appliesTo ?? (isExclude ? 'all' : 'uncategorized')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">If:</span>{' '}
                    {conds.length === 0 ? (
                      <span className="italic text-slate-500">every transaction in scope</span>
                    ) : (
                      conds.map((c, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-indigo-400"> {(rule.match ?? 'all') === 'any' ? 'OR' : 'AND'} </span>}
                          <code className="text-[10px]">{describeCondition(c)}</code>
                        </span>
                      ))
                    )}
                  </div>
                  <div>
                    {isExclude ? (
                      <span className="text-amber-300 font-medium">Exclude as internal transfer</span>
                    ) : (
                      <>
                        <span className="text-slate-500">Assign:</span>{' '}
                        <span className="text-amber-300 font-medium">{rule.targetCategory}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
