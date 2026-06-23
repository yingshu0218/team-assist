import { createHmac, timingSafeEqual } from "node:crypto";

interface SessionPayload {
  sub: number;
  username: string;
  iat: number;
  exp: number;
}

function base64url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error("ADMIN_SESSION_SECRET must be configured");
  }
  return secret;
}

function sign(header: string, body: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(`${header}.${body}`)
    .digest("base64url");
}

export function createSessionToken(adminId: number, username: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ sub: adminId, username, iat: now, exp: now + 86400 }));
  return `${header}.${body}.${sign(header, body)}`;
}

export function verifySessionToken(token: string): { id: number; username: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSignature = sign(header, body);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (
      typeof payload.sub !== "number" ||
      typeof payload.username !== "string" ||
      typeof payload.exp !== "number" ||
      Math.floor(Date.now() / 1000) > payload.exp
    ) {
      return null;
    }

    return { id: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}
