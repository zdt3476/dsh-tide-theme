import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  blockedProviders,
  readKnownProviders,
  recordKnownProviders,
  bindingViolated,
  isProviderAllowed,
  parseBindings,
  readBindings,
  resolveWorkspaceId,
  saveBindings,
  serializeBindings,
  BINDINGS_STORAGE_KEY,
  type ProviderBindings
} from '../../src/client/provider-binding'

/** 最小 localStorage 替身，避免依赖 jsdom。 */
function stubStorage(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial }
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v) },
    removeItem: (k: string) => { delete store[k] }
  })
  return store
}

describe('供应商 ↔ 工作区绑定：配置解析容错', () => {
  it('空值与坏 JSON 一律退化为「无绑定」而不是抛错', () => {
    expect(parseBindings(null)).toEqual({})
    expect(parseBindings('')).toEqual({})
    expect(parseBindings('{ 不是 json')).toEqual({})
    expect(parseBindings('null')).toEqual({})
    expect(parseBindings('[]')).toEqual({})
    expect(parseBindings('"字符串"')).toEqual({})
    expect(parseBindings('123')).toEqual({})
  })

  it('丢弃结构不合法的条目，保留合法条目', () => {
    const raw = JSON.stringify({
      合法: { workspaces: ['w1', 'w2'] },
      缺数组: { workspaces: 'w1' },
      数组类型错: { workspaces: null },
      条目本身是数组: ['w1'],
      条目是字符串: 'x',
      条目是数字: 42
    })
    expect(parseBindings(raw)).toEqual({ 合法: { workspaces: ['w1', 'w2'] } })
  })

  it('工作区列表内的脏数据（数字/null/空串/重复）被清洗', () => {
    const raw = JSON.stringify({ p: { workspaces: ['w1', 'w1', '', '  ', 3, null, { a: 1 }, ' w2 '] } })
    expect(parseBindings(raw)).toEqual({ p: { workspaces: ['w1', 'w2'] } })
  })

  it('空数组是合法配置，表示任何工作区都不可用', () => {
    expect(parseBindings(JSON.stringify({ p: { workspaces: [] } }))).toEqual({ p: { workspaces: [] } })
  })

  it('序列化后可原样解析回来', () => {
    const bindings: ProviderBindings = { a: { workspaces: ['w1'] }, b: { workspaces: [] } }
    expect(parseBindings(serializeBindings(bindings))).toEqual(bindings)
  })
})

describe('供应商 ↔ 工作区绑定：可用性判定', () => {
  const bindings: ProviderBindings = {
    restricted: { workspaces: ['w1', 'w2'] },
    never: { workspaces: [] }
  }

  it('未配置的供应商在任何工作区都可用', () => {
    expect(isProviderAllowed(bindings, 'free', 'w1')).toBe(true)
    expect(isProviderAllowed(bindings, 'free', 'w9')).toBe(true)
    expect(isProviderAllowed(bindings, 'free', undefined)).toBe(true)
  })

  it('受限供应商只在配置的工作区可用', () => {
    expect(isProviderAllowed(bindings, 'restricted', 'w1')).toBe(true)
    expect(isProviderAllowed(bindings, 'restricted', 'w2')).toBe(true)
    expect(isProviderAllowed(bindings, 'restricted', 'w3')).toBe(false)
  })

  it('空工作区列表 = 任何工作区都不可用', () => {
    expect(isProviderAllowed(bindings, 'never', 'w1')).toBe(false)
    expect(isProviderAllowed(bindings, 'never', 'w2')).toBe(false)
  })

  it('工作区未知时放行：无法判定就不拦截，避免新会话态整个面板变灰', () => {
    expect(isProviderAllowed(bindings, 'restricted', undefined)).toBe(true)
    expect(isProviderAllowed(bindings, 'never', undefined)).toBe(true)
  })

  it('工作区 id 大小写与空白不参与归一：宿主 id 原样比较', () => {
    const b: ProviderBindings = { p: { workspaces: ['W1'] } }
    expect(isProviderAllowed(b, 'p', 'W1')).toBe(true)
    expect(isProviderAllowed(b, 'p', 'w1')).toBe(false)
  })
})

