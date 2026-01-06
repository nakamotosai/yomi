import type { Metadata } from "next";
import "./globals.css";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import FontProvider from "@/components/FontProvider";

export const metadata: Metadata = {
  title: "読み | YOMI",
  description: "日本語泛読辅助工具 - 分词、注音、词性着色、音调可视化",
  keywords: ["日本語", "学習", "リーダー", "NLP", "分析"],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* 直接从 Google Fonts 加载思源字体 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+JP:wght@400;500;700&family=Noto+Serif+SC:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-slate-50 text-slate-900">
        <FontProvider>
          <GlobalErrorBoundary>
            {children}
          </GlobalErrorBoundary>
        </FontProvider>
      </body>
    </html>
  );
}
