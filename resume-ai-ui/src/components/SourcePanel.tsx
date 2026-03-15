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
    <div className="mt-2 rounded-xl border border-slate-800/80 bg-slate-900/70 text-xs text-slate-200 shadow-inner shadow-black/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left font-semibold text-slate-100"
      >
        Sources
        <span className="text-[10px] text-slate-400">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="divide-y divide-slate-800/80">
          {sources.map((s, idx) => (
            <div key={`${s.title}-${idx}`} className="px-3 py-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100">{s.title || `Source ${idx + 1}`}</span>
                {typeof s.confidence === "number" && (
                  <span className="text-[11px] text-slate-400">Confidence: {(s.confidence * 100).toFixed(0)}%</span>
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
