import React, { useEffect } from 'react';
import { X, Sliders } from 'lucide-react';
import { ColumnMapper } from './ColumnMapper';
import type { ColumnMapping } from '../types';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: string[];
  mapping: ColumnMapping;
  onChangeMapping: (newMapping: ColumnMapping) => void;
  onApplyMapping: () => void;
  /** Which account this mapping belongs to (shown in the header) */
  accountLabel?: string;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  isOpen,
  onClose,
  columns,
  mapping,
  onChangeMapping,
  onApplyMapping,
  accountLabel,
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
      aria-label="Smart Column Mapping"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Smart Column Mapping{accountLabel ? ` — ${accountLabel}` : ''}
              </h2>
              <p className="text-xs text-slate-400">
                Map spreadsheet columns to transaction attributes
              </p>
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5">
          <ColumnMapper
            columns={columns}
            mapping={mapping}
            onChangeMapping={onChangeMapping}
            onApplyMapping={() => {
              onApplyMapping();
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};
