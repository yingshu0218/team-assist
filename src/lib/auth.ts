import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { getDb } from "@/storage/database/sqlite-client";
import { admin_accounts, agent_tokens } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import {
  createSessionToken,
  verifySessionToken as verifySignedSessionToken,
} from "@/lib/session-token";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSessionToken(adminId: number, username: string): string {
  return createSessionToken(adminId, username);
}

export function verifySessionToken(token: string): { id: number; username: string } | null {
  return verifySignedSessionToken(token);
}

export async function isAdminInitialized(): Promise<boolean> {
  const db = getDb();
  const rows = await db.select({ id: admin_accounts.id }).from(admin_accounts).limit(1);
  return rows.length > 0;
}

export function generateAgentToken(): { token: string; hash: string; prefix: string } {
  const token = randomBytes(32).toString("hex");
  const prefix = token.slice(0, 8);
  const hash = bcrypt.hashSync(token, SALT_ROUNDS);
  return { token, hash, prefix };
}

export async function verifyAgentToken(token: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: agent_tokens.id, token_hash: agent_tokens.token_hash })
    .from(agent_tokens)
    .where(eq(agent_tokens.is_active, true));

  if (rows.length === 0) return false;

  for (const row of rows) {
    const match = await bcrypt.compare(token, row.token_hash);
    if (match) {
      // 更新 last_used_at
      await db
        .update(agent_tokens)
        .set({ last_used_at: new Date().toISOString() })
        .where(eq(agent_tokens.id, row.id));
      return true;
    }
  }
  return false;
}

/**
 * 统一鉴权：从请求中提取认证信息
 * 支持 Bearer token（session 或 agent token）
 */
export async function authenticateRequest(request: Request): Promise<{
  authenticated: boolean;
  type: "session" | "agent" | "none";
  identity?: string;
}> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return { authenticated: false, type: "none" };

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return { authenticated: false, type: "none" };

  const token = match[1];

  // 先尝试 session token
  const session = verifySessionToken(token);
  if (session) {
    return { authenticated: true, type: "session", identity: session.username };
  }

  // 再尝试 agent token
  const agentValid = await verifyAgentToken(token);
  if (agentValid) {
    return { authenticated: true, type: "agent", identity: "agent" };
  }

  return { authenticated: false, type: "none" };
}

/**
 * 快捷鉴权失败响应
 */
export function authFailResponse(): Response {
  return new Response(
    JSON.stringify({ success: false, error: "未授权，请提供有效的 Bearer Token" }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
