export interface TimelineEntry {
  id: number
  contact_id: number
  contact_name: string | null
  content: string
  log_date: string
}

export type FishbonePeriod = 'month'

export interface TimelineGroup {
  key: string
  label: string
  items: TimelineEntry[]
}

export function formatTimelineDate(date: string): string {
  return `${date.slice(5, 7)}.${date.slice(8, 10)}`
}

export function groupFishboneTimeline(
  items: TimelineEntry[],
  _period: FishbonePeriod,
): TimelineGroup[] {
  const groups = new Map<string, TimelineGroup>()

  for (const item of items) {
    const key = item.log_date.slice(0, 10)
    const group = groups.get(key)

    if (group) {
      group.items.push(item)
      continue
    }

    groups.set(key, {
      key,
      label: formatTimelineDate(key),
      items: [item],
    })
  }

  return [...groups.values()]
}
