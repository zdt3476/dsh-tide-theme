/**
 * 深玻璃主题的 token 层（全局统一）。
 *
 * 策略：宿主 UI 的一切表面都消费 `--dsw-alias-*` / `--dsw-specific-*` token，
 * 把这套 token 全部覆盖成同一套「深空玻璃」配色，整个应用就会统一换肤——
 * 侧栏、对话区、输入卡、菜单、气泡、代码块、按钮、滚动条、骨架屏全部同源。
 * 组件层 CSS（styles.ts）只负责宿主 token 表达不了的玻璃细节（渐变、内发光、网格）。
 *
 * 未列出的 token 继承内置配色；值必须是 { light, dark } 对（validateOverrides 校验）。
 * 亮色走「冷雾白」浅玻璃，暗色走「曜石蓝黑」深玻璃，两者同一色相体系。
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
  // —— 画布与表面分层（完全对齐看板浮窗的高质感冰蓝玻璃 / 曜石深空玻璃） ——
  '--dsw-alias-bg-base': { light: '#f4f7fb', dark: '#070d17' },
  '--dsw-alias-bg-layer-1': { light: '#edf3fa', dark: '#0a1220' },
  '--dsw-alias-bg-layer-2': { light: '#ffffff', dark: '#101c2e' },
  '--dsw-alias-bg-layer-3': { light: '#f6faff', dark: '#16273f' },
  '--dsw-alias-bg-module-platform': { light: '#f4f7fb', dark: '#070d17' },
  '--dsw-alias-bg-skeleton': { light: '#1d6cf00f', dark: '#8fc4ff12' },

  // —— 描边：克制发丝边（融入浮窗同色相 0.5px 精细描边） ——
  '--dsw-alias-border-l1': { light: '#1d6cf017', dark: '#8fc4ff1f' },
  '--dsw-alias-border-l2': { light: '#1d6cf026', dark: '#8fc4ff33' },
  '--dsw-alias-border-l3': { light: '#1d6cf040', dark: '#8fc4ff4d' },
  '--dsw-alias-border-l4': { light: '#1d6cf05c', dark: '#8fc4ff6b' },
  '--dsw-alias-separator-primary': { light: '#1d6cf014', dark: '#8fc4ff1a' },

  // —— 文字层级（深蓝曜石冷调 / 冰白深空） ——
  '--dsw-alias-label-primary': { light: '#0d1b2e', dark: '#e8f2ff' },
  '--dsw-alias-label-secondary': { light: '#41546e', dark: '#9eb4d0' },
  '--dsw-alias-label-tertiary': { light: '#677d99', dark: '#758ba8' },
  '--dsw-alias-label-caption': { light: '#8295ae', dark: '#5e7592' },
  '--dsw-alias-label-dimmed': { light: '#9eb0c6', dark: '#4c627e' },
  '--dsw-alias-label-primary-dimmed': { light: '#41546e', dark: '#c4d7ee' },
  '--dsw-alias-label-primary-bluish': { light: '#1d6cf0', dark: '#8fc4ff' },
  '--dsw-alias-label-shimmer': { light: '#8b9aac', dark: '#54688a' },
  '--dsw-alias-label-deep-diving': { light: '#677d99', dark: '#a3bfe0' },
  '--dsw-alias-label-deep-diving-shimmer': { light: '#8b9aac', dark: '#c6dcf5' },
  '--dsw-alias-link': { light: '#1d6cf0', dark: '#63aaff' },

  // —— 交互态：同色相微透明度叠加 ——
  '--dsw-alias-interactive-bg-hover': { light: '#1d6cf00f', dark: '#8fc4ff14' },
  '--dsw-alias-interactive-bg-hover-solid': { light: '#e8f1fd', dark: '#15243b' },
  '--dsw-alias-interactive-bg-active': { light: '#1d6cf01c', dark: '#8fc4ff24' },
  '--dsw-alias-turn-trigger-bg': { light: '#1d6cf00a', dark: '#8fc4ff0d' },
  '--dsw-alias-turn-trigger-bg-hover': { light: '#1d6cf017', dark: '#8fc4ff1a' },

  // —— 按钮 ——
  '--dsw-alias-button-elevated-fill': { light: '#ffffff', dark: '#12203a' },
  '--dsw-alias-button-floating-fill': { light: '#ffffff', dark: '#12203a' },
  '--dsw-alias-button-floating-hover': { light: '#eff4fa', dark: '#1a2c49' },
  '--dsw-alias-button-info-fill': { light: '#1d6cf0', dark: '#3b8bf5' },
  '--dsw-alias-button-info-hover': { light: '#155cd0', dark: '#5aa0ff' },

  // —— 状态色：与看板状态徽章/环形指示器完全同源 ——
  '--dsw-alias-state-business-primary': { light: '#1d6cf0', dark: '#4f9dff' },
  '--dsw-alias-state-business-tertiary': { light: '#1d6cf026', dark: '#4f9dff2e' },
  '--dsw-alias-state-success-primary': { light: '#0f8754', dark: '#34d399' },
  '--dsw-alias-state-warn-primary': { light: '#b46a05', dark: '#fbbf24' },
  '--dsw-alias-state-warn-label': { light: '#9a5800', dark: '#fbbf24' },
  '--dsw-alias-state-error-primary': { light: '#dc2626', dark: '#f87171' },
  '--dsw-alias-state-mixed-primary': { light: '#b46a05', dark: '#fbbf24' },
  '--dsw-alias-state-unknown-primary': { light: '#677d99', dark: '#758ba8' },

  // —— 圆角：规整柔和 ——
  '--dsw-corner-shape': { light: 'round', dark: 'round' },
  '--dsw-radius-xs': { light: '4px', dark: '4px' },
  '--dsw-radius-sm': { light: '8px', dark: '8px' },
  '--dsw-radius-md': { light: '12px', dark: '12px' },
  '--dsw-radius-lg': { light: '16px', dark: '16px' },
  '--dsw-radius-xl': { light: '20px', dark: '20px' },
  '--dsw-radius-panel': { light: '24px', dark: '24px' },

  // —— 浮层海拔：与看板完全一致的轻量漫反射投影 ——
  '--dsw-elevation-soft': {
    light: '0 1px 3px rgba(24, 38, 64, 0.04), 0 6px 18px -4px rgba(24, 38, 64, 0.07), 0 0 0 0.5px rgba(29, 108, 240, 0.1)',
    dark: '0 1px 3px rgba(0, 0, 0, 0.4), 0 8px 24px -6px rgba(0, 0, 0, 0.6), 0 0 0 0.5px rgba(143, 196, 255, 0.12)'
  },
  '--dsw-elevation-panel': {
    light: '0 2px 6px rgba(24, 38, 64, 0.04), 0 16px 40px -10px rgba(24, 38, 64, 0.14), 0 0 0 0.5px rgba(29, 108, 240, 0.12), inset 0 1px 0 #ffffff',
    dark: '0 2px 6px rgba(0, 0, 0, 0.5), 0 18px 44px -10px rgba(0, 0, 0, 0.75), 0 0 0 0.5px rgba(143, 196, 255, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
  },
  '--dsw-elevation-prominent': {
    light: '0 24px 56px -12px rgba(24, 38, 64, 0.20), 0 2px 6px rgba(24, 38, 64, 0.04), 0 0 0 0.5px rgba(29, 108, 240, 0.14), inset 0 1px 0 #ffffff',
    dark: '0 24px 56px -12px rgba(0, 0, 0, 0.85), 0 0 1px rgba(143, 196, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
  },
  '--dsw-elevation-stroke-color': { light: 'rgba(29, 108, 240, 0.1)', dark: 'rgba(143, 196, 255, 0.14)' },

  // —— 菜单与弹出层 ——
  '--dsw-menu-backdrop-filter': { light: 'blur(20px) saturate(180%)', dark: 'blur(24px) saturate(170%)' },
  '--dsw-menu-surface-fill': { light: '#fffffffa', dark: '#0d182ae8' },
  '--dsw-alias-menu-group-header-fill': { light: '#fffffffa', dark: '#0d182ae8' },
  '--dsw-specific-menu': { light: 'var(--dsw-menu-surface-fill)', dark: 'var(--dsw-menu-surface-fill)' },

  // —— 侧栏与主要输入卡表面 ——
  '--dsw-specific-sidebar-fill': { light: '#edf3fa', dark: '#060b13' },
  '--dsw-specific-selector': { light: '#ffffff', dark: '#122034' },
  '--dsw-specific-input-major': { light: '#ffffff', dark: '#101c2e' },

  // —— 用户气泡：冰蓝水滴表面 ——
  '--dsw-specific-bubble': { light: '#eaf2fc', dark: '#132238' },
  '--dsw-specific-bubble-highlight': { light: '#ddeaf9', dark: '#1a2e4c' },

  // —— 代码块 ——
  '--dsw-alias-markdown-code-block': { light: '#f1f5fa', dark: '#050a12' },
  '--dsw-alias-markdown-code-block-banner': { light: '#f1f5fa', dark: '#050a12' },
  '--dsw-alias-markdown-inline-code': { light: '#e8f0f9', dark: '#152943' },

  // —— 滚动条 ——
  '--dsw-alias-scrollbar-bg-l1': { light: '#1d6cf012', dark: '#8fc4ff1a' },
  '--dsw-alias-scrollbar-bg-l2': { light: '#1d6cf024', dark: '#8fc4ff2b' },
  '--dsw-alias-scrollbar-hover-l2': { light: '#1d6cf03b', dark: '#8fc4ff40' },

  // —— 焦点环 ——
  '--dsw-focus-ring-color': { light: '#1d6cf0', dark: '#4f9dff' },

  // —— 静态色 ——
  '--dsw-static-blue-450': { light: '#1d6cf0', dark: '#4f9dff' },
  '--dsw-static-neutral-bluish-400': { light: '#677d99', dark: '#758ba8' }
})
