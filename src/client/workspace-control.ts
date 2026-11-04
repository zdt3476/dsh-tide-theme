/**
 * 工作区与会话视图控制器（自有 Slot 界面与面板替代方案）。
 *
 * 架构说明：
 * DSH 宿主在原生侧栏工作区树内部（`sidebar.workspaces`）未预留官方扩展 slot。
 * 本组件拒绝直接操作/注入原生 DOM，而是遵循官方规范：
 * 1. 作为自有 React 组件挂载在官方 slot（`conversation.composer.dock` 与 `sidebar.panellist` 对应的主面板）；
 * 2. 通过宿主公共服务 `ctx.uiWorkspace.view` 与 `ctx.sessions` / `ctx.workspaces` 进行标准数据交互；
 * 3. 完整保留侧栏未归档/归档分页、分组模式切换（工作区/目录树/平铺）与实时会话检索功能。
 */

import { useDismiss, type DockShared } from './dock-shared'
import { readArchivedFilter, VIEW_STORE_KEY, type ArchivedFilter } from './view-state'
import { PINNED_KEY, parsePinned } from './sidebar-groups'
import { useSimplifyConfig } from './plugin-config'

export interface WorkspaceControlOptions {
  shared: DockShared
  workspace: () => {
    view: {
      setArchivedFilter: (filter: 'default' | 'show' | 'only') => void
      setGroupBy: (mode: 'workspace' | 'workspace-tree' | 'flat') => void
    }
    openSession?: (sessionId: string) => void
    pinSession?: (sessionId: string) => Promise<unknown>
    unpinSession?: (sessionId: string) => Promise<unknown>
  }
  sessions?: () => { byId?: Record<string, any> } | undefined
  sessionStore?: { getSnapshot: () => { byId?: Record<string, any> }; subscribe: (cb: () => void) => () => void }
}

