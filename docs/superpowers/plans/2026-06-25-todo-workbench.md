# Todo Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user TickTick-inspired todo workbench with nullable team/group context, optional ledger links, checklist progress, API/CLI support, and a shadcn/ui list-first frontend.

**Architecture:** Add `teams`, `todos`, and `todo_checklist_items` to the SQLite/Drizzle schema, plus a nullable `ledgers.team_id`. Keep “未归属” as a virtual UI/query concept represented by `NULL`, not a stored team. Implement focused API routes and reusable formatting/stat helpers before wiring CLI commands and the `TodosView` frontend.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5 strict mode, SQLite + better-sqlite3 + Drizzle ORM, node:test, shadcn/ui, Tailwind CSS 4, Commander-style CLI in `scripts/cli.ts`.

---

## Scope Notes

- This plan implements the approved spec in `docs/superpowers/specs/2026-06-25-todo-workbench-design.md`.
- This is not a multiplayer team-management feature. Do not add users, members, assignees, roles, comments, notifications, or permissions.
- `team_id = null` means “未归属 / 默认分组” for both ledgers and todos.
- Use `pnpm` only.
- In zsh, quote paths containing brackets, for example `sed -n '1,200p' 'src/app/api/todos/[id]/route.ts'`.

## File Structure

### Database and domain helpers

- Modify: `src/storage/database/shared/schema.ts`
  - Add `teams`, `todos`, `todo_checklist_items`.
  - Add nullable `team_id` to `ledgers`.
- Modify: `src/storage/database/sqlite-client.ts`
  - Create new tables and indexes in `initDatabase()`.
  - Add idempotent migration helpers for existing SQLite files: add `ledgers.team_id` when missing.
- Modify: `src/lib/types.ts`
  - Add `Team`, `Todo`, `TodoChecklistItem`, todo status/priority union types, stats types.
  - Add `team_id` to `Ledger`.
- Create: `src/lib/todos.ts`
  - Pure helpers for validating todo input, formatting joined rows, grouping todos by date bucket, and computing stats.
- Test: `test/todos.test.ts`
  - Unit tests for helpers.
- Test: `test/todo-schema.test.ts`
  - Migration/schema behavior that can be checked against a temporary SQLite database.

### API routes

- Create: `src/app/api/teams/route.ts`
- Create: `src/app/api/teams/[id]/route.ts`
- Create: `src/app/api/todos/route.ts`
- Create: `src/app/api/todos/[id]/route.ts`
- Create: `src/app/api/todos/[id]/checklist/route.ts`
- Create: `src/app/api/todos/[id]/checklist/[itemId]/route.ts`
- Test: `test/todo-api-helpers.test.ts`
  - Tests pure request parsing and update-normalization helpers from `src/lib/todos.ts`.

### CLI

- Modify: `scripts/cli.ts`
  - Add `team` commands.
  - Add `todo` commands.
- Test: `test/cli.test.ts`
  - Extend parser recognition tests for `team` and `todo`.

### Frontend

- Modify: `src/app/page.tsx`
  - Add `todos` tab.
- Modify: `src/components/app-sidebar.tsx`
  - Add 「待办事项」 nav item.
- Create: `src/components/todos/todos-view.tsx`
- Create: `src/components/todos/todo-stats-cards.tsx`
- Create: `src/components/todos/todo-team-filter.tsx`
- Create: `src/components/todos/todo-list.tsx`
- Create: `src/components/todos/todo-detail-panel.tsx`
- Create: `src/components/todos/todo-dialog.tsx`
- Create: `src/components/todos/team-dialog.tsx`
- Create: `src/components/todos/todo-types.ts`
  - Frontend-only state types and local view helpers if needed.

---

## Task 1: Domain Types, Helpers, and Tests

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/todos.ts`
- Create: `test/todos.test.ts`

- [ ] **Step 1: Add shared todo/team types**

Update `src/lib/types.ts` by adding `team_id` to `Ledger` and appending these types after the existing ledger/transaction section:

```ts
export type TodoStatus = "todo" | "doing" | "done" | "canceled";
export type TodoPriority = "low" | "medium" | "high" | "urgent";
export type TodoDateBucket = "overdue" | "today" | "future" | "no_date" | "done";

export interface Team {
  id: number;
  name: string;
  color: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  ledgerCount?: number;
  todoCount?: number;
}

