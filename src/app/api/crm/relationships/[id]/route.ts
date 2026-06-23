import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { crm_relationships } from "@/storage/database/shared/schema";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { eq } from "drizzle-orm";

// 删除关联关系
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  try {
    const { id } = await params;
    const db = getDb();
    await db.delete(crm_relationships).where(eq(crm_relationships.id, parseInt(id, 10)));

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
