import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./shared/schema";
import { requiresGlobalContactMigration } from "@/lib/contact-migration";
import path from "path";
import fs from "fs";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(DATA_DIR, "ledger-crm.db");

let _db: ReturnType<typeof drizzle> | null = null;

function ensureDataDir(): void {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

function migrateContactsToGlobal(sqlite: Database.Database): void {
  const columns = sqlite.prepare("PRAGMA table_info(crm_contacts)").all() as Array<{ name: string }>;
  if (!requiresGlobalContactMigration(columns.map((column) => column.name))) return;

  sqlite.pragma("foreign_keys = OFF");
  try {
    sqlite.transaction(() => {
      sqlite.exec(`
        CREATE TABLE crm_contacts_global (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT,
          company TEXT,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO crm_contacts_global (id, name, phone, company, notes, created_at, updated_at)
        SELECT id, name, phone, company, notes, created_at, updated_at FROM crm_contacts;
        DROP TABLE crm_contacts;
        ALTER TABLE crm_contacts_global RENAME TO crm_contacts;
        CREATE INDEX crm_contacts_name_idx ON crm_contacts(name);
      `);
    })();
  } finally {
    sqlite.pragma("foreign_keys = ON");
  }
}

export function getDb() {
  if (_db) return _db;

  ensureDataDir();
  const sqlite = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  sqlite.pragma("journal_mode = WAL");
  // Enable foreign keys
  sqlite.pragma("foreign_keys = ON");

  _db = drizzle(sqlite, { schema });
  return _db;
}

export function getRawDb(): Database.Database {
  const db = getDb();
  // Access the underlying better-sqlite3 instance
  return (db as unknown as { $client: Database.Database }).$client;
}

/**
 * Initialize database tables if they don't exist
 */
export function initDatabase(): void {
  ensureDataDir();
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ledgers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      currency TEXT NOT NULL DEFAULT 'CNY',
      initial_balance TEXT NOT NULL DEFAULT '0',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS category_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ledger_id INTEGER NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ledger_id INTEGER NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
      group_id INTEGER REFERENCES category_groups(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ledger_id INTEGER NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ledger_id INTEGER NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      amount TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      transaction_date TEXT NOT NULL DEFAULT (datetime('now')),
      tag_ids TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crm_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      company TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crm_contact_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      log_date TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crm_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ledger_id INTEGER NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crm_group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES crm_groups(id) ON DELETE CASCADE,
      contact_id INTEGER NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crm_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ledger_id INTEGER NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crm_event_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES crm_events(id) ON DELETE CASCADE,
      contact_id INTEGER NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
      role TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crm_relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ledger_id INTEGER NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL,
      source_id INTEGER NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      label TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      token_prefix TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS ledgers_is_active_idx ON ledgers(is_active);
    CREATE INDEX IF NOT EXISTS category_groups_ledger_id_idx ON category_groups(ledger_id);
    CREATE INDEX IF NOT EXISTS categories_ledger_id_idx ON categories(ledger_id);
    CREATE INDEX IF NOT EXISTS categories_type_idx ON categories(type);
    CREATE INDEX IF NOT EXISTS categories_group_id_idx ON categories(group_id);
    CREATE INDEX IF NOT EXISTS tags_ledger_id_idx ON tags(ledger_id);
    CREATE INDEX IF NOT EXISTS transactions_ledger_id_idx ON transactions(ledger_id);
    CREATE INDEX IF NOT EXISTS transactions_category_id_idx ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS transactions_type_idx ON transactions(type);
    CREATE INDEX IF NOT EXISTS transactions_transaction_date_idx ON transactions(transaction_date);
    CREATE INDEX IF NOT EXISTS crm_contacts_name_idx ON crm_contacts(name);
    CREATE INDEX IF NOT EXISTS crm_contact_logs_contact_id_idx ON crm_contact_logs(contact_id);
    CREATE INDEX IF NOT EXISTS crm_groups_ledger_id_idx ON crm_groups(ledger_id);
    CREATE INDEX IF NOT EXISTS crm_group_members_group_id_idx ON crm_group_members(group_id);
    CREATE INDEX IF NOT EXISTS crm_group_members_contact_id_idx ON crm_group_members(contact_id);
    CREATE INDEX IF NOT EXISTS crm_events_ledger_id_idx ON crm_events(ledger_id);
    CREATE INDEX IF NOT EXISTS crm_events_type_idx ON crm_events(type);
    CREATE INDEX IF NOT EXISTS crm_event_participants_event_id_idx ON crm_event_participants(event_id);
    CREATE INDEX IF NOT EXISTS crm_event_participants_contact_id_idx ON crm_event_participants(contact_id);
    CREATE INDEX IF NOT EXISTS crm_relationships_ledger_id_idx ON crm_relationships(ledger_id);
    CREATE INDEX IF NOT EXISTS crm_relationships_source_idx ON crm_relationships(source_type, source_id);
    CREATE INDEX IF NOT EXISTS crm_relationships_target_idx ON crm_relationships(target_type, target_id);
  `);

  migrateContactsToGlobal(sqlite);

  sqlite.close();
}

// Auto-initialize on import in server context
if (typeof window === "undefined") {
  try {
    initDatabase();
  } catch {
    // Will be initialized on first request if needed
  }
}
