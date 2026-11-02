# 潮汐玻璃 · Tide Glass

<p align="center">
  <img src="docs/images/icon.png" width="96" height="96" alt="Tide Glass icon" style="border-radius: 22px; box-shadow: 0 6px 20px rgba(0,0,0,0.15);" />
</p>

<p align="center">
  <strong>冰蓝玻璃、真实指标、零噪音 —— 给 DeepSeek Harness 的主题与工作流增强套件</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-simplify-theme"><img src="https://img.shields.io/npm/v/dsh-simplify-theme?color=2563eb&label=npm" alt="npm version" /></a>
  <a href="https://github.com/awesome-dsh-plugin/awesome-dsh-plugin"><img src="https://img.shields.io/badge/dsh--market-verified-16a34a" alt="dsh market" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="license" /></a>
</p>

> **关于名字**：本插件最初叫 `dsh-simplify-theme`（极简主题），后来主题演化为冰蓝玻璃材质，故显示名改为「潮汐玻璃 · Tide Glass」。
> 为不破坏已安装用户的链接与安装命令，**npm 包名与插件 ID 保持 `dsh-simplify-theme` 不变**。

---

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/banner-dark.png" />
    <img src="docs/images/banner-light.png" alt="潮汐玻璃功能总览" style="border-radius: 12px; box-shadow: 0 16px 40px rgba(0,0,0,0.25); width: 100%; max-width: 960px;" />
  </picture>
</p>

Tide Glass 为 DSH 提供冰蓝玻璃表面、冷灰文字与清晰的信息层级，并保留宿主的对话、导航及分屏结构。

本文的功能截图由插件组件在隔离浏览器中使用演示数据渲染，用于展示组件样式；它们不代表当前用户会话或完整 DSH 应用的实际界面。真实宿主的布局与交互另外通过宿主结构契约测试验证。

---

## 主题材质开关

底栏 HUD、用量看板与代委派图这三个自绘组件，**统一跟随插件设置里的主题材质开关**：

| 开关 | 三个组件的外观 | 预览 |
|---|---|---|
| **开启**（默认） | 套用潮汐玻璃材质：径向微光、定向双层投影、0.5px 发丝描边、彩色图标与连线辉光 | 见下方各功能的「玻璃」图 |
| **关闭** | 全部回落到 DSH 原生 token 表面（`--dsw-specific-menu` / `--dsw-alias-bg-layer-*` / `--dsw-elevation-*`），与宿主外观完全一致 | 见下方各功能的「原生」图 |

开关位于 **设置 → 插件 → 潮汐玻璃主题 → 潮汐玻璃主题材质**，实时生效、无需重启。明暗两套配色各自成立，切换深浅色不会冷暖混用。

---

## 核心特性一览

### 1. 底栏性能 HUD 与用量看板

取代原生埋在弹窗里的统计胶囊，把关键运行指标固定在任何时候都看得见的位置：

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/current-dock-dark.png" />
    <img src="docs/images/current-dock-light.png" alt="底栏性能 HUD 与展开的用量看板（玻璃材质）" style="border-radius: 10px; max-width: 620px; box-shadow: 0 8px 30px rgba(0,0,0,0.35);" />
  </picture>
</p>

<details>
<summary>对比：关闭主题材质后的原生外观</summary>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/current-dock-dark-native.png" />
    <img src="docs/images/current-dock-light-native.png" alt="同一组件的原生外观" style="border-radius: 10px; max-width: 620px;" />
  </picture>
</p>
</details>

- **单行常驻 HUD**：会话规模、上下文容量、真实端到端 TPS、缓存命中率、模型累计耗时五项一行排布，形制对齐宿主原生 TodoPanel（36px 高、`radius-lg` 圆角）。窄屏按 760px / 640px 两级断点自动收窄，绝不截断读数。
- **严格计入首字延迟（TTFT）的真实 TPS**：原生口径只算纯解码时间（会出现 200+ t/s 的虚高值）；本插件把网络往返与推理思考一并计入，还原真实生成速率。
- **上下文容量三档语义色**：≤50% 安全绿、50–75% 提醒橙、>75% 警戒红，进度条与徽章同步换色。
- **上下文压缩即时刷新**：接入 `projectedTokens` 与 `contextBreakdown`，压缩发生后容量读数立刻下降，不会停在旧采样值。
- **点击展开用量看板**：系统/工具/消息三段式容量条、四张性能 KPI 卡、Token 计费构成表与会话耗时拆解。浮窗**水平居中于 HUD、底边严丝合缝贴住 HUD 顶边**，空间不足时自动翻转到下方或贴视口底。

