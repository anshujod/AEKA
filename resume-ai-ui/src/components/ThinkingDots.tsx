"use client";

export function ThinkingDots() {
  const dots = [0, 1, 2];
  return (
    <div className="flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-2 text-xs text-slate-200 shadow-lg shadow-black/30">
      {dots.map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-sky-400"
          style={{
            animation: "bounce 1.2s infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: scale(0);
            opacity: 0.4;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
