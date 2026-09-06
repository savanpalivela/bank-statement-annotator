import React, { useRef, useState } from 'react';
import type { CategoryStructure } from '../types';
import { Tag, Plus, Pencil, Trash2, X, Check, TrendingDown, TrendingUp, Download, Upload } from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryStructure;
  onAddCategory: (type: 'income' | 'expense', category: string) => void;
  onUpdateCategory: (type: 'income' | 'expense', oldCategory: string, newCategory: string) => void;
  onDeleteCategory: (type: 'income' | 'expense', category: string) => void;
  onExportCategories: () => void;
  onImportCategories: (text: string) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onExportCategories,
  onImportCategories,
}) => {
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImportCategories(String(reader.result || ''));
    reader.onerror = () => onImportCategories('');
    reader.readAsText(file);
  };
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentCategories = activeTab === 'expense' ? categories.expense : categories.income;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    if (currentCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setError(`Category "${trimmed}" already exists in ${activeTab}s.`);
      return;
    }

    setError(null);
    onAddCategory(activeTab, trimmed);
    setNewCatName('');
  };

  const handleStartEdit = (cat: string) => {
    setEditingCat(cat);
    setEditCatName(cat);
    setError(null);
  };

  const handleSaveEdit = (oldCat: string) => {
    const trimmed = editCatName.trim();
    if (!trimmed || trimmed === oldCat) {
      setEditingCat(null);
      return;
    }

    if (
      currentCategories.some(
        (c) => c.toLowerCase() === trimmed.toLowerCase() && c.toLowerCase() !== oldCat.toLowerCase()
      )
    ) {
      setError(`Category "${trimmed}" already exists in ${activeTab}s.`);
      return;
    }

    setError(null);
    onUpdateCategory(activeTab, oldCat, trimmed);
    setEditingCat(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 m-0">Category Manager</h3>
              <p className="text-xs text-slate-400">Manage separate Expense and Income categories</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Expense vs Income Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 p-1.5 gap-1.5">
          <button
            onClick={() => {
              setActiveTab('expense');
              setError(null);
              setEditingCat(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'expense'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40 shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <TrendingDown className="w-4 h-4 text-rose-400" />
            Expense Categories ({categories.expense.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('income');
              setError(null);
              setEditingCat(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'income'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Income Categories ({categories.income.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Add Category Form */}
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Enter new ${activeTab} category name...`}
              value={newCatName}
              onChange={(e) => {
                setNewCatName(e.target.value);
                setError(null);
              }}
              className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newCatName.trim()}
              className={`px-3.5 py-2 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                activeTab === 'expense'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Plus className="w-4 h-4" />
              Add {activeTab === 'expense' ? 'Expense' : 'Income'} Category
            </button>
          </form>

          {error && (
            <div className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30">
              {error}
            </div>
          )}

          {/* Categories List */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Available {activeTab === 'expense' ? 'Expense' : 'Income'} Categories ({currentCategories.length})
            </label>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {currentCategories.map((cat) => {
                const isProtected = cat === 'Uncategorized';
                const isEditing = editingCat === cat;

                return (
                  <div
                    key={cat}
                    className="flex items-center justify-between p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs hover:border-slate-600 transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          autoFocus
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(cat);
                            if (e.key === 'Escape') setEditingCat(null);
                          }}
                          className="flex-1 bg-slate-900 border border-indigo-500 text-slate-100 rounded-lg px-2 py-1 text-xs focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveEdit(cat)}
                          className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md"
                          title="Save Category Name"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingCat(null)}
                          className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span
                          className={`font-medium ${
                            isProtected ? 'text-slate-500 italic' : 'text-slate-200'
                          }`}
                        >
                          {cat} {isProtected && '(Default)'}
                        </span>

                        {!isProtected && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartEdit(cat)}
                              className="p-1 text-slate-400 hover:text-indigo-300 rounded-md transition-colors"
                              title="Edit Category Name"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteCategory(activeTab, cat)}
                              className="p-1 text-slate-400 hover:text-rose-400 rounded-md transition-colors"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onExportCategories}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Export categories to a .json file"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Import categories from a .json file"
            >
              <Upload className="w-3.5 h-3.5" />
              Import
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
