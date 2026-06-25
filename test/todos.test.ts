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
