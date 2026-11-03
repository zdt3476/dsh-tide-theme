/**
 * 回合内的子代理委派图（复刻 PI-Desktop 的 SubagentTopology）。
 *
 * 结构：左「主 Agent」卡片 → 连接线 → 右侧子代理节点列表（每个节点带状态角标、
 * 名称、模型、状态·耗时、摘要、步数）。
 *
 * 分组：同一回合里连续出现的委派算一批（一次扇出），中间插入了别的工具调用就
 * 另起一张图，避免把不相干的委派粘在一起。
 *
 * 数据来自会话列表快照；失败原因取工具行的错误输出；运行中的节点提供停止按钮。
 */

import { toDelegationNode, type DelegationNode, type SessionRow, type SessionRows } from './delegation-tree'
import { formatCost, getPriceIndex, lookupPrice, estimateCost, type TokenPrice } from './model-pricing'
import { loadSimplifyConfig, onSimplifyConfigChange } from './plugin-config'

/** token 数量的紧凑写法：1.2k / 3.4M，与宿主自身的展示口径一致。 */
function formatTokenCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0'
  if (value < 1000) return String(Math.round(value))
  if (value < 1_000_000) {
    const scaled = value / 1000
    return `${scaled >= 100 ? Math.round(scaled) : scaled.toFixed(1).replace(/\.0$/, '')}k`
  }
  const scaled = value / 1_000_000
  return `${scaled >= 100 ? Math.round(scaled) : scaled.toFixed(1).replace(/\.0$/, '')}M`
}

const TURN = '[data-chat-turn]'
const TOOL_ROW = '[data-tool]'
const NODE_KEY = '[data-chat-node-key]'
const HOST_ATTR = 'data-dsh-tide-delegations'
const SOURCE_ATTR = 'data-dsh-tide-delegation-source'
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const UUID_ONLY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isDelegationTool(name: string | null): boolean {
  return name !== null && (/(^|[_-])subagent([_-]|$)/i.test(name) || name === 'spawn_teammate')
}

/** 父会话 id 归一：宿主不同位置可能带或不带 `session-` 前缀。 */
function normalizeSessionId(id: string | undefined): string | undefined {
  return id === undefined ? undefined : id.replace(/^session-/, '')
}

function belongsToParent(row: SessionRow | undefined, parentId: string | undefined): boolean {
  if (row === undefined) return false
  if (parentId === undefined) return true
  return normalizeSessionId(row.parentId) === normalizeSessionId(parentId)
}

export function pickSubagentIds(text: string, rows: SessionRows, parentId: string | undefined): string[] {
  const ids: string[] = []
  for (const match of text.matchAll(UUID)) {
    const id = match[0].toLowerCase()
    const row = rows[id]
    // 与 matchSubagentId 共用同一套父会话归一规则：此前这里要求严格相等，
    // 一旦父 id 一侧带 session- 前缀，UUID 匹配就静默失效、退回文本猜测。
    if (row === undefined || row.origin !== 'subagent' || !belongsToParent(row, parentId)) continue
    if (!ids.includes(id)) ids.push(id)
  }
  return ids
}

/**
 * 匹配委派工具行对应的子代理：
 * 1. 显式 UUID 匹配（展开状态、提示词或测试环境携带）。
 * 2. 描述/标题匹配（折叠状态下宿主工具行显示的 description / title）。
 *
 * 刻意不做时序认领：折叠行文本通常只含「创建子智能体」这类泛化标题，
 * 盲目按顺序认领会把本回合的卡片错绑到后续回合的子代理上（甚至绑到
 * 因并发上限而失败的调用上）。匹配不到就宁缺毋滥，保持图文一致。
 */
