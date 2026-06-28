import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KPT Weekly",
  description: "毎週のKPT振り返りをAI上司がサポート",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 h-13 flex items-center justify-between">
              <Link href="/" className="font-semibold text-gray-900 tracking-tight">
                KPT Weekly
              </Link>
            </div>
          </header>
          <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-7">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
