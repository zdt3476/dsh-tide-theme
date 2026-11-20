/**
 * 潮汐主题（Tide Theme）的 token 层（全局统一）。
 *
 * 遵循 workbuddy-design 高端、克制、现代设计规范：
 * - 6-3-1 配色法则：60% 中性画布、30% 结构容器、10% 关键交互强调，禁用纯黑 #000000
 * - 以清晰表面层级和短阴影替代大面积玻璃光效，菜单浮层保留有限模糊
 * - 所有文字与状态阶梯严格达标 WCAG AA（对比度 ≥ 4.5:1，主标题与大指标 ≥ 7:1）
 */

/** 一个 token 在两种配色下的值。 */
export interface ThemeTokenValue {
  readonly light: string
  readonly dark: string
}

export type ThemeTokens = Readonly<Record<string, ThemeTokenValue>>

/** override 层的身份；同一 source 重复注册会整体替换旧层。 */
export const THEME_SOURCE = 'dsh-tide-theme'

export const SIMPLIFY_TOKENS: ThemeTokens = Object.freeze({
  // —— 画布与表面分层：中性画布、清晰容器层级，避免整屏蓝色化 ——
  '--dsw-alias-bg-base': { light: '#f4f6f8', dark: '#0b1420' },
  '--dsw-alias-bg-layer-1': { light: '#e9eef3', dark: '#101c2b' },
  '--dsw-alias-bg-layer-2': { light: '#ffffff', dark: '#152337' },
  '--dsw-alias-bg-layer-3': { light: '#f8fafc', dark: '#1b2b42' },
  '--dsw-alias-bg-module-platform': { light: '#f4f6f8', dark: '#0b1420' },
  '--dsw-alias-bg-skeleton': { light: 'rgba(36, 88, 182, 0.06)', dark: 'rgba(122, 170, 240, 0.08)' },

  // —— 描边：用中性边界区分层级，品牌色只出现在关键交互 ——
  '--dsw-alias-border-l1': { light: 'rgba(15, 23, 42, 0.10)', dark: 'rgba(193, 213, 236, 0.12)' },
  '--dsw-alias-border-l2': { light: 'rgba(15, 23, 42, 0.16)', dark: 'rgba(193, 213, 236, 0.18)' },
  '--dsw-alias-border-l3': { light: 'rgba(15, 23, 42, 0.24)', dark: 'rgba(193, 213, 236, 0.28)' },
  '--dsw-alias-border-l4': { light: 'rgba(15, 23, 42, 0.34)', dark: 'rgba(193, 213, 236, 0.38)' },
  '--dsw-alias-separator-primary': { light: 'rgba(15, 23, 42, 0.10)', dark: 'rgba(193, 213, 236, 0.12)' },

  // —— 文字层级：小字号也保持足够对比度，状态文字与填色分离 ——
  '--dsw-alias-label-primary': { light: '#17212e', dark: '#e9effa' },
  '--dsw-alias-label-secondary': { light: '#3f4c5e', dark: '#a6b5cd' },
  '--dsw-alias-label-tertiary': { light: '#526173', dark: '#8497b3' },
  '--dsw-alias-label-caption': { light: '#5c6b7d', dark: '#91a4bd' },
  '--dsw-alias-label-dimmed': { light: '#606f82', dark: '#788da9' },
  '--dsw-alias-label-quaternary': { light: '#526173', dark: '#8497b3' },
  '--dsw-alias-label-error': { light: '#b42318', dark: '#ff9b9b' },
  '--dsw-alias-label-primary-dimmed': { light: '#253246', dark: '#dbe7f8' },
  '--dsw-alias-label-primary-bluish': { light: '#2458b6', dark: '#7aaaf0' },
  '--dsw-alias-label-shimmer': { light: '#526173', dark: '#8497b3' },
  '--dsw-alias-label-deep-diving': { light: '#3f4c5e', dark: '#a6b5cd' },
  '--dsw-alias-label-deep-diving-shimmer': { light: '#253246', dark: '#d8e5f7' },
  '--dsw-alias-link': { light: '#2458b6', dark: '#7aaaf0' },

  // —— 交互态：浅色以中性灰蓝反馈，深色以低透明白反馈 ——
  '--dsw-alias-interactive-bg-hover': { light: 'rgba(15, 23, 42, 0.055)', dark: 'rgba(255, 255, 255, 0.065)' },
  '--dsw-alias-interactive-bg-hover-solid': { light: '#e7ecf1', dark: '#1a2a3e' },
  '--dsw-alias-interactive-bg-subtle': { light: 'rgba(15, 23, 42, 0.035)', dark: 'rgba(255, 255, 255, 0.035)' },
  '--dsw-alias-interactive-bg-active': { light: 'rgba(36, 88, 182, 0.12)', dark: 'rgba(122, 170, 240, 0.16)' },
  '--dsw-alias-turn-trigger-bg': { light: 'rgba(36, 88, 182, 0.045)', dark: 'rgba(122, 170, 240, 0.07)' },
  '--dsw-alias-turn-trigger-bg-hover': { light: 'rgba(36, 88, 182, 0.09)', dark: 'rgba(122, 170, 240, 0.13)' },

  // —— 按钮 ——
  '--dsw-alias-button-elevated-fill': { light: '#ffffff', dark: '#1a2a3e' },
  '--dsw-alias-button-floating-fill': { light: '#ffffff', dark: '#1a2a3e' },
  '--dsw-alias-button-floating-hover': { light: '#f1f4f7', dark: '#223650' },
  '--dsw-alias-button-info-fill': { light: '#2458b6', dark: '#3167c4' },
  '--dsw-alias-button-info-hover': { light: '#1d478f', dark: '#3a74d6' },

  // —— 状态色：primary 用于填色/描边，label 用于小字号文字 ——
  '--dsw-alias-state-business-primary': { light: '#2458b6', dark: '#7aaaf0' },
  '--dsw-alias-state-business-tertiary': { light: 'rgba(36, 88, 182, 0.15)', dark: 'rgba(122, 170, 240, 0.20)' },
  '--dsw-alias-state-success-primary': { light: '#087443', dark: '#35c98b' },
  '--dsw-alias-state-success-label': { light: '#087443', dark: '#57d6a0' },
  '--dsw-alias-state-success-subtle': { light: 'rgba(8, 116, 67, 0.12)', dark: 'rgba(53, 201, 139, 0.16)' },
  '--dsw-alias-state-warn-primary': { light: '#8a4b08', dark: '#f2bc68' },
  '--dsw-alias-state-warn-label': { light: '#8a4b08', dark: '#ffd18a' },
  '--dsw-alias-state-error-primary': { light: '#b42318', dark: '#ff7f86' },
  '--dsw-alias-state-error-label': { light: '#b42318', dark: '#ff9b9b' },
  '--dsw-alias-state-mixed-primary': { light: '#8a4b08', dark: '#f2bc68' },
  '--dsw-alias-state-unknown-primary': { light: '#526173', dark: '#8497b3' },

  // —— 圆角：小而清晰，避免每个控件都像胶囊 ——
  '--dsw-corner-shape': { light: 'round', dark: 'round' },
  '--dsw-radius-xs': { light: '4px', dark: '4px' },
  '--dsw-radius-sm': { light: '6px', dark: '6px' },
  '--dsw-radius-md': { light: '8px', dark: '8px' },
  '--dsw-radius-lg': { light: '10px', dark: '10px' },
  '--dsw-radius-xl': { light: '12px', dark: '12px' },
  '--dsw-radius-panel': { light: '12px', dark: '12px' },

  // —— 浮层海拔：短而柔和的阴影，不做外发光 ——
  '--dsw-elevation-soft': {
    light: '0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(15, 23, 42, 0.04)',
    dark: '0 1px 2px rgba(3, 7, 18, 0.36), 0 0 0 1px rgba(193, 213, 236, 0.06)'
  },
  '--dsw-elevation-panel': {
    light: '0 8px 24px -12px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(15, 23, 42, 0.06)',
    dark: '0 12px 28px -14px rgba(3, 7, 18, 0.72), 0 0 0 1px rgba(193, 213, 236, 0.08)'
  },
  '--dsw-elevation-prominent': {
    light: '0 18px 40px -18px rgba(15, 23, 42, 0.34), 0 0 0 1px rgba(15, 23, 42, 0.08)',
    dark: '0 20px 44px -18px rgba(3, 7, 18, 0.84), 0 0 0 1px rgba(193, 213, 236, 0.10)'
  },
  '--dsw-elevation-stroke-color': { light: 'rgba(15, 23, 42, 0.08)', dark: 'rgba(193, 213, 236, 0.10)' },

  // —— 菜单与弹出层：仅在真正浮层使用轻微模糊 ——
  '--dsw-menu-backdrop-filter': { light: 'blur(12px)', dark: 'blur(12px)' },
  '--dsw-menu-surface-fill': { light: '#fffffff5', dark: '#152337f7' },
  '--dsw-alias-menu-group-header-fill': { light: '#fffffff5', dark: '#152337f7' },
  '--dsw-specific-menu': { light: 'var(--dsw-menu-surface-fill)', dark: 'var(--dsw-menu-surface-fill)' },

  // —— 侧栏与主要输入卡表面 ——
  '--dsw-specific-sidebar-fill': { light: '#e9eef3', dark: '#0a121d' },
  '--dsw-specific-selector': { light: '#ffffff', dark: '#152337' },
  '--dsw-specific-input-major': { light: '#ffffff', dark: '#101c2b' },

  // —— 用户气泡 ——
  '--dsw-specific-bubble': { light: '#e8edf2', dark: '#172a43' },
  '--dsw-specific-bubble-highlight': { light: '#dce5ed', dark: '#1e3451' },

  // —— 代码块 ——
  '--dsw-alias-markdown-code-block': { light: '#eef2f5', dark: '#09121e' },
  '--dsw-alias-markdown-code-block-banner': { light: '#eef2f5', dark: '#09121e' },
  '--dsw-alias-markdown-inline-code': { light: '#e1e8ee', dark: '#172a43' },

  // —— 滚动条 ——
  '--dsw-alias-scrollbar-bg-l1': { light: 'rgba(15, 23, 42, 0.08)', dark: 'rgba(193, 213, 236, 0.10)' },
  '--dsw-alias-scrollbar-bg-l2': { light: 'rgba(15, 23, 42, 0.17)', dark: 'rgba(193, 213, 236, 0.18)' },
  '--dsw-alias-scrollbar-hover-l2': { light: 'rgba(15, 23, 42, 0.28)', dark: 'rgba(193, 213, 236, 0.28)' },

  // —— 焦点环 ——
  '--dsw-focus-ring-color': { light: '#2458b6', dark: '#7aaaf0' },

  // —— 静态色 ——
  '--dsw-static-blue-450': { light: '#2458b6', dark: '#7aaaf0' },
  '--dsw-static-neutral-bluish-400': { light: '#526173', dark: '#8497b3' }
})
