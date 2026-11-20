import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  DEFAULT_SIMPLIFY_CONFIG,
  loadSimplifyConfig,
  saveSimplifyConfig,
  resetSimplifyConfig,
  onSimplifyConfigChange,
  CONFIG_STORAGE_KEY
} from '../../src/client/plugin-config'

function setupMockEnvironment() {
  let store: Record<string, string> = {}
  const mockStorage: Storage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v) },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length }
  }

  vi.stubGlobal('localStorage', mockStorage)
  const target = new EventTarget()
  vi.stubGlobal('window', {
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target)
  })
}

describe('plugin-config', () => {
  beforeEach(() => {
    setupMockEnvironment()
    localStorage.clear()
  })

  it('缺省状态下返回全部默认配置', () => {
    const config = loadSimplifyConfig()
    expect(config).toEqual(DEFAULT_SIMPLIFY_CONFIG)
  })

  it('忽略已保存的置顶上限，并保留其他配置', () => {
    const legacy = { dockStats: false, sidebarPinnedLimit: 2, sidebarUnpinnedLimit: 3 }
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(legacy))

    const config = loadSimplifyConfig()
    expect(config).toEqual({ ...DEFAULT_SIMPLIFY_CONFIG, dockStats: false, sidebarUnpinnedLimit: 3 })

    const updated = saveSimplifyConfig({ delegationExpandedDefault: true })
    expect(updated).toEqual({ ...config, delegationExpandedDefault: true })
    expect(loadSimplifyConfig()).toEqual(updated)
    expect(JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY)!)).toEqual(updated)
  })

  it('监听配置变更事件', () => {
    const listener = vi.fn()
    const unsubscribe = onSimplifyConfigChange(listener)

    saveSimplifyConfig({ modelControl: false })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ modelControl: false, dockStats: true }))

    unsubscribe()
    saveSimplifyConfig({ modelControl: true })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('重置配置恢复全部默认项', () => {
    saveSimplifyConfig({ dockStats: false, themeOverrides: false })
    expect(loadSimplifyConfig().dockStats).toBe(false)

    const reset = resetSimplifyConfig()
    expect(reset).toEqual(DEFAULT_SIMPLIFY_CONFIG)
    expect(loadSimplifyConfig()).toEqual(DEFAULT_SIMPLIFY_CONFIG)
  })

  it('localStorage 中含有畸变或非法类型时优雅兜底回退', () => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ dockStats: 'not-a-boolean', unknownKey: 123 }))
    const config = loadSimplifyConfig()
    expect(config.dockStats).toBe(DEFAULT_SIMPLIFY_CONFIG.dockStats)
  })
})
