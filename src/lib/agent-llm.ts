// Agent LLM 服务 — 自然语言 → 结构化意图
// 外部智能体通过 /api/agent/chat 发送自然语言，服务端用 LLM 解析后执行

import { LLMClient, Config } from "coze-coding-dev-sdk";
import { getDb } from "@/storage/database/sqlite-client";
import {
  categories,
  category_groups,
  tags,
  crm_contacts,
  crm_groups,
  ledgers,
  transactions,
  crm_contact_logs,
  crm_group_members,
} from "@/storage/database/shared/schema";
import { eq, ilike, or, desc, sql } from "drizzle-orm";

// ==================== 类型定义 ====================

export type AgentIntentType =
  | "add_transaction"
  | "add_contact"
  | "update_contact"
  | "add_contact_log"
  | "query_transactions"
  | "query_contacts"
  | "unknown";

export interface AgentIntent {
  action: AgentIntentType;
  params: Record<string, unknown>;
  reply: string; // 给用户的自然语言回复
}

export interface AgentChatResult {
  success: boolean;
  intent: AgentIntent;
  data?: Record<string, unknown>;
  error?: string;
}

// ==================== 获取当前账本的分类/标签/联系人上下文 ====================

interface LedgerContext {
  categories: { id: number; name: string; type: string; group_name: string | null }[];
  tags: { id: number; name: string }[];
  contacts: { id: number; name: string; company: string | null }[];
  groups: { id: number; name: string }[];
  ledgerName: string;
}

async function getLedgerContext(ledgerId: number): Promise<LedgerContext> {
  const db = getDb();

  const [catRows, tagRows, contactRows, groupRows, ledgerRows] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        type: categories.type,
        group_name: category_groups.name,
      })
      .from(categories)
      .leftJoin(category_groups, eq(categories.group_id, category_groups.id))
      .where(eq(categories.ledger_id, ledgerId))
      .orderBy(categories.sort_order),
    db
      .select({ id: tags.id, name: tags.name })
      .from(tags)
      .where(eq(tags.ledger_id, ledgerId))
      .orderBy(tags.name),
    db
      .select({ id: crm_contacts.id, name: crm_contacts.name, company: crm_contacts.company })
      .from(crm_contacts)
      .where(eq(crm_contacts.ledger_id, ledgerId))
      .orderBy(crm_contacts.name),
    db
      .select({ id: crm_groups.id, name: crm_groups.name })
      .from(crm_groups)
      .where(eq(crm_groups.ledger_id, ledgerId))
      .orderBy(crm_groups.name),
    db
      .select({ name: ledgers.name })
      .from(ledgers)
      .where(eq(ledgers.id, ledgerId))
      .limit(1),
  ]);

  return {
    categories: catRows.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      group_name: c.group_name,
    })),
    tags: tagRows,
    contacts: contactRows,
    groups: groupRows,
    ledgerName: ledgerRows[0]?.name || "默认账本",
  };
}

// ==================== 构建 System Prompt ====================

