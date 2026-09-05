import React, { useEffect } from 'react';
import { X, Zap } from 'lucide-react';
import { RuleEngineSidebar } from './RuleEngineSidebar';
import type { Rule } from '../types';

interface SmartRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: Rule[];
  categories: string[];
  onAddRule: (rule: Rule) => void;
  onUpdateRule: (rule: Rule) => void;
  onDeleteRule: (id: string) => void;
  onToggleRule: (id: string) => void;
  onRunRules: (overrideExisting: boolean) => void;
}

export const SmartRulesModal: React.FC<SmartRulesModalProps> = ({
  isOpen,
  onClose,
  rules,
  categories,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onToggleRule,
  onRunRules,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Smart Rules"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Smart Rules</h2>
              <p className="text-xs text-slate-400">Auto-annotate transactions by rule</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body — renders the sidebar content without its own wrapper card */}
        <div className="flex-1 overflow-y-auto p-5">
          <RuleEngineSidebar
            rules={rules}
            categories={categories}
            onAddRule={onAddRule}
            onUpdateRule={onUpdateRule}
            onDeleteRule={onDeleteRule}
            onToggleRule={onToggleRule}
            onRunRules={(override) => {
              onRunRules(override);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};
