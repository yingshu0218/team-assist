import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveLedgerSelection } from "../src/lib/ledger-selection";

test("uses the selected ledger when it still exists", () => {
  assert.equal(
    resolveLedgerSelection([1, 2, 3], 2, 1),
    2,
  );
});

test("falls back to the active ledger when a chart selection is no longer available", () => {
  assert.equal(
    resolveLedgerSelection([1, 3], 2, 3),
    3,
  );
});
