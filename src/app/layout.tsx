import type { Metadata } from "next";
import { Inspector } from "react-dev-inspector";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "团队管理助手",
    template: "%s | 团队管理助手",
  },
  description: "团队管理助手 — 支持多账本管理与客户关系管理的全栈工具",
  keywords: ["记账", "账本", "收支管理", "财务统计", "个人理财"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          {isDev && <Inspector />}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
