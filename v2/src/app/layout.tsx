import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import MobileNav from "@/components/MobileNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hobson Bay Chess Club Tournaments & Leaderboards",
  description: "View all the tournaments held by the Hobson Bay Chess Club in chronological order.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const buildTimeIso = process.env.NEXT_PUBLIC_BUILD_TIME;
  const buildTimeMelbourne = buildTimeIso
    ? new Date(buildTimeIso).toLocaleString('en-AU', {
      timeZone: 'Australia/Melbourne',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    : undefined;
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="bg-gradient-to-br from-blue-50 to-blue-200 min-h-screen font-sans">
          <header className="relative bg-white shadow flex items-center justify-between px-2 md:px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-4">
                <Image src="/Logo.png" alt="HBCC Logo" width={40} height={40} className="rounded-full border border-blue-300" />
                <span className="text-xl md:text-2xl font-bold text-blue-700 tracking-wide">Hobsons Bay Chess Club</span>
              </Link>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Tournaments
              </Link>
              <Link href="/leaderboard" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Leaderboards
              </Link>
            </nav>
            <MobileNav />
          </header>
          <main className="px0 md:px-4 pb-8">{children}</main>
          <footer className="bg-white border-t mt-12 py-6 text-gray-500 text-sm">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-center sm:text-left">
                  &copy; {new Date().getFullYear()} Hobsons Bay Chess Club. All rights reserved.
                </div>
                <div className="flex items-center gap-4 text-center sm:text-right">
                  <a href="https://hobsonsbaychess.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">Website</a>
                  <span className="text-gray-300">|</span>
                  <a href="https://games.hobsonsbaychess.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">Games database</a>
                  <span className="text-gray-300">|</span>
                  <a href="https://live.hobsonsbaychess.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">Live Broadcast</a>
                </div>
              </div>
              <div className="text-center text-gray-400 text-xs pt-3">
                Generated at : {buildTimeMelbourne}
              </div>
            </div>

          </footer>
        </div>
      </body>
    </html>
  )
};