function buildSystemPrompt(ctx: LedgerContext): string {
  const categoryList = ctx.categories
    .map((c) => `  - [${c.id}] ${c.type === "income" ? "收入" : "支出"}/${c.group_name || "未分组"}/${c.name}`)
    .join("\n");

  const tagList = ctx.tags.map((t) => `  - [${t.id}] ${t.name}`).join("\n") || "  (暂无标签)";

  const contactList = ctx.contacts.map((c) => `  - [${c.id}] ${c.name}${c.company ? ` (${c.company})` : ""}`).join("\n") || "  (暂无联系人)";

  const groupList = ctx.groups.map((g) => `  - [${g.id}] ${g.name}`).join("\n") || "  (暂无分组)";

  return `你是团队管理助手的自然语言解析引擎。当前账本：${ctx.ledgerName}

你的任务：将用户的自然语言输入解析为结构化操作意图，然后执行。

## 当前账本的分类体系
${categoryList}

## 当前账本的标签
${tagList}

## 当前账本的 CRM 联系人
${contactList}

## 当前账本的 CRM 分组
${groupList}

## 支持的操作

### 1. 添加交易记录 (add_transaction)
用户表达花钱或收钱的意图。
参数：{ type: "expense"|"income", amount: number, category_id: number|null, description: string, tag_ids: number[], transaction_date: "YYYY-MM-DD" }
分类规则：
- 根据描述自动匹配最合适的分类，从上面的分类体系中选择对应的 category_id
- 如果无法确定分类，category_id 设为 null
- 提取金额时要识别中文数字和阿拉伯数字
- 日期默认今天，用户提到具体日期则解析

### 2. 添加联系人 (add_contact)
用户提到新的客户/合作伙伴/联系人。
参数：{ name: string, phone: string|null, company: string|null, notes: string|null, group_names: string[] }
识别规则：
- 从描述中提取人名、公司、电话
- 用 #标签 语法识别分组（如 #VIP客户 表示加入 VIP客户 分组），放入 group_names
- 如果分组不存在，也会自动创建

### 3. 更新联系人 (update_contact)
用户提到已有联系人的新信息。
参数：{ contact_id: number, phone: string|null, company: string|null, notes: string|null }
识别规则：
- 匹配已有联系人列表中的名字
- 提取新的公司/电话/备注信息

### 4. 添加联系记录 (add_contact_log)
用户描述与某个联系人的互动/进展。
参数：{ contact_id: number, content: string }
识别规则：
- 从描述中识别联系人的名字，匹配已有列表
- 剩余内容作为联系记录

### 5. 查询交易 (query_transactions)
用户想查看收支情况。
参数：{ type: "income"|"expense"|null, limit: number }
- 默认返回最近10条

### 6. 查询联系人 (query_contacts)
用户想查找联系人。
参数：{ search: string|null }

## 输出格式

你必须输出严格的 JSON，不要有任何其他文字：
{
  "action": "操作类型",
  "params": { ... },
  "reply": "简短的中文确认回复，告诉用户你做了什么"
}

## 重要规则
1. 金额只写数字，不要带单位或货币符号
2. 日期格式必须是 YYYY-MM-DD
3. category_id 必须从上面的分类列表中选，不要编造
4. 如果用户输入含糊不清，尽力推断最合理的操作
5. 一条输入只解析为一个操作
6. reply 要简洁自然，像助手在说话`;
}

// ==================== LLM 调用与意图解析 ====================

export async function parseNaturalLanguage(
  message: string,
  ledgerId: number,
  requestHeaders?: Record<string, string>
): Promise<AgentIntent> {
  const ctx = await getLedgerContext(ledgerId);
  const systemPrompt = buildSystemPrompt(ctx);

  const config = new Config();
  const customHeaders = requestHeaders || {};
  const client = new LLMClient(config, customHeaders);

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: message },
  ];

  const response = await client.invoke(messages, {
    model: process.env.LLM_MODEL || "doubao-seed-2-0-lite-260215",
    temperature: 0.2,
  });

  // 解析 LLM 返回的 JSON
  const content = response.content.trim();
  // 尝试提取 JSON（LLM 可能在 JSON 前后加文字）
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      action: "unknown",
      params: {},
      reply: content || "抱歉，无法理解您的输入。",
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      action: parsed.action || "unknown",
      params: parsed.params || {},
      reply: parsed.reply || "操作完成",
    };
  } catch {
    return {
      action: "unknown",
      params: {},
      reply: "抱歉，解析出错，请重新描述。",
    };
  }
}

// ==================== 执行意图 ====================

