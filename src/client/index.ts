/**
 * 插件 Client 入口。
 *
 * 职责：
 * 1. 注册全局样式（dock 控件 + `:has()` 隐藏原生 seat + tabs）；
 * 2. 注册 `conversation.composer.dock` 条目：模型 + 思考等级 + 权限；
 * 3. 侧栏 DOM 注入归档 tabs（写走 `ctx.uiWorkspace.view`）；
 * 4. `conversation.input.model.label` trigger 位加供应商前缀（hero 态也生效）。
 *
 * React 不进 bundle：require('react') / require('react-dom/client') 由
 * ModuleLoader 壳提供，这正是 tsdown client 构建保持 require 的原因。
 */

import { SIMPLIFY_TOKENS, THEME_SOURCE } from './tokens'
import { UI_CSS } from './styles'
import { migrateLegacyStorageKeys } from './legacy-migration'
import { mountSidebarGroups } from './sidebar-groups'
import { mountSidebarTabs } from './sidebar-tabs'
import { mountSidebarFilter } from './sidebar-filter-mount'
import { mountStatColors } from './stat-colors-mount'
import { mountDockAlign } from './dock-align'
import { mountTurnDuration } from './turn-duration'
import { mountDelegationPanel } from './delegation-panel'
import { CURRENT_SESSION_KEY, readCurrentSessionId } from './hero-dock'
import { readArchivedFilter, VIEW_STORE_KEY } from './view-state'
import type { ActivityStore, SessionActivitySnapshot, WorkspaceActivitySnapshot } from './sidebar-activity'
import { collectUsage } from './usage-rank'
import { readLocalUsage, recordLocalUsage } from './usage-store'
import { withFallback } from './locale-fallback'
import { createDockControl, createModelSeat } from './dock-control'
import { createPluginSettings } from './plugin-settings'
import { readKnownProviders, recordKnownProviders, resolveWorkspaceId } from './provider-binding'
import { loadSimplifyConfig, onSimplifyConfigChange } from './plugin-config'
import type { DockShared, H, ReactHooks } from './dock-shared'
import type { ModelDirectories } from './model-directory'
import type { PermissionSession } from './permission-control'

const PLUGIN_ID = 'dsh-tide-theme'

/** 构建时注入；未注入（本地直接跑源码）时回落到 dev。 */
declare const __DSH_TIDE_BUILD__: string
const BUILD = typeof __DSH_TIDE_BUILD__ === 'string' ? __DSH_TIDE_BUILD__ : 'dev'

interface LocaleService {
  register: (ns: string, dicts: Record<string, Record<string, string>>) => () => void
  bind: (ns: string) => (key: string, params?: Record<string, string | number>) => string
}

interface SlotRegistry {
  inject: (name: string, callback: () => unknown) => unknown
  register: (registration: Record<string, unknown>, component: unknown) => unknown
}

interface SessionsService {
  list: ActivityStore<SessionActivitySnapshot>
  refreshProjections?: (sessionId: string) => Promise<unknown>
  binding: (sessionId: string) => { session?: PermissionSession } | undefined
  scope?: (sessionId: string) => unknown
}

interface ClientCtx {
  slots: SlotRegistry
  locale: LocaleService
  effect: (fn: () => void | (() => void), name?: string) => void
  sessions?: SessionsService
  workspaces?: { list: ActivityStore<WorkspaceActivitySnapshot> }
  inject: (services: string[], callback: (scope: Record<string, unknown>) => void) => void
  get?: (name: string) => unknown
  modelDirectories: ModelDirectories
  remote: {
    permissionPresets: {
      catalog: () => Promise<{ ok: boolean; value?: import('./permission-catalog').PermissionCatalog; error?: { code: string; message: string } }>
    }
  }
  theme?: { overrideTokens: (source: string, tokens: unknown) => () => void }
  uiWorkspace?: {
    view: {
      setArchivedFilter: (filter: 'default' | 'show' | 'only') => void
      setGroupBy: (mode: 'workspace' | 'workspace-tree' | 'flat') => void
    }
  }
}

export const name = PLUGIN_ID
export const inject = ['slots', 'locale', 'modelDirectories', 'remote', 'remote.permissionPresets', 'sessions', 'workspaces', 'theme']

