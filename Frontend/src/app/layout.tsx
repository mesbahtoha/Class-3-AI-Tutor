import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/layout/Providers";
import { Header } from "@/components/layout/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "পড়ালেখা বন্ধু — Class 3 AI Tutor",
  description: "তৃতীয় শ্রেণির বন্ধুসুলভ AI টিউটর — বই থেকে শেখো, মজা করে শেখো।",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;700&family=Noto+Sans+Bengali:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-tertiary focus:px-3 focus:py-2 focus:font-bold">
            মূল অংশে যাও
          </a>
          <Header />
          <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6">
            {children}
          </main>
          <footer className="border-t-2 border-ink bg-muted/60">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-mutedfg sm:flex-row sm:items-center sm:justify-between">
              <p>পড়ালেখা বন্ধু — তৃতীয় শ্রেণির AI টিউটর 🌱</p>
              <p>উত্তর যাচাই করে নিও — টিউটর মাঝে মাঝে ভুল করতে পারে।</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
