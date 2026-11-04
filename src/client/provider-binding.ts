/**
 * 供应商 ↔ 工作区绑定限制。
 *
 * 需求：某个供应商可以被限制为「只在指定工作区可用」，在其它工作区不可选。
 *
 * 数据模型刻意选择「白名单」而不是「黑名单」，理由是可读性与失效安全：
 *   - 没有出现在配置里的供应商 = 不受限，任何工作区都能用（新装/新增供应商不会被误伤）；
 *   - 出现在配置里的供应商 = 只允许列表内的工作区使用。
 * 因此空配置等价于「完全不启用该功能」，不需要额外的总开关。
 *
 * 这里的函数全部是纯函数，方便单测覆盖各种边界（脏数据、未知工作区、缺 id 等）。
 */

/** 单个供应商的可用范围。 */
export interface ProviderBinding {
  /** 允许使用该供应商的工作区 id 列表。空数组 = 该供应商在任何工作区都不可用。 */
  workspaces: string[]
}

/** 全部绑定关系：providerId → 绑定。不存在键 = 不受限。 */
export type ProviderBindings = Record<string, ProviderBinding>

export const BINDINGS_STORAGE_KEY = 'dsh.tide-theme.provider-bindings'

/**
 * 解析持久化的绑定配置。
 *
 * 容错原则：任何无法识别的结构都丢弃而不是抛错——配置损坏时宁可退化为
 * 「全部不受限」，也不能让整个插件因为一段坏 JSON 而崩溃。
 */
