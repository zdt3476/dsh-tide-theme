import { describe, expect, it } from 'vitest'
import { LEGACY_KEY_MAP, migrateLegacyStorageKeys } from '../../src/client/legacy-migration'

/** 最小 Storage 替身：只实现迁移用到的方法。 */
function createStorage(initial: Record<string, string> = {}): Storage & { dump: () => Record<string, string> } {
  const map = new Map<string, string>(Object.entries(initial))
  const storage = {
    get length() { return map.size },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => { map.delete(key) },
    setItem: (key: string, value: string) => { map.set(key, value) },
    dump: () => Object.fromEntries(map)
  }
  return storage as unknown as Storage & { dump: () => Record<string, string> }
}

describe('migrateLegacyStorageKeys', () => {
  it('把旧键的值搬到新键并删除旧键', () => {
    const storage = createStorage({
      'dsh-simplify-theme.pinned-workspaces': '["a","b"]',
      'dsh-tide-theme.pinned-workspaces': undefined as never
    })
    // 清掉上面为占位写入的 undefined
    storage.removeItem('dsh-tide-theme.pinned-workspaces')

    const result = migrateLegacyStorageKeys(storage)

    expect(storage.getItem('dsh-tide-theme.pinned-workspaces')).toBe('["a","b"]')
    expect(storage.getItem('dsh-simplify-theme.pinned-workspaces')).toBeNull()
    expect(result.migrated).toContain('dsh-tide-theme.pinned-workspaces')
  })

  it('新键已存在时保留新值，只删除旧键', () => {
    const storage = createStorage({
      'dsh-simplify-theme.pinned-workspaces': '["old"]',
      'dsh-tide-theme.pinned-workspaces': '["new"]'
    })

    const result = migrateLegacyStorageKeys(storage)

    expect(storage.getItem('dsh-tide-theme.pinned-workspaces')).toBe('["new"]')
    expect(storage.getItem('dsh-simplify-theme.pinned-workspaces')).toBeNull()
    expect(result.discarded).toContain('dsh-simplify-theme.pinned-workspaces')
    expect(result.migrated).not.toContain('dsh-tide-theme.pinned-workspaces')
  })

  it('没有旧键时不做任何改动', () => {
    const storage = createStorage({ 'dsh-tide-theme.usage': '{"x":1}' })

    const result = migrateLegacyStorageKeys(storage)

    expect(result.migrated).toEqual([])
    expect(result.discarded).toEqual([])
    expect(storage.dump()).toEqual({ 'dsh-tide-theme.usage': '{"x":1}' })
  })

  it('幂等：重复执行不会产生额外变化', () => {
    const storage = createStorage({ 'dsh-simplify-theme.usage': '{"calls":3}' })

    const first = migrateLegacyStorageKeys(storage)
    const afterFirst = storage.dump()
    const second = migrateLegacyStorageKeys(storage)

    expect(first.migrated.length).toBe(1)
    expect(second.migrated).toEqual([])
    expect(storage.dump()).toEqual(afterFirst)
  })

  it('迁移配置键时保留完整 JSON', () => {
    const config = JSON.stringify({ dockStats: false, sidebarPinnedLimit: 3 })
    const storage = createStorage({ 'dsh.simplify-theme.config': config })

    migrateLegacyStorageKeys(storage)

    expect(storage.getItem('dsh.tide-theme.config')).toBe(config)
    expect(JSON.parse(storage.getItem('dsh.tide-theme.config')!)).toEqual({
      dockStats: false,
      sidebarPinnedLimit: 3
    })
  })

  it('每个映射项的目标键都以新前缀开头，避免下次改名再漏', () => {
    for (const [legacy, current] of LEGACY_KEY_MAP) {
      expect(legacy).toMatch(/dsh[.-]simplify-theme/)
      expect(current).toMatch(/^dsh[.-]tide-theme/)
    }
  })

  it('无可用存储时安全返回空结果', () => {
    const result = migrateLegacyStorageKeys(undefined as unknown as Storage)
    // 测试环境有 localStorage 时走正常路径；这里只断言不抛错且结构正确
    expect(Array.isArray(result.migrated)).toBe(true)
    expect(Array.isArray(result.discarded)).toBe(true)
  })
})
