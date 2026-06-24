export type ContactGroupMode = "surname" | "region" | "created_at";

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
      ? [contact.name.trim().charAt(0).toLocaleUpperCase() || "#"]
      : mode === "region"
        ? (contact.region.length > 0 ? contact.region : ["未设置地区"])
        : [new Date(contact.created_at).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })];
    for (const label of labels) groups.set(label, [...(groups.get(label) || []), contact]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "zh-CN"))
    .map(([label, items]) => ({ label, items }));
}