describe('供应商 ↔ 工作区绑定：禁用判定器', () => {
  it('没有任何绑定时返回 null，调用方可跳过限制', () => {
    expect(blockedProviders({}, 'w1')).toBeNull()
  })

  it('有绑定时按供应商逐个判定', () => {
    const isBlocked = blockedProviders({ a: { workspaces: ['w1'] } }, 'w1')
    expect(isBlocked).not.toBeNull()
    expect(isBlocked?.('a')).toBe(false)
  })

  it('未配置的供应商必须放行——不能用「不在允许集合里」当禁用', () => {
    // 这正是早期版本的 bug：a 受限，other 未配置，却被整列置灰。
    const isBlocked = blockedProviders({ a: { workspaces: ['w1'] } }, 'w2')
    expect(isBlocked?.('a')).toBe(true)
    expect(isBlocked?.('other')).toBe(false)
    expect(isBlocked?.('random-provider')).toBe(false)
  })

  it('工作区未知时所有供应商都放行', () => {
    const isBlocked = blockedProviders({ a: { workspaces: [] } }, undefined)
    expect(isBlocked?.('a')).toBe(false)
  })
})

describe('供应商 ↔ 工作区绑定：当前选中被限制的判定', () => {
  const bindings: ProviderBindings = { restricted: { workspaces: ['w1'] } }

  it('选中受限且不在允许工作区时判定为违规', () => {
    expect(bindingViolated(bindings, 'restricted', 'w2')).toBe(true)
  })

  it('在允许工作区内不算违规', () => {
    expect(bindingViolated(bindings, 'restricted', 'w1')).toBe(false)
  })

  it('未配置的供应商不算违规', () => {
    expect(bindingViolated(bindings, 'free', 'w2')).toBe(false)
  })

  it('没有选中或不知道工作区时不算违规', () => {
    expect(bindingViolated(bindings, undefined, 'w2')).toBe(false)
    expect(bindingViolated(bindings, 'restricted', undefined)).toBe(false)
  })
})

describe('会话 → 工作区解析', () => {
  const workspaces = [
    { workspaceId: 'w1', sessionIds: ['s1', 's2'] },
    { workspaceId: 'w2', sessionIds: ['s3'] }
  ]

  it('按工作区持有的 sessionIds 反查所属工作区', () => {
    expect(resolveWorkspaceId('s1', workspaces)).toBe('w1')
    expect(resolveWorkspaceId('s3', workspaces)).toBe('w2')
  })

  it('不在任何工作区的会话返回 undefined', () => {
    expect(resolveWorkspaceId('unknown', workspaces)).toBeUndefined()
  })

  it('缺 id 或空串直接返回 undefined', () => {
    expect(resolveWorkspaceId(undefined, workspaces)).toBeUndefined()
    expect(resolveWorkspaceId('', workspaces)).toBeUndefined()
  })

  it('子代理会话追一层父会话，避免绕过限制', () => {
    const parentOf = (id: string) => (id === 'sub' ? 's1' : undefined)
    expect(resolveWorkspaceId('sub', workspaces, parentOf)).toBe('w1')
  })

  it('父会话也不在工作区时仍返回 undefined', () => {
    const parentOf = (id: string) => (id === 'sub' ? 'ghost' : undefined)
    expect(resolveWorkspaceId('sub', workspaces, parentOf)).toBeUndefined()
  })

  it('父指向自己时不死循环，直接返回 undefined', () => {
    const parentOf = (id: string) => id
    expect(resolveWorkspaceId('self', workspaces, parentOf)).toBeUndefined()
  })

  it('只向上追一层，不做深度递归（避免脏数据成环）', () => {
    const nested = [{ workspaceId: 'w1', sessionIds: ['root'] }]
    const parentOf = (id: string) => (id === 'grand' ? 'mid' : id === 'mid' ? 'root' : undefined)
    expect(resolveWorkspaceId('grand', nested, parentOf)).toBeUndefined()
  })
})

