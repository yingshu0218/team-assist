import { NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { admin_accounts } from "@/storage/database/shared/schema";
import { verifyPassword, generateSessionToken } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    const db = getDb();
    const admins = await db
      .select({ id: admin_accounts.id, username: admin_accounts.username, password_hash: admin_accounts.password_hash })
      .from(admin_accounts)
      .where(eq(admin_accounts.username, username))
      .limit(1);

    const admin = admins[0];
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, admin.password_hash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const token = generateSessionToken(admin.id, admin.username);

    return NextResponse.json({
      success: true,
      data: {
        token,
        username: admin.username,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `登录失败: ${error instanceof Error ? error.message : "未知错误"}` },
      { status: 500 }
    );
  }
}
