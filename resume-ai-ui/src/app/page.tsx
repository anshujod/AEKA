"use client";

import { useMemo, useRef } from "react";
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

  const scrollToBottom = () => {
    const el = scrollerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  };

  const handleSend = async (content: string) => {
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
    <section className="flex h-full min-h-[80vh] flex-1 flex-col gap-4">
      <div className="flex min-h-[70vh] flex-1 flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 shadow-lg">
        <header className="text-base font-semibold text-slate-200">Resume AI</header>

        <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-800/60 bg-slate-950/40 min-h-[320px]">
          <div
            ref={scrollerRef}
            className="absolute inset-0 space-y-4 overflow-y-auto px-4 py-3"
          >
            {empty ? (
              <p className="pt-6 text-center text-sm text-slate-400">Ask anything about Anshu</p>
            ) : (
              messages.map((m, idx) => (
                <div key={`${m.role}-${idx}-${m.content.slice(0, 8)}`} className="space-y-2">
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

        <ChatInput onSend={handleSend} loading={loading} />
      </div>
    </section>
  );
}
