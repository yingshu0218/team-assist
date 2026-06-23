import { NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { agent_tokens } from "@/storage/database/shared/schema";
import { authenticateRequest, generateAgentToken } from "@/lib/auth";
import { desc } from "drizzle-orm";

// 列出所有 Agent Token（脱敏）
export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || auth.type !== "session") {
      return NextResponse.json(
        { success: false, error: "需要管理员权限" },
        { status: 401 }
      );
    }

    const db = getDb();
    const data = await db
      .select({
        id: agent_tokens.id,
        name: agent_tokens.name,
        token_prefix: agent_tokens.token_prefix,
        is_active: agent_tokens.is_active,
        last_used_at: agent_tokens.last_used_at,
        created_at: agent_tokens.created_at,
      })
      .from(agent_tokens)
      .orderBy(desc(agent_tokens.created_at));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `查询失败: ${error instanceof Error ? error.message : "未知错误"}` },
      { status: 500 }
    );
  }
}

// 创建新 Agent Token
export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || auth.type !== "session") {
      return NextResponse.json(
        { success: false, error: "需要管理员权限" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Token 名称不能为空" },
        { status: 400 }
      );
    }

    const { token, hash, prefix } = generateAgentToken();

    const db = getDb();
    const result = await db
      .insert(agent_tokens)
      .values({ name, token_hash: hash, token_prefix: prefix })
      .returning({
        id: agent_tokens.id,
        name: agent_tokens.name,
        token_prefix: agent_tokens.token_prefix,
        is_active: agent_tokens.is_active,
        created_at: agent_tokens.created_at,
      });

    // token 仅在创建时返回一次
    return NextResponse.json({
      success: true,
      data: {
        ...result[0],
        token, // 完整 token，仅此一次可见
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `创建失败: ${error instanceof Error ? error.message : "未知错误"}` },
      { status: 500 }
    );
  }
}
