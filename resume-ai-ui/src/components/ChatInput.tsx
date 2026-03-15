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
      className="flex items-end gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 px-4 py-3 shadow-xl shadow-black/30 backdrop-blur"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message..."
        disabled={loading}
        rows={1}
        className="max-h-40 w-full resize-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-50 shadow-lg shadow-sky-500/40 transition hover:translate-y-[-1px] hover:shadow-sky-500/60 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <PaperAirplaneIcon className="h-4 w-4" />
        Send
      </button>
    </form>
  );
}
