import { describe, expect, it } from 'vitest'
import { SIMPLIFY_TOKENS } from '../../src/client/tokens'

type RGB = readonly [number, number, number]

function toRgb(hex: string): RGB {
  const value = hex.slice(1)
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)) as unknown as RGB
}

function mixOver(foreground: string, background: string, opacity: number): RGB {
  const fg = toRgb(foreground)
  const bg = toRgb(background)
  return [0, 1, 2].map((index) => fg[index] * opacity + bg[index] * (1 - opacity)) as unknown as RGB
}

function luminance(color: string | RGB): number {
  const channels = typeof color === 'string' ? toRgb(color) : color
  const linear = channels.map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

function contrastRatio(foreground: string, background: string | RGB): number {
  const fg = luminance(foreground)
  const bg = luminance(background)
  return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
}

describe('token layer', () => {
  const entries = Object.entries(SIMPLIFY_TOKENS)

  it('只覆盖 --dsw- 命名空间', () => {
    expect(entries.length).toBeGreaterThan(0)
    for (const [token] of entries) expect(token.startsWith('--dsw-')).toBe(true)
  })

  it('每个 token 都给出亮暗两个非空值', () => {
    for (const [token, value] of entries) {
      // 单个裸字符串在切换配色后会不可读，overrideTokens 也会直接抛错。
      expect(typeof value).toBe('object')
      expect(typeof value.light, token).toBe('string')
      expect(typeof value.dark, token).toBe('string')
      expect(value.light.trim(), token).not.toBe('')
      expect(value.dark.trim(), token).not.toBe('')
    }
  })

  it('语义文字在明暗表面上达到 WCAG AA 对比度', () => {
    const lightBase = SIMPLIFY_TOKENS['--dsw-alias-bg-base'].light
    const darkBase = SIMPLIFY_TOKENS['--dsw-alias-bg-base'].dark
    const lightSurface = SIMPLIFY_TOKENS['--dsw-alias-bg-layer-2'].light
    const darkSurface = SIMPLIFY_TOKENS['--dsw-alias-bg-layer-2'].dark
    const lightSidebar = SIMPLIFY_TOKENS['--dsw-specific-sidebar-fill'].light
    const darkSidebar = SIMPLIFY_TOKENS['--dsw-specific-sidebar-fill'].dark

    const checks = [
      ['浅色主文字', SIMPLIFY_TOKENS['--dsw-alias-label-primary'].light, lightBase],
      ['深色主文字', SIMPLIFY_TOKENS['--dsw-alias-label-primary'].dark, darkBase],
      ['浅色次文字', SIMPLIFY_TOKENS['--dsw-alias-label-secondary'].light, lightSurface],
      ['深色次文字', SIMPLIFY_TOKENS['--dsw-alias-label-secondary'].dark, darkSurface],
      ['浅色弱化文字', SIMPLIFY_TOKENS['--dsw-alias-label-dimmed'].light, lightBase],
      ['深色弱化文字', SIMPLIFY_TOKENS['--dsw-alias-label-dimmed'].dark, darkSurface],
      ['浅色成功文字', SIMPLIFY_TOKENS['--dsw-alias-state-success-label'].light, lightSurface],
      ['深色成功文字', SIMPLIFY_TOKENS['--dsw-alias-state-success-label'].dark, darkSurface],
      ['浅色失败文字', SIMPLIFY_TOKENS['--dsw-alias-state-error-label'].light, lightSurface],
      ['深色失败文字', SIMPLIFY_TOKENS['--dsw-alias-state-error-label'].dark, darkSurface],
      ['浅色警告文字', SIMPLIFY_TOKENS['--dsw-alias-state-warn-label'].light, lightSurface],
      ['深色警告文字', SIMPLIFY_TOKENS['--dsw-alias-state-warn-label'].dark, darkSurface],
      ['浅色侧栏说明', SIMPLIFY_TOKENS['--dsw-alias-label-tertiary'].light, lightSidebar],
      ['深色侧栏说明', SIMPLIFY_TOKENS['--dsw-alias-label-tertiary'].dark, darkSidebar],
      ['浅色主按钮白字', '#ffffff', SIMPLIFY_TOKENS['--dsw-alias-button-info-fill'].light],
      ['浅色主按钮悬停白字', '#ffffff', SIMPLIFY_TOKENS['--dsw-alias-button-info-hover'].light],
      ['深色主按钮白字', '#ffffff', SIMPLIFY_TOKENS['--dsw-alias-button-info-fill'].dark],
      ['深色主按钮悬停白字', '#ffffff', SIMPLIFY_TOKENS['--dsw-alias-button-info-hover'].dark]
    ] as const

    for (const [name, foreground, background] of checks) {
      expect(contrastRatio(foreground, background), name).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('状态芯片与三级面卡片保留 WCAG AA 对比度', () => {
    const lightSurface = SIMPLIFY_TOKENS['--dsw-alias-bg-layer-2'].light
    const darkSurface = SIMPLIFY_TOKENS['--dsw-alias-bg-layer-2'].dark
    const lightLayer3 = SIMPLIFY_TOKENS['--dsw-alias-bg-layer-3'].light
    const darkLayer3 = SIMPLIFY_TOKENS['--dsw-alias-bg-layer-3'].dark
    const checks = [
      ['浅色成功芯片', SIMPLIFY_TOKENS['--dsw-alias-state-success-label'].light, mixOver(SIMPLIFY_TOKENS['--dsw-alias-state-success-primary'].light, lightSurface, 0.1)],
      ['深色成功芯片', SIMPLIFY_TOKENS['--dsw-alias-state-success-label'].dark, mixOver(SIMPLIFY_TOKENS['--dsw-alias-state-success-primary'].dark, darkSurface, 0.16)],
      ['浅色失败芯片', SIMPLIFY_TOKENS['--dsw-alias-state-error-label'].light, mixOver(SIMPLIFY_TOKENS['--dsw-alias-state-error-primary'].light, lightSurface, 0.1)],
      ['深色失败芯片', SIMPLIFY_TOKENS['--dsw-alias-state-error-label'].dark, mixOver(SIMPLIFY_TOKENS['--dsw-alias-state-error-primary'].dark, darkSurface, 0.12)],
      ['浅色警告芯片', SIMPLIFY_TOKENS['--dsw-alias-state-warn-label'].light, mixOver(SIMPLIFY_TOKENS['--dsw-alias-state-warn-primary'].light, lightSurface, 0.1)],
      ['深色警告芯片', SIMPLIFY_TOKENS['--dsw-alias-state-warn-label'].dark, mixOver(SIMPLIFY_TOKENS['--dsw-alias-state-warn-primary'].dark, darkSurface, 0.12)],
      ['浅色中性芯片', SIMPLIFY_TOKENS['--dsw-alias-label-secondary'].light, mixOver('#0f172a', lightSurface, 0.055)],
      ['深色中性芯片', SIMPLIFY_TOKENS['--dsw-alias-label-secondary'].dark, mixOver('#ffffff', darkSurface, 0.065)],
      ['浅色三级面说明', SIMPLIFY_TOKENS['--dsw-alias-label-tertiary'].light, lightLayer3],
      ['深色三级面说明', SIMPLIFY_TOKENS['--dsw-alias-label-tertiary'].dark, darkLayer3],
      ['浅色受限供应商列头', SIMPLIFY_TOKENS['--dsw-alias-label-tertiary'].light, mixOver('#0f172a', lightSurface, 0.035)],
      ['深色受限供应商列头', SIMPLIFY_TOKENS['--dsw-alias-label-tertiary'].dark, mixOver('#ffffff', darkSurface, 0.035)]
    ] as const

    for (const [name, foreground, background] of checks) {
      expect(contrastRatio(foreground, background), name).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('token 层是冻结的，避免运行时被就地改写', () => {
    expect(Object.isFrozen(SIMPLIFY_TOKENS)).toBe(true)
  })
})
