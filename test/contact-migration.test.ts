import assert from "node:assert/strict";
import { test } from "node:test";
import { requiresContactRegionMigration, requiresGlobalContactMigration } from "../src/lib/contact-migration";

test("identifies legacy contact tables that still contain ledger_id", () => {
  assert.equal(requiresGlobalContactMigration(["id", "ledger_id", "name"]), true);
});

test("does not migrate an already-global contact table", () => {
  assert.equal(requiresGlobalContactMigration(["id", "name", "phone"]), false);
});

test("identifies contacts tables that need the optional region column", () => {
  assert.equal(requiresContactRegionMigration(["id", "name", "phone"]), true);
  assert.equal(requiresContactRegionMigration(["id", "name", "region"]), false);
});
