/**
 * 侧栏工作区列表的渐进披露：活跃排序、折叠、置顶、会话数徽标。
 *
 * DSH 没有工作区级的 pin，也没有「只显示前 N 个工作区」的开关，所以全部在
 * DOM 层做（与 tabs/筛选同一套注入策略）：
 *   - 折叠：给超出 N 的组打 `data-dsh-tide-collapsed`，样式表负责隐藏；
 *   - 置顶：给组打 `data-dsh-tide-pinned`，列表容器改 flex column 后用 order 提前；
 *   - 徽标：把会话数写进工作区行的属性，样式表用 ::after + attr() 渲染。
 * 原生拖拽/动画继续按自己的节点工作，我们只改属性与顺序，不动 DOM 结构。
 */

import type { ArchivedFilter } from './view-state'
import { orderWorkspaceGroups, workspaceActivity } from './sidebar-activity'
import type { ActivityStore, SessionActivitySnapshot, WorkspaceActivitySnapshot } from './sidebar-activity'
import { loadSimplifyConfig, onSimplifyConfigChange } from './plugin-config'

export const PINNED_KEY = 'dsh-tide-theme.pinned-workspaces'
export const EXPANDED_KEY = 'dsh-tide-theme.workspaces-expanded'
export const COLLAPSED_LIMIT = 5

export interface GroupInfo {
  id: string
  pinned: boolean
}

