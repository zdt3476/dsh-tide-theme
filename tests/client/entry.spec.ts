import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { apply, inject, name } from '../../src/client/index'
import { SIMPLIFY_TOKENS, THEME_SOURCE } from '../../src/client/tokens'
import { UI_CSS } from '../../src/client/styles'
import { saveSimplifyConfig, CONFIG_STORAGE_KEY } from '../../src/client/plugin-config'

/** 构造一个记录型 Client 上下文：apply 的每一步贡献都可断言。 */
function makeCtx() {
  const disposerFn = vi.fn()
  const overrideTokens = vi.fn(() => disposerFn)
  const localeRegister = vi.fn(() => () => {})
  const effects: Array<{ name?: string; fn: () => void | (() => void) }> = []
  const slotInjects: Array<{ name: string }> = []
  const slotRegisters: Array<{ registration: Record<string, unknown>; component: unknown }> = []
  const ctx = {
    slots: {
      inject: vi.fn((slotName: string) => {
        slotInjects.push({ name: slotName })
      }),
      register: vi.fn((registration: Record<string, unknown>, component: unknown) => {
        slotRegisters.push({ registration, component })
      })
    },
    locale: {
      register: localeRegister,
      bind: vi.fn(() => (key: string) => key)
    },
    modelDirectories: undefined as never,
    remote: undefined as never,
    sessions: {
      list: { getSnapshot: () => ({ byId: {} }), subscribe: () => () => {} },
      binding: () => undefined
    } as any,
    workspaces: {
      list: { getSnapshot: () => ({ byId: {} }), subscribe: () => () => {} }
    } as any,
    theme: { overrideTokens },
    effect: (fn: () => void | (() => void), effectName?: string) => {
      effects.push({ name: effectName, fn })
    },
    inject: vi.fn()
  }
  return { ctx, overrideTokens, disposerFn, localeRegister, effects, slotInjects, slotRegisters }
}

