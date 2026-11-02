/**
 * 生成文档与展示用的隔离组件预览截图。
 *
 * 画面在浏览器内通过真实 UI 组件（src/client/*）与隔离夹具渲染，用于组件级视觉与状态预览，
 * 明确区分于生产宿主环境的 live 截图。Token 统一在浏览器内从 src/client/tokens.ts 动态引入，
 * 杜绝手写 token 分叉。
 */
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const vitePath = require.resolve('vite', { paths: [require.resolve('vitest/package.json')] })
const { createServer } = await import(pathToFileURL(vitePath).href)
const { chromium } = process.env.PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href)
  : await import('playwright')

/** 页面壳：底色与文字跟随主题变量。 */
const SHELL_CSS = `
  html, body { margin: 0; padding: 0; }
  body {
    background-color: var(--dsw-alias-bg-base, #0b1420);
    color: var(--dsw-alias-label-primary, #e9effa);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
`

/**
 * 侧栏演示壳：层级与宿主一致（标题 / tabs / 搜索 / 工作区列表）。
 * 会话数走 `data-dsh-tide-count`，由插件自身的 ::after 渲染，不是手画的。
 */
const SIDEBAR_MARKUP = `
  <div data-slot="sidebar.workspaces" style="background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsh-tide-glass-border);border-radius:12px;padding:12px;width:268px;box-sizing:border-box;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;">
      <strong style="font-size:13px;color:var(--dsw-alias-label-primary);font-weight:600;">工作区</strong>
      <span style="color:var(--dsw-alias-label-caption);font-size:12px;">⌕</span>
    </div>
    <div style="display:flex;gap:16px;border-bottom:1px solid var(--dsh-tide-glass-border);padding-bottom:6px;font-size:12px;margin-bottom:9px;">
      <span style="font-weight:600;color:var(--dsw-alias-state-business-primary);border-bottom:2px solid var(--dsw-alias-state-business-primary);padding-bottom:6px;margin-bottom:-7px;">未归档</span>
      <span style="color:var(--dsw-alias-label-tertiary);">已归档</span>
    </div>
    <input placeholder="筛选工作区或会话..." style="width:100%;box-sizing:border-box;margin-bottom:6px;padding:6px 9px;font-size:11px;color:var(--dsw-alias-label-secondary);border:1px solid var(--dsh-tide-card-border);border-radius:6px;background:var(--dsw-alias-interactive-bg-hover);" />
    <div class="workspace-list-container" style="display:flex;flex-direction:column;">
      ${[
        ['default', 3],
        ['dsh-tide-theme', 5],
        ['web-dashboard', 2],
        ['api-service', 1],
        ['design-system', 4],
        ['docs-site', 0]
      ].map(([id, count]) => `<div><span><div data-row-key="workspace:${id}" style="display:flex;align-items:center;padding:5px 8px;border-radius:6px;color:var(--dsw-alias-label-secondary);font-size:12.5px;">${id}</div></span>${Array.from({ length: count }, (_, i) => `<div data-row-key="session:${id}-${i}" style="display:none;">会话 ${i + 1}</div>`).join('')}</div>`).join('')}
    </div>
  </div>
`

const server = await createServer({
  root: process.cwd(),
  configFile: false,
  server: { host: '127.0.0.1', port: 0 },
  plugins: [{
    name: 'capture-page',
    configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (req.url === '/fixture') {
          res.setHeader('Content-Type', 'text/html')
          res.end(await vite.transformIndexHtml('/fixture',
            '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="mount"></div></body></html>'))
          return
        }
        next()
      })
    }
  }]
})
await server.listen()
const origin = `http://127.0.0.1:${server.httpServer.address().port}`
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {})
})

/**
 * 按宿主方式注入 Simplify Theme：
 * 1. 动态 import 真实 SIMPLIFY_TOKENS（源自 src/client/tokens.ts 单一数据源，去手写）。
 * 2. 依据入参 mode ('dark' | 'light') 选取对应 token，不走错误的 process.env.LIGHT 分支。
 * 3. 给 body 挂载 data-dsh-tide-theme gate，并按 mode 开闭 data-ds-dark-theme。
 */
