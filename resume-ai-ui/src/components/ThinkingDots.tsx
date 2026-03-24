"use client";

export function ThinkingDots() {
  const dots = [0, 1, 2];
  return (
    <div className="rise-in inline-flex items-center gap-3 rounded-full border border-cyan-300/15 bg-cyan-300/10 px-4 py-2 text-xs font-medium text-cyan-50 shadow-[0_18px_40px_rgba(6,182,212,0.12)] backdrop-blur-xl">
      <span className="text-[10px] uppercase tracking-[0.24em] text-cyan-100/80">Searching</span>
      <div className="flex items-center gap-2">
        {dots.map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-gradient-to-br from-cyan-200 to-sky-300"
            style={{
              animation: "bounce 1.2s infinite",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
      <style jsx>{`
        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: translateY(0) scale(0.75);
            opacity: 0.35;
          }
          40% {
            transform: translateY(-3px) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