const DICT_ZH: Record<string, string> = {
  'tabs.sessions': '未归档',
  'filter.placeholder': '筛选工作区或会话…',
  'filter.ariaLabel': '筛选工作区或会话',
  'filter.groupBy': '列表分组',
  'filter.workspace': '工作区',
  'filter.workspace-tree': '目录树',
  'filter.flat': '全部会话',
  'filter.noMatch': '没有匹配的会话',
  'effort.providerDefault': '默认',
  'effort.unavailableShort': '不可用',
  'tabs.archived': '已归档',
  'groups.more': '还有 {count} 个工作区',
  'groups.collapse': '收起工作区',
  'groups.pin': '置顶',
  'groups.pinHint': '选择要置顶的工作区',
  'groups.pinWorkspace': '置顶工作区',
  'groups.unpinWorkspace': '取消置顶',
  'groups.pinnedTitle': '置顶',
  'groups.unpinnedTitle': '工作区',
  'model.placeholder': '选择模型',
  'model.title': '选择模型',
  'model.providers': '{count} 个供应商',
  'model.empty': '暂无可用模型',
  'model.allBlocked': '当前工作区已限制全部供应商，请到插件设置里调整「供应商可用范围」',
  'model.bindingBlocked': '{provider} 已被限制，不能在此工作区使用',
  'model.bindingBlockedShort': '本工作区不可用',
  'provider.account': 'DeepSeek 账号',
  'effort.title': '思考等级',
  'effort.unavailable': '当前模型没有可选的思考等级',
  'permission.title': '访问模式',
  'permission.hint': '减少确认范围',
  'permission.readOnly': '仅可查看',
  'permission.workspaceWrite': '工作区内修改',
  'permission.fullAccess': '完全权限',
  'permission.auto': '自动审查',
  'permission.experimental': '实验',
  'permission.loading': '正在加载权限目录…',
  'permission.confirmTitle': '此模式将减少确认步骤，确认继续？',
  'permission.confirmEnable': '我已了解风险，继续启用',
  'permission.cancel': '取消',
  'duration.took': '耗时',
  'delegation.title': '子代理',
  'delegation.agent': '主 Agent',
  'delegation.batch': '第 {index} 次委派',
  'delegation.agents': '{count} 个子代理',
  'delegation.agentsOne': '1 个子代理',
  'delegation.expand': '展开这次委派',
  'delegation.collapse': '收起这次委派',
  'delegation.coordinating': '正在协调 {count} 个委派任务',
  'delegation.running': '{count} 个运行中',
  'delegation.finished': '已完成',
  'delegation.state.running': '运行中',
  'delegation.state.done': '已完成',
  'delegation.state.failed': '失败',
  'delegation.state.denied': '已拒绝',
  'delegation.state.mixed': '部分完成',
  'delegation.state.unknown': '未知',
  'delegation.mixed': '{count} 个部分完成',
  'delegation.unknown': '{count} 个未知',
  'delegation.failed': '{count} 个失败',
  'delegation.open': '打开子会话',
  'delegation.stop': '停止这个子代理',
  'delegation.stopLabel': '停止',
  'delegation.steps': '{count} 个步骤',
  'delegation.stepsShort': '{count} 步',
  'duration.ms': '毫秒',
  'duration.s': '秒',
  'duration.m': '分',
  'error.load': '加载失败',
  'error.session': '会话尚未就绪'
}

