import { describe, expect, it } from 'vitest'
import { delegationDuration, selectionEffort, selectionModel, toDelegationNode } from '../../src/client/delegation-tree'
import {
  delegationNodesFor,
  errorReasonOf,
  formatDelegationDuration,
  isDelegationTool,
  pickSubagentIds,
  matchSubagentId,
  batchCounts,
  aggregateBatchState,
  paintConnectors,
  type BatchMember
} from '../../src/client/delegation-panel'

const rows = {
  child1: {
    id: 'child1',
    displayTitle: 'explorer',
    origin: 'subagent',
    parentId: 'parent',
    running: false,
    projectionValues: {
      modelSelection: { provider: 'deepseek', model: 'deepseek-v4.1-flash' },
      sessionStats: { steps: 91 },
      subagentTiming: { settledMs: 146_000 }
    }
  },
  child2: {
    id: 'child2',
    origin: 'subagent',
    parentId: 'parent',
    running: true,
    projectionValues: { subagentTiming: { settledMs: 30_000, active: { since: 1_000 } } }
  },
  other: { id: 'other', origin: 'user', parentId: 'parent' },
  grandchild: { id: 'grandchild', origin: 'subagent', parentId: 'child1' }
}

describe('delegation node extraction', () => {
  const rows = {
    child1: {
      id: 'child1',
      displayTitle: 'explorer',
      origin: 'subagent',
      parentId: 'parent',
      running: false,
      projectionValues: {
        modelSelection: { provider: 'deepseek', model: 'deepseek-v4.1-flash' },
        sessionStats: { steps: 91 },
        subagentTiming: { settledMs: 146_000 }
      }
    }
  }

  it('取标题、模型、步骤与耗时', () => {
    expect(toDelegationNode('child1', rows.child1, 0)).toEqual({
      id: 'child1',
      title: 'explorer',
      model: 'deepseek-v4.1-flash',
      status: 'done',
      durationMs: 146_000,
      steps: 91
    })
  })

  it('运行中按当前时间累计，非子代理行返回 null', () => {
    const running = { id: 'c', origin: 'subagent', running: true, projectionValues: { subagentTiming: { settledMs: 30_000, active: { since: 1_000 } } } }
    expect(toDelegationNode('c', running, 61_000)).toMatchObject({ status: 'running', durationMs: 90_000 })
    expect(toDelegationNode('o', { id: 'o', origin: 'user' }, 0)).toBeNull()
    expect(toDelegationNode('x', undefined, 0)).toBeNull()
  })

  it('缺少 running 且无 active timing 时返回 unknown 缺测态，不臆造宿主 idle/pending；running=false 保留 done', () => {
    // 缺 running 字段且无 active timing -> unknown 缺测态
    expect(toDelegationNode('x', { id: 'x', origin: 'subagent' }, 0)).toEqual({ id: 'x', title: 'x', status: 'unknown' })
    // 已知 running=false -> 保留 done 意义以最小兼容
    expect(toDelegationNode('x', { id: 'x', origin: 'subagent', running: false }, 0)).toEqual({ id: 'x', title: 'x', status: 'done' })
    // active timing 存在时明确可运行，即使 running 缺失
    const activeWithoutRunning = {
      id: 'active',
      origin: 'subagent',
      projectionValues: { subagentTiming: { settledMs: 5_000, active: { since: 1_000 } } }
    }
    expect(toDelegationNode('active', activeWithoutRunning, 2_000)).toMatchObject({ status: 'running', durationMs: 6_000 })
    expect(delegationDuration(undefined, 0)).toBeUndefined()
    expect(delegationDuration({ settledMs: 0 }, 0)).toBeUndefined()
  })
})

describe('delegation duration formatting', () => {
  const locale = (key: string) => ({ 'duration.s': '秒', 'duration.m': '分' }[key] ?? key)

  it('秒与分之间切换', () => {
    expect(formatDelegationDuration(12_300, locale)).toBe('12.3秒')
    expect(formatDelegationDuration(146_000, locale)).toBe('2分 26秒')
    expect(formatDelegationDuration(120_000, locale)).toBe('2分')
  })
})

