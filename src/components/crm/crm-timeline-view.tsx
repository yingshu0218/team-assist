"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useFetch } from "@/hooks/use-data";

interface TimelineItem { id: number; contact_id: number; contact_name: string | null; content: string; log_date: string; }

export function CrmTimelineView({ contactId }: { contactId?: number }) {
  const [search, setSearch] = useState("");
  const { data } = useFetch<TimelineItem[]>(`/api/crm/timeline${contactId ? `?contact_id=${contactId}` : ""}`);
  const items = (data || []).filter((item) => !search || item.contact_name?.includes(search));
  return <main className="mx-auto w-full max-w-4xl p-4 sm:p-6"><h2 className="text-xl font-semibold">联系人时间线</h2><p className="mt-1 text-sm text-muted-foreground">{contactId ? "当前联系人的跟进记录" : "查看所有联系人的跟进记录"}</p>{!contactId && <Input className="mt-4 max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="筛选联系人" />}
    <div className="mt-6 flex flex-col gap-3">{items.map((item) => <div key={item.id} className="grid grid-cols-[9rem_1fr] gap-4 rounded-lg border p-4"><time className="text-sm text-muted-foreground">{new Date(item.log_date).toLocaleString("zh-CN")}</time><div><p className="text-sm font-medium">{item.contact_name || `联系人#${item.contact_id}`}</p><p className="mt-1 text-sm">{item.content}</p></div></div>)}{items.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">暂无跟进记录</p>}</div></main>;
}
