"use client";

import { useState } from "react";

export interface MemoryEntry {
  id: string;
  text: string;
  timestamp: string;
}

interface MemoryTimelineProps {
  entries: MemoryEntry[];
  onEdit?: (id: string, text: string) => void;
}

export function MemoryTimeline({ entries, onEdit }: MemoryTimelineProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setDraft(text);
  };

  const save = () => {
    if (editingId && onEdit) {
      onEdit(editingId, draft.trim());
    }
    setEditingId(null);
    setDraft("");
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 shadow-lg shadow-black/30">
      <header className="text-sm font-semibold text-slate-100">Memory</header>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {entries.length === 0 && <p className="text-xs text-slate-500">No facts stored yet.</p>}
        {entries.map((m) => (
          <div key={m.id} className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-3 text-xs text-slate-200 shadow-inner shadow-black/30">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] text-slate-500">{m.timestamp}</span>
              <button
                type="button"
                className="text-[11px] text-sky-400 hover:text-sky-300"
                onClick={() => startEdit(m.id, m.text)}
              >
                Edit
              </button>
            </div>
            {editingId === m.id ? (
              <div className="mt-2 space-y-2">
                <textarea
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900/70 p-2 text-slate-100 outline-none"
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button
                    className="text-[11px] text-slate-400"
                    type="button"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-full bg-sky-500 px-3 py-1 text-[11px] font-semibold text-sky-50 shadow-sky-500/50"
                    type="button"
                    onClick={save}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2 leading-relaxed">{m.text}</p>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
