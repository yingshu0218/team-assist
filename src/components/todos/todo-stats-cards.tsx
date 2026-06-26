"use client";

import { CalendarClock, CheckCircle2, CircleDot, Gauge, TimerOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { TodoStats } from "@/lib/types";

interface TodoStatsCardsProps {
  stats: TodoStats;
  loading?: boolean;
}

export function TodoStatsCards({ stats, loading = false }: TodoStatsCardsProps) {
  const cards = [
    { label: "今日到期", value: stats.today, icon: CalendarClock, helper: "需要今天处理" },
    { label: "进行中", value: stats.doing, icon: CircleDot, helper: "正在推进" },
    { label: "已完成", value: stats.done, icon: CheckCircle2, helper: "累计完成" },
    { label: "已逾期", value: stats.overdue, icon: TimerOff, helper: "需尽快跟进" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
            <card.icon className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-2xl font-semibold tabular-nums">{card.value}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{card.helper}</p>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">完成率</CardTitle>
          <Gauge className="text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            {loading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-2xl font-semibold tabular-nums">{stats.completionRate}%</p>
            )}
            <Badge variant="secondary">非取消任务</Badge>
          </div>
          <Progress value={loading ? 0 : stats.completionRate} />
        </CardContent>
      </Card>
    </div>
  );
}
