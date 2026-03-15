import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume AI Chat",
  description: "Ask anything about Anshu's resume."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface text-slate-100 antialiased">
        <div className="flex min-h-screen flex-col items-center px-4 py-6">
          <main className="flex w-full max-w-[900px] flex-1 flex-col">{children}</main>
        </div>
      </body>
    </html>
  );
}
