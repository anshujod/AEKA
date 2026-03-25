"use client";

import { useState } from "react";

export interface SourceItem {
  title: string;
  snippet: string;
  confidence?: number;
}

interface SourcePanelProps {
  sources: SourceItem[];
}

export function SourcePanel({ sources }: SourcePanelProps) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03] text-xs text-slate-200 shadow-[0_18px_45px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Sources</span>
        <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100">
          {sources.length}
        </span>
      </button>
      {open && (
        <div className="divide-y divide-white/6">
          {sources.map((s, idx) => (
            <div key={`${s.title}-${idx}`} className="space-y-1 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100">{s.title || `Source ${idx + 1}`}</span>
                {typeof s.confidence === "number" && (
                  <span className="text-[11px] text-slate-400">{(s.confidence * 100).toFixed(0)}%</span>
                )}
              </div>
              <p className="text-slate-300 leading-relaxed">{s.snippet}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