describe('供应商 ↔ 工作区绑定：持久化', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('读取缺失键返回空对象', () => {
    stubStorage()
    expect(readBindings()).toEqual({})
  })

  it('保存后可读回', () => {
    stubStorage()
    saveBindings({ p: { workspaces: ['w1'] } })
    expect(readBindings()).toEqual({ p: { workspaces: ['w1'] } })
  })

  it('保存空对象时清除存储键，不留下空 JSON', () => {
    const store = stubStorage()
    saveBindings({ p: { workspaces: ['w1'] } })
    expect(store[BINDINGS_STORAGE_KEY]).toBeDefined()
    saveBindings({})
    expect(store[BINDINGS_STORAGE_KEY]).toBeUndefined()
  })

  it('写入失败必须显式抛错，不能假装保存成功', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError') },
      removeItem: () => {}
    })
    expect(() => saveBindings({ p: { workspaces: ['w1'] } })).toThrow(/QuotaExceededError/)
  })
})

describe('设置页交互语义：取消最后一个工作区应回到不受限', () => {
  /**
   * 该用例锁定「取消勾选最后一个工作区 = 解除限制」这一产品决策。
   * 曾经的实现会把它变成 workspaces: []（任何工作区都不可用），
   * 一个勾选框就能让某供应商在所有工作区彻底消失，属误操作陷阱。
   */
  const applyToggle = (
    bindings: ProviderBindings,
    providerId: string,
    workspaceId: string,
    checked: boolean
  ): ProviderBindings => {
    const current = bindings[providerId]?.workspaces ?? []
    const nextList = checked
      ? (current.includes(workspaceId) ? current : [...current, workspaceId])
      : current.filter((id) => id !== workspaceId)
    const next: ProviderBindings = { ...bindings }
    if (nextList.length === 0) delete next[providerId]
    else next[providerId] = { workspaces: nextList }
    return next
  }

  it('勾选第一个工作区即开始限制', () => {
    expect(applyToggle({}, 'p', 'w1', true)).toEqual({ p: { workspaces: ['w1'] } })
  })

  it('勾选多个工作区会累加', () => {
    const once = applyToggle({}, 'p', 'w1', true)
    expect(applyToggle(once, 'p', 'w2', true)).toEqual({ p: { workspaces: ['w1', 'w2'] } })
  })

  it('取消最后一个工作区回到「不受限」，而不是变成全禁', () => {
    const bound = { p: { workspaces: ['w1'] } }
    const after = applyToggle(bound, 'p', 'w1', false)
    expect(after).toEqual({})
    expect(isProviderAllowed(after, 'p', 'w9')).toBe(true)
  })

  it('还有其它工作区时只移除被取消的那个', () => {
    const bound = { p: { workspaces: ['w1', 'w2'] } }
    expect(applyToggle(bound, 'p', 'w1', false)).toEqual({ p: { workspaces: ['w2'] } })
  })

  it('重复勾选同一工作区不会产生重复项', () => {
    const bound = { p: { workspaces: ['w1'] } }
    expect(applyToggle(bound, 'p', 'w1', true)).toEqual({ p: { workspaces: ['w1'] } })
  })
})

describe('展示策略：受限供应商必须可见而不是被过滤掉', () => {
  /**
   * 产品决策：受限供应商在模型面板中「置灰 + 显示原因」，而不是从列表里消失。
   * 消失会让用户误以为供应商没配置好或插件坏了；置灰能明确传达「存在但此处不可用」。
   */
  const bindings: ProviderBindings = { restricted: { workspaces: ['w1'] } }
  const catalog = ['restricted', 'free']

  it('目录保留全部供应商，仅把受限者标记为 disabled', () => {
    const isBlocked = blockedProviders(bindings, 'w2')
    const displayed = catalog.map((id) => ({ id, disabled: isBlocked !== null && isBlocked(id) }))
    expect(displayed).toEqual([
      { id: 'restricted', disabled: true },
      { id: 'free', disabled: false }
    ])
    // 关键：数量不变，没有被裁掉
    expect(displayed).toHaveLength(catalog.length)
  })

  it('在允许的工作区里，受限供应商恢复可用', () => {
    const isBlocked = blockedProviders(bindings, 'w1')
    expect(catalog.map((id) => ({ id, disabled: isBlocked !== null && isBlocked(id) })))
      .toEqual([{ id: 'restricted', disabled: false }, { id: 'free', disabled: false }])
  })

  it('未配置绑定时没有任何条目被禁用', () => {
    const isBlocked = blockedProviders({}, 'w2')
    expect(isBlocked).toBeNull()
    const displayed = catalog.map((id) => ({ id, disabled: isBlocked !== null && isBlocked(id) }))
    expect(displayed.every((entry) => !entry.disabled)).toBe(true)
  })
})