describe('per-delegation matching', () => {
  const childA = { id: 'a', displayTitle: 'explorer', origin: 'subagent', parentId: 'p', running: false, projectionValues: { subagentTiming: { settledMs: 10_000 } } }
  const childB = { id: 'b', displayTitle: 'explorer', origin: 'subagent', parentId: 'p', running: true, projectionValues: { subagentTiming: { settledMs: 0 } } }
  const store = { a: childA, b: childB }

  it('识别委派工具名', () => {
    expect(isDelegationTool('subagent')).toBe(true)
    expect(isDelegationTool('subagent_fork')).toBe(true)
    expect(isDelegationTool('spawn_teammate')).toBe(true)
    expect(isDelegationTool('bash')).toBe(false)
    expect(isDelegationTool(null)).toBe(false)
  })

  it('只认属于本会话子代理的 id', () => {
    const text = 'started subagent 11111111-1111-1111-1111-111111111111'
    expect(pickSubagentIds(text, { '11111111-1111-1111-1111-111111111111': { origin: 'subagent', parentId: 'p' } }, 'p')).toEqual(['11111111-1111-1111-1111-111111111111'])
    expect(pickSubagentIds(text, { '11111111-1111-1111-1111-111111111111': { origin: 'subagent', parentId: 'other' } }, 'p')).toEqual([])
    expect(pickSubagentIds('没有 id', store, 'p')).toEqual([])
  })

  it('真实宿主折叠时优先描述/标题匹配；泛化行文不盲目时序认领，防止跨回合错绑', () => {
    const child1 = { id: '11111111-1111-1111-1111-111111111111', displayTitle: 'Inspect server disconnect', origin: 'subagent', parentId: 'session-root' }
    const child2 = { id: '22222222-2222-2222-2222-222222222222', displayTitle: 'Inspect client disconnect', origin: 'subagent', parentId: 'session-root' }
    const child3 = { id: '33333333-3333-3333-3333-333333333333', displayTitle: 'Trace proxy', origin: 'subagent', parentId: 'session-root' }
    const sessionStore = {
      [child1.id]: child1,
      [child2.id]: child2,
      [child3.id]: child3
    }
    const claimed = new Set<string>()

    // 第 1 行：文字包含描述（无 UUID），命中第 1 个子代理
    const row1Text = '子智能体 Inspect server disconnect · 已启动'
    expect(matchSubagentId(row1Text, sessionStore, 'session-root', claimed, [child1.id, child2.id, child3.id]))
      .toBe(child1.id)
    claimed.add(child1.id)

    // 第 2 行：只有泛化提示（无 UUID 且无描述）。真实场景里这可能是任何回合的
    // spawn/subagent 行，盲目时序认领会把卡片错绑到别的子代理（session-91287a0d 实测），
    // 所以宁缺毋滥：匹配不到就返回 undefined。
    const row2Text = '子智能体 运行中'
    expect(matchSubagentId(row2Text, sessionStore, 'session-root', claimed, [child1.id, child2.id, child3.id]))
      .toBeUndefined()

    // 第 3 行：显式带 UUID，即使顺序在前也认领自身
    const row3Text = `子代理 finished ${child3.id}`
    expect(matchSubagentId(row3Text, sessionStore, 'session-root', claimed, [child1.id, child2.id, child3.id]))
      .toBe(child3.id)
    claimed.add(child3.id)

    // 全部认领完后不再盲目返回，防止干扰普通工具行
    expect(matchSubagentId('子智能体 extra', sessionStore, 'session-root', claimed, [child1.id, child2.id, child3.id]))
      .toBeUndefined()
  })

  it('失败调用行（如并发上限报错）不能时序认领到真实子代理：无标题命中即返回 undefined', () => {
    const child = { id: '99999999-9999-9999-9999-999999999999', displayTitle: '审查后端核心服务事务', origin: 'subagent', parentId: 'p' }
    const store = { [child.id]: child }
    // turn 43.31 真实报错行：Error: subagent limit reached (active child limit: 3)…
    const failedRowText = 'Error: subagent limit reached (active child limit: 3); wait for an existing child to finish'
    expect(matchSubagentId(failedRowText, store, 'p', new Set(), [child.id]))
      .toBeUndefined()
  })

  it('一条工具行只产出一张卡，异常态覆盖运行态；未知状态不直接当成功，known ok/done以child状态为主', () => {
    const storeWithUnknown = {
      ...store,
      c: { id: 'c', displayTitle: 'explorer', origin: 'subagent', parentId: 'p' }
    }
    // known ok/done（abnormal 为 null）不表示 child 完成，以 child 状态为主
    expect(delegationNodesFor(['a'], null, storeWithUnknown, 0).map(node => node.status)).toEqual(['done'])
    expect(delegationNodesFor(['b'], null, storeWithUnknown, 0).map(node => node.status)).toEqual(['running'])
    expect(delegationNodesFor(['c'], null, storeWithUnknown, 0).map(node => node.status)).toEqual(['unknown'])

    // 工具行明确报错/拒绝
    expect(delegationNodesFor(['a'], 'failed', storeWithUnknown, 0).map(node => node.status)).toEqual(['failed'])
    expect(delegationNodesFor(['a'], 'denied', storeWithUnknown, 0).map(node => node.status)).toEqual(['denied'])

    // 工具行未知 state 不要直接当成功；child 为 done 时转为 unknown，child 为 running 时以 child 状态为主保留 running
    expect(delegationNodesFor(['a'], 'unknown', storeWithUnknown, 0).map(node => node.status)).toEqual(['unknown'])
    expect(delegationNodesFor(['b'], 'unknown', storeWithUnknown, 0).map(node => node.status)).toEqual(['running'])

    expect(delegationNodesFor([], null, storeWithUnknown, 0)).toEqual([])
    expect(delegationNodesFor(['missing'], null, storeWithUnknown, 0)).toEqual([])
  })
})