export function createWorkspaceControl(options: WorkspaceControlOptions) {
  const { h, hooks, t } = options.shared

  return function WorkspaceControl() {
    const [config] = useSimplifyConfig(hooks)
    const [filter, setFilter] = hooks.useState<ArchivedFilter>(() => {
      if (typeof localStorage === 'undefined') return 'default'
      return readArchivedFilter(localStorage.getItem(VIEW_STORE_KEY))
    })
    const [groupBy, setGroupByState] = hooks.useState<'workspace' | 'workspace-tree' | 'flat'>('workspace')
    const [query, setQuery] = hooks.useState('')
    const [openPopover, setOpenPopover] = hooks.useState(false)
    const [pinned, setPinned] = hooks.useState<string[]>(() => {
      if (typeof localStorage === 'undefined') return []
      return parsePinned(localStorage.getItem(PINNED_KEY))
    })

    // 弹层快捷关闭（Escape 键与外部点击监听）
    useDismiss(options.shared, () => setOpenPopover(false), openPopover)

    // 响应 storage 事件同步持久化视图状态与置顶列表，杜绝轮询反模式
    hooks.useEffect(() => {
      const syncFilter = (e?: StorageEvent) => {
        if (e && e.key) {
          if (e.key === VIEW_STORE_KEY) {
            const current = readArchivedFilter(localStorage.getItem(VIEW_STORE_KEY))
            setFilter((prev) => (prev !== current ? current : prev))
          }
          if (e.key === PINNED_KEY) {
            setPinned(parsePinned(localStorage.getItem(PINNED_KEY)))
          }
          return
        }
        if (typeof localStorage === 'undefined') return
        const current = readArchivedFilter(localStorage.getItem(VIEW_STORE_KEY))
        setFilter((prev) => (prev !== current ? current : prev))
        setPinned(parsePinned(localStorage.getItem(PINNED_KEY)))
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', syncFilter)
        return () => window.removeEventListener('storage', syncFilter)
      }
    }, [])

    if (!config.sidebarTabs) return null

    const handleTab = (next: ArchivedFilter) => {
      setFilter(next)
      try {
        options.workspace().view.setArchivedFilter(next)
      } catch (err) {
        console.warn('[dsh-tide-theme] setArchivedFilter 失败:', err)
      }
    }

    const handleGroupBy = (mode: 'workspace' | 'workspace-tree' | 'flat') => {
      setGroupByState(mode)
      try {
        options.workspace().view.setGroupBy(mode)
      } catch (err) {
        console.warn('[dsh-tide-theme] setGroupBy 失败:', err)
      }
    }

    const togglePin = (sessionId: string, e: any) => {
      e?.stopPropagation?.()
      const isPinned = pinned.includes(sessionId)
      const next = isPinned ? pinned.filter(id => id !== sessionId) : [sessionId, ...pinned]
      setPinned(next)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PINNED_KEY, JSON.stringify(next))
      }
      try {
        const ws = options.workspace()
        if (isPinned) {
          ws.unpinSession?.(sessionId)?.catch?.(() => {})
        } else {
          ws.pinSession?.(sessionId)?.catch?.(() => {})
        }
      } catch {
        // ignore
      }
    }

    // 过滤会话列表（响应式订阅会话数据流，置顶项优先排序）
    const sessionSnapshot = options.sessionStore
      ? hooks.useSyncExternalStore(options.sessionStore.subscribe, options.sessionStore.getSnapshot)
      : options.sessions?.()
    const allSessions = sessionSnapshot?.byId ?? {}
    const sessionList = Object.values(allSessions).filter((s: any) => s && s.origin !== 'subagent')
    const matches = query.trim() === ''
      ? sessionList
      : sessionList.filter((s) => {
          const title = s.displayTitle ?? s.title ?? s.id
          return title.toLowerCase().includes(query.toLowerCase())
        })
    const filteredSessions = [...matches].sort((a, b) => {
      const aPinned = pinned.includes(a.id)
      const bPinned = pinned.includes(b.id)
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return 0
    }).slice(0, 10)

    return h('div', {
      className: 'dsh-tide-workspace-control-root',
      'data-dsh-tide-workspace-control': ''
    },
      // 1. 核心分页 Tab（未归档 / 已归档）
      h('div', {
        className: 'dsh-tide-tabs-pill',
        role: 'tablist',
        'aria-label': '会话归档分页'
      },
        h('button', {
          type: 'button',
          className: `dsh-tide-tab-btn ${filter === 'default' ? 'is-active' : ''}`,
          'data-active': filter === 'default' ? 'true' : 'false',
          onClick: () => handleTab('default')
        }, t('tabs.sessions') || '未归档'),
        h('button', {
          type: 'button',
          className: `dsh-tide-tab-btn ${filter === 'only' ? 'is-active' : ''}`,
          'data-active': filter === 'only' ? 'true' : 'false',
          onClick: () => handleTab('only')
        }, t('tabs.archived') || '已归档')
      ),

      // 2. 搜索检索快捷入口
      h('button', {
        type: 'button',
        className: `dsh-tide-filter-trigger ${openPopover ? 'is-active' : ''}`,
        'aria-label': t('filter.ariaLabel') || '筛选工作区与会话',
        onClick: () => setOpenPopover(!openPopover)
      },
        h('span', { className: 'dsh-tide-filter-icon' }, '🔍'),
        h('span', { className: 'dsh-tide-filter-text' }, query ? `筛选: ${query}` : (t('filter.groupBy') || '视图筛选'))
      ),

      // 3. 展开浮层：包含关键字输入、分组模式切换、快速会话导航
      openPopover ? h('div', {
        className: 'dsh-tide-workspace-popover',
        'data-dsh-tide-popover': 'workspace'
      },
        h('div', { className: 'dsh-tide-popover-head' },
          h('input', {
            type: 'text',
            className: 'dsh-tide-filter-input',
            placeholder: t('filter.placeholder') || '筛选工作区或会话…',
            value: query,
            onChange: (e: any) => setQuery(e.target.value),
            autoFocus: true
          }),
          query ? h('button', {
            type: 'button',
            className: 'dsh-tide-filter-clear',
            onClick: () => setQuery('')
          }, '×') : null
        ),

        // 分组模式选择
        h('div', { className: 'dsh-tide-groupby-row' },
          h('span', { className: 'dsh-tide-groupby-label' }, t('filter.groupBy') || '分组方式:'),
          h('div', { className: 'dsh-tide-groupby-options' },
            h('button', {
              type: 'button',
              className: `dsh-tide-groupby-btn ${groupBy === 'workspace' ? 'is-active' : ''}`,
              onClick: () => handleGroupBy('workspace')
            }, t('filter.workspace') || '工作区'),
            h('button', {
              type: 'button',
              className: `dsh-tide-groupby-btn ${groupBy === 'workspace-tree' ? 'is-active' : ''}`,
              onClick: () => handleGroupBy('workspace-tree')
            }, t('filter.workspace-tree') || '目录树'),
            h('button', {
              type: 'button',
              className: `dsh-tide-groupby-btn ${groupBy === 'flat' ? 'is-active' : ''}`,
              onClick: () => handleGroupBy('flat')
            }, t('filter.flat') || '全部会话')
          )
        ),

        // 匹配会话列表（支持置顶高亮与一键置顶操作）
        filteredSessions.length > 0 ? h('div', { className: 'dsh-tide-session-quick-list' },
          filteredSessions.map((s) => {
            const isPinned = pinned.includes(s.id)
            return h('div', { key: s.id, className: 'dsh-tide-session-quick-item-wrap' },
              h('button', {
                type: 'button',
                className: `dsh-tide-session-quick-item ${isPinned ? 'is-pinned' : ''}`,
                onClick: () => {
                  setOpenPopover(false)
                  try {
                    options.workspace().openSession?.(s.id)
                  } catch (e) {
                    console.warn('[dsh-tide-theme] openSession 失败:', e)
                  }
                }
              },
                h('span', { className: 'dsh-tide-session-title' },
                  isPinned ? h('span', { className: 'dsh-tide-pin-badge' }, '📌 ') : null,
                  s.displayTitle ?? s.title ?? s.id
                ),
                s.running ? h('span', { className: 'dsh-tide-session-running-dot' }) : null
              ),
              h('button', {
                type: 'button',
                className: `dsh-tide-pin-action-btn ${isPinned ? 'is-pinned' : ''}`,
                title: isPinned ? (t('groups.unpinWorkspace') || '取消置顶') : (t('groups.pinWorkspace') || '置顶'),
                'aria-label': isPinned ? '取消置顶' : '置顶',
                onClick: (e: any) => togglePin(s.id, e)
              }, isPinned ? '★' : '☆')
            )
          })
        ) : h('div', { className: 'dsh-tide-empty-state' }, t('filter.noMatch') || '无匹配会话')
      ) : null
    )
  }
}