const DICT_EN: Record<string, string> = {
  'tabs.sessions': 'Unarchived',
  'filter.placeholder': 'Filter workspaces or sessions…',
  'filter.ariaLabel': 'Filter workspaces or sessions',
  'filter.groupBy': 'Group list',
  'filter.workspace': 'Workspaces',
  'filter.workspace-tree': 'Folder tree',
  'filter.flat': 'All sessions',
  'filter.noMatch': 'No matching sessions',
  'effort.providerDefault': 'Default',
  'effort.unavailableShort': 'Unavailable',
  'tabs.archived': 'Archived',
  'groups.more': '{count} more workspaces',
  'groups.collapse': 'Collapse workspaces',
  'groups.pin': 'Pin',
  'groups.pinHint': 'Pick workspaces to pin',
  'groups.pinWorkspace': 'Pin workspace',
  'groups.unpinWorkspace': 'Unpin workspace',
  'groups.pinnedTitle': 'Pinned',
  'groups.unpinnedTitle': 'Workspaces',
  'model.placeholder': 'Select model',
  'model.title': 'Select model',
  'model.providers': '{count} providers',
  'model.empty': 'No models available',
  'model.allBlocked': 'Every provider is restricted in this workspace. Adjust "Provider availability" in plugin settings.',
  'model.bindingBlocked': '{provider} is restricted and cannot be used in this workspace',
  'model.bindingBlockedShort': 'Unavailable here',
  'provider.account': 'DeepSeek Account',
  'effort.title': 'Reasoning effort',
  'effort.unavailable': 'No reasoning effort levels for this model',
  'permission.title': 'Access mode',
  'permission.hint': 'Fewer confirmations',
  'permission.readOnly': 'Read Only',
  'permission.workspaceWrite': 'Workspace Write',
  'permission.fullAccess': 'Full access',
  'permission.auto': 'Auto review',
  'permission.experimental': 'Beta',
  'permission.loading': 'Loading permission catalog…',
  'permission.confirmTitle': 'This mode reduces confirmation steps. Continue?',
  'permission.confirmEnable': 'I understand the risk, continue',
  'permission.cancel': 'Cancel',
  'duration.took': 'took',
  'delegation.title': 'Subagents',
  'delegation.agent': 'Main agent',
  'delegation.batch': 'Delegation {index}',
  'delegation.agents': '{count} subagents',
  'delegation.agentsOne': '1 subagent',
  'delegation.expand': 'Expand this delegation',
  'delegation.collapse': 'Collapse this delegation',
  'delegation.coordinating': 'Coordinating {count} delegated tasks',
  'delegation.running': '{count} running',
  'delegation.finished': 'Completed',
  'delegation.state.running': 'Running',
  'delegation.state.done': 'Completed',
  'delegation.state.failed': 'Failed',
  'delegation.state.denied': 'Denied',
  'delegation.state.mixed': 'Mixed',
  'delegation.state.unknown': 'Unknown',
  'delegation.mixed': '{count} mixed',
  'delegation.unknown': '{count} unknown',
  'delegation.failed': '{count} failed',
  'delegation.open': 'Open subagent session',
  'delegation.stop': 'Stop this subagent',
  'delegation.stopLabel': 'Stop',
  'delegation.steps': '{count} steps',
  'delegation.stepsShort': '{count} steps',
  'duration.ms': 'ms',
  'duration.s': 's',
  'duration.m': 'm',
  'error.load': 'Load failed',
  'error.session': 'Session is not ready'
}

function installStyles(ctx: ClientCtx): void {
  ctx.effect(() => {
    if (typeof document === 'undefined') return
    const tagId = `${PLUGIN_ID}/ui.css`
    if (document.querySelector(`style[data-plugin-css="${tagId}"]`) !== null) return
    const tag = document.createElement('style')
    tag.dataset.plugin = PLUGIN_ID
    tag.dataset.pluginCss = tagId
    tag.textContent = UI_CSS
    document.head.appendChild(tag)
    return () => {
      tag.remove()
      if (typeof document !== 'undefined') {
        document.body.removeAttribute('data-dsh-tide-theme')
      }
    }
  }, 'tide-theme: ui styles')
}

/**
 * 侧栏「未归档 / 归档」分页与筛选框。
 *
 * uiWorkspace 由 ui-workspace 插件提供，激活期可能尚未就绪，因此服务只在
 * 点击瞬间解析；slot 容器同样由 ui-workspace 异步渲染，anchor 常不存在，
 * 这里按短重试兜底，命中即挂。
 */