describe('batch summary counts', () => {
  const member = (status: 'running' | 'done' | 'failed' | 'denied' | 'unknown'): BatchMember =>
    ({ node: { id: status, title: status, status } })

  it('按状态汇总一批委派，包含 unknown 计数', () => {
    expect(batchCounts([])).toEqual({ total: 0, done: 0, running: 0, failed: 0, denied: 0, unknown: 0 })
    expect(batchCounts([member('done'), member('done')])).toEqual({ total: 2, done: 2, running: 0, failed: 0, denied: 0, unknown: 0 })
  })

  it('运行中、失败、拒绝与未知分别计数', () => {
    expect(batchCounts([member('running'), member('failed'), member('denied'), member('unknown')]))
      .toEqual({ total: 4, done: 0, running: 1, failed: 1, denied: 1, unknown: 1 })
  })
})

describe('batch aggregate state', () => {
  const counts = (overrides: Partial<ReturnType<typeof batchCounts>>): ReturnType<typeof batchCounts> => ({
    total: 0,
    done: 0,
    running: 0,
    failed: 0,
    denied: 0,
    unknown: 0,
    ...overrides
  })

  it('all done: 全部成功聚合为 done', () => {
    expect(aggregateBatchState(counts({ total: 3, done: 3 }))).toBe('done')
    expect(aggregateBatchState(counts({ total: 0 }))).toBe('done')
  })

  it('all denied: 全部拒绝聚合为 denied', () => {
    expect(aggregateBatchState(counts({ total: 2, denied: 2 }))).toBe('denied')
  })

  it('done+denied: 成功与拒绝混合聚合为 mixed', () => {
    expect(aggregateBatchState(counts({ total: 3, done: 2, denied: 1 }))).toBe('mixed')
  })

  it('failed+denied: 失败与拒绝混合聚合为 mixed', () => {
    expect(aggregateBatchState(counts({ total: 2, failed: 1, denied: 1 }))).toBe('mixed')
  })

  it('running: 只要存在运行中即优先聚合为 running', () => {
    expect(aggregateBatchState(counts({ total: 3, running: 1, done: 2 }))).toBe('running')
    expect(aggregateBatchState(counts({ total: 3, running: 1, failed: 1, denied: 1 }))).toBe('running')
    expect(aggregateBatchState(counts({ total: 2, running: 1, unknown: 1 }))).toBe('running')
  })

  it('unknown: 全部为 unknown 聚合为 unknown；混合时聚合为 mixed', () => {
    expect(aggregateBatchState(counts({ total: 2, unknown: 2 }))).toBe('unknown')
    expect(aggregateBatchState(counts({ total: 2, done: 1, unknown: 1 }))).toBe('mixed')
    expect(aggregateBatchState(counts({ total: 2, failed: 1, unknown: 1 }))).toBe('mixed')
  })
})

