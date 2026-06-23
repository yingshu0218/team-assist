// /api/agent/chat — Agent 自然语言交互端点
// 外部智能体通过此端点发送自然语言，系统自动解析并执行

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { parseNaturalLanguage, executeIntent } from "@/lib/agent-llm";

export async function POST(request: NextRequest) {
  // 认证检查 — 支持 session 和 agent 两种身份
  const authResult = await authenticateRequest(request);
  if (!authResult.authenticated) {
    return authFailResponse();
  }

  try {
    const body = await request.json();
    const { message, ledger_id } = body as { message?: string; ledger_id?: number };

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { success: false, error: "请提供 message 字段（自然语言输入）" },
        { status: 400 }
      );
    }

    if (!ledger_id || typeof ledger_id !== "number") {
      return NextResponse.json(
        { success: false, error: "请提供 ledger_id 字段（目标账本 ID）" },
        { status: 400 }
      );
    }

    // 提取请求头转发给 LLM SDK
    const forwardHeaders: Record<string, string> = {};
    const headersToForward = ["x-request-id", "x-trace-id", "authorization"];
    for (const h of headersToForward) {
      const val = request.headers.get(h);
      if (val) forwardHeaders[h] = val;
    }

    // 1. 解析自然语言 → 结构化意图
    const intent = await parseNaturalLanguage(message, ledger_id, forwardHeaders);

    // 2. 执行意图
    const result = await executeIntent(intent, ledger_id);

    return NextResponse.json({
      success: result.success,
      intent: {
        action: intent.action,
        params: intent.params,
        reply: intent.reply,
      },
      data: result.data,
      error: result.error,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "内部错误";
    return NextResponse.json(
      { success: false, error: `Agent Chat 处理失败: ${errorMessage}` },
      { status: 500 }
    );
  }
}
