/**
 * dock 控件与侧栏 tabs 的样式。
 *
 * 隐藏原生 model / permission seat 用 `:has()` 门控：只有当 composer seat 里
 * 真的渲染了本插件的 dock 控件时才隐藏。这样 hero（新会话）态、插件被禁用、
 * dock 未渲染时原生控件自动恢复，不残留死白区域。
 */

export const UI_CSS = `
/* ============================================================================
 * 全局玻璃层（整体风格统一）
 *
 * 上面的 token 层已把宿主全部表面换成同一套深空玻璃配色；这一层补 token
 * 表达不了的细节：侧栏行悬停、输入卡玻璃质感、对话区上下渐晕、滚动条圆角。
 * 选择器只用宿主源码里确认过的稳定锚点（data-row-key / data-conversation-* /
 * data-composer-card），不碰 CSS module 哈希类名。
 * ========================================================================== */

/* ============================================================================
 * 主题材质变量：门控层唯一事实源
 *
 * 三个自绘组件（HUD / 看板浮窗 / 委派图）在主题开启时套用同一套冰蓝玻璃：
 * 光源统一在左上（circle at 12% 0%），描边统一 0.5px，投影统一向下。
 * 开关关闭时这些变量不参与，组件回落到原生 token 表面。
 * ========================================================================== */
body[data-dsh-tide-theme][data-ds-dark-theme] {
  --dsh-tide-glass-surface:
    radial-gradient(circle at 12% 0%, rgba(56, 132, 255, 0.14) 0%, transparent 52%),
    linear-gradient(180deg, rgba(20, 31, 48, 0.95) 0%, rgba(12, 18, 29, 0.97) 100%);
  --dsh-tide-glass-border: rgba(143, 196, 255, 0.18);
  --dsh-tide-glass-border-hover: rgba(143, 196, 255, 0.32);
  --dsh-tide-glass-blur: blur(26px) saturate(170%);
  --dsh-tide-glass-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.10);
  --dsh-tide-glass-shadow-hover: 0 16px 40px -6px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  --dsh-tide-glass-shadow-panel: 0 24px 56px -12px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.10);
  --dsh-tide-glass-shadow-card: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 4px 16px -4px rgba(0, 0, 0, 0.4);
  /* 内层卡面：比玻璃底色亮一档，形成可辨的明度台阶（B2）。
   * 用实色而非叠加半透白，避免与玻璃同色糊成一片。 */
  --dsh-tide-card-surface: linear-gradient(180deg, rgba(38, 52, 74, 0.96) 0%, rgba(28, 40, 58, 0.94) 100%);
  --dsh-tide-card-border: rgba(143, 196, 255, 0.20);
  --dsh-tide-card-border-hover: rgba(143, 196, 255, 0.36);
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) {
  --dsh-tide-glass-surface:
    radial-gradient(circle at 12% 0%, rgba(29, 108, 240, 0.08) 0%, transparent 52%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(243, 247, 254, 0.99) 100%);
  --dsh-tide-glass-border: rgba(29, 108, 240, 0.14);
  --dsh-tide-glass-border-hover: rgba(29, 108, 240, 0.30);
  --dsh-tide-glass-blur: blur(26px) saturate(170%);
  --dsh-tide-glass-shadow: inset 0 1px 0 #ffffff, 0 1px 3px rgba(24, 38, 64, 0.04), 0 8px 24px -6px rgba(24, 38, 64, 0.08);
  --dsh-tide-glass-shadow-hover: inset 0 1px 0 #ffffff, 0 4px 16px -4px rgba(29, 108, 240, 0.16);
  --dsh-tide-glass-shadow-panel: inset 0 1px 0 #ffffff, 0 1px 2px rgba(24, 33, 51, 0.04), 0 24px 56px -12px rgba(24, 33, 51, 0.22);
  --dsh-tide-glass-shadow-card: inset 0 1px 0 #ffffff, 0 1px 3px rgba(24, 38, 64, 0.04);
  /* 亮色卡片比白玻璃深一档冷灰，形成可辨台阶（B2） */
  --dsh-tide-card-surface: linear-gradient(180deg, #e4ecf8 0%, #d6e3f3 100%);
  --dsh-tide-card-border: rgba(29, 108, 240, 0.16);
  --dsh-tide-card-border-hover: rgba(29, 108, 240, 0.32);
}

/* —— Simplify Theme 全局深色玻璃底色（单一 Token 来源与精准结构选择器，body[data-dsh-tide-theme] 门控） —— */
/* 宿主主框架：只在启用本主题时覆盖全局底色，基色复用现有 token 变量，不在 CSS 写第二套色值 */
body[data-dsh-tide-theme][data-ds-dark-theme] {
  background-color: var(--dsw-alias-bg-base) !important;
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) {
  background-color: var(--dsw-alias-bg-base) !important;
}

/* 侧栏：深色曜石蓝黑分层 / 浅色通透冰蓝雾白分层 */
body[data-dsh-tide-theme][data-ds-dark-theme] [class*='_sidebarCol'],
body[data-dsh-tide-theme][data-ds-dark-theme] [data-slot='sidebar.workspaces'],
body[data-dsh-tide-theme][data-ds-dark-theme] [data-slot='sidebar'] {
  background: linear-gradient(180deg, var(--dsw-specific-sidebar-fill) 0%, #080f18 100%) !important;
  border-right: 1px solid rgba(80, 140, 220, 0.12) !important;
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [class*='_sidebarCol'],
body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [data-slot='sidebar.workspaces'],
body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [data-slot='sidebar'] {
  background: linear-gradient(180deg, var(--dsw-specific-sidebar-fill) 0%, #e6eff8 100%) !important;
  border-right: 0.5px solid rgba(29, 108, 240, 0.12) !important;
}

/* 中间主画布：深色顶部柔和蓝微光 / 浅色顶部柔和冰蓝微光（与看板浮窗顶部光晕完全同调） */
body[data-dsh-tide-theme][data-ds-dark-theme] [class*='_centerCol'],
body[data-dsh-tide-theme][data-ds-dark-theme] [data-conversation-scroll] {
  background:
    radial-gradient(120% 60% at 50% -10%, rgba(30, 80, 180, 0.12) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 100%, rgba(20, 60, 140, 0.08) 0%, transparent 50%),
    var(--dsw-alias-bg-base) !important;
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [class*='_centerCol'],
body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [data-conversation-scroll] {
  background:
    radial-gradient(120% 60% at 50% -10%, rgba(29, 108, 240, 0.07) 0%, transparent 60%),
    radial-gradient(ellipse at 85% 100%, rgba(29, 108, 240, 0.04) 0%, transparent 50%),
    var(--dsw-alias-bg-base) !important;
}

/* 顶栏头部与面包屑：精准定位真正的对话头部，毛玻璃质感，不匹配全局 _header */
body[data-dsh-tide-theme][data-ds-dark-theme] header[class*='_header']:has([data-conversation-header-leading]),
body[data-dsh-tide-theme][data-ds-dark-theme] header[class*='_header']:has([data-conversation-header-corner]),
body[data-dsh-tide-theme][data-ds-dark-theme] [data-conversation-header-leading],
body[data-dsh-tide-theme][data-ds-dark-theme] [data-conversation-header-corner] {
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 75%, transparent) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(80, 140, 220, 0.12) !important;
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) header[class*='_header']:has([data-conversation-header-leading]),
body[data-dsh-tide-theme]:not([data-ds-dark-theme]) header[class*='_header']:has([data-conversation-header-corner]),
body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [data-conversation-header-leading],
body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [data-conversation-header-corner] {
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 80%, transparent) !important;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 0.5px solid rgba(29, 108, 240, 0.10) !important;
}

/* 右侧抽屉 / 产物栏（如 diff viewer） */
body[data-dsh-tide-theme][data-ds-dark-theme] [class*='_rightbarCol'] {
  background: var(--dsw-alias-bg-layer-1) !important;
  border-left: 1px solid rgba(80, 140, 220, 0.12) !important;
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [class*='_rightbarCol'] {
  background: var(--dsw-alias-bg-layer-1) !important;
  border-left: 0.5px solid rgba(29, 108, 240, 0.10) !important;
}

/* —— 侧栏：行悬停玻璃高亮 + 会话行文字层级（受 body[data-dsh-tide-theme] 门控） —— */
body[data-dsh-tide-theme] [data-row-key]:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

body[data-dsh-tide-theme] [data-row-key][aria-expanded='true'],
body[data-dsh-tide-theme] [data-row-key].selected,
body[data-dsh-tide-theme] [data-row-key][data-selected] {
  background: var(--dsw-alias-interactive-bg-active);
}

/* —— 输入卡片：玻璃卡面（渐变 + 内高光 + 定向投影），亮暗各自成立（受 body[data-dsh-tide-theme] 门控） —— */
body[data-dsh-tide-theme] [data-composer-card] {
  background: var(--dsw-specific-input-major);
  box-shadow: var(--dsw-elevation-soft);
}

body[data-dsh-tide-theme][data-ds-dark-theme] [data-composer-card] {
  border: 0.5px solid rgba(143, 196, 255, 0.18) !important;
  background:
    radial-gradient(circle at 12% 0%, rgba(56, 132, 255, 0.12) 0%, transparent 52%),
    linear-gradient(180deg, rgba(20, 31, 48, 0.95) 0%, rgba(12, 18, 29, 0.97) 100%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.10),
    0 16px 40px -12px rgba(0, 0, 0, 0.75);
}

body[data-dsh-tide-theme][data-ds-dark-theme] [data-composer-card]:focus-within {
  border-color: rgba(143, 196, 255, 0.35) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 0 0 1px rgba(143, 196, 255, 0.20),
    0 20px 48px -10px rgba(0, 0, 0, 0.85);
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [data-composer-card] {
  border: 0.5px solid rgba(29, 108, 240, 0.14) !important;
  background:
    radial-gradient(circle at 12% 0%, rgba(29, 108, 240, 0.05) 0%, transparent 52%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(244, 248, 254, 0.96) 100%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow:
    inset 0 1px 0 #ffffff,
    0 2px 8px -2px rgba(24, 38, 64, 0.04),
    0 16px 40px -12px rgba(24, 38, 64, 0.12);
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [data-composer-card]:focus-within {
  border-color: rgba(29, 108, 240, 0.30) !important;
  box-shadow:
    inset 0 1px 0 #ffffff,
    0 0 0 1px rgba(29, 108, 240, 0.16),
    0 20px 48px -12px rgba(24, 38, 64, 0.18);
}

/* —— 全局滚动条：窄、圆、同色相（受 body[data-dsh-tide-theme] 门控） —— */
body[data-dsh-tide-theme] ::-webkit-scrollbar,
body[data-dsh-tide-theme]::-webkit-scrollbar { width: 10px; height: 10px; }
body[data-dsh-tide-theme] ::-webkit-scrollbar-thumb,
body[data-dsh-tide-theme]::-webkit-scrollbar-thumb {
  border: 3px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
  background-color: var(--dsw-alias-scrollbar-bg-l2);
}
body[data-dsh-tide-theme] ::-webkit-scrollbar-thumb:hover,
body[data-dsh-tide-theme]::-webkit-scrollbar-thumb:hover { background-color: var(--dsw-alias-scrollbar-hover-l2); }
body[data-dsh-tide-theme] ::-webkit-scrollbar-track,
body[data-dsh-tide-theme]::-webkit-scrollbar-track { background: transparent; }

/* —— 选区：品牌蓝同源（受 body[data-dsh-tide-theme] 门控） —— */
body[data-dsh-tide-theme] ::selection {
  background: var(--dsw-alias-interactive-bg-active, #1d6cf033);
}


/* —— dock 控件行 —— */
/* 模型 + 思考等级注册在行动行左侧（conversation.input.left，紧挨 + 与权限），
 * 原生模型控件（ModelSelect）在 standardControls 容器中隐藏；原生权限保留。
 * 底栏 dock 只保留统计 HUD。 */
/* 精准隐藏原生 ModelSelect：只在替代模型座存在时，在 standardControls 容器内定位具有 aria-haspopup="menu" 且含有直接 triggerLabel/triggerIcon 后缀子元素的 button，不隐藏父容器，不用 data-slot 唯一定位 */
[data-composer-seat]:has([data-dsh-tide-seat="model"]) [class*='standardControls'] button[aria-haspopup='menu']:has(> :is([class*='triggerLabel'], [class*='triggerIcon'])) {
  display: none !important;
}

/* 摊平成行内项：权限组钉左、模型组钉右，中间统计项自然聚簇居中 */
[data-dsh-tide-dock],
[data-dsh-tide-hero-host] {
  display: contents;
}

/* dock 底栏独立成岛：与输入卡片保持 8px 呼吸间隙，等宽对齐 */
[data-composer-dock]:has([data-dsh-tide-dock-center]) {
  box-sizing: border-box;
  width: var(--dsh-tide-card-width, 100%) !important;
  max-width: 100%;
  margin-left: auto;
  margin-right: auto;
  margin-top: 8px !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  align-self: stretch;
  min-width: 0;
  container-type: inline-size;
  margin-bottom: calc(var(--dsh-composer-side-clearance, 16px) - 4px);
  position: relative;
}

[data-composer-seat]:has([data-dsh-tide-dock-center]) {
  align-self: stretch;
  width: 100%;
  min-width: 0;
}

/* 隐藏原生底部统计胶囊与上下文环，由本插件的平铺状态栏接管；门控严格基于 center */
[data-composer-dock]:has([data-dsh-tide-dock-center]) [data-composer-stat],
[data-composer-dock]:has([data-dsh-tide-dock-center]) > span:has(> button > svg) {
  display: none !important;
}

[data-dsh-tide-dock-left],
[data-dsh-tide-dock-right] {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

/* 控件与卡片圆角末梢对齐：内缩等于卡片圆角半径，视觉上从直边开始 */
[data-dsh-tide-dock-left] { padding-left: var(--dsh-tide-dock-inset-x, 20px); }
[data-dsh-tide-dock-left]:empty,
[data-dsh-tide-dock-right]:empty { display: none; }
[data-composer-dock] :where(div, span):has([data-dsh-tide-dock-center]) { flex: 1 1 100%; width: 100%; min-width: 0; display: flex; }
[data-dsh-tide-dock-right] { padding-right: var(--dsh-tide-dock-inset-x, 20px); }

/* —— 输入框行动行内的模型/权限座位 —— */
[data-dsh-tide-seat] {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}

/* 座位里的原生按钮与插件按钮同规格：28px 高、13px 字号、透明底。 */
[data-dsh-tide-seat] > [data-dsh-tide-dock-root] { display: inline-flex; align-items: center; gap: 2px; }

/* 两侧等分：中间统计簇才能以卡片中心对齐（不等分时会被宽的一侧挤偏） */
[data-dsh-tide-dock-left] {
  order: -1;
  flex: 1 1 0;
  justify-content: flex-start;
}

/* 中间平铺统计栏容器 */
[data-dsh-tide-dock-center] {
  order: 0;
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  position: relative;
  container-type: inline-size;
}

/* 主题风格层：开关打开时（body 带 data-dsh-tide-theme）三个组件套用插件自有的
 * 冰蓝玻璃材质——径向微光 + 定向双层投影 + 发丝描边；关闭时上面的原生 token 值生效，
 * 与 DSH 完全一致。明暗两套各自成立，色相体系同源。 */
body[data-dsh-tide-theme] .dsh-tide-dock-stats-trigger {
  border: 0.5px solid var(--dsh-tide-glass-border);
  background: var(--dsh-tide-glass-surface);
  backdrop-filter: var(--dsh-tide-glass-blur);
  -webkit-backdrop-filter: var(--dsh-tide-glass-blur);
  box-shadow: var(--dsh-tide-glass-shadow);
}

body[data-dsh-tide-theme] .dsh-tide-dock-stats-trigger:hover {
  border-color: var(--dsh-tide-glass-border-hover);
  box-shadow: var(--dsh-tide-glass-shadow-hover);
}

/* 展开态在主题开启时保持玻璃底色，不回落到 token 表面 */
body[data-dsh-tide-theme] .dsh-tide-dock-stats-trigger[aria-expanded='true'] {
  background: var(--dsh-tide-glass-surface);
  border-color: var(--dsh-tide-glass-border-hover);
}

/* 底栏 HUD：单行内联胶囊条，完全对齐宿主原生 TodoPanel 的形制与材质。
 * 不再造"仪表盘"：无两行大数字、无列均分、无 56px 高度浪费，
 * 只是一行 36px 的静默状态条，点击展开完整看板浮窗。 */
.dsh-tide-dock-stats-trigger {
  appearance: none;
  position: relative;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: 0;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  min-height: 36px;
  padding: 0 8px;
  /* 宿主 TodoPanel 实测：radius-lg(16px) + elevation-panel + border:0 */
  border-radius: var(--dsw-radius-lg, 16px);
  border: 0;
  background: var(--dsw-specific-menu);
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(20px));
  -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter, blur(20px));
  color: var(--dsw-alias-label-secondary);
  font-family: Inter, var(--dsw-font-family), -apple-system, system-ui, sans-serif;
  font-size: var(--dsw-font-xs-13-font-size, 13px);
  line-height: var(--dsw-font-xs-13-line-height, 20px);
  font-weight: var(--dsw-font-xs-13-font-weight, 400);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  user-select: none;
  outline: none;
  box-shadow: var(--dsw-elevation-panel);
  transition: background 0.16s ease, color 0.16s ease;
}

.dsh-tide-dock-stats-trigger:hover {
  background: var(--dsw-alias-interactive-bg-hover-solid);
  color: var(--dsw-alias-label-primary);
}

.dsh-tide-dock-stats-trigger:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: -2px;
}

.dsh-tide-dock-stats-trigger[aria-expanded='true'],
.dsh-tide-dock-stats-trigger:active {
  background: var(--dsw-alias-interactive-bg-active);
  color: var(--dsw-alias-label-primary);
}

/* 指标项：单行流式内联排布，读数与标签同排，间距由父级 gap 控制。 */
.dsh-tide-stat-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 0 10px;
  box-sizing: border-box;
  position: relative;
  white-space: nowrap;
}

/* 列间发丝分隔：与宿主 TodoPanel 行间分隔同源 */
.dsh-tide-stat-item:not(:first-child)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 25%;
  bottom: 25%;
  width: 0.5px;
  background: var(--dsw-alias-border-l1);
}

/* 原生 DSH 环形仪表 */
.dsh-tide-meter-ring {
  display: inline-block;
  vertical-align: middle;
  flex: none;
  color: var(--dsw-alias-state-business-primary);
}
.dsh-tide-meter-ring.is-good {
  color: var(--dsw-alias-state-success-primary);
}
.dsh-tide-meter-ring.is-warn {
  color: var(--dsw-alias-state-warn-primary);
}
.dsh-tide-meter-ring.is-bad {
  color: var(--dsw-alias-state-error-primary);
}

/* 读数：13px 与标签同级（DSH TodoPanel 标题规格），不再是大号仪表数字 */
.dsh-tide-hud-number {
  font-size: var(--dsw-font-xs-13-font-size, 13px);
  line-height: var(--dsw-font-xs-13-line-height, 20px);
  font-weight: 500;
  font-family: Inter, var(--dsw-font-family), -apple-system, system-ui, sans-serif;
  color: var(--dsw-alias-label-primary);
  font-variant-numeric: tabular-nums;
}

.dsh-tide-hud-unit {
  font-size: var(--dsw-font-xxxs-11-font-size, 11px);
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
}

/* 上下文百分比：语义色文字，不再造胶囊 */
.dsh-tide-hud-percent {
  font-size: var(--dsw-font-xxxs-11-font-size, 11px);
  line-height: 16px;
  font-weight: 500;
  margin-left: 2px;
  color: var(--dsw-alias-state-success-primary);
}

.dsh-tide-hud-percent[data-bucket='warn'] {
  /* 浅色下 warn-label 偏黄绿难分辨，与全插件同一基准：#d97706 */
  color: var(--dsw-alias-state-warn-primary, #d97706);
}

.dsh-tide-hud-percent[data-bucket='bad'] {
  color: var(--dsw-alias-state-error-primary);
}

/* 窄屏分档：五项自然宽度实测约 748px，因此全显档下限设在 760px。
 * 640–759.9px 隐藏次要指标（会话规模/TPS），剩三项约 450px；
 * 451–639.9px 进一步隐藏缓存命中，只留上下文与耗时；
 * ≤450px 由 flex 收缩兜底。避免任何档位出现读数省略号截断。 */
@container (max-width: 759.9px) {
  .dsh-tide-stat-item {
    padding: 0 8px;
  }
  .dsh-tide-stat-item.is-activity,
  .dsh-tide-stat-item.is-tps {
    display: none;
  }
  .dsh-tide-stat-item:not(:first-child)::before {
    display: none;
  }
}

@container (max-width: 639.9px) {
  .dsh-tide-stat-item.is-cache {
    display: none;
  }
}

.dsh-tide-stat-item-main {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  min-width: 0;
}

.dsh-tide-hud-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  /* 图标尺寸由 svg 的 width/height 决定，不再用 10px 这种非标准字号。 */
  line-height: 1;
  color: var(--dsw-alias-label-tertiary);
}

.dsh-tide-hud-icon.is-flash { color: var(--dsw-alias-state-warn-primary); }
.dsh-tide-hud-icon.is-cache { color: var(--dsw-alias-state-business-primary); }

.dsh-tide-hud-val {
  display: inline-block;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* 频谱装饰：低亮度等宽柱形，不闪动、不冒充实时采样。 */
.dsh-tide-eq {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 11px;
  padding-bottom: 1px;
  opacity: 0.75;
}

.dsh-tide-eq-bar {
  width: 2px;
  border-radius: 1px;
  background: var(--dsw-alias-state-success-primary);
  opacity: 0.75;
}

.dsh-tide-eq-bar:nth-child(1) { height: 35%; }
.dsh-tide-eq-bar:nth-child(2) { height: 95%; }
.dsh-tide-eq-bar:nth-child(3) { height: 60%; }
.dsh-tide-eq-bar:nth-child(4) { height: 80%; }

/* 主题风格层：浮窗本体套用冰蓝玻璃材质（关掉主题开关即回到上面的原生 token 值） */
body[data-dsh-tide-theme] .dsh-tide-stats-popover {
  border: 0.5px solid var(--dsh-tide-glass-border);
  background: var(--dsh-tide-glass-surface);
  backdrop-filter: var(--dsh-tide-glass-blur);
  -webkit-backdrop-filter: var(--dsh-tide-glass-blur);
  box-shadow: var(--dsh-tide-glass-shadow-panel);
}

/* 浮窗内层卡片：主题开启时用同源玻璃卡面，关闭时回到原生 bg-layer-2 */
body[data-dsh-tide-theme] .dsh-tide-stats-card {
  border: 0.5px solid var(--dsh-tide-card-border);
  background: var(--dsh-tide-card-surface);
  box-shadow: var(--dsh-tide-glass-shadow-card);
}

/* 开态 hover：卡片边框与描边同步提亮，保证有可感知反馈（B1） */
body[data-dsh-tide-theme] .dsh-tide-stats-card:hover {
  border-color: var(--dsh-tide-card-border-hover);
}

body[data-dsh-tide-theme] .dsh-tide-stats-detail-list {
  border: 0.5px solid var(--dsh-tide-card-border);
  background: var(--dsh-tide-card-surface);
  box-shadow: var(--dsh-tide-glass-shadow-card);
}

/* —— 性能看板浮层：直接消费 DSH 原生菜单/浮层 token，随宿主明暗自动适配 —— */
.dsh-tide-stats-popover {
  position: fixed;
  z-index: 1000;
  width: 400px;
  max-width: calc(100vw - 32px);
  box-sizing: border-box;
  padding: 16px 18px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-lg, 16px);
  background: var(--dsw-specific-menu);
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(20px));
  -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter, blur(20px));
  box-shadow: var(--dsw-elevation-panel);
  color: var(--dsw-alias-label-primary);
  font-size: var(--dsw-font-xxs-12-font-size, 12px);
  line-height: var(--dsw-font-xxs-12-line-height, 18px);
  animation: dsh-stats-popover-in 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes dsh-stats-popover-in {
  from { opacity: 0; transform: translateY(6px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.dsh-tide-stats-popover-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
}

.dsh-tide-stats-popover-title {
  display: inline-flex;
  align-items: center;
  font-size: var(--dsw-font-xs-13-font-size, 13px);
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}

.dsh-tide-stats-popover-title::before {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--dsw-alias-state-business-primary);
  margin-right: 8px;
  flex: none;
}

.dsh-tide-stats-popover-badge {
  padding: 2px 9px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font-size: var(--dsw-font-xxxs-11-font-size, 11px);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.dsh-tide-stats-popover-badge[data-bucket='good'] {
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 40%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);
  color: var(--dsw-alias-state-success-primary);
}

.dsh-tide-stats-popover-badge[data-bucket='warn'] {
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);
  color: var(--dsw-alias-state-warn-label);
}

.dsh-tide-stats-popover-badge[data-bucket='bad'] {
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);
  color: var(--dsw-alias-state-error-primary);
}

/* 进度条区块 */
.dsh-tide-stats-section {
  margin-bottom: 14px;
}

.dsh-tide-stats-progress-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 7px;
  color: var(--dsw-alias-label-secondary, #9fb0c9);
  font-size: 12px;
}

.dsh-tide-stats-progress-header strong {
  color: var(--dsw-alias-label-primary, #e8eef8);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.dsh-tide-stats-progress-track {
  display: flex;
  width: 100%;
  height: 7px;
  gap: 2px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--dsw-alias-interactive-bg-active);
}

.dsh-tide-stats-progress-fill {
  height: 100%;
  background: var(--dsw-alias-state-business-primary);
  border-radius: 999px;
  transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.dsh-tide-stats-progress-fill[data-bucket='good'] {
  background: var(--dsw-alias-state-success-primary);
}

.dsh-tide-stats-progress-fill[data-bucket='warn'] {
  background: var(--dsw-alias-state-warn-primary);
}

.dsh-tide-stats-progress-fill[data-bucket='bad'] {
  background: var(--dsw-alias-state-error-primary);
}

.dsh-tide-stats-progress-fill.is-segment {
  border-radius: 1px;
  min-width: 2px;
}

.dsh-tide-stats-progress-fill.is-system { background: var(--dsw-alias-label-dimmed); }
.dsh-tide-stats-progress-fill.is-tools { background: var(--dsw-alias-label-primary-bluish); }
.dsh-tide-stats-progress-fill.is-messages { background: var(--dsw-alias-state-business-primary); }

.dsh-tide-stats-breakdown-legend {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 7px;
  color: var(--dsw-alias-label-tertiary, #8aa0bd);
  font-size: 11px;
}

.dsh-tide-legend-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.dsh-tide-legend-chip::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 999px;
  display: inline-block;
}

.dsh-tide-legend-chip.is-system::before { background: var(--dsw-alias-label-dimmed); }
.dsh-tide-legend-chip.is-tools::before { background: var(--dsw-alias-label-primary-bluish); }
.dsh-tide-legend-chip.is-messages::before { background: var(--dsw-alias-state-business-primary); }

.dsh-tide-stats-progress-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 7px;
  color: var(--dsw-alias-label-tertiary, #7b8ca6);
  font-size: 11px;
}

/* 2x2 指标卡片网格 */
.dsh-tide-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
}

.dsh-tide-stats-card {
  display: flex;
  flex-direction: column;
  padding: 11px 13px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-md, 12px);
  background: var(--dsw-alias-bg-layer-2);
  box-shadow: var(--dsw-elevation-soft);
  transition: border-color 0.16s ease, background 0.16s ease;
}

.dsh-tide-stats-card:hover {
  border-color: var(--dsw-alias-border-l2);
}

.dsh-tide-stats-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.dsh-tide-hud-mini-track {
  width: 100%;
  height: 3px;
  margin-top: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--dsw-alias-interactive-bg-active);
}

.dsh-tide-hud-mini-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}

.dsh-tide-hud-mini-fill.is-cache {
  background: var(--dsw-alias-state-success-primary);
}

.dsh-tide-stats-card-k {
  margin-bottom: 3px;
  color: var(--dsw-alias-label-secondary);
  font-size: var(--dsw-font-xxxs-11-font-size, 11px);
  font-weight: 500;
}

.dsh-tide-stats-card-v {
  color: var(--dsw-alias-label-primary);
  font-size: var(--dsw-font-base-strong-16-font-size, 16px);
  font-weight: 600;
  line-height: var(--dsw-font-base-strong-16-line-height, 20px);
  font-variant-numeric: tabular-nums;
}

.dsh-tide-stats-card-v.is-highlight { color: var(--dsw-alias-label-primary-bluish); }
.dsh-tide-stats-card-v[data-dsh-tide-pct='good'] { color: var(--dsw-alias-state-success-primary); }
.dsh-tide-stats-card-v[data-dsh-tide-pct='warn'] { color: var(--dsw-alias-state-warn-label); }
.dsh-tide-stats-card-v[data-dsh-tide-pct='bad'] { color: var(--dsw-alias-state-error-primary); }

.dsh-tide-stats-card-hint {
  margin-top: 4px;
  color: var(--dsw-alias-label-tertiary);
  font-size: var(--dsw-font-xxxs-11-font-size, 11px);
  line-height: 14px;
}

/* Token 明细列表 */
.dsh-tide-stats-detail-list {
  margin-bottom: 12px;
  padding: 9px 13px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-md, 12px);
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-tide-stats-detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
}

.dsh-tide-stats-detail-row strong {
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family-code, ui-monospace, monospace);
  font-size: 11.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.dsh-tide-stats-detail-row.is-total {
  margin-top: 5px;
  padding-top: 7px;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
}

.dsh-tide-stats-detail-row.is-total strong {
  color: var(--dsw-alias-label-primary);
  font-weight: 700;
}

/* 底部备注 */
.dsh-tide-stats-footer {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #7b8ca6);
  padding-top: 8px;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
}

[data-dsh-tide-dock-right] {
  order: 1;
  flex: 1 1 0;
  justify-content: flex-end;
}

/* 与 DSH 原生 seat 同规格：透明底、无描边，悬停/展开才出现浅灰底 */
[data-dsh-tide-pill] {
  appearance: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  gap: 6px;
  height: 28px;
  padding: 0 8px;
  border-radius: var(--dsw-radius-sm);
  font-size: 13px;
  line-height: 20px;
  min-width: 0;
  max-width: 260px;
}

[data-dsh-tide-pill]:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

/* 展开态用品牌色淡染，比 hover 更醒目但仍无描边（悬停时也保持淡染） */
[data-dsh-tide-pill][aria-expanded='true'],
[data-dsh-tide-pill][aria-expanded='true']:hover:not(:disabled) {
  background: color-mix(in srgb, var(--dsh-tide-provider-color, var(--dsw-alias-state-business-primary)) 10%, transparent);
  color: var(--dsw-alias-label-primary);
}

[data-dsh-tide-pill]:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: -1px;
}

[data-dsh-tide-pill]:disabled {
  color: var(--dsw-alias-label-dimmed);
  cursor: default;
}

[data-dsh-tide-pill-label] {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-dsh-tide-pill-glyph] {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dsh-tide-provider-color, var(--dsw-alias-state-business-primary));
}

/* 权限按风险等级着色：只读=安全、工作区=常规、完全权限=危险、自动审查=实验 */
[data-dsh-tide-control='permission'][data-dsh-tide-risk='safe'] [data-dsh-tide-pill-glyph] {
  background: var(--dsw-alias-state-success-primary);
}

[data-dsh-tide-control='permission'][data-dsh-tide-risk='danger'] {
  color: var(--dsw-alias-label-error);
}

[data-dsh-tide-control='permission'][data-dsh-tide-risk='danger'] [data-dsh-tide-pill-glyph] {
  background: var(--dsw-alias-state-error-primary);
}



[data-dsh-tide-control='permission'][data-dsh-tide-risk='experimental'] [data-dsh-tide-pill-glyph] {
  background: var(--dsw-alias-state-warn-primary);
}

[data-dsh-tide-pill-caret] {
  flex: none;
  width: 0;
  height: 0;
  border-left: 3px solid transparent;
  border-right: 3px solid transparent;
  border-top: 4px solid var(--dsw-alias-label-caption);
  transition: transform 0.12s ease;
}

[data-dsh-tide-pill][aria-expanded='true'] [data-dsh-tide-pill-caret] {
  transform: rotate(180deg);
}

/* —— 弹层 —— */
[data-dsh-tide-popup] {
  position: fixed;
  z-index: 1100;
  min-width: 200px;
  max-width: min(320px, 100vw - 32px);
  max-height: min(360px, 100vh - 96px);
  overflow: auto;
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  box-shadow: var(--dsw-elevation-panel);
  color: var(--dsw-alias-label-primary);
  padding: 4px;
  font-size: 13px;
  line-height: 20px;
}

/* 模型平铺面板：一供应商一列 */
[data-dsh-tide-model-grid] {
  display: flex;
  box-sizing: border-box;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  width: min(880px, calc(100vw - 32px));
  min-width: 0;
  max-width: calc(100vw - 32px);
  max-height: min(480px, 100vh - 96px);
}

[data-dsh-tide-popup-head] {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 8px 6px;
  margin-bottom: 2px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}

[data-dsh-tide-grid-head] {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 0 2px;
}

[data-dsh-tide-grid-title] {
  font-size: 12px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}

[data-dsh-tide-grid-hint] {
  font-size: 11px;
  color: var(--dsw-alias-label-caption);
}

[data-dsh-tide-grid-columns] {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
  min-height: 0;
}

[data-dsh-tide-column] {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: min(160px, 100%);
  max-width: 260px;
  flex: 1 1 170px;
}

[data-dsh-tide-column] [data-dsh-tide-group] {
  position: static;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  padding: 4px 8px;
  border-radius: var(--dsw-radius-sm);
  background: color-mix(in srgb, var(--dsh-tide-provider-color) 10%, transparent);
  font-size: 12px;
  font-weight: 500;
}

[data-dsh-tide-provider-dot] {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dsh-tide-provider-color);
}

[data-dsh-tide-provider-name] {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsh-tide-provider-color);
}

[data-dsh-tide-column-body] {
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow-y: auto;
  min-height: 0;
  max-height: min(320px, 50vh);
}

[data-dsh-tide-model-grid] [data-dsh-tide-item] {
  padding: 7px 10px;
  border-radius: var(--dsw-radius-sm);
  min-height: 32px;
}

[data-dsh-tide-model-grid] [data-dsh-tide-item]:hover {
  background: color-mix(in srgb, var(--dsh-tide-provider-color) 8%, transparent);
}

[data-dsh-tide-model-grid] [data-dsh-tide-item][data-active='true'] {
  background: color-mix(in srgb, var(--dsh-tide-provider-color) 14%, transparent);
  box-shadow: inset 2px 0 0 var(--dsh-tide-provider-color);
  font-weight: 500;
}

[data-dsh-tide-model-grid] [data-dsh-tide-check] {
  flex: none;
  color: var(--dsh-tide-provider-color);
  font-size: 12px;
}

[data-dsh-tide-model-grid] [data-dsh-tide-item] [data-dsh-tide-badge] {
  background: color-mix(in srgb, var(--dsh-tide-provider-color) 16%, transparent);
  color: var(--dsh-tide-provider-color);
}

[data-dsh-tide-column] + [data-dsh-tide-column] {
  border-left: 1px solid var(--dsw-alias-border-l1);
  padding-left: 8px;
}

[data-dsh-tide-popup] [data-dsh-tide-group] {
  padding: 6px 8px 2px;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  position: sticky;
  top: 0;
  background: var(--dsw-alias-bg-layer-2);
  z-index: 1;
}

[data-dsh-tide-popup] button[data-dsh-tide-item] {
  appearance: none;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 5px 8px;
  border-radius: var(--dsw-radius-sm);
  font: inherit;
}

[data-dsh-tide-popup] button[data-dsh-tide-item]:hover,
[data-dsh-tide-popup] button[data-dsh-tide-item][data-active='true'] {
  background: var(--dsw-alias-interactive-bg-hover);
}

[data-dsh-tide-popup] [data-dsh-tide-item-detail] {
  display: block;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}

[data-dsh-tide-popup] [data-dsh-tide-badge] {
  flex: none;
  font-size: var(--dsw-font-xxxs-11-font-size, 11px);
  padding: 0 4px;
  border-radius: var(--dsw-radius-xs);
  background: var(--dsw-alias-interactive-bg-active);
  color: var(--dsw-alias-label-secondary);
}

[data-dsh-tide-popup] [data-dsh-tide-note] {
  padding: 8px;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}

[data-dsh-tide-popup] [data-dsh-tide-error] {
  color: var(--dsw-alias-state-error-primary);
}

/* 弹层内的选中项：品牌色左侧条 + 品牌色勾选，与浅底 hover 区分 */
[data-dsh-tide-popup] button[data-dsh-tide-item][data-active='true'] {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent);
  box-shadow: inset 2px 0 0 var(--dsw-alias-state-business-primary);
  color: var(--dsw-alias-label-primary);
}

[data-dsh-tide-check] {
  flex: none;
  color: var(--dsw-alias-state-business-primary);
  font-size: 12px;
}

[data-dsh-tide-risk-dot] {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dsw-alias-label-quaternary);
}

[data-dsh-tide-item][data-dsh-tide-risk='safe'] [data-dsh-tide-risk-dot] {
  background: var(--dsw-alias-state-success-primary);
}

[data-dsh-tide-item][data-dsh-tide-risk='danger'] [data-dsh-tide-risk-dot] {
  background: var(--dsw-alias-state-error-primary);
}

[data-dsh-tide-item][data-dsh-tide-risk='experimental'] [data-dsh-tide-risk-dot] {
  background: var(--dsw-alias-state-warn-primary);
}

/* —— 思考等级滑块 —— */
[data-dsh-tide-effort] {
  --dsh-tide-fill: 0%;
  padding: 10px 14px 8px;
  min-width: 260px;
}

[data-dsh-tide-effort-head] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

[data-dsh-tide-effort-title] {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}

[data-dsh-tide-effort-value] {
  flex: none;
  padding: 1px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent);
  color: var(--dsw-alias-state-business-primary);
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
}

[data-dsh-tide-effort-rail] {
  position: relative;
  display: flex;
  align-items: center;
  height: 22px;
}

[data-dsh-tide-effort-slider] {
  appearance: none;
  width: 100%;
  height: 22px;
  margin: 0;
  background: transparent;
  cursor: pointer;
}

[data-dsh-tide-effort-slider]:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
  border-radius: 4px;
}

/* 轨道：已选区间用品牌色填充，剩余区间用底色 */
[data-dsh-tide-effort-slider]::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    var(--dsw-alias-state-business-primary) 0 var(--dsh-tide-fill),
    var(--dsw-alias-border-l2) var(--dsh-tide-fill) 100%
  );
}

[data-dsh-tide-effort-slider]::-moz-range-track {
  height: 6px;
  border-radius: 999px;
  background: var(--dsw-alias-border-l2);
}

[data-dsh-tide-effort-slider]::-moz-range-progress {
  height: 6px;
  border-radius: 999px;
  background: var(--dsw-alias-state-business-primary);
}

[data-dsh-tide-effort-slider]::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  margin-top: -5px;
  border-radius: 50%;
  background: var(--dsw-alias-bg-layer-2);
  border: 2px solid var(--dsw-alias-state-business-primary);
  box-sizing: border-box;
}

[data-dsh-tide-effort-slider]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--dsw-alias-bg-layer-2);
  border: 2px solid var(--dsw-alias-state-business-primary);
  box-sizing: border-box;
}

/* 标签绝对定位在档位比例处，与滑块轨道（两侧各让出半个滑块）对齐 */
[data-dsh-tide-effort-scale] {
  position: relative;
  height: 16px;
  margin: 6px 8px 0;
  font-size: 11px;
  color: var(--dsw-alias-label-caption);
  /* 两端标签的中心也要压在刻度上，允许溢出到弹层内边距 */
  overflow: visible;
}

[data-dsh-tide-effort-scale] > span {
  position: absolute;
  top: 0;
  white-space: nowrap;
}

[data-dsh-tide-effort-scale] > span[data-active='true'] {
  color: var(--dsw-alias-state-business-primary);
  font-weight: 600;
}

/* —— 子代理委派图（结构照 PI-Desktop SubagentTopology） —— */
[data-dsh-tide-delegation-source] { display: none !important; }

.subagent-topology-host {
  display: block;
  margin: 8px 0;
}

.subagent-topology {
  container-type: inline-size;
  display: flex;
  box-sizing: border-box;
  min-width: 0;
  max-width: 1100px;
  margin: 0 auto;
  flex-direction: column;
  padding: 2px 0;
}

/* 主题风格层：委派图三件套（摘要条 / 画布 / 卡片）套用同一套冰蓝玻璃材质。
 * 关闭主题开关后这些规则失效，回落到上面的原生 token 值。 */
body[data-dsh-tide-theme] .subagent-topology-summary,
body[data-dsh-tide-theme] .subagent-topology-detail {
  border: 0.5px solid var(--dsh-tide-glass-border);
  background: var(--dsh-tide-glass-surface);
  backdrop-filter: var(--dsh-tide-glass-blur);
  -webkit-backdrop-filter: var(--dsh-tide-glass-blur);
}

body[data-dsh-tide-theme] .subagent-topology-summary {
  box-shadow: var(--dsh-tide-glass-shadow);
}

body[data-dsh-tide-theme] .subagent-topology-summary:hover {
  border-color: var(--dsh-tide-glass-border-hover);
  box-shadow: var(--dsh-tide-glass-shadow-hover);
}

body[data-dsh-tide-theme] .subagent-topology-detail {
  box-shadow: var(--dsh-tide-glass-shadow-panel);
}

body[data-dsh-tide-theme] .subagent-topology-root,
body[data-dsh-tide-theme] .subagent-topology-node {
  border: 0.5px solid var(--dsh-tide-card-border);
  background: var(--dsh-tide-card-surface);
  box-shadow: var(--dsh-tide-glass-shadow-card);
}

body[data-dsh-tide-theme] .subagent-topology-root:hover,
body[data-dsh-tide-theme] .subagent-topology-node:hover {
  border-color: var(--dsh-tide-card-border-hover);
}

body[data-dsh-tide-theme][data-ds-dark-theme] .subagent-topology-root-icon {
  border-color: rgba(143, 196, 255, 0.24);
  background: linear-gradient(145deg, rgba(90, 162, 255, 0.2) 0%, rgba(40, 90, 190, 0.1) 100%);
  box-shadow: 0 2px 8px rgba(56, 132, 255, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) .subagent-topology-root-icon {
  border-color: rgba(29, 108, 240, 0.24);
  background: linear-gradient(145deg, rgba(29, 108, 240, 0.14) 0%, rgba(29, 108, 240, 0.05) 100%);
  box-shadow: inset 0 1px 0 #ffffff;
}

/* 摘要行：与浮窗面板、HUD 底栏同源，全部消费 DSH 原生 token */
.subagent-topology-summary {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  padding: 8px 14px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-lg, 16px);
  background: var(--dsw-specific-menu);
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(20px));
  -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter, blur(20px));
  box-shadow: var(--dsw-elevation-soft);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.subagent-topology-summary:hover {
  border-color: var(--dsw-alias-border-l2);
  box-shadow: var(--dsw-elevation-panel);
}

.subagent-topology-summary:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #2563eb);
  outline-offset: 1px;
}

.subagent-topology-summary-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary-bluish);
}

.subagent-topology-summary-label {
  flex: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}

.subagent-topology-summary-counts {
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary, #758ba8);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.subagent-topology-summary-alert {
  color: var(--dsw-alias-state-error-primary);
  font-weight: 500;
}

.subagent-topology-summary-chevron {
  display: inline-flex;
  flex: none;
  margin-left: auto;
  color: var(--dsw-alias-label-tertiary, #758ba8);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.subagent-topology-summary[aria-expanded='true'] .subagent-topology-summary-chevron {
  transform: rotate(180deg);
}

/* —— Agent Graph 画布：与浮窗面板同源，全部消费 DSH 原生 token —— */
.subagent-topology-detail {
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  margin-top: 6px;
  padding: 24px 20px 22px;
  container-type: inline-size;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-lg, 16px);
  overflow: hidden;
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: var(--dsw-elevation-panel);
}

/* 彻底移除方格蓝图纸底纹：与全局 Bento 磨砂质感统一，不造违和的方格杂烩感 */
.subagent-topology-detail::before {
  display: none !important;
}

.subagent-topology.is-collapsed .subagent-topology-detail { display: none; }

.subagent-topology-stage {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 36px;
}

/* 主枢纽：Bento 卡片标准，与子代理卡片、浮窗指标卡同源 */
.subagent-topology-root {
  position: relative;
  z-index: 2;
  display: inline-flex;
  box-sizing: border-box;
  width: 320px;
  min-width: 0;
  max-width: 100%;
  min-height: 88px;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-md, 12px);
  background: var(--dsw-alias-bg-layer-2);
  box-shadow: var(--dsw-elevation-soft);
  transition: box-shadow 0.24s ease, border-color 0.24s ease;
}

.subagent-topology-root:hover {
  border-color: var(--dsw-alias-border-l2);
  box-shadow: var(--dsw-elevation-panel);
}

/* 移除悬空无指引的向上大箭头 */
.subagent-orchestrator-arrow {
  display: none !important;
}

.subagent-root-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.subagent-active-chip {
  flex: none;
  padding: 1px 7px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary) 40%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 16%, transparent);
  color: var(--dsw-alias-state-success-primary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 16px;
}

.subagent-active-chip[data-running="true"] {
  animation: dsh-chip-pulse 1.8s ease-in-out infinite alternate;
}

@keyframes dsh-chip-pulse {
  from { opacity: 0.82; box-shadow: 0 0 0 rgba(56, 214, 138, 0); }
  to { opacity: 1; box-shadow: 0 0 8px rgba(56, 214, 138, 0.45); }
}

.subagent-root-sub {
  margin-top: 3px;
  color: var(--dsw-alias-label-secondary, #a6b5cd);
  font-size: 12px;
  line-height: 18px;
  letter-spacing: 0;
}

.subagent-topology-root-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 9px;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary-bluish);
}

/* 子代理卡片：列数跟随真实成员数，单个子代理占满整行宽度而不是 1/4。 */
.subagent-topology-agents {
  position: relative;
  z-index: 2;
  display: grid;
  width: 100%;
  min-width: 0;
  /* 卡片宽度固定上限 220px 并按列居中排布：
   * 纯 1fr 会让单张卡铺满整行、两张各占一半，窗口越宽拉伸越夸张，
   * 与主 agent 那张固定尺寸的卡放在一起比例完全失衡。 */
  grid-template-columns: repeat(var(--dsh-tide-agent-cols, 4), minmax(0, 220px));
  justify-content: center;
  gap: 18px;
}

.subagent-topology-agents[data-count='1'] { --dsh-tide-agent-cols: 1; }
.subagent-topology-agents[data-count='2'] { --dsh-tide-agent-cols: 2; }
.subagent-topology-agents[data-count='3'] { --dsh-tide-agent-cols: 3; }
.subagent-topology-agents[data-count='4'] { --dsh-tide-agent-cols: 4; }

@container (max-width: 839px) {
  .subagent-topology-agents {
    grid-template-columns: repeat(min(var(--dsh-tide-agent-cols, 4), 2), minmax(0, 220px));
    gap: 14px;
  }
}

@container (max-width: 479px) {
  .subagent-topology-agents {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
}

/* 连线画在舞台层，位于卡片之下。 */
.subagent-topology-lines {
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
  pointer-events: none;
}

.subagent-topology-lines path {
  stroke: var(--dsw-alias-border-l3);
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 5 4;
}

@keyframes dsh-topology-dash {
  to { stroke-dashoffset: -18; }
}

/* 有子代理在跑：连线加亮并让虚线流动，颜色走业务主色 token。 */
.subagent-topology:has(.outcome-running) .subagent-topology-lines path {
  stroke: var(--dsw-alias-state-business-primary);
  animation: dsh-topology-dash 1.1s linear infinite;
}

/* 连线发光是插件主题语言，仅在主题开启时叠加 */
body[data-dsh-tide-theme] .subagent-topology:has(.outcome-running) .subagent-topology-lines path {
  filter: drop-shadow(0 0 3px rgba(90, 170, 255, 0.7));
}

@media (prefers-reduced-motion: reduce) {
  .subagent-topology:has(.outcome-running) .subagent-topology-lines path { animation: none; }
  .subagent-active-chip[data-running="true"] { animation: none; }
}

.subagent-topology-node {
  position: relative;
  min-width: 0;
  margin: 0;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-md, 12px);
  background: var(--dsw-alias-bg-layer-2);
  box-shadow: var(--dsw-elevation-soft);
  transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease, border-color 0.18s ease;
}

.subagent-topology-node:hover {
  border-color: var(--dsw-alias-border-l2);
  transform: translateY(-2px);
  box-shadow: var(--dsw-elevation-panel);
}

.subagent-topology-node-actions { position: relative; }

.subagent-topology-node-header {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  box-sizing: border-box;
  min-height: 194px;
  padding: 14px;
  border: none;
  border-radius: inherit;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #9fb0c9);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

/* 顶行：方形图标在左，状态芯片靠右。 */
.subagent-topology-node-top {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: flex-start;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 9px;
}

.subagent-topology-node-header:hover { background: var(--dsw-alias-interactive-bg-hover); }
.subagent-topology-node-header:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-alias-state-business-primary, #3884ff);
  outline-offset: -2px;
}

.subagent-topology-node-title-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.subagent-topology-node-title {
  display: -webkit-box;
  min-width: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-primary, #e8eef8);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.subagent-topology-node-model {
  display: inline-flex;
  align-self: flex-start;
  min-width: 0;
  max-width: 100%;
  margin-top: 8px;
  padding: 1px 6px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 5px;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font-family: var(--dsw-font-family-code, ui-monospace, monospace);
  font-size: 10.5px;
  white-space: nowrap;
}

.subagent-topology-node-model-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.subagent-topology-node-thinking { flex: none; white-space: pre; color: var(--dsw-alias-label-tertiary); }

/* 状态芯片：右上角常驻，替代原先挤在标题行里的纯文字。 */
.subagent-topology-status-badge {
  display: flex;
  flex: none;
  align-items: center;
}

.subagent-topology-node-status {
  flex: none;
  padding: 2px 8px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.subagent-topology-node.outcome-running .subagent-topology-node-status {
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 40%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);
  color: var(--dsw-alias-state-success-primary);
  font-weight: 600;
}

.subagent-topology-node.outcome-failed .subagent-topology-node-status {
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 42%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);
  color: var(--dsw-alias-state-error-primary);
  font-weight: 600;
}

.subagent-topology-node.outcome-denied .subagent-topology-node-status {
  border-color: var(--dsw-alias-border-l2);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font-weight: 500;
}

.subagent-topology-node.outcome-mixed .subagent-topology-node-status {
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 42%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);
  color: var(--dsw-alias-state-warn-label);
  font-weight: 600;
}

.subagent-topology-node.outcome-unknown .subagent-topology-node-status {
  border-color: var(--dsw-alias-border-l2);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-tertiary);
  font-weight: 500;
}

/* 文字列：标题行在上，模型徽标与 Checklist 依次下排。 */
.subagent-topology-root-copy,
.subagent-topology-node-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.subagent-topology-root-copy [data-dsh-tide-root-title] {
  overflow: hidden;
  color: var(--dsw-alias-label-primary, #e8eef8);
  font-size: 17px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.01em;
}

/* 方形 Agent 图标：每类一个专属发光色。 */
.subagent-topology-avatar {
  position: relative;
  display: inline-flex;
  width: 44px;
  height: 44px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
}

body[data-dsh-tide-theme] .subagent-topology-avatar {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

/* 头像配色属于插件主题风格：仅主题开启时生效，关闭后回落到中性 token 外观 */
body[data-dsh-tide-theme][data-ds-dark-theme] .subagent-topology-avatar.is-purple {
  border: 1px solid rgba(168, 132, 255, 0.4);
  background: linear-gradient(150deg, rgba(168, 132, 255, 0.3) 0%, rgba(120, 80, 220, 0.12) 100%);
  color: #c4a9ff;
  box-shadow: 0 0 12px rgba(168, 132, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

body[data-dsh-tide-theme][data-ds-dark-theme] .subagent-topology-avatar.is-green {
  border: 1px solid rgba(74, 222, 158, 0.38);
  background: linear-gradient(150deg, rgba(74, 222, 158, 0.28) 0%, rgba(20, 150, 100, 0.12) 100%);
  color: #6ee7b7;
  box-shadow: 0 0 12px rgba(74, 222, 158, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

body[data-dsh-tide-theme][data-ds-dark-theme] .subagent-topology-avatar.is-orange {
  border: 1px solid rgba(251, 178, 74, 0.38);
  background: linear-gradient(150deg, rgba(251, 178, 74, 0.28) 0%, rgba(190, 120, 20, 0.12) 100%);
  color: #fbd38d;
  box-shadow: 0 0 12px rgba(251, 178, 74, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

body[data-dsh-tide-theme][data-ds-dark-theme] .subagent-topology-avatar.is-blue {
  border: 1px solid rgba(110, 168, 255, 0.4);
  background: linear-gradient(150deg, rgba(110, 168, 255, 0.3) 0%, rgba(40, 100, 200, 0.12) 100%);
  color: var(--dsw-alias-label-primary-bluish);
  box-shadow: 0 0 12px rgba(110, 168, 255, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

/* 未开启主题时，头像用中性 token 外观（与 DSH 原生图标一致） */
.subagent-topology-avatar {
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
}

.subagent-topology-avatar > svg { width: 26px; height: 26px; }
.subagent-topology-root-icon svg { width: 34px; height: 34px; }

/* Checklist：卡片底部的任务进度清单。 */
.subagent-topology-checklist {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
}

.subagent-checklist-item {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 6px;
  color: var(--dsw-alias-label-tertiary, #8aa0bd);
  font-size: 11px;
  line-height: 15px;
}

.subagent-checklist-item.is-error {
  color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 70%, var(--dsw-alias-label-primary));
}

.subagent-check-icon {
  flex: none;
  color: var(--dsw-alias-state-success-primary);
  font-size: 9px;
  font-weight: 700;
  line-height: 15px;
}

.subagent-check-icon.is-error { color: var(--dsw-alias-state-error-primary); }

.subagent-topology-node-summary {
  display: -webkit-box;
  min-width: 0;
  margin-top: 5px;
  padding: 4px 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
  border-left: 2px solid var(--dsw-alias-state-error-primary);
  color: var(--dsw-alias-state-error-primary, #dc2626);
  font-size: 11.5px;
  line-height: 16px;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  white-space: normal;
  word-break: break-word;
}

.subagent-topology-node-steps {
  min-width: 0;
  color: var(--dsw-alias-label-tertiary, #8aa0bd);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  line-height: 15px;
  white-space: nowrap;
}

@keyframes dsh-tide-spin { to { transform: rotate(360deg); } }

.subagent-stop-button {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  color: var(--dsw-alias-label-secondary, #4b5563);
  font-size: 11px;
  font-weight: 500;
  line-height: 16px;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
}

.subagent-stop-button:hover {
  border-color: var(--dsw-alias-state-error-primary, #dc2626);
  color: var(--dsw-alias-state-error-primary, #dc2626);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
}

/* 停止按钮浮在卡片右下角，不再撑高卡片内容。 */
.subagent-topology-node-actions:has(> .subagent-stop-button) .subagent-topology-node-header { padding-bottom: 34px; }

/* —— 回合耗时 —— */
[data-dsh-tide-duration] {
  flex: none;
  margin-left: 2px;
  font-size: var(--dsh-content-font-size-secondary, 13px);
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}

/* —— 统计块标签行：图标 + 短标题，弱化显示 —— */
.dsh-tide-stat-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  /* 回到 DSH 的 xxxs-11：常规字重、字距为 0。
   * 之前自造 500 字重 + 0.06em 字距，是另一套界面语言。 */
  font-size: var(--dsw-font-xxxs-11-font-size, 11px);
  line-height: var(--dsw-font-xxxs-11-line-height, 16px);
  font-weight: var(--dsw-font-xxxs-11-font-weight, 400);
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}

.dsh-tide-stat-label .dsh-tide-hud-icon {
  width: 11px;
  height: 11px;
}

.dsh-tide-stat-label .dsh-tide-hud-icon svg {
  width: 11px;
  height: 11px;
}

.dsh-tide-stat-label-text {
  overflow: hidden;
  max-width: 9em;
  text-overflow: ellipsis;
}

/* —— dock 统计项的百分比配色 —— */
[data-dsh-tide-pct='good'] {
  color: var(--dsw-alias-state-success-primary);
}

[data-dsh-tide-pct='warn'] {
  /* 宿主 --dsw-alias-state-warn-label 在浅色主题里偏黄绿，和成功色难以区分；
     这里用明确的琥珀色，保证 50–75% 一眼能读成「该注意了」。 */
  color: #d97706;
}

[data-dsh-tide-pct='bad'] {
  color: var(--dsw-alias-state-error-primary);
}

body[data-ds-dark-theme] [data-dsh-tide-pct='warn'] { color: #ffc46b; }

/* 上下文环：文字配色之外同步描边，避免出现「彩色数字 + 灰环」 */
[data-dsh-tide-pct][data-dsh-tide-pct-kind='context'] svg *[class*='fill'] {
  stroke: currentColor;
}

/* —— 侧栏归档 tabs —— */
[data-dsh-tide-tabs] {
  display: flex;
  align-items: stretch;
  gap: 2px;
  padding: 0 8px 4px;
}

[data-dsh-tide-tabs][hidden] {
  display: none;
}

[data-dsh-tide-tab] {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font-size: 12px;
  line-height: 18px;
  padding: 3px 8px;
  border-radius: var(--dsw-radius-sm);
  position: relative;
}

[data-dsh-tide-tab]:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

[data-dsh-tide-tab][data-active='true'] {
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

[data-dsh-tide-tab][data-active='true']::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 0;
  height: 2px;
  border-radius: 1px;
  background: var(--dsw-alias-state-business-primary);
}

[data-sidebar-collapsed] [data-dsh-tide-tabs] {
  display: none;
}

/* —— 工作区列表降噪（受 body[data-dsh-tide-theme] 门控） —— */
body[data-dsh-tide-theme] [data-slot='sidebar.workspaces'] [data-row-key] {
  padding-top: 2px;
  padding-bottom: 2px;
}

body[data-dsh-tide-theme] [data-slot='sidebar.workspaces'] [data-row-key^='workspace:'] svg[class*='arrow'] {
  opacity: 0.55;
}

body[data-dsh-tide-theme] [data-slot='sidebar.workspaces'] [data-row-key^='workspace:']:hover svg[class*='arrow'] {
  opacity: 1;
}

[data-dsh-tide-filter-host] {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  height: 34px;
  min-width: 0;
  flex: 0 0 34px;
  gap: 6px;
  margin: 0 4px 6px;
  padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm);
}

[data-dsh-tide-sidebar-header] > span:first-child { margin-right: auto; }
[data-dsh-tide-tabs-host] { flex: none; }
[data-dsh-tide-native-filter] { display: none !important; }
[data-dsh-tide-grouping] {
  appearance: none;
  flex: none;
  max-width: 96px;
  padding: 2px 18px 2px 6px;
  border: none;
  border-radius: var(--dsw-radius-sm);
  background:
    linear-gradient(45deg, transparent 50%, var(--dsw-alias-label-caption) 50%) calc(100% - 10px) 50% / 4px 4px no-repeat,
    linear-gradient(135deg, var(--dsw-alias-label-caption) 50%, transparent 50%) calc(100% - 6px) 50% / 4px 4px no-repeat,
    var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font-size: 11px;
}

[data-dsh-tide-grouping]:hover {
  color: var(--dsw-alias-label-primary);
}
[data-dsh-tide-dock-right] > [data-dsh-tide-dock-root] {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

/* 模型与思考等级之间的分隔点：两侧留出呼吸间隙，避免贴住按钮描边 */
[data-dsh-tide-separator] {
  flex: none;
  padding: 0 4px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 16px;
  user-select: none;
}
[data-dsh-tide-control='effort'] { flex: none; }
[data-dsh-tide-control='model'] { max-width: 240px; }

[data-dsh-tide-filter] {
  appearance: none;
  border: none;
  outline: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  line-height: 18px;
  min-width: 0;
  width: 100%;
  padding: 2px 0;
}

[data-dsh-tide-filter]::placeholder {
  color: var(--dsw-alias-label-caption);
}

[data-dsh-tide-filter]:focus-visible {
  box-shadow: inset 0 -1px 0 var(--dsw-alias-state-business-primary);
}
/* —— 工作区列表：密度 / 徽标 / 折叠 / 置顶（受 body[data-dsh-tide-theme] 门控） —— */
body[data-dsh-tide-theme] [data-slot='sidebar.workspaces'] [data-row-key^='workspace:'],
body[data-dsh-tide-theme] [data-slot='sidebar.workspaces'] [data-row-key^='session'] {
  height: 28px;
  min-height: 0;
}

/* 折叠：超出前 N 的组整组隐藏（功能行为，不随主题开关失效） */
[data-dsh-tide-collapsed] {
  display: none;
}
[data-slot='sidebar.workspaces'][data-dsh-tide-filtering] [data-dsh-tide-collapsed] {
  display: block;
}

/* 置顶/分组排序依赖列表容器是 flex 列，order 才会生效。
 * 这是功能布局而非皮肤：绝不能挂在 body[data-dsh-tide-theme] 下，
 * 否则主题关闭或门控时序偏移时置顶会静默失效、退回 DOM 顺序。 */
[data-slot='sidebar.workspaces'] *:has(> [data-dsh-tide-group]) {
  display: flex;
  flex-direction: column;
}

/* 会话数徽标：挂在工作区行末尾的 pseudo 元素上 */
body[data-dsh-tide-theme] [data-slot='sidebar.workspaces'] [data-row-key^='workspace:'][data-dsh-tide-count]::after {
  content: attr(data-dsh-tide-count);
  margin-left: auto;
  padding-left: 6px;
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-caption);
}

/* 折叠/置顶控件 */
[data-dsh-tide-groups-controls] {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  position: relative;
  min-width: 0;
}

[data-dsh-tide-groups-toggle],
[data-dsh-tide-pin-toggle] {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font-size: 11px;
  line-height: 16px;
  padding: 2px 6px;
  border-radius: var(--dsw-radius-sm);
  white-space: nowrap;
}

[data-dsh-tide-groups-toggle]:hover,
[data-dsh-tide-pin-toggle]:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

[data-dsh-tide-groups-toggle][hidden] {
  display: none;
}

[data-dsh-tide-pin-panel] {
  position: fixed;
  z-index: 1100;
  min-width: 180px;
  max-width: 240px;
  max-height: 280px;
  overflow: auto;
  padding: 4px;
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  box-shadow: var(--dsw-elevation-panel);
}

[data-dsh-tide-pin-panel][hidden] {
  display: none;
}

[data-dsh-tide-pin-item] {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  display: block;
  width: 100%;
  text-align: left;
  font-size: 12px;
  line-height: 18px;
  padding: 4px 6px;
  border-radius: var(--dsw-radius-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

[data-dsh-tide-pin-item]:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

[data-dsh-tide-pin-item][data-active='true'] {
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

/* 置顶文件夹行内标识样式（搭配上方独立小节标头） */
[data-dsh-tide-pinned] [data-row-key^='workspace:'] {
  font-weight: 500;
}

[data-dsh-tide-pinned] [data-row-key^='workspace:']::before {
  content: '★ ';
  color: var(--dsw-alias-state-warn-label, #eab308);
  font-size: 11px;
  line-height: 1;
  margin-right: 3px;
  display: inline-block;
  vertical-align: baseline;
  filter: drop-shadow(0 0 3px rgba(234, 179, 8, 0.4));
}

body[data-dsh-tide-theme] [data-slot='sidebar.workspaces'] [data-row-key][data-selected='true'],
body[data-dsh-tide-theme] [data-slot='sidebar.workspaces'] [data-row-key][aria-selected='true'] {
  position: relative;
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 16%, transparent);
  box-shadow: inset 0 1px 0 var(--dsw-alias-border-l1), inset 2px 0 0 var(--dsw-alias-state-business-primary);
}

body[data-dsh-tide-theme] [data-slot='sidebar.workspaces'] [data-row-key][data-selected='true']::before,
body[data-dsh-tide-theme] [data-slot='sidebar.workspaces'] [data-row-key][aria-selected='true']::before {
  content: '';
  position: absolute;
  left: -2px;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 2px;
  background: var(--dsw-alias-state-business-primary, #2563eb);
  box-shadow: 0 0 8px rgba(37, 99, 235, 0.5);
}

/* 侧栏独立小节分区分组（方案 A：Linear / Slack / Notion 风格） */
[data-dsh-tide-section] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--dsw-alias-label-tertiary, #6b7280);
  user-select: none;
}

[data-dsh-tide-section][hidden] {
  display: none !important;
}

[data-dsh-tide-section='pinned'] {
  margin-top: 4px;
  margin-bottom: 2px;
}

[data-dsh-tide-section='unpinned'] {
  margin-top: 10px;
  margin-bottom: 2px;
  padding-top: 10px;
  border-top: 1px dashed var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08));
}

.dsh-tide-section-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.dsh-tide-section-icon {
  font-size: 11px;
  line-height: 1;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.15));
}

.dsh-tide-section-badge {
  font-size: var(--dsw-font-xxxs-11-font-size, 11px);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.05));
  color: var(--dsw-alias-label-tertiary, #6b7280);
}

/* —— 插件可视化设置面板 —— */
.dsh-tide-settings-root {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 680px;
  color: var(--dsw-alias-label-primary, #0f1115);
  font-size: 13px;
  line-height: 20px;
  padding: 4px 0 16px;
}

.dsh-tide-settings-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08));
}

.dsh-tide-settings-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dsh-tide-settings-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary, #0f1115);
}

.dsh-tide-settings-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--dsw-alias-state-success-subtle, rgba(22, 163, 74, 0.12));
  color: var(--dsw-alias-state-success-primary, #16a34a);
}

.dsh-tide-settings-desc {
  margin: 0;
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary, #6b7280);
}

.dsh-tide-settings-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dsh-tide-settings-card {
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08));
  border-radius: var(--dsw-radius-lg, 12px);
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.dsh-tide-settings-group-title {
  padding: 10px 14px 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--dsw-alias-label-tertiary, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--dsw-alias-interactive-bg-subtle, rgba(0, 0, 0, 0.015));
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.04));
}

.dsh-tide-settings-list {
  display: flex;
  flex-direction: column;
}

.dsh-tide-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 11px 14px;
}

.dsh-tide-settings-row + .dsh-tide-settings-row {
  border-top: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.05));
}

.dsh-tide-settings-row-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.dsh-tide-settings-item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary, #0f1115);
}

.dsh-tide-settings-item-desc {
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary, #6b7280);
  line-height: 16px;
}

/* iOS 风格平滑切换开关 */
.dsh-tide-switch {
  position: relative;
  display: inline-flex;
  flex: none;
  width: 38px;
  height: 22px;
  padding: 2px;
  border-radius: 999px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.1));
  cursor: pointer;
  transition: background 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
}

.dsh-tide-switch:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #2563eb);
  outline-offset: 2px;
}

.dsh-tide-switch[data-active='true'] {
  background: var(--dsw-alias-state-business-primary, #2563eb);
  border-color: var(--dsw-alias-state-business-primary, #2563eb);
}

.dsh-tide-switch-knob {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  transform: translateX(0);
}

.dsh-tide-switch[data-active='true'] .dsh-tide-switch-knob {
  transform: translateX(16px);
}

.dsh-tide-settings-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  font-size: 12px;
}

.dsh-tide-settings-notice {
  color: var(--dsw-alias-state-success-primary, #16a34a);
  font-weight: 500;
}

.dsh-tide-settings-hint {
  color: var(--dsw-alias-label-tertiary, #9ca3af);
}

.dsh-tide-settings-reset-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dsh-tide-settings-reset-btn:hover {
  border-color: var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.25));
  color: var(--dsw-alias-label-primary, #0f1115);
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.04));
}

/* 数值步进器控件 */
.dsh-tide-stepper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--dsw-alias-interactive-bg-subtle, rgba(0, 0, 0, 0.03));
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.1));
  border-radius: 8px;
  padding: 2px 4px;
  flex: none;
}

.dsh-tide-stepper-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--dsw-alias-label-primary, #0f1115);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s ease;
}

.dsh-tide-stepper-btn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.06));
}

.dsh-tide-stepper-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.dsh-tide-stepper-val {
  min-width: 52px;
  text-align: center;
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-primary, #0f1115);
}

/* ============================================================================
 * 亮色主题补齐（追加层，不改上面任何规则）
 *
 * 上面自绘玻璃样式里的半透明白描边/白色填充是按暗色写的；宿主 themes 的
 * layout 会在暗色时给 body 打 data-ds-dark-theme，因此只需为「没有该标记」
 * 的情况补一组亮色值。用 :root:not(:has(...)) 之外更稳的写法：直接写
 * body:not([data-ds-dark-theme]) 前缀，保证只在浅色下生效。
 * ========================================================================== */

/* —— 玻璃浮层：浅色配方 —— */
body:not([data-ds-dark-theme]) .dsh-tide-stat-label,
body:not([data-ds-dark-theme]) .dsh-tide-hud-unit,
body:not([data-ds-dark-theme]) .dsh-tide-hud-icon {
  color: var(--dsw-alias-label-secondary);
}

body:not([data-ds-dark-theme]) .dsh-tide-stat-item.is-duration {
  color: var(--dsw-alias-label-tertiary);
}

body:not([data-ds-dark-theme]) .dsh-tide-stats-detail-row.is-total {
  border-top-color: var(--dsw-alias-border-l1);
}

/* 累计行的数字原本写死白色（暗色可读），浅色下必须换成深色 */
body:not([data-ds-dark-theme]) .dsh-tide-stats-detail-row.is-total strong {
  color: var(--dsw-alias-label-primary);
}

/* —— 委派图：亮色版。容器与卡片同样只走 token，明暗切换由 CSS 变量自动完成 —— */

body:not([data-ds-dark-theme]) .subagent-topology-summary-icon {
  border-color: var(--dsw-alias-border-l2);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-state-business-primary);
}

body:not([data-ds-dark-theme]) .subagent-active-chip {
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 32%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent);
  color: var(--dsw-alias-state-success-primary);
}

body:not([data-ds-dark-theme]) .subagent-topology-node-header:hover { background: var(--dsw-alias-interactive-bg-hover); }

body:not([data-ds-dark-theme]) .subagent-topology-node-model {
  border-color: var(--dsw-alias-border-l2);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
}

body:not([data-ds-dark-theme]) .subagent-topology-node-status {
  border-color: var(--dsw-alias-border-l2);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-tertiary);
}

body:not([data-ds-dark-theme]) .subagent-topology-checklist {
  border-top-color: var(--dsw-alias-border-l1);
}

body:not([data-ds-dark-theme]) .subagent-stop-button {
  border-color: var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  box-shadow: var(--dsw-elevation-soft);
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) .subagent-topology-avatar.is-purple {
  border-color: rgba(139, 92, 246, 0.3);
  background: linear-gradient(150deg, rgba(139, 92, 246, 0.16) 0%, rgba(139, 92, 246, 0.05) 100%);
  color: #7c3aed;
  box-shadow: inset 0 1px 0 #ffffff;
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) .subagent-topology-avatar.is-green {
  border-color: rgba(16, 145, 90, 0.28);
  background: linear-gradient(150deg, rgba(16, 145, 90, 0.14) 0%, rgba(16, 145, 90, 0.04) 100%);
  color: #0f7a44;
  box-shadow: inset 0 1px 0 #ffffff;
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) .subagent-topology-avatar.is-orange {
  border-color: rgba(217, 119, 6, 0.28);
  background: linear-gradient(150deg, rgba(217, 119, 6, 0.14) 0%, rgba(217, 119, 6, 0.04) 100%);
  color: #b45309;
  box-shadow: inset 0 1px 0 #ffffff;
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) .subagent-topology-avatar.is-blue {
  border-color: rgba(29, 108, 240, 0.28);
  background: linear-gradient(150deg, rgba(29, 108, 240, 0.16) 0%, rgba(29, 108, 240, 0.05) 100%);
  color: var(--dsw-alias-state-business-primary);
  box-shadow: inset 0 1px 0 #ffffff;
}

/* 运行中/失败/拒绝/混合/未知芯片：浅色下改用深字浅底，保证对比度 */
/* 运行中统一用成功（青绿）语义色，暗亮同一色相，只是明度不同；
 * 此前亮色误用蓝，同一状态出现两套语义色，读起来像换了含义。 */
body:not([data-ds-dark-theme]) .subagent-topology-node.outcome-running .subagent-topology-node-status {
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 32%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent);
  color: var(--dsw-alias-state-success-primary);
}

body:not([data-ds-dark-theme]) .subagent-topology-node.outcome-failed .subagent-topology-node-status {
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 32%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
  color: var(--dsw-alias-state-error-primary);
}

body:not([data-ds-dark-theme]) .subagent-topology-node.outcome-denied .subagent-topology-node-status {
  border-color: var(--dsw-alias-border-l2);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
}

body:not([data-ds-dark-theme]) .subagent-topology-node.outcome-mixed .subagent-topology-node-status {
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 32%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);
  color: var(--dsw-alias-state-warn-primary);
}

body:not([data-ds-dark-theme]) .subagent-topology-node.outcome-unknown .subagent-topology-node-status {
  border-color: var(--dsw-alias-border-l2);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-tertiary);
}

/* 编排结果沿用宿主状态 token，mixed/unknown/failed/denied 语义色明确区分，不能全绿 */
.subagent-active-chip[data-state='failed'] {
  color: var(--dsw-alias-state-error-primary);
  border-color: currentColor;
  background: transparent;
}
.subagent-active-chip[data-state='denied'] {
  color: var(--dsw-alias-label-secondary);
  border-color: var(--dsw-alias-border-l2);
  background: transparent;
}
.subagent-active-chip[data-state='mixed'] {
  color: var(--dsw-alias-state-warn-primary);
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 42%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);
}
.subagent-active-chip[data-state='unknown'] {
  color: var(--dsw-alias-label-tertiary);
  border-color: var(--dsw-alias-border-l2);
  background: var(--dsw-alias-interactive-bg-hover);
}

body:not([data-ds-dark-theme]) .subagent-active-chip[data-state='failed'] {
  color: var(--dsw-alias-state-error-primary);
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 32%, transparent);
  background: transparent;
}
body:not([data-ds-dark-theme]) .subagent-active-chip[data-state='denied'] {
  color: var(--dsw-alias-label-secondary);
  border-color: var(--dsw-alias-border-l2);
  background: transparent;
}
body:not([data-ds-dark-theme]) .subagent-active-chip[data-state='mixed'] {
  color: var(--dsw-alias-state-warn-primary);
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 32%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);
}
body:not([data-ds-dark-theme]) .subagent-active-chip[data-state='unknown'] {
  color: var(--dsw-alias-label-tertiary);
  border-color: var(--dsw-alias-border-l2);
  background: var(--dsw-alias-interactive-bg-hover);
}

/* —— dock 控件：浅色下 hover 用浅灰而不是白色高光 —— */
body:not([data-ds-dark-theme]) [data-dsh-tide-pill][aria-expanded='true'],
body:not([data-ds-dark-theme]) [data-dsh-tide-pill][aria-expanded='true']:hover:not(:disabled) {
  color: var(--dsw-alias-label-primary);
}
`
