import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const cliConfigPath = resolve(process.cwd(), ".cli-config.json");

function runCli(args: string[]) {
  const loader = process.env.TSX_LOADER || "tsx";
  return spawnSync(
    process.execPath,
    [
      "--import",
      loader,
      resolve(process.cwd(), "scripts/cli.ts"),
      ...args,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        API_BASE_URL: "http://127.0.0.1:1",
      },
    },
  );
}

test("ledger update is recognized as a CLI command", () => {
  const result = runCli(["ledger", "update", "7", "--name", "新版账本", "--currency", "USD"]);
  const output = `${result.stdout}${result.stderr}`;
  assert.equal(output.includes("未知子命令: ledger update"), false, output);
  assert.match(output, /请求失败/);
  assert.equal(existsSync(cliConfigPath), false, ".cli-config.json should not be written by CLI tests");
});

test("team add is recognized as a CLI command", () => {
  const result = runCli(["team", "add", "--name", "研发团队"]);
  const output = `${result.stdout}${result.stderr}`;
  assert.equal(output.includes("未知子命令: team add"), false, output);
  assert.match(output, /请求失败/);
  assert.equal(existsSync(cliConfigPath), false, ".cli-config.json should not be written by CLI tests");
});

test("todo add is recognized as a CLI command", () => {
  const result = runCli(["todo", "add", "--title", "跟进客户"]);
  const output = `${result.stdout}${result.stderr}`;
  assert.equal(output.includes("未知子命令: todo add"), false, output);
  assert.match(output, /请求失败/);
  assert.equal(existsSync(cliConfigPath), false, ".cli-config.json should not be written by CLI tests");
});

test("todo add rejects malformed team IDs before making a request", () => {
  const result = runCli(["todo", "add", "--title", "跟进客户", "--team", "abc"]);
  const output = `${result.stdout}${result.stderr}`;
  assert.match(output, /team 必须是正整数或 none/);
  assert.equal(output.includes("请求失败"), false, output);
  assert.equal(existsSync(cliConfigPath), false, ".cli-config.json should not be written by CLI tests");
});

test("todo done rejects malformed positional IDs before making a request", () => {
  const result = runCli(["todo", "done", "1abc"]);
  const output = `${result.stdout}${result.stderr}`;
  assert.match(output, /id 必须是正整数/);
  assert.equal(output.includes("请求失败"), false, output);
  assert.equal(existsSync(cliConfigPath), false, ".cli-config.json should not be written by CLI tests");
});

test("todo list rejects malformed team query IDs before making a request", () => {
  const result = runCli(["todo", "list", "--team", "abc"]);
  const output = `${result.stdout}${result.stderr}`;
  assert.match(output, /team 必须是正整数或 none/);
  assert.equal(output.includes("请求失败"), false, output);
  assert.equal(existsSync(cliConfigPath), false, ".cli-config.json should not be written by CLI tests");
});