function mountSidebarTabsSafe(ctx: ClientCtx): void {
  const react = require('react') as unknown as { createElement: unknown }
  const reactDom = require('react-dom/client') as unknown as {
    createRoot: (c: HTMLElement) => { render: (n: unknown) => void; unmount: () => void }
  }
  const workspace = () => {
    const service = (ctx as { get?: (name: string) => unknown }).get?.('uiWorkspace') as ClientCtx['uiWorkspace'] | undefined
    if (service === undefined) throw new Error('uiWorkspace service unavailable')
    return service
  }

  ctx.effect(() => {
    if (typeof document === 'undefined') return
    const t = withFallback(ctx.locale.bind(PLUGIN_ID), DICT_ZH)
    let mount: { unmount: () => void } | null = null
    let retries = 0
    const tryMount = () => {
      if (mount !== null) return
      mount = mountSidebarTabs({
        locale: t,
        workspace,
        createElement: (tag) => document.createElement(tag),
        React: {
          createElement: react.createElement,
          createRoot: (container: HTMLElement) => {
            const root = reactDom.createRoot(container)
            return { render: (node: unknown) => root.render(node), unmount: () => root.unmount() }
          },
          hooks: require('react') as unknown as ReactHooks
        }
      })
      if (mount === null && retries < 40) {
        retries += 1
        window.setTimeout(tryMount, 250)
      }
    }
    tryMount()
    return () => {
      mount?.unmount()
      // 重试计划一并取消：置 mount 为已完成态让后续 tryMount 直接返回。
      if (mount === null) mount = { unmount: () => {} }
    }
  }, 'tide-theme: sidebar tabs')

  ctx.effect(() => {
    if (typeof document === 'undefined') return
    const filterT = withFallback(ctx.locale.bind(PLUGIN_ID), DICT_ZH)
    let filterMount: { unmount: () => void } | null = null
    let filterRetries = 0
    const tryFilter = () => {
      if (filterMount !== null) return
      filterMount = mountSidebarFilter({
        locale: filterT,
        setGroupBy: (mode) => workspace().view.setGroupBy(mode),
        createElement: (tag) => document.createElement(tag)
      })
      if (filterMount === null && filterRetries < 40) {
        filterRetries += 1
        window.setTimeout(tryFilter, 250)
      }
    }
    tryFilter()
    return () => {
      filterMount?.unmount()
      if (filterMount === null) filterMount = { unmount: () => {} }
    }
  }, 'tide-theme: sidebar filter')
}

function mountSidebarGroupsSafe(ctx: ClientCtx): void {
  ctx.effect(() => {
    if (typeof document === 'undefined') return
    const groupsT = withFallback(ctx.locale.bind(PLUGIN_ID), DICT_ZH)
    const workspaces = ctx.workspaces?.list
    const sessions = ctx.sessions?.list
    if (workspaces === undefined || sessions === undefined) return
    let groupsMount: { unmount: () => void } | null = null
    let attempts = 0
    const tryMount = () => {
      if (groupsMount !== null) return
      groupsMount = mountSidebarGroups({
        locale: groupsT,
        workspaces,
        sessions,
        createElement: (tag) => document.createElement(tag),
        archivedFilter: () => readArchivedFilter(localStorage.getItem(VIEW_STORE_KEY))
      })
      if (groupsMount === null && attempts < 40) {
        attempts += 1
        window.setTimeout(tryMount, 250)
      }
    }
    tryMount()
    return () => {
      groupsMount?.unmount()
      if (groupsMount === null) {
        groupsMount = { unmount: () => {} }
      }
    }
  }, 'tide-theme: sidebar groups')
}

/** 原生统计项/上下文环的百分比语义上色（只给宿主节点打标记属性，颜色走样式表）。 */
function mountStatColorsSafe(ctx: ClientCtx): void {
  ctx.effect(() => {
    const mount = mountStatColors()
    return () => mount?.unmount()
  }, 'tide-theme: stat colors')
}

/** 底部控件行按输入卡片真实宽度对齐（写 CSS 变量，避免窄窗口错位）。 */
function mountDockAlignSafe(ctx: ClientCtx): void {
  ctx.effect(() => {
    const mount = mountDockAlign()
    return () => mount?.dispose()
  }, 'tide-theme: dock align')
}

/**
 * 每轮端到端真实耗时徽标。
 *
 * 计时来自会话 running 状态翻转，写完即定格；turnTail 插槽只暴露 turn/seq，
 * 拿不到起止时间戳，因此两者职责不重叠：这里负责「真实耗时」，turnTail 负责
 * 「回合序号」。
 */
function mountTurnDurationSafe(ctx: ClientCtx): void {
  ctx.effect(() => {
    const sessions = ctx.sessions?.list
    if (sessions === undefined || typeof document === 'undefined') return
    const t = withFallback(ctx.locale.bind(PLUGIN_ID), DICT_ZH)
    const mount = mountTurnDuration({
      sessions: {
        getSnapshot: () => sessions.getSnapshot() as never,
        subscribe: (listener) => sessions.subscribe(listener)
      },
      currentSessionId: () => readCurrentSessionId(localStorage.getItem(CURRENT_SESSION_KEY)),
      locale: t
    })
    return () => mount?.unmount()
  }, 'tide-theme: turn duration')
}

