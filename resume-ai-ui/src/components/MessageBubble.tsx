export type MessageRole = "user" | "assistant";

interface MessageBubbleProps {
  role: MessageRole;
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[88%] flex-col space-y-2 sm:max-w-[78%] ${isUser ? "items-end" : "items-start"}`}>
        <div className={`flex items-center gap-2 px-1 text-[10px] uppercase tracking-[0.24em] ${isUser ? "justify-end text-orange-200/80" : "text-cyan-100/80"}`}>
          <span
            className={[
              "rounded-full border px-2.5 py-1 font-semibold",
              isUser
                ? "border-orange-300/30 bg-orange-300/10 text-orange-100"
                : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
            ].join(" ")}
          >
            {isUser ? "You" : "AEKA"}
          </span>
          <span className="text-slate-500">{isUser ? "Prompt" : "Response"}</span>
        </div>

        <div
          className={[
            "whitespace-pre-wrap rounded-[26px] border px-4 py-3 text-sm leading-7 shadow-[0_20px_50px_rgba(0,0,0,0.25)] sm:px-5 sm:py-4",
            isUser
              ? "border-orange-200/10 bg-gradient-to-br from-orange-300/85 via-amber-300/80 to-rose-300/70 text-slate-950"
              : "border-white/10 bg-white/[0.04] text-slate-100 backdrop-blur-xl"
          ].join(" ")}
        >
          {content}
        </div>
      </div>
    </div>
  );
}
