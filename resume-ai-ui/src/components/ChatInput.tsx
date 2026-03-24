"use client";

import { useEffect, useRef, useState, KeyboardEvent, FormEvent } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";

interface ChatInputProps {
  onSend: (value: string) => void;
  loading?: boolean;
}

export function ChatInput({ onSend, loading = false }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const send = () => {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading) send();
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loading) send();
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel rounded-[28px] px-4 py-4 sm:px-5"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">
          <span className="text-slate-300">Ask The Document Agent</span>
          <span className="text-slate-500">Enter to send • Shift+Enter for newline</span>
        </div>

        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about themes, evidence, sections, entities, or key findings..."
            disabled={loading}
            rows={1}
            className="max-h-40 min-h-[52px] w-full resize-none rounded-[22px] border border-white/6 bg-white/[0.03] px-4 py-3 text-[15px] text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-amber-300/30 focus:bg-white/[0.05]"
          />
          <button
            type="submit"
            disabled={loading || !value.trim()}
            className="flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(246,196,100,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            {loading ? "Sending" : "Send"}
          </button>
        </div>
      </div>
    </form>
  );
}
