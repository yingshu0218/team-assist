import assert from "node:assert/strict";
import { test } from "node:test";
import { requiresGlobalContactMigration } from "../src/lib/contact-migration";

test("identifies legacy contact tables that still contain ledger_id", () => {
  assert.equal(requiresGlobalContactMigration(["id", "ledger_id", "name"]), true);
});

test("does not migrate an already-global contact table", () => {
  assert.equal(requiresGlobalContactMigration(["id", "name", "phone"]), false);
});