async function theme(page, mode = 'dark', themeOn = true) {
  await page.evaluate(async ({ shellCss, mode, themeOn }) => {
    const { SIMPLIFY_TOKENS } = await import('/src/client/tokens.ts')
    // 主题开启：注入插件自有调色板；关闭：注入宿主原生 token 基准，
    // 让组件回落到 DSH 原生外观（与真实宿主切换 themeOverrides 等价）。
    let source
    if (themeOn) {
      source = Object.fromEntries(Object.entries(SIMPLIFY_TOKENS).map(([k, v]) => [k, mode === 'light' ? v.light : v.dark]))
    } else {
      const native = await fetch('/tests/client/native-tokens.json').then((r) => r.json())
      source = Object.fromEntries(Object.entries(native).map(([k, v]) => [k, typeof v === 'object' ? (mode === 'light' ? v.light : v.dark) : v]))
      // 补宿主深/浅画布底色（native-tokens.json 未收录该键）
      source['--dsw-alias-bg-base'] = mode === 'dark' ? '#151517' : '#f4f7fb'
    }
    const tokenRules = Object.entries(source)
      .filter(([, v]) => v)
      .map(([prop, val]) => `${prop}: ${val};`)
      .join('\n')

    const style = document.createElement('style')
    style.setAttribute('data-dsh-tide-tokens', '')
    style.textContent = `body, :root { ${tokenRules} }\n${shellCss}`
    document.head.append(style)

    if (themeOn) document.body.setAttribute('data-dsh-tide-theme', '')
    else document.body.removeAttribute('data-dsh-tide-theme')
    if (mode === 'dark') {
      document.body.setAttribute('data-ds-dark-theme', '')
    } else {
      document.body.removeAttribute('data-ds-dark-theme')
    }
    document.documentElement.style.colorScheme = mode
  }, { shellCss: SHELL_CSS, mode, themeOn })
}

/**
 * 计算元素或一组元素相对于视口的安全 clip 区域，确保绝不出视口范围。
 */
async function computeSafeClip(page, locators, padding = 24) {
  const viewport = page.viewportSize() ?? { width: 1200, height: 900 }
  const boxes = (await Promise.all(locators.map((l) => l.boundingBox()))).filter(Boolean)
  if (boxes.length === 0) {
    throw new Error('computeSafeClip: 未能获取到待截取元素的包围盒')
  }

  const rawLeft = Math.min(...boxes.map((b) => b.x)) - padding
  const rawTop = Math.min(...boxes.map((b) => b.y)) - padding
  const rawRight = Math.max(...boxes.map((b) => b.x + b.width)) + padding
  const rawBottom = Math.max(...boxes.map((b) => b.y + b.height)) + padding

  const clipX = Math.max(0, Math.min(rawLeft, viewport.width - 1))
  const clipY = Math.max(0, Math.min(rawTop, viewport.height - 1))
  const clipRight = Math.min(viewport.width, Math.max(clipX + 1, rawRight))
  const clipBottom = Math.min(viewport.height, Math.max(clipY + 1, rawBottom))

  return {
    x: clipX,
    y: clipY,
    width: clipRight - clipX,
    height: clipBottom - clipY
  }
}

/**
 * 生成一组截图。文件命名规则：<name>-<mode>.png 表示「主题开启」，
 * <name>-<mode>-native.png 表示「主题关闭（回落 DSH 原生外观）」。
 * 明暗两档都必须出图，README 与市场画廊按同一份约定引用。
 */