export function parseBindings(raw: string | null): ProviderBindings {
  if (raw === null || raw === '') return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

  const out: ProviderBindings = {}
  for (const [providerId, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (providerId === '') continue
    if (value === null || typeof value !== 'object' || Array.isArray(value)) continue
    const list = (value as { workspaces?: unknown }).workspaces
    if (!Array.isArray(list)) continue
    // 去重 + 只保留非空字符串：脏数据（数字、null、空串）直接跳过。
    const workspaces: string[] = []
    for (const item of list) {
      if (typeof item !== 'string') continue
      const id = item.trim()
      if (id === '' || workspaces.includes(id)) continue
      workspaces.push(id)
    }
    out[providerId] = { workspaces }
  }
  return out
}

export function serializeBindings(bindings: ProviderBindings): string {
  return JSON.stringify(bindings)
}

export function readBindings(): ProviderBindings {
  if (typeof localStorage === 'undefined') return {}
  try {
    return parseBindings(localStorage.getItem(BINDINGS_STORAGE_KEY))
  } catch {
    return {}
  }
}

/**
 * 保存绑定关系；传 null 表示彻底清除该功能的配置。
 * 存储失败显式抛错，与 plugin-config 保持一致（不伪装成功）。
 */
export function saveBindings(bindings: ProviderBindings): void {
  if (typeof localStorage === 'undefined') return
  const ids = Object.keys(bindings)
  try {
    if (ids.length === 0) localStorage.removeItem(BINDINGS_STORAGE_KEY)
    else localStorage.setItem(BINDINGS_STORAGE_KEY, serializeBindings(bindings))
  } catch (error) {
    console.error('[dsh-tide-theme] 无法保存供应商绑定配置:', error)
    throw error
  }
}

/**
 * 判断某供应商在给定工作区是否可用。
 *
 * 未被限制的供应商恒为 true。工作区未知（undefined）时按「不限制」放行：
 * 这种情况下我们无法判断用户在哪，贸然禁用会让整个选择器在新会话态直接变灰，
 * 属于过度拦截。真正的拦截发生在能确定工作区之后。
 */
export function isProviderAllowed(
  bindings: ProviderBindings,
  providerId: string,
  workspaceId: string | undefined
): boolean {
  const binding = bindings[providerId]
  if (binding === undefined) return true
  if (workspaceId === undefined) return true
  return binding.workspaces.includes(workspaceId)
}

/**
 * 判定「某供应商在给定工作区是否被禁用」的判定器。
 *
 * 返回 null 表示完全没有配置任何绑定，调用方可跳过一切限制逻辑。
 * 返回函数而不是 Set，是为了避免调用方把「集合里没有」误当成「被禁用」——
 * 未配置的供应商本来就不在集合里，但它必须放行。这是本项目踩过的真实 bug：
 * 早期版本用 Set.has 判断，导致所有未配置的供应商被整列置灰。
 */
export function blockedProviders(
  bindings: ProviderBindings,
  workspaceId: string | undefined
): ((providerId: string) => boolean) | null {
  if (Object.keys(bindings).length === 0) return null
  return (providerId: string) => !isProviderAllowed(bindings, providerId, workspaceId)
}

/**
 * 给定供应商的绑定是否与该工作区失配。
 * 用于「当前已选中的供应商被限制」这一情形的高亮提示。
 */
export function bindingViolated(
  bindings: ProviderBindings,
  providerId: string | undefined,
  workspaceId: string | undefined
): boolean {
  if (providerId === undefined) return false
  if (bindings[providerId] === undefined) return false
  if (workspaceId === undefined) return false
  return !isProviderAllowed(bindings, providerId, workspaceId)
}

/**
 * 由会话 id 反查它所属的工作区 id。
 *
 * 宿主的活动快照里「会话」不带 workspaceId，只有工作区侧持有 sessionIds，
 * 所以这里反向建索引。多个工作区同时包含同一会话属于异常数据，取第一个命中的
 * 工作区（快照顺序稳定，结果可复现），不做任意猜测。
 *
 * 子代理会话通常不在任何工作区的 sessionIds 里；此时返回它父会话所属工作区，
 * 避免子代理因为「查不到工作区」而绕过限制。
 */
export function resolveWorkspaceId(
  sessionId: string | undefined,
  workspaces: readonly { workspaceId: string; sessionIds: readonly string[] }[],
  parentOf?: (sessionId: string) => string | undefined
): string | undefined {
  if (sessionId === undefined || sessionId === '') return undefined

  const direct = findWorkspace(sessionId, workspaces)
  if (direct !== undefined) return direct

  // 向上追一层父会话即可：子代理的 parentId 指向真实的父会话。
  // 不递归过深是为了避免脏数据形成环导致死循环。
  const parent = parentOf?.(sessionId)
  if (parent === undefined || parent === sessionId) return undefined
  return findWorkspace(parent, workspaces)
}

function findWorkspace(
  sessionId: string,
  workspaces: readonly { workspaceId: string; sessionIds: readonly string[] }[]
): string | undefined {
  for (const workspace of workspaces) {
    if (workspace.sessionIds.includes(sessionId)) return workspace.workspaceId
  }
  return undefined
}

/**
 * 已见供应商缓存。
 *
 * 宿主的模型目录是**会话级**服务（`directoryFor(sessionId)`），设置页打开时
 * 完全可能一条会话都没有，此时无法加载目录。但用户此前只要在任何会话里
 * 打开过模型面板，那些供应商就是确定的真实数据。
 *
 * 因此这里把「见过的供应商」持久化下来，作为设置页的兜底数据源：
 * 实时加载优先，失败时回退到缓存，都不行才显示空态。
 */
export const KNOWN_PROVIDERS_KEY = 'dsh.tide-theme.known-providers'

export interface KnownProvider {
  id: string
  name: string
}

export function readKnownProviders(): KnownProvider[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(KNOWN_PROVIDERS_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const out: KnownProvider[] = []
    for (const item of parsed) {
      if (item === null || typeof item !== 'object') continue
      const { id, name } = item as { id?: unknown; name?: unknown }
      if (typeof id !== 'string' || id === '') continue
      if (out.some((entry) => entry.id === id)) continue
      out.push({ id, name: typeof name === 'string' && name !== '' ? name : id })
    }
    return out
  } catch {
    return []
  }
}

/** 记录一次目录加载结果；只增不减，避免某次临时失败把已有记录清空。 */
export function recordKnownProviders(providers: readonly KnownProvider[]): void {
  if (typeof localStorage === 'undefined' || providers.length === 0) return
  try {
    const merged = [...readKnownProviders()]
    for (const provider of providers) {
      if (provider.id === '') continue
      const at = merged.findIndex((entry) => entry.id === provider.id)
      if (at === -1) merged.push({ id: provider.id, name: provider.name })
      else merged[at] = { id: provider.id, name: provider.name }
    }
    localStorage.setItem(KNOWN_PROVIDERS_KEY, JSON.stringify(merged))
  } catch {
    // 写不进去不影响主流程：设置页会退化为实时加载结果。
  }
}