export function matchSubagentId(
  rowText: string,
  rows: SessionRows,
  parentId: string | undefined,
  claimed: ReadonlySet<string>,
  candidateIds?: readonly string[],
  catalogEntries?: ReadonlyArray<{ id: string; label?: string }>
): string | undefined {
  // 父会话 id 归一比较（与 pickSubagentIds 共用同一套规则）。
  const matchesParent = (p: string | undefined) =>
    parentId === undefined || p === parentId || (p !== undefined && p.replace(/^session-/, '') === parentId.replace(/^session-/, ''))

  // 1. 显式 UUID 优先
  const explicit = pickSubagentIds(rowText, rows, parentId)
  for (const id of explicit) {
    if (!claimed.has(id)) return id
  }

  const candidates: Array<{ id: string; row: SessionRow }> = candidateIds !== undefined
    ? candidateIds
        .map((id) => ({ id, row: rows[id] }))
        .filter((c): c is { id: string; row: SessionRow } => c.row !== undefined && c.row.origin === 'subagent' && matchesParent(c.row.parentId))
    : Object.entries(rows)
        .filter((entry): entry is [string, SessionRow] => entry[1] !== undefined && entry[1].origin === 'subagent' && matchesParent(entry[1].parentId))
        .map(([id, row]) => ({ id, row }))

  // 2. 描述 / 标题匹配（支持 SessionRow.displayTitle、title 以及 subagentCatalog 原始 label）
  const labelById = new Map<string, string>()
  if (catalogEntries !== undefined) {
    for (const entry of catalogEntries) {
      if (typeof entry.label === 'string' && entry.label.length >= 2) {
        labelById.set(entry.id, entry.label)
      }
    }
  }

  // 用"最长命中优先"而不是"遍历顺序第一个命中"：子代理标题常常互为前缀
  // （Alpha / Alpha-2、Research / Research-2），按顺序取第一个会把卡片挂错人。
  let best: { id: string; score: number } | undefined
  const consider = (id: string, label: string | undefined) => {
    if (typeof label !== 'string' || label.length < 2) return
    if (!rowText.includes(label)) return
    // 整行就是该标题（去掉首尾空白）时优先级最高，其次是更长的标题。
    const exact = rowText.trim() === label.trim()
    const score = (exact ? 1_000_000 : 0) + label.length
    if (best === undefined || score > best.score) best = { id, score }
  }

  for (const { id, row } of candidates) {
    if (claimed.has(id)) continue
    consider(id, row.displayTitle ?? (row as { title?: string }).title ?? labelById.get(id))
    consider(id, labelById.get(id))
  }
  return best?.id
}

export function displayTitleOf(node: DelegationNode, index: number): string {
  return UUID_ONLY.test(node.title) ? `子代理 ${index + 1}` : node.title
}

export function formatDelegationDuration(ms: number, locale: (key: string) => string): string {
  const seconds = Math.round(ms / 100) / 10
  if (seconds < 60) return `${seconds}${locale('duration.s')}`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return rest === 0 ? `${minutes}${locale('duration.m')}` : `${minutes}${locale('duration.m')} ${rest}${locale('duration.s')}`
}

export type Abnormal = 'failed' | 'denied' | 'unknown' | null

export function errorReasonOf(row: Element | null, limit = 160): string | undefined {
  const text = row?.querySelector('[data-error]')?.textContent?.trim()
  if (text === undefined || text === '') return undefined
  const line = text.split(/\r?\n/).map((part) => part.trim()).find((part) => part !== '') ?? text
  return line.length > limit ? `${line.slice(0, limit - 1)}…` : line
}

/** 一次工具行 → 一个节点；行的 data-state 决定异常态。 */
export function delegationNodesFor(ids: readonly string[], abnormal: Abnormal, rows: SessionRows, now = Date.now()): DelegationNode[] {
  for (const id of ids) {
    const node = toDelegationNode(id, rows[id], now)
    if (node === null) continue
    if (abnormal === 'failed' || abnormal === 'denied') {
      return [{ ...node, status: abnormal }]
    }
    if (abnormal === 'unknown') {
      // 工具行未知 state 不要直接当成功；child 如果已知 running 则以 child 为主保留 running，若为 done 则转为 unknown
      return [{ ...node, status: node.status === 'done' ? 'unknown' : node.status }]
    }
    return [node]
  }
  return []
}

/** 一批委派的成员：节点 + 失败原因。 */
export interface BatchMember {
  node: DelegationNode
  reason?: string
}

export interface BatchCounts {
  total: number
  done: number
  running: number
  failed: number
  denied: number
  unknown: number
}

export function batchCounts(members: readonly BatchMember[]): BatchCounts {
  let done = 0
  let running = 0
  let failed = 0
  let denied = 0
  let unknown = 0
  for (const { node } of members) {
    if (node.status === 'running') running += 1
    else if (node.status === 'done') done += 1
    else if (node.status === 'failed') failed += 1
    else if (node.status === 'denied') denied += 1
    else unknown += 1
  }
  return { total: members.length, done, running, failed, denied, unknown }
}

export type RootState = 'running' | 'done' | 'failed' | 'denied' | 'mixed' | 'unknown'

export function aggregateBatchState(counts: BatchCounts): RootState {
  if (counts.running > 0) return 'running'
  if (counts.total === 0) return 'done'
  if (counts.done === counts.total) return 'done'
  if (counts.failed === counts.total) return 'failed'
  if (counts.denied === counts.total) return 'denied'
  if (counts.unknown === counts.total) return 'unknown'
  return 'mixed'
}

export interface DelegationPanelOptions {
  sessions: {
    getSnapshot: () => { byId: SessionRows }
    subscribe: (listener: () => void) => () => void
    refreshProjections?: (sessionId: string) => Promise<unknown> | void
  }
  currentSessionId: () => string | undefined
  locale: (key: string, params?: Record<string, string | number>) => string
  openSession: (sessionId: string) => void
  canCancel?: (sessionId: string) => boolean
  cancelSession?: (sessionId: string) => void
}

