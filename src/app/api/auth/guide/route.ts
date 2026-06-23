import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";

// Agent 引导接口：连入后查看可用命令
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      {
        success: false,
        error: "认证失败，请提供有效的 Bearer Token",
        hint: "在请求头中添加 Authorization: Bearer <your-agent-token>",
      },
      { status: 401 }
    );
  }

  const guide = {
    welcome: "欢迎使用 LedgerCRM 系统 Agent 接口",
    auth_type: auth.type,
    identity: auth.identity,
    available_commands: {
      cli_usage: "通过 CLI 工具执行命令，需提供 --token 参数",
      cli_example: "npx tsx scripts/cli.ts --token <AGENT_TOKEN> <command> [options]",

      // API 调用方式
      api_usage: "通过 HTTP API 调用，需在 Header 中携带 Bearer Token",
      api_base: "/api/",

      // 记账领域
      ledger: {
        description: "账本管理",
        commands: {
          "ledger list": "列出所有账本",
          "ledger create --name <名称> [--desc <描述>]": "创建账本",
          "ledger use <id>": "切换当前使用账本",
        },
      },

      // 交易领域
      transaction: {
        description: "收支记录管理",
        commands: {
          "tx add --amount <金额> --type <income|expense> [--category <分类名>] [--desc <描述>]": "添加交易",
          "tx list [--type <income|expense>] [--limit <数量>]": "列出交易记录",
          "stats": "查看统计概览",
        },
      },

      // CRM 联系人
      contact: {
        description: "CRM 联系人管理",
        commands: {
          "contact list [--search <关键词>]": "列出/搜索联系人",
          "contact add --name <姓名> [--phone <电话>] [--company <公司>] [--notes <备注>]": "添加联系人",
          "contact get <id>": "查看联系人详情（含联系记录、分组、事件、关联关系）",
          "contact update <id> [--name <姓名>] [--phone <电话>] [--company <公司>]": "更新联系人",
          "contact delete <id>": "删除联系人",
          "contact log <id> --content <内容>": "添加联系记录",
        },
      },

      // CRM 分组
      group: {
        description: "CRM 分组管理",
        commands: {
          "group list": "列出所有分组",
          "group add --name <名称> [--color <颜色>] [--desc <描述>]": "创建分组",
          "group update <id> [--name <名称>]": "更新分组",
          "group delete <id>": "删除分组",
          "group add-member <id> --contact <联系人ID>": "添加成员到分组",
          "group remove-member <id> --contact <联系人ID>": "从分组移除成员",
        },
      },

      // CRM 事件/项目
      event: {
        description: "CRM 事件/项目管理（用于联系人关联）",
        commands: {
          "event list [--type <event|project>]": "列出事件/项目",
          "event add --title <标题> --type <event|project>": "创建事件/项目",
          "event get <id>": "查看事件详情（含参与者）",
          "event delete <id>": "删除事件",
          "event add-participant <id> --contact <联系人ID> [--role <角色>]": "添加参与者",
        },
      },

      // CRM 关联关系
      relation: {
        description: "CRM 关联关系管理 — 用于建立联系人之间的关联",
        commands: {
          "relation list": "列出所有关联关系",
          "relation add --source-type <contact|event> --source-id <ID> --target-type <contact|event> --target-id <ID> [--label <标签>]": "创建关联（如：同事、合作伙伴、导师）",
          "relation delete <id>": "删除关联",
        },
      },

      // 关系图谱
      graph: {
        description: "查看关系图谱概览",
        commands: {
          "graph": "在终端输出关系图谱概览",
        },
      },

    },

    tips: [
      "使用 'relation add' 建立联系人间的关联关系，label 可描述关系类型（如：同事、合作伙伴、供应商）",
      "使用 'contact get <id>' 可查看联系人的完整信息，包括关联关系和参与的事件",
      "事件/项目主要用于关联联系人，不需要复杂的字段",
      "先使用 'ledger use <id>' 选择账本，后续操作将基于该账本",
    ],
  };

  return NextResponse.json({ success: true, data: guide });
}
