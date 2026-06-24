"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFetch } from "@/hooks/use-data";
import {
  formatTimelineDate,
  groupFishboneTimeline,
  type FishbonePeriod,
  type TimelineEntry,
} from "@/lib/timeline-groups";

export function CrmTimelineView({ contactId }: { contactId?: number }) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "fishbone">("list");
  const [fishbonePeriod, setFishbonePeriod] = useState<FishbonePeriod>("month");
  const { data } = useFetch<TimelineEntry[]>(`/api/crm/timeline${contactId ? `?contact_id=${contactId}` : ""}`);
  const items = (data || []).filter((item) => !search || item.contact_name?.includes(search));
  const listGroups = useMemo(() => items.reduce<Record<string, TimelineEntry[]>>((groups, item) => {
    const date = new Date(item.log_date);
    const label = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
    groups[label] = [...(groups[label] || []), item];
    return groups;
  }, {}), [items]);
  const fishboneGroups = useMemo(() => groupFishboneTimeline(items, fishbonePeriod), [items, fishbonePeriod]);
  const isGlobal = !contactId;

  return <main className="mx-auto w-full max-w-4xl p-4 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">联系人时间线</h2><p className="mt-1 text-sm text-muted-foreground">{isGlobal ? "查看所有联系人的跟进记录" : "当前联系人的跟进记录"}</p></div><div className="flex rounded-md border p-1"><Button size="sm" variant={viewMode === "list" ? "secondary" : "ghost"} onClick={() => setViewMode("list")}>列表视图</Button><Button size="sm" variant={viewMode === "fishbone" ? "secondary" : "ghost"} onClick={() => setViewMode("fishbone")}>鱼骨视图</Button></div></div>{isGlobal && <Input className="mt-4 max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="筛选联系人" />}
    {viewMode === "list" ? <div className="mt-6 flex flex-col gap-5">{Object.entries(listGroups).map(([period, logs]) => <section key={period}><div className="mb-3 flex items-center gap-3"><div className="h-px flex-1 bg-border" /><span className="text-sm font-semibold text-muted-foreground">{period}</span><div className="h-px flex-1 bg-border" /></div><div className="flex flex-col gap-3">{logs.map((item) => <div key={item.id} className="grid grid-cols-[6.5rem_1fr] gap-4 rounded-lg border p-4"><time className="flex min-h-20 items-center justify-center rounded-md border bg-muted font-semibold text-primary">{formatTimelineDate(item.log_date)}</time><div className="flex flex-col justify-center"><p className="text-sm font-semibold text-primary">{item.contact_name || `联系人#${item.contact_id}`}</p><p className="mt-1 text-sm">{item.content}</p></div></div>)}</div></section>)}</div> : <div className="mt-6"><div className="mb-4 flex justify-end gap-2"><Button size="sm" variant={fishbonePeriod === "month" ? "secondary" : "outline"} onClick={() => setFishbonePeriod("month")}>按月</Button><Button size="sm" variant={fishbonePeriod === "year" ? "secondary" : "outline"} onClick={() => setFishbonePeriod("year")}>按年</Button></div><div className="overflow-x-auto"><div className="relative flex w-max min-w-[760px] flex-nowrap py-20 before:absolute before:top-1/2 before:left-0 before:right-0 before:h-px before:bg-border">{fishboneGroups.map(({ key, label, items: groupItems }, index) => <div key={key} className="relative inline-flex w-44 shrink-0 flex-col items-center align-middle"><div className="z-10 flex size-12 items-center justify-center rounded-full border-4 border-background bg-primary font-semibold text-primary-foreground">{label}</div><div className={`absolute w-40 ${index % 2 === 0 ? "bottom-16" : "top-16"}`}><div className="rounded-lg border bg-card p-3 shadow-sm"><p className="text-sm font-semibold text-primary">{groupItems[0].contact_name || `联系人#${groupItems[0].contact_id}`}</p><p className="mt-1 text-xs">{groupItems[0].content}</p>{groupItems.length > 1 && <p className="mt-2 text-xs text-muted-foreground">另有 {groupItems.length - 1} 条记录</p>}</div></div></div>)}</div></div></div>}{items.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">暂无跟进记录</p>}</main>;
}
