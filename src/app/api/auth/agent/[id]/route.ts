import { NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { agent_tokens } from "@/storage/database/shared/schema";
import { authenticateRequest } from "@/lib/auth";
import { eq } from "drizzle-orm";

// 撤销 Agent Token
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || auth.type !== "session") {
      return NextResponse.json(
        { success: false, error: "需要管理员权限" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json(
        { success: false, error: "无效的 Token ID" },
        { status: 400 }
      );
    }

    const db = getDb();
    await db
      .update(agent_tokens)
      .set({ is_active: false })
      .where(eq(agent_tokens.id, numId));

    return NextResponse.json({ success: true, data: { id: numId, is_active: false } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `撤销失败: ${error instanceof Error ? error.message : "未知错误"}` },
      { status: 500 }
    );
  }
}
