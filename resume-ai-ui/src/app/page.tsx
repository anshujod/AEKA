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
  const featureNotes = [
    {
      title: "Memory",
      tone: "from-amber-300/20 to-orange-300/5",
      icon: SparklesIcon
    },
    {
      title: "Retrieval",
      tone: "from-cyan-300/20 to-sky-300/5",
      icon: CpuChipIcon
    },
    {
      title: "Speed",
      tone: "from-rose-300/20 to-orange-300/5",
      icon: BoltIcon
    }
  ];
  const overviewTiles = [
    {
      label: "Messages",
      value: String(messages.length).padStart(2, "0")
    },
    {
      label: "State",
      value: loading ? "Live" : "Ready"
    },
    {
      label: "View",
      value: empty ? "Idle" : "Chat"
    },
    {
      label: "Focus",
      value: "Docs"
    }
  ];
  const signalBars = [32, 58, 44, 72, 51, 66];

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

            <div className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {overviewTiles.map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3"
                >
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    {tile.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">{tile.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(103,214,255,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(246,196,100,0.12),transparent_32%)]" />
            <div className="relative flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Workspace</p>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.7)]" />
              </div>

              <div className="flex items-center justify-between gap-5">
                <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-white/10" />
                  <div className="absolute inset-[12%] rounded-full border border-cyan-300/20" />
                  <div className="absolute inset-[24%] rounded-full border border-amber-300/20" />
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-orange-300 to-rose-300 text-slate-950 shadow-[0_18px_40px_rgba(246,196,100,0.22)]">
                    <CommandLineIcon className="h-7 w-7" />
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  {featureNotes.map(({ title, tone, icon: Icon }) => (
                    <article
                      key={title}
                      className="rounded-[22px] border border-white/10 bg-slate-950/30 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br ${tone}`}
                          >
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <p className="text-sm font-semibold text-white">{title}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-white/30" />
                          <span className="h-2 w-2 rounded-full bg-white/50" />
                          <span className="h-2 w-2 rounded-full bg-white/80" />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
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
                <div className="rise-in mx-auto flex min-h-full w-full max-w-4xl items-center justify-center py-6">
                  <div className="grid w-full gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(246,196,100,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(103,214,255,0.14),transparent_26%)]" />
                      <div className="relative">
                        <div className="mb-5 flex items-center gap-4">
                          <div className="relative flex h-16 w-16 items-center justify-center">
                            <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-amber-300 via-orange-300 to-rose-300 opacity-90 blur-[1px]" />
                            <div className="relative flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-950/70 text-white">
                              <CommandLineIcon className="h-8 w-8" />
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Start</p>
                            <h3 className="text-2xl font-semibold text-white">Ready when you are</h3>
                          </div>
                        </div>

                        <p className="max-w-md text-sm text-slate-300">
                          Use the input below to begin.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-3">
                          {["Search", "Compare", "Trace"].map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5">
                      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Signal</p>
                          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                            Calm
                          </span>
                        </div>
                        <div className="mt-5 flex items-end gap-2">
                          {signalBars.map((height, index) => (
                            <span
                              key={`${height}-${index}`}
                              className="flex-1 rounded-full bg-gradient-to-t from-cyan-300/20 via-cyan-200/40 to-white/80"
                              style={{ height: `${height}px` }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {overviewTiles.slice(0, 4).map((tile) => (
                          <div
                            key={tile.label}
                            className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4"
                          >
                            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                              {tile.label}
                            </p>
                            <p className="mt-2 text-base font-semibold text-white">{tile.value}</p>
                          </div>
                        ))}
                      </div>
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
          <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Overview</p>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                Live
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {overviewTiles.map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-[20px] border border-white/8 bg-slate-950/30 px-3 py-3"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    {tile.label}
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">{tile.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Flow</p>
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Visual</span>
            </div>
            <div className="mt-5 space-y-3">
              {[72, 54, 68].map((width, index) => (
                <div key={`${width}-${index}`} className="space-y-2">
                  <div className="h-2 rounded-full bg-white/5">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-amber-300 via-orange-300 to-cyan-300"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <div className="h-2 rounded-full bg-white/5">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-white/90"
                      style={{ width: `${Math.max(24, width - 22)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
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