/**
 * 子代理派发图（Agent Graph）。
 *
 * 这里必须保留原生 DOM 挂载：宿主只提供 `conversation.chat.turnTail` 等
 * 回合级插槽，没有暴露「每一批委派工具行之后」的扩展点，因此无法用纯 Slot
 * 复现「扇出连线 + 卡片阵列 + 停止按钮」的原位拓扑。挂载器自身只读工具行、
 * 不修改宿主节点内容（仅写一个来源标记属性），并在 dispose 时完整回收。
 */
function mountDelegationPanelSafe(ctx: ClientCtx): void {
  ctx.effect(() => {
    if (typeof document === 'undefined') return
    const sessions = ctx.sessions?.list
    if (sessions === undefined) return
    const t = withFallback(ctx.locale.bind(PLUGIN_ID), DICT_ZH)
    const openSession = (sessionId: string) => {
      const service = (ctx as { get?: (name: string) => unknown }).get?.('uiWorkspace') as { openSession?: (id: string) => void } | undefined
      service?.openSession?.(sessionId)
    }
    const bindingOf = (sessionId: string) =>
      ctx.sessions?.binding(sessionId) as { session?: { cancel?: () => Promise<unknown> } } | undefined
    const panel = mountDelegationPanel({
      sessions: {
        getSnapshot: () => sessions.getSnapshot() as never,
        subscribe: (listener) => sessions.subscribe(listener),
        refreshProjections: (sessionId) => ctx.sessions?.refreshProjections?.(sessionId)
      },
      currentSessionId: () => readCurrentSessionId(localStorage.getItem(CURRENT_SESSION_KEY)),
      locale: t,
      openSession,
      canCancel: (sessionId: string) => typeof bindingOf(sessionId)?.session?.cancel === 'function',
      cancelSession: (sessionId: string) => {
        void bindingOf(sessionId)?.session?.cancel?.().catch?.((error: unknown) =>
          console.error('[dsh-tide-theme] cancel subagent failed:', error))
      }
    })
    return () => panel?.dispose()
  }, 'tide-theme: delegation panel')
}

/**
 * 会话 → 工作区 id 的解析器。
 *
 * 宿主的会话快照不带 workspaceId，只能由工作区侧持有的 sessionIds 反查；
 * 子代理会话通常不在任何工作区列表里，因此向上追一层父会话，
 * 避免子代理绕过「供应商只在指定工作区可用」的限制。
 */
function makeWorkspaceResolver(ctx: ClientCtx): (sessionId: string) => string | undefined {
  return (sessionId: string) => {
    const items = ctx.workspaces?.list.getSnapshot().items ?? []
    const sessions = ctx.sessions?.list.getSnapshot() as
      { byId?: Record<string, { parentId?: string }> } | undefined
    return resolveWorkspaceId(
      sessionId,
      items,
      (id) => sessions?.byId?.[id]?.parentId
    )
  }
}

