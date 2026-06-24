# 联系人详情跟进记录鱼骨视图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在联系人详情的“查看全部”时间线弹窗中提供按日期聚合的鱼骨视图，并保持全局时间线行为一致。

**Architecture:** 把时间线日期格式化和鱼骨分组移到纯 TypeScript 模块，使全局与单联系人视图共享同一份聚合逻辑并能用 Node 测试运行器覆盖。`CrmTimelineView` 保留数据获取职责，只移除联系人范围对视图切换的限制。

**Tech Stack:** Next.js 16、React 19、TypeScript 5、Tailwind CSS 4、shadcn/ui、Node test runner、tsx。

---

### Task 1: 定义可测试的鱼骨聚合行为

**Files:**
- Create: `test/timeline-groups.test.ts`
- Create: `src/lib/timeline-groups.ts`

- [ ] **Step 1: 写入会失败的按日聚合测试**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { groupFishboneTimeline } from "../src/lib/timeline-groups";

const entries = [
  { id: 1, contact_id: 1, contact_name: "王小明", content: "首次沟通", log_date: "2026-06-04 09:00:00" },
  { id: 2, contact_id: 1, contact_name: "王小明", content: "补充预算", log_date: "2026-06-04 15:00:00" },
  { id: 3, contact_id: 1, contact_name: "王小明", content: "发送方案", log_date: "2026-06-10 10:00:00" },
];

test("groups fishbone entries from the same day into one monthly node", () => {
  assert.deepEqual(groupFishboneTimeline(entries, "month").map(({ key, label, items }) => ({ key, label, ids: items.map(({ id }) => id) })), [
    { key: "2026-06-04", label: "06.04", ids: [1, 2] },
    { key: "2026-06-10", label: "06.10", ids: [3] },
  ]);
});
```

- [ ] **Step 2: 运行测试并确认因模块不存在而失败**

Run: `node --import tsx --test test/timeline-groups.test.ts`

Expected: FAIL，报错无法解析 `src/lib/timeline-groups`。

- [ ] **Step 3: 实现最小的时间线分组模块**

```ts
export interface TimelineEntry {
  id: number;
  contact_id: number;
  contact_name: string | null;
  content: string;
  log_date: string;
}

export type FishbonePeriod = "month";

export interface TimelineGroup {
  key: string;
  label: string;
  items: TimelineEntry[];
}

function dateParts(value: string) {
  const [year = "", month = "", day = ""] = value.slice(0, 10).split("-");
  return { year, month, day };
}

export function formatTimelineDate(value: string) {
  const { month, day } = dateParts(value);
  return `${month}.${day}`;
}

