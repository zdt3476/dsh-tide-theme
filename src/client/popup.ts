/**
 * 轻量 popup 定位：以触发钮为锚，向下弹出、右缘优先，出屏翻转。
 * 独立于 DSH 的 MenuSurface，避免依赖内部 API；样式走本插件 token。
 */

export interface AnchorRect {
  left: number
  right: number
  bottom: number
  top: number
}

export interface Placement {
  left: number
  top: number
}

/**
 * 计算弹层位置：默认挂在锚点下方、左缘对齐锚点左缘；若右侧越界则右缘对齐；
 * 若下方放不下则翻转到锚点上方。
 */
export function placePopup(
  rect: AnchorRect,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  align: 'center' | 'left' | 'right' = 'center',
  preferredSide: 'top' | 'bottom' = 'bottom'
): Placement {
  let left: number
  if (align === 'center') left = (rect.left + rect.right) / 2 - size.width / 2
  else if (align === 'right') left = rect.right - size.width
  else left = rect.left
  if (left + size.width > viewport.width - 8) left = viewport.width - 8 - size.width
  if (left < 8) left = 8

  const topSpace = rect.top - 8
  const bottomSpace = viewport.height - 8 - rect.bottom
  let top: number
  if (preferredSide === 'top') {
    // 优先向上，浮窗底边紧贴锚点上边框（无缝隙）；放不下看下方，最后贴视口顶。
    if (size.height <= topSpace) {
      top = rect.top - size.height
    } else if (size.height <= bottomSpace) {
      top = rect.bottom
    } else {
      top = 8
    }
  } else {
    // 优先向下，浮窗顶边紧贴锚点下边框（无缝隙）；放不下看上方，最后贴视口底。
    if (size.height <= bottomSpace) {
      top = rect.bottom
    } else if (size.height <= topSpace) {
      top = rect.top - size.height
    } else {
      top = Math.max(8, viewport.height - 8 - size.height)
    }
  }

  return { left: Math.round(left), top: Math.round(top) }
}

/** 测量一个已插入 DOM（visibility 隐藏）的弹层尺寸。 */
export function measurePopup(popup: HTMLElement): { width: number; height: number } {
  // 布局尺寸（offsetWidth/Height）不受入场动画 transform 影响；
  // getBoundingClientRect 会量到 scale(0.98) 后的视觉尺寸（392x539 vs 400x550），
  // 导致定位差 11px、边框无法贴合。
  return { width: popup.offsetWidth, height: popup.offsetHeight }
}
