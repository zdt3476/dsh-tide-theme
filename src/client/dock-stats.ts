/**
 * 底部 composer 栏平铺统计控件。
 *
 * 将原本隐藏在弹窗里的关键指标平铺展开在底部 dock 中央：
 * - 会话规模（如 `9 轮 · 126 步`）
 * - 上下文容量与占用（如 `121k / 500k (24%)`，支持警戒变色）
 * - 真实端到端 TPS（严格计入首字延迟与思考时间，不虚高）
 * - Prompt 缓存命中率（如 `缓存 99%`，支持绿色/中性/灰色分级）
 * - 最新一轮耗时（如 `4.2 秒`）
 *
 * 交互支持：
 * - 点击平铺条即可展开沉浸式结构化上下文与性能看板浮层（参考 PI-Desktop ContextUsageInspector）
 * - 悬停提供清晰 Tooltip 提示，按 Escape 或点击外部区域自动关闭浮层
 */

import type { DockShared } from './dock-shared'
import { useDismiss } from './dock-shared'
import { placePopup, measurePopup, type Placement } from './popup'
import { createPortal } from 'react-dom'
import {
  deriveComposerStats,
  formatCompactTokens,
  formatSimpleDuration,
  type SessionStatsProjection,
  type TokenUsageProjection,
  type ContextPressureProjection
} from './composer-stats'
import { useSimplifyConfig } from './plugin-config'

export interface DockStatsProps {
  useProjection?: (key: string) => unknown
}

