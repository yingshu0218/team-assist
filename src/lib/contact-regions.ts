export function parseContactRegions(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((region): region is string => typeof region === "string" && region.trim().length > 0);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((region): region is string => typeof region === "string" && region.trim().length > 0);
  } catch {
    return [value.trim()];
  }
  return [value.trim()];
}

export function serializeContactRegions(value: unknown): string | null {
  const regions = [...new Set(parseContactRegions(value).map((region) => region.trim()).filter(Boolean))];
  return regions.length > 0 ? JSON.stringify(regions) : null;
}
