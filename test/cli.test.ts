import assert from "node:assert/strict";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("ledger update is recognized as a CLI command", () => {
  const loader = process.env.TSX_LOADER || "tsx";
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      loader,
      resolve(process.cwd(), "scripts/cli.ts"),
      "--api-base",
      "http://127.0.0.1:1",
      "ledger",
      "update",
      "7",
      "--name",
      "新版账本",
      "--currency",
      "USD",
    ],
    { encoding: "utf8" },
  );

  const output = `${result.stdout}${result.stderr}`;
  assert.equal(output.includes("未知子命令: ledger update"), false, output);
  assert.match(output, /请求失败/);
});

test("team add is recognized as a CLI command", () => {
  const loader = process.env.TSX_LOADER || "tsx";
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      loader,
      resolve(process.cwd(), "scripts/cli.ts"),
      "--api-base",
      "http://127.0.0.1:1",
      "team",
      "add",
      "--name",
      "研发团队",
    ],
    { encoding: "utf8" },
  );

  const output = `${result.stdout}${result.stderr}`;
  assert.equal(output.includes("未知子命令: team add"), false, output);
  assert.match(output, /请求失败/);
});

test("todo add is recognized as a CLI command", () => {
  const loader = process.env.TSX_LOADER || "tsx";
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      loader,
      resolve(process.cwd(), "scripts/cli.ts"),
      "--api-base",
      "http://127.0.0.1:1",
      "todo",
      "add",
      "--title",
      "跟进客户",
    ],
    { encoding: "utf8" },
  );

  const output = `${result.stdout}${result.stderr}`;
  assert.equal(output.includes("未知子命令: todo add"), false, output);
  assert.match(output, /请求失败/);
});
