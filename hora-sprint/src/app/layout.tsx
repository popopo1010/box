import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hora Sprint",
  description:
    "ホラクラシー組織のためのスプリント管理ツール - サークル、ロール、テンションを効率的に管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body
        className="antialiased"
        style={{
          fontFamily: "'Noto Sans JP', sans-serif",
          background: '#0f0f11',
          color: '#e8e6f0',
        }}
      >
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-[220px]">{children}</main>
        </div>
      </body>
    </html>
  );
}
