import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Hobson Bay Chess Club Tournament Timeline",
  description: "View all the tournaments held by the Hobson Bay Chess Club in chronological order.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="bg-gradient-to-br from-blue-50 to-blue-200 min-h-screen font-sans">
          <header className="bg-white shadow flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-4">
                <img src="/logo.png" alt="HBCC Logo" width={40} height={40} className="rounded-full border border-blue-300" />
                <span className="text-2xl font-bold text-blue-700 tracking-wide">Hobsons Bay Chess Club</span>
              </Link>
            </div>
            <nav>
              <Link href="/timeline/" className="text-blue-600 hover:text-blue-900 font-semibold px-4 py-2 rounded transition">Timeline</Link>
            </nav>
          </header>
          <main className="px-4 pb-8">{children}</main>
          <footer className="bg-white border-t mt-12 py-6 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Hobsons Bay Chess Club. All rights reserved.
          </footer>
        </div>
      </body>
    </html>
  )
};
