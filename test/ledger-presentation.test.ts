import assert from "node:assert/strict";
import { test } from "node:test";
import { getLedgerBalance, getTransactionDisplay } from "../src/lib/ledger-presentation";

test("uses the description as the primary transaction label and category as the secondary label", () => {
  assert.deepEqual(getTransactionDisplay("小鑫 5 月预支工资", "薪资报酬"), {
    title: "小鑫 5 月预支工资",
    category: "薪资报酬",
  });
});

test("uses the category as the title when a transaction has no description", () => {
  assert.deepEqual(getTransactionDisplay(null, "未分类"), {
    title: "未分类",
    category: null,
  });
});

test("includes the initial balance when deriving a ledger balance", () => {
  assert.equal(getLedgerBalance("125.50", 800, 300.25), 625.25);
});