export function createDockStats(shared: DockShared) {
  const { h, hooks } = shared

  return function DockStats(props: DockStatsProps) {
    const stats = props.useProjection?.('sessionStats') as SessionStatsProjection | undefined
    const usage = props.useProjection?.('tokenUsage') as TokenUsageProjection | undefined
    const pressure = props.useProjection?.('contextPressure') as ContextPressureProjection | undefined
    const breakdown = props.useProjection?.('contextBreakdown') as import('./composer-stats').ContextBreakdownProjection | undefined
    const [config] = useSimplifyConfig(hooks)

    const [open, setOpen] = hooks.useState(false)
    const [pos, setPos] = hooks.useState<Placement | null>(null)
    const triggerRef = hooks.useRef<HTMLButtonElement | null>(null)
    const popupRef = hooks.useRef<HTMLDivElement | null>(null)

    // 观察本轮最新耗时徽标（由 turn-duration.ts 挂在末轮操作行）
    // 约束在当前会话容器或 composer-seat 共同父级内，避免多分屏跨分屏读错徽标
    const [latestDuration, setLatestDuration] = hooks.useState<string | null>(null)
    hooks.useEffect(() => {
      const readDuration = () => {
        const trigger = triggerRef.current
        const seat = trigger?.closest('[data-composer-seat]')
        const sessionContainer = trigger?.closest('[data-session-id], [data-session-pane], [data-pane-id], .split-pane') ??
                                 seat?.parentElement ??
                                 seat ??
                                 document
        const badges = sessionContainer.querySelectorAll<HTMLElement>('[data-dsh-tide-duration]')
        const text = badges[badges.length - 1]?.textContent?.trim() || null
        setLatestDuration(text)
      }
      readDuration()
      const timer = window.setInterval(readDuration, 1000)
      return () => window.clearInterval(timer)
    }, [])

    const model = deriveComposerStats(stats, usage, pressure, undefined, breakdown)

    // 弹层水平居中于触发条；垂直方向浮窗边框紧贴触发条边框（无间隙）；
    // 顶部空间不足时改在触发栏下方弹出
    hooks.useEffect(() => {
      if (!open) {
        setPos(null)
        return
      }
      const trigger = triggerRef.current
      const popup = popupRef.current
      if (trigger === null || popup === null) return
      const rect = trigger.getBoundingClientRect()
      const size = measurePopup(popup)
      // 顶部空间不足以容纳浮层时（浮窗在底部区域，正常应向上弹出），
      // 向下弹出；两种方向都放不下时才退回视口顶部约束。
      const topSpace = rect.top - 8
      const bottomSpace = window.innerHeight - rect.bottom - 8
      const preferredSide = size.height <= topSpace ? 'top' : 'bottom'
      const computedPos = placePopup(
        { left: rect.left, right: rect.right, bottom: rect.bottom, top: rect.top },
        size,
        { width: window.innerWidth, height: window.innerHeight },
        'center',
        preferredSide
      )
      // 短视口边界约束：浮层顶部永远在视口可见范围之内
      setPos({
        left: Math.max(8, computedPos.left),
        top: Math.max(8, computedPos.top)
      })
    }, [open, stats, usage, pressure, breakdown])

    // 首次定位时浮窗可能还没完成展开（测量到展开前的过渡尺寸），
    // 用 ResizeObserver 在浮窗真实尺寸变化后二次校正，保证边框贴合。
    hooks.useEffect(() => {
      if (!open) return
      const popup = popupRef.current
      const trigger = triggerRef.current
      if (popup === null || trigger === undefined || trigger === null) return
      const reposition = () => {
        const rect = trigger.getBoundingClientRect()
        const size = measurePopup(popup)
        if (size.width === 0 || size.height === 0) return
        const topSpace = rect.top - 8
        const bottomSpace = window.innerHeight - rect.bottom - 8
        const preferredSide = size.height <= topSpace ? 'top' : 'bottom'
        const computedPos = placePopup(
          { left: rect.left, right: rect.right, bottom: rect.bottom, top: rect.top },
          size,
          { width: window.innerWidth, height: window.innerHeight },
          'center',
          preferredSide
        )
        setPos({
          left: Math.max(8, computedPos.left),
          top: Math.max(8, computedPos.top)
        })
      }
      const observer = new ResizeObserver(reposition)
      observer.observe(popup)
      return () => observer.disconnect()
    }, [open])

    hooks.useEffect(() => {
      if (!open) return
      const onResize = () => setOpen(false)
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }, [open])

    useDismiss(shared, () => setOpen(false), open)

    const items: unknown[] = []
    // 分隔线由相邻指标的边框绘制，避免空分隔元素干扰窄屏换行。

    // 效果图同款的竖排三行块：标签行（图标+标题）、数值行、进度条行。
    // 进度条只给有比例含义的块；trailing（频谱）挂在数值行右侧。
    // 统一 5 列等比排布，每列均为两行标准结构（上行：图标+标题；下行：读数+单位）。
    // 剔除任何外挂感的拟物元素（如音频柱、长虚线、行内毛毛虫进度条），与 DSH 原生风格高度统一。
    const block = (
      key: string,
      className: string,
      title: string,
      iconNode: unknown,
      value: unknown,
      extra: Record<string, string | undefined> = {}
    ) => h('span', { key, className: `dsh-tide-stat-item ${className}`, title, ...extra },
      h('span', { className: 'dsh-tide-stat-label' },
        h('span', { className: 'dsh-tide-hud-icon', 'aria-hidden': 'true' }, iconNode),
        h('span', { className: 'dsh-tide-stat-label-text' }, title)
      ),
      h('span', { className: 'dsh-tide-stat-item-main' },
        h('span', { className: 'dsh-tide-hud-val' }, value)
      )
    )

    // 原生 DSH 质感圆环进度指示器（14x14 SVG，直接作为图标呈现，克制、静默）
    const createCircleMeter = (percent: number, bucket: string) => {
      const p = Math.min(100, Math.max(0, percent))
      const circumference = 31.416 // 2 * Math.PI * 5
      const offset = circumference - (circumference * p) / 100
      return h('svg', {
        viewBox: '0 0 14 14',
        width: '13',
        height: '13',
        className: `dsh-tide-meter-ring is-${bucket}`,
        'aria-hidden': 'true'
      },
        h('circle', {
          cx: '7',
          cy: '7',
          r: '5',
          fill: 'none',
          stroke: 'var(--dsw-alias-border-l2)',
          strokeWidth: '1.6'
        }),
        h('circle', {
          cx: '7',
          cy: '7',
          r: '5',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: '1.6',
          strokeDasharray: '31.416',
          strokeDashoffset: String(offset),
          strokeLinecap: 'round',
          transform: 'rotate(-90 7 7)'
        })
      )
    }

    const iconUser = h('svg', { viewBox: '0 0 16 16', width: '12', height: '12', fill: 'currentColor' },
      h('path', { d: 'M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z' }))
    const iconBolt = h('svg', { viewBox: '0 0 16 16', width: '12', height: '12', fill: 'currentColor' },
      h('path', { d: 'M8.6 1.2L2.2 9.1h4.4l-1.2 5.7 6.4-8.2H7.4l1.2-5.4z' }))
    const iconClock = h('svg', { viewBox: '0 0 16 16', width: '12', height: '12', fill: 'none', stroke: 'currentColor', strokeWidth: '1.4' },
      h('circle', { cx: '8', cy: '8', r: '6' }),
      h('path', { d: 'M8 4.8V8l2.2 1.6' }))

    // 主读数与单位分层，保留原有文字顺序及数据口径。
    const number = (value: string | number) => h('strong', { key: 'number', className: 'dsh-tide-hud-number' }, String(value))
    const unit = (value: string) => h('span', { key: value, className: 'dsh-tide-hud-unit' }, value)

    // 1. 会话规模
    if (model.activity) {
      items.push(block(
        'activity', 'is-activity',
        '会话规模',
        iconUser, [number(model.activity.turns), unit(' 轮 '), number(model.activity.steps), unit(' 步')]
      ))
    }

    // 2. 上下文容量（采用原生 DSH 环形指示器 + 干净数值比率，摒弃粗糙的行内毛毛虫条）
    if (model.context) {
      const bucket = config.contextColorAlert ? model.context.bucket : 'good'
      items.push(block(
        'context', 'is-context', '上下文容量', createCircleMeter(model.context.usedPercent, bucket),
        [
          number(formatCompactTokens(model.context.usedTokens)),
          unit(` / ${formatCompactTokens(model.context.contextWindow)} `),
          h('span', { key: 'percent', className: 'dsh-tide-hud-percent', 'data-bucket': bucket }, `(${model.context.usedPercent}%)`)
        ],
        {
          'data-dsh-tide-pct': config.contextColorAlert ? model.context.bucket : undefined,
          'data-dsh-tide-pct-kind': 'context'
        }
      ))
    }

    // 3. 真实 TPS：平均 TPS（剔除仿音频播放器的伪频谱装饰，保持工程工具克制）
    if (model.tps) {
      items.push(block(
        'tps', 'is-tps', '平均 TPS', iconBolt, [number(model.tps.value), unit(' t/s')], { title: '平均 TPS（端到端平均，非实时瞬时采样）' }
      ))
    }

    // 4. Prompt 缓存命中率（采用原生 DSH 环形指示器）
    if (model.cache) {
      items.push(block(
        'cache', 'is-cache', '缓存命中', createCircleMeter(model.cache.percent, model.cache.bucket),
        [number(`${model.cache.percent}%`)],
        {
          'data-dsh-tide-pct': model.cache.bucket,
          'data-dsh-tide-pct-kind': 'cache'
        }
      ))
    }

    // 5. 耗时：可靠本轮来源标“本轮耗时”，回退累计值标“模型累计”，与前四列结构完全一致
    const hasReliableDuration = latestDuration !== null
    const durationText = latestDuration ?? model.duration?.label
    if (durationText) {
      const isTurn = hasReliableDuration
      items.push(block(
        'duration', 'is-duration',
        isTurn ? '本轮耗时' : '模型累计',
        iconClock,
        [number(durationText)],
        { title: isTurn ? '本轮总耗时' : '模型累计总耗时' }
      ))
    }

    // 无任何指标时不渲染任何托盘：宿主 composer 行本身已有稳定高度，
    // 硬塞骨架反而会在新会话态多出一个空壳（契约：「无投影不显示空托盘」）。
    if (items.length === 0) return null

    // 构建展开的看板浮层内容
    const popoverNode = open ? h('div', {
      ref: popupRef,
      role: 'dialog',
      'aria-modal': 'false',
      'aria-label': '会话用量与性能看板',
      className: 'dsh-tide-stats-popover',
      'data-dsh-tide-stats-popover': '',
      'data-dsh-tide-portal-root': '',
      style: pos ? { position: 'fixed', left: `${pos.left}px`, top: `${pos.top}px` } : { visibility: 'hidden' }
    },
      // 头部
      h('div', { className: 'dsh-tide-stats-popover-head' },
        h('span', { className: 'dsh-tide-stats-popover-title' }, '会话用量与性能看板'),
        model.context ? h('span', {
          className: 'dsh-tide-stats-popover-badge',
          'data-bucket': model.context.bucket
        }, `${model.context.usedPercent}% 已用`) : null
      ),

      // 1. 上下文容量进度条
      model.context ? h('div', { className: 'dsh-tide-stats-section' },
        h('div', { className: 'dsh-tide-stats-progress-header' },
          h('span', {}, '上下文容量占用'),
          h('strong', {}, `${formatCompactTokens(model.context.usedTokens)} / ${formatCompactTokens(model.context.contextWindow)}`)
        ),
        h('div', { className: 'dsh-tide-stats-progress-track' },
          model.context.breakdown && model.context.breakdown.totalTokens > 0 ? [
            h('div', {
              key: 'seg-sys',
              className: 'dsh-tide-stats-progress-fill is-segment is-system',
              title: `系统提示词: ${model.context.breakdown.systemTokens.toLocaleString()} tokens`,
              style: { width: `${Math.min(100, (model.context.breakdown.systemTokens / model.context.contextWindow) * 100)}%` }
            }),
            h('div', {
              key: 'seg-tools',
              className: 'dsh-tide-stats-progress-fill is-segment is-tools',
              title: `工具定义: ${model.context.breakdown.toolsTokens.toLocaleString()} tokens`,
              style: { width: `${Math.min(100, (model.context.breakdown.toolsTokens / model.context.contextWindow) * 100)}%` }
            }),
            h('div', {
              key: 'seg-messages',
              className: 'dsh-tide-stats-progress-fill is-segment is-messages',
              title: `对话与压缩历史: ${model.context.breakdown.messageTokens.toLocaleString()} tokens`,
              style: { width: `${Math.min(100, (model.context.breakdown.messageTokens / model.context.contextWindow) * 100)}%` }
            })
          ] : h('div', {
            className: 'dsh-tide-stats-progress-fill',
            'data-bucket': model.context.bucket,
            style: { width: `${Math.min(100, Math.max(0, model.context.usedPercent))}%` }
          })
        ),
        model.context.breakdown && model.context.breakdown.totalTokens > 0 ? h('div', { className: 'dsh-tide-stats-breakdown-legend' },
          h('span', { className: 'dsh-tide-legend-chip is-system' }, `系统 ${formatCompactTokens(model.context.breakdown.systemTokens)}`),
          h('span', { className: 'dsh-tide-legend-chip is-tools' }, `工具 ${formatCompactTokens(model.context.breakdown.toolsTokens)}`),
          h('span', { className: 'dsh-tide-legend-chip is-messages' }, `消息 ${formatCompactTokens(model.context.breakdown.messageTokens)}`)
        ) : null,
        h('div', { className: 'dsh-tide-stats-progress-footer' },
          h('span', {}, `剩余空间: ${model.context.remainingTokens.toLocaleString()} tokens`),
          h('span', {}, `上限: ${model.context.contextWindow.toLocaleString()}`)
        )
      ) : null,

      // 2. 核心性能指标卡片 (2x2)
      h('div', { className: 'dsh-tide-stats-grid' },
        h('div', { className: 'dsh-tide-stats-card' },
          h('div', { className: 'dsh-tide-stats-card-head' },
            h('span', { className: 'dsh-tide-stats-card-k' }, '平均 TPS')
          ),
          h('strong', { className: 'dsh-tide-stats-card-v is-highlight' }, model.tps ? model.tps.label : '暂无数据'),
          h('span', { className: 'dsh-tide-stats-card-hint' }, model.tps?.rawDecodeTps ? `端到端平均，非实时瞬时（流式解码: ${model.tps.rawDecodeTps}）` : '端到端平均速率，非实时瞬时')
        ),
        h('div', { className: 'dsh-tide-stats-card' },
          h('span', { className: 'dsh-tide-stats-card-k' }, 'Prompt 缓存命中率'),
          h('strong', {
            className: 'dsh-tide-stats-card-v',
            'data-dsh-tide-pct': model.cache?.bucket ?? 'bad'
          }, model.cache ? `${model.cache.percent}%` : '暂无数据'),
          h('div', { className: 'dsh-tide-hud-mini-track' },
            h('div', {
              className: 'dsh-tide-hud-mini-fill is-cache',
              style: { width: `${model.cache?.percent ?? 0}%` }
            })
          ),
          h('span', { className: 'dsh-tide-stats-card-hint' }, `读取: ${model.tokensDetail ? formatCompactTokens(model.tokensDetail.cacheReadTokens) : '暂无数据'}`)
        ),
        h('div', { className: 'dsh-tide-stats-card' },
          h('span', { className: 'dsh-tide-stats-card-k' }, '平均首字延迟 (TTFT)'),
          h('strong', { className: 'dsh-tide-stats-card-v' }, model.tps?.avgTtft ?? '暂无数据'),
          h('span', { className: 'dsh-tide-stats-card-hint' }, '含网络/推理思考耗时')
        ),
        h('div', { className: 'dsh-tide-stats-card' },
          h('span', { className: 'dsh-tide-stats-card-k' }, latestDuration ? '单轮最新总耗时' : '模型累计总耗时'),
          h('strong', { className: 'dsh-tide-stats-card-v' }, latestDuration ?? (model.duration ? model.duration.label : '暂无数据')),
          h('span', { className: 'dsh-tide-stats-card-hint' }, latestDuration ? '包含排队与流式等待' : (stats?.turns ? `平均每轮 ${formatSimpleDuration((model.timingDetail?.llmMs ?? 0) / Math.max(1, stats.turns))}` : '模型总耗时'))
        )
      ),

      // 3. Token 明细列表
      model.tokensDetail ? h('div', { className: 'dsh-tide-stats-detail-list' },
        h('div', { className: 'dsh-tide-stats-detail-row' },
          h('span', {}, '未缓存输入 Tokens'),
          h('strong', {}, model.tokensDetail.uncachedInputTokens.toLocaleString())
        ),
        h('div', { className: 'dsh-tide-stats-detail-row' },
          h('span', {}, '缓存读取 Tokens (Cache Read)'),
          h('strong', {}, model.tokensDetail.cacheReadTokens.toLocaleString())
        ),
        model.tokensDetail.cacheWriteTokens > 0 ? h('div', { className: 'dsh-tide-stats-detail-row' },
          h('span', {}, '缓存写入 Tokens (Cache Write)'),
          h('strong', {}, model.tokensDetail.cacheWriteTokens.toLocaleString())
        ) : null,
        h('div', { className: 'dsh-tide-stats-detail-row' },
          h('span', {}, '模型输出 Tokens (含思考内容)'),
          h('strong', {}, model.tokensDetail.outputTokens.toLocaleString())
        ),
        h('div', { className: 'dsh-tide-stats-detail-row is-total' },
          h('span', {}, '累计消耗总 Tokens'),
          h('strong', {}, model.tokensDetail.totalTokens.toLocaleString())
        )
      ) : null,

      // 4. 会话活动与耗时拆解
      h('div', { className: 'dsh-tide-stats-footer' },
        model.activity ? h('div', {}, `会话累计活动: ${model.activity.turns} 轮 ${model.activity.steps} 步`) : null,
        model.timingDetail ? h('div', {}, `模型总耗时 ${formatSimpleDuration(model.timingDetail.llmMs)}${model.timingDetail.toolMs > 0 ? `、工具耗时 ${formatSimpleDuration(model.timingDetail.toolMs)}` : ''}`) : null
      )
    ) : null

    const popoverContent = popoverNode && typeof document !== 'undefined'
      ? createPortal(popoverNode, document.body)
      : popoverNode

    return h('div', {
      className: 'dsh-tide-dock-center-container',
      'data-dsh-tide-dock-center': '',
      'data-dsh-tide-dock-root': ''
    },
      h('button', {
        ref: triggerRef,
        type: 'button',
        className: 'dsh-tide-dock-stats-trigger',
        'aria-haspopup': 'dialog',
        'aria-expanded': open,
        title: '点击展开会话用量与性能看板',
        onClick: () => setOpen(!open)
      }, ...items),
      popoverContent
    )
  }
}