/** 解析置顶列表；异常一律按空列表处理。 */
export function parsePinned(raw: string | null): string[] {
  if (raw === null) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

/**
 * 折叠后应保持可见的组：
 * - unpinnedLimit: 未置顶文件夹可见数量上限（默认 5）
 * - pinnedLimit: 置顶文件夹可见数量上限（默认 5；若 <= 0 则全部置顶可见）
 */
export function visibleGroupIds(
  groups: readonly GroupInfo[],
  unpinnedLimit = COLLAPSED_LIMIT,
  pinnedLimit = 5
): Set<string> {
  const visible = new Set<string>()
  let ordinary = 0
  let pinned = 0
  for (const group of groups) {
    if (group.pinned) {
      if (pinnedLimit <= 0 || pinned < pinnedLimit) {
        visible.add(group.id)
        pinned += 1
      }
      continue
    }
    if (ordinary < unpinnedLimit) {
      visible.add(group.id)
      ordinary += 1
    }
  }
  return visible
}

/** 折叠按钮文案：还有多少个组被收起。 */
export function hiddenCount(
  groups: readonly GroupInfo[],
  unpinnedLimit = COLLAPSED_LIMIT,
  pinnedLimit = 5
): number {
  const visible = visibleGroupIds(groups, unpinnedLimit, pinnedLimit)
  return groups.filter((group) => !visible.has(group.id)).length
}

export interface SidebarGroupsOptions {
  locale: (key: string, params?: Record<string, string | number>) => string
  createElement: (tag: string) => HTMLElement
  /** 读取当前归档过滤，归档页不做折叠（否则「已归档」页会空）。 */
  archivedFilter: () => ArchivedFilter
  workspaces: ActivityStore<WorkspaceActivitySnapshot>
  sessions: ActivityStore<SessionActivitySnapshot>
}

export interface SidebarGroupsMount {
  unmount: () => void
}

const SLOT_SELECTOR = '[data-slot="sidebar.workspaces"]'
const WORKSPACE_ROW = '[data-row-key^="workspace:"]'
const SESSION_ROW = '[data-row-key^="session"]'

interface GroupHandle {
  id: string
  element: HTMLElement
  row: HTMLElement
}

function collectGroups(slot: Element): GroupHandle[] {
  const handles: GroupHandle[] = []
  for (const row of slot.querySelectorAll<HTMLElement>(WORKSPACE_ROW)) {
    // 工作区行 → 行的包裹 span → 组容器；组容器内只能有这一个工作区行。
    const element = row.parentElement?.parentElement as HTMLElement | null
    if (element === null) continue
    if (element.querySelectorAll(WORKSPACE_ROW).length !== 1) continue
    const id = (row.getAttribute('data-row-key') ?? '').replace('workspace:', '')
    if (id === '') continue
    handles.push({ id, element, row })
  }
  return handles
}

export function mountSidebarGroups(options: SidebarGroupsOptions): SidebarGroupsMount | null {
  const slot = document.querySelector(SLOT_SELECTOR)
  if (slot === null) return null

  const pinned = new Set(parsePinned(localStorage.getItem(PINNED_KEY)))
  let expanded = localStorage.getItem(EXPANDED_KEY) === '1'

  const header = slot.querySelector('button[aria-label*="搜索"], button[aria-label*="Search"]')?.parentElement?.parentElement?.parentElement ?? null
  const controls = options.createElement('div')
  controls.dataset.dshTideGroupsControls = ''
  if (header !== null) header.appendChild(controls)

  const toggle = options.createElement('button') as HTMLButtonElement
  toggle.type = 'button'
  toggle.dataset.dshTideGroupsToggle = ''
  controls.appendChild(toggle)

  // 侧栏独立小节分区分组（方案 A：Linear / Slack / Notion 风格）
  const pinnedHeader = options.createElement('div')
  pinnedHeader.className = 'dsh-tide-sidebar-section is-pinned'
  pinnedHeader.dataset.dshTideSection = 'pinned'
  pinnedHeader.hidden = true

  const unpinnedHeader = options.createElement('div')
  unpinnedHeader.className = 'dsh-tide-sidebar-section is-unpinned'
  unpinnedHeader.dataset.dshTideSection = 'unpinned'
  unpinnedHeader.hidden = true

  const persistPinned = () => localStorage.setItem(PINNED_KEY, JSON.stringify([...pinned]))

  // 监听用户点击工作区行的三点菜单（···），记录目标工作区 ID，
  // 随后向原生弹出菜单中注入“置顶 / 取消置顶”操作项，彻底移除顶栏突兀按钮。
  let currentMenuWorkspaceId: string | null = null

  const onPointerDownCapture = (event: Event) => {
    const target = event.target as Element | null
    if (!target) return
    const row = target.closest('[data-row-key^="workspace:"]')
    if (row) {
      const key = row.getAttribute('data-row-key')
      if (key) {
        currentMenuWorkspaceId = key.replace(/^workspace:/, '')
      }
    }
  }
  document.addEventListener('pointerdown', onPointerDownCapture, true)

  const handleMenuCheck = () => {
    const menus = document.querySelectorAll('[role="menu"]')
    for (const menu of menus) {
      if (menu.querySelector('[data-dsh-tide-workspace-pin]') !== null) continue
      const items = [...menu.querySelectorAll('[role="menuitem"]')]
      const isWorkspaceMenu = items.some((it) => it.textContent?.includes('重命名') || it.textContent?.includes('Rename'))
        && items.some((it) => it.textContent?.includes('删除工作区') || it.textContent?.includes('Delete workspace'))
      if (!isWorkspaceMenu) continue

      const wsId = currentMenuWorkspaceId
        ?? document.querySelector('[data-row-key^="workspace:"][class*="menuOpen"]')?.getAttribute('data-row-key')?.replace(/^workspace:/, '')
        ?? collectGroups(slot)[0]?.id
      if (!wsId) continue

      const isPinned = pinned.has(wsId)
      const templateItem = items[0] as HTMLElement | undefined
      const pinItem = options.createElement('button') as HTMLButtonElement
      pinItem.type = 'button'
      pinItem.className = templateItem ? templateItem.className : ''
      pinItem.setAttribute('role', 'menuitem')
      pinItem.dataset.dshTideWorkspacePin = wsId

      const starPath = isPinned
        ? 'M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.56.56 0 0 0-.163-.505L1.71 6.745l4.052-.576a.53.53 0 0 0 .393-.288L8 2.223l1.846 3.658a.53.53 0 0 0 .393.288l4.052.575-2.906 2.77a.56.56 0 0 0-.163.506l.694 3.957-3.686-1.895a.5.5 0 0 0-.461 0z'
        : 'M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z'
      const iconSvg = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style="margin-right:8px;flex:none;"><path d="${starPath}"/></svg>`
      const text = isPinned ? options.locale('groups.unpinWorkspace') : options.locale('groups.pinWorkspace')

      pinItem.innerHTML = `${iconSvg}<span>${text}</span>`

      pinItem.addEventListener('click', (ev) => {
        ev.stopPropagation()
        if (pinned.has(wsId)) {
          pinned.delete(wsId)
        } else {
          pinned.add(wsId)
        }
        persistPinned()
        apply()
        // 模拟关闭原生菜单
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      })

      // 插入到菜单首项（在重命名之前）
      menu.insertBefore(pinItem, menu.firstChild)
    }
  }

  const menuObserver = new MutationObserver(handleMenuCheck)
  menuObserver.observe(document.body, { childList: true, subtree: true })

  const originalOrders = new WeakMap<HTMLElement, string>()
  let frame = 0
  const apply = () => {
    frame = 0
    const groups = collectGroups(slot)
    const config = loadSimplifyConfig()

    if (!config.sidebarGrouping) {
      pinnedHeader.hidden = true
      unpinnedHeader.hidden = true
      for (const group of groups) {
        group.element.removeAttribute('data-dsh-tide-group')
        group.element.removeAttribute('data-dsh-tide-pinned')
        group.element.removeAttribute('data-dsh-tide-collapsed')
        group.element.removeAttribute('data-dsh-tide-pinned-tail')
        group.row.removeAttribute('data-dsh-tide-count')
        group.row.removeAttribute('title')
        const prevOrder = originalOrders.get(group.element)
        if (prevOrder !== undefined) group.element.style.order = prevOrder
      }
      controls.hidden = true
      return
    }
    controls.hidden = false

    const archived = options.archivedFilter()
    const collapse = archived === 'default' && !expanded

    for (const group of groups) {
      group.element.setAttribute('data-dsh-tide-group', group.id)
      group.element.toggleAttribute('data-dsh-tide-pinned', pinned.has(group.id))
      const count = group.element.querySelectorAll(SESSION_ROW).length
      group.row.setAttribute('data-dsh-tide-count', String(count))
      group.row.setAttribute('title', `当前列表可见 ${count} 个会话`)
    }

    const workspace = options.workspaces.getSnapshot()
    const activity = workspaceActivity(workspace.items, options.sessions.getSnapshot().byId, workspace.archivedSessionIds, archived)
    const ranked = orderWorkspaceGroups(groups.map(group => ({ ...group, pinned: pinned.has(group.id) })), activity)
    const visible = visibleGroupIds(ranked, config.sidebarUnpinnedLimit, config.sidebarPinnedLimit)

    const listContainer = groups[0]?.element.parentElement ?? null
    if (listContainer !== null) {
      if (pinnedHeader.parentElement !== listContainer) listContainer.appendChild(pinnedHeader)
      if (unpinnedHeader.parentElement !== listContainer) listContainer.appendChild(unpinnedHeader)
    }

    const pinnedGroupIds = new Set(groups.filter(g => pinned.has(g.id)).map(g => g.id))
    const pinnedCount = pinnedGroupIds.size
    const unpinnedCount = ranked.length - pinnedCount

    if (pinnedCount > 0) {
      pinnedHeader.hidden = false
      pinnedHeader.style.order = String(-ranked.length * 2 - 2)
      pinnedHeader.innerHTML = `
        <span class="dsh-tide-section-title"><span class="dsh-tide-section-icon" aria-hidden="true">📌</span>${options.locale('groups.pinnedTitle')}</span>
        <span class="dsh-tide-section-badge">${pinnedCount}</span>
      `

      if (unpinnedCount > 0) {
        unpinnedHeader.hidden = false
        unpinnedHeader.style.order = String((pinnedCount - ranked.length) * 2 - 1)
        unpinnedHeader.innerHTML = `
          <span class="dsh-tide-section-title">${options.locale('groups.unpinnedTitle')}</span>
          <span class="dsh-tide-section-badge">${unpinnedCount}</span>
        `
      } else {
        unpinnedHeader.hidden = true
      }
    } else {
      pinnedHeader.hidden = true
      unpinnedHeader.hidden = true
    }

    for (const [index, group] of ranked.entries()) {
      if (!originalOrders.has(group.element)) originalOrders.set(group.element, group.element.style.order)
      group.element.style.order = String((index - ranked.length) * 2)
      group.element.toggleAttribute('data-dsh-tide-collapsed', collapse && !visible.has(group.id))
      const isPinned = pinnedGroupIds.has(group.id)
      group.element.toggleAttribute('data-dsh-tide-pinned', isPinned)
    }

    const hidden = hiddenCount(ranked, config.sidebarUnpinnedLimit, config.sidebarPinnedLimit)
    toggle.hidden = hidden === 0 && !expanded
    const label = expanded
      ? options.locale('groups.collapse')
      : options.locale('groups.more', { count: hidden })
    if (toggle.textContent !== label) toggle.textContent = label
  }

  const schedule = () => {
    if (frame !== 0) return
    frame = window.requestAnimationFrame(() => {
      try {
        apply()
      } catch (error) {
        console.error('[dsh-tide-theme] sidebar groups failed:', error)
      }
    })
  }

  toggle.addEventListener('click', (event) => {
    event.stopPropagation()
    expanded = !expanded
    localStorage.setItem(EXPANDED_KEY, expanded ? '1' : '0')
    apply()
  })

  const observer = new MutationObserver(schedule)
  observer.observe(slot, { childList: true, subtree: true })
  const unsubscribeWorkspaces = options.workspaces.subscribe(schedule)
  const unsubscribeSessions = options.sessions.subscribe(schedule)
  const unsubscribeConfig = onSimplifyConfigChange(schedule)
  schedule()

  return {
    unmount: () => {
      observer.disconnect()
      menuObserver.disconnect()
      unsubscribeWorkspaces()
      unsubscribeSessions()
      unsubscribeConfig()
      document.removeEventListener('pointerdown', onPointerDownCapture, true)
      if (frame !== 0) window.cancelAnimationFrame(frame)
      for (const group of collectGroups(slot)) {
        const order = originalOrders.get(group.element)
        if (order !== undefined) group.element.style.order = order
        group.element.removeAttribute('data-dsh-tide-group')
        group.element.removeAttribute('data-dsh-tide-pinned')
        group.element.removeAttribute('data-dsh-tide-collapsed')
        group.row.removeAttribute('data-dsh-tide-count')
      }
      controls.remove()
      pinnedHeader.remove()
      unpinnedHeader.remove()
    }
  }
}
