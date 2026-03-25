"use client";

import { useMemo, useRef } from "react";
import {
  BoltIcon,
  CommandLineIcon,
  CpuChipIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import { sendMessageStream } from "../api/chat";
import { ChatInput } from "../components/ChatInput";
import { MessageBubble } from "../components/MessageBubble";
import { SourcePanel } from "../components/SourcePanel";
import { ThinkingDots } from "../components/ThinkingDots";
import { useChatState } from "../hooks/useChatState";

export default function Page() {
  const {
    messages,
    loading,
    setLoading,
    appendMessage,
    updateLastMessage
  } = useChatState();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const empty = useMemo(() => messages.length === 0, [messages.length]);
  const promptIdeas = [
    "Summarize these documents.",
    "What matters most here?",
    "Which sections should I read first?",
    "What supports the main claim?"
  ];
  const featureNotes = [
    {
      title: "Memory",
      icon: SparklesIcon
    },
    {
      title: "Retrieval",
      icon: CpuChipIcon
    },
    {
      title: "Speed",
      icon: BoltIcon
    }
  ];

  const runPrompt = (prompt: string) => {
    if (loading) return;
    void handleSend(prompt);
  };

  const scrollToBottom = () => {
    const el = scrollerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  };

  const handleSend = async (content: string) => {
    if (loading) return;
    appendMessage({ role: "user", content });
    setLoading(true);
    appendMessage({ role: "assistant", content: "" });
    scrollToBottom();

    try {
      let buffer = "";
      await sendMessageStream(content, (chunk) => {
        buffer += chunk;
        updateLastMessage(buffer);
        scrollToBottom();
      });
      if (!buffer.trim()) {
        updateLastMessage("No response from server.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      updateLastMessage(`Error: ${msg}`);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-3rem)] flex-1 flex-col gap-6">
      <header className="glass-panel rise-in overflow-hidden rounded-[34px]">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.5fr_0.95fr] lg:p-7">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100">
                AEKA
              </span>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
                Docs Chat
              </span>
            </div>

            <div className="max-w-3xl space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[3.1rem] lg:leading-[1.05]">
                Chat with your documents.
              </h1>
              <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
                Search, ask, verify.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {promptIdeas.slice(0, 3).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => runPrompt(prompt)}
                  disabled={loading}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200 transition hover:border-amber-300/30 hover:bg-amber-300/10 hover:text-white disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {featureNotes.map(({ title, icon: Icon }) => (
              <article
                key={title}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.16)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-300/10 to-cyan-300/10">
                  <Icon className="h-5 w-5 text-amber-100" />
                </div>
                <h2 className="mt-3 text-sm font-semibold text-white">{title}</h2>
              </article>
            ))}
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.75fr)_320px]">
        <div className="glass-panel rise-in flex min-h-[68vh] flex-col overflow-hidden rounded-[34px]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-white">Chat</h2>
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100">
                {loading ? "Streaming" : "Ready"}
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                {messages.length} messages
              </div>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden">
            <div
              ref={scrollerRef}
              className="soft-scroll absolute inset-0 space-y-5 overflow-y-auto px-4 py-5 sm:px-6"
            >
              {empty ? (
                <div className="rise-in mx-auto flex max-w-3xl flex-col gap-6 py-8">
                  <div className="rounded-[30px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-orange-300 to-rose-300 text-slate-950">
                        <CommandLineIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Start</p>
                        <h3 className="text-xl font-semibold text-white">Pick a prompt</h3>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {promptIdeas.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => runPrompt(prompt)}
                          disabled={loading}
                          className="rounded-[22px] border border-white/10 bg-slate-950/40 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-cyan-300/10 disabled:opacity-50"
                        >
                          <p className="text-sm text-slate-100">{prompt}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div key={`${m.role}-${idx}-${m.content.slice(0, 8)}`} className="rise-in space-y-2">
                    <MessageBubble role={m.role} content={m.content} />
                    {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                      <SourcePanel sources={m.sources} />
                    )}
                  </div>
                ))
              )}
              {loading && <ThinkingDots />}
            </div>
          </div>

          <div className="border-t border-white/6 px-4 py-4 sm:px-6">
            <ChatInput onSend={handleSend} loading={loading} />
          </div>
        </div>

        <aside className="glass-panel rise-in flex flex-col gap-4 rounded-[34px] p-5 sm:p-6">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Quick Prompts</p>
            <h2 className="text-xl font-semibold text-white">Shortcuts</h2>
          </div>

          <div className="space-y-3">
            {promptIdeas.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => runPrompt(prompt)}
                disabled={loading}
                className="w-full rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition hover:border-amber-300/30 hover:bg-amber-300/10 disabled:opacity-50"
              >
                <p className="text-sm leading-6 text-slate-100">{prompt}</p>
              </button>
            ))}
          </div>

          <div className="mt-auto rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Status</p>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.65)]" />
            </div>
            <div
              className="mt-3 h-px origin-left bg-gradient-to-r from-amber-300 via-cyan-300 to-transparent"
              style={{ animation: "pulse-line 2.8s ease-in-out infinite" }}
            />
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
              <span className="rounded-full border border-white/10 px-2.5 py-1">FastAPI</span>
              <span className="rounded-full border border-white/10 px-2.5 py-1">Next.js</span>
              <span className="rounded-full border border-white/10 px-2.5 py-1">
                {loading ? "Busy" : "Ready"}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
