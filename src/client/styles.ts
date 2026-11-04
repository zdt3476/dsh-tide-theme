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
 * 潮汐主题材质变量（Tide Theme Surface Tokens）
 *
 * 遵循 workbuddy-design 规范：高端、克制、现代设计风格，纯正深海潮汐蓝体系
 * 杜绝 AI 廉价蓝紫/粉色杂乱渐变与大光斑；底色采用深海曜岩蓝灰，禁用纯黑 #000000；
 * 采用自然融入深海的漫反射柔影与精细物理边框。
 * ========================================================================== */
body[data-dsh-tide-theme][data-ds-dark-theme] {
  --dsh-tide-glass-surface: rgba(20, 32, 52, 0.95);
  --dsh-tide-glass-border: rgba(96, 165, 250, 0.16);
  --dsh-tide-glass-border-hover: rgba(96, 165, 250, 0.32);
  --dsh-tide-glass-blur: blur(16px);
  --dsh-tide-glass-shadow: 0 8px 24px -4px rgba(3, 7, 18, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  --dsh-tide-glass-shadow-hover: 0 12px 32px -4px rgba(3, 7, 18, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  --dsh-tide-glass-shadow-panel: 0 16px 40px -8px rgba(3, 7, 18, 0.75), 0 0 0 1px rgba(96, 165, 250, 0.16);
  --dsh-tide-glass-shadow-card: 0 2px 8px -2px rgba(3, 7, 18, 0.45), 0 0 0 1px rgba(96, 165, 250, 0.12);
  --dsh-tide-card-surface: var(--dsw-alias-bg-layer-2, #142034);
  --dsh-tide-card-border: rgba(96, 165, 250, 0.14);
  --dsh-tide-card-border-hover: rgba(96, 165, 250, 0.28);
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) {
  --dsh-tide-glass-surface: rgba(255, 255, 255, 0.95);
  --dsh-tide-glass-border: rgba(37, 99, 235, 0.12);
  --dsh-tide-glass-border-hover: rgba(37, 99, 235, 0.24);
  --dsh-tide-glass-blur: blur(16px);
  --dsh-tide-glass-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(37, 99, 235, 0.08);
  --dsh-tide-glass-shadow-hover: 0 8px 24px -4px rgba(15, 23, 42, 0.10), 0 0 0 1px rgba(37, 99, 235, 0.14);
  --dsh-tide-glass-shadow-panel: 0 12px 32px -6px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(37, 99, 235, 0.10);
  --dsh-tide-glass-shadow-card: 0 1px 4px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(37, 99, 235, 0.08);
  --dsh-tide-card-surface: #ffffff;
  --dsh-tide-card-border: rgba(37, 99, 235, 0.12);
  --dsh-tide-card-border-hover: rgba(37, 99, 235, 0.22);
}

/* —— 潮汐主题全局底色（单一 Token 来源与精准结构选择器，body[data-dsh-tide-theme] 门控） —— */
body[data-dsh-tide-theme][data-ds-dark-theme] {
  background-color: var(--dsw-alias-bg-base) !important;
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) {
  background-color: var(--dsw-alias-bg-base) !important;
}

/* 侧栏：微偏暖深灰/浅灰分层 */
body[data-dsh-tide-theme][data-ds-dark-theme] [class*='_sidebarCol'],
body[data-dsh-tide-theme][data-ds-dark-theme] [data-slot='sidebar.workspaces'],
body[data-dsh-tide-theme][data-ds-dark-theme] [data-slot='sidebar'] {
  background: var(--dsw-specific-sidebar-fill) !important;
  border-right: 1px solid var(--dsw-alias-border-l1) !important;
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [class*='_sidebarCol'],
body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [data-slot='sidebar.workspaces'],
body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [data-slot='sidebar'] {
  background: var(--dsw-specific-sidebar-fill) !important;
  border-right: 1px solid var(--dsw-alias-border-l1) !important;
}

/* 中间主画布：纯粹克制的无微光中性底色 */
body[data-dsh-tide-theme][data-ds-dark-theme] [class*='_centerCol'],
body[data-dsh-tide-theme][data-ds-dark-theme] [data-conversation-scroll] {
  background: var(--dsw-alias-bg-base) !important;
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [class*='_centerCol'],
body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [data-conversation-scroll] {
  background: var(--dsw-alias-bg-base) !important;
}

/* 顶栏头部与面包屑：精准定位真正的对话头部，克制毛玻璃质感 */
body[data-dsh-tide-theme][data-ds-dark-theme] header[class*='_header']:has([data-conversation-header-leading]),
body[data-dsh-tide-theme][data-ds-dark-theme] header[class*='_header']:has([data-conversation-header-corner]),
body[data-dsh-tide-theme][data-ds-dark-theme] [data-conversation-header-leading],
body[data-dsh-tide-theme][data-ds-dark-theme] [data-conversation-header-corner] {
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 80%, transparent) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--dsw-alias-border-l1) !important;
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) header[class*='_header']:has([data-conversation-header-leading]),
body[data-dsh-tide-theme]:not([data-ds-dark-theme]) header[class*='_header']:has([data-conversation-header-corner]),
body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [data-conversation-header-leading],
body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [data-conversation-header-corner] {
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 85%, transparent) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--dsw-alias-border-l1) !important;
}

/* 右侧抽屉 / 产物栏（如 diff viewer） */
body[data-dsh-tide-theme][data-ds-dark-theme] [class*='_rightbarCol'] {
  background: var(--dsw-alias-bg-layer-1) !important;
  border-left: 1px solid var(--dsw-alias-border-l1) !important;
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [class*='_rightbarCol'] {
  background: var(--dsw-alias-bg-layer-1) !important;
  border-left: 1px solid var(--dsw-alias-border-l1) !important;
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

/* —— 输入卡片：沉稳深海蓝灰卡面，克制 1px 描边与自然投影 —— */
body[data-dsh-tide-theme] [data-composer-card] {
  background: var(--dsw-specific-input-major);
  box-shadow: var(--dsw-elevation-soft);
}

body[data-dsh-tide-theme][data-ds-dark-theme] [data-composer-card] {
  border: 1px solid var(--dsw-alias-border-l2) !important;
  background: var(--dsw-specific-input-major) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 4px 20px -4px rgba(3, 7, 18, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

body[data-dsh-tide-theme][data-ds-dark-theme] [data-composer-card]:focus-within {
  border-color: rgba(56, 189, 248, 0.5) !important;
  box-shadow:
    0 0 0 2px rgba(56, 189, 248, 0.18),
    0 8px 30px -4px rgba(3, 7, 18, 0.75);
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [data-composer-card] {
  border: 1px solid var(--dsw-alias-border-l2) !important;
  background: #ffffff !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 2px 12px -2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(37, 99, 235, 0.06);
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) [data-composer-card]:focus-within {
  border-color: rgba(29, 78, 216, 0.45) !important;
  box-shadow:
    0 0 0 2px rgba(29, 78, 216, 0.12),
    0 4px 16px -2px rgba(15, 23, 42, 0.08);
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
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
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
  /* 座位自身必须可收缩：只给内含 pill 设 min-width:0 不够——inline-flex 父级仍被
   * 内容撑开，窄容器下会把 composer 行顶出横向滚动。 */
  flex: 0 1 auto;
  max-width: 100%;
}

/* 座位里的原生按钮与插件按钮同规格：28px 高、13px 字号、透明底。 */
[data-dsh-tide-seat] > [data-dsh-tide-dock-root] {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  max-width: 100%;
}

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
 * 潮汐深海材质——哑光微透 + 0.5px 发丝描边 + 漫反射柔影；关闭时上面的原生 token 值生效，
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
  width: fit-content;
  max-width: 100%;
  margin: 0 auto;
  min-width: 0;
  box-sizing: border-box;
  min-height: 36px;
  padding: 0 4px;
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

/* 读数：13px 精密航海等宽读数 */
.dsh-tide-hud-number {
  font-size: var(--dsw-font-xs-13-font-size, 13px);
  line-height: var(--dsw-font-xs-13-line-height, 20px);
  font-weight: 500;
  font-family: "Geist Mono", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-feature-settings: "tnum" 1;
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
  font-family: "Geist Mono", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-feature-settings: "tnum" 1;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-state-success-primary);
}

.dsh-tide-hud-percent[data-bucket='warn'] {
  color: var(--dsw-alias-state-warn-primary);
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
  min-width: 0;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  vertical-align: middle;
}

/* 主题风格层：浮窗本体套用潮汐深海材质（关掉主题开关即回到上面的原生 token 值） */
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
  /* 上限按最满内容（约 590px）留出余量：数据齐全时不产生内部滚动，
   * 只在矮视口下才由 vh 约束接管并滚动，避免默认场景被裁掉末行。 */
  max-height: min(640px, calc(100vh - 48px));
  overflow-y: auto;
  overscroll-behavior: contain;
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
  font-family: "Geist Mono", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-feature-settings: "tnum" 1;
  font-size: var(--dsw-font-base-strong-16-font-size, 16px);
  font-weight: 600;
  line-height: var(--dsw-font-base-strong-16-line-height, 20px);
  font-variant-numeric: tabular-nums;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  /* 与 [data-dsh-tide-control='model'] 的上限保持一致，避免两处规则互相打架。 */
  max-width: 280px;
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

/* 当前所选供应商被限制在本工作区之外：只做颜色提示，不禁用 pill
 * （用户仍能打开面板去换成允许的模型，禁用反而堵死唯一出口）。 */
[data-dsh-tide-pill][data-dsh-tide-binding-blocked] {
  color: var(--dsw-alias-state-warn-primary);
}

[data-dsh-tide-pill][data-dsh-tide-binding-blocked] [data-dsh-tide-pill-label]::after {
  content: '⚠';
  margin-left: 4px;
  font-size: 10px;
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

/* —— 供应商被限制在本工作区之外：置灰但仍可见 —— */
[data-dsh-tide-column][data-dsh-tide-column-blocked] {
  opacity: 0.55;
}

[data-dsh-tide-column][data-dsh-tide-column-blocked] [data-dsh-tide-provider-dot] {
  filter: grayscale(1);
}

/* 列内模型禁用：不再响应 hover 高亮，但保持可读，避免被误认为加载失败 */
[data-dsh-tide-model-grid] [data-dsh-tide-item][data-dsh-tide-item-blocked] {
  cursor: not-allowed;
}

[data-dsh-tide-model-grid] [data-dsh-tide-item][data-dsh-tide-item-blocked]:hover {
  background: transparent;
  color: var(--dsw-alias-label-dimmed);
}

[data-dsh-tide-lock] {
  flex: none;
  font-size: 10px;
  line-height: 1;
  opacity: 0.8;
}

/* 列头下方的受限原因说明：字号与列头同一层级但更弱，不抢模型名 */
[data-dsh-tide-blocked-hint] {
  margin: 2px 0 4px;
  font-size: 10px;
  line-height: 14px;
  color: var(--dsw-alias-state-warn-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  min-width: 0;
  box-sizing: border-box;
}

[data-dsh-tide-popup] button[data-dsh-tide-item] > span:not([data-dsh-tide-badge]):not([data-dsh-tide-check]) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* 全禁提示现位于列栅格之外，独占一行并与上方列阵拉开距离。 */
[data-dsh-tide-model-grid] > [data-dsh-tide-binding-empty] {
  margin-top: 8px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  text-align: center;
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

/* 主题风格层：委派图三件套（摘要条 / 画布 / 卡片）套用同一套潮汐深海材质。
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
  outline: 2px solid var(--dsw-alias-state-business-primary, #1d4ed8);
  outline-offset: 1px;
}

.subagent-topology-summary-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: var(--dsw-radius-sm, 6px);
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
  color: var(--dsw-alias-label-tertiary);
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
  color: var(--dsw-alias-label-tertiary);
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
  from { opacity: 0.75; }
  to { opacity: 1; }
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

/* 连线保持利落克制的工程感，无外发光辉光 */
body[data-dsh-tide-theme] .subagent-topology:has(.outcome-running) .subagent-topology-lines path {
  stroke: var(--dsw-alias-state-business-primary);
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
  min-height: 130px;
  padding: 14px;
  border: none;
  border-radius: inherit;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
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
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-alias-state-business-primary, #38bdf8);
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

/* 头像配色属于插件主题风格：仅主题开启时生效，关闭后回落到中性 token 外观。
 * 遵循 workbuddy-design 规范：杜绝霓虹外发光与廉价蓝紫渐变，采用克制物理微阴影与高辨识度单色前景 */
body[data-dsh-tide-theme][data-ds-dark-theme] .subagent-topology-avatar.is-cyan,
body[data-dsh-tide-theme][data-ds-dark-theme] .subagent-topology-avatar.is-purple {
  border: 1px solid rgba(56, 189, 248, 0.28);
  background: rgba(56, 189, 248, 0.10);
  color: #38bdf8;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

body[data-dsh-tide-theme][data-ds-dark-theme] .subagent-topology-avatar.is-green {
  border: 1px solid rgba(52, 211, 153, 0.28);
  background: rgba(52, 211, 153, 0.10);
  color: #34d399;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

body[data-dsh-tide-theme][data-ds-dark-theme] .subagent-topology-avatar.is-orange {
  border: 1px solid rgba(251, 191, 36, 0.28);
  background: rgba(251, 191, 36, 0.10);
  color: #fbbf24;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

body[data-dsh-tide-theme][data-ds-dark-theme] .subagent-topology-avatar.is-blue {
  border: 1px solid rgba(96, 165, 250, 0.28);
  background: rgba(96, 165, 250, 0.10);
  color: #60a5fa;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
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

/* token 用量与预估金额：数值用等宽数字，金额比用量更弱一档，
 * 让「实际消耗」和「换算金额」在视觉上分主次；两者都不抢状态角标的注意力。
 * 不设背景色块：卡片本身就是可点按钮，任何「胶囊」都会被误读成可点击的 Badge。 */
.subagent-checklist-item.is-usage {
  align-items: center;
  gap: 6px;
  /* 与同卡片内的步数保持一致：超长数字/窄屏挤压时不换行，
   * 否则左侧图标会因 align-items:center 在两行之间垂直居中而错位。 */
  white-space: nowrap;
}
.subagent-topology-node-usage,
.subagent-topology-node-cost {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
}
/* 金额用前导「~」表达「约」，不加背景与内边距，避免看起来像可点击的按钮；
 * 显式 cursor: default 抵消父级按钮继承的手型光标。 */
.subagent-topology-node-cost {
  margin-left: 2px;
  color: var(--dsw-alias-label-tertiary);
  cursor: default;
}
.subagent-topology-node-cost::before {
  content: '~';
  margin-right: 1px;
  opacity: 0.75;
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

.subagent-stop-button:focus-visible {
  outline: 2px solid var(--dsw-alias-state-error-primary);
  outline-offset: 1px;
}

/* 停止按钮浮在卡片右下角，不再撑高卡片内容。 */
.subagent-topology-node-actions:has(> .subagent-stop-button) .subagent-topology-node-header { padding-bottom: 34px; }

/* —— 回合耗时 —— */
[data-dsh-tide-duration] {
  flex: none;
  /* 文案已去掉前导「·」，靠外边距与前置操作按钮拉开呼吸，避免贴在一起。 */
  margin-left: 8px;
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
  color: var(--dsw-alias-state-warn-primary);
}

[data-dsh-tide-pct='bad'] {
  color: var(--dsw-alias-state-error-primary);
}

body[data-ds-dark-theme] [data-dsh-tide-pct='warn'] { color: var(--dsw-alias-state-warn-primary, #f59e0b); }

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

[data-dsh-tide-tab]:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: -1px;
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

/* 折叠成窄图标栏时筛选框必须一并让位：否则 tabs 已隐藏、输入框仍以整行宽度
 * 撑在 48px 窄栏里横向溢出，这是整个侧栏最明显的破版点。 */
[data-sidebar-collapsed] [data-dsh-tide-filter-host] {
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

/* 筛选无匹配结果时的空态：整列表被隐藏后必须给出反馈，避免侧栏死白。 */
[data-dsh-tide-empty] {
  margin: 0 4px 6px;
  padding: 10px 8px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
  text-align: center;
}

[data-dsh-tide-grouping]:hover {  color: var(--dsw-alias-label-primary);
}
[data-dsh-tide-dock-right] > [data-dsh-tide-dock-root] {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

/* 模型与思考等级两颗 pill 直接相邻，靠 [data-dsh-tide-seat] 的 gap 分隔，不再插『·』。
 * 两颗 pill 之间的间距由容器 gap 提供，保持与原生 seat 一致的节奏。 */
[data-dsh-tide-control='effort'] { flex: none; }
/* 「供应商 / 模型」常见组合（如 WorkBuddy / Deepseek-V4.1-Flash）自然宽约 244px，
 * 240px 的上限会差 4px 触发省略号，让唯一的截断控件显得与同行其他控件不协调。
 * 宽屏取 280px 覆盖常见标签；窄屏按视口收紧上限（见文件末尾的窄屏断点），
 * 超长名仍由 ellipsis 兜底，三种情况都不会撑破 composer 行。 */
[data-dsh-tide-control='model'] { max-width: 280px; flex: 0 1 auto; }

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
  color: var(--dsw-alias-state-warn-primary);
  font-size: 11px;
  line-height: 1;
  margin-right: 4px;
  display: inline-block;
  vertical-align: baseline;
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
  background: var(--dsw-alias-state-business-primary);
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
  color: var(--dsw-alias-label-tertiary, #64748b);
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
  border-top: 1px dashed var(--dsw-alias-border-l1);
}

.dsh-tide-section-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.dsh-tide-section-icon {
  font-size: 11px;
  line-height: 1;
  filter: drop-shadow(0 1px 1px var(--dsw-alias-border-l2));
}

.dsh-tide-section-badge {
  font-size: var(--dsw-font-xxxs-11-font-size, 11px);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-tertiary, #64748b);
}

/* —— 插件可视化设置面板 —— */
.dsh-tide-settings-root {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 680px;
  color: var(--dsw-alias-label-primary, #0f172a);
  font-size: 13px;
  line-height: 20px;
  padding: 4px 0 16px;
}

.dsh-tide-settings-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}

.dsh-tide-settings-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dsh-tide-settings-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary, #0f172a);
}

.dsh-tide-settings-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--dsw-alias-state-success-subtle, rgba(4, 120, 87, 0.12));
  color: var(--dsw-alias-state-success-primary, #047857);
}

.dsh-tide-settings-desc {
  margin: 0;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #64748b);
}

.dsh-tide-settings-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dsh-tide-settings-card {
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-lg, 12px);
  background: var(--dsw-alias-bg-layer-2);
  box-shadow: var(--dsw-elevation-soft);
  overflow: hidden;
}

body[data-ds-dark-theme] .dsh-tide-settings-card {
  border-color: var(--dsh-tide-card-border);
  background: var(--dsh-tide-card-surface);
}

.dsh-tide-settings-group-title {
  padding: 10px 14px 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--dsw-alias-label-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--dsw-alias-interactive-bg-subtle);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
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
  border-top: 1px solid var(--dsw-alias-border-l1);
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
  color: var(--dsw-alias-label-primary);
}

.dsh-tide-settings-item-desc {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
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
  background: var(--dsw-alias-border-l2);
  cursor: pointer;
  transition: background 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.15s ease;
  box-sizing: border-box;
}

.dsh-tide-switch:hover {
  filter: brightness(1.08);
}

.dsh-tide-switch:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 2px;
}

.dsh-tide-switch[data-active='true'] {
  background: var(--dsw-alias-state-business-primary);
  border-color: var(--dsw-alias-state-business-primary);
}

.dsh-tide-switch-knob {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: var(--dsw-elevation-soft);
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
  color: var(--dsw-alias-state-success-primary);
  font-weight: 500;
}

.dsh-tide-settings-hint {
  color: var(--dsw-alias-label-tertiary);
}

/* —— 供应商可用范围（供应商 ↔ 工作区绑定） —— */
/* 外层 settings-card 不带内边距，各子块需自行与标题的 14px 基线对齐。 */
.dsh-tide-binding-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* 顶部留 10px：分组标题自带 border-bottom，文本若贴到分割线上会显得局促。 */
  padding: 10px 14px 14px;
}

/* 卡片内说明文字统一到设置页的 11px/16px 说明字阶；
 * 不改全局 .dsh-tide-settings-hint，避免波及其它卡片与底栏提示。 */
.dsh-tide-binding-body .dsh-tide-settings-hint {
  font-size: 11px;
  line-height: 16px;
}

.dsh-tide-binding-error-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 120px;
  /* 水平方向不再额外缩进：外层已有 14px，再补会与上方说明文字错开基线。 */
  padding: 12px 0;
  box-sizing: border-box;
}

.dsh-tide-binding-retry {
  flex: none;
  padding: 3px 10px;
  border-radius: 999px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 16px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dsh-tide-binding-retry:hover {
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-border-l3);
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-tide-binding-retry:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-alias-state-business-primary);
  outline-offset: 1px;
}

/* 加载中/空态也给一个稳定高度，避免卡片在状态切换时高度塌陷跳变。 */
.dsh-tide-binding-body [data-dsh-tide-binding-loading],
.dsh-tide-binding-body [data-dsh-tide-binding-empty] {
  display: flex;
  align-items: center;
  min-height: 120px;
}

.dsh-tide-binding-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 与同页其它设置项一致：不套内层带边框小卡片，改用通栏 + 分割线，
 * 避免「卡片里再嵌一层卡片」的层级堆叠。 */
.dsh-tide-binding-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 0;
}

.dsh-tide-binding-row + .dsh-tide-binding-row {
  border-top: 1px solid var(--dsw-alias-border-l1);
}

.dsh-tide-binding-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.dsh-tide-binding-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}

.dsh-tide-binding-tag {
  flex: none;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  line-height: 14px;
  white-space: nowrap;
  color: var(--dsw-alias-state-warn-primary);
  background: var(--dsw-alias-state-warn-tertiary, transparent);
  border: 0.5px solid var(--dsw-alias-state-warn-primary);
}

.dsh-tide-binding-tag.is-open {
  color: var(--dsw-alias-label-tertiary);
  background: transparent;
  border-color: var(--dsw-alias-border-l2);
}

.dsh-tide-binding-clear {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  line-height: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dsh-tide-binding-clear:hover {
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-border-l3);
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-tide-binding-clear:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-alias-state-business-primary);
  outline-offset: 1px;
}

.dsh-tide-binding-workspaces {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
}

.dsh-tide-binding-check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 22px;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}

.dsh-tide-binding-check.is-unrestricted {
  color: var(--dsw-alias-label-tertiary);
}

.dsh-tide-binding-check input {
  margin: 0;
  accent-color: var(--dsw-alias-state-business-primary);
  cursor: inherit;
}

.dsh-tide-binding-label {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-tide-binding-warn {
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-state-warn-primary);
}

.dsh-tide-settings-reset-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dsh-tide-settings-reset-btn:hover {
  border-color: var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-tide-settings-reset-btn:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 1px;
}

/* 数值步进器控件 */
.dsh-tide-stepper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--dsw-alias-interactive-bg-subtle);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm, 6px);
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
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s ease;
}

.dsh-tide-stepper-btn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-tide-stepper-btn:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 1px;
}

.dsh-tide-stepper-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.dsh-tide-stepper-val {
  min-width: 52px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-primary);
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

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) .subagent-topology-avatar.is-cyan,
body[data-dsh-tide-theme]:not([data-ds-dark-theme]) .subagent-topology-avatar.is-purple {
  border-color: rgba(2, 132, 199, 0.24);
  background: rgba(2, 132, 199, 0.08);
  color: #0284c7;
  box-shadow: inset 0 1px 0 #ffffff;
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) .subagent-topology-avatar.is-green {
  border-color: rgba(4, 120, 87, 0.24);
  background: rgba(4, 120, 87, 0.08);
  color: #047857;
  box-shadow: inset 0 1px 0 #ffffff;
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) .subagent-topology-avatar.is-orange {
  border-color: rgba(180, 83, 9, 0.24);
  background: rgba(180, 83, 9, 0.08);
  color: #b45309;
  box-shadow: inset 0 1px 0 #ffffff;
}

body[data-dsh-tide-theme]:not([data-ds-dark-theme]) .subagent-topology-avatar.is-blue {
  border-color: rgba(29, 78, 216, 0.24);
  background: rgba(29, 78, 216, 0.08);
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

/* —— 窄视口：模型 pill 上限随视口收紧，保证 composer 行不产生横向溢出 ——
 * 280px 只在宽屏需要（完整显示常见标签）；窄屏继续沿用会挤掉权限与思考等级控件。 */
@media (max-width: 640px) {
  [data-dsh-tide-control='model'] {
    max-width: 180px;
  }
}

@media (max-width: 420px) {
  [data-dsh-tide-control='model'] {
    max-width: 140px;
  }
}

/* —— 架构收敛：自有 Slot 视图控制器与 TurnTail 样式 —— */
.dsh-tide-dock-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.dsh-tide-workspace-control-root {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  width: 100%;
  box-sizing: border-box;
}

.dsh-tide-tabs-pill {
  display: inline-flex;
  align-items: center;
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm, 6px);
  padding: 2px;
  gap: 2px;
}

.dsh-tide-tab-btn {
  background: transparent;
  border: none;
  border-radius: var(--dsw-radius-xs, 4px);
  padding: 3px 8px;
  min-height: 24px;
  box-sizing: border-box;
  font-size: var(--dsw-font-xxxs-11-font-size, 11px);
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.dsh-tide-tab-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.dsh-tide-tab-btn.is-active,
.dsh-tide-tab-btn[data-active='true'] {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
  box-shadow: var(--dsw-elevation-soft);
}

.dsh-tide-tab-btn:focus-visible,
.dsh-tide-filter-trigger:focus-visible,
.dsh-tide-filter-clear:focus-visible,
.dsh-tide-groupby-btn:focus-visible,
.dsh-tide-session-quick-item:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-alias-state-business-primary);
  outline-offset: 1px;
}

