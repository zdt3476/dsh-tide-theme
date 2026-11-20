import { describe, expect, it } from 'vitest'
import { workspaceActivity, orderWorkspaceGroups } from '../../src/client/sidebar-activity'
import { visibleGroupIds, hiddenCount } from '../../src/client/sidebar-groups'

const workspaces = [
  { workspaceId: 'a', createdAt: '2026-01-01T00:00:00Z', sessionIds: ['old', 'new', 'archived'] },
  { workspaceId: 'empty', createdAt: '2026-02-01T00:00:00Z', sessionIds: ['missing'] }
]
const byId = {
  old: { updatedAt: 100 }, new: { updatedAt: 200 }, archived: { updatedAt: 900 }
}

describe('workspace activity', () => {
  it('取当前分页的最新会话时间，不被归档会话干扰', () => {
    expect(workspaceActivity(workspaces, byId, ['archived'], 'default').get('a')).toBe(200)
    expect(workspaceActivity(workspaces, byId, ['archived'], 'only').get('a')).toBe(900)
    expect(workspaceActivity(workspaces, byId, ['archived'], 'show').get('a')).toBe(900)
  })

  it('没有可用会话时采用创建时间，非法时间保持在末尾', () => {
    const activity = workspaceActivity([...workspaces, { workspaceId: 'invalid', createdAt: 'invalid', sessionIds: [] }], byId, [], 'default')
    expect(activity.get('empty')).toBe(Date.parse('2026-02-01T00:00:00Z'))
    expect(activity.get('invalid')).toBe(0)
    expect(workspaceActivity([], {}, [], 'default').size).toBe(0)
  })

  it('先置顶，再按活跃时间降序；相同时间保留原始顺序且不修改输入', () => {
    const groups = [
      { id: 'old', pinned: false }, { id: 'pin', pinned: true },
      { id: 'new', pinned: false }, { id: 'tie', pinned: false }
    ]
    const ordered = orderWorkspaceGroups(groups, new Map([['old', 10], ['pin', 1], ['new', 20], ['tie', 20]]))
    expect(ordered.map(group => group.id)).toEqual(['pin', 'new', 'tie', 'old'])
    expect(groups[0].id).toBe('old')
    expect(orderWorkspaceGroups(groups, new Map()).map(group => group.id)).toEqual(['pin', 'old', 'new', 'tie'])
  })

  it('折叠时保留所有置顶工作区，只对普通工作区应用上限', () => {
    const pinned = Array.from({ length: 7 }, (_, i) => ({ id: `p${i + 1}`, pinned: true }))
    const unpinned = Array.from({ length: 6 }, (_, i) => ({ id: `u${i + 1}`, pinned: false }))
    const groups = [...pinned, ...unpinned]
    const pinnedIds = pinned.map(group => group.id)

    expect([...visibleGroupIds(groups)]).toEqual([...pinnedIds, 'u1', 'u2', 'u3', 'u4', 'u5'])
    expect(hiddenCount(groups)).toBe(1)
    expect([...visibleGroupIds(groups, 2)]).toEqual([...pinnedIds, 'u1', 'u2'])
    expect(hiddenCount(groups, 2)).toBe(4)
    expect(hiddenCount(pinned)).toBe(0)
  })
})
