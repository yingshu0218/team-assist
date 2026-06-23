import { NextResponse } from "next/server";
import { authenticateRequest, isAdminInitialized } from "@/lib/auth";

// 验证当前会话是否有效
export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);

    if (!auth.authenticated) {
      const initialized = await isAdminInitialized();
      return NextResponse.json({
        success: true,
        data: {
          authenticated: false,
          initialized,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        authenticated: true,
        type: auth.type,
        identity: auth.identity,
        initialized: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `检查失败: ${error instanceof Error ? error.message : "未知错误"}` },
      { status: 500 }
    );
  }
}
