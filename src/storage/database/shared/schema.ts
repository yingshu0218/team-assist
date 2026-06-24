import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ==================== 账本表 ====================

export const ledgers = sqliteTable(
  "ledgers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    currency: text("currency").default("CNY").notNull(),
    initial_balance: text("initial_balance").default("0").notNull(),
    is_active: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    created_at: text("created_at").default(sql`(datetime('now'))`).notNull(),
    updated_at: text("updated_at").default(sql`(datetime('now'))`).notNull(),
  },
  (table) => [index("ledgers_is_active_idx").on(table.is_active)],
);

// ==================== 分类分组表 ====================

export const category_groups = sqliteTable(
  "category_groups",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ledger_id: integer("ledger_id").notNull().references(() => ledgers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(), // 'income' | 'expense'
    icon: text("icon"),
    sort_order: integer("sort_order").default(0).notNull(),
    created_at: text("created_at").default(sql`(datetime('now'))`).notNull(),
  },
  (table) => [index("category_groups_ledger_id_idx").on(table.ledger_id)],
);

// ==================== 分类表 ====================

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ledger_id: integer("ledger_id").notNull().references(() => ledgers.id, { onDelete: "cascade" }),
    group_id: integer("group_id").references(() => category_groups.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    type: text("type").notNull(), // 'income' | 'expense'
    icon: text("icon"),
    color: text("color"),
    sort_order: integer("sort_order").default(0).notNull(),
    created_at: text("created_at").default(sql`(datetime('now'))`).notNull(),
  },
  (table) => [
    index("categories_ledger_id_idx").on(table.ledger_id),
    index("categories_type_idx").on(table.type),
    index("categories_group_id_idx").on(table.group_id),
  ],
);

// ==================== 标签表 ====================

export const tags = sqliteTable(
  "tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ledger_id: integer("ledger_id").notNull().references(() => ledgers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    created_at: text("created_at").default(sql`(datetime('now'))`).notNull(),
  },
  (table) => [index("tags_ledger_id_idx").on(table.ledger_id)],
);

// ==================== 交易记录表 ====================

export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ledger_id: integer("ledger_id").notNull().references(() => ledgers.id, { onDelete: "cascade" }),
    category_id: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    amount: text("amount").notNull(), // stored as string for precision
    type: text("type").notNull(), // 'income' | 'expense'
    description: text("description"),
    transaction_date: text("transaction_date").default(sql`(datetime('now'))`).notNull(),
    tag_ids: text("tag_ids"), // JSON array string: "[1,2,3]"
    created_at: text("created_at").default(sql`(datetime('now'))`).notNull(),
    updated_at: text("updated_at").default(sql`(datetime('now'))`).notNull(),
  },
  (table) => [
    index("transactions_ledger_id_idx").on(table.ledger_id),
    index("transactions_category_id_idx").on(table.category_id),
    index("transactions_type_idx").on(table.type),
    index("transactions_transaction_date_idx").on(table.transaction_date),
  ],
);

// ==================== CRM 联系人表 ====================

export const crm_contacts = sqliteTable(
  "crm_contacts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    phone: text("phone"),
    company: text("company"),
    region: text("region"),
    notes: text("notes"),
    created_at: text("created_at").default(sql`(datetime('now'))`).notNull(),
    updated_at: text("updated_at").default(sql`(datetime('now'))`).notNull(),
  },
  (table) => [index("crm_contacts_name_idx").on(table.name)],
);

// ==================== CRM 联系记录表 ====================

export const crm_contact_logs = sqliteTable(
  "crm_contact_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    contact_id: integer("contact_id").notNull().references(() => crm_contacts.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    log_date: text("log_date").default(sql`(datetime('now'))`).notNull(),
    created_at: text("created_at").default(sql`(datetime('now'))`).notNull(),
  },
  (table) => [index("crm_contact_logs_contact_id_idx").on(table.contact_id)],
);

// ==================== CRM 分组表 ====================

export const crm_groups = sqliteTable(
  "crm_groups",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ledger_id: integer("ledger_id").notNull().references(() => ledgers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    description: text("description"),
    created_at: text("created_at").default(sql`(datetime('now'))`).notNull(),
    updated_at: text("updated_at").default(sql`(datetime('now'))`).notNull(),
  },
  (table) => [index("crm_groups_ledger_id_idx").on(table.ledger_id)],
);

// ==================== CRM 分组成员表 ====================

export const crm_group_members = sqliteTable(
  "crm_group_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    group_id: integer("group_id").notNull().references(() => crm_groups.id, { onDelete: "cascade" }),
    contact_id: integer("contact_id").notNull().references(() => crm_contacts.id, { onDelete: "cascade" }),
    created_at: text("created_at").default(sql`(datetime('now'))`).notNull(),
  },
  (table) => [
    index("crm_group_members_group_id_idx").on(table.group_id),
    index("crm_group_members_contact_id_idx").on(table.contact_id),
  ],
);

// ==================== CRM 事件/项目表 ====================

export const crm_events = sqliteTable(
  "crm_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ledger_id: integer("ledger_id").notNull().references(() => ledgers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: text("type").notNull(), // 'event' | 'project'
    created_at: text("created_at").default(sql`(datetime('now'))`).notNull(),
    updated_at: text("updated_at").default(sql`(datetime('now'))`).notNull(),
  },
  (table) => [
    index("crm_events_ledger_id_idx").on(table.ledger_id),
    index("crm_events_type_idx").on(table.type),
  ],
);

// ==================== CRM 事件参与者表 ====================

export const crm_event_participants = sqliteTable(
  "crm_event_participants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    event_id: integer("event_id").notNull().references(() => crm_events.id, { onDelete: "cascade" }),
    contact_id: integer("contact_id").notNull().references(() => crm_contacts.id, { onDelete: "cascade" }),
    role: text("role"),
    created_at: text("created_at").default(sql`(datetime('now'))`).notNull(),
  },
  (table) => [
    index("crm_event_participants_event_id_idx").on(table.event_id),
    index("crm_event_participants_contact_id_idx").on(table.contact_id),
  ],
);

// ==================== CRM 关联关系表 ====================

export const crm_relationships = sqliteTable(
  "crm_relationships",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ledger_id: integer("ledger_id").notNull().references(() => ledgers.id, { onDelete: "cascade" }),
    source_type: text("source_type").notNull(), // 'contact' | 'event'
    source_id: integer("source_id").notNull(),
    target_type: text("target_type").notNull(), // 'contact' | 'event'
    target_id: integer("target_id").notNull(),
    label: text("label"),
    created_at: text("created_at").default(sql`(datetime('now'))`).notNull(),
  },
  (table) => [
    index("crm_relationships_ledger_id_idx").on(table.ledger_id),
    index("crm_relationships_source_idx").on(table.source_type, table.source_id),
    index("crm_relationships_target_idx").on(table.target_type, table.target_id),
  ],
);

// ==================== 管理员账号表 ====================

export const admin_accounts = sqliteTable("admin_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  created_at: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updated_at: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

// ==================== Agent 调用凭证表 ====================

export const agent_tokens = sqliteTable("agent_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  token_hash: text("token_hash").notNull().unique(),
  token_prefix: text("token_prefix").notNull(),
  is_active: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  last_used_at: text("last_used_at"),
  created_at: text("created_at").default(sql`(datetime('now'))`).notNull(),
});