async function captureOne(mode, themeOn) {
  const suffix = themeOn ? mode : `${mode}-native`
  const file = (name) => `docs/images/${name}-${suffix}.png`

  // ——— 1. 侧栏独立小节分区分组 ———
  const sidebarPage = await browser.newPage({ viewport: { width: 360, height: 620 }, deviceScaleFactor: 2 })
  await sidebarPage.goto(`${origin}/fixture`)
  await sidebarPage.evaluate(async ({ markup }) => {
    const { locale } = await import('/scripts/locale-fixture.mjs')
    const { mountSidebarGroups } = await import('/src/client/sidebar-groups.ts')
    const { UI_CSS } = await import('/src/client/styles.ts')
    const style = document.createElement('style')
    style.textContent = UI_CSS
    document.head.append(style)

    localStorage.setItem('dsh-tide-theme.pinned-workspaces',
      JSON.stringify(['default', 'dsh-tide-theme', 'web-dashboard', 'api-service']))

    const mount = document.getElementById('mount')
    mount.style.padding = '28px'
    mount.innerHTML = markup

    const workspaces = ['default', 'dsh-tide-theme', 'web-dashboard', 'api-service', 'design-system', 'docs-site']
      .map((workspaceId) => ({ workspaceId, sessionIds: [] }))

    mountSidebarGroups({
      locale,
      createElement: (tag) => document.createElement(tag),
      archivedFilter: () => 'default',
      workspaces: { getSnapshot: () => ({ items: workspaces }), subscribe: () => () => {} },
      sessions: { getSnapshot: () => ({ byId: {} }), subscribe: () => () => {} }
    })
  }, { markup: SIDEBAR_MARKUP })
  await theme(sidebarPage, mode, themeOn)
  await sidebarPage.waitForSelector('[data-dsh-tide-section="pinned"]')
  // 侧栏并非主题材质门控对象（其配色来自 token 层），故只在主题开启态出图，避免产出无意义的重图。
  if (themeOn) {
    await sidebarPage.locator('[data-slot="sidebar.workspaces"]').screenshot({ path: file('current-sidebar') })
    console.log(`✓ ${file('current-sidebar')}`)
  }
  await sidebarPage.close()

  // ——— 2. 底栏平铺 HUD + 展开的性能看板（隔离组件预览，去无用配重假控件） ———
  const dockPage = await browser.newPage({ viewport: { width: 1180, height: 1180 }, deviceScaleFactor: 2 })
  await dockPage.goto(`${origin}/fixture`)
  await dockPage.evaluate(async () => {
    const { locale } = await import('/scripts/locale-fixture.mjs')
    await import('/tests/client/dock-stats-fixture.mjs')
    const { React, ReactDOM, UI_CSS, createDockStats } = window.testFixture
    const style = document.createElement('style')
    style.textContent = UI_CSS
    document.head.append(style)

    const mount = document.getElementById('mount')
    mount.style.cssText = 'padding:40px;box-sizing:border-box;width:1180px;display:flex;justify-content:center;'
    mount.innerHTML = `
      <div data-composer-seat style="width:100%;display:flex;justify-content:center;">
        <div data-composer-dock style="display:flex;justify-content:center;align-items:center;">
          <div data-dsh-tide-dock style="display:flex;align-items:center;justify-content:center;">
            <div id="stats-mount"></div>
          </div>
        </div>
      </div>`

    const projections = {
      sessionStats: { turns: 12, steps: 148, decodeTokens: 142800, ttftMs: 4100000, ttftSteps: 140, decodeMs: 680000, llmMs: 4780000, toolMs: 95000 },
      tokenUsage: { totals: { uncachedInputTokens: 148200, cacheReadTokens: 28450000, cacheWriteTokens: 620000, outputTokens: 142800 } },
      contextPressure: { projectedTokens: 128500, contextWindow: 524288 },
      contextBreakdown: { systemTokens: 8500, toolsTokens: 18200, messageTokens: 101800 }
    }
    const Stats = createDockStats({ h: React.createElement, hooks: React, t: locale })
    ReactDOM.createRoot(document.getElementById('stats-mount'))
      .render(React.createElement(Stats, { useProjection: (k) => projections[k] }))
  })
  await theme(dockPage, mode, themeOn)
  await dockPage.waitForSelector('[data-dsh-tide-dock-center]')
  await dockPage.locator('.dsh-tide-dock-stats-trigger').click()
  await dockPage.waitForSelector('[data-dsh-tide-stats-popover]')

  // 确保 portal 挂载到 body 上的弹窗与 dock 栏整体截取不出视口
  const dockClip = await computeSafeClip(dockPage, [
    dockPage.locator('[data-dsh-tide-stats-popover]'),
    dockPage.locator('[data-dsh-tide-dock-center]')
  ], 28)

  await dockPage.screenshot({
    path: file('current-dock'),
    clip: dockClip
  })
  console.log(`✓ ${file('current-dock')}`)
  await dockPage.close()

  // ——— 3. Agent Graph 子代理派发图 ———
  const graphPage = await browser.newPage({ viewport: { width: 1240, height: 900 }, deviceScaleFactor: 2 })
  await graphPage.goto(`${origin}/fixture`)
  await graphPage.evaluate(async () => {
    const { locale } = await import('/scripts/locale-fixture.mjs')
    const { mountDelegationPanel } = await import('/src/client/delegation-panel.ts')
    const { UI_CSS } = await import('/src/client/styles.ts')
    const style = document.createElement('style')
    style.textContent = UI_CSS
    document.head.append(style)

    const A = '11111111-1111-1111-1111-111111111111'
    const B = '22222222-2222-2222-2222-222222222222'
    const C = '33333333-3333-3333-3333-333333333333'
    const D = '44444444-4444-4444-4444-444444444444'
    const child = (id, title, model, running, steps, settledMs) => ({
      id, origin: 'subagent', parentId: 'session-demo', displayTitle: title, running,
      projectionValues: { modelSelection: { model }, sessionStats: { steps }, subagentTiming: { settledMs } }
    })

    const rows = {
      [A]: child(A, 'Research: 客户端断连日志排查', 'DeepSeek-V3', false, 6, 8200),
      [B]: child(B, 'Code: 重连退避与心跳重建实现', 'DeepSeek-V3', true, 14, 15400),
      [C]: child(C, 'Analyze: 服务端网关超时分布分析', 'Claude-3.5-Sonnet', true, 9, 11200),
      [D]: child(D, 'Verify: 回归用例与压测验收', 'GPT-4o', false, 4, 4500)
    }

    const mount = document.getElementById('mount')
    mount.style.cssText = 'padding:36px;display:flex;justify-content:center;'
    mount.innerHTML = `
      <div style="width:800px;">
        <div id="step-process" data-step-process data-chat-turn="turn-1">
          ${[A, B, C, D].map((id, i) => `<div data-chat-turn="turn-1" data-chat-node-key="k${i}"><div data-tool="subagent" data-state="${rows[id].running ? 'running' : 'ok'}">${id}</div></div>`).join('')}
        </div>
      </div>`

    mountDelegationPanel({
      sessions: { getSnapshot: () => ({ byId: rows }), subscribe: () => () => {} },
      currentSessionId: () => 'session-demo',
      locale,
      openSession: () => {},
      canCancel: () => true,
      cancelSession: () => {}
    })
  })
  await theme(graphPage, mode, themeOn)
  await graphPage.waitForSelector('.subagent-topology-summary')
  await graphPage.locator('.subagent-topology-summary').click()
  await graphPage.waitForSelector('.subagent-topology-detail')
  await graphPage.waitForTimeout(450)
  await graphPage.locator('.subagent-topology').screenshot({ path: file('current-delegation') })
  console.log(`✓ ${file('current-delegation')}`)
  await graphPage.close()

  // ——— 3b. 输入区控件：模型选择面板 / 思考等级滑块 / 权限预设 ———
  // 这三处不是主题材质门控对象，只在主题开启态出图；演示目录与演示会话均为本地假数据。
  if (themeOn) {
    const controlPage = await browser.newPage({ viewport: { width: 780, height: 1080 }, deviceScaleFactor: 2 })
    await controlPage.goto(`${origin}/fixture`)
    await controlPage.evaluate(async () => {
      const { locale } = await import('/scripts/locale-fixture.mjs')
      await import('/tests/client/dock-stats-fixture.mjs')
      const { React, ReactDOM, UI_CSS, createModelControl } = window.testFixture
      const style = document.createElement('style')
      style.textContent = UI_CSS
      document.head.append(style)

      const snapshot = {
        current: { provider: 'deepseek', model: 'deepseek-v4.1-flash', reasoningEffort: 'medium' },
        groups: [
          {
            id: 'deepseek', name: 'DeepSeek',
            models: [
              { id: 'deepseek-v4.1-flash', name: 'DeepSeek-V4.1-Flash', reasoning: { defaultEffort: 'medium', efforts: [{ id: 'low', name: 'Fast' }, { id: 'medium', name: 'Balanced' }, { id: 'high', name: 'Deep' }] } },
              { id: 'deepseek-v4.1-pro', name: 'DeepSeek-V4.1-Pro', reasoning: { defaultEffort: 'high', efforts: [{ id: 'medium', name: 'Balanced' }, { id: 'high', name: 'Deep' }] } }
            ]
          },
          {
            id: 'anthropic', name: 'Anthropic',
            models: [{ id: 'claude-3.5-sonnet', name: 'Claude-3.5-Sonnet' }]
          },
          {
            id: 'openai', name: 'OpenAI',
            models: [{ id: 'gpt-4o', name: 'GPT-4o' }]
          }
        ],
        failures: [], status: 'ready', pending: null, error: null, retainedEffort: 'medium', routable: true
      }
      const directory = {
        store: { subscribe: () => () => {}, getSnapshot: () => snapshot },
        load: async () => snapshot,
        select: async () => ({ ok: true })
      }

      const mount = document.getElementById('mount')
      mount.style.cssText = 'padding:40px;display:flex;flex-direction:column;gap:16px;align-items:flex-start;'
      mount.innerHTML = '<div data-composer-seat style="width:100%"><div data-composer-card style="border-radius:18px;padding:16px;border:1px solid var(--dsw-alias-border-l2)"><div data-dsh-tide-dock style="display:flex;align-items:center"><div id="ctl"></div></div></div></div>'
      const Control = createModelControl({
        sessionId: 'demo-session',
        directories: { directoryFor: () => directory },
        shared: { h: React.createElement, hooks: React, t: locale }
      })
      ReactDOM.createRoot(document.getElementById('ctl')).render(React.createElement(Control, {}))
    })
    await theme(controlPage, mode, themeOn)
    await controlPage.waitForSelector('[data-dsh-tide-pill]')

    // 模型选择面板
    await controlPage.locator('[data-dsh-tide-pill]').first().click()
    await controlPage.waitForTimeout(320)
    // 弹层是 portal 到 body 的，clip 必须同时覆盖触发器与弹层，否则会被裁掉
    const modelClip = await controlPage.evaluate(() => {
      const trigger = document.querySelector('[data-dsh-tide-pill]')
      const popup = document.querySelector('[data-dsh-tide-popup]')
      const a = trigger.getBoundingClientRect()
      const b = popup.getBoundingClientRect()
      const pad = 20
      const left = Math.max(0, Math.min(a.left, b.left) - pad)
      const top = Math.max(0, Math.min(a.top, b.top) - pad)
      const right = Math.min(window.innerWidth, Math.max(a.right, b.right) + pad)
      const bottom = Math.min(window.innerHeight, Math.max(a.bottom, b.bottom) + pad)
      return { x: left, y: top, width: right - left, height: bottom - top }
    })
    await controlPage.screenshot({ path: file('current-model'), clip: modelClip })
    console.log(`✓ ${file('current-model')}`)
    await controlPage.keyboard.press('Escape')
    await controlPage.waitForTimeout(200)
    await controlPage.close()
  }

  // ——— 4. 插件页可视化配置面板 ———
  const settingsPage = await browser.newPage({ viewport: { width: 720, height: 1200 }, deviceScaleFactor: 2 })
  await settingsPage.goto(`${origin}/fixture`)
  await settingsPage.evaluate(async () => {
    const { locale } = await import('/scripts/locale-fixture.mjs')
    await import('/tests/client/dock-stats-fixture.mjs')
    const { React, ReactDOM, UI_CSS, createPluginSettings } = window.testFixture
    const style = document.createElement('style')
    style.textContent = UI_CSS
    document.head.append(style)

    const mount = document.getElementById('mount')
    mount.style.cssText = 'padding:26px;display:flex;justify-content:center;'
    const Settings = createPluginSettings({ h: React.createElement, hooks: React, t: locale })
    ReactDOM.createRoot(mount).render(React.createElement(Settings, {}))
  })
  await theme(settingsPage, mode, themeOn)
  await settingsPage.waitForSelector('[data-dsh-tide-settings]')
  if (themeOn) {
    await settingsPage.locator('#mount').screenshot({ path: file('current-settings') })
    console.log(`✓ ${file('current-settings')}`)
  }
  await settingsPage.close()

  // ——— 5. 16:9 展台大图：四个真实模块并排（仅截取平铺 HUD，不打开弹窗，不手工 DOM remove） ———
  const bannerPage = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 })
  await bannerPage.goto(`${origin}/fixture`)
  await bannerPage.evaluate(async ({ sidebarMarkup }) => {
    const { locale } = await import('/scripts/locale-fixture.mjs')
    await import('/tests/client/dock-stats-fixture.mjs')
    const { React, ReactDOM, UI_CSS, createDockStats, createPluginSettings } = window.testFixture
    const { mountSidebarGroups } = await import('/src/client/sidebar-groups.ts')
    const { mountDelegationPanel } = await import('/src/client/delegation-panel.ts')

    const style = document.createElement('style')
    style.textContent = `
      ${UI_CSS}
      #mount { width: 1600px; height: 900px; box-sizing: border-box; padding: 26px 30px 30px; display: flex; flex-direction: column; gap: 18px; }
      .b-head { display: flex; align-items: center; justify-content: space-between; }
      .b-brand { display: flex; align-items: center; gap: 13px; }
      .b-brand img { width: 40px; height: 40px; border-radius: 10px; box-shadow: 0 6px 18px rgba(0,0,0,.5); }
      .b-brand h1 { margin: 0; font-size: 21px; font-weight: 700; letter-spacing: -.02em; color: var(--dsw-alias-label-primary); }
      .b-brand p { margin: 3px 0 0; font-size: 12px; color: var(--dsw-alias-label-tertiary); }
      .b-tags { display: flex; gap: 8px; }
      .b-tag { padding: 5px 11px; border-radius: 999px; border: 1px solid var(--dsh-tide-card-border); background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); font-size: 11px; }
      .b-stage {
        display: grid;
        grid-template-columns: 244px 1fr 1fr 330px;
        grid-template-rows: 1fr auto;
        gap: 14px;
        flex: 1;
        min-height: 0;
      }
      .b-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; min-height: 0; }
      .b-label { display: flex; align-items: center; gap: 7px; color: var(--dsw-alias-label-tertiary); font-size: 11px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; }
      .b-label::before { content: ''; width: 5px; height: 5px; border-radius: 999px; background: var(--dsw-alias-state-business-primary); }
      .b-card { border: 1px solid var(--dsh-tide-card-border); border-radius: 14px; background: var(--dsh-tide-card-surface); overflow: hidden; box-sizing: border-box; }
      .b-scroll { overflow: hidden; }
    `
    document.head.append(style)

    const mount = document.getElementById('mount')
    mount.innerHTML = `
      <div class="b-head">
        <div class="b-brand">
          <img src="/docs/images/icon.png" alt="" />
          <div>
            <h1>潮汐主题 · Tide Theme</h1>
            <p>DeepSeek Harness 潮汐主题 · 性能 HUD · Agent Graph · 侧栏小节 · 可视化配置</p>
          </div>
        </div>
        <div class="b-tags">
          <span class="b-tag">真实端到端 TPS</span>
          <span class="b-tag">Orchestrator 拓扑</span>
          <span class="b-tag">玻璃拟态 HUD</span>
          <span class="b-tag">即时可视化配置</span>
        </div>
      </div>
      <div class="b-stage">
        <div class="b-col" style="grid-column:1;grid-row:1 / span 2;">
          <div class="b-label">侧栏 · 置顶小节</div>
          <div class="b-card" style="padding:12px;">${sidebarMarkup}</div>
        </div>

        <div class="b-col" style="grid-column:2 / span 2;grid-row:1;">
          <div class="b-label">Agent Graph · 子代理拓扑</div>
          <div class="b-card" style="padding:14px 16px;flex:1;display:flex;flex-direction:column;justify-content:center;">
            <div id="b-graph"></div>
          </div>
        </div>

        <div class="b-col" style="grid-column:2 / span 2;grid-row:2;">
          <div class="b-label">性能 HUD · 平铺状态流</div>
          <div class="b-card" style="padding:18px;">
            <div id="b-dock"></div>
          </div>
        </div>

        <div class="b-col" style="grid-column:4;grid-row:1 / span 2;">
          <div class="b-label">插件页 · 可视化配置</div>
          <div class="b-card b-scroll" id="b-settings" style="flex:1;min-height:0;padding:16px;"></div>
        </div>
      </div>`

    // 侧栏
    localStorage.setItem('dsh-tide-theme.pinned-workspaces',
      JSON.stringify(['default', 'dsh-tide-theme', 'web-dashboard', 'api-service']))
    const workspaces = ['default', 'dsh-tide-theme', 'web-dashboard', 'api-service', 'design-system', 'docs-site']
      .map((workspaceId) => ({ workspaceId, sessionIds: [] }))
    mountSidebarGroups({
      locale,
      createElement: (tag) => document.createElement(tag),
      archivedFilter: () => 'default',
      workspaces: { getSnapshot: () => ({ items: workspaces }), subscribe: () => () => {} },
      sessions: { getSnapshot: () => ({ byId: {} }), subscribe: () => () => {} }
    })

    // Agent Graph
    const ids = ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444']
    const metas = [
      ['Research: 断连日志排查', 'DeepSeek-V3', false, 6, 8200],
      ['Code: 重连退避实现', 'DeepSeek-V3', true, 14, 15400],
      ['Analyze: 网关超时分布', 'Claude-3.5-Sonnet', true, 9, 11200],
      ['Verify: 回归压测验收', 'GPT-4o', false, 4, 4500]
    ]
    const rows = {}
    ids.forEach((id, i) => {
      const [title, model, running, steps, settledMs] = metas[i]
      rows[id] = {
        id, origin: 'subagent', parentId: 'session-demo', displayTitle: title, running,
        projectionValues: { modelSelection: { model }, sessionStats: { steps }, subagentTiming: { settledMs } }
      }
    })
    document.getElementById('b-graph').innerHTML = `
      <div id="step-process" data-step-process data-chat-turn="turn-1">
        ${ids.map((id, i) => `<div data-chat-turn="turn-1" data-chat-node-key="n${i}"><div data-tool="subagent" data-state="${rows[id].running ? 'running' : 'ok'}">${id}</div></div>`).join('')}
      </div>`
    mountDelegationPanel({
      sessions: { getSnapshot: () => ({ byId: rows }), subscribe: () => () => {} },
      currentSessionId: () => 'session-demo',
      locale,
      openSession: () => {},
      canCancel: () => true,
      cancelSession: () => {}
    })

    // HUD：仅保留真实 HUD 容器，去无用配重假控件
    const projections = {
      sessionStats: { turns: 12, steps: 148, decodeTokens: 142800, ttftMs: 4100000, ttftSteps: 140, decodeMs: 680000, llmMs: 4780000, toolMs: 95000 },
      tokenUsage: { totals: { uncachedInputTokens: 148200, cacheReadTokens: 28450000, cacheWriteTokens: 620000, outputTokens: 142800 } },
      contextPressure: { projectedTokens: 128500, contextWindow: 524288 },
      contextBreakdown: { systemTokens: 8500, toolsTokens: 18200, messageTokens: 101800 }
    }
    const shared = { h: React.createElement, hooks: React, t: locale }
    document.getElementById('b-dock').innerHTML = `
      <div data-composer-seat>
        <div data-composer-dock style="display:flex;justify-content:center;">
          <div data-dsh-tide-dock style="display:flex;width:100%;align-items:center;justify-content:center;">
            <div id="b-stats"></div>
          </div>
        </div>
      </div>`
    const Stats = createDockStats(shared)
    ReactDOM.createRoot(document.getElementById('b-stats'))
      .render(React.createElement(Stats, { useProjection: (k) => projections[k] }))

    const Settings = createPluginSettings(shared)
    ReactDOM.createRoot(document.getElementById('b-settings')).render(React.createElement(Settings, {}))
  }, { sidebarMarkup: SIDEBAR_MARKUP })
  await theme(bannerPage, mode, themeOn)
  await bannerPage.waitForSelector('.subagent-topology-summary')
  await bannerPage.locator('.subagent-topology-summary').click()
  await bannerPage.waitForSelector('.subagent-topology-detail')
  // 直接截取默认平铺 HUD，不打开 popover 弹窗，不手工 DOM remove
  await bannerPage.waitForSelector('#b-stats [data-dsh-tide-dock-center]')
  await bannerPage.waitForTimeout(400)
  if (themeOn) {
    await bannerPage.screenshot({ path: file('banner') })
    console.log(`✓ ${file('banner')}`)
  }
  await bannerPage.close()
}

async function capture() {
  const combos = [
    ['dark', true],
    ['dark', false],
    ['light', true],
    ['light', false]
  ]
  for (const [mode, themeOn] of combos) {
    await captureOne(mode, themeOn)
  }
  await browser.close()
  await server.close()
  console.log('🎉 明暗 × 主题开关四态截图已生成')
}

capture().catch(async (error) => {
  console.error(error)
  await browser.close().catch(() => {})
  await server.close().catch(() => {})
  process.exit(1)
})
