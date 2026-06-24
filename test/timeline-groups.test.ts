import assert from 'node:assert/strict'
import test from 'node:test'

import { groupFishboneTimeline } from '../src/lib/timeline-groups'

test('groups fishbone timeline entries by literal date', () => {
  const groups = groupFishboneTimeline([
    { id: 1, date: '2026-06-04T08:00:00.000Z' },
    { id: 2, date: '2026-06-04T16:00:00.000Z' },
    { id: 3, date: '2026-06-10T08:00:00.000Z' },
  ], 'month')

  assert.deepEqual(groups, [
    { key: '2026-06-04', label: '06.04', ids: [1, 2] },
    { key: '2026-06-10', label: '06.10', ids: [3] },
  ])
})
