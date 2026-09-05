import React from 'react';
import { Building2, Download, FileSpreadsheet, Sparkles, RefreshCw, Tag } from 'lucide-react';

interface HeaderProps {
  fileName?: string;
  txCount: number;
  annotatedCount: number;
  onExport: () => void;
  onLoadSample: () => void;
  onOpenCategoryManager: () => void;
  isUsingSample: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  fileName,
  txCount,
  annotatedCount,
  onExport,
  onLoadSample,
  onOpenCategoryManager,
  isUsingSample,
}) => {
  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 sm:px-8 py-3.5 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl shadow-md text-white">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white m-0 leading-none">
                Bank Statement Annotator
              </h1>
              <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full border border-indigo-500/30 font-medium">
                Pro
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {fileName ? (
                <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  {fileName} ({txCount} transactions)
                </span>
              ) : (
                'Upload bank Excel sheets to map, annotate & analyze transactions'
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          <button
            onClick={onOpenCategoryManager}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/70 border border-indigo-500/30 text-indigo-300 transition-colors"
          >
            <Tag className="w-3.5 h-3.5" />
            Manage Categories
          </button>

          <button
            onClick={onLoadSample}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-lg border transition-all duration-150 ${
              isUsingSample
                ? 'bg-blue-950/60 border-blue-600/50 text-blue-300 hover:bg-blue-900/60'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {isUsingSample ? <RefreshCw className="w-3.5 h-3.5 animate-spin-once" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            {isUsingSample ? 'Reload Sample Data' : 'Try Demo Data'}
          </button>

          <button
            onClick={onExport}
            disabled={txCount === 0}
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 border border-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
          >
            <Download className="w-4 h-4" />
            Export to Excel
            {txCount > 0 && (
              <span className="bg-emerald-700/80 text-emerald-100 text-[10px] px-1.5 py-0.2 rounded font-mono ml-0.5">
                {annotatedCount}/{txCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
