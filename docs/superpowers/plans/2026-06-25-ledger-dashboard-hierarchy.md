# 账本与收支信息层级调整 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让交易列表突出收支项目，并让账本可编辑初始余额且在首页清晰展示收入、支出、余额。

**Architecture:** 抽出两个无副作用的显示/金额派生函数作为行为边界：一个决定交易项目标题和分类副标题，另一个用账本初始余额及统计收入、支出计算余额。组件继续沿用现有请求和 shadcn 表单，只接入初始余额字段及新的显示结果。

**Tech Stack:** Next.js 16、React 19、TypeScript、Tailwind CSS 4、Node test runner。

---

### Task 1: 建立交易与账本摘要的纯函数测试

**Files:**
- Create: `test/ledger-presentation.test.ts`
- Create: `src/lib/ledger-presentation.ts`

- [ ] **Step 1: 写出失败的交易标题与余额测试**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { getLedgerBalance, getTransactionDisplay } from "../src/lib/ledger-presentation";

test("uses the description as the primary transaction label and category as the secondary label", () => {
  assert.deepEqual(getTransactionDisplay("小鑫 5 月预支工资", "薪资报酬"), {
    title: "小鑫 5 月预支工资",
    category: "薪资报酬",
  });
});

test("uses the category as the title when a transaction has no description", () => {
  assert.deepEqual(getTransactionDisplay(null, "未分类"), {
    title: "未分类",
    category: null,
  });
});

test("includes the initial balance when deriving a ledger balance", () => {
  assert.equal(getLedgerBalance("125.50", 800, 300.25), 625.25);
});
```

- [ ] **Step 2: 运行测试并确认它因缺少模块而失败**

Run: `pnpm test test/ledger-presentation.test.ts`

Expected: FAIL，提示无法解析 `src/lib/ledger-presentation`。

- [ ] **Step 3: 实现最小的纯函数**

```ts
export function getTransactionDisplay(description: string | null, categoryName: string) {
  const title = description?.trim();
  return title ? { title, category: categoryName } : { title: categoryName, category: null };
}

export function getLedgerBalance(initialBalance: string, totalIncome: number, totalExpense: number) {
  const parsedInitialBalance = Number.parseFloat(initialBalance);
  return (Number.isFinite(parsedInitialBalance) ? parsedInitialBalance : 0) + totalIncome - totalExpense;
}
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `pnpm test test/ledger-presentation.test.ts`

Expected: PASS，3 个测试通过。

- [ ] **Step 5: 提交纯函数与测试**

```bash
git add src/lib/ledger-presentation.ts test/ledger-presentation.test.ts
git commit -m "test: cover ledger presentation helpers"
```

### Task 2: 调整收支明细中的主副信息层级

**Files:**
- Modify: `src/components/transactions-view.tsx:245-278`
- Modify: `src/lib/ledger-presentation.ts`

- [ ] **Step 1: 将纯函数引入交易列表**

```ts
import { getTransactionDisplay } from "@/lib/ledger-presentation";
```

- [ ] **Step 2: 为每条交易派生显示信息并替换标题区域**

```tsx
const display = getTransactionDisplay(tx.description, tx.category?.name || "未分类");

<div className="flex-1 min-w-0">
  <div className="flex items-center gap-2">
    <span className="truncate text-base font-semibold text-foreground">{display.title}</span>
    {/* retain the existing tag map here */}
  </div>
  {display.category && (
    <p className="mt-0.5 truncate text-xs text-muted-foreground">{display.category}</p>
  )}
</div>
```

- [ ] **Step 3: 运行纯函数测试，确保列表回退行为保持正确**

Run: `pnpm test test/ledger-presentation.test.ts`

Expected: PASS，3 个测试通过。

- [ ] **Step 4: 提交交易列表层级调整**

```bash
git add src/components/transactions-view.tsx
git commit -m "feat: prioritize transaction descriptions"
```

### Task 3: 在账本表单中编辑初始余额

**Files:**
- Modify: `src/components/app-sidebar.tsx:64-112`
- Modify: `src/components/app-sidebar.tsx:340-425`

