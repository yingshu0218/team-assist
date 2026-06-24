export interface TimelineEntry {
  id: number
  date: string
}

export type FishbonePeriod = 'month'

export interface TimelineGroup {
  key: string
  label: string
  ids: number[]
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
    const key = item.date.slice(0, 10)
    const group = groups.get(key)

    if (group) {
      group.ids.push(item.id)
      continue
    }

    groups.set(key, {
      key,
      label: formatTimelineDate(key),
      ids: [item.id],
    })
  }

  return [...groups.values()]
}
