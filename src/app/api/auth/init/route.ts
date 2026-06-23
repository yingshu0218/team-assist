import { NextResponse } from "next/server";
import { getDb } from "@/storage/database/sqlite-client";
import { admin_accounts } from "@/storage/database/shared/schema";
import { isAdminInitialized, hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

// 检查是否已初始化
export async function GET() {
  try {
    const initialized = await isAdminInitialized();
    return NextResponse.json({ success: true, data: { initialized } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `检查失败: ${error instanceof Error ? error.message : "未知错误"}` },
      { status: 500 }
    );
  }
}

// 初始化管理员账号
export async function POST(request: Request) {
  try {
    const initialized = await isAdminInitialized();
    if (initialized) {
      return NextResponse.json(
        { success: false, error: "管理员账号已初始化，不可重复设置" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        { success: false, error: "用户名长度需在 3-50 之间" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "密码长度不能少于 6 位" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const db = getDb();
    const result = await db
      .insert(admin_accounts)
      .values({ username, password_hash: passwordHash })
      .returning({ id: admin_accounts.id, username: admin_accounts.username, created_at: admin_accounts.created_at });

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `初始化失败: ${error instanceof Error ? error.message : "未知错误"}` },
      { status: 500 }
    );
  }
}