function registerDock(ctx: ClientCtx): void {
  const workspaceId = makeWorkspaceResolver(ctx)
  const react = require('react') as unknown as { createElement: unknown }
  const hooks = require('react') as unknown as ReactHooks
  const h = react.createElement as H
  const t = withFallback(ctx.locale.bind(PLUGIN_ID), DICT_ZH)
  const shared: DockShared = { h, hooks, t }

  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
    {
      name: 'conversation.composer.dock',
      id: 'simplify-model-permission',
      order: -10,
      inject: (sessionId: string) => ({
        sessionId,
        directories: ctx.modelDirectories,
        remote: { permissionPresets: { catalog: () => ctx.remote.permissionPresets.catalog() } },
        session: () => ctx.sessions?.binding(sessionId)?.session
      })
    },
    (entryProps: Record<string, unknown>) => {
      const usage = () => collectUsage((ctx.sessions?.list.getSnapshot().byId ?? {}) as never, readLocalUsage())
      const { sessionId, directories, remote, useProjection, session } = entryProps as {
        sessionId: string
        directories: ModelDirectories
        remote: ClientCtx['remote']
        useProjection: (key: string) => unknown
        session: () => PermissionSession | undefined
      }
      const ref = hooks.useRef<{ sessionId: string; control: ReturnType<typeof createDockControl> } | null>(null)
      if (ref.current === null || ref.current.sessionId !== sessionId) {
        ref.current = {
          sessionId,
          control: createDockControl({
            sessionId,
            directories,
            remote,
            useProjection,
            session,
            shared,
            usage,
            recordSelection: recordLocalUsage,
            workspaceId: () => workspaceId(sessionId)
          })
        }
      }
      return h(ref.current.control as never, { useProjection })
    }
  ))

  // 模型与思考等级、权限按效果图放回输入框内部行动行：宿主原生就在这里预留了座位，
  // 底栏因此只留统计 HUD，不再和控件挤同一行。
  const seatProps = (entryProps: Record<string, unknown>) => {
    return entryProps as unknown as {
      sessionId: string
      directories: ModelDirectories
      remote: ClientCtx['remote']
      useProjection: (key: string) => unknown
      session: () => PermissionSession | undefined
    }
  }
  const seatInject = (sessionId: string) => ({
    sessionId,
    directories: ctx.modelDirectories,
    remote: { permissionPresets: { catalog: () => ctx.remote.permissionPresets.catalog() } },
    session: () => ctx.sessions?.binding(sessionId)?.session
  })

  ctx.slots.inject('conversation.input.left', () => ctx.slots.register(
    { name: 'conversation.input.left', id: 'simplify-model-seat', order: -10, inject: seatInject },
    (entryProps: Record<string, unknown>) => {
      const p = seatProps(entryProps)
      const usage = () => collectUsage((ctx.sessions?.list.getSnapshot().byId ?? {}) as never, readLocalUsage())
      const ref = hooks.useRef<{ sessionId: string; seat: ReturnType<typeof createModelSeat> } | null>(null)
      if (ref.current === null || ref.current.sessionId !== p.sessionId) {
        ref.current = {
          sessionId: p.sessionId,
          seat: createModelSeat({ sessionId: p.sessionId, directories: p.directories, remote: p.remote, useProjection: p.useProjection, session: p.session, shared, usage, recordSelection: recordLocalUsage, workspaceId: () => workspaceId(p.sessionId) })
        }
      }
      return h(ref.current.seat as never, {})
    }
  ))
}

function registerPluginSettings(ctx: ClientCtx): void {
  const react = require('react') as unknown as { createElement: unknown }
  const hooks = require('react') as unknown as ReactHooks
  const h = react.createElement as H
  const t = withFallback(ctx.locale.bind(PLUGIN_ID), DICT_ZH)
  const shared: DockShared = { h, hooks, t }
  const settingsComponent = createPluginSettings({
    shared,
    /**
     * 设置页需要全部供应商来做绑定配置。
     *
     * 宿主的模型目录是会话级服务，设置页打开时可能一条会话都没有；
     * 因此这里「实时加载优先、缓存兜底」：只要用户此前在任何会话里
     * 打开过模型面板，供应商就是已知的，不该因为当前没有会话而变空。
     */
    providerCatalog: async () => {
      const byId = ctx.sessions?.list.getSnapshot().byId ?? {}
      const firstId = Object.keys(byId)[0]
      if (firstId !== undefined) {
        try {
          const snapshot = await ctx.modelDirectories.directoryFor(firstId).load()
          const live = snapshot.groups
            .filter((group) => group.models.length > 0)
            .map((group) => ({ id: group.id, name: group.name }))
          if (live.length > 0) {
            recordKnownProviders(live)
            return live
          }
        } catch {
          // 实时加载失败不致命：继续走缓存。
        }
      }
      const cached = readKnownProviders()
      if (cached.length > 0) return cached
      // 既没有会话也没有缓存：让设置页显示「暂无」而不是误报成加载错误。
      return []
    },
    workspaces: () => {
      const items = ctx.workspaces?.list.getSnapshot().items ?? []
      // 快照只带 workspaceId、没有人类可读名称；侧栏已渲染的工作区行上才有名字，
      // 因此按 data-row-key 反查一次标签，查不到就退回显示 id（不编造名称）。
      const labels = new Map<string, string>()
      if (typeof document !== 'undefined') {
        for (const row of document.querySelectorAll<HTMLElement>('[data-row-key^="workspace:"]')) {
          const id = (row.getAttribute('data-row-key') ?? '').replace('workspace:', '')
          const text = (row.textContent ?? '').trim()
          if (id !== '' && text !== '') labels.set(id, text)
        }
      }
      return items.map((item) => ({
        id: item.workspaceId,
        label: labels.get(item.workspaceId) ?? item.workspaceId
      }))
    }
  })

  // 1. 注册到包级配置：当用户在插件管理列表点击 dsh-tide-theme 时直接呈现
  ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register(
    {
      name: 'plugins.bundle.config',
      key: 'dsh-tide-theme'
    },
    settingsComponent as never
  ))

  // 2. 注册到行级配置：当用户点击插件内的具体 dsh-tide-theme 行时呈现（遵循 `${bundle}#${rowId}`）
  ctx.slots.inject('plugins.row.config', () => ctx.slots.register(
    {
      name: 'plugins.row.config',
      key: 'dsh-tide-theme#dsh-tide-theme'
    },
    settingsComponent as never
  ))
}