export function groupFishboneTimeline(items: TimelineEntry[], period: FishbonePeriod): TimelineGroup[] {
  const groups = new Map<string, TimelineGroup>();
  for (const item of items) {
    const { year, month, day } = dateParts(item.log_date);
    const key = `${year}-${month}-${day}`;
    const label = `${month}.${day}`;
    const group = groups.get(key);
    if (group) group.items.push(item);
    else groups.set(key, { key, label, items: [item] });
  }
  return [...groups.values()];
}
```

- [ ] **Step 4: 重新运行按日聚合测试并确认通过**

Run: `node --import tsx --test test/timeline-groups.test.ts`

Expected: PASS，`groups fishbone entries from the same day into one monthly node` 通过。

- [ ] **Step 5: 提交纯聚合逻辑**

```bash
git add src/lib/timeline-groups.ts test/timeline-groups.test.ts
git commit -m "feat: add timeline fishbone grouping"
```

### Task 2: 覆盖按年模式的跨年边界

**Files:**
- Modify: `test/timeline-groups.test.ts`
- Modify: `src/lib/timeline-groups.ts`

- [ ] **Step 1: 写入会失败的跨年按年分组测试**

```ts
test("keeps identical months from different years in separate yearly nodes", () => {
  const groups = groupFishboneTimeline([
    { id: 1, contact_id: 1, contact_name: "王小明", content: "去年六月", log_date: "2025-06-05 09:00:00" },
    { id: 2, contact_id: 1, contact_name: "王小明", content: "今年六月", log_date: "2026-06-06 09:00:00" },
  ], "year");

  assert.deepEqual(groups.map(({ key, label, items }) => ({ key, label, ids: items.map(({ id }) => id) })), [
    { key: "2025-06", label: "6 月", ids: [1] },
    { key: "2026-06", label: "6 月", ids: [2] },
  ]);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --import tsx --test test/timeline-groups.test.ts`

Expected: FAIL，TypeScript 报错 `"year"` 不能传给仅支持 `"month"` 的函数参数。

- [ ] **Step 3: 用年份组成按年模式的内部 key**

```ts
export type FishbonePeriod = "month" | "year";

const key = period === "month" ? `${year}-${month}-${day}` : `${year}-${month}`;
const label = period === "month" ? `${month}.${day}` : `${Number(month)} 月`;
```

该实现保留产品要求的 `N 月` 显示文字，同时用 `YYYY-MM` 键防止跨年记录丢失或合并。

- [ ] **Step 4: 重新运行聚合测试并确认全部通过**

Run: `node --import tsx --test test/timeline-groups.test.ts`

Expected: PASS，2 个测试均通过。

- [ ] **Step 5: 提交跨年分组保障**

```bash
git add src/lib/timeline-groups.ts test/timeline-groups.test.ts
git commit -m "test: cover yearly timeline grouping"
```

### Task 3: 在单联系人弹窗中启用鱼骨视图

**Files:**
- Modify: `src/components/crm/crm-timeline-view.tsx`

- [ ] **Step 1: 把组件接入共享分组函数**

```ts
import { formatTimelineDate, groupFishboneTimeline, type FishbonePeriod, type TimelineEntry } from "@/lib/timeline-groups";

export function CrmTimelineView({ contactId }: { contactId?: number }) {
  const [fishbonePeriod, setFishbonePeriod] = useState<FishbonePeriod>("month");
  const { data } = useFetch<TimelineEntry[]>(`/api/crm/timeline${contactId ? `?contact_id=${contactId}` : ""}`);
  const fishboneGroups = useMemo(() => groupFishboneTimeline(items, fishbonePeriod), [items, fishbonePeriod]);
```

- [ ] **Step 2: 让视图切换对单联系人和全局时间线均可见**

```tsx
<div className="flex rounded-md border p-1">
  <Button size="sm" variant={viewMode === "list" ? "secondary" : "ghost"} onClick={() => setViewMode("list")}>列表视图</Button>
  <Button size="sm" variant={viewMode === "fishbone" ? "secondary" : "ghost"} onClick={() => setViewMode("fishbone")}>鱼骨视图</Button>
</div>
```

保留 `isGlobal && <Input ... />`，使搜索仅存在于全局时间线。

- [ ] **Step 3: 用选中的视图模式决定渲染内容**

```tsx
{viewMode === "list" ? listMarkup : (
  <div className="mt-6">
    {periodControls}
    <div className="overflow-x-auto">
      <div className="relative min-w-[760px] py-20 before:absolute before:top-1/2 before:left-0 before:right-0 before:h-px before:bg-border">
        {fishboneGroups.map(({ key, label, items: groupItems }, index) => (
          <div key={key} className="relative inline-flex w-44 flex-col items-center align-middle">
            <div className="z-10 flex size-12 items-center justify-center rounded-full border-4 border-background bg-primary font-semibold text-primary-foreground">{label}</div>
            <div className={`absolute w-40 ${index % 2 === 0 ? "bottom-16" : "top-16"}`}>
              <div className="rounded-lg border bg-card p-3 shadow-sm">
                <p className="text-sm font-semibold text-primary">{groupItems[0].contact_name || `联系人#${groupItems[0].contact_id}`}</p>
                <p className="mt-1 text-xs">{groupItems[0].content}</p>
                {groupItems.length > 1 && <p className="mt-2 text-xs text-muted-foreground">另有 {groupItems.length - 1} 条记录</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: 运行新聚合测试与 TypeScript 检查**

Run: `node --import tsx --test test/timeline-groups.test.ts && /Users/infinity/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm run ts-check`

Expected: 聚合测试通过；TypeScript 检查以 exit 0 结束。若 pnpm 因网络/依赖链接失败，记录原始错误，不绕过 pnpm 改用 npm 或 yarn。

- [ ] **Step 5: 提交联系人详情视图改造**

```bash
git add src/components/crm/crm-timeline-view.tsx src/lib/timeline-groups.ts test/timeline-groups.test.ts
git commit -m "feat: add fishbone view to contact timeline"
```

### Task 4: 全量验证与交付检查

**Files:**
- Verify: `src/lib/timeline-groups.ts`
- Verify: `test/timeline-groups.test.ts`
- Verify: `src/components/crm/crm-timeline-view.tsx`

- [ ] **Step 1: 运行全部单元测试**

Run: `node --import tsx --test`

Expected: 所有测试通过，且没有失败或未处理异常。

- [ ] **Step 2: 运行静态校验**

Run: `/Users/infinity/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm run validate`

Expected: `ts-check` 和 `lint:build` 均以 exit 0 完成；若供应链校验因当前网络失败，记录失败原因。

- [ ] **Step 3: 检查改动范围与空白错误**

Run: `git diff --check HEAD~3..HEAD && git status --short --branch`

Expected: 没有空白错误；仅计划内源码、测试和文档被跟踪，`.superpowers/` 保持未跟踪。
