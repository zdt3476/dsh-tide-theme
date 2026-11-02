/**
 * 让底部控件行与输入卡片等宽。
 *
 * 卡片宽度是「内容列 + 两侧留白」再受可用宽度挤压的结果，纯 CSS 常量在窄窗口下会
 * 错位（例如 1440 宽时卡片 774px、900 宽时 712px）。这里读卡片的实际宽度写进
 * CSS 变量，控件行按这个变量取宽，任何窗口宽度下左右边缘都和卡片对齐。
 */

const CARD = '[data-composer-card]'
const DOCK_ROW = '[data-composer-dock]'
const HOST_SELECTOR = '[data-dsh-simplify-dock-root], [data-dsh-simplify-dock-center], [data-dsh-simplify-hero-host], [data-dsh-simplify-seat]'
const VAR = '--dsh-simplify-card-width'
const INSET = '--dsh-simplify-dock-inset-x'

export interface DockAlignHandle {
  dispose: () => void
}

export function mountDockAlign(): DockAlignHandle | null {
  if (typeof document === 'undefined') return null

  let observer: ResizeObserver | null = null
  const observedCards = new Set<HTMLElement>()
  let frame = 0

  const sync = () => {
    frame = 0
    const cards = Array.from(document.querySelectorAll<HTMLElement>(CARD))
    const allRows = new Set(document.querySelectorAll<HTMLElement>(DOCK_ROW))
    const matchedRows = new Set<HTMLElement>()

    // 同步更新 ResizeObserver 监听的所有活跃 card
    const currentCardSet = new Set(cards)
    for (const card of observedCards) {
      if (!currentCardSet.has(card)) {
        observer?.unobserve(card)
        observedCards.delete(card)
      }
    }
    for (const card of currentCardSet) {
      if (!observedCards.has(card)) {
        observer?.observe(card)
        observedCards.add(card)
      }
    }

    // 按每个 seat/card 对应寻找其对应的 dock row
    for (const card of cards) {
      const seat = card.closest('[data-composer-seat]')
      const row = card.parentElement?.querySelector<HTMLElement>(DOCK_ROW) ??
                  seat?.querySelector<HTMLElement>(DOCK_ROW) ??
                  card.parentElement?.parentElement?.querySelector<HTMLElement>(DOCK_ROW)
      if (row === null || row === undefined) continue
      matchedRows.add(row)

      const hasCenter = row.querySelector(HOST_SELECTOR) !== null
      // 空 center 或未装配简化控件时清理样式变量，宿主恢复原生
      if (!hasCenter) {
        row.style.removeProperty(VAR)
        row.style.removeProperty(INSET)
        continue
      }

      const width = `${Math.round(card.getBoundingClientRect().width)}px`
      if (row.style.getPropertyValue(VAR) !== width) row.style.setProperty(VAR, width)
      // 圆角半径随主题变化，读实际值作为左右内缩，使控件起点落在圆角末梢
      const radius = getComputedStyle(card).borderTopLeftRadius
      if (radius !== '' && row.style.getPropertyValue(INSET) !== radius) row.style.setProperty(INSET, radius)
    }

    // 清理未匹配到有效 card 或无 center 控件的孤立 row
    for (const row of allRows) {
      if (!matchedRows.has(row) || row.querySelector(HOST_SELECTOR) === null) {
        row.style.removeProperty(VAR)
        row.style.removeProperty(INSET)
      }
    }
  }

  const schedule = () => {
    if (frame !== 0) return
    frame = window.requestAnimationFrame(sync)
  }

  observer = new ResizeObserver(schedule)
  const mutations = new MutationObserver(schedule)
  mutations.observe(document.body, { childList: true, subtree: true })
  schedule()

  return {
    dispose: () => {
      observer?.disconnect()
      observedCards.clear()
      mutations.disconnect()
      if (frame !== 0) window.cancelAnimationFrame(frame)
      for (const row of document.querySelectorAll<HTMLElement>(DOCK_ROW)) {
        row.style.removeProperty(VAR)
        row.style.removeProperty(INSET)
      }
    }
  }
}