describe('client entry', () => {
  let listeners: Record<string, Array<(event: unknown) => void>> = {}
  let localStorageStore: Record<string, string> = {}
  let bodyAttributes: Record<string, string> = {}
  let headChildren: any[] = []

  beforeEach(() => {
    listeners = {}
    localStorageStore = {}
    bodyAttributes = {}
    headChildren = []

    // 搭建用于真实生命周期测试的 DOM & window 环境
    const mockWindow: Record<string, any> = {
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
      requestAnimationFrame: (cb: () => void) => setTimeout(cb, 0),
      cancelAnimationFrame: (id: any) => clearTimeout(id),
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
          for (const fn of [...listeners[type]]) {
            fn(event)
          }
        }
        return true
      }
    }

    const mockDocument = {
      documentElement: { dataset: {} as Record<string, string> },
      body: {
        setAttribute: vi.fn((key: string, val: string) => {
          bodyAttributes[key] = val
        }),
        removeAttribute: vi.fn((key: string) => {
          delete bodyAttributes[key]
        }),
        hasAttribute: (key: string) => key in bodyAttributes,
        getAttribute: (key: string) => bodyAttributes[key] ?? null
      },
      head: {
        appendChild: vi.fn((el: any) => {
          headChildren.push(el)
        })
      },
      createElement: vi.fn((tag: string) => ({
        tagName: tag.toUpperCase(),
        dataset: {} as Record<string, string>,
        remove: vi.fn()
      })),
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => [])
    }

    const mockLocalStorage = {
      getItem: (k: string) => localStorageStore[k] ?? null,
      setItem: (k: string, v: string) => {
        localStorageStore[k] = String(v)
      },
      removeItem: (k: string) => {
        delete localStorageStore[k]
      },
      clear: () => {
        localStorageStore = {}
      }
    }

    mockWindow.localStorage = mockLocalStorage as any

    vi.stubGlobal('window', mockWindow)
    vi.stubGlobal('document', mockDocument)
    vi.stubGlobal('localStorage', mockLocalStorage)
    vi.stubGlobal('MutationObserver', class {
      observe() {}
      disconnect() {}
    })
    vi.stubGlobal('ResizeObserver', class {
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

  it('声明插件身份并剔除 remote.settings / settings 无用依赖', () => {
    expect(name).toBe('dsh-simplify-theme')
    // 必需的服务
    for (const service of ['slots', 'locale', 'modelDirectories', 'remote', 'remote.permissionPresets', 'sessions', 'workspaces', 'theme']) {
      expect(inject).toContain(service)
    }
    // 契约：首轮误加的 remote.settings 与 settings 必须被清除
    expect(inject).not.toContain('remote.settings')
    expect(inject).not.toContain('settings')
  })

  it('注册包含 mixed 与 unknown 状态词条的中英文国际化字典', () => {
    const { ctx, localeRegister } = makeCtx()
    apply(ctx)

    expect(localeRegister).toHaveBeenCalledWith('dsh-simplify-theme', expect.objectContaining({
      zh: expect.objectContaining({
        'delegation.state.running': '运行中',
        'delegation.state.done': '已完成',
        'delegation.state.failed': '失败',
        'delegation.state.denied': '已拒绝',
        'delegation.state.mixed': expect.any(String),
        'delegation.state.unknown': expect.any(String)
      }),
      en: expect.objectContaining({
        'delegation.state.running': 'Running',
        'delegation.state.done': 'Completed',
        'delegation.state.failed': 'Failed',
        'delegation.state.denied': 'Denied',
        'delegation.state.mixed': expect.any(String),
        'delegation.state.unknown': expect.any(String)
      })
    }))
  })

  it('真正调用 apply 与配置事件完整生命周期：初始激活、切换关闭、重新开启、卸载清理', () => {
    const { ctx, overrideTokens, disposerFn, effects } = makeCtx()
    apply(ctx)

    // 1. 初始执行所有 effect
    const cleanups: Array<(() => void) | void> = []
    for (const effect of effects) {
      cleanups.push(effect.fn())
    }

    // 初始状态下（默认 themeOverrides 为 true）：
    // - body 带有 data-dsh-simplify-theme
    // - overrideTokens 被调用一次
    expect(document.body.hasAttribute('data-dsh-simplify-theme')).toBe(true)
    expect(overrideTokens).toHaveBeenCalledTimes(1)
    expect(overrideTokens).toHaveBeenCalledWith(THEME_SOURCE, SIMPLIFY_TOKENS)
    expect(disposerFn).not.toHaveBeenCalled()

    // 2. 触发配置事件关闭主题覆盖：saveSimplifyConfig({ themeOverrides: false })
    saveSimplifyConfig({ themeOverrides: false })

    // 关闭后：
    // - 旧的 token override disposer 必须被调用
    // - body 上的 data-dsh-simplify-theme 必须被移除
    expect(disposerFn).toHaveBeenCalledTimes(1)
    expect(document.body.hasAttribute('data-dsh-simplify-theme')).toBe(false)

    // 3. 再次触发配置事件重新开启主题覆盖：saveSimplifyConfig({ themeOverrides: true })
    saveSimplifyConfig({ themeOverrides: true })

    // 重新开启后：
    // - overrideTokens 再次被调用
    // - body 重新具有 data-dsh-simplify-theme 属性
    expect(overrideTokens).toHaveBeenCalledTimes(2)
    expect(document.body.hasAttribute('data-dsh-simplify-theme')).toBe(true)

    // 4. 插件卸载（执行 effect cleanups）
    for (const cleanup of cleanups) {
      if (typeof cleanup === 'function') cleanup()
    }

    // 卸载后：
    // - disposer 再次被调用
    // - body 上的 data-dsh-simplify-theme 彻底移除
    expect(disposerFn).toHaveBeenCalledTimes(2)
    expect(document.body.hasAttribute('data-dsh-simplify-theme')).toBe(false)
  })

  it('UI_CSS 契约：所有全局皮肤必须受 body[data-dsh-simplify-theme] 约束，关掉 token 后无残留', () => {
    // 检查全局选择器（hover, card, scrollbar, selection 等）
    // 1. 验证不存在脱离 gate 的 ::-webkit-scrollbar 或 ::selection 裸规则
    const scrollbarMatches = [...UI_CSS.matchAll(/(^|\n)\s*(::-webkit-scrollbar[^{]*)\{/g)].map(m => m[2].trim())
    for (const sel of scrollbarMatches) {
      expect(sel).toContain('body[data-dsh-simplify-theme]')
    }

    const selectionMatches = [...UI_CSS.matchAll(/(^|\n)\s*(::selection[^{]*)\{/g)].map(m => m[2].trim())
    for (const sel of selectionMatches) {
      expect(sel).toContain('body[data-dsh-simplify-theme]')
    }

    // 2. 验证全局 hover / card 选择器不残留
    const globalHoverMatches = [...UI_CSS.matchAll(/(^|\n)\s*(\[data-row-key\]:hover[^{]*)\{/g)].map(m => m[2].trim())
    for (const sel of globalHoverMatches) {
      expect(sel).toContain('body[data-dsh-simplify-theme]')
    }

    const globalCardMatches = [...UI_CSS.matchAll(/(^|\n)\s*(\[data-composer-card\][^{]*)\{/g)].map(m => m[2].trim())
    for (const sel of globalCardMatches) {
      expect(sel).toContain('body[data-dsh-simplify-theme]')
    }

    // 3. 验证全局基色只来自现有 token 变量，不写第二套硬编码 #0b1420 覆盖
    expect(UI_CSS).not.toMatch(/body\[data-dsh-simplify-theme\][^{]*\{\s*background-color:\s*#0b1420/i)
  })

  it('UI_CSS 契约：真实 header 必须是 header 标签而非 div，且有精准结构约束', () => {
    // 确认顶栏真实选择器使用 header 且包含 data-conversation-header-leading / corner
    expect(UI_CSS).toMatch(/body\[data-dsh-simplify-theme\][^\n]*header[class\*='_header'][^\n]*data-conversation-header-leading/)
    expect(UI_CSS).toMatch(/body\[data-dsh-simplify-theme\][^\n]*header[class\*='_header'][^\n]*data-conversation-header-corner/)
  })

  it('UI_CSS 契约：mixed / unknown / failed / denied 拥有明确语义颜色，绝不全绿', () => {
    // 检查 subagent 相关的状态芯片与节点状态
    expect(UI_CSS).toMatch(/\.subagent-active-chip\[data-state=['"]failed['"]\]/)
    expect(UI_CSS).toMatch(/\.subagent-active-chip\[data-state=['"]denied['"]\]/)
    expect(UI_CSS).toMatch(/\.subagent-active-chip\[data-state=['"]mixed['"]\]/)
    expect(UI_CSS).toMatch(/\.subagent-active-chip\[data-state=['"]unknown['"]\]/)

    // 语义状态不可使用成功绿 (#4ee39b / --dsw-alias-state-success-primary)
    const mixedSection = UI_CSS.match(/\.subagent-active-chip\[data-state=['"]mixed['"]\]\s*\{([^}]+)\}/)?.[1] ?? ''
    expect(mixedSection).not.toContain('#4ee39b')
    expect(mixedSection).not.toContain('state-success')

    const unknownSection = UI_CSS.match(/\.subagent-active-chip\[data-state=['"]unknown['"]\]\s*\{([^}]+)\}/)?.[1] ?? ''
    expect(unknownSection).not.toContain('#4ee39b')
    expect(unknownSection).not.toContain('state-success')
  })

  it('UI_CSS 契约：HUD 单行内联胶囊条、DSH token 材质、读数与标签同排', () => {
    // 单行流式排布（对齐宿主 TodoPanel 形制），不再是五列均摊仪表盘
    expect(UI_CSS).toMatch(/\.dsh-simplify-dock-stats-trigger\s*\{[^}]*display:\s*flex;/)
    expect(UI_CSS).toMatch(/\.dsh-simplify-dock-stats-trigger\s*\{[^}]*min-height:\s*36px;/)
    // 材质完全消费 DSH 原生 token
    expect(UI_CSS).toMatch(/\.dsh-simplify-dock-stats-trigger\s*\{[^}]*background:\s*var\(--dsw-specific-menu\);/)
    expect(UI_CSS).toMatch(/\.dsh-simplify-dock-stats-trigger\s*\{[^}]*box-shadow:\s*var\(--dsw-elevation-panel\);/)
    // 读数与标签同为 13px（DSH TodoPanel 标题规格），不再是大号仪表数字
    expect(UI_CSS).toMatch(/\.dsh-simplify-hud-number\s*\{[^}]*font-size:\s*var\(--dsw-font-xs-13-font-size,\s*13px\)/)
    // 字体必须走 DSH 的 token 体系，且每个 token 都带字面回退值：
    // font 简写在 token 缺失时会整体失效，字号会静默退回 16px。
    const fontShorthand = UI_CSS.match(/[^{}]*\{[^{}]*font:\s*var\(--dsw-font-[^{}]*\}/g) ?? []
    expect(fontShorthand, `发现 font 简写：${fontShorthand.join(' | ')}`).toEqual([])
    expect(UI_CSS).toMatch(/--dsw-font-xxxs-11-font-size,\s*11px/)
    // 排版统一到 DSH 字体族（Inter 优先）。
    expect(UI_CSS).toMatch(/font-family:\s*Inter,\s*var\(--dsw-font-family\)/)
    // 耗时列必须与四列同构（内联 flex + 有标签），不能退回绝对定位脚注。
    expect(UI_CSS).not.toMatch(/\.dsh-simplify-stat-item\.is-duration\s*\{[^}]*position:\s*absolute;/)
  })
})
