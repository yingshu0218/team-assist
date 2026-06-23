import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

test("Compose persists SQLite data under /opt/teamassist", () => {
  const compose = readFileSync(resolve(process.cwd(), "docker-compose.yml"), "utf8");

  assert.match(compose, /- \/opt\/teamassist:\/app\/data/);
  assert.equal(compose.includes("sqlite-data:"), false, compose);
});

test("production image compiles the CLI without relying on tsx", () => {
  const dockerfile = readFileSync(resolve(process.cwd(), "Dockerfile"), "utf8");

  assert.match(dockerfile, /pnpm tsup scripts\/cli\.ts/);
  assert.match(dockerfile, /COPY --from=builder \/app\/dist \.\/dist/);
});
