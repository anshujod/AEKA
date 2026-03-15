export type MessageRole = "user" | "assistant";

interface MessageBubbleProps {
  role: MessageRole;
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg",
          "max-w-[75%]",
          isUser
            ? "bg-gradient-to-br from-sky-500 to-indigo-500 text-sky-50 shadow-sky-500/30"
            : "bg-slate-800 text-slate-100 shadow-black/30"
        ].join(" ")}
      >
        {content}
      </div>
    </div>
  );
}
