import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Macro Lens: South Asia's macro economy, made comparable",
    template: "%s · Macro Lens",
  },
  description:
    "Five countries. Four decades. One honest look. Macro indicators for Pakistan, India, Bangladesh, Sri Lanka and Nepal, from primary sources: World Bank WDI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-50 border-b border-[#1A1A20]/80 bg-[#0A0A0B]/85 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-sm font-black tracking-[0.22em] text-[#E8E8ED]">
                MACRO<span className="gradient-text">LENS</span>
              </span>
              <span className="hidden text-[10px] font-medium uppercase tracking-widest text-[#8A8A94] sm:inline">
                South Asia
              </span>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-[#A0A0A8]">
              <Link href="/" className="transition-colors hover:text-[#E8E8ED]">
                Countries
              </Link>
              <Link href="/compare" className="transition-colors hover:text-[#E8E8ED]">
                Compare
              </Link>
              <Link href="/methodology" className="transition-colors hover:text-[#E8E8ED]">
                Methodology
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}