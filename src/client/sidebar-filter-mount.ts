/**
 * 筛选框的 DOM 装配：注入输入框、应用过滤、观察列表重渲染。
 *
 * header 通过「搜索按钮的最近公共容器」定位（aria-label 稳定，class 是哈希）；
 * 列表变化用 childList MutationObserver 驱动重放，样式切换不触发观察。
 */

import { computeHiddenRows, readRow } from './sidebar-filter'
import { sidebarHeader } from './sidebar-dom'

const SLOT_SELECTOR = '[data-slot="sidebar.workspaces"]'

function listRows(slot: Element): Element[] {
  return [...slot.querySelectorAll('[data-row-key]')]
}

export interface SidebarFilterOptions {
  locale: (key: string) => string
  createElement: (tag: string) => HTMLElement
  setGroupBy: (mode: 'workspace' | 'workspace-tree' | 'flat') => void
}

export interface SidebarFilterMount {
  unmount: () => void
}

export function mountSidebarFilter(options: SidebarFilterOptions): SidebarFilterMount | null {
  const slot = document.querySelector(SLOT_SELECTOR)
  const header = slot === null ? null : sidebarHeader(slot)
  if (slot === null || header === null) return null

  header.setAttribute('data-dsh-tide-sidebar-header', '')
  const host = options.createElement('div')
  host.dataset.dshTideFilterHost = ''
  /** 无匹配结果时挂在筛选框下方的空态节点；有结果时为 null。 */
  let emptyState: HTMLElement | null = null
  const tabs = header.parentElement?.querySelector('[data-dsh-tide-tabs-host]')
  ;(tabs ?? header).insertAdjacentElement('afterend', host)

  const input = options.createElement('input') as HTMLInputElement
  input.type = 'text'
  input.dataset.dshTideFilter = ''
  input.placeholder = options.locale('filter.placeholder')
  input.setAttribute('aria-label', options.locale('filter.ariaLabel'))
  host.appendChild(input)

  const nativeSearch = header.querySelector('input')?.parentElement?.parentElement
  const nativeOptions = header.querySelector<HTMLElement>('button[aria-label="视图选项"], button[aria-label="View options"]')
  nativeSearch?.setAttribute('data-dsh-tide-native-filter', '')
  nativeOptions?.setAttribute('data-dsh-tide-native-filter', '')

  const grouping = options.createElement('select') as HTMLSelectElement
  grouping.dataset.dshTideGrouping = ''
  grouping.setAttribute('aria-label', options.locale('filter.groupBy'))
  for (const value of ['workspace', 'workspace-tree', 'flat'] as const) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = options.locale(`filter.${value}`)
    grouping.appendChild(option)
  }
  const saved = localStorage.getItem('dsh.workspace.view.v5')
  if (saved !== null) {
    try {
      const value = JSON.parse(saved) as { groupBy?: string }
      if (value.groupBy !== undefined) grouping.value = value.groupBy
    } catch { /* 损坏的持久化数据由 DSH 使用默认工作区分组。 */ }
  }
  grouping.addEventListener('change', () => options.setGroupBy(grouping.value as 'workspace' | 'workspace-tree' | 'flat'))
  host.appendChild(grouping)

  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { input.value = ''; schedule(); input.blur() }
  })

  let frame = 0
  const apply = () => {
    frame = 0
    const query = input.value.trim()
    slot.toggleAttribute('data-dsh-tide-filtering', query !== '')
    const rows = listRows(slot as Element)
    const hidden = computeHiddenRows(rows.map(readRow), input.value)
    for (const row of rows) {
      const key = row.getAttribute('data-row-key') ?? ''
      const hide = hidden.has(key)
      const next = hide ? 'none' : ''
      if (row.getAttribute('data-dsh-tide-hidden') !== String(hide)) {
        row.setAttribute('data-dsh-tide-hidden', String(hide))
        ;(row as HTMLElement).style.display = next
      }
    }

    // 全部被滤掉时必须给出空态：否则侧栏整片留白，用户无法区分「没有匹配」
    // 与「列表渲染失败」。
    const empty = query !== '' && rows.length > 0 && hidden.size >= rows.length
    if (empty && emptyState === null) {
      emptyState = options.createElement('div')
      emptyState.dataset.dshTideEmpty = ''
      emptyState.textContent = options.locale('filter.noMatch')
      host.insertAdjacentElement('afterend', emptyState)
    } else if (!empty && emptyState !== null) {
      emptyState.remove()
      emptyState = null
    }
  }
  const schedule = () => {
    if (frame !== 0) return
    frame = window.requestAnimationFrame(apply)
  }

  input.addEventListener('input', schedule)

  const observer = new MutationObserver(schedule)
  observer.observe(slot, { childList: true, subtree: true })

  return {
    unmount: () => {
      observer.disconnect()
      if (frame !== 0) window.cancelAnimationFrame(frame)
      // 卸载时还原所有被隐藏的行。
      for (const row of listRows(slot as Element)) {
        row.removeAttribute('data-dsh-tide-hidden')
        ;(row as HTMLElement).style.display = ''
      }
      slot.removeAttribute('data-dsh-tide-filtering')
      emptyState?.remove()
      emptyState = null
      header.removeAttribute('data-dsh-tide-sidebar-header')
      nativeSearch?.removeAttribute('data-dsh-tide-native-filter')
      nativeOptions?.removeAttribute('data-dsh-tide-native-filter')
      host.remove()
    }
  }
}