export async function executeIntent(
  intent: AgentIntent,
  ledgerId: number
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  const db = getDb();

  switch (intent.action) {
    case "add_transaction": {
      const { type, amount, category_id, description, tag_ids, transaction_date } = intent.params;
      const result = await db.insert(transactions).values({
        ledger_id: ledgerId,
        type: type as string,
        amount: String(amount),
        category_id: (category_id as number) || null,
        description: (description as string) || null,
        tag_ids: tag_ids ? JSON.stringify(tag_ids) : null,
        transaction_date: (transaction_date as string) || new Date().toISOString().split("T")[0],
      }).returning({ id: transactions.id });
      return { success: true, data: { id: result[0]?.id, type, amount, category_id, description } };
    }

    case "add_contact": {
      const { name, phone, company, notes, group_names } = intent.params;
      const result = await db.insert(crm_contacts).values({
        ledger_id: ledgerId,
        name: name as string,
        phone: (phone as string) || null,
        company: (company as string) || null,
        notes: (notes as string) || null,
      }).returning({ id: crm_contacts.id });

      const contactId = result[0]?.id;
      if (!contactId) return { success: false, error: "创建联系人失败" };

      // 处理分组标签 — 自动创建不存在的分组并添加成员
      if (Array.isArray(group_names) && group_names.length > 0) {
        for (const gName of group_names) {
          // 查找或创建分组
          const existing = await db
            .select({ id: crm_groups.id })
            .from(crm_groups)
            .where(sql`${crm_groups.ledger_id} = ${ledgerId} AND ${crm_groups.name} = ${gName}`)
            .limit(1);

          let groupId: number;
          if (existing.length > 0) {
            groupId = existing[0].id;
          } else {
            const newGroup = await db.insert(crm_groups).values({
              ledger_id: ledgerId,
              name: gName as string,
              color: null,
              description: null,
            }).returning({ id: crm_groups.id });
            groupId = newGroup[0]!.id;
          }

          // 添加成员
          await db.insert(crm_group_members).values({
            group_id: groupId,
            contact_id: contactId,
          });
        }
      }
      return { success: true, data: { contact_id: contactId, name, group_names } };
    }

    case "update_contact": {
      const { contact_id, phone, company, notes } = intent.params;
      const updates: Record<string, unknown> = {};
      if (phone !== null && phone !== undefined) updates.phone = phone;
      if (company !== null && company !== undefined) updates.company = company;
      if (notes !== null && notes !== undefined) updates.notes = notes;
      updates.updated_at = new Date().toISOString();
      await db
        .update(crm_contacts)
        .set(updates)
        .where(eq(crm_contacts.id, contact_id as number));
      return { success: true, data: { contact_id } };
    }

    case "add_contact_log": {
      const { contact_id, content } = intent.params;
      await db.insert(crm_contact_logs).values({
        contact_id: contact_id as number,
        content: content as string,
        log_date: new Date().toISOString(),
      });
      return { success: true, data: { contact_id, content } };
    }

    case "query_transactions": {
      const { type, limit } = intent.params;
      const conditions = [eq(transactions.ledger_id, ledgerId)];
      if (type) conditions.push(eq(transactions.type, type as string));

      const rows = await db
        .select({
          id: transactions.id,
          amount: transactions.amount,
          type: transactions.type,
          description: transactions.description,
          transaction_date: transactions.transaction_date,
          category_name: categories.name,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.category_id, categories.id))
        .where(sql.join(conditions, sql` AND `))
        .orderBy(desc(transactions.transaction_date))
        .limit((limit as number) || 10);

      return {
        success: true,
        data: {
          transactions: rows.map((t) => ({
            id: t.id,
            amount: t.amount,
            type: t.type,
            description: t.description,
            date: t.transaction_date,
            category: t.category_name || "未分类",
          })),
        },
      };
    }

    case "query_contacts": {
      const { search } = intent.params;
      const conditions = [eq(crm_contacts.ledger_id, ledgerId)];
      if (search) {
        conditions.push(
          or(
            ilike(crm_contacts.name, `%${search}%`),
            ilike(crm_contacts.company, `%${search}%`),
            ilike(crm_contacts.phone, `%${search}%`)
          )!
        );
      }

      const rows = await db
        .select({
          id: crm_contacts.id,
          name: crm_contacts.name,
          phone: crm_contacts.phone,
          company: crm_contacts.company,
          notes: crm_contacts.notes,
        })
        .from(crm_contacts)
        .where(sql.join(conditions, sql` AND `))
        .orderBy(crm_contacts.name);

      return { success: true, data: { contacts: rows } };
    }

    default:
      return { success: false, error: `不支持的操作: ${intent.action}` };
  }
}
