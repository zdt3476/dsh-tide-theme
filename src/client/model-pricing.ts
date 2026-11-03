/**
 * 模型定价：从 OpenRouter 公开模型目录拉取单价，按用量估算花费。
 *
 * 设计约束：
 * - OpenRouter 的价格是「每 token 的美元单价」，字符串形式（如 "0.0000003"）。
 * - 定价只用于「预估」，不可用于计费；匹配不到就明确返回 undefined，
 *   宁可不显示也不猜一个数字出来。
 * - 不处理 OpenRouter 的 `overrides`（按时段/阈值浮动定价），一律用基础价。
 *   这类模型在部分时段可能更便宜，所以预估值偏保守（偏高），不会漏算。
 * - 目录体积约 800KB，只在委派面板首次展开时拉一次，并做进程内缓存。
 */

/** 每 token 的美元单价，已解析为数字。 */
export interface TokenPrice {
  /** 未命中缓存的输入 */
  prompt: number
  /** 输出 */
  completion: number
  /** 命中缓存的输入读取 */
  cacheRead?: number
  /** 写入缓存 */
  cacheWrite?: number
}

/** OpenRouter 模型条目的最小形状。 */
interface OpenRouterModel {
  id?: unknown
  name?: unknown
  pricing?: Record<string, unknown>
}

const ENDPOINT = 'https://openrouter.ai/api/v1/models'
/** 失败后隔一段时间才重试，避免面板反复展开时打爆接口。 */
const RETRY_AFTER_MS = 5 * 60 * 1000
/** 网络超时：定价是锦上添花，不能拖住面板。 */
const TIMEOUT_MS = 8000

interface CatalogState {
  prices: Map<string, TokenPrice> | null
  pending: Promise<Map<string, TokenPrice> | null> | null
  failedAt: number | null
}

const state: CatalogState = { prices: null, pending: null, failedAt: null }

function toPrice(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : undefined
  if (typeof value !== 'string' || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

/** OpenRouter 的 pricing 对象 → 归一化价格；缺 prompt 或 completion 视为无效。 */
export function normalizePrice(pricing: Record<string, unknown> | undefined): TokenPrice | undefined {
  if (pricing === undefined || pricing === null || typeof pricing !== 'object') return undefined
  const prompt = toPrice(pricing.prompt)
  const completion = toPrice(pricing.completion)
  if (prompt === undefined || completion === undefined) return undefined
  const cacheRead = toPrice(pricing.input_cache_read)
  const cacheWrite = toPrice(pricing.input_cache_write)
  return {
    prompt,
    completion,
    ...(cacheRead === undefined ? {} : { cacheRead }),
    ...(cacheWrite === undefined ? {} : { cacheWrite })
  }
}

/**
 * 模型名的归一化键：去掉供应商前缀、转小写、把 `.` 与 `_` 视同 `-`。
 * OpenRouter 用 `deepseek/deepseek-v4.1-flash`，宿主显示 `DeepSeek-V4.1-Flash`，
 * 归一化后两侧才能对上。
 */
export function priceKey(name: string): string {
  const trimmed = name.trim().toLowerCase()
  const slash = trimmed.lastIndexOf('/')
  const bare = slash >= 0 ? trimmed.slice(slash + 1) : trimmed
  return bare.replace(/[._\s]+/g, '-').replace(/-+/g, '-')
}

/** 从 OpenRouter 目录构建「裸模型名 → 价格」索引；同一裸名取第一条，保证确定性。 */
export function buildPriceIndex(models: readonly OpenRouterModel[]): Map<string, TokenPrice> {
  const index = new Map<string, TokenPrice>()
  for (const model of models) {
    if (typeof model?.id !== 'string') continue
    const price = normalizePrice(model.pricing)
    if (price === undefined) continue
    const key = priceKey(model.id)
    if (key === '' || index.has(key)) continue
    index.set(key, price)
  }
  return index
}

/**
 * 按归一化名查价。除精确匹配外，额外接受「目录名以查询名开头」的唯一候选，
 * 以覆盖 OpenRouter 带日期后缀（如 `-20241022`）的命名；出现多个候选则放弃。
 */
export function lookupPrice(index: Map<string, TokenPrice>, rawName: string): TokenPrice | undefined {
  const key = priceKey(rawName)
  if (key === '') return undefined
  const exact = index.get(key)
  if (exact !== undefined) return exact
  let found: TokenPrice | undefined
  for (const [candidate, price] of index) {
    if (!candidate.startsWith(`${key}-`)) continue
    if (found !== undefined) return undefined
    found = price
  }
  return found
}

/** 用量与单价 → 预估美元金额；单价缺失返回 undefined。 */
export function estimateCost(pricing: TokenPrice | undefined, usage: {
  uncachedInputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  outputTokens: number
} | undefined): number | undefined {
  if (pricing === undefined || usage === undefined) return undefined
  // 缓存读/写没有单独报价时，退回普通输入价（高估但不会漏算）。
  const cacheRead = pricing.cacheRead ?? pricing.prompt
  const cacheWrite = pricing.cacheWrite ?? pricing.prompt
  const cost =
    usage.uncachedInputTokens * pricing.prompt +
    usage.cacheReadTokens * cacheRead +
    usage.cacheWriteTokens * cacheWrite +
    usage.outputTokens * pricing.completion
  return Number.isFinite(cost) && cost >= 0 ? cost : undefined
}

/**
 * 金额展示。刻意不产出「$0」「$0.0000」这类噪声：
 * - 免费模型或四舍五入后仍为 0 → 返回空串，由调用方直接不渲染金额；
 * - 极小但非零 → 显示「<$0.0001」，表达「有花费但低于显示精度」。
 */
export function formatCost(usd: number): string {
  if (!Number.isFinite(usd) || usd < 0) return ''
  if (usd === 0) return ''
  if (usd < 0.0001) return '<$0.0001'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  if (usd < 1) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}

async function loadCatalog(): Promise<Map<string, TokenPrice> | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(ENDPOINT, { signal: controller.signal, headers: { accept: 'application/json' } })
    if (!response.ok) return null
    const payload = (await response.json()) as { data?: unknown }
    if (!Array.isArray(payload?.data)) return null
    return buildPriceIndex(payload.data as OpenRouterModel[])
  } catch {
    // 网络/解析失败都属于「这次拿不到」，由调用方决定是否重试，不抛给 UI。
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 取定价索引。并发调用共享同一个请求；失败后 RETRY_AFTER_MS 内不再重试。
 * 返回 null 表示当前拿不到（首次失败或仍在退避窗口内）。
 */
export function getPriceIndex(): Promise<Map<string, TokenPrice> | null> {
  if (state.prices !== null) return Promise.resolve(state.prices)
  if (state.pending !== null) return state.pending
  if (state.failedAt !== null && Date.now() - state.failedAt < RETRY_AFTER_MS) return Promise.resolve(null)
  state.pending = loadCatalog().then((index) => {
    state.pending = null
    if (index === null) state.failedAt = Date.now()
    else state.prices = index
    return index
  })
  return state.pending
}

/** 仅供测试：重置模块级缓存。 */
export function resetPricingCache(): void {
  state.prices = null
  state.pending = null
  state.failedAt = null
}
