#!/usr/bin/env npx tsx
/**
 * 团队管理助手 - CLI 命令行工具
 *
 * 使用方式:
 *   npx tsx scripts/cli.ts [options] <command> [subcommand] [args]
 *
 * 选项:
 *   --token <TOKEN>     Agent Token 凭证
 *   --api-base <URL>     API 服务地址 (默认 http://localhost:5000)
 *
 * 命令列表:
 *   ledger list                              - 列出所有账本
 *   ledger create --name <name> [--desc <d>] - 创建新账本
 *   ledger use <id>                          - 切换当前账本
 *   ledger delete <id>                       - 删除账本
 *   tx add --amount <n> --type <income|expense> [--category <name>] [--desc <desc>] [--date <YYYY-MM-DD>]
 *   tx list [--type <income|expense>] [--limit <n>]
 *   tx update <id> [--amount <n>] [--type <income|expense>] [--category <name>] [--desc <desc>]
 *   tx delete <id>                           - 删除交易记录
 *   category-group list [--type <income|expense>]
 *   category-group add --name <n> --type <income|expense> [--icon <icon>]
 *   category-group update <id> [--name <n>] [--icon <icon>]
 *   category-group delete <id>
 *   category list [--type <income|expense>]
 *   category add --name <n> --type <income|expense> [--group <group_id>] [--icon <icon>] [--color <color>]
 *   category update <id> [--name <n>] [--icon <icon>] [--color <color>]
 *   category delete <id>
 *   tag list                                 - 列出标签
 *   tag add --name <name> [--color <color>]
 *   tag update <id> [--name <n>] [--color <c>]
 *   tag delete <id>
 *   stats                                    - 查看统计数据
 *   contact list [--search <keyword>] [--group <group_id>]
 *   contact add --name <n> [--phone <p>] [--company <c>] [--notes <n>]
 *   contact get <id>
 *   contact update <id> [--name <n>] [--phone <p>] [--company <c>] [--notes <n>]
 *   contact delete <id>
 *   contact log <id> --content <text>
 *   group list
 *   group add --name <n> [--color <c>] [--desc <d>]
 *   group update <id> [--name <n>] [--color <c>] [--desc <d>]
 *   group delete <id>
 *   group add-member <id> --contact <cid>
 *   group remove-member <id> --contact <cid>
 *   event list [--type <event|project>]
 *   event add --title <t> --type <event|project>
 *   event get <id>
 *   event update <id> [--title <t>]
 *   event delete <id>
 *   event add-participant <id> --contact <cid> [--role <r>]
 *   event remove-participant <id> --contact <cid>
 *   relation list
 *   relation add --source-type <contact|event> --source-id <id> --target-type <contact|event> --target-id <id> [--label <l>]
 *   relation delete <id>
 *   graph                                    - 查看关系图谱数据
 *   export ledger <id> [--format csv|json] [--period all|month|year|custom] [--start-date <YYYY-MM-DD>] [--end-date <YYYY-MM-DD>]
 *   export contacts [--format csv|json]
 *   guide                                    - 查看 Agent 接入引导
 *   chat <message>                           - 自然语言交互
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

// ==================== 配置 ====================

const CONFIG_FILE = join(process.cwd(), ".cli-config.json");

interface CliConfig {
  activeLedgerId: number | null;
  agentToken?: string;
  apiBase?: string;
}

function loadConfig(): CliConfig {
  if (existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    } catch {
      // ignore
    }
  }
  return { activeLedgerId: null };
}

function saveConfig(config: CliConfig): void {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getActiveLedgerId(): number {
  const config = loadConfig();
  if (!config.activeLedgerId) {
    console.error("错误: 未设置当前账本，请先运行 'ledger use <id>' 或 'ledger list' 查看可用账本");
    process.exit(1);
  }
  return config.activeLedgerId;
}

// ==================== API 客户端 ====================

function getApiBase(): string {
  const config = loadConfig();
  return config.apiBase || process.env.API_BASE_URL || `http://localhost:${process.env.DEPLOY_RUN_PORT || 5000}`;
}

function getToken(): string | undefined {
  const config = loadConfig();
  return config.agentToken;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; error?: string }> {
  const baseUrl = getApiBase();
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  try {
    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
    return res.json();
  } catch (err) {
    console.error(`请求失败: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

// ==================== 工具函数 ====================

function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : "true";
      result[key] = value;
    }
  }
  return result;
}

// 颜色输出
const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

// ==================== 账本命令 ====================

async function ledgerList() {
  const result = await apiFetch<{ id: number; name: string; description: string | null; currency: string; created_at: string }[]>("/api/ledgers");
  if (!result.success) { console.error("查询失败:", result.error); process.exit(1); }
  const data = result.data || [];

  const config = loadConfig();
  console.log(c.bold("\n📒 账本列表\n"));
  if (data.length === 0) {
    console.log(c.dim("  暂无账本，使用 'ledger create --name <名称>' 创建"));
    return;
  }

  for (const ledger of data) {
    const isActive = ledger.id === config.activeLedgerId;
    const marker = isActive ? c.green("●") : c.dim("○");
    console.log(`  ${marker} ${c.bold(`[${ledger.id}]`)} ${ledger.name} ${c.dim(`(${ledger.currency})`)}`);
    if (ledger.description) {
      console.log(c.dim(`      ${ledger.description}`));
    }
  }
  console.log(c.dim(`\n  共 ${data.length} 个账本${config.activeLedgerId ? `，当前使用 #${config.activeLedgerId}` : ""}\n`));
}

async function ledgerCreate(args: string[]) {
  const opts = parseArgs(args);
  if (!opts.name) {
    console.error("用法: ledger create --name <名称> [--desc <描述>]");
    process.exit(1);
  }

  const result = await apiFetch<{ id: number; name: string }>("/api/ledgers", {
    method: "POST",
    body: JSON.stringify({ name: opts.name, description: opts.desc || null }),
  });

  if (!result.success) { console.error("创建失败:", result.error); process.exit(1); }
  const data = result.data!;

  console.log(c.green(`\n✓ 账本「${opts.name}」创建成功 (ID: ${data.id})`));
  console.log(c.dim(`  已自动初始化默认分类\n`));
}

async function ledgerUse(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) {
    console.error("用法: ledger use <id>");
    process.exit(1);
  }

  const result = await apiFetch<{ id: number; name: string }>(`/api/ledgers/${id}`);
  if (!result.success) { console.error(`错误: 账本 #${id} 不存在`); process.exit(1); }

  saveConfig({ ...loadConfig(), activeLedgerId: id });
  console.log(c.green(`\n✓ 已切换到账本「${result.data!.name}」(ID: ${id})\n`));
}

async function ledgerDelete(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) {
    console.error("用法: ledger delete <id>");
    process.exit(1);
  }

  const result = await apiFetch(`/api/ledgers/${id}`, { method: "DELETE" });
  if (!result.success) { console.error("删除失败:", result.error); process.exit(1); }

  const config = loadConfig();
  if (config.activeLedgerId === id) {
    saveConfig({ ...config, activeLedgerId: null });
  }

  console.log(c.green(`\n✓ 账本 #${id} 已删除\n`));
}

// ==================== 交易命令 ====================

async function txAdd(args: string[]) {
  const opts = parseArgs(args);
  const ledgerId = getActiveLedgerId();

  if (!opts.amount || !opts.type) {
    console.error("用法: tx add --amount <金额> --type <income|expense> [--category <分类名>] [--desc <备注>] [--date <YYYY-MM-DD>]");
    process.exit(1);
  }

  const amount = parseFloat(opts.amount);
  if (isNaN(amount) || amount <= 0) {
    console.error("错误: 金额必须为正数");
    process.exit(1);
  }

  if (opts.type !== "income" && opts.type !== "expense") {
    console.error("错误: type 必须为 income 或 expense");
    process.exit(1);
  }

  // 查找分类 ID
  let categoryId: number | null = null;
  if (opts.category) {
    const catResult = await apiFetch<{ id: number; name: string }[]>(`/api/categories?ledger_id=${ledgerId}`);
    if (catResult.success && catResult.data) {
      const found = catResult.data.find((cat: { id: number; name: string }) => cat.name === opts.category);
      if (found) categoryId = found.id;
      else console.error(c.yellow(`警告: 分类「${opts.category}」不存在，记录将标记为未分类`));
    }
  }

  const result = await apiFetch<{ id: number; type: string; amount: string; category_id: number | null }>("/api/transactions", {
    method: "POST",
    body: JSON.stringify({
      ledger_id: ledgerId,
      category_id: categoryId,
      amount: String(amount),
      type: opts.type,
      description: opts.desc || null,
      transaction_date: opts.date || new Date().toISOString().slice(0, 10),
    }),
  });

  if (!result.success) { console.error("添加失败:", result.error); process.exit(1); }
  const data = result.data!;

  const typeLabel = opts.type === "income" ? c.green("收入") : c.red("支出");
  const amountStr = opts.type === "income" ? c.green(`+¥${formatCurrency(amount)}`) : c.red(`-¥${formatCurrency(amount)}`);
  console.log(c.green("\n✓ 记录添加成功"));
  console.log(`  ${c.bold(`#${data.id}`)} ${typeLabel} ${amountStr}`);
  console.log(`  分类: ${opts.category || "未分类"}`);
  if (opts.desc) console.log(`  备注: ${opts.desc}`);
  console.log(c.dim(`  日期: ${opts.date || new Date().toISOString().slice(0, 10)}\n`));
}

async function txList(args: string[]) {
  const opts = parseArgs(args);
  const ledgerId = getActiveLedgerId();
  const limit = parseInt(opts.limit || "20", 10);

  let url = `/api/transactions?ledger_id=${ledgerId}&limit=${limit}`;
  if (opts.type) url += `&type=${opts.type}`;

  const result = await apiFetch<{ id: number; type: string; amount: string; description: string | null; transaction_date: string; category_id: number | null }[]>(url);
  if (!result.success) { console.error("查询失败:", result.error); process.exit(1); }
  const data = result.data || [];

  console.log(c.bold("\n💰 收支明细\n"));
  if (data.length === 0) {
    console.log(c.dim("  暂无记录\n"));
    return;
  }

  // 获取分类名
  const catResult = await apiFetch<{ id: number; name: string }[]>(`/api/categories?ledger_id=${ledgerId}`);
  const catMap = new Map((catResult.data || []).map((c: { id: number; name: string }) => [c.id, c.name]));

  for (const tx of data) {
    const typeLabel = tx.type === "income" ? c.green("收入") : c.red("支出");
    const amountStr = tx.type === "income" ? c.green(`+¥${formatCurrency(tx.amount)}`) : c.red(`-¥${formatCurrency(tx.amount)}`);
    const catName = tx.category_id ? catMap.get(tx.category_id) || "未分类" : "未分类";
    console.log(`  ${c.bold(`#${tx.id}`)} ${typeLabel} ${amountStr}`);
    console.log(`      ${catName} · ${formatDate(tx.transaction_date)}`);
    if (tx.description) console.log(c.dim(`      ${tx.description}`));
  }
  console.log(c.dim(`\n  共 ${data.length} 条记录\n`));
}

async function txUpdate(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: tx update <id> [options]"); process.exit(1); }

  const opts = parseArgs(args.slice(1));
  const body: Record<string, unknown> = {};
  if (opts.amount) body.amount = String(parseFloat(opts.amount));
  if (opts.type) body.type = opts.type;
  if (opts.desc !== undefined) body.description = opts.desc;

  if (opts.category) {
    const ledgerId = getActiveLedgerId();
    const catResult = await apiFetch<{ id: number; name: string }[]>(`/api/categories?ledger_id=${ledgerId}`);
    if (catResult.success && catResult.data) {
      const found = catResult.data.find((c: { id: number; name: string }) => c.name === opts.category);
      if (found) body.category_id = found.id;
    }
  }

  const result = await apiFetch(`/api/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!result.success) { console.error("更新失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 交易 #${id} 更新成功\n`));
}

async function txDelete(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: tx delete <id>"); process.exit(1); }

  const result = await apiFetch(`/api/transactions/${id}`, { method: "DELETE" });
  if (!result.success) { console.error("删除失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 交易 #${id} 已删除\n`));
}

// ==================== 分类分组命令 ====================

async function categoryGroupList(args: string[]) {
  const opts = parseArgs(args);
  const ledgerId = getActiveLedgerId();
  let url = `/api/category-groups?ledger_id=${ledgerId}`;
  if (opts.type) url += `&type=${opts.type}`;

  const result = await apiFetch<{ id: number; name: string; type: string; icon: string | null; sort_order: number }[]>(url);
  if (!result.success) { console.error("查询失败:", result.error); process.exit(1); }
  const data = result.data || [];

  console.log(c.bold("\n📂 分类分组\n"));
  for (const g of data) {
    const typeLabel = g.type === "income" ? c.green("[收入]") : c.red("[支出]");
    console.log(`  ${c.bold(`[${g.id}]`)} ${typeLabel} ${g.name} ${g.icon ? c.dim(g.icon) : ""}`);
  }
  console.log(c.dim(`\n  共 ${data.length} 个分组\n`));
}

async function categoryGroupAdd(args: string[]) {
  const opts = parseArgs(args);
  const ledgerId = getActiveLedgerId();
  if (!opts.name || !opts.type) {
    console.error("用法: category-group add --name <名称> --type <income|expense> [--icon <图标>]");
    process.exit(1);
  }

  const result = await apiFetch("/api/category-groups", {
    method: "POST",
    body: JSON.stringify({ ledger_id: ledgerId, name: opts.name, type: opts.type, icon: opts.icon || null }),
  });
  if (!result.success) { console.error("创建失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 分组「${opts.name}」创建成功\n`));
}

async function categoryGroupUpdate(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: category-group update <id> [options]"); process.exit(1); }
  const opts = parseArgs(args.slice(1));
  const body: Record<string, unknown> = {};
  if (opts.name) body.name = opts.name;
  if (opts.icon) body.icon = opts.icon;

  const result = await apiFetch(`/api/category-groups/${id}`, { method: "PUT", body: JSON.stringify(body) });
  if (!result.success) { console.error("更新失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 分组 #${id} 更新成功\n`));
}

async function categoryGroupDelete(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: category-group delete <id>"); process.exit(1); }

  const result = await apiFetch(`/api/category-groups/${id}`, { method: "DELETE" });
  if (!result.success) { console.error("删除失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 分组 #${id} 已删除\n`));
}

// ==================== 分类命令 ====================

async function categoryList(args: string[]) {
  const opts = parseArgs(args);
  const ledgerId = getActiveLedgerId();
  let url = `/api/categories?ledger_id=${ledgerId}`;
  if (opts.type) url += `&type=${opts.type}`;

  const result = await apiFetch<{ id: number; name: string; type: string; icon: string | null; color: string | null; group_id: number | null; sort_order: number }[]>(url);
  if (!result.success) { console.error("查询失败:", result.error); process.exit(1); }
  const data = result.data || [];

  console.log(c.bold("\n🏷️ 分类列表\n"));
  for (const cat of data) {
    const typeLabel = cat.type === "income" ? c.green("[收入]") : c.red("[支出]");
    console.log(`  ${c.bold(`[${cat.id}]`)} ${typeLabel} ${cat.name} ${cat.icon ? c.dim(cat.icon) : ""}`);
  }
  console.log(c.dim(`\n  共 ${data.length} 个分类\n`));
}

async function categoryAdd(args: string[]) {
  const opts = parseArgs(args);
  const ledgerId = getActiveLedgerId();
  if (!opts.name || !opts.type) {
    console.error("用法: category add --name <名称> --type <income|expense> [--group <分组ID>] [--icon <图标>] [--color <颜色>]");
    process.exit(1);
  }

  const result = await apiFetch("/api/categories", {
    method: "POST",
    body: JSON.stringify({
      ledger_id: ledgerId, name: opts.name, type: opts.type,
      group_id: opts.group ? parseInt(opts.group, 10) : null,
      icon: opts.icon || null, color: opts.color || null,
    }),
  });
  if (!result.success) { console.error("创建失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 分类「${opts.name}」创建成功\n`));
}

async function categoryUpdate(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: category update <id> [options]"); process.exit(1); }
  const opts = parseArgs(args.slice(1));
  const body: Record<string, unknown> = {};
  if (opts.name) body.name = opts.name;
  if (opts.icon) body.icon = opts.icon;
  if (opts.color) body.color = opts.color;

  const result = await apiFetch(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify(body) });
  if (!result.success) { console.error("更新失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 分类 #${id} 更新成功\n`));
}

async function categoryDelete(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: category delete <id>"); process.exit(1); }

  const result = await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
  if (!result.success) { console.error("删除失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 分类 #${id} 已删除\n`));
}

// ==================== 标签命令 ====================

async function tagList() {
  const ledgerId = getActiveLedgerId();
  const result = await apiFetch<{ id: number; name: string; color: string | null }[]>(`/api/tags?ledger_id=${ledgerId}`);
  if (!result.success) { console.error("查询失败:", result.error); process.exit(1); }
  const data = result.data || [];

  console.log(c.bold("\n🏷️ 标签列表\n"));
  for (const tag of data) {
    console.log(`  ${c.bold(`[${tag.id}]`)} ${tag.name} ${tag.color ? c.dim(tag.color) : ""}`);
  }
  console.log(c.dim(`\n  共 ${data.length} 个标签\n`));
}

async function tagAdd(args: string[]) {
  const opts = parseArgs(args);
  const ledgerId = getActiveLedgerId();
  if (!opts.name) { console.error("用法: tag add --name <名称> [--color <颜色>]"); process.exit(1); }

  const result = await apiFetch("/api/tags", {
    method: "POST",
    body: JSON.stringify({ ledger_id: ledgerId, name: opts.name, color: opts.color || null }),
  });
  if (!result.success) { console.error("创建失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 标签「${opts.name}」创建成功\n`));
}

async function tagUpdate(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: tag update <id> [options]"); process.exit(1); }
  const opts = parseArgs(args.slice(1));
  const body: Record<string, unknown> = {};
  if (opts.name) body.name = opts.name;
  if (opts.color) body.color = opts.color;

  const result = await apiFetch(`/api/tags/${id}`, { method: "PUT", body: JSON.stringify(body) });
  if (!result.success) { console.error("更新失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 标签 #${id} 更新成功\n`));
}

async function tagDelete(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: tag delete <id>"); process.exit(1); }

  const result = await apiFetch(`/api/tags/${id}`, { method: "DELETE" });
  if (!result.success) { console.error("删除失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 标签 #${id} 已删除\n`));
}

// ==================== 统计命令 ====================

async function statsCommand() {
  const ledgerId = getActiveLedgerId();
  const result = await apiFetch<{ totalIncome: string; totalExpense: string; balance: string; categoryBreakdown: Record<string, string>; recentTransactions: unknown[] }>(`/api/stats?ledger_id=${ledgerId}`);
  if (!result.success) { console.error("查询失败:", result.error); process.exit(1); }
  const data = result.data!;

  console.log(c.bold("\n📊 统计概览\n"));
  console.log(`  ${c.green("总收入")}: ¥${formatCurrency(data.totalIncome)}`);
  console.log(`  ${c.red("总支出")}: ¥${formatCurrency(data.totalExpense)}`);
  console.log(`  ${c.bold("余额")}:   ¥${formatCurrency(data.balance)}`);

  if (data.categoryBreakdown && Object.keys(data.categoryBreakdown).length > 0) {
    console.log(c.bold("\n  分类汇总:"));
    for (const [cat, amount] of Object.entries(data.categoryBreakdown)) {
      console.log(`    ${cat}: ¥${formatCurrency(amount)}`);
    }
  }
  console.log();
}

// ==================== CRM 联系人命令 ====================

async function contactList(args: string[]) {
  const opts = parseArgs(args);
  const ledgerId = getActiveLedgerId();
  let url = `/api/crm/contacts?ledger_id=${ledgerId}`;
  if (opts.search) url += `&search=${encodeURIComponent(opts.search)}`;
  if (opts.group) url += `&group_id=${opts.group}`;

  const result = await apiFetch<{ id: number; name: string; phone: string | null; company: string | null; notes: string | null }[]>(url);
  if (!result.success) { console.error("查询失败:", result.error); process.exit(1); }
  const data = result.data || [];

  console.log(c.bold("\n👤 联系人列表\n"));
  if (data.length === 0) {
    console.log(c.dim("  暂无联系人\n"));
    return;
  }
  for (const ct of data) {
    console.log(`  ${c.bold(`[${ct.id}]`)} ${ct.name}`);
    if (ct.phone) console.log(c.dim(`      📞 ${ct.phone}`));
    if (ct.company) console.log(c.dim(`      🏢 ${ct.company}`));
  }
  console.log(c.dim(`\n  共 ${data.length} 个联系人\n`));
}

async function contactAdd(args: string[]) {
  const opts = parseArgs(args);
  const ledgerId = getActiveLedgerId();
  if (!opts.name) { console.error("用法: contact add --name <名称> [--phone <电话>] [--company <公司>] [--notes <备注>]"); process.exit(1); }

  const result = await apiFetch("/api/crm/contacts", {
    method: "POST",
    body: JSON.stringify({ ledger_id: ledgerId, name: opts.name, phone: opts.phone || null, company: opts.company || null, notes: opts.notes || null }),
  });
  if (!result.success) { console.error("创建失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 联系人「${opts.name}」创建成功\n`));
}

async function contactGet(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: contact get <id>"); process.exit(1); }

  const result = await apiFetch(`/api/crm/contacts/${id}`);
  if (!result.success) { console.error("查询失败:", result.error); process.exit(1); }
  const data = result.data as Record<string, unknown>;

  console.log(c.bold(`\n👤 联系人详情 #${id}\n`));
  console.log(`  姓名: ${data.name}`);
  if (data.phone) console.log(`  电话: ${data.phone}`);
  if (data.company) console.log(`  公司: ${data.company}`);
  if (data.notes) console.log(`  备注: ${data.notes}`);
}

async function contactUpdate(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: contact update <id> [options]"); process.exit(1); }
  const opts = parseArgs(args.slice(1));
  const body: Record<string, unknown> = {};
  if (opts.name) body.name = opts.name;
  if (opts.phone) body.phone = opts.phone;
  if (opts.company) body.company = opts.company;
  if (opts.notes) body.notes = opts.notes;

  const result = await apiFetch(`/api/crm/contacts/${id}`, { method: "PUT", body: JSON.stringify(body) });
  if (!result.success) { console.error("更新失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 联系人 #${id} 更新成功\n`));
}

async function contactDelete(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: contact delete <id>"); process.exit(1); }

  const result = await apiFetch(`/api/crm/contacts/${id}`, { method: "DELETE" });
  if (!result.success) { console.error("删除失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 联系人 #${id} 已删除\n`));
}

async function contactLog(args: string[]) {
  const id = parseInt(args[0], 10);
  const opts = parseArgs(args.slice(1));
  if (!id || !opts.content) { console.error("用法: contact log <id> --content <内容>"); process.exit(1); }

  const result = await apiFetch(`/api/crm/contacts/${id}/logs`, {
    method: "POST",
    body: JSON.stringify({ content: opts.content }),
  });
  if (!result.success) { console.error("添加失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 联系记录已添加\n`));
}

// ==================== CRM 分组命令 ====================

async function groupList() {
  const ledgerId = getActiveLedgerId();
  const result = await apiFetch<{ id: number; name: string; color: string | null; description: string | null }[]>(`/api/crm/groups?ledger_id=${ledgerId}`);
  if (!result.success) { console.error("查询失败:", result.error); process.exit(1); }
  const data = result.data || [];

  console.log(c.bold("\n👥 分组列表\n"));
  for (const g of data) {
    console.log(`  ${c.bold(`[${g.id}]`)} ${g.name} ${g.color ? c.dim(g.color) : ""}`);
    if (g.description) console.log(c.dim(`      ${g.description}`));
  }
  console.log(c.dim(`\n  共 ${data.length} 个分组\n`));
}

async function groupAdd(args: string[]) {
  const opts = parseArgs(args);
  const ledgerId = getActiveLedgerId();
  if (!opts.name) { console.error("用法: group add --name <名称> [--color <颜色>] [--desc <描述>]"); process.exit(1); }

  const result = await apiFetch("/api/crm/groups", {
    method: "POST",
    body: JSON.stringify({ ledger_id: ledgerId, name: opts.name, color: opts.color || null, description: opts.desc || null }),
  });
  if (!result.success) { console.error("创建失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 分组「${opts.name}」创建成功\n`));
}

async function groupUpdate(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: group update <id> [options]"); process.exit(1); }
  const opts = parseArgs(args.slice(1));
  const body: Record<string, unknown> = {};
  if (opts.name) body.name = opts.name;
  if (opts.color) body.color = opts.color;
  if (opts.desc) body.description = opts.desc;

  const result = await apiFetch(`/api/crm/groups/${id}`, { method: "PUT", body: JSON.stringify(body) });
  if (!result.success) { console.error("更新失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 分组 #${id} 更新成功\n`));
}

async function groupDelete(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: group delete <id>"); process.exit(1); }

  const result = await apiFetch(`/api/crm/groups/${id}`, { method: "DELETE" });
  if (!result.success) { console.error("删除失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 分组 #${id} 已删除\n`));
}

async function groupAddMember(args: string[]) {
  const id = parseInt(args[0], 10);
  const opts = parseArgs(args.slice(1));
  if (!id || !opts.contact) { console.error("用法: group add-member <id> --contact <联系人ID>"); process.exit(1); }

  const result = await apiFetch(`/api/crm/groups/${id}/members`, {
    method: "POST",
    body: JSON.stringify({ contact_id: parseInt(opts.contact, 10) }),
  });
  if (!result.success) { console.error("添加失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 成员已添加到分组 #${id}\n`));
}

async function groupRemoveMember(args: string[]) {
  const id = parseInt(args[0], 10);
  const opts = parseArgs(args.slice(1));
  if (!id || !opts.contact) { console.error("用法: group remove-member <id> --contact <联系人ID>"); process.exit(1); }

  const result = await apiFetch(`/api/crm/groups/${id}/members?contact_id=${opts.contact}`, { method: "DELETE" });
  if (!result.success) { console.error("移除失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 成员已从分组 #${id} 移除\n`));
}

// ==================== CRM 事件/项目命令 ====================

async function eventList(args: string[]) {
  const opts = parseArgs(args);
  const ledgerId = getActiveLedgerId();
  let url = `/api/crm/events?ledger_id=${ledgerId}`;
  if (opts.type) url += `&type=${opts.type}`;

  const result = await apiFetch<{ id: number; title: string; type: string }[]>(url);
  if (!result.success) { console.error("查询失败:", result.error); process.exit(1); }
  const data = result.data || [];

  console.log(c.bold("\n📋 事件/项目列表\n"));
  for (const e of data) {
    const typeLabel = e.type === "event" ? c.cyan("[事件]") : c.yellow("[项目]");
    console.log(`  ${c.bold(`[${e.id}]`)} ${typeLabel} ${e.title}`);
  }
  console.log(c.dim(`\n  共 ${data.length} 条\n`));
}

async function eventAdd(args: string[]) {
  const opts = parseArgs(args);
  const ledgerId = getActiveLedgerId();
  if (!opts.title || !opts.type) { console.error("用法: event add --title <标题> --type <event|project>"); process.exit(1); }

  const result = await apiFetch("/api/crm/events", {
    method: "POST",
    body: JSON.stringify({ ledger_id: ledgerId, title: opts.title, type: opts.type }),
  });
  if (!result.success) { console.error("创建失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ ${opts.type === "event" ? "事件" : "项目"}「${opts.title}」创建成功\n`));
}

async function eventGet(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: event get <id>"); process.exit(1); }

  const result = await apiFetch(`/api/crm/events/${id}`);
  if (!result.success) { console.error("查询失败:", result.error); process.exit(1); }
  const data = result.data as Record<string, unknown>;
  console.log(c.bold(`\n📋 详情 #${id}\n`));
  console.log(`  标题: ${data.title}`);
  console.log(`  类型: ${data.type}`);
}

async function eventUpdate(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: event update <id> [--title <标题>]"); process.exit(1); }
  const opts = parseArgs(args.slice(1));
  const body: Record<string, unknown> = {};
  if (opts.title) body.title = opts.title;

  const result = await apiFetch(`/api/crm/events/${id}`, { method: "PUT", body: JSON.stringify(body) });
  if (!result.success) { console.error("更新失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 事件 #${id} 更新成功\n`));
}

async function eventDelete(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: event delete <id>"); process.exit(1); }

  const result = await apiFetch(`/api/crm/events/${id}`, { method: "DELETE" });
  if (!result.success) { console.error("删除失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 事件 #${id} 已删除\n`));
}

async function eventAddParticipant(args: string[]) {
  const id = parseInt(args[0], 10);
  const opts = parseArgs(args.slice(1));
  if (!id || !opts.contact) { console.error("用法: event add-participant <id> --contact <联系人ID> [--role <角色>]"); process.exit(1); }

  const result = await apiFetch(`/api/crm/events/${id}/participants`, {
    method: "POST",
    body: JSON.stringify({ contact_id: parseInt(opts.contact, 10), role: opts.role || null }),
  });
  if (!result.success) { console.error("添加失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 参与者已添加到事件 #${id}\n`));
}

async function eventRemoveParticipant(args: string[]) {
  const id = parseInt(args[0], 10);
  const opts = parseArgs(args.slice(1));
  if (!id || !opts.contact) { console.error("用法: event remove-participant <id> --contact <联系人ID>"); process.exit(1); }

  const result = await apiFetch(`/api/crm/events/${id}/participants?contact_id=${opts.contact}`, { method: "DELETE" });
  if (!result.success) { console.error("移除失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 参与者已从事件 #${id} 移除\n`));
}

// ==================== CRM 关联关系命令 ====================

async function relationList() {
  const ledgerId = getActiveLedgerId();
  const result = await apiFetch<{ id: number; source_type: string; source_id: number; target_type: string; target_id: number; label: string | null }[]>(`/api/crm/relationships?ledger_id=${ledgerId}`);
  if (!result.success) { console.error("查询失败:", result.error); process.exit(1); }
  const data = result.data || [];

  console.log(c.bold("\n🔗 关联关系列表\n"));
  for (const r of data) {
    console.log(`  ${c.bold(`[${r.id}]`)} ${r.source_type}#${r.source_id} → ${r.target_type}#${r.target_id} ${r.label ? c.dim(`(${r.label})`) : ""}`);
  }
  console.log(c.dim(`\n  共 ${data.length} 条关联\n`));
}

async function relationAdd(args: string[]) {
  const opts = parseArgs(args);
  const ledgerId = getActiveLedgerId();
  if (!opts["source-type"] || !opts["source-id"] || !opts["target-type"] || !opts["target-id"]) {
    console.error("用法: relation add --source-type <contact|event> --source-id <id> --target-type <contact|event> --target-id <id> [--label <标签>]");
    process.exit(1);
  }

  const result = await apiFetch("/api/crm/relationships", {
    method: "POST",
    body: JSON.stringify({
      ledger_id: ledgerId,
      source_type: opts["source-type"], source_id: parseInt(opts["source-id"], 10),
      target_type: opts["target-type"], target_id: parseInt(opts["target-id"], 10),
      label: opts.label || null,
    }),
  });
  if (!result.success) { console.error("创建失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 关联关系创建成功\n`));
}

async function relationDelete(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: relation delete <id>"); process.exit(1); }

  const result = await apiFetch(`/api/crm/relationships/${id}`, { method: "DELETE" });
  if (!result.success) { console.error("删除失败:", result.error); process.exit(1); }
  console.log(c.green(`\n✓ 关联关系 #${id} 已删除\n`));
}

// ==================== 图谱命令 ====================

async function graphCommand() {
  const ledgerId = getActiveLedgerId();
  const result = await apiFetch<{ nodes: unknown[]; links: unknown[] }>(`/api/crm/graph?ledger_id=${ledgerId}`);
  if (!result.success) { console.error("查询失败:", result.error); process.exit(1); }
  const data = result.data!;

  console.log(c.bold("\n🕸️ 关系图谱数据\n"));
  console.log(`  节点数: ${data.nodes.length}`);
  console.log(`  关联数: ${data.links.length}`);
  console.log(c.dim(`\n  使用前端图谱页面查看可视化效果\n`));
}

// ==================== 导出命令 ====================

async function exportLedger(args: string[]) {
  const id = parseInt(args[0], 10);
  if (!id) { console.error("用法: export ledger <id> [--format csv|json] [--period all|month|year|custom] [--start-date <YYYY-MM-DD>] [--end-date <YYYY-MM-DD>]"); process.exit(1); }

  const opts = parseArgs(args.slice(1));
  const format = opts.format || "csv";
  const period = opts.period || "all";
  let url = `/api/ledgers/${id}/export?format=${format}&period=${period}`;
  if (opts["start-date"]) url += `&start_date=${opts["start-date"]}`;
  if (opts["end-date"]) url += `&end_date=${opts["end-date"]}`;

  const baseUrl = getApiBase();
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${url}`, { headers });
  if (!res.ok) { console.error("导出失败:", res.statusText); process.exit(1); }

  const content = await res.text();
  process.stdout.write(content);
}

async function exportContacts(args: string[]) {
  const opts = parseArgs(args);
  const ledgerId = getActiveLedgerId();
  const format = opts.format || "csv";
  const url = `/api/crm/contacts/export?ledger_id=${ledgerId}&format=${format}`;

  const baseUrl = getApiBase();
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${url}`, { headers });
  if (!res.ok) { console.error("导出失败:", res.statusText); process.exit(1); }

  const content = await res.text();
  process.stdout.write(content);
}

// ==================== Agent 引导命令 ====================

async function guideCommand() {
  const result = await apiFetch("/api/auth/guide");
  if (!result.success) { console.error("查询失败:", result.error); process.exit(1); }
  console.log(JSON.stringify(result.data, null, 2));
}

// ==================== Agent 自然语言交互命令 ====================

async function chatCommand(args: string[]) {
  const message = args.join(" ").trim();
  if (!message) {
    console.error("用法: chat <自然语言描述>");
    console.error("示例: chat 午餐花了50元");
    console.error("      chat 和张总谈了新项目合作 #重要客户 #商务合作");
    process.exit(1);
  }

  const ledgerId = getActiveLedgerId();
  const result = await apiFetch("/api/agent/chat", {
    method: "POST",
    body: JSON.stringify({ message, ledger_id: ledgerId }),
  });

  if (!result.success) { console.error("处理失败:", result.error); process.exit(1); }

  const data = result.data as { intent: string; result: Record<string, unknown>; message: string };
  console.log(c.bold(`\n🤖 ${data.message || "处理完成"}\n`));
  if (data.intent) console.log(c.dim(`  意图: ${data.intent}`));
  if (data.result) {
    const resultStr = JSON.stringify(data.result, null, 2);
    console.log(c.dim(`  结果: ${resultStr}`));
  }
  console.log();
}

// ==================== 主入口 ====================

async function main() {
  const allArgs = process.argv.slice(2);

  // 解析全局选项
  let globalToken: string | undefined;
  let globalApiBase: string | undefined;
  const cmdArgs: string[] = [];

  for (let i = 0; i < allArgs.length; i++) {
    if (allArgs[i] === "--token" && allArgs[i + 1]) {
      globalToken = allArgs[++i];
    } else if (allArgs[i] === "--api-base" && allArgs[i + 1]) {
      globalApiBase = allArgs[++i];
    } else {
      cmdArgs.push(allArgs[i]);
    }
  }

  // 保存全局选项到配置
  const config = loadConfig();
  if (globalToken) config.agentToken = globalToken;
  if (globalApiBase) config.apiBase = globalApiBase;
  if (globalToken || globalApiBase) saveConfig(config);

  const command = cmdArgs[0];
  const subcommand = cmdArgs[1];
  const rest = cmdArgs.slice(2);

  if (!command) {
    console.log(c.bold("\n📒 团队管理助手 CLI\n"));
    console.log("用法: npx tsx scripts/cli.ts [options] <command> [subcommand] [args]\n");
    console.log("选项:");
    console.log("  --token <TOKEN>      Agent Token 凭证");
    console.log("  --api-base <URL>     API 服务地址\n");
    console.log("命令:");
    console.log("  ledger list|create|use|delete    账本管理");
    console.log("  tx add|list|update|delete         收支记录");
    console.log("  category list|add|update|delete   分类管理");
    console.log("  category-group list|add|update|delete  分组管理");
    console.log("  tag list|add|update|delete        标签管理");
    console.log("  stats                             统计概览");
    console.log("  contact list|add|get|update|delete|log  CRM联系人");
    console.log("  group list|add|update|delete|add-member|remove-member  CRM分组");
    console.log("  event list|add|get|update|delete|add-participant|remove-participant  CRM事件");
    console.log("  relation list|add|delete          CRM关联关系");
    console.log("  graph                             关系图谱");
    console.log("  export ledger|contacts            数据导出");
    console.log("  guide                             Agent引导");
    console.log("  chat <message>                    自然语言交互\n");
    return;
  }

  try {
    switch (command) {
      case "ledger":
        switch (subcommand) {
          case "list": await ledgerList(); break;
          case "create": await ledgerCreate(rest); break;
          case "use": await ledgerUse(rest); break;
          case "delete": await ledgerDelete(rest); break;
          default: console.error(`未知子命令: ledger ${subcommand}`); process.exit(1);
        }
        break;
      case "tx":
        switch (subcommand) {
          case "add": await txAdd(rest); break;
          case "list": await txList(rest); break;
          case "update": await txUpdate(rest); break;
          case "delete": await txDelete(rest); break;
          default: console.error(`未知子命令: tx ${subcommand}`); process.exit(1);
        }
        break;
      case "category-group":
        switch (subcommand) {
          case "list": await categoryGroupList(rest); break;
          case "add": await categoryGroupAdd(rest); break;
          case "update": await categoryGroupUpdate(rest); break;
          case "delete": await categoryGroupDelete(rest); break;
          default: console.error(`未知子命令: category-group ${subcommand}`); process.exit(1);
        }
        break;
      case "category":
        switch (subcommand) {
          case "list": await categoryList(rest); break;
          case "add": await categoryAdd(rest); break;
          case "update": await categoryUpdate(rest); break;
          case "delete": await categoryDelete(rest); break;
          default: console.error(`未知子命令: category ${subcommand}`); process.exit(1);
        }
        break;
      case "tag":
        switch (subcommand) {
          case "list": await tagList(); break;
          case "add": await tagAdd(rest); break;
          case "update": await tagUpdate(rest); break;
          case "delete": await tagDelete(rest); break;
          default: console.error(`未知子命令: tag ${subcommand}`); process.exit(1);
        }
        break;
      case "stats": await statsCommand(); break;
      case "contact":
        switch (subcommand) {
          case "list": await contactList(rest); break;
          case "add": await contactAdd(rest); break;
          case "get": await contactGet(rest); break;
          case "update": await contactUpdate(rest); break;
          case "delete": await contactDelete(rest); break;
          case "log": await contactLog(rest); break;
          default: console.error(`未知子命令: contact ${subcommand}`); process.exit(1);
        }
        break;
      case "group":
        switch (subcommand) {
          case "list": await groupList(); break;
          case "add": await groupAdd(rest); break;
          case "update": await groupUpdate(rest); break;
          case "delete": await groupDelete(rest); break;
          case "add-member": await groupAddMember(rest); break;
          case "remove-member": await groupRemoveMember(rest); break;
          default: console.error(`未知子命令: group ${subcommand}`); process.exit(1);
        }
        break;
      case "event":
        switch (subcommand) {
          case "list": await eventList(rest); break;
          case "add": await eventAdd(rest); break;
          case "get": await eventGet(rest); break;
          case "update": await eventUpdate(rest); break;
          case "delete": await eventDelete(rest); break;
          case "add-participant": await eventAddParticipant(rest); break;
          case "remove-participant": await eventRemoveParticipant(rest); break;
          default: console.error(`未知子命令: event ${subcommand}`); process.exit(1);
        }
        break;
      case "relation":
        switch (subcommand) {
          case "list": await relationList(); break;
          case "add": await relationAdd(rest); break;
          case "delete": await relationDelete(rest); break;
          default: console.error(`未知子命令: relation ${subcommand}`); process.exit(1);
        }
        break;
      case "graph": await graphCommand(); break;
      case "export":
        switch (subcommand) {
          case "ledger": await exportLedger(rest); break;
          case "contacts": await exportContacts(rest); break;
          default: console.error(`未知子命令: export ${subcommand}`); process.exit(1);
        }
        break;
      case "guide": await guideCommand(); break;
      case "chat": await chatCommand(rest); break;
      default:
        console.error(`未知命令: ${command}`);
        console.error("运行不带参数查看帮助");
        process.exit(1);
    }
  } catch (err) {
    console.error(`错误: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main();