/** 单步执行并上报失败；一步抛错不拖垮其余功能。 */
function step(label: string, run: () => void): void {
  try {
    run()
  } catch (error) {
    console.error(`[${PLUGIN_ID}] ${label} 注册失败:`, error)
  }
}

export function apply(ctx: ClientCtx): void {
  // 每次激活打印一次构建标记，并写到 <html> 上：重启后仍看不到新样式时，
  // 先确认运行的是不是最新构建，而不是继续怀疑功能本身。
  console.info(`[${PLUGIN_ID}] 已加载构建 ${BUILD}`)
  if (typeof document !== 'undefined') document.documentElement.dataset.dshTideBuild = BUILD

  // 必须在任何读取配置/置顶状态的代码之前跑：0.4.0 换了包名，持久化键前缀
  // 也换了，不迁移的话升级用户会看到置顶与工作区分区凭空消失。
  const migration = migrateLegacyStorageKeys()
  if (migration.migrated.length > 0) {
    console.info(`[${PLUGIN_ID}] 已从旧版本键迁移: ${migration.migrated.join(', ')}`)
  }

  step('locale', () => ctx.locale.register(PLUGIN_ID, { zh: DICT_ZH, en: DICT_EN }))

  // 独立管理 body 门控属性，不与 ctx.theme 服务时序强耦合：
  // 即使宿主 theme 服务初始化延迟或未注入，依赖该属性的全局背景与卡片光晕依然能稳定生效！
  ctx.effect(() => {
    let currentConfig = loadSimplifyConfig()
    const syncGate = () => {
      if (typeof document !== 'undefined') {
        if (currentConfig.themeOverrides) {
          document.body.setAttribute('data-dsh-tide-theme', '')
        } else {
          document.body.removeAttribute('data-dsh-tide-theme')
        }
      }
    }
    syncGate()
    const unsub = onSimplifyConfigChange((cfg) => {
      currentConfig = cfg
      syncGate()
    })
    return () => {
      unsub()
      if (typeof document !== 'undefined') {
        document.body.removeAttribute('data-dsh-tide-theme')
      }
    }
  }, 'tide-theme: body gate')

  if (ctx.theme !== undefined) {
    step('theme', () => {
      let currentConfig = loadSimplifyConfig()
      let disposer: (() => void) | undefined
      const applyTheme = () => {
        disposer?.()
        disposer = undefined
        if (currentConfig.themeOverrides) {
          disposer = ctx.theme!.overrideTokens(THEME_SOURCE, SIMPLIFY_TOKENS)
        }
      }
      ctx.effect(() => {
        applyTheme()
        const unsub = onSimplifyConfigChange((cfg) => {
          currentConfig = cfg
          applyTheme()
        })
        return () => {
          unsub()
          disposer?.()
        }
      }, 'tide-theme: token layer')
    })
  }
  step('styles', () => installStyles(ctx))
  step('sidebar-tabs', () => mountSidebarTabsSafe(ctx))
  step('groups', () => mountSidebarGroupsSafe(ctx))
  step('stat-colors', () => mountStatColorsSafe(ctx))
  step('dock-align', () => mountDockAlignSafe(ctx))
  step('delegation', () => mountDelegationPanelSafe(ctx))
  step('turn-duration', () => mountTurnDurationSafe(ctx))
  step('dock', () => registerDock(ctx))
  step('settings', () => registerPluginSettings(ctx))
}
