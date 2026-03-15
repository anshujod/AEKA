"use client";

import { useCallback, useState } from "react";
import type { MessageRole } from "../components/MessageBubble";
import type { SourceItem } from "../components/SourcePanel";

export interface ChatMessage {
  role: MessageRole;
  content: string;
  sources?: SourceItem[];
}

export function useChatState(initialMessages: ChatMessage[] = []) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [loading, setLoading] = useState(false);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateLastMessage = useCallback((content: string) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], content };
      return next;
    });
  }, []);

  const sendUserMessage = useCallback((content: string) => {
    appendMessage({ role: "user", content });
    // Placeholder: backend call would go here.
  }, [appendMessage]);

  return {
    messages,
    loading,
    setLoading,
    appendMessage,
    updateLastMessage,
    sendUserMessage,
    setMessages
  };
}
