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
    const todo = sqlite.prepare("SELECT team_id, ledger_id FROM todos WHERE id = 1").get() as {
      team_id: number | null;
      ledger_id: number | null;
    };
    assert.equal(ledger.team_id, null);
    assert.equal(todo.team_id, null);
    assert.equal(todo.ledger_id, 1);

    sqlite.prepare("DELETE FROM ledgers WHERE id = 1").run();
    const todoAfterLedgerDelete = sqlite.prepare("SELECT ledger_id FROM todos WHERE id = 1").get() as {
      ledger_id: number | null;
    };
    assert.equal(todoAfterLedgerDelete.ledger_id, null);

    sqlite.prepare("DELETE FROM todos WHERE id = 1").run();
    const checklistCount = sqlite.prepare("SELECT COUNT(*) AS count FROM todo_checklist_items").get() as {
      count: number;
    };
    assert.equal(checklistCount.count, 0);
  } finally {
    sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