---

### 2. Agent Graph 子代理拓扑

无论工作步骤是否被宿主折叠收起，子代理的派发记录始终常驻可见：

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/current-delegation-dark.png" />
    <img src="docs/images/current-delegation-light.png" alt="Agent Graph 子代理拓扑（玻璃材质）" style="border-radius: 10px; max-width: 760px; box-shadow: 0 8px 30px rgba(0,0,0,0.35);" />
  </picture>
</p>

<details>
<summary>对比：关闭主题材质后的原生外观</summary>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/current-delegation-dark-native.png" />
    <img src="docs/images/current-delegation-light-native.png" alt="同一组件的原生外观" style="border-radius: 10px; max-width: 760px;" />
  </picture>
</p>
</details>

- **弧形扇出连线**：SVG 按真实几何绘制——外侧分支从枢纽侧缘引出，内侧从底部引出，以贝塞尔曲线落到卡片顶边；有子代理运行时虚线流动并带蓝色辉光。卡片换行时只画主干，避免连线穿过上一行卡片。
- **横向 Agent 卡片阵列**：网格按可用容器宽度排布，每张卡片保留标题、模型、状态与实际步骤数；步骤数不代表已完成的任务清单。
- **四色职能映射**：按标题关键词把子代理归到 Research（紫）/ Code（绿）/ Analyze（橙）/ 其它（蓝），图标、渐变底与发光描边同步换色；关闭主题材质后统一回落为中性图标。
- **多轮次递增时序防冲突**：会话级单调递增编号（第 1 次委派、第 2 次委派…），配合行级粘性绑定（`claimedByRow`），杜绝跨轮次编号重置或盗用旧图。
- **宁可缺省也不张冠李戴**：无法确定某个工具行对应哪个子会话时**不显示**该节点（失败或仍在排队的 `spawn_teammate` 调用不会凭空占位），而不是按顺序猜一个。未匹配的错误本身仍原样留在原生工具行里。
- **交互**：点击卡片打开对应子会话；支持取消的运行中卡片提供独立「停止」按钮，停止操作不触发会话跳转。

---

### 3. 侧栏独立小节置顶

告别工作区文件夹混杂堆叠，用小节与发丝分割线重塑清晰层级：

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/current-sidebar-dark.png" />
    <img src="docs/images/current-sidebar-light.png" alt="侧栏独立小节置顶" style="border-radius: 10px; max-width: 320px; box-shadow: 0 8px 30px rgba(0,0,0,0.35);" />
  </picture>
</p>

- **小节标头**：置顶与普通文件夹分立为 `📌 置顶 (N)` 与 `工作区 (M)` 两小节，标头挂在工作区列表容器内部（不会漂到搜索框上方）。
- **金星标识**：置顶项带金色 `★` 前缀与投影，与普通项之间用发丝虚线隔开。
- **选中发光侧条**：当前工作区左侧出现 3px 品牌蓝发光竖条。
- **未归档 / 归档分页**：双标签页切换活跃状态，与宿主视图状态双向同步。
- **实时筛选框**：即输即搜，命中会话时保留其工作区组头。
- **数量上限独立可调**：置顶与未置顶的折叠上限分别配置（置顶设为 0 表示不限，全部常驻）。

---

### 4. 插件页可视化配置面板

所有开关与步进器直接挂在 DSH 插件设置页，改动即时保存到 `localStorage`，无需重启或手改配置文件：

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/current-settings-dark.png" />
    <img src="docs/images/current-settings-light.png" alt="插件可视化配置面板" style="border-radius: 10px; max-width: 640px; box-shadow: 0 8px 30px rgba(0,0,0,0.35);" />
  </picture>
</p>

---

### 5. 输入区控件与体验细节

- **模型与思考等级控件**：输入框左下方提供供应商分类的模型面板与平滑思考等级（Reasoning Effort）滑块。列表按供应商分组、带粘性组头，模型名后标注可用档位数：

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/current-model-dark.png" />
    <img src="docs/images/current-model-light.png" alt="模型选择面板（演示目录）" style="border-radius: 10px; max-width: 680px; box-shadow: 0 8px 30px rgba(0,0,0,0.35);" />
  </picture>