export interface DelegationPanelHandle {
  dispose: () => void
}

const SVG_NS = 'http://www.w3.org/2000/svg'
const STEP_PROCESS = '[data-step-process]'
/** 宿主使用相同的 data-chat-turn 值标记同一回合的多个兄弟节点。 */
function turnKeyOf(anchor: Element): string | Element {
  return anchor.closest(TURN)?.getAttribute('data-chat-turn') ?? anchor.closest(STEP_PROCESS) ?? anchor
}

/**
 * 按真实几何画连线：Orchestrator 枢纽底部 → 每条分支一条贝塞尔弧线 → 落到子代理卡片顶边。
 * 用测量到的像素坐标绘制，卡片换行、列数变化都不会错位。
 */
export function paintConnectors(stage: HTMLElement, hub: HTMLElement, agents: HTMLElement, svg: SVGSVGElement): void {
  const stageBox = stage.getBoundingClientRect()
  const hubBox = hub.getBoundingClientRect()
  svg.setAttribute('viewBox', `0 0 ${stageBox.width} ${stageBox.height}`)
  svg.setAttribute('width', String(stageBox.width))
  svg.setAttribute('height', String(stageBox.height))

  const nodes = [...agents.children]
    .filter((child): child is HTMLElement => child instanceof HTMLElement && !child.hasAttribute('data-dsh-tide-lines'))
  if (nodes.length === 0) return

  // 外侧分支从枢纽侧缘引出，内侧从底部引出，对齐参考图的柔和扇出曲线。
  const trunkX = hubBox.left - stageBox.left + hubBox.width / 2
  const trunkTop = hubBox.bottom - stageBox.top
  const targets = nodes.map((node) => {
    const rect = node.getBoundingClientRect()
    return {
      x: rect.left - stageBox.left + rect.width / 2,
      y: rect.top - stageBox.top
    }
  })
  // 卡片按响应式网格排布（单行、2列或4列）。为避免连线穿过上方卡片，
  // 连线优先且平滑连接首行所有卡片顶边，后续行卡片按分组在下方陈列；
  // 不绘制孤立无目标的悬空下探短棍。
  const topY = Math.min(...targets.map((target) => target.y))
  const firstRowTargets = targets.filter((target) => Math.abs(target.y - topY) <= 6)
  const hubLeft = hubBox.left - stageBox.left
  const hubRight = hubBox.right - stageBox.left
  const d: string[] = []

  for (const target of firstRowTargets) {
    const outside = target.x < hubLeft || target.x > hubRight
    const startX = outside ? (target.x < trunkX ? hubLeft : hubRight) : trunkX
    const startY = outside ? trunkTop - hubBox.height * 0.4 : trunkTop
    const controlY = startY + (target.y - startY) * 0.35
    d.push(`M ${startX} ${startY} C ${startX} ${controlY}, ${target.x} ${controlY}, ${target.x} ${target.y}`)
  }

  const path = svg.querySelector('path')
  if (path !== null) path.setAttribute('d', d.join(' '))
}

function icon(paths: string[], size: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.2')
  svg.setAttribute('aria-hidden', 'true')
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', d)
    svg.append(path)
  }
  return svg
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (cls !== undefined) node.className = cls
  return node
}

const ICON_TARGET = ['M8 1.5l6 3.5v7l-6 3.5-6-3.5v-7l6-3.5z', 'M8 1.5v7l6 3.5', 'M8 8.5l-6 3.5']
const ICON_BOT = ['M4 5.5h8a1.5 1.5 0 011.5 1.5v4A1.5 1.5 0 0112 12.5H4A1.5 1.5 0 012.5 11V7A1.5 1.5 0 014 5.5z', 'M8 3v2.5', 'M6 8.5h.01M10 8.5h.01']
const ICON_CODE = ['M5.5 4.5L2 8l3.5 3.5', 'M10.5 4.5L14 8l-3.5 3.5', 'M9 3.5l-2 9']
const ICON_RESEARCH = ['M7 2.5a4.5 4.5 0 102.8 8l3.5 3.5 1.2-1.2-3.5-3.5A4.5 4.5 0 007 2.5z']
const ICON_ANALYSIS = ['M3 13.5h10', 'M5 11.5v-3', 'M8 11.5v-6', 'M11 11.5v-4']
const ICON_WRITER = ['M3.5 3.5h9v10h-9z', 'M6 6.5h4', 'M6 9h4']

export function classifyAgentTheme(title: string): 'cyan' | 'purple' | 'green' | 'orange' | 'blue' {
  const lower = title.toLowerCase()
  if (lower.includes('research') || lower.includes('search') || lower.includes('搜索') || lower.includes('调研')) return 'cyan'
  if (lower.includes('code') || lower.includes('debug') || lower.includes('代码') || lower.includes('实现') || lower.includes('修复')) return 'green'
  if (lower.includes('analy') || lower.includes('data') || lower.includes('分析') || lower.includes('排查') || lower.includes('指标')) return 'orange'
  return 'blue'
}

