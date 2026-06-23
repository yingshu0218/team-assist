import assert from "node:assert/strict";
import { test } from "node:test";

process.env.ADMIN_SESSION_SECRET = "test-session-secret-that-is-long-enough-to-be-safe";

test("session tokens use an HMAC-SHA-256 signature", async () => {
  const { createSessionToken, verifySessionToken } = await import("../src/lib/session-token");
  const token = createSessionToken(42, "admin");
  const [header, payload, signature] = token.split(".");

  assert.ok(header);
  assert.ok(payload);
  assert.match(signature ?? "", /^[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(verifySessionToken(token), { id: 42, username: "admin" });
});

test("session tokens reject a changed signature", async () => {
  const { createSessionToken, verifySessionToken } = await import("../src/lib/session-token");
  const token = createSessionToken(42, "admin");
  const [header, payload, signature] = token.split(".");
  const changedSignature = `${signature?.slice(0, -1)}${signature?.endsWith("A") ? "B" : "A"}`;

  assert.equal(verifySessionToken(`${header}.${payload}.${changedSignature}`), null);
});
