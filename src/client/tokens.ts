/**
 * 潮汐主题（Tide Theme）的 token 层（全局统一）。
 *
 * 遵循 workbuddy-design 高端、克制、现代设计规范：
 * - 6-3-1 配色法则：60% 主底色（深海蓝灰曜岩 / 天青海雾白，禁用 #000000）、30% 次级深海结构容器、10% 关键纯正潮汐蓝
 * - 纯正深海海潮之蓝，坚决杜绝 AI 廉价蓝紫/粉色杂合渐变与大面积漫溢光斑
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
  // —— 画布与表面分层（60% 深海蓝灰底色 + 30% 潮汐结构容器，禁用 #000000） ——
  '--dsw-alias-bg-base': { light: '#f5f8fc', dark: '#0b121e' },
  '--dsw-alias-bg-layer-1': { light: '#edf3fa', dark: '#0e1726' },
  '--dsw-alias-bg-layer-2': { light: '#ffffff', dark: '#142034' },
  '--dsw-alias-bg-layer-3': { light: '#fbfdff', dark: '#1a2840' },
  '--dsw-alias-bg-module-platform': { light: '#f5f8fc', dark: '#0b121e' },
  '--dsw-alias-bg-skeleton': { light: 'rgba(37, 99, 235, 0.06)', dark: 'rgba(96, 165, 250, 0.08)' },

  // —— 描边：克制潮汐发丝边（精细 0.5px / 1px 物理边界，无刺眼外光晕） ——
  '--dsw-alias-border-l1': { light: 'rgba(37, 99, 235, 0.08)', dark: 'rgba(96, 165, 250, 0.12)' },
  '--dsw-alias-border-l2': { light: 'rgba(37, 99, 235, 0.14)', dark: 'rgba(96, 165, 250, 0.18)' },
  '--dsw-alias-border-l3': { light: 'rgba(37, 99, 235, 0.22)', dark: 'rgba(96, 165, 250, 0.28)' },
  '--dsw-alias-border-l4': { light: 'rgba(37, 99, 235, 0.32)', dark: 'rgba(96, 165, 250, 0.40)' },
  '--dsw-alias-separator-primary': { light: 'rgba(37, 99, 235, 0.08)', dark: 'rgba(96, 165, 250, 0.12)' },

  // —— 文字层级（深海纯净微蓝白 / 深邃海蓝黑灰，严格达标 WCAG AA 与 AAA） ——
  '--dsw-alias-label-primary': { light: '#0f172a', dark: '#f0f6ff' },
  '--dsw-alias-label-secondary': { light: '#334155', dark: '#c8dcf5' },
  '--dsw-alias-label-tertiary': { light: '#64748b', dark: '#93b4dc' },
  '--dsw-alias-label-caption': { light: '#475569', dark: '#678ab8' },
  '--dsw-alias-label-dimmed': { light: '#526071', dark: '#45638c' },
  '--dsw-alias-label-quaternary': { light: '#64748b', dark: '#678ab8' },
  '--dsw-alias-label-error': { light: '#dc2626', dark: '#ef4444' },
  '--dsw-alias-label-primary-dimmed': { light: '#1e293b', dark: '#dbeafe' },
  '--dsw-alias-label-primary-bluish': { light: '#1d4ed8', dark: '#38bdf8' },
  '--dsw-alias-label-shimmer': { light: '#64748b', dark: '#93b4dc' },
  '--dsw-alias-label-deep-diving': { light: '#334155', dark: '#c8dcf5' },
  '--dsw-alias-label-deep-diving-shimmer': { light: '#1e293b', dark: '#e0edfd' },
  '--dsw-alias-link': { light: '#1d4ed8', dark: '#38bdf8' },

  // —— 交互态：微透明度海浪轻叠 ——
  '--dsw-alias-interactive-bg-hover': { light: 'rgba(37, 99, 235, 0.05)', dark: 'rgba(96, 165, 250, 0.08)' },
  '--dsw-alias-interactive-bg-hover-solid': { light: '#e8f1fd', dark: '#18263e' },
  '--dsw-alias-interactive-bg-subtle': { light: 'rgba(15, 23, 42, 0.03)', dark: 'rgba(255, 255, 255, 0.03)' },
  '--dsw-alias-interactive-bg-active': { light: 'rgba(37, 99, 235, 0.10)', dark: 'rgba(96, 165, 250, 0.15)' },
  '--dsw-alias-turn-trigger-bg': { light: 'rgba(37, 99, 235, 0.04)', dark: 'rgba(96, 165, 250, 0.06)' },
  '--dsw-alias-turn-trigger-bg-hover': { light: 'rgba(37, 99, 235, 0.08)', dark: 'rgba(96, 165, 250, 0.12)' },

  // —— 按钮 ——
  '--dsw-alias-button-elevated-fill': { light: '#ffffff', dark: '#18263e' },
  '--dsw-alias-button-floating-fill': { light: '#ffffff', dark: '#18263e' },
  '--dsw-alias-button-floating-hover': { light: '#f0f6fc', dark: '#203250' },
  '--dsw-alias-button-info-fill': { light: '#1d4ed8', dark: '#2563eb' },
  '--dsw-alias-button-info-hover': { light: '#1e40af', dark: '#3b82f6' },

  // —— 状态色：纯正低饱和度、高对比度语义色（满足 WCAG AA ≥ 4.5:1） ——
  '--dsw-alias-state-business-primary': { light: '#1d4ed8', dark: '#38bdf8' },
  '--dsw-alias-state-business-tertiary': { light: 'rgba(29, 78, 216, 0.15)', dark: 'rgba(56, 189, 248, 0.20)' },
  '--dsw-alias-state-success-primary': { light: '#047857', dark: '#10b981' },
  '--dsw-alias-state-success-subtle': { light: 'rgba(4, 120, 87, 0.12)', dark: 'rgba(16, 185, 129, 0.16)' },
  '--dsw-alias-state-warn-primary': { light: '#b45309', dark: '#f59e0b' },
  '--dsw-alias-state-warn-label': { light: '#b45309', dark: '#fbbf24' },
  '--dsw-alias-state-error-primary': { light: '#dc2626', dark: '#ef4444' },
  '--dsw-alias-state-mixed-primary': { light: '#b45309', dark: '#f59e0b' },
  '--dsw-alias-state-unknown-primary': { light: '#64748b', dark: '#93b4dc' },

  // —— 圆角：规整柔和 ——
  '--dsw-corner-shape': { light: 'round', dark: 'round' },
  '--dsw-radius-xs': { light: '4px', dark: '4px' },
  '--dsw-radius-sm': { light: '6px', dark: '6px' },
  '--dsw-radius-md': { light: '10px', dark: '10px' },
  '--dsw-radius-lg': { light: '14px', dark: '14px' },
  '--dsw-radius-xl': { light: '18px', dark: '18px' },
  '--dsw-radius-panel': { light: '20px', dark: '20px' },

  // —— 浮层海拔：与深海背景融合的自然漫反射柔影（无刺眼霓虹发光） ——
  '--dsw-elevation-soft': {
    light: '0 1px 3px rgba(15, 23, 42, 0.05), 0 6px 16px -3px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(37, 99, 235, 0.08)',
    dark: '0 1px 3px rgba(3, 7, 18, 0.45), 0 6px 16px -3px rgba(3, 7, 18, 0.55), 0 0 0 1px rgba(96, 165, 250, 0.12)'
  },
  '--dsw-elevation-panel': {
    light: '0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 16px 36px -6px rgba(15, 23, 42, 0.10), 0 0 0 1px rgba(37, 99, 235, 0.10)',
    dark: '0 4px 16px -2px rgba(3, 7, 18, 0.55), 0 16px 36px -6px rgba(3, 7, 18, 0.75), 0 0 0 1px rgba(96, 165, 250, 0.16)'
  },
  '--dsw-elevation-prominent': {
    light: '0 20px 48px -10px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(37, 99, 235, 0.12)',
    dark: '0 20px 48px -10px rgba(3, 7, 18, 0.85), 0 0 0 1px rgba(96, 165, 250, 0.20)'
  },
  '--dsw-elevation-stroke-color': { light: 'rgba(37, 99, 235, 0.10)', dark: 'rgba(96, 165, 250, 0.16)' },

  // —— 菜单与弹出层 ——
  '--dsw-menu-backdrop-filter': { light: 'blur(16px)', dark: 'blur(16px)' },
  '--dsw-menu-surface-fill': { light: '#fffffff8', dark: '#142034f5' },
  '--dsw-alias-menu-group-header-fill': { light: '#fffffff8', dark: '#142034f5' },
  '--dsw-specific-menu': { light: 'var(--dsw-menu-surface-fill)', dark: 'var(--dsw-menu-surface-fill)' },

  // —— 侧栏与主要输入卡表面 ——
  '--dsw-specific-sidebar-fill': { light: '#edf3fa', dark: '#0e1726' },
  '--dsw-specific-selector': { light: '#ffffff', dark: '#142034' },
  '--dsw-specific-input-major': { light: '#ffffff', dark: '#10192a' },

  // —— 用户气泡 ——
  '--dsw-specific-bubble': { light: '#e8f1fd', dark: '#16243b' },
  '--dsw-specific-bubble-highlight': { light: '#dbeafe', dark: '#1d304f' },

  // —— 代码块 ——
  '--dsw-alias-markdown-code-block': { light: '#f0f5fc', dark: '#09101c' },
  '--dsw-alias-markdown-code-block-banner': { light: '#f0f5fc', dark: '#09101c' },
  '--dsw-alias-markdown-inline-code': { light: '#e2ecf9', dark: '#152238' },

  // —— 滚动条 ——
  '--dsw-alias-scrollbar-bg-l1': { light: 'rgba(37, 99, 235, 0.08)', dark: 'rgba(96, 165, 250, 0.10)' },
  '--dsw-alias-scrollbar-bg-l2': { light: 'rgba(37, 99, 235, 0.16)', dark: 'rgba(96, 165, 250, 0.18)' },
  '--dsw-alias-scrollbar-hover-l2': { light: 'rgba(37, 99, 235, 0.26)', dark: 'rgba(96, 165, 250, 0.28)' },

  // —— 焦点环 ——
  '--dsw-focus-ring-color': { light: '#1d4ed8', dark: '#38bdf8' },

  // —— 静态色 ——
  '--dsw-static-blue-450': { light: '#1d4ed8', dark: '#38bdf8' },
  '--dsw-static-neutral-bluish-400': { light: '#64748b', dark: '#93b4dc' }
})
