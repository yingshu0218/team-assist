import assert from "node:assert/strict";
import { test } from "node:test";
import { formatTransactions } from "../src/lib/transactions";

test("transaction list formatting nests joined category data", () => {
  const [transaction] = formatTransactions([
    {
      transaction: {
        id: 12,
        ledger_id: 1,
        category_id: 78,
        amount: "25.50",
        type: "expense",
        description: "寄件",
        transaction_date: "2026-06-24",
        tag_ids: null,
        created_at: "2026-06-24 08:00:00",
        updated_at: "2026-06-24 08:00:00",
      },
      category_name: "快递物流",
      category_color: "#8B5CF6",
      category_icon: "truck",
    },
  ]);

  assert.deepEqual(transaction?.category, {
    id: 78,
    name: "快递物流",
    color: "#8B5CF6",
    icon: "truck",
  });
  assert.equal("category_name" in (transaction ?? {}), false);
});

test("transaction list formatting returns null category for an unmatched join", () => {
  const [transaction] = formatTransactions([
    {
      transaction: {
        id: 13,
        ledger_id: 1,
        category_id: null,
        amount: "10",
        type: "expense",
        description: null,
        transaction_date: "2026-06-24",
        tag_ids: null,
        created_at: "2026-06-24 08:00:00",
        updated_at: "2026-06-24 08:00:00",
      },
      category_name: null,
      category_color: null,
      category_icon: null,
    },
  ]);

  assert.equal(transaction?.category, null);
});