- [ ] **Step 1: 添加创建、编辑初始余额状态并在成功后重置**

```ts
const [ledgerInitialBalance, setLedgerInitialBalance] = useState("0");
const [editInitialBalance, setEditInitialBalance] = useState("0");

setLedgerInitialBalance("0");
```

- [ ] **Step 2: 将初始余额传给现有账本 API，并在打开编辑项时预填**

```ts
initial_balance: ledgerInitialBalance || "0",

initial_balance: editInitialBalance || "0",
```

- [ ] **Step 3: 在创建和编辑弹窗中加入数值输入**

```tsx
<div className="space-y-2">
  <Label htmlFor="ledger-initial-balance">初始余额</Label>
  <Input
    id="ledger-initial-balance"
    type="number"
    step="0.01"
    value={ledgerInitialBalance}
    onChange={(event) => setLedgerInitialBalance(event.target.value)}
    placeholder="0.00"
  />
</div>
```

- [ ] **Step 4: 运行 TypeScript 检查以验证表单状态和 API 负载类型**

Run: `pnpm ts-check`

Expected: PASS，退出码为 0。

- [ ] **Step 5: 提交账本初始余额表单**

```bash
git add src/components/app-sidebar.tsx
git commit -m "feat: edit ledger initial balance"
```

### Task 4: 用收入、支出、余额重建首页账本卡片

**Files:**
- Modify: `src/components/dashboard-view.tsx:31-92`
- Modify: `src/components/dashboard-view.tsx:209-263`
- Modify: `src/lib/ledger-presentation.ts`

- [ ] **Step 1: 引入余额派生函数**

```ts
import { getLedgerBalance } from "@/lib/ledger-presentation";
```

- [ ] **Step 2: 从账本和统计数据计算余额，移除笔数展示**

```tsx
const balance = getLedgerBalance(ledger.initial_balance, totalIncome, totalExpense);

<div className="grid grid-cols-3 gap-3">
  {/* existing income metric without count */}
  {/* existing expense metric without count */}
  <div>
    <span className="text-[10px] font-medium text-muted-foreground">余额</span>
    <p className="text-sm font-semibold tabular-nums text-foreground truncate">
      ¥{formatCurrency(balance)}
    </p>
  </div>
</div>
```

- [ ] **Step 3: 同步加载骨架为三项指标**

```tsx
<div className="grid grid-cols-3 gap-3">
  {Array.from({ length: 3 }).map((_, i) => (
    <div key={i} className="space-y-1">...</div>
  ))}
</div>
```

- [ ] **Step 4: 运行纯函数测试，确认余额派生仍包含初始余额**

Run: `pnpm test test/ledger-presentation.test.ts`

Expected: PASS，3 个测试通过。

- [ ] **Step 5: 提交首页账本卡片调整**

```bash
git add src/components/dashboard-view.tsx
git commit -m "feat: show ledger income expense and balance"
```

### Task 5: 全量静态与可视化验证

**Files:**
- Verify: `src/components/transactions-view.tsx`
- Verify: `src/components/app-sidebar.tsx`
- Verify: `src/components/dashboard-view.tsx`

- [ ] **Step 1: 运行受影响测试**

Run: `pnpm test test/ledger-presentation.test.ts test/ledger-selection.test.ts`

Expected: PASS，所有指定测试通过。

- [ ] **Step 2: 运行完整静态检查**

Run: `pnpm validate`

Expected: PASS，TypeScript 与 ESLint 均以退出码 0 完成。

- [ ] **Step 3: 启动应用并检查桌面视图**

Run: `pnpm dev`

Expected: 本地 Next.js 应用可访问；收支行显示项目主标题与分类副标题，首页卡片显示收入、支出、余额，且余额包含初始余额。

- [ ] **Step 4: 检查移动宽度视图**

Run: 使用浏览器将宽度设为 390px，重复收支明细与首页账本卡片检查。

- [ ] **Step 5: 提交验证后的最终变更**

```bash
git status --short
```

Expected: 除已提交的改动外无待提交文件。

