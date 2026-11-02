/**
 * 旧包名遗留的 localStorage 键 → 新键的一次性迁移。
 *
 * 0.4.0 把包名从 dsh-simplify-theme 改成 dsh-tide-theme，持久化键前缀随之
 * 变化。若不做迁移，升级用户的置顶工作区、折叠状态、用量统计和插件设置
 * 会全部「消失」——数据还在旧键里，只是新代码读不到，用户看到的是置顶和
 * 工作区分区凭空没了。
 *
 * 迁移规则（三条，保证不丢数据也不覆盖用户新设置）：
 *   1. 旧键不存在 → 什么都不做；
 *   2. 新键已存在 → 保留新值，只删旧键（新值是用户在 0.4.0 之后改的，更权威）；
 *   3. 新键不存在 → 把旧值搬到新键，再删旧键。
 *
 * 幂等：重复调用不会有副作用。
 */

/** 旧键 → 新键。新增持久化键时记得在这里登记。 */
export const LEGACY_KEY_MAP: ReadonlyArray<readonly [legacy: string, current: string]> = Object.freeze([
  ['dsh.simplify-theme.config', 'dsh.tide-theme.config'],
  ['dsh-simplify-theme.usage', 'dsh-tide-theme.usage'],
  ['dsh-simplify-theme.pinned-workspaces', 'dsh-tide-theme.pinned-workspaces'],
  ['dsh-simplify-theme.workspaces-expanded', 'dsh-tide-theme.workspaces-expanded']
])

export interface MigrationResult {
  /** 实际搬运了值的键（旧→新）。 */
  readonly migrated: ReadonlyArray<string>
  /** 新键已存在、只清掉旧键的情况。 */
  readonly discarded: ReadonlyArray<string>
}

/**
 * 执行迁移。
 * @param storage 目标存储，默认取全局 localStorage；测试可注入替身。
 * @returns 迁移明细；无可用存储时返回空结果。
 */
export function migrateLegacyStorageKeys(storage?: Storage): MigrationResult {
  const store = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage)
  if (store === undefined) return { migrated: [], discarded: [] }

  const migrated: string[] = []
  const discarded: string[] = []

  for (const [legacy, current] of LEGACY_KEY_MAP) {
    let legacyValue: string | null
    try {
      legacyValue = store.getItem(legacy)
    } catch {
      continue
    }
    if (legacyValue === null) continue

    try {
      if (store.getItem(current) === null) {
        store.setItem(current, legacyValue)
        migrated.push(current)
      } else {
        discarded.push(legacy)
      }
      store.removeItem(legacy)
    } catch {
      // 存储不可写（隐私模式、配额满）时保留旧键，下次启动再试。
    }
  }

  return { migrated, discarded }
}
