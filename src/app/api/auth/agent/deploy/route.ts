import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";

// Agent 一键部署配置 API
// 根据平台生成可直接粘贴的部署命令/配置
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.authenticated || auth.type !== "session") {
    return NextResponse.json(
      { success: false, error: "需要管理员登录才能查看部署配置" },
      { status: 401 }
    );
  }

  // 从请求中提取 host
  const host = request.headers.get("host") || "localhost:5000";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const baseUrl = `${protocol}://${host}`;

  const systemPrompt = `你是 LedgerCRM 记账与客户关系管理系统的操作助手。请通过结构化 CLI 或 API 调用操作系统：

1. 结构化 API 调用：
   - 所有接口需 Header: Authorization: Bearer <YOUR_TOKEN>
   - 账本: GET/POST ${baseUrl}/api/ledgers
   - 交易: GET/POST ${baseUrl}/api/transactions?ledger_id=<ID>
   - 分类: GET/POST ${baseUrl}/api/categories?ledger_id=<ID>
   - 标签: GET/POST ${baseUrl}/api/tags?ledger_id=<ID>
   - CRM联系人: GET/POST ${baseUrl}/api/crm/contacts
   - CRM分组: GET/POST ${baseUrl}/api/crm/groups?ledger_id=<ID>
   - CRM事件: GET/POST ${baseUrl}/api/crm/events?ledger_id=<ID>
   - CRM关联: GET/POST ${baseUrl}/api/crm/relationships?ledger_id=<ID>
   - CRM图谱: GET ${baseUrl}/api/crm/graph?ledger_id=<ID>
   - 统计: GET ${baseUrl}/api/stats?ledger_id=<ID>
   - 完整引导: GET ${baseUrl}/api/auth/guide

记账时：
- 收入用 type=income，支出用 type=expense
- 通过 category_id 和 tag_ids 明确关联分类与标签

CRM操作时：
- 使用 contact、group、event 和 relation 子命令执行明确的数据操作
- 使用 contact log <id> --content <内容> 添加联系记录`;

  const platforms = {
    hermes: {
      name: "Hermes",
      description: "CLI Agent 框架，通过命令行工具交互",
      commands: [
        {
          label: "CLI 一键接入",
          command: `npx tsx scripts/cli.ts --token <YOUR_TOKEN> --api-base ${baseUrl} guide`,
          description: "查看完整命令引导",
        },
        {
          label: "列出账本",
          command: `npx tsx scripts/cli.ts --token <YOUR_TOKEN> --api-base ${baseUrl} ledger list`,
          description: "获取可操作的账本",
        },
        {
          label: "添加联系人",
          command: `npx tsx scripts/cli.ts --token <YOUR_TOKEN> --api-base ${baseUrl} contact add --name "张三" --company "示例公司"`,
          description: "通过 CLI 创建联系人",
        },
      ],
      systemPrompt,
      curlExamples: [
        `# 查看引导\ncurl -s -H "Authorization: Bearer <YOUR_TOKEN>" ${baseUrl}/api/auth/guide`,
        `# 添加联系人\ncurl -s -X POST -H "Authorization: Bearer <YOUR_TOKEN>" -H "Content-Type: application/json" -d '{"name":"张三"}' ${baseUrl}/api/crm/contacts`,
        `# 列出账本\ncurl -s -H "Authorization: Bearer <YOUR_TOKEN>" ${baseUrl}/api/ledgers`,
      ],
    },
    openclaw: {
      name: "OpenClaw",
      description: "Agent 平台，通过 API 配置工具调用",
      systemPrompt,
      apiTools: [
        {
          name: "list_ledgers",
          description: "列出所有账本",
          method: "GET",
          path: "/api/ledgers",
        },
        {
          name: "list_transactions",
          description: "列出交易记录",
          method: "GET",
          path: "/api/transactions",
          parameters: {
            type: "object",
            properties: {
              ledger_id: { type: "number", description: "账本ID" },
              type: { type: "string", enum: ["income", "expense"], description: "收支类型" },
            },
          },
        },
        {
          name: "list_contacts",
          description: "列出或搜索 CRM 联系人",
          method: "GET",
          path: "/api/crm/contacts",
          parameters: {
            type: "object",
            properties: {
              ledger_id: { type: "number", description: "账本ID" },
              search: { type: "string", description: "搜索关键词" },
            },
          },
        },
        {
          name: "get_stats",
          description: "获取统计数据（收入/支出/分类/趋势）",
          method: "GET",
          path: "/api/stats",
          parameters: {
            type: "object",
            properties: {
              ledger_id: { type: "number", description: "账本ID" },
            },
          },
        },
        {
          name: "view_guide",
          description: "查看完整的 Agent 接入引导和命令列表",
          method: "GET",
          path: "/api/auth/guide",
        },
      ],
      curlExamples: [
        `# 添加联系人\ncurl -s -X POST -H "Authorization: Bearer <YOUR_TOKEN>" -H "Content-Type: application/json" -d '{"name":"张三"}' ${baseUrl}/api/crm/contacts`,
        `# 查看引导\ncurl -s -H "Authorization: Bearer <YOUR_TOKEN>" ${baseUrl}/api/auth/guide`,
        `# 列出账本\ncurl -s -H "Authorization: Bearer <YOUR_TOKEN>" ${baseUrl}/api/ledgers`,
      ],
    },
  };

  return NextResponse.json({
    success: true,
    data: {
      baseUrl,
      platforms,
    },
  });
}