describe('connector path geometry', () => {
  class MockElement {
    children: MockElement[] = []
    attributes = new Map<string, string>()
    rect: DOMRect

    constructor(rect: { left: number; top: number; width: number; height: number; right?: number; bottom?: number }) {
      this.rect = {
        ...rect,
        right: rect.right ?? rect.left + rect.width,
        bottom: rect.bottom ?? rect.top + rect.height,
        x: rect.left,
        y: rect.top,
        toJSON: () => {}
      } as DOMRect
    }

    getBoundingClientRect() { return this.rect }
    hasAttribute(name: string) { return this.attributes.has(name) }
    getAttribute(name: string) { return this.attributes.get(name) ?? null }
    setAttribute(name: string, val: string) { this.attributes.set(name, String(val)) }
    querySelector(sel: string) { return sel === 'path' ? this.children.find(c => (c as any).isPath) ?? null : null }
    append(...children: MockElement[]) { this.children.push(...children) }
  }

  if (typeof (globalThis as any).HTMLElement === 'undefined') {
    ;(globalThis as any).HTMLElement = MockElement
  }

  function createMockElement(rect: { left: number; top: number; width: number; height: number; right?: number; bottom?: number }): HTMLElement {
    if (typeof (globalThis as any).HTMLElement === 'undefined') {
      ;(globalThis as any).HTMLElement = MockElement
    }
    return new MockElement(rect) as unknown as HTMLElement
  }

  function createMockSvg(): { svg: SVGSVGElement; path: MockElement } {
    if (typeof (globalThis as any).HTMLElement === 'undefined') {
      ;(globalThis as any).HTMLElement = MockElement
    }
    const svg = new MockElement({ left: 0, top: 0, width: 0, height: 0 })
    const path = new MockElement({ left: 0, top: 0, width: 0, height: 0 })
    ;(path as any).isPath = true
    svg.append(path)
    return { svg: svg as unknown as SVGSVGElement, path }
  }

  it('单行首行卡片：连线段数严格等于首行卡片数，目标端点对齐各卡片顶边中点', () => {
    const stage = createMockElement({ left: 0, top: 0, width: 600, height: 400 })
    const hub = createMockElement({ left: 240, top: 20, width: 120, height: 40, right: 360, bottom: 60 })
    const agents = createMockElement({ left: 0, top: 120, width: 600, height: 200 })

    // 2 张首行卡片：card1 中点 x=100, y=120; card2 中点 x=500, y=120
    const card1 = createMockElement({ left: 20, top: 120, width: 160, height: 80 })
    const card2 = createMockElement({ left: 420, top: 120, width: 160, height: 80 })
    ;(agents as any).append(card1, card2)

    const { svg, path } = createMockSvg()
    paintConnectors(stage, hub, agents, svg)

    const d = path.getAttribute('d') ?? ''
    // 匹配每段贝塞尔弧线段落 M ... C ...
    const segments = d.trim().split(/(?=M\s+)/).filter(Boolean)
    expect(segments).toHaveLength(2)

    // 验证每段的目标端点是卡片顶边中心 (100, 120) 与 (500, 120)
    expect(segments[0].trim()).toMatch(/,\s*100\s+120$/)
    expect(segments[1].trim()).toMatch(/,\s*500\s+120$/)
  })

  it('多行排布时：连线只连接首行卡片顶边，后续行不生成悬空短棍，段数严格等于首行数', () => {
    const stage = createMockElement({ left: 0, top: 0, width: 600, height: 500 })
    const hub = createMockElement({ left: 250, top: 10, width: 100, height: 30, right: 350, bottom: 40 })
    const agents = createMockElement({ left: 0, top: 100, width: 600, height: 380 })

    // 首行 2 张（top: 100），第二行 1 张（top: 220）
    const row1Card1 = createMockElement({ left: 30, top: 100, width: 140, height: 80 })
    const row1Card2 = createMockElement({ left: 230, top: 100, width: 140, height: 80 })
    const row2Card1 = createMockElement({ left: 30, top: 220, width: 140, height: 80 })
    ;(agents as any).append(row1Card1, row1Card2, row2Card1)

    const { svg, path } = createMockSvg()
    paintConnectors(stage, hub, agents, svg)

    const d = path.getAttribute('d') ?? ''
    const segments = d.trim().split(/(?=M\s+)/).filter(Boolean)
    // 仅首行 2 张卡片连线，第 2 行不画悬空棍，段数仍为 2
    expect(segments).toHaveLength(2)
    // 目标端点对齐首行卡片顶边中点：(30 + 70, 100) = (100, 100), (230 + 70, 100) = (300, 100)
    expect(segments[0].trim()).toMatch(/,\s*100\s+100$/)
    expect(segments[1].trim()).toMatch(/,\s*300\s+100$/)
  })
})

