import assert from "node:assert/strict";
import { test } from "node:test";
import { parseContactRegions } from "../src/lib/contact-regions";

test("parses multi-region JSON values", () => {
  assert.deepEqual(parseContactRegions('["北京","上海"]'), ["北京", "上海"]);
});

test("keeps legacy single-region values as one selectable region", () => {
  assert.deepEqual(parseContactRegions("北京"), ["北京"]);
});
