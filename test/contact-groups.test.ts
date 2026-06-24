import assert from "node:assert/strict";
import { test } from "node:test";
import { getContactSurnameInitial, groupContacts } from "../src/lib/contact-groups";

const contacts = [
  { id: 1, name: "张三", region: ["北京"], created_at: "2026-06-20 10:00:00" },
  { id: 2, name: "李四", region: [], created_at: "2026-06-21 10:00:00" },
];

test("groups contacts by surname", () => {
  assert.deepEqual(groupContacts(contacts, "surname").map((group) => group.label), ["L", "Z"]);
});

test("uses pinyin initials for Chinese surnames", () => {
  assert.equal(getContactSurnameInitial("张三"), "Z");
  assert.equal(getContactSurnameInitial("李四"), "L");
});

test("groups contacts with no region under an explicit fallback", () => {
  assert.deepEqual(groupContacts(contacts, "region").map((group) => group.label), ["北京", "未设置地区"]);
});