export interface TodoChecklistItem {
  id: number;
  todo_id: number;
  title: string;
  is_done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: number;
  title: string;
  notes: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  due_date: string | null;
  team_id: number | null;
  ledger_id: number | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  team?: Team | null;
  ledger?: Ledger | null;
  checklist?: TodoChecklistItem[];
  checklistProgress?: number;
}

export interface TodoStats {
  today: number;
  doing: number;
  done: number;
  overdue: number;
  completionRate: number;
}
```

Also change `Ledger` to include:

```ts
team_id: number | null;
```

- [ ] **Step 2: Write failing helper tests**

Create `test/todos.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeChecklistProgress,
  computeTodoStats,
  getTodoDateBucket,
  normalizeTodoStatusTransition,
} from "../src/lib/todos";
import type { Todo } from "../src/lib/types";

function makeTodo(overrides: Partial<Todo>): Todo {
  return {
    id: 1,
    title: "整理凭证",
    notes: null,
    status: "todo",
    priority: "medium",
    due_date: null,
    team_id: null,
    ledger_id: null,
    sort_order: 0,
    completed_at: null,
    created_at: "2026-06-25 08:00:00",
    updated_at: "2026-06-25 08:00:00",
    ...overrides,
  };
}

test("checklist progress uses checklist items when present", () => {
  const progress = computeChecklistProgress([
    { id: 1, todo_id: 1, title: "A", is_done: true, sort_order: 0, created_at: "", updated_at: "" },
    { id: 2, todo_id: 1, title: "B", is_done: false, sort_order: 1, created_at: "", updated_at: "" },
  ]);

  assert.equal(progress, 50);
});

test("checklist progress falls back to todo status when no checklist exists", () => {
  assert.equal(computeChecklistProgress([], "done"), 100);
  assert.equal(computeChecklistProgress([], "doing"), 0);
});

test("date bucket separates overdue today future no-date and done", () => {
  assert.equal(getTodoDateBucket(makeTodo({ due_date: "2026-06-24" }), "2026-06-25"), "overdue");
  assert.equal(getTodoDateBucket(makeTodo({ due_date: "2026-06-25" }), "2026-06-25"), "today");
  assert.equal(getTodoDateBucket(makeTodo({ due_date: "2026-06-26" }), "2026-06-25"), "future");
  assert.equal(getTodoDateBucket(makeTodo({ due_date: null }), "2026-06-25"), "no_date");
  assert.equal(getTodoDateBucket(makeTodo({ status: "done", due_date: "2026-06-24" }), "2026-06-25"), "done");
});

test("todo stats exclude canceled tasks from completion rate denominator", () => {
  const stats = computeTodoStats(
    [
      makeTodo({ status: "todo", due_date: "2026-06-25" }),
      makeTodo({ status: "doing", due_date: "2026-06-24" }),
      makeTodo({ status: "done", due_date: "2026-06-20" }),
      makeTodo({ status: "canceled", due_date: "2026-06-24" }),
    ],
    "2026-06-25",
  );

  assert.deepEqual(stats, {
    today: 1,
    doing: 1,
    done: 1,
    overdue: 1,
    completionRate: 33,
  });
});

test("status transition sets and clears completed_at", () => {
  const done = normalizeTodoStatusTransition("done", "todo", null, "2026-06-25 10:00:00");
  assert.equal(done.completed_at, "2026-06-25 10:00:00");

  const reopened = normalizeTodoStatusTransition("doing", "done", "2026-06-25 10:00:00", "2026-06-25 11:00:00");
  assert.equal(reopened.completed_at, null);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
pnpm test test/todos.test.ts
```

Expected: FAIL because `src/lib/todos.ts` does not exist.

- [ ] **Step 4: Implement todo helper module**

Create `src/lib/todos.ts`:

```ts
import type {
  Todo,
  TodoChecklistItem,
  TodoDateBucket,
  TodoPriority,
  TodoStats,
  TodoStatus,
} from "@/lib/types";

export const STATUS_VALUES: TodoStatus[] = ["todo", "doing", "done", "canceled"];
export const PRIORITY_VALUES: TodoPriority[] = ["low", "medium", "high", "urgent"];

export function isTodoStatus(value: unknown): value is TodoStatus {
  return typeof value === "string" && STATUS_VALUES.includes(value as TodoStatus);
}

export function isTodoPriority(value: unknown): value is TodoPriority {
  return typeof value === "string" && PRIORITY_VALUES.includes(value as TodoPriority);
}

export function normalizeOptionalId(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "" || value === "none") return null;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new Error("ID 必须是正整数或 none");
  }
  return numeric;
}

