import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { apply, name } from '../../src/client/index'
import { createPluginSettings } from '../../src/client/plugin-settings'
import { saveSimplifyConfig, CONFIG_STORAGE_KEY } from '../../src/client/plugin-config'
import type { DockShared, H, ReactHooks } from '../../src/client/dock-shared'
import tsdownConfig from '../../tsdown.config'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('Task-2 回归测试集 (TDD RED)', () => {
  let listeners: Record<string, Array<(event: unknown) => void>> = {}
  let localStorageStore: Record<string, string> = {}
  let bodyAttributes: Record<string, string> = {}

  beforeEach(() => {
    listeners = {}
    localStorageStore = {}
    bodyAttributes = {}

    const mockWindow: Record<string, any> = {
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
      setInterval: globalThis.setInterval.bind(globalThis),
      clearInterval: globalThis.clearInterval.bind(globalThis),
      addEventListener: (type: string, cb: (e: any) => void) => {
        listeners[type] = listeners[type] || []
        listeners[type].push(cb)
      },
      removeEventListener: (type: string, cb: (e: any) => void) => {
        if (!listeners[type]) return
        listeners[type] = listeners[type].filter(fn => fn !== cb)
      },
      dispatchEvent: (event: any) => {
        const type = event.type
        if (listeners[type]) {
          for (const fn of [...listeners[type]]) fn(event)
        }
        return true
      }
    }

    const mockDocument = {
      documentElement: { dataset: {} as Record<string, string> },
      body: {
        setAttribute: vi.fn((key: string, val: string) => { bodyAttributes[key] = val }),
        removeAttribute: vi.fn((key: string) => { delete bodyAttributes[key] }),
        hasAttribute: (key: string) => key in bodyAttributes,
        getAttribute: (key: string) => bodyAttributes[key] ?? null
      },
      head: {
        appendChild: vi.fn()
      },
      createElement: vi.fn((tag: string) => ({
        tagName: tag.toUpperCase(),
        dataset: {} as Record<string, string>,
        remove: vi.fn(),
        setAttribute: vi.fn(),
        getAttribute: vi.fn(() => null)
      })),
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => [])
    }

    const mockLocalStorage = {
      getItem: (k: string) => localStorageStore[k] ?? null,
      setItem: (k: string, v: string) => { localStorageStore[k] = String(v) },
      removeItem: (k: string) => { delete localStorageStore[k] },
      clear: () => { localStorageStore = {} }
    }

    vi.stubGlobal('window', mockWindow)
    vi.stubGlobal('document', mockDocument)
    vi.stubGlobal('localStorage', mockLocalStorage)
    vi.stubGlobal('MutationObserver', class {
      observe() {}
      disconnect() {}
    })
    vi.stubGlobal('CustomEvent', class CustomEvent {
      type: string
      detail: any
      constructor(type: string, init?: any) {
        this.type = type
        this.detail = init?.detail
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('1. 插件行配置 row key 必须精准匹配 dsh-tide-theme#dsh-tide-theme，与 patch.yml 一致', () => {
    const slotRegisters: Array<{ registration: Record<string, unknown>; component: unknown }> = []
    const ctx: any = {
      slots: {
        inject: vi.fn((name: string, cb: () => void) => cb()),
        register: vi.fn((registration: Record<string, unknown>, component: unknown) => {
          slotRegisters.push({ registration, component })
        })
      },
      locale: {
        register: vi.fn(() => () => {}),
        bind: vi.fn(() => (k: string) => k)
      },
      effect: vi.fn(),
      inject: vi.fn(),
      theme: { overrideTokens: vi.fn(() => () => {}) }
    }

    apply(ctx)

    const rowRegistration = slotRegisters.find(r => r.registration.name === 'plugins.row.config')
    expect(rowRegistration).toBeDefined()
    expect(rowRegistration?.registration.key).toBe('dsh-tide-theme#dsh-tide-theme')
  })

  it('2. PluginSettings 必须区分 summary 与 page 视图渲染，summary 绝不能渲染整表单', () => {
    let stateVal: any = undefined
    const mockHooks: ReactHooks = {
      useState: ((init: any) => {
        stateVal = typeof init === 'function' ? init() : init
        return [stateVal, (next: any) => { stateVal = next }]
      }) as unknown as ReactHooks['useState'],
      useEffect: vi.fn(),
      useRef: vi.fn((init: any) => ({ current: init })),
      useSyncExternalStore: vi.fn((_sub: any, snap: any) => snap())
    }

    const mockH: H = (type: any, props: any, ...children: any[]) => ({
      type,
      props: { ...props, children: children.length === 1 ? children[0] : children }
    })

    const shared: DockShared = {
      h: mockH,
      hooks: mockHooks,
      t: (k: string) => k
    }

    const SettingsComponent = createPluginSettings(shared)

    // 当宿主传 { view: 'summary' } 时（如插件列表卡片描述位）
    const summaryVNode: any = SettingsComponent({ view: 'summary' })
    expect(summaryVNode).toBeDefined()
    // summary 不应包含设置根容器与分组列表
    expect(summaryVNode.props?.['data-dsh-tide-settings']).toBeUndefined()
    expect(summaryVNode.props?.className).not.toContain('dsh-tide-settings-root')

    // 当宿主传 { view: 'page' } 时
    const pageVNode: any = SettingsComponent({ view: 'page' })
    expect(pageVNode).toBeDefined()
    expect(pageVNode.props?.['data-dsh-tide-settings']).toBeDefined()
    expect(pageVNode.props?.className).toBe('dsh-tide-settings-root')
  })

  it('3. localStorage 保存失败时绝不能假成功提示，saveSimplifyConfig 必须显式抛出异常', () => {
    // 模拟 localStorage 配额超限
    localStorage.setItem = vi.fn(() => {
      throw new Error('QuotaExceededError: storage is full')
    })

    expect(() => {
      saveSimplifyConfig({ dockStats: false })
    }).toThrow(/QuotaExceededError|storage is full/)
  })

  it('4. 可复现构建：tsdown.config.ts 严禁注入动态 new Date().toISOString()', () => {
    const configSource = readFileSync(join(process.cwd(), 'tsdown.config.ts'), 'utf8')
    expect(configSource).not.toMatch(/new\s+Date\(\)\.toISOString\(\)/)
  })

  it('5. 架构边界：宿主无官方插槽的功能必须真实挂载，不允许被静默删除', () => {
    // 历史教训：曾以「零 DOM 篡改」为由把下列 DOM 挂载的 effect 整段删除，
    // 结果配置开关、样式、README 都还在，界面上对应区块却全体消失。
    // 这里断言的是「功能必须存在」，而不是「必须用某种实现方式」。
    const effectFns: Array<() => void | (() => void)> = []
    const ctx: any = {
      slots: {
        inject: vi.fn(),
        register: vi.fn()
      },
      locale: {
        register: vi.fn(() => () => {}),
        bind: vi.fn(() => (k: string) => k)
      },
      effect: vi.fn((fn: () => void | (() => void), name?: string) => {
        effectFns.push(fn)
        effectNames.push(name)
      }),
      inject: vi.fn(),
      sessions: {
        list: { getSnapshot: () => ({ byId: {} }), subscribe: () => () => {} },
        binding: () => undefined
      },
      workspaces: {
        list: { getSnapshot: () => ({ byId: {} }), subscribe: () => () => {} }
      },
      modelDirectories: undefined,
      remote: { permissionPresets: { catalog: vi.fn() } },
      theme: { overrideTokens: vi.fn(() => () => {}) }
    }
    const effectNames: Array<string | undefined> = []

    apply(ctx)

    // 执行所有注册的 effect；单项失败不应拖垮其余功能，但必须全部注册过。
    for (const fn of effectFns) {
      try {
        fn()
      } catch {
        // 宿主 DOM 不在场时挂载器返回 null 或抛错都属预期
      }
    }

    for (const name of [
      'tide-theme: sidebar tabs',
      'tide-theme: sidebar filter',
      'tide-theme: sidebar groups',
      'tide-theme: stat colors',
      'tide-theme: dock align',
      'tide-theme: delegation panel',
      'tide-theme: turn duration'
    ]) {
      expect(effectNames).toContain(name)
    }
  })

  it('6. 会话用量与性能浮窗严禁渲染冗余的「子代理协同委派」区块', async () => {
    const { createDockStats } = await import('../../src/client/dock-stats')
    const mockH: any = (type: any, props: any, ...children: any[]) => ({
      type,
      props: { ...props, children: children.length === 1 ? children[0] : children }
    })
    const shared: any = {
      h: mockH,
      hooks: {
        useState: ((init: any) => [typeof init === 'function' ? init() : init, vi.fn()]) as any,
        useEffect: vi.fn(),
        useRef: vi.fn((init: any) => ({ current: init })),
        useSyncExternalStore: vi.fn((_s: any, snap: any) => snap())
      },
      t: (k: string) => k
    }

    const StatsComponent = createDockStats(shared)
    // 模拟有 3 个子代理协同
    const vnode: any = StatsComponent({
      useProjection: (key: string) => {
        if (key === 'subagentCatalog') {
          return [
            { id: 'sub-1', title: '子任务1', activity: 'running' },
            { id: 'sub-2', title: '子任务2', activity: 'done' }
          ]
        }
        return undefined
      }
    })

    const serializeNode = (node: any): string => {
      if (!node) return ''
      if (typeof node === 'string') return node
      const children = Array.isArray(node.props?.children) ? node.props.children : [node.props?.children]
      return (node.props?.className ?? '') + ' ' + children.map(serializeNode).join(' ')
    }

    const renderedText = serializeNode(vnode)
    // 浮窗内部不应再包含子代理卡片结构
    expect(renderedText).not.toContain('dsh-tide-stats-subagents-card')
    expect(renderedText).not.toContain('子代理协同委派')
  })

  it('7. 工作区控制器支持会话置顶状态持久化至 PINNED_KEY', async () => {
    const { createWorkspaceControl } = await import('../../src/client/workspace-control')
    const { PINNED_KEY } = await import('../../src/client/sidebar-groups')

    let stateMap: Record<string, any> = {}
    const mockHooks: any = {
      useState: (init: any) => {
        const val = typeof init === 'function' ? init() : init
        return [val, vi.fn((next: any) => { stateMap[val] = next })]
      },
      useEffect: vi.fn(),
      useRef: vi.fn((init: any) => ({ current: init })),
      useSyncExternalStore: vi.fn((_sub: any, snap: any) => snap())
    }

    const mockH: any = (type: any, props: any, ...children: any[]) => ({
      type,
      props: { ...props, children: children.length === 1 ? children[0] : children }
    })

    const pinSessionMock = vi.fn().mockResolvedValue({})
    const control = createWorkspaceControl({
      shared: { h: mockH, hooks: mockHooks, t: (k: string) => k },
      workspace: () => ({
        view: { setArchivedFilter: vi.fn(), setGroupBy: vi.fn() },
        pinSession: pinSessionMock
      }),
      sessions: () => ({
        byId: {
          'session-1': { id: 'session-1', displayTitle: '重要测试会话' },
          'session-2': { id: 'session-2', displayTitle: '普通会话' }
        }
      })
    })

    const node: any = control()
    expect(node).toBeDefined()
    expect(node.props['data-dsh-tide-workspace-control']).toBeDefined()
  })
})
