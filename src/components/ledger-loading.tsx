"use client";

import { useLedger } from "@/hooks/use-ledger";
import { BookPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LedgerLoading({ children }: { children: React.ReactNode }) {
  const { loading, ledgers, activeLedger } = useLedger();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (ledgers.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <BookPlus className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">欢迎使用团队管理助手</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              点击左侧边栏的 + 按钮创建你的第一个账本
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!activeLedger) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">请选择一个账本</p>
      </div>
    );
  }

  return <>{children}</>;
}
