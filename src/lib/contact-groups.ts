export type ContactGroupMode = "surname" | "region" | "created_at";

const PINYIN_INITIALS = "ABCDEFGHJKLMNOPQRSTWXYZ";
const PINYIN_BOUNDARIES = "阿八嚓哒妸发旮哈讥咔垃妈拿噢妑七然仨他挖昔压匝";

export function getContactSurnameInitial(name: string): string {
  const first = name.trim().charAt(0);
  if (!first) return "#";
  if (/[A-Za-z]/.test(first)) return first.toUpperCase();
  if (!/[\u4e00-\u9fff]/.test(first)) return "#";
  for (let index = PINYIN_BOUNDARIES.length - 1; index >= 0; index -= 1) {
    if (first.localeCompare(PINYIN_BOUNDARIES[index], "zh-CN") >= 0) return PINYIN_INITIALS[index];
  }
  return "#";
}

interface GroupableContact {
  id: number;
  name: string;
  region: string[];
  created_at: string;
}

export function groupContacts<TContact extends GroupableContact>(contacts: TContact[], mode: ContactGroupMode) {
  const groups = new Map<string, TContact[]>();

  for (const contact of contacts) {
    const labels = mode === "surname"
      ? [getContactSurnameInitial(contact.name)]
      : mode === "region"
        ? (contact.region.length > 0 ? contact.region : ["未设置地区"])
        : [new Date(contact.created_at).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })];
    for (const label of labels) groups.set(label, [...(groups.get(label) || []), contact]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "zh-CN"))
    .map(([label, items]) => ({ label, items }));
}
