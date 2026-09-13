import React, { useState } from 'react';
import { X, FileSpreadsheet, Upload, AlertCircle, Check } from 'lucide-react';
import type { Rule } from '../types';
import { parseLookupFile } from '../utils/excelParser';

interface FileLookupRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: Rule | null;
  /** The app's full category list (used to populate the Category select — never the file's columns) */
  categories: string[];
  onRun: (
    ruleId: string,
    lookupRows: Record<string, any>[],
    matchColumn: string,
    category: string,
    overrideExisting: boolean
  ) => void;
}

type Step = 'upload' | 'map';
const CUSTOM = '__custom__';

function guessColumn(columns: string[], hint: string | undefined, keywords: string[]): string {
  if (hint && columns.includes(hint)) return hint;
  const lower = columns.map((c) => c.toLowerCase());
  const idx = lower.findIndex((c) => keywords.some((k) => c.includes(k)));
  return idx !== -1 ? columns[idx] : '';
}

/**
 * Upload → map the identifier column → pick a category → run flow for an
 * 'annotateFromFile' Smart Rule. The parsed file rows live only in this
 * component's state — closing the modal (or a successful run) discards them.
 * The category is one of the app's own categories (or a new custom one),
 * never read from the uploaded file.
 */
export const FileLookupRunModal: React.FC<FileLookupRunModalProps> = ({ isOpen, onClose, rule, categories, onRun }) => {
  const [step, setStep] = useState<Step>('upload');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [matchColumn, setMatchColumn] = useState('');
  const [category, setCategory] = useState('Uncategorized');
  const [customCategory, setCustomCategory] = useState('');
  const [overrideExisting, setOverrideExisting] = useState(false);

  const reset = () => {
    setStep('upload');
    setBusy(false);
    setError('');
    setFileName('');
    setColumns([]);
    setRows([]);
    setMatchColumn('');
    setCategory('Uncategorized');
    setCustomCategory('');
    setOverrideExisting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const parsed = await parseLookupFile(file);
      if (parsed.rows.length === 0) throw new Error('File contains no readable rows.');
      setFileName(parsed.fileName);
      setColumns(parsed.columns);
      setRows(parsed.rows);
      setMatchColumn(guessColumn(parsed.columns, rule?.matchColumnHint, ['id', 'reference', 'ref no', 'txn']));
      if (rule?.targetCategory && categories.includes(rule.targetCategory)) {
        setCategory(rule.targetCategory);
      }
      setStep('map');
    } catch (err: any) {
      setError(err.message || 'Failed to read that file.');
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen || !rule) return null;

  const sortedCategories = Array.from(new Set(categories))
    .filter((c) => c && c !== 'Uncategorized')
    .sort((a, b) => a.localeCompare(b));

  const usableCount = rows.filter((r) => String(r[matchColumn] ?? '').trim() !== '').length;
  const resolvedCategory = category === CUSTOM ? customCategory.trim() : category;

  const canRun = matchColumn !== '' && resolvedCategory !== '' && usableCount > 0;

  const handleConfirm = () => {
    if (!canRun) return;
    onRun(rule.id, rows, matchColumn, resolvedCategory, overrideExisting);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Run file lookup rule">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-100 truncate">{rule.name}</h2>
              <p className="text-xs text-slate-400">Annotate transactions from an uploaded file</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors shrink-0" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 'upload' && (
            <>
              <p className="text-xs text-slate-400">
                Upload a spreadsheet with an identifier column — its values are matched as a
                substring of each transaction's description. The file's contents are used for this
                run only; they are not saved.
              </p>
              <label className="block border-2 border-dashed border-slate-600 hover:border-indigo-500/60 bg-slate-800/40 rounded-xl p-8 text-center cursor-pointer transition-all">
                <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-200 mb-1">
                  {busy ? 'Reading file…' : 'Click to select a file'}
                </p>
                <p className="text-xs text-slate-500">Accepts .xlsx and .xls</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) handleFile(f);
                  }}
                />
              </label>
              {error && (
                <p className="text-xs text-rose-300 bg-rose-950/30 border border-rose-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </p>
              )}
            </>
          )}

          {step === 'map' && (
            <>
              <p className="text-xs text-slate-400">
                <span className="text-slate-200 font-medium">{fileName}</span> — {rows.length} row{rows.length === 1 ? '' : 's'} parsed
              </p>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Identifier column</label>
                <select
                  value={matchColumn}
                  onChange={(e) => setMatchColumn(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Select…</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Matched as a substring of the description</p>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Uncategorized">Uncategorized</option>
                  {sortedCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value={CUSTOM}>✏️ Custom…</option>
                </select>
                {category === CUSTOM && (
                  <input
                    type="text"
                    autoFocus
                    placeholder="New category name…"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="mt-1.5 w-full bg-slate-800 border border-indigo-500 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  />
                )}
                <p className="text-[10px] text-slate-500 mt-1">Assigned to every matching transaction, from the app's own category list</p>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-800/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5">
                <strong className={usableCount > 0 ? 'text-emerald-300' : 'text-slate-300'}>{usableCount}</strong>{' '}
                of {rows.length} row{rows.length === 1 ? '' : 's'} have an identifier and will be matched against
                {' '}<span className="text-slate-300">{resolvedCategory || '…'}</span>.
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={overrideExisting}
                  onChange={(e) => setOverrideExisting(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                Overwrite already-categorized transactions
              </label>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => { setStep('upload'); setError(''); }}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  ← Choose a different file
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!canRun}
                  className="ml-auto inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow"
                >
                  <Check className="w-3.5 h-3.5" />
                  Run annotation
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
