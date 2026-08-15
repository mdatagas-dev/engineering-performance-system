import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./win95-apps.css";
import "./win95-gate.css";
import "./win95-app.css";
import "./winxp-desktop.css";
import "./winxp-apps.css";
import "./winxp-login.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EPS — Engineering Production System",
  description: "Manajemen Sesi — Engineering Production System",
};

// XP chrome (dan seluruh halaman kerja) selalu light — tema gelap tidak dipakai.
const themeInit = `try{document.documentElement.classList.remove("dark")}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <div aria-hidden className="animated-bg pointer-events-none fixed inset-0 -z-10" />
        {children}
      </body>
    </html>
  );
}
