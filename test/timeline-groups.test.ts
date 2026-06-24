import assert from 'node:assert/strict'
import test from 'node:test'

import { groupFishboneTimeline } from '../src/lib/timeline-groups'

test('groups fishbone timeline entries by literal date', () => {
  const groups = groupFishboneTimeline([
    {
      id: 1,
      contact_id: 101,
      contact_name: 'Ada',
      content: 'First contact',
      log_date: '2026-06-04T08:00:00.000Z',
    },
    {
      id: 2,
      contact_id: 102,
      contact_name: null,
      content: 'Second contact',
      log_date: '2026-06-04T16:00:00.000Z',
    },
    {
      id: 3,
      contact_id: 103,
      contact_name: 'Grace',
      content: 'Third contact',
      log_date: '2026-06-10T08:00:00.000Z',
    },
  ], 'month')

  assert.deepEqual(groups.map(({ key, label, items }) => ({
    key,
    label,
    ids: items.map((item) => item.id),
  })), [
    { key: '2026-06-04', label: '06.04', ids: [1, 2] },
    { key: '2026-06-10', label: '06.10', ids: [3] },
  ])
})

test('groups fishbone timeline entries by month across years', () => {
  const groups = groupFishboneTimeline([
    {
      id: 1,
      contact_id: 101,
      contact_name: 'Ada',
      content: 'First contact',
      log_date: '2025-06-05T08:00:00.000Z',
    },
    {
      id: 2,
      contact_id: 102,
      contact_name: null,
      content: 'Second contact',
      log_date: '2026-06-06T08:00:00.000Z',
    },
  ], 'year')

  assert.deepEqual(groups.map(({ key, label, items }) => ({
    key,
    label,
    ids: items.map((item) => item.id),
  })), [
    { key: '2025-06', label: '6 月', ids: [1] },
    { key: '2026-06', label: '6 月', ids: [2] },
  ])
})
