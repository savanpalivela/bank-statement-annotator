import React, { useState } from 'react';
import type { Rule } from '../types';
import { Plus, Trash2, CheckCircle2, Play, AlertCircle, Pencil } from 'lucide-react';

interface RuleEngineSidebarProps {
  rules: Rule[];
  categories: string[];
  onAddRule: (rule: Rule) => void;
  onUpdateRule: (rule: Rule) => void;
  onDeleteRule: (id: string) => void;
  onToggleRule: (id: string) => void;
  onRunRules: (overrideExisting: boolean) => void;
}

export const RuleEngineSidebar: React.FC<RuleEngineSidebarProps> = ({
  rules,
  categories,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onToggleRule,
  onRunRules,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [overrideExisting, setOverrideExisting] = useState(true);

  // Form State for Create / Edit
  const [name, setName] = useState('');
  const [field, setField] = useState<'description' | 'amount' | 'date'>('description');
  const [operator, setOperator] = useState<'contains' | 'equals' | 'startsWith' | 'greaterThan' | 'lessThan'>('contains');
  const [value, setValue] = useState('');
  const [targetCategory, setTargetCategory] = useState(categories[0] || 'Uncategorized');

  const resetForm = () => {
    setName('');
    setField('description');
    setOperator('contains');
    setValue('');
    setTargetCategory(categories[0] || 'Uncategorized');
    setShowAddForm(false);
    setEditingRuleId(null);
  };

  const handleOpenAddForm = () => {
    setEditingRuleId(null);
    resetForm();
    setShowAddForm(true);
  };

  const handleOpenEditForm = (rule: Rule) => {
    setShowAddForm(false);
    setEditingRuleId(rule.id);
    setName(rule.name);
    setField(rule.field);
    setOperator(rule.operator);
    setValue(rule.value);
    setTargetCategory(rule.targetCategory);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    if (editingRuleId) {
      // Editing existing rule
      const existingRule = rules.find((r) => r.id === editingRuleId);
      const updatedRule: Rule = {
        id: editingRuleId,
        name: name.trim() || `${field} ${operator} "${value}"`,
        field,
        operator,
        value: value.trim(),
        targetCategory,
        enabled: existingRule ? existingRule.enabled : true,
      };
      onUpdateRule(updatedRule);
    } else {
      // Creating new rule
      const newRule: Rule = {
        id: `rule-${Date.now()}`,
        name: name.trim() || `${field} ${operator} "${value}"`,
        field,
        operator,
        value: value.trim(),
        targetCategory,
        enabled: true,
      };
      onAddRule(newRule);
    }

    resetForm();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header row — Add Rule button */}
      <div className="flex items-center justify-end">
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
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">Rule Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Starbucks Coffee"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Target Field</label>
              <select
                value={field}
                onChange={(e) => setField(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="description">Description</option>
                <option value="amount">Amount</option>
                <option value="date">Date</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Operator</label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="contains">Contains</option>
                <option value="equals">Equals</option>
                <option value="startsWith">Starts With</option>
                {field === 'amount' && <option value="greaterThan">Greater Than</option>}
                {field === 'amount' && <option value="lessThan">Less Than</option>}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">Match Value *</label>
            <input
              type="text"
              required
              placeholder="e.g. Starbucks"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

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

          <button
            type="submit"
            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow"
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
          rules.map((rule) => (
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
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold text-slate-200">{rule.name}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditForm(rule)}
                    className="text-slate-400 hover:text-indigo-300 p-1 transition-colors"
                    title="Edit Rule"
                  >
                    <Pencil className="w-3.5 h-3.5" />
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
                  <span className="text-slate-500">If:</span> <code className="text-[10px]">{rule.field}</code>{' '}
                  <span className="text-indigo-400">{rule.operator}</span> "{rule.value}"
                </div>
                <div>
                  <span className="text-slate-500">Assign:</span>{' '}
                  <span className="text-amber-300 font-medium">{rule.targetCategory}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
