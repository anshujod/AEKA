import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AEKA Document Studio",
  description: "A polished workspace for exploring indexed documents with memory-aware chat."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <div className="flex min-h-screen flex-col items-center px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <main className="flex w-full max-w-7xl flex-1 flex-col">{children}</main>
        </div>
      </body>
    </html>
  );
}