</p>

- **权限预设切换**：输入框右下方一行切换只读 / 可写 / 全放行等权限预设。
- **每轮耗时徽标**：每轮回复的操作栏尾部常驻该轮端到端实际耗时。
- **克制的动效**：所有动画尊重 `prefers-reduced-motion`，减弱动态时停止脉冲与流动。

---

## 安装

### 方式 1：通过官方插件市场（推荐）

在 DSH 插件市场搜索 **`dsh-simplify-theme`**（显示名「潮汐玻璃」），点击安装后重启客户端。

### 方式 2：通过命令行安装

```sh
# npm
dsh plugin --profile desktop add dsh-simplify-theme

# GitHub 源码
dsh plugin --profile desktop add git+https://github.com/zdt3476/dsh-simplify-theme.git

# 本地开发软链（link）
dsh plugin --profile desktop add link:"$PWD"

# GitHub Release 预构建包
dsh plugin --profile desktop add https://github.com/zdt3476/dsh-simplify-theme/releases/download/v0.3.9/dsh-simplify-theme-0.3.9.tgz
```

安装后在 **设置 → 插件** 中启用，并按下 `Cmd/Ctrl + R` 重载客户端。

---

## 本地开发与测试

```sh
pnpm install
pnpm test        # TypeScript 类型检查 + Vitest 单元测试 (103 tests)
pnpm build       # 编译产出 lib/index.js (Host) 与 lib/client.js (Client)
pnpm check       # test + build 全量流水线检查

# 浏览器契约测试（真实 Chromium，45 项）
# 注意：必须逐个列出测试文件。tests/client/ 下还有 dock-stats-fixture.mjs 等夹具，
# 用 glob 会把夹具当成测试文件从而误报失败。
PLAYWRIGHT_MODULE=<playwright/index.mjs> CHROMIUM_EXECUTABLE=<chromium> \
  node --test --test-concurrency=1 \
    tests/client/dock-stats-browser.mjs \
    tests/client/host-layout-browser.mjs \
    tests/client/plugin-settings-browser.mjs \
    tests/client/theme-reference-browser.mjs \
    tests/client/sidebar-section-browser.mjs \
    tests/client/theme-lifecycle-browser.mjs \
    tests/client/delegation-browser.mjs

# 重出 README / 市场画廊截图：用插件组件在真实浏览器里渲染，不是手绘。
# 一次生成「明暗 × 主题开关」四态共 16 张截图（加上应用图标共 17 张参考图）。
PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/capture-docs-screenshots.mjs
```

### 截图命名约定

| 文件名 | 含义 |
|---|---|
| `<name>-dark.png` / `<name>-light.png` | 暗色 / 亮色，**主题材质开启** |
| `<name>-dark-native.png` / `<name>-light-native.png` | 暗色 / 亮色，**主题材质关闭**（回落 DSH 原生外观） |

### 目录结构

```
├── src/
│   ├── client/
│   │   ├── composer-stats.ts       # 容量占用、真实 TPS、缓存命中算法模型
│   │   ├── dock-stats.ts           # 底栏单行 HUD 与用量看板浮窗
│   │   ├── delegation-panel.ts     # Agent Graph 拓扑、母线连线与四色卡片映射
│   │   ├── popup.ts                # 浮窗定位（居中 + 边框贴合 + 边界翻转）
│   │   ├── sidebar-groups.ts       # 侧栏独立小节标头、置顶排序与数量控制
│   │   ├── sidebar-tabs.ts         # 侧栏未归档/归档分页与筛选框
│   │   ├── plugin-config.ts        # 插件全局配置数据模型与持久化驱动
│   │   ├── plugin-settings.ts      # 插件页可视化设置面板
│   │   ├── tokens.ts               # 潮汐玻璃 Token 覆盖唯一定义（亮/暗成对）
│   │   └── styles.ts               # 全部组件运行期样式表 + 主题材质门控层
│   └── host/
│       └── index.ts                # Host 插件规范声明
├── docs/images/                    # 真实渲染的明暗 × 主题开关四态截图
├── scripts/capture-docs-screenshots.mjs  # 用插件组件重出全部截图
├── tests/client/native-tokens.json # 宿主原生 token 基准（用于关态截图与契约比对）
└── icon.png                        # 256x256 专属应用图标
```

---

## 开源许可

[MIT License](LICENSE) © 2026 zdt3476
