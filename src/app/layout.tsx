import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Sans_SC, Noto_Serif_JP, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const notoSerifSC = Noto_Serif_SC({
  variable: "--font-noto-serif-sc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "YOMI 読み | 日本語リーダー",
  description: "日本語泛読辅助工具 - 分词、注音、词性着色、音调可视化",
  keywords: ["日本語", "学習", "リーダー", "NLP", "分析"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${notoSansJP.variable} ${notoSansSC.variable} ${notoSerifJP.variable} ${notoSerifSC.variable} antialiased bg-slate-50 text-slate-900`}>
        <GlobalErrorBoundary>
          {children}
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