.dsh-tide-filter-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm, 6px);
  padding: 4px 8px;
  min-height: 24px;
  box-sizing: border-box;
  font-size: var(--dsw-font-xxxs-11-font-size, 11px);
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.dsh-tide-filter-trigger:hover,
.dsh-tide-filter-trigger.is-active {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-border-l2);
}

.dsh-tide-filter-text {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-tide-workspace-popover {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  background: var(--dsw-menu-surface-fill, var(--dsw-alias-bg-layer-2));
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(16px));
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md, 10px);
  box-shadow: var(--dsw-elevation-panel);
  padding: 10px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dsh-tide-popover-head {
  display: flex;
  align-items: center;
  position: relative;
}

.dsh-tide-filter-input {
  width: 100%;
  box-sizing: border-box;
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm, 6px);
  padding: 5px 8px;
  font-size: 13px;
  line-height: 18px;
  color: var(--dsw-alias-label-primary);
  outline: none;
}

.dsh-tide-filter-input:focus {
  border-color: var(--dsw-focus-ring-color);
}

.dsh-tide-filter-clear {
  position: absolute;
  right: 6px;
  background: transparent;
  border: none;
  font-size: 14px;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  min-height: 24px;
  min-width: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--dsw-radius-xs, 4px);
  transition: all 0.15s ease;
}