function iconForTheme(theme: 'cyan' | 'purple' | 'green' | 'orange' | 'blue'): string[] {
  switch (theme) {
    case 'cyan':
    case 'purple': return ICON_RESEARCH
    case 'green': return ICON_CODE
    case 'orange': return ICON_ANALYSIS
    case 'blue': return ICON_WRITER
  }
}

export function mountDelegationPanel(options: DelegationPanelOptions): DelegationPanelHandle | null {
  if (typeof document === 'undefined') return null

  const hosts = new Map<Element, HTMLElement>()
  const refreshed = new Set<string>()
  const expandedBatches = new WeakSet<HTMLElement>()
  const userToggled = new WeakSet<HTMLElement>()
  const painters = new Map<HTMLElement, () => void>()
  const claimedByRow = new WeakMap<HTMLElement, string>()
  // 价目表按需拉取：只在委派面板首次展开时请求，拿到后重绘补上金额；
  // 拿不到就保持只显示 token，并允许下次展开重试（冷却在 model-pricing 内部控制）。
  let prices: Map<string, TokenPrice> | null = null
  let pricesPending = false
  let ticker: number | undefined
  let frame = 0
  let debug = false
  try {
    debug = localStorage.getItem('dsh-tide-theme.debug') === '1'
  } catch {
    debug = false
  }

  const ensurePrices = (): void => {
    if (prices !== null || pricesPending) return
    pricesPending = true
    void getPriceIndex().then((index) => {
      pricesPending = false
      if (index === null) return // 失败不锁定：下次展开会再次尝试，退避由 model-pricing 控制
      prices = index
      schedule()
    })
  }

  const head = (text: string, cls: string): HTMLElement => {
    const span = el('span', cls)
    span.textContent = text
    return span
  }

  const nodeView = (member: BatchMember, index: number): HTMLElement => {
    const { node } = member
    const theme = classifyAgentTheme(node.title)
    const outcomeClass = node.status === 'running'
      ? 'outcome-running'
      : node.status === 'failed'
        ? 'outcome-failed'
        : node.status === 'denied'
          ? 'outcome-denied'
          : node.status === 'unknown'
            ? 'outcome-unknown'
            : 'outcome-completed'
    const row = el('div', `subagent-topology-node ${outcomeClass}`)
    row.setAttribute('role', 'listitem')
    row.setAttribute('data-agent-theme', theme)
    const actions = el('div', 'subagent-topology-node-actions')
    const button = el('button', 'subagent-topology-node-header')
    button.type = 'button'
    button.title = [displayTitleOf(node, index), node.model ?? '', member.reason ?? ''].filter(Boolean).join(' · ')
    button.addEventListener('click', () => options.openSession(node.id))

    const avatar = el('span', `subagent-topology-avatar is-${theme}`)
    avatar.setAttribute('aria-hidden', 'true')
    avatar.append(icon(iconForTheme(theme), 15))

    // 卡片版式（对齐参考图）：顶行「方形图标 + 状态芯片」两端对齐，标题独占一行拿到完整宽度，
    // 其下依次是模型徽标与任务 Checklist。
    const stateKey = `delegation.state.${node.status}`
    const localizedState = options.locale(stateKey)
    const stateText = localizedState !== stateKey
      ? localizedState
      : (node.status === 'running'
          ? 'Running'
          : node.status === 'failed'
            ? 'Failed'
            : node.status === 'denied'
              ? 'Denied'
              : node.status === 'unknown'
                ? 'Unknown'
                : 'Done')
    const duration = node.durationMs === undefined ? '' : ` · ${formatDelegationDuration(node.durationMs, options.locale)}`
    const statusBadge = el('span', 'subagent-topology-status-badge')
    statusBadge.append(head(`✦ ${stateText}${duration}`, 'subagent-topology-node-status'))

    const topRow = el('span', 'subagent-topology-node-top')
    topRow.append(avatar, statusBadge)

    const copy = el('span', 'subagent-topology-node-copy')
    copy.append(topRow, head(displayTitleOf(node, index), 'subagent-topology-node-title'))

    const hasModel = typeof node.model === 'string' && node.model.trim() !== ''
    const hasEffort = typeof node.effort === 'string' && node.effort.trim() !== ''
    if (hasModel || hasEffort) {
      const model = el('span', 'subagent-topology-node-model')
      model.title = [hasModel ? node.model : '', hasEffort ? node.effort : ''].filter(Boolean).join(' · ')
      if (hasModel && node.model !== undefined) model.append(head(node.model, 'subagent-topology-node-model-name'))
      if (hasEffort && node.effort !== undefined) model.append(head(` ${node.effort}`, 'subagent-topology-node-thinking'))
      copy.append(model)
    }

    // 运行数据与结果：步数为真实执行步数，失败原因额外警示；不伪造已完成清单勾选。
    const checklist = el('div', 'subagent-topology-checklist')
    if (node.steps !== undefined) {
      const stepItem = el('div', 'subagent-checklist-item')
      const stepIndicator = icon(['M2.5 5h11', 'M2.5 8h7', 'M2.5 11h9'], 10)
      stepIndicator.setAttribute('aria-hidden', 'true')
      const stepRaw = options.locale('delegation.steps', { count: node.steps })
      const stepText = typeof stepRaw === 'function' ? (stepRaw as Function)({ count: node.steps }) : String(stepRaw)
      stepItem.append(stepIndicator, head(stepText, 'subagent-topology-node-steps'))
      checklist.append(stepItem)
    }
    // token 用量：四桶之和（与宿主的 tokens.total 同口径）。有价目时才追加预估金额，
    // 查不到价就不显示金额，避免给出错误数字。
    if (node.usage !== undefined) {
      const usageItem = el('div', 'subagent-checklist-item is-usage')
      const usageIndicator = icon(['M2 8h2', 'M6 5v6', 'M10 3v10', 'M14 6v4'], 10)
      usageIndicator.setAttribute('aria-hidden', 'true')
      const usageText = `${formatTokenCount(node.usage.totalTokens)} tokens`
      const price = lookupPrice(prices ?? new Map(), node.model ?? '')
      const cost = estimateCost(price, node.usage)
      const usageNode = head(usageText, 'subagent-topology-node-usage')
      usageNode.title = [
        `未命中缓存输入 ${node.usage.uncachedInputTokens.toLocaleString()}`,
        `缓存读 ${node.usage.cacheReadTokens.toLocaleString()}`,
        `缓存写 ${node.usage.cacheWriteTokens.toLocaleString()}`,
        `输出 ${node.usage.outputTokens.toLocaleString()}`
      ].join('\n')
      usageItem.append(usageIndicator, usageNode)
      // formatCost 对 0 和极小值返回空串：免费模型不为它渲染一个「$0」色块。
      const costText = cost === undefined ? '' : formatCost(cost)
      if (costText !== '') {
        const costNode = head(costText, 'subagent-topology-node-cost')
        costNode.title = `按 OpenRouter 公开单价估算：${costText}（仅供参考，不含分时优惠）`
        usageItem.append(costNode)
      }
      checklist.append(usageItem)
    }
    if (member.reason !== undefined) {
      const failItem = el('div', 'subagent-checklist-item is-error')
      const cross = el('span', 'subagent-check-icon is-error')
      cross.setAttribute('aria-hidden', 'true')
      cross.textContent = '✖'
      failItem.append(cross, head(member.reason, 'subagent-topology-node-summary'))
      checklist.append(failItem)
    }
    if (checklist.children.length > 0) copy.append(checklist)

    button.append(copy)
    actions.append(button)
    if (node.status === 'running' && options.cancelSession !== undefined && options.canCancel?.(node.id) === true) {
      const stop = el('button', 'subagent-stop-button')
      stop.type = 'button'
      stop.textContent = options.locale('delegation.stopLabel')
      stop.title = options.locale('delegation.stop')
      stop.addEventListener('click', (event) => {
        event.stopPropagation()
        options.cancelSession?.(node.id)
      })
      actions.append(stop)
    }
    row.append(actions)
    return row
  }

  const batchView = (members: BatchMember[], index: number, host: HTMLElement): HTMLElement => {
    const section = el('section', 'subagent-topology')
    section.setAttribute('aria-label', options.locale('delegation.title'))
    const counts = batchCounts(members)

    // 默认只留一行摘要：折叠时仍能看到「这次回复委派了几批、结果如何」。
    const summary = el('button', 'subagent-topology-summary')
    summary.type = 'button'
    const summaryIcon = el('span', 'subagent-topology-summary-icon')
    summaryIcon.setAttribute('aria-hidden', 'true')
    summaryIcon.append(icon(ICON_TARGET, 13))
    const summaryLabel = head(options.locale('delegation.batch', { index }), 'subagent-topology-summary-label')
    const summaryCounts = el('span', 'subagent-topology-summary-counts')
    // 单数单独成句：英文 "1 subagents" 是明显的语法错误，中文也缺"1 个子代理"的读法。
    // 若宿主字典尚未提供单数键，退回普通复数键（而不是退化成裸数字）。
    const singularKey = 'delegation.agentsOne'
    const pluralKey = 'delegation.agents'
    const wanted = counts.total === 1 ? singularKey : pluralKey
    let phrase = options.locale(wanted, { count: counts.total })
    if (phrase === wanted) phrase = options.locale(pluralKey, { count: counts.total })
    if (phrase === pluralKey) phrase = String(counts.total)
    const parts = [phrase]
    if (counts.done > 0) parts.push(`${counts.done} ${options.locale('delegation.state.done')}`)
    if (counts.running > 0) parts.push(`${counts.running} ${options.locale('delegation.state.running')}`)
    if (counts.unknown > 0) parts.push(`${counts.unknown} ${options.locale('delegation.state.unknown')}`)
    summaryCounts.textContent = parts.join(' · ')
    if (counts.failed > 0) {
      const alert = el('span', 'subagent-topology-summary-alert')
      alert.textContent = ` · ${counts.failed} ${options.locale('delegation.state.failed')}`
      summaryCounts.append(alert)
    }
    if (counts.denied > 0) {
      const denied = el('span', 'subagent-topology-summary-alert')
      denied.textContent = ` · ${counts.denied} ${options.locale('delegation.state.denied')}`
      summaryCounts.append(denied)
    }
    const chevron = el('span', 'subagent-topology-summary-chevron')
    chevron.setAttribute('aria-hidden', 'true')
    chevron.append(icon(['M4.5 6.5L8 10l3.5-3.5'], 13))
    summary.append(summaryIcon, summaryLabel, summaryCounts, chevron)

    const detail = el('div', 'subagent-topology-detail')
    const stage = el('div', 'subagent-topology-stage')
    const root = el('div', 'subagent-topology-root')

    const rootIcon = el('span', 'subagent-topology-root-icon')
    rootIcon.setAttribute('aria-hidden', 'true')
    rootIcon.append(icon(ICON_TARGET, 18))

    const copy = el('span', 'subagent-topology-root-copy')
    const rootTitleRow = el('div', 'subagent-root-title-row')
    const rootTitle = head(options.locale('delegation.agent') || 'Orchestrator', '')
    rootTitle.setAttribute('data-dsh-tide-root-title', '')
    const activeChip = el('span', 'subagent-active-chip')
    activeChip.dataset.running = String(counts.running > 0)
    const rootState = aggregateBatchState(counts)
    activeChip.dataset.state = rootState
    const stateKey = `delegation.state.${rootState}`
    const localizedState = options.locale(stateKey)
    const stateText = localizedState !== stateKey
      ? localizedState
      : (rootState === 'mixed'
          ? 'Mixed'
          : rootState === 'unknown'
            ? 'Unknown'
            : rootState)
    activeChip.textContent = `✦ ${stateText}`
    rootTitleRow.append(rootTitle, activeChip)

    const detailText = el('span', 'subagent-root-sub')
    detailText.textContent = options.locale('delegation.coordinating', { count: members.length }) || 'Plans · Delegates · Synthesizes'
    copy.append(rootTitleRow, detailText)
    root.append(rootIcon, copy)

    const agents = el('div', 'subagent-topology-agents')
    agents.setAttribute('role', 'list')
    // 网格列数由真实成员数决定（1/2/3/4 列），否则单个子代理会被塞进
    // 固定 4 列的网格里、只占 1/4 宽度，看起来像缺了三张卡。
    agents.dataset.count = String(Math.min(4, Math.max(1, members.length)))
    members.forEach((member, memberIndex) => agents.append(nodeView(member, memberIndex)))
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('data-dsh-tide-lines', '')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('class', 'subagent-topology-lines')
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('fill', 'none')
    svg.append(path)
    stage.append(svg, root, agents)
    detail.append(stage)

    // 连线全部由 paintConnectors 按真实几何绘制；展开后才可测量，隐藏时跳过。
    const repaint = () => {
      if (detail.offsetParent === null) return
      paintConnectors(stage, root, agents, svg)
    }
    painters.set(host, repaint)

    const apply = (open: boolean) => {
      section.classList.toggle('is-collapsed', !open)
      summary.setAttribute('aria-expanded', String(open))
      summary.title = options.locale(open ? 'delegation.collapse' : 'delegation.expand')
      if (open) {
        // 价目只在真正展开后才拉取：折叠状态下用户看不到金额，没必要为它花
        // 800KB 带宽和 JSON 解析。失败时允许下次展开重试（冷却由 model-pricing 控制）。
        ensurePrices()
        window.requestAnimationFrame(repaint)
      }
    }
    const initialOpen = userToggled.has(host)
      ? expandedBatches.has(host)
      : (expandedBatches.has(host) || loadSimplifyConfig().delegationExpandedDefault)
    apply(initialOpen)
    summary.addEventListener('click', () => {
      userToggled.add(host)
      const open = section.classList.contains('is-collapsed')
      if (open) expandedBatches.add(host)
      else expandedBatches.delete(host)
      apply(open)
    })

    section.append(summary, detail)
    return section
  }

  const sync = () => {
    frame = 0
    const config = loadSimplifyConfig()
    if (!config.delegationPanel) {
      for (const [anchor, host] of hosts) {
        host.remove()
        painters.delete(host)
        hosts.delete(anchor)
      }
      for (const row of document.querySelectorAll(`[${SOURCE_ATTR}]`)) {
        row.removeAttribute(SOURCE_ATTR)
      }
      return
    }

    const parentId = options.currentSessionId()
    const snapshot = options.sessions.getSnapshot() as {
      byId?: SessionRows
      projectionsBySession?: Record<string, { values?: { subagentCatalog?: Array<{ id: string; label?: string }> } }>
    }
    const rows = snapshot.byId ?? (snapshot as unknown as SessionRows)
    const now = Date.now()
    const live = new Set<Element>()
    const pending: Array<{ anchor: Element; members: BatchMember[] }> = []
    let running = false
    let rowCount = 0

    // 计算当前父会话的子代理有序列表（优先用目录时序）
    const catalogEntries = snapshot.projectionsBySession?.[parentId ?? '']?.values?.subagentCatalog
      ?? (parentId ? snapshot.projectionsBySession?.[parentId.replace(/^session-/, '')]?.values?.subagentCatalog : undefined)
    const catalogIds = (catalogEntries ?? []).map((e) => e.id)
    const matchesParent = (p: string | undefined) =>
      parentId === undefined || p === parentId || (p !== undefined && p.replace(/^session-/, '') === parentId.replace(/^session-/, ''))
    const otherIds = Object.keys(rows).filter((id) => {
      const r = rows[id]
      if (r === undefined || r.origin !== 'subagent') return false
      if (!matchesParent(r.parentId)) return false
      return !catalogIds.includes(id)
    })
    const candidateIds = [...catalogIds, ...otherIds]
    const claimed = new Set<string>()

    // 过滤掉嵌套在其他 [data-chat-turn] 内部的元素，避免外层容器与内层节点重复扫描相同工具行
    const allTurnElements = [...document.querySelectorAll<HTMLElement>(TURN)]
    const turnElements = allTurnElements.filter((el) => el.parentElement?.closest(TURN) === null)

    for (const turn of turnElements) {
      // 按聊天节点顺序切批：连续委派算一批，中间出现别的工具调用就断开。
      const groups: Array<{ anchor: Element; rows: HTMLElement[] }> = []
      let current: { anchor: Element; rows: HTMLElement[] } | null = null
      const nodes = turn.matches(NODE_KEY)
        ? [turn as HTMLElement]
        : [...turn.querySelectorAll<HTMLElement>(NODE_KEY)]
      for (const node of nodes) {
        const own = [...node.querySelectorAll<HTMLElement>(TOOL_ROW)].filter((row) => isDelegationTool(row.getAttribute('data-tool')))
        const other = node.querySelectorAll(TOOL_ROW).length > own.length
        if (own.length === 0) {
          if (other && current !== null) {
            groups.push(current)
            current = null
          }
          continue
        }
        current ??= { anchor: node, rows: [] }
        current.rows.push(...own)
      }
      if (current !== null) groups.push(current)

      for (const group of groups) {
        const members: BatchMember[] = []
        const groupRows: HTMLElement[] = []
        const seen = new Set<string>()
        for (const row of group.rows) {
          rowCount += 1
          let matchedId = claimedByRow.get(row)
          if (matchedId === undefined || !candidateIds.includes(matchedId)) {
            matchedId = matchSubagentId(row.textContent ?? '', rows, parentId, claimed, candidateIds, catalogEntries)
            if (matchedId !== undefined) {
              claimedByRow.set(row, matchedId)
            }
          }
          const ids = matchedId !== undefined ? [matchedId] : []
          if (matchedId !== undefined) claimed.add(matchedId)
          const rawState = row.getAttribute('data-state')
          const abnormal: Abnormal = rawState === 'error'
            ? 'failed'
            : rawState === 'denied'
              ? 'denied'
              : (rawState === 'ok' || rawState === 'done' || rawState === 'success' || rawState === 'running' || rawState === 'pending' || rawState === null)
                ? null
                : 'unknown'
          const nodes = delegationNodesFor(ids, abnormal, rows, now)
          // 同一次扇出里同一个子代理只展示一次。
          if (nodes.length === 0 || seen.has(nodes[0].id)) continue
          seen.add(nodes[0].id)
          members.push({ node: nodes[0], ...(abnormal === null ? {} : { reason: errorReasonOf(row) }) })
          groupRows.push(row)
          if (nodes[0].status === 'running') running = true
        }
        if (members.length === 0) continue
        for (const row of groupRows) {
          row.setAttribute(SOURCE_ATTR, '')
          live.add(row)
        }
        // 同批内按子代理目录/创建顺序排列，而不是按工具行在 DOM 里出现的偶然顺序；
        // 并行派发时若按 DOM 顺序，卡片很容易与真实子代理错位。
        const orderOf = (id: string): number => {
          const at = candidateIds.indexOf(id)
          return at === -1 ? Number.MAX_SAFE_INTEGER : at
        }
        members.sort((a, b) => orderOf(a.node.id) - orderOf(b.node.id))
        pending.push({ anchor: group.anchor, members })
      }
    }

    // 批次按文档顺序连续递增编号，跨回合保持全局时序递增（第 1 次委派、第 2 次委派…）
    pending.sort((a, b) => (a.anchor.compareDocumentPosition(b.anchor) & 4) !== 0 ? -1 : 1)
    const placed = new Set<Element>()
    let batchIndex = 0
    // 同一折叠组里的多批委派共用一个挂载点，记录上一张图以保持批次顺序。
    const tailOf = new Map<Element, HTMLElement>()
    for (const { anchor, members } of pending) {
      if (placed.has(anchor)) continue
      placed.add(anchor)
      batchIndex += 1
      const index = batchIndex
      // 挂在工作步骤折叠区之外的同一层，折叠工具细节时摘要仍可见。
      const holder = anchor.closest(STEP_PROCESS) ?? anchor
      const parent = holder.parentElement
      if (parent === null) continue
      let host = hosts.get(anchor)
      if (host === undefined) {
        host = el('div', 'subagent-topology-host')
        hosts.set(anchor, host)
      }
      const previous = tailOf.get(holder) ?? holder
      if (host.parentElement !== parent || host.previousElementSibling !== previous) {
        parent.insertBefore(host, previous.nextSibling)
      }
      tailOf.set(holder, host)
      // signature 决定何时重建节点内容：除批次与节点数据外，还要带上「价目是否已就绪」，
      // 否则价目晚于首帧到达时金额不会补渲染（节点数据本身没变，签名相同会被跳过）。
      const signature = JSON.stringify([index, prices === null ? 0 : 1, members.map(({ node, reason }) => [{ ...node, durationMs: Math.round((node.durationMs ?? 0) / 1000) }, reason])])
      if (host.dataset.signature !== signature) {
        host.dataset.signature = signature
        host.replaceChildren(batchView(members, index, host))
      }
    }

    for (const [anchor, host] of hosts) {
      if (placed.has(anchor)) continue
      host.remove()
      painters.delete(host)
      hosts.delete(anchor)
    }

    for (const row of document.querySelectorAll(`[${SOURCE_ATTR}]`)) {
      if (!live.has(row)) row.removeAttribute(SOURCE_ATTR)
    }
    if (debug) console.info(`[dsh-tide-theme] 委派图: 工具行 ${rowCount} 条, 已匹配 ${live.size} 条, 会话 ${parentId ?? '未知'}`)

    if (running && ticker === undefined) ticker = window.setInterval(schedule, 1000)
    else if (!running && ticker !== undefined) {
      window.clearInterval(ticker)
      ticker = undefined
    }

    const missing = [...live].some((row) => {
      const ids = pickSubagentIds(row.textContent ?? '', rows, parentId)
      const node = ids[0] === undefined ? undefined : toDelegationNode(ids[0], rows[ids[0]], now)
      return node !== undefined && node !== null && node.steps === undefined && node.durationMs === undefined
    })
    if (missing && parentId !== undefined && !refreshed.has(parentId) && options.sessions.refreshProjections !== undefined) {
      refreshed.add(parentId)
      void Promise.resolve(options.sessions.refreshProjections(parentId)).catch(() => refreshed.delete(parentId))
    }
  }

  const schedule = () => {
    if (frame !== 0) return
    frame = window.requestAnimationFrame(() => {
      try {
        sync()
      } catch (error) {
        console.error('[dsh-tide-theme] delegation panel failed:', error)
      }
    })
  }

  const repaintAll = () => {
    for (const paint of painters.values()) {
      try {
        paint()
      } catch {
        // 节点已被移除时跳过
      }
    }
  }
  window.addEventListener('resize', repaintAll)

  const unsubscribe = options.sessions.subscribe(schedule)
  const unsubscribeConfig = onSimplifyConfigChange(schedule)
  const observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true })
  schedule()

  return {
    dispose: () => {
      unsubscribe()
      unsubscribeConfig()
      observer.disconnect()
      window.removeEventListener('resize', repaintAll)
      if (ticker !== undefined) window.clearInterval(ticker)
      if (frame !== 0) window.cancelAnimationFrame(frame)
      for (const host of document.querySelectorAll('.subagent-topology-host')) host.remove()
      for (const row of document.querySelectorAll(`[${SOURCE_ATTR}]`)) row.removeAttribute(SOURCE_ATTR)
    }
  }
}
