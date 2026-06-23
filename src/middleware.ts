import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 不需要鉴权的路径
const PUBLIC_PATHS = [
  "/api/auth/init",
  "/api/auth/login",
  "/api/auth/check",
  "/api/auth/guide",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 只对 /api/ 路径进行鉴权
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 公开路径跳过鉴权
  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  // 检查 Authorization header
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.match(/^Bearer\s+.+$/i)) {
    return NextResponse.json(
      { success: false, error: "未授权，请提供有效的 Bearer Token" },
      { status: 401 }
    );
  }

  // Token 验证将在路由处理程序中通过 authenticateRequest 完成
  // 这里只做格式检查，确保有 Token 存在
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