.dsh-tide-filter-clear:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-tide-groupby-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 11px;
}

.dsh-tide-groupby-label {
  color: var(--dsw-alias-label-tertiary);
}

.dsh-tide-groupby-options {
  display: inline-flex;
  gap: 3px;
}

.dsh-tide-groupby-btn {
  background: transparent;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-xs, 4px);
  padding: 2px 6px;
  min-height: 24px;
  box-sizing: border-box;
  font-size: 10px;
  font-weight: 500;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}

.dsh-tide-groupby-btn.is-active {
  background: var(--dsw-alias-state-business-tertiary);
  color: var(--dsw-alias-state-business-primary);
  border-color: var(--dsw-alias-state-business-primary);
  font-weight: 600;
}

.dsh-tide-session-quick-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 180px;
  overflow-y: auto;
}

.dsh-tide-session-quick-item-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.dsh-tide-session-quick-item {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  border: none;
  border-radius: var(--dsw-radius-xs, 4px);
  padding: 4px 8px;
  min-height: 24px;
  box-sizing: border-box;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.dsh-tide-session-quick-item:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-tide-session-quick-item.is-pinned {
  font-weight: 500;
}

.dsh-tide-pin-badge {
  font-size: 11px;
  line-height: 1;
}

.dsh-tide-pin-action-btn {
  background: transparent;
  border: none;
  font-size: 13px;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  padding: 2px 6px;
  min-height: 24px;
  border-radius: var(--dsw-radius-xs, 4px);
  transition: all 0.15s ease;
  flex: none;
}

.dsh-tide-pin-action-btn:hover {
  color: var(--dsw-alias-state-warn-primary, #f59e0b);
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-tide-pin-action-btn.is-pinned {
  color: var(--dsw-alias-state-warn-primary, #f59e0b);
}

.dsh-tide-pin-action-btn:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-alias-state-business-primary);
  outline-offset: 1px;
}

.dsh-tide-session-title {
  font-size: 13px;
  line-height: 18px;
  color: var(--dsw-alias-label-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-tide-session-running-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--dsw-alias-state-success-primary);
  flex: none;
}

.dsh-tide-empty-state {
  text-align: center;
  padding: 12px;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}

`