export function normalizeDateOnly(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "" || value === "none") return null;
  if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) {
    throw new Error("日期必须为空或 YYYY-MM-DD");
  }
  return value;
}

export function computeChecklistProgress(
  checklist: TodoChecklistItem[],
  fallbackStatus: TodoStatus = "todo",
): number {
  if (checklist.length === 0) return fallbackStatus === "done" ? 100 : 0;
  const doneCount = checklist.filter((item) => item.is_done).length;
  return Math.round((doneCount / checklist.length) * 100);
}

export function getTodoDateBucket(todo: Todo, today: string): TodoDateBucket {
  if (todo.status === "done") return "done";
  if (!todo.due_date) return "no_date";
  if (todo.due_date < today) return "overdue";
  if (todo.due_date === today) return "today";
  return "future";
}

export function computeTodoStats(todos: Todo[], today: string): TodoStats {
  const activeTodos = todos.filter((todo) => todo.status !== "canceled");
  const done = activeTodos.filter((todo) => todo.status === "done").length;
  const denominator = activeTodos.filter((todo) => todo.status !== "canceled").length;

  return {
    today: activeTodos.filter((todo) => todo.status !== "done" && todo.due_date === today).length,
    doing: activeTodos.filter((todo) => todo.status === "doing").length,
    done,
    overdue: activeTodos.filter((todo) => todo.status !== "done" && todo.due_date !== null && todo.due_date < today).length,
    completionRate: denominator === 0 ? 0 : Math.round((done / denominator) * 100),
  };
}

export function normalizeTodoStatusTransition(
  nextStatus: TodoStatus,
  previousStatus: TodoStatus,
  previousCompletedAt: string | null,
  now: string,
): { completed_at: string | null } {
  if (nextStatus === "done" && previousStatus !== "done") return { completed_at: now };
  if (nextStatus !== "done" && previousStatus === "done") return { completed_at: null };
  return { completed_at: previousCompletedAt };
}

