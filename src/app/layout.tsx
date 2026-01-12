import type { Metadata } from "next";
import "./globals.css";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import FontProvider from "@/components/FontProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ScrollManager } from "@/components/ScrollManager";

export const metadata: Metadata = {
  title: "読み | YOMI",
  description: "日本語泛読辅助工具 - 分词、注音、词性着色、音调可视化",
  keywords: ["日本語", "学習", "リーダー", "NLP", "分析"],
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "YOMI",
  },
  icons: {
    icon: "/logo.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="YOMI" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="YOMI" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+JP:wght@400;500;700&family=Noto+Serif+SC:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <FontProvider>
            <ScrollManager />
            <GlobalErrorBoundary>
              {children}
            </GlobalErrorBoundary>
          </FontProvider>
        </ThemeProvider>

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('[YOMI] SW registered:', registration.scope);
                    })
                    .catch(function(error) {
                      console.log('[YOMI] SW registration failed:', error);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
