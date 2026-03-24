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
    "Summarize the indexed documents in 3 sharp bullet points.",
    "What are the main themes or findings across these documents?",
    "Which sections seem most important for a first-time reader?",
    "What evidence in the documents supports the main conclusion?"
  ];
  const featureNotes = [
    {
      title: "Memory-aware responses",
      text: "The agent keeps track of useful facts and follows context across turns.",
      icon: SparklesIcon
    },
    {
      title: "Hybrid retrieval",
      text: "Dense search, BM25, reranking, and grounding work together behind the scenes.",
      icon: CpuChipIcon
    },
    {
      title: "Fast local workflow",
      text: "Use this UI to probe responses while iterating on prompts, retrievers, and models.",
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
                AEKA Document Studio
              </span>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
                Retrieval + Memory
              </span>
            </div>

            <div className="max-w-3xl space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[3.1rem] lg:leading-[1.05]">
                Explore your documents like a knowledge system, not a flat file dump.
              </h1>
              <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
                This workspace turns your RAG agent into a sharper document console. Ask focused questions, inspect streamed replies, and keep answers grounded in the indexed corpus.
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
            {featureNotes.map(({ title, text, icon: Icon }) => (
              <article
                key={title}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.16)]"
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-300/10 to-cyan-300/10">
                  <Icon className="h-5 w-5 text-amber-100" />
                </div>
                <h2 className="text-sm font-semibold text-white">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.75fr)_320px]">
        <div className="glass-panel rise-in flex min-h-[68vh] flex-col overflow-hidden rounded-[34px]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-5 py-4 sm:px-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Conversation Console</p>
              <h2 className="text-lg font-semibold text-white">Ask anything about your documents</h2>
            </div>
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
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Start Here</p>
                        <h3 className="text-xl font-semibold text-white">Explore the corpus with sharper prompts</h3>
                      </div>
                    </div>
                    <p className="max-w-2xl text-sm leading-7 text-slate-300">
                      Try asking for summaries, comparisons, evidence checks, or section-level explanations. The interface is tuned for exploratory back-and-forth, not just a single question box.
                    </p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {promptIdeas.map((prompt, idx) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => runPrompt(prompt)}
                          disabled={loading}
                          className="rounded-[22px] border border-white/10 bg-slate-950/40 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-cyan-300/10 disabled:opacity-50"
                        >
                          <span className="mb-2 inline-flex rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                            Prompt {idx + 1}
                          </span>
                          <p className="text-sm text-slate-100">{prompt}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Tone</p>
                      <p className="mt-2 text-sm text-slate-200">Grounded, concise, and document-aware.</p>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Best for</p>
                      <p className="mt-2 text-sm text-slate-200">Reports, articles, notes, manuals, research papers, and quick summaries.</p>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Flow</p>
                      <p className="mt-2 text-sm text-slate-200">Ask, refine, compare, and iterate with fast streamed output.</p>
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
            <h2 className="text-xl font-semibold text-white">Guide the conversation</h2>
            <p className="text-sm text-slate-300">
              Use these shortcuts when you want to probe the quality of retrieval, summarization, or grounding.
            </p>
          </div>

          <div className="space-y-3">
            {promptIdeas.map((prompt, idx) => (
              <button
                key={prompt}
                type="button"
                onClick={() => runPrompt(prompt)}
                disabled={loading}
                className="w-full rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition hover:border-amber-300/30 hover:bg-amber-300/10 disabled:opacity-50"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Prompt {idx + 1}</span>
                  <span className="text-xs text-slate-400">Run</span>
                </div>
                <p className="text-sm leading-6 text-slate-100">{prompt}</p>
              </button>
            ))}
          </div>

          <div className="rounded-[26px] border border-cyan-300/15 bg-cyan-300/[0.05] p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/70">System Snapshot</p>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs text-slate-500">Backend</p>
                <p className="text-sm font-medium text-slate-100">Streaming FastAPI chat endpoint</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Interface</p>
                <p className="text-sm font-medium text-slate-100">Next.js shell tuned for iterative question flow</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Best next UI step</p>
                <p className="text-sm font-medium text-slate-100">Wire source chunks and memory events into the side rail</p>
              </div>
            </div>
          </div>

          <div className="mt-auto rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Live Status</p>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.65)]" />
            </div>
            <div
              className="mt-3 h-px origin-left bg-gradient-to-r from-amber-300 via-cyan-300 to-transparent"
              style={{ animation: "pulse-line 2.8s ease-in-out infinite" }}
            />
            <p className="mt-3 text-sm leading-6 text-slate-300">
              The chat area stays focused on the transcript while this panel holds shortcuts and system-level context.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
