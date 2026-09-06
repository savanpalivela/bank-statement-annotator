import React, { useEffect, useRef, useState } from 'react';
import { MessageSquareText, MessageSquarePlus } from 'lucide-react';

interface TransactionNoteButtonProps {
  note: string;
  /** Persist the note. An empty string clears it. */
  onSave: (note: string) => void;
}

const POP_WIDTH = 300;
const POP_EST_HEIGHT = 210;

/**
 * A per-row icon that opens a small bubble with a textarea for a transaction note.
 * The icon is highlighted when a note exists; hovering it shows the note as a tooltip.
 */
export const TransactionNoteButton: React.FC<TransactionNoteButtonProps> = ({ note, onSave }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(note);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const hasNote = note.trim().length > 0;

  // Position the (fixed) bubble next to the button whenever it opens.
  useEffect(() => {
    if (!open) return;
    setDraft(note);
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    let left = Math.min(r.right - POP_WIDTH, window.innerWidth - POP_WIDTH - 8);
    left = Math.max(8, left);
    let top = r.bottom + 6;
    if (top + POP_EST_HEIGHT > window.innerHeight) {
      top = Math.max(8, r.top - POP_EST_HEIGHT - 6);
    }
    setPos({ top, left });
  }, [open, note]);

  // Dismiss on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popRef.current && !popRef.current.contains(target) &&
        btnRef.current && !btnRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== note.trim()) onSave(trimmed);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        title={hasNote ? note : 'Add a note'}
        aria-label={hasNote ? `Edit note: ${note}` : 'Add a note'}
        className={`p-1 rounded transition-colors ${
          hasNote
            ? 'text-amber-400 hover:text-amber-300'
            : 'text-slate-600 hover:text-slate-300'
        }`}
      >
        {hasNote ? (
          <MessageSquareText className="w-3.5 h-3.5" />
        ) : (
          <MessageSquarePlus className="w-3.5 h-3.5" />
        )}
      </button>

      {open && pos && (
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: POP_WIDTH, zIndex: 60 }}
          className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Transaction note
            </span>
            {hasNote && (
              <button
                onClick={() => {
                  onSave('');
                  setOpen(false);
                }}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-medium"
              >
                Delete
              </button>
            )}
          </div>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit();
            }}
            rows={4}
            placeholder="Add a comment for this transaction…"
            className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-2 text-xs resize-y focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">⌘/Ctrl + Enter to save</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpen(false)}
                className="text-[11px] text-slate-400 hover:text-white px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={commit}
                className="text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