describe('model selection shapes', () => {
  it('兼容 { next } 投影视图与扁平 { model }', () => {
    expect(selectionModel({ next: { model: 'deepseek-v4.1-flash' } })).toBe('deepseek-v4.1-flash')
    expect(selectionModel({ model: 'plain' })).toBe('plain')
    expect(selectionModel({ next: null })).toBeUndefined()
    expect(selectionModel(undefined)).toBeUndefined()
  })
})

describe('failure reason', () => {
  it('取错误输出里的第一行并截断', () => {
    const row = {
      querySelector: (selector: string) => (selector === '[data-error]' ? { textContent: '\n  超出配额\n第二行' } : null)
    } as unknown as Element
    expect(errorReasonOf(row)).toBe('超出配额')
    const long = {
      querySelector: () => ({ textContent: 'x'.repeat(400) })
    } as unknown as Element
    expect(errorReasonOf(long)?.length).toBe(160)
    expect(errorReasonOf(null)).toBeUndefined()
  })
})

describe('fallback claiming', () => {
  it('孤儿行按顺序认领未被占用的子代理', () => {
    const rows = {
      a: { id: 'a', displayTitle: 'one', origin: 'subagent', parentId: 'p', running: false },
      b: { id: 'b', displayTitle: 'two', origin: 'subagent', parentId: 'p', running: false },
      other: { id: 'other', displayTitle: 'x', origin: 'subagent', parentId: 'q', running: false }
    }
    const claimed = new Set<string>()
    const first = Object.entries(rows).find(([id, row]) => row !== undefined && row.origin === 'subagent' && row.parentId === 'p' && !claimed.has(id))?.[0]
    expect(first).toBe('a')
    claimed.add(first as string)
    const second = Object.entries(rows).find(([id, row]) => row !== undefined && row.origin === 'subagent' && row.parentId === 'p' && !claimed.has(id))?.[0]
    expect(second).toBe('b')
    claimed.add(second as string)
    expect(Object.entries(rows).find(([id, row]) => row !== undefined && row.origin === 'subagent' && row.parentId === 'p' && !claimed.has(id))).toBeUndefined()
  })
})

describe('subagent effort label', () => {
  it('从模型选择投影取思考等级并本地化', () => {
    expect(selectionEffort({ next: { reasoningEffort: 'high' } })).toBe('高')
    expect(selectionEffort({ reasoningEffort: 'low' })).toBe('低')
    expect(selectionEffort({ next: null })).toBeUndefined()
    expect(selectionEffort(undefined)).toBeUndefined()
    expect(selectionEffort({ next: { reasoningEffort: 'custom-level' } })).toBe('custom-level')
  })
})

describe('parent id normalization', () => {
  const uuidA = '11111111-1111-1111-1111-111111111111'
  const uuidB = '22222222-2222-2222-2222-222222222222'
  const rows = {
    [uuidA]: { id: uuidA, origin: 'subagent', parentId: 'session-demo', displayTitle: 'Alpha' },
    [uuidB]: { id: uuidB, origin: 'subagent', parentId: 'demo', displayTitle: 'Alpha-2' }
  }

  it('父会话 id 带不带 session- 前缀都能按 UUID 精确匹配', () => {
    // 工具行带显式 UUID，父会话写作 session-demo，而子代理行写作 demo（或反之）。
    expect(pickSubagentIds(`spawn ${uuidA}`, rows, 'demo')).toEqual([uuidA])
    expect(pickSubagentIds(`spawn ${uuidB}`, rows, 'session-demo')).toEqual([uuidB])
  })

  it('标题互为前缀时，更长的标题优先，避免 Alpha 抢走 Alpha-2', () => {
    const matched = matchSubagentId('Alpha-2 subagent run', rows, 'demo', new Set())
    expect(matched).toBe(uuidB)
  })

  it('整行等于标题时优先精确匹配', () => {
    const matched = matchSubagentId('Alpha', rows, 'demo', new Set())
    expect(matched).toBe(uuidA)
  })
})