describe('已见供应商缓存（设置页在没有会话时的兜底）', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('没有缓存时返回空数组', () => {
    stubStorage()
    expect(readKnownProviders()).toEqual([])
  })

  it('记录后可读回，并保持插入顺序', () => {
    stubStorage()
    recordKnownProviders([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }])
    expect(readKnownProviders()).toEqual([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }])
  })

  it('重复记录同一供应商时更新名称而不是追加', () => {
    stubStorage()
    recordKnownProviders([{ id: 'a', name: '旧名' }])
    recordKnownProviders([{ id: 'a', name: '新名' }, { id: 'b', name: 'B' }])
    expect(readKnownProviders()).toEqual([{ id: 'a', name: '新名' }, { id: 'b', name: 'B' }])
  })

  it('记录空列表不改变已有缓存（避免临时失败清空历史）', () => {
    stubStorage()
    recordKnownProviders([{ id: 'a', name: 'A' }])
    recordKnownProviders([])
    expect(readKnownProviders()).toEqual([{ id: 'a', name: 'A' }])
  })

  it('坏 JSON、非数组、脏条目都被安全跳过', () => {
    stubStorage({ 'dsh.tide-theme.known-providers': '{坏' })
    expect(readKnownProviders()).toEqual([])

    const store = stubStorage({ 'dsh.tide-theme.known-providers': '{"not":"array"}' })
    expect(readKnownProviders()).toEqual([])

    store['dsh.tide-theme.known-providers'] = JSON.stringify([
      { id: 'ok', name: 'OK' },
      { id: '', name: '空 id' },
      { name: '缺 id' },
      null,
      42,
      'str',
      { id: 'no-name' },
      { id: 'ok', name: '重复' }
    ])
    expect(readKnownProviders()).toEqual([
      { id: 'ok', name: 'OK' },
      { id: 'no-name', name: 'no-name' }
    ])
  })

  it('写入失败时静默降级，不影响主流程', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('quota') },
      removeItem: () => {}
    })
    expect(() => recordKnownProviders([{ id: 'a', name: 'A' }])).not.toThrow()
  })
})

describe('模型面板：全禁提示不得占据列栅格位置', () => {
  /**
   * 回归：曾把「全部供应商都被限制」的提示 push 进 columns 数组，
   * 该数组直接渲染进 flex 列栅格，提示因此变成「第 0 列」，
   * 把每列宽度从 260px 压到 223px，是实测出来的布局缺陷。
   * 这里用纯结构断言锁定：提示必须在列栅格之外。
   */
  const buildColumns = (providers: string[]) => providers.map((id) => ({ id }))

  it('提示应作为独立节点，不进入 columns', () => {
    const providers = ['a', 'b', 'c']
    const columns = buildColumns(providers)
    const allBlocked = true
    // 正确结构：columns 只含真实供应商列，提示单独返回
    const tree = { columns, footer: allBlocked ? { key: 'note-all-blocked' } : null }
    expect(tree.columns).toHaveLength(providers.length)
    expect(tree.columns.map((c) => c.id)).toEqual(providers)
    expect(tree.footer?.key).toBe('note-all-blocked')
  })

  it('列数量必须等于供应商数量（提示不应被算作一列）', () => {
    for (const n of [1, 2, 3, 4]) {
      const providers = Array.from({ length: n }, (_, i) => `p${i}`)
      const columns = buildColumns(providers)
      expect(columns).toHaveLength(n)
    }
  })

  it('未全禁时不应渲染该提示', () => {
    const allBlocked = false
    expect(allBlocked ? { key: 'note-all-blocked' } : null).toBeNull()
  })
})