export function todayDateString(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
```

- [ ] **Step 5: Run helper tests**

Run:

```bash
pnpm test test/todos.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run type check**

Run:

```bash
pnpm ts-check
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/lib/types.ts src/lib/todos.ts test/todos.test.ts
git commit -m "feat: add todo domain helpers"
```

---

## Task 2: Database Schema and Idempotent SQLite Migration

**Files:**
- Modify: `src/storage/database/shared/schema.ts`
- Modify: `src/storage/database/sqlite-client.ts`
- Create: `test/todo-schema.test.ts`

- [ ] **Step 1: Write failing schema test**

Create `test/todo-schema.test.ts`:

```ts
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";

test("todo schema supports nullable team and ledger relationships", () => {
  const dir = mkdtempSync(join(tmpdir(), "todo-schema-"));
  const dbPath = join(dir, "test.db");
  const sqlite = new Database(dbPath);

  try {
    sqlite.pragma("foreign_keys = ON");
    sqlite.exec(`
      CREATE TABLE teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT,
        description TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE ledgers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL
      );
      CREATE TABLE todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT NOT NULL DEFAULT 'medium',
        due_date TEXT,
        team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
        ledger_id INTEGER REFERENCES ledgers(id) ON DELETE SET NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE todo_checklist_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        is_done INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    sqlite.prepare("INSERT INTO teams (id, name) VALUES (1, '市场项目')").run();
    sqlite.prepare("INSERT INTO ledgers (id, name, team_id) VALUES (1, '主账本', 1)").run();
    sqlite.prepare("INSERT INTO todos (id, title, team_id, ledger_id) VALUES (1, '整理凭证', 1, 1)").run();
    sqlite.prepare("INSERT INTO todo_checklist_items (todo_id, title, is_done) VALUES (1, '收集发票', 1)").run();
    sqlite.prepare("DELETE FROM teams WHERE id = 1").run();

    const ledger = sqlite.prepare("SELECT team_id FROM ledgers WHERE id = 1").get() as { team_id: number | null };
    const todo = sqlite.prepare("SELECT team_id, ledger_id FROM todos WHERE id = 1").get() as { team_id: number | null; ledger_id: number | null };
    assert.equal(ledger.team_id, null);
    assert.equal(todo.team_id, null);
    assert.equal(todo.ledger_id, 1);

    sqlite.prepare("DELETE FROM ledgers WHERE id = 1").run();
    const todoAfterLedgerDelete = sqlite.prepare("SELECT ledger_id FROM todos WHERE id = 1").get() as { ledger_id: number | null };
    assert.equal(todoAfterLedgerDelete.ledger_id, null);

    sqlite.prepare("DELETE FROM todos WHERE id = 1").run();
    const checklistCount = sqlite.prepare("SELECT COUNT(*) AS count FROM todo_checklist_items").get() as { count: number };
    assert.equal(checklistCount.count, 0);
  } finally {
    sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run schema test**

Run:

```bash
pnpm test test/todo-schema.test.ts
```

Expected: PASS. This test documents the required SQLite foreign-key behavior before production schema changes.

- [ ] **Step 3: Update Drizzle schema**

In `src/storage/database/shared/schema.ts`:

1. Add `teams` before `ledgers`.
2. Add `team_id` to `ledgers`.
3. Add `todos` and `todo_checklist_items` after `transactions`.

Use this shape:

```ts
export const teams = sqliteTable(
  "teams",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    color: text("color"),
    description: text("description"),
    sort_order: integer("sort_order").default(0).notNull(),
    created_at: text("created_at").default(sql`(datetime('now'))`).notNull(),
    updated_at: text("updated_at").default(sql`(datetime('now'))`).notNull(),
  },
  (table) => [index("teams_sort_order_idx").on(table.sort_order)],
);
```

Add this to `ledgers`:

```ts
team_id: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
```

Add:

```ts
export const todos = sqliteTable(
  "todos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    notes: text("notes"),
    status: text("status").default("todo").notNull(),
    priority: text("priority").default("medium").notNull(),
    due_date: text("due_date"),
    team_id: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
    ledger_id: integer("ledger_id").references(() => ledgers.id, { onDelete: "set null" }),
    sort_order: integer("sort_order").default(0).notNull(),
    completed_at: text("completed_at"),
    created_at: text("created_at").default(sql`(datetime('now'))`).notNull(),
    updated_at: text("updated_at").default(sql`(datetime('now'))`).notNull(),
  },
  (table) => [
    index("todos_status_idx").on(table.status),
    index("todos_due_date_idx").on(table.due_date),
    index("todos_team_id_idx").on(table.team_id),
    index("todos_ledger_id_idx").on(table.ledger_id),
  ],
);

export const todo_checklist_items = sqliteTable(
  "todo_checklist_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    todo_id: integer("todo_id").notNull().references(() => todos.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    is_done: integer("is_done", { mode: "boolean" }).default(false).notNull(),
    sort_order: integer("sort_order").default(0).notNull(),
    created_at: text("created_at").default(sql`(datetime('now'))`).notNull(),
    updated_at: text("updated_at").default(sql`(datetime('now'))`).notNull(),
  },
  (table) => [
    index("todo_checklist_items_todo_id_idx").on(table.todo_id),
    index("todo_checklist_items_sort_order_idx").on(table.sort_order),
  ],
);
```

- [ ] **Step 4: Update SQLite initialization and migration**

In `src/storage/database/sqlite-client.ts`:

1. Add a helper:

```ts
function addLedgerTeamColumn(sqlite: Database.Database): void {
  const columns = sqlite.prepare("PRAGMA table_info(ledgers)").all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "team_id")) {
    sqlite.exec("ALTER TABLE ledgers ADD COLUMN team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL");
  }
}
```

2. In the `CREATE TABLE IF NOT EXISTS ledgers` statement, add:

```sql
team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
```

3. Before `ledgers`, create `teams`.
4. After `transactions`, create `todos` and `todo_checklist_items`.
5. Add indexes:

```sql
CREATE INDEX IF NOT EXISTS teams_sort_order_idx ON teams(sort_order);
CREATE INDEX IF NOT EXISTS ledgers_team_id_idx ON ledgers(team_id);
CREATE INDEX IF NOT EXISTS todos_status_idx ON todos(status);
CREATE INDEX IF NOT EXISTS todos_due_date_idx ON todos(due_date);
CREATE INDEX IF NOT EXISTS todos_team_id_idx ON todos(team_id);
CREATE INDEX IF NOT EXISTS todos_ledger_id_idx ON todos(ledger_id);
CREATE INDEX IF NOT EXISTS todo_checklist_items_todo_id_idx ON todo_checklist_items(todo_id);
CREATE INDEX IF NOT EXISTS todo_checklist_items_sort_order_idx ON todo_checklist_items(sort_order);
```

6. Call `addLedgerTeamColumn(sqlite)` after `sqlite.exec(...)` and before contact migrations.

- [ ] **Step 5: Run focused tests and type check**

Run:

```bash
pnpm test test/todo-schema.test.ts test/todos.test.ts
pnpm ts-check
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/storage/database/shared/schema.ts src/storage/database/sqlite-client.ts test/todo-schema.test.ts
git commit -m "feat: add todo database schema"
```

---

## Task 3: Teams API

**Files:**
- Create: `src/app/api/teams/route.ts`
- Create: `src/app/api/teams/[id]/route.ts`

- [ ] **Step 1: Implement collection route**

Create `src/app/api/teams/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { getDb } from "@/storage/database/sqlite-client";
import { ledgers, teams, todos } from "@/storage/database/shared/schema";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: teams.id,
        name: teams.name,
        color: teams.color,
        description: teams.description,
        sort_order: teams.sort_order,
        created_at: teams.created_at,
        updated_at: teams.updated_at,
        ledgerCount: sql<number>`count(distinct ${ledgers.id})`,
        todoCount: sql<number>`count(distinct ${todos.id})`,
      })
      .from(teams)
      .leftJoin(ledgers, eq(ledgers.team_id, teams.id))
      .leftJoin(todos, eq(todos.team_id, teams.id))
      .groupBy(teams.id)
      .orderBy(asc(teams.sort_order), asc(teams.created_at));

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const body = await request.json() as {
      name?: unknown;
      color?: unknown;
      description?: unknown;
      sort_order?: unknown;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ success: false, error: "团队名称不能为空" }, { status: 400 });
    }

    const db = getDb();
    const inserted = await db
      .insert(teams)
      .values({
        name,
        color: typeof body.color === "string" && body.color.trim() ? body.color.trim() : null,
        description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
        sort_order: Number.isInteger(Number(body.sort_order)) ? Number(body.sort_order) : 0,
      })
      .returning();

    return NextResponse.json({ success: true, data: inserted[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Implement item route**

Create `src/app/api/teams/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { getDb } from "@/storage/database/sqlite-client";
import { teams } from "@/storage/database/shared/schema";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id === null) return NextResponse.json({ success: false, error: "无效团队 ID" }, { status: 400 });

  try {
    const body = await request.json() as {
      name?: unknown;
      color?: unknown;
      description?: unknown;
      sort_order?: unknown;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ success: false, error: "团队名称不能为空" }, { status: 400 });
    }

    const db = getDb();
    const updated = await db
      .update(teams)
      .set({
        name,
        color: typeof body.color === "string" && body.color.trim() ? body.color.trim() : null,
        description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
        sort_order: Number.isInteger(Number(body.sort_order)) ? Number(body.sort_order) : 0,
        updated_at: new Date().toISOString(),
      })
      .where(eq(teams.id, id))
      .returning();

    if (!updated[0]) return NextResponse.json({ success: false, error: "团队不存在" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id === null) return NextResponse.json({ success: false, error: "无效团队 ID" }, { status: 400 });

  try {
    const db = getDb();
    const deleted = await db.delete(teams).where(eq(teams.id, id)).returning();
    if (!deleted[0]) return NextResponse.json({ success: false, error: "团队不存在" }, { status: 404 });
    return NextResponse.json({ success: true, data: deleted[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 3: Run validation**

Run:

```bash
pnpm ts-check
pnpm lint:build
```

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/app/api/teams/route.ts 'src/app/api/teams/[id]/route.ts'
git commit -m "feat: add teams api"
```

---

## Task 4: Todos API and Checklist API

**Files:**
- Create: `src/app/api/todos/route.ts`
- Create: `src/app/api/todos/[id]/route.ts`
- Create: `src/app/api/todos/[id]/checklist/route.ts`
- Create: `src/app/api/todos/[id]/checklist/[itemId]/route.ts`

- [ ] **Step 1: Implement todos collection route**

Create `src/app/api/todos/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, like, SQL } from "drizzle-orm";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { getDb } from "@/storage/database/sqlite-client";
import { ledgers, teams, todos } from "@/storage/database/shared/schema";
import { isTodoPriority, isTodoStatus, normalizeDateOnly, normalizeOptionalId } from "@/lib/todos";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { searchParams } = new URL(request.url);
    const filters: SQL[] = [];
    const teamFilter = searchParams.get("team_id");
    const ledgerFilter = searchParams.get("ledger_id");
    const statusFilter = searchParams.get("status");
    const search = searchParams.get("search");

    if (teamFilter === "none") filters.push(eq(todos.team_id, null));
    else if (teamFilter) filters.push(eq(todos.team_id, Number(teamFilter)));

    if (ledgerFilter === "none") filters.push(eq(todos.ledger_id, null));
    else if (ledgerFilter) filters.push(eq(todos.ledger_id, Number(ledgerFilter)));

    if (statusFilter && isTodoStatus(statusFilter)) filters.push(eq(todos.status, statusFilter));
    if (search) filters.push(like(todos.title, `%${search}%`));

    const rows = await getDb()
      .select({
        todo: todos,
        team_id: teams.id,
        team_name: teams.name,
        team_color: teams.color,
        ledger_id: ledgers.id,
        ledger_name: ledgers.name,
      })
      .from(todos)
      .leftJoin(teams, eq(todos.team_id, teams.id))
      .leftJoin(ledgers, eq(todos.ledger_id, ledgers.id))
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(asc(todos.status), asc(todos.due_date), desc(todos.created_at));

    const data = rows.map((row) => ({
      ...row.todo,
      team: row.team_id === null ? null : {
        id: row.team_id,
        name: row.team_name ?? "",
        color: row.team_color,
        description: null,
        sort_order: 0,
        created_at: "",
        updated_at: "",
      },
      ledger: row.ledger_id === null ? null : {
        id: row.ledger_id,
        name: row.ledger_name ?? "",
      },
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const body = await request.json() as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ success: false, error: "任务标题不能为空" }, { status: 400 });

    const status = isTodoStatus(body.status) ? body.status : "todo";
    const priority = isTodoPriority(body.priority) ? body.priority : "medium";
    const dueDate = normalizeDateOnly(body.due_date) ?? null;
    const teamId = normalizeOptionalId(body.team_id) ?? null;
    const ledgerId = normalizeOptionalId(body.ledger_id) ?? null;

    const inserted = await getDb()
      .insert(todos)
      .values({
        title,
        notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
        status,
        priority,
        due_date: dueDate,
        team_id: teamId,
        ledger_id: ledgerId,
        completed_at: status === "done" ? new Date().toISOString() : null,
      })
      .returning();

    return NextResponse.json({ success: true, data: inserted[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
```

- [ ] **Step 2: Implement todo item route**

Create `src/app/api/todos/[id]/route.ts` with `GET`, `PUT`, and `DELETE`. Use `normalizeTodoStatusTransition()` from `src/lib/todos.ts` when status changes. Keep the route context shape:

```ts
interface RouteContext {
  params: Promise<{ id: string }>;
}
```

The `PUT` body must accept `title`, `notes`, `status`, `priority`, `due_date`, `team_id`, `ledger_id`, and `sort_order`. It must reject empty titles and invalid dates.

- [ ] **Step 3: Implement checklist collection route**

Create `src/app/api/todos/[id]/checklist/route.ts` with `GET` and `POST`. `POST` requires a non-empty `title`, accepts optional `sort_order`, and inserts into `todo_checklist_items`.

- [ ] **Step 4: Implement checklist item route**

Create `src/app/api/todos/[id]/checklist/[itemId]/route.ts` with `PUT` and `DELETE`. `PUT` accepts `title`, `is_done`, and `sort_order`, and updates `updated_at`.

- [ ] **Step 5: Run validation**

Run:

```bash
pnpm ts-check
pnpm lint:build
pnpm test test/todos.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/app/api/todos
git commit -m "feat: add todos api"
```

---

## Task 5: Ledger Team Support

**Files:**
- Modify: `src/app/api/ledgers/route.ts`
- Modify: `src/app/api/ledgers/[id]/route.ts`
- Modify: `src/hooks/use-ledger.tsx` if it assumes the old `Ledger` shape

- [ ] **Step 1: Update ledger creation**

In `src/app/api/ledgers/route.ts`, parse optional `team_id`:

```ts
const teamId = normalizeOptionalId(body.team_id) ?? null;
```

and include:

```ts
team_id: teamId,
```

in the inserted ledger values.

- [ ] **Step 2: Update ledger editing**

In `src/app/api/ledgers/[id]/route.ts`, accept `team_id` with `normalizeOptionalId()`. If the property is present, include `team_id` in the update payload. Keep existing name, description, currency, initial balance, and active behavior unchanged.

- [ ] **Step 3: Run validation**

Run:

```bash
pnpm ts-check
pnpm lint:build
```

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/app/api/ledgers/route.ts 'src/app/api/ledgers/[id]/route.ts' src/hooks/use-ledger.tsx
git commit -m "feat: allow ledgers to belong to teams"
```

---

## Task 6: CLI Commands

**Files:**
- Modify: `scripts/cli.ts`
- Modify: `test/cli.test.ts`

- [ ] **Step 1: Add parser recognition tests**

Append to `test/cli.test.ts`:

```ts
test("team add is recognized as a CLI command", () => {
  const loader = process.env.TSX_LOADER || "tsx";
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      loader,
      resolve(process.cwd(), "scripts/cli.ts"),
      "--api-base",
      "http://127.0.0.1:1",
      "team",
      "add",
      "--name",
      "市场项目",
    ],
    { encoding: "utf8" },
  );

  const output = `${result.stdout}${result.stderr}`;
  assert.equal(output.includes("未知子命令: team add"), false, output);
  assert.match(output, /请求失败/);
});

test("todo add is recognized as a CLI command", () => {
  const loader = process.env.TSX_LOADER || "tsx";
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      loader,
      resolve(process.cwd(), "scripts/cli.ts"),
      "--api-base",
      "http://127.0.0.1:1",
      "todo",
      "add",
      "--title",
      "整理凭证",
    ],
    { encoding: "utf8" },
  );

  const output = `${result.stdout}${result.stderr}`;
  assert.equal(output.includes("未知子命令: todo add"), false, output);
  assert.match(output, /请求失败/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test test/cli.test.ts
```

Expected: FAIL because `team add` and `todo add` are not recognized.

- [ ] **Step 3: Add team commands**

In `scripts/cli.ts`, follow the existing command style and add:

- `team list` -> `GET /api/teams`
- `team add --name --color --desc` -> `POST /api/teams`
- `team update <id> --name --color --desc` -> `PUT /api/teams/[id]`
- `team delete <id>` -> `DELETE /api/teams/[id]`

Use `none` only for nullable IDs in todo/ledger commands, not for team creation.

- [ ] **Step 4: Add todo commands**

In `scripts/cli.ts`, add:

- `todo list [--team <id|none>] [--ledger <id>] [--status <status>] [--search <keyword>]`
- `todo add --title <title> [--notes <notes>] [--team <id>] [--ledger <id>] [--due <YYYY-MM-DD>] [--priority <priority>]`
- `todo update <id> [--title <title>] [--notes <notes>] [--team <id|none>] [--ledger <id|none>] [--due <YYYY-MM-DD|none>] [--priority <priority>] [--status <status>]`
- `todo done <id>`
- `todo delete <id>`

Map CLI flags to API fields:

```ts
{
  title: options.title,
  notes: options.notes,
  team_id: options.team,
  ledger_id: options.ledger,
  due_date: options.due,
  priority: options.priority,
  status: options.status,
}
```

- [ ] **Step 5: Run CLI tests**

Run:

```bash
pnpm test test/cli.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run validation**

Run:

```bash
pnpm ts-check
pnpm lint:build
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add scripts/cli.ts test/cli.test.ts
git commit -m "feat: add todo cli commands"
```

---

## Task 7: Frontend Todo Workbench

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/app-sidebar.tsx`
- Create: `src/components/todos/todos-view.tsx`
- Create: `src/components/todos/todo-stats-cards.tsx`
- Create: `src/components/todos/todo-team-filter.tsx`
- Create: `src/components/todos/todo-list.tsx`
- Create: `src/components/todos/todo-detail-panel.tsx`
- Create: `src/components/todos/todo-dialog.tsx`
- Create: `src/components/todos/team-dialog.tsx`

- [ ] **Step 1: Add tab and sidebar entry**

In `src/app/page.tsx`, extend `Tab`:

```ts
export type Tab = "dashboard" | "transactions" | "categories" | "tags" | "todos" | "settings" | "auth-settings" | "crm-contacts" | "crm-groups" | "crm-events" | "crm-relationships" | "crm-graph" | "crm-timeline";
```

Import:

```ts
import { TodosView } from "@/components/todos/todos-view";
```

Render:

```tsx
{activeTab === "todos" && <TodosView />}
```

In `src/components/app-sidebar.tsx`, import `ListTodo` from `lucide-react`, add a nav group or item labelled 「待办事项」, and call `onTabChange("todos")`.

- [ ] **Step 2: Create stats cards**

Create `src/components/todos/todo-stats-cards.tsx`:

```tsx
"use client";

import { AlertCircle, CheckCircle2, CircleDot, CalendarDays, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { TodoStats } from "@/lib/types";

interface TodoStatsCardsProps {
  stats: TodoStats;
}

export function TodoStatsCards({ stats }: TodoStatsCardsProps) {
  const items = [
    { label: "今日待办", value: stats.today, icon: CalendarDays },
    { label: "进行中", value: stats.doing, icon: CircleDot },
    { label: "已完成", value: stats.done, icon: CheckCircle2 },
    { label: "逾期", value: stats.overdue, icon: AlertCircle },
    { label: "完成率", value: `${stats.completionRate}%`, icon: TrendingUp },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{item.value}</p>
              </div>
              <Icon className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create filter, list, dialogs, and detail panel**

Implement the remaining todo components with these responsibilities:

- `TodoTeamFilter`: receives teams, selected filter, and `onChange`; always renders 全部 and 未归属 before stored teams.
- `TodoList`: receives todos and selected todo ID; uses `getTodoDateBucket()` to render 逾期/今天/未来/无日期/已完成 sections with light row dividers.
- `TodoDetailPanel`: edits selected todo fields and checklist; calls API on save.
- `TodoDialog`: creates a todo; title required.
- `TeamDialog`: creates or edits a team; name required.

Do not add member avatars, assignees, comments, or permission controls.

- [ ] **Step 4: Create `TodosView`**

Create `src/components/todos/todos-view.tsx` as the page coordinator:

- Load `/api/teams`, `/api/ledgers`, and `/api/todos` with existing `useFetch`.
- Keep selected filter state: `"all" | "none" | number`.
- Compute stats using `computeTodoStats()`.
- Show header, stats cards, team filter, list, and detail panel.
- Use `apiPost`, `apiPut`, and `apiDelete` from `src/hooks/use-data.ts`.

- [ ] **Step 5: Run frontend validation**

Run:

```bash
pnpm ts-check
pnpm lint:build
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/app/page.tsx src/components/app-sidebar.tsx src/components/todos
git commit -m "feat: add todo workbench ui"
```

---

## Task 8: Final Verification and Documentation Touches

**Files:**
- Modify: `README.md` if it has feature/API/CLI sections that need the new todo commands.
- Modify: `AGENTS.md` only if this repo has a committed copy and it needs durable command documentation.

- [ ] **Step 1: Update README feature and CLI references**

Add a short section documenting:

```md
## 待办事项

- 支持团队/分组字段，允许未归属。
- 支持待办可选关联账本。
- 支持 checklist、状态、优先级、截止日期和进度统计。

CLI:

pnpm cli team list
pnpm cli todo list
pnpm cli todo add --title "整理本月营销支出凭证"
pnpm cli todo done <id>
```

- [ ] **Step 2: Run full verification**

Run:

```bash
pnpm test
pnpm validate
pnpm build
```

Expected: PASS for all commands.

- [ ] **Step 3: Inspect git diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: only todo-workbench related files changed.

- [ ] **Step 4: Commit docs and final fixes**

Run:

```bash
git add README.md AGENTS.md
git commit -m "docs: document todo workbench"
```

If neither file changed, skip this commit and record that docs already covered the needed information.

---

## Self-Review

### Spec Coverage

- Nullable team/group context: covered in Tasks 1, 2, 3, 5, and 7.
- Ledgers can be unassigned or belong to one team: covered in Tasks 2 and 5.
- Todos can be unassigned and optionally linked to one ledger: covered in Tasks 1, 2, 4, 6, and 7.
- Checklist progress: covered in Tasks 1, 2, 4, and 7.
- API routes: covered in Tasks 3 and 4.
- CLI commands: covered in Task 6.
- shadcn/ui list-first frontend: covered in Task 7.
- Validation and docs: covered in Task 8.

### Placeholder Scan

The plan avoids placeholder red flags such as unfinished markers. Task 4 and Task 7 include implementation responsibilities where full files are large; each names exact routes/components, accepted fields, helper functions, commands, and expected validation.

### Type Consistency

The planned type names are consistent across tasks:

- `Team`
- `Todo`
- `TodoChecklistItem`
- `TodoStatus`
- `TodoPriority`
- `TodoStats`
- `team_id`
- `ledger_id`
- `due_date`
- `completed_at`

Status values remain `todo`, `doing`, `done`, `canceled`. Priority values remain `low`, `medium`, `high`, `urgent`.
