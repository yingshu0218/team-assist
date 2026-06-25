import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeChecklistProgress,
  computeTodoStats,
  getTodoDateBucket,
  isTodoPriority,
  isTodoStatus,
  normalizeDateOnly,
  normalizeOptionalId,
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

test("todo status and priority guards accept only known string values", () => {
  assert.equal(isTodoStatus("todo"), true);
  assert.equal(isTodoStatus("doing"), true);
  assert.equal(isTodoStatus("done"), true);
  assert.equal(isTodoStatus("canceled"), true);
  assert.equal(isTodoStatus("archived"), false);
  assert.equal(isTodoStatus(1), false);

  assert.equal(isTodoPriority("low"), true);
  assert.equal(isTodoPriority("medium"), true);
  assert.equal(isTodoPriority("high"), true);
  assert.equal(isTodoPriority("urgent"), true);
  assert.equal(isTodoPriority("normal"), false);
  assert.equal(isTodoPriority(null), false);
});

test("optional id normalization accepts empty values and positive integers", () => {
  assert.equal(normalizeOptionalId(undefined), undefined);
  assert.equal(normalizeOptionalId(null), null);
  assert.equal(normalizeOptionalId(""), null);
  assert.equal(normalizeOptionalId("none"), null);
  assert.equal(normalizeOptionalId(12), 12);
  assert.equal(normalizeOptionalId("34"), 34);
});

test("optional id normalization rejects malformed values", () => {
  assert.throws(() => normalizeOptionalId(true), /ID 必须是正整数或 none/);
  assert.throws(() => normalizeOptionalId(false), /ID 必须是正整数或 none/);
  assert.throws(() => normalizeOptionalId([]), /ID 必须是正整数或 none/);
  assert.throws(() => normalizeOptionalId({ id: 1 }), /ID 必须是正整数或 none/);
  assert.throws(() => normalizeOptionalId(0), /ID 必须是正整数或 none/);
  assert.throws(() => normalizeOptionalId("1.5"), /ID 必须是正整数或 none/);
});

test("date-only normalization accepts empty values and real dates", () => {
  assert.equal(normalizeDateOnly(undefined), undefined);
  assert.equal(normalizeDateOnly(null), null);
  assert.equal(normalizeDateOnly(""), null);
  assert.equal(normalizeDateOnly("none"), null);
  assert.equal(normalizeDateOnly("2026-02-28"), "2026-02-28");
  assert.equal(normalizeDateOnly("2024-02-29"), "2024-02-29");
});

test("date-only normalization rejects malformed and impossible dates", () => {
  assert.throws(() => normalizeDateOnly("2026-2-28"), /日期必须为空或 YYYY-MM-DD/);
  assert.throws(() => normalizeDateOnly("2026-02-31"), /日期必须为空或 YYYY-MM-DD/);
  assert.throws(() => normalizeDateOnly("2026-13-01"), /日期必须为空或 YYYY-MM-DD/);
  assert.throws(() => normalizeDateOnly("2026-00-10"), /日期必须为空或 YYYY-MM-DD/);
  assert.throws(() => normalizeDateOnly(20260228), /日期必须为空或 YYYY-MM-DD/);
});
