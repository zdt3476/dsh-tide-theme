import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const vitePath = require.resolve('vite', { paths: [require.resolve('vitest/package.json')] })
const { createServer } = await import(pathToFileURL(vitePath).href)
const { chromium } = process.env.PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href)
  : await import('playwright')

let server, browser, origin
before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('../..', import.meta.url)),
    configFile: false,
    server: { host: '127.0.0.1', port: 0 },
    plugins: [{
      name: 'test-page',
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (req.url !== '/fixture') return next()
          res.setHeader('Content-Type', 'text/html')
          const html = await vite.transformIndexHtml('/fixture', '<!doctype html><html><head></head><body><div id="mount"></div></body></html>')
          res.end(html)
        })
      }
    }]
  })
  await server.listen()
  origin = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {})
  })
})

after(async () => {
  await browser?.close()
  await server?.close()
})

test('底部栏平铺展示上下文、真实 TPS、缓存命中与耗时，并隐藏原生弹窗胶囊', async (t) => {
  const page = await browser.newPage()
  t.after(() => page.close())
  await page.goto(`${origin}/fixture`)

  await page.evaluate(async () => {
    await import('/tests/client/dock-stats-fixture.mjs')
    const { React, ReactDOM, UI_CSS, createDockStats } = window.testFixture

    const style = document.createElement('style')
    style.textContent = `
      :root {
        --dsw-alias-bg-base: #fff;
        --dsw-alias-bg-layer-2: #fff;
        --dsw-alias-border-l1: rgba(0, 0, 0, 0.08);
        --dsw-alias-border-l2: rgba(0, 0, 0, 0.12);
        --dsw-alias-label-primary: #0f1115;
        --dsw-alias-label-secondary: #4b5563;
        --dsw-alias-label-tertiary: #6b7280;
        --dsw-alias-state-error-primary: #dc2626;
        --dsw-alias-state-success-primary: #16a34a;
        --dsw-alias-state-business-primary: #2563eb;
        --dsw-alias-interactive-bg-hover: rgba(0, 0, 0, 0.05);
        --dsw-radius-md: 8px;
        --dsw-radius-lg: 12px;
      }
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #f9fafb;
        height: 100vh;
      }
      #mount {
        position: fixed;
        bottom: 24px;
        left: calc(50% - 380px);
        width: 760px;
        max-width: calc(100vw - 32px);
      }
      ${UI_CSS}
    `
    document.head.append(style)

    // 模拟 DSH 真实底部 DOM 结构：原生 [data-composer-dock] 内含原生胶囊和上下文环
    const mount = document.getElementById('mount')
    mount.innerHTML = `
      <div data-composer-seat>
        <div data-composer-dock>
          <div data-dsh-tide-dock>
            <div data-dsh-tide-dock-left><button id="btn-model">GPT-5</button></div>
            <div id="stats-mount"></div>
            <div data-dsh-tide-dock-right><button id="btn-perm">只读</button></div>
          </div>
          <!-- 原生应被隐藏的状态胶囊 -->
          <span data-composer-stat="activity"><button>4 轮 · 204 token/秒</button></span>
          <span data-composer-stat="usage"><button>24.5k · 缓存命中 82%</button></span>
          <span><button aria-label="上下文 24%"><svg><circle></circle></svg><span>24%</span></button></span>
        </div>
      </div>
      <!-- 最后一轮耗时标记 -->
      <div data-turn-tail><div data-clock="end"><span data-dsh-tide-duration>4.2 秒</span></div></div>
    `

    // 会话投影模拟数据
    const projections = {
      sessionStats: {
        turns: 9,
        steps: 126,
        decodeTokens: 116532,
        ttftMs: 3704044,
        ttftSteps: 122,
        decodeMs: 570592,
        llmMs: 4291888,
        toolMs: 87811
      },
      tokenUsage: {
        totals: {
          uncachedInputTokens: 133284,
          cacheReadTokens: 23333115,
          cacheWriteTokens: 500169,
          outputTokens: 116862
        }
      },
      contextPressure: {
        pressureTokens: 121055,
        contextWindow: 500000
      }
    }

    const shared = {
      h: React.createElement,
      hooks: React,
      t: (key) => key
    }

    const StatsComponent = createDockStats(shared)
    const root = ReactDOM.createRoot(document.getElementById('stats-mount'))
    root.render(React.createElement(StatsComponent, {
      useProjection: (key) => projections[key]
    }))
  })

  // 1. 原生统计胶囊和上下文环必须被 CSS 完全隐藏 (display: none)
  await page.waitForFunction(() => {
    const act = document.querySelector('[data-composer-stat="activity"]')
    const use = document.querySelector('[data-composer-stat="usage"]')
    const ring = document.querySelector('[data-composer-dock] > span:has(> button > svg)')
    if (!act || !use || !ring) return false
    return getComputedStyle(act).display === 'none' &&
           getComputedStyle(use).display === 'none' &&
           getComputedStyle(ring).display === 'none'
  })

  // 2. 平铺状态栏正确渲染并且内容准确充足（包含轮步、容量、真实TPS、缓存命中、单轮耗时）
  await page.waitForSelector('[data-dsh-tide-dock-center]')
  await page.screenshot({ path: '/tmp/dock-stats-flat.png' })
  const trigger = page.locator('.dsh-tide-dock-stats-trigger')
  // 玻璃托盘的字号随视觉重构调过，这里只断言「可读且未退化为注释级小字」，不锁死具体像素；
  // 精确比例（读数 16px / 标签 11px / 轨道 3px）由 entry.spec 的 UI_CSS 契约守护。
  const triggerFontSize = Number.parseFloat(await trigger.evaluate(el => getComputedStyle(el).fontSize))
  assert.ok(triggerFontSize >= 10.5 && triggerFontSize <= 13, `trigger font-size ${triggerFontSize}px out of range`)
  // 托盘必须是有描边的玻璃表面，而不是原来的透明底。
  assert.notEqual(await trigger.evaluate(el => getComputedStyle(el).borderTopColor), 'rgba(0, 0, 0, 0)')

  const activityText = await page.locator('.dsh-tide-stat-item.is-activity .dsh-tide-hud-val').textContent()
  const contextText = await page.locator('.dsh-tide-stat-item.is-context .dsh-tide-hud-val').textContent()
  const tpsText = await page.locator('.dsh-tide-stat-item.is-tps .dsh-tide-hud-val').textContent()
  const cacheText = await page.locator('.dsh-tide-stat-item.is-cache .dsh-tide-hud-val').textContent()
  const durationText = await page.locator('.dsh-tide-stat-item.is-duration .dsh-tide-stat-item-main').textContent()

  assert.equal(activityText, '9 轮 / 126 步')
  assert.equal(contextText, '121k / 500k (24%)')
  // 验证上下文颜色提示（<=50% 呈现 good 绿色）
  assert.equal(await page.locator('.dsh-tide-stat-item.is-context').getAttribute('data-dsh-tide-pct'), 'good')
  // 验证真实 TPS（包含首字延迟，而非虚高的 204）
  assert.equal(tpsText, '27.2 t/s')
  // 验证 TPS 标签写“平均 TPS”
  assert.equal(await page.locator('.dsh-tide-stat-item.is-tps .dsh-tide-stat-label-text').textContent(), '平均 TPS')
  // 验证缓存命中率（percent-only 同步旧断言）
  assert.equal(cacheText, '99%')
  // 验证单轮耗时（有本轮来源标“本轮耗时”）
  assert.equal(await page.locator('.dsh-tide-stat-item.is-duration .dsh-tide-stat-label-text').textContent(), '本轮耗时')
  assert.equal(durationText, '4.2 秒')

  // 3. 点击平铺栏展开结构化看板浮层（Popover）
  assert.equal(await page.locator('[data-dsh-tide-stats-popover]').count(), 0)
  await trigger.click()
  await page.waitForSelector('[data-dsh-tide-stats-popover][style*="left"]')
  await page.waitForTimeout(100)
  const popover = page.locator('[data-dsh-tide-stats-popover]')
  await page.screenshot({ path: '/tmp/dock-stats-popover.png' })

  // 验证 portal 真实挂载在 document.body 上（而非受限在 card 内部）
  assert.equal(await page.evaluate(() => document.querySelector('[data-dsh-tide-stats-popover]')?.parentElement === document.body), true)

  // 验证点击浮层内部不会误触发关闭
  await popover.locator('.dsh-tide-stats-popover-title').click()
  await page.waitForTimeout(50)
  assert.equal(await page.locator('[data-dsh-tide-stats-popover]').count(), 1)

  // 检查看板内容：标题、已用徽标、进度条、平均TPS卡片、Token明细与耗时
  assert.equal(await popover.locator('.dsh-tide-stats-popover-title').textContent(), '会话用量与性能看板')
  assert.equal(await popover.locator('.dsh-tide-stats-popover-badge').textContent(), '24% 已用')
  assert.equal(await popover.locator('.dsh-tide-stats-progress-header strong').textContent(), '121k / 500k')
  assert.match(await popover.locator('.dsh-tide-stats-card').first().textContent(), /平均 TPS/)
  assert.match(await popover.locator('.dsh-tide-stats-card').first().textContent(), /27\.2 t\/s/)

  // 检查明细数据
  const detailText = await popover.locator('.dsh-tide-stats-detail-list').textContent()
  assert.match(detailText, /未缓存输入 Tokens133,284/)
  assert.match(detailText, /缓存读取 Tokens \(Cache Read\)23,333,115/)
  assert.match(detailText, /累计消耗总 Tokens24,083,430/)

  // 检查会话活动与模型耗时拆解
  const footerText = await popover.locator('.dsh-tide-stats-footer').textContent()
  assert.match(footerText, /9 轮 \/ 126 步/)
  assert.match(footerText, /模型总耗时/)
  assert.match(footerText, /工具耗时/)

  // 4. 按 Escape 关闭看板浮层
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => document.querySelector('[data-dsh-tide-stats-popover]') === null)
})

test('真实会话复杂投影数据（高轮数、大上下文、平铺 tokenUsage）完整渲染', async (t) => {
  const page = await browser.newPage()
  t.after(() => page.close())
  await page.goto(`${origin}/fixture`)

  await page.evaluate(async () => {
    await import('/tests/client/dock-stats-fixture.mjs')
    const { React, ReactDOM, UI_CSS, createDockStats } = window.testFixture

    const style = document.createElement('style')
    style.textContent = `
      :root {
        --dsw-alias-bg-base: #fff;
        --dsw-alias-bg-layer-2: #fff;
        --dsw-alias-border-l1: rgba(0, 0, 0, 0.08);
        --dsw-alias-border-l2: rgba(0, 0, 0, 0.12);
        --dsw-alias-label-primary: #0f1115;
        --dsw-alias-label-secondary: #4b5563;
        --dsw-alias-label-tertiary: #6b7280;
        --dsw-alias-state-error-primary: #dc2626;
        --dsw-alias-state-success-primary: #16a34a;
        --dsw-alias-state-business-primary: #2563eb;
        --dsw-alias-interactive-bg-hover: rgba(0, 0, 0, 0.05);
        --dsw-radius-md: 8px;
        --dsw-radius-lg: 12px;
      }
      body {
        margin: 0;
        background: #f9fafb;
        height: 100vh;
      }
      #mount {
        position: fixed;
        bottom: 24px;
        left: calc(50% - 380px);
        width: 760px;
        max-width: calc(100vw - 32px);
      }
      ${UI_CSS}
    `
    document.head.append(style)

    const mount = document.getElementById('mount')
    mount.innerHTML = `
      <div data-composer-seat>
        <div data-composer-dock>
          <div data-dsh-tide-dock>
            <div data-dsh-tide-dock-left><button id="btn-model">DeepSeek-V3</button></div>
            <div id="stats-mount"></div>
            <div data-dsh-tide-dock-right><button id="btn-perm">只读</button></div>
          </div>
        </div>
      </div>
    `

    // 用户真实会话的投影数据（tokenUsage 是宿主返回的平铺结构）
    const projections = {
      sessionStats: {
        turns: 85,
        steps: 1979,
        decodeTokens: 917801,
        ttftMs: 43579887,
        ttftSteps: 1966,
        decodeMs: 10230270,
        llmMs: 53810157,
        toolMs: 5561012
      },
      tokenUsage: {
        uncachedInputTokens: 15425147,
        cacheReadTokens: 559962931,
        cacheWriteTokens: 1482880,
        outputTokens: 917801
      },
      contextPressure: {
        pressureTokens: 573751,
        contextWindow: 1048576
      }
    }

    const shared = {
      h: React.createElement,
      hooks: React,
      t: (key) => key
    }

    const StatsComponent = createDockStats(shared)
    const root = ReactDOM.createRoot(document.getElementById('stats-mount'))
    root.render(React.createElement(StatsComponent, {
      useProjection: (key) => projections[key]
    }))
  })

  await page.waitForSelector('[data-dsh-tide-dock-center]')
  const trigger = page.locator('.dsh-tide-dock-stats-trigger')

  // 1. 验证平铺栏各项数据充足完整
  assert.equal(await page.locator('.dsh-tide-stat-item.is-activity .dsh-tide-hud-val').textContent(), '85 轮 / 1979 步')
  assert.equal(await page.locator('.dsh-tide-stat-item.is-context .dsh-tide-hud-val').textContent(), '574k / 1M (55%)')
  // 验证上下文颜色提示（55% 呈 warn 橙黄色提醒）
  assert.equal(await page.locator('.dsh-tide-stat-item.is-context').getAttribute('data-dsh-tide-pct'), 'warn')
  assert.equal(await page.locator('.dsh-tide-stat-item.is-tps .dsh-tide-hud-val').textContent(), '17.1 t/s')
  assert.equal(await page.locator('.dsh-tide-stat-item.is-tps .dsh-tide-stat-label-text').textContent(), '平均 TPS')
  assert.equal(await page.locator('.dsh-tide-stat-item.is-cache .dsh-tide-hud-val').textContent(), '97%')
  // 无可靠本轮来源时，回退累计耗时明确标记为“模型累计”而非“本轮耗时”
  assert.equal(await page.locator('.dsh-tide-stat-item.is-duration .dsh-tide-stat-label-text').textContent(), '模型累计')
  assert.match(await page.locator('.dsh-tide-stat-item.is-duration .dsh-tide-stat-item-main').textContent(), /14 小时 56 分/)

  // 2. 点击展开看板浮层
  await trigger.click()
  await page.waitForSelector('[data-dsh-tide-stats-popover][style*="left"]')
  await page.screenshot({ path: '/tmp/dock-stats-user-session.png' })
  const popover = page.locator('[data-dsh-tide-stats-popover]')

  // 检查看板内容
  assert.equal(await popover.locator('.dsh-tide-stats-popover-title').textContent(), '会话用量与性能看板')
  assert.equal(await popover.locator('.dsh-tide-stats-popover-badge').textContent(), '55% 已用')
  assert.equal(await popover.locator('.dsh-tide-stats-progress-header strong').textContent(), '574k / 1M')

  // 检查 4 个卡片均完整渲染
  const cards = popover.locator('.dsh-tide-stats-card')
  assert.equal(await cards.count(), 4)
  assert.match(await cards.nth(0).textContent(), /17\.1 t\/s/)
  assert.match(await cards.nth(1).textContent(), /97%/)
  assert.match(await cards.nth(2).textContent(), /22\.2s/)
  assert.match(await cards.nth(3).textContent(), /14 小时 56 分/)

  // 检查 Token 详细构成完整展示
  const detailText = await popover.locator('.dsh-tide-stats-detail-list').textContent()
  assert.match(detailText, /未缓存输入 Tokens15,425,147/)
  assert.match(detailText, /缓存读取 Tokens \(Cache Read\)559,962,931/)
  assert.match(detailText, /缓存写入 Tokens \(Cache Write\)1,482,880/)
  assert.match(detailText, /模型输出 Tokens \(含思考内容\)917,801/)
  assert.match(detailText, /累计消耗总 Tokens577,788,759/)

  // 检查脚注
  const footerText = await popover.locator('.dsh-tide-stats-footer').textContent()
  assert.match(footerText, /85 轮 \/ 1979 步/)
  assert.match(footerText, /模型总耗时 14 小时 56 分/)
  assert.match(footerText, /工具耗时 1 小时 32 分/)
})

test('执行上下文压缩后，通过 projectedTokens 立即刷新平铺栏和看板数据', async (t) => {
  const page = await browser.newPage()
  t.after(() => page.close())
  await page.goto(`${origin}/fixture`)

  await page.evaluate(async () => {
    await import('/tests/client/dock-stats-fixture.mjs')
    const { React, ReactDOM, UI_CSS, createDockStats } = window.testFixture

    const style = document.createElement('style')
    style.textContent = `
      :root {
        --dsw-alias-bg-base: #fff;
        --dsw-alias-bg-layer-2: #fff;
        --dsw-alias-border-l1: rgba(0, 0, 0, 0.08);
        --dsw-alias-border-l2: rgba(0, 0, 0, 0.12);
        --dsw-alias-label-primary: #0f1115;
        --dsw-alias-label-secondary: #4b5563;
        --dsw-alias-label-tertiary: #6b7280;
        --dsw-alias-state-error-primary: #dc2626;
        --dsw-alias-state-success-primary: #16a34a;
        --dsw-alias-state-business-primary: #2563eb;
        --dsw-alias-interactive-bg-hover: rgba(0, 0, 0, 0.05);
        --dsw-radius-md: 8px;
        --dsw-radius-lg: 12px;
      }
      body { margin: 0; background: #f9fafb; height: 100vh; }
      #mount { position: fixed; bottom: 24px; left: calc(50% - 380px); width: 760px; }
      ${UI_CSS}
    `
    document.head.append(style)

    const mount = document.getElementById('mount')
    mount.innerHTML = `
      <div data-composer-seat>
        <div data-composer-dock>
          <div data-dsh-tide-dock>
            <div data-dsh-tide-dock-left><button id="btn-model">DeepSeek-V3</button></div>
            <div id="stats-mount"></div>
            <div data-dsh-tide-dock-right><button id="btn-perm">只读</button></div>
          </div>
        </div>
      </div>
    `

    window.mockProjections = {
      sessionStats: { turns: 5, steps: 40, decodeTokens: 4000, llmMs: 100000 },
      tokenUsage: { totals: { uncachedInputTokens: 20000, cacheReadTokens: 100000, outputTokens: 4000 } },
      contextPressure: { pressureTokens: 121055, contextWindow: 500000 }
    }

    const shared = {
      h: React.createElement,
      hooks: React,
      t: (key) => key
    }

    const StatsComponent = createDockStats(shared)
    window.renderStats = (projs) => {
      const root = window.reactRoot || ReactDOM.createRoot(document.getElementById('stats-mount'))
      window.reactRoot = root
      root.render(React.createElement(StatsComponent, {
        useProjection: (key) => projs[key]
      }))
    }

    window.renderStats(window.mockProjections)
  })

  await page.waitForSelector('[data-dsh-tide-dock-center]')
  const contextValue = page.locator('.dsh-tide-stat-item.is-context .dsh-tide-hud-val')
  assert.equal(await contextValue.textContent(), '121k / 500k (24%)')

  // 模拟上下文压缩发生：宿主裁剪消息后，通过 projectedTokens 立即将活跃表面缩减到 25k
  await page.evaluate(() => {
    window.mockProjections = {
      ...window.mockProjections,
      contextPressure: {
        pressureTokens: 121055, // 上一次请求采样的旧值保持不变
        projectedTokens: 25000,  // 压缩后即时反映的新尺寸
        contextWindow: 500000
      }
    }
    window.renderStats(window.mockProjections)
  })

  // 验证底部平铺栏立刻刷新
  await page.waitForFunction(() => document.querySelector('.dsh-tide-stat-item.is-context .dsh-tide-hud-val')?.textContent === '25k / 500k (5%)')
  assert.equal(await contextValue.textContent(), '25k / 500k (5%)')

  // 点击展开弹层验证内部数值也已更新
  const trigger = page.locator('.dsh-tide-dock-stats-trigger')
  await trigger.click()
  await page.waitForSelector('[data-dsh-tide-stats-popover][style*="left"]')
  const popover = page.locator('[data-dsh-tide-stats-popover]')

  assert.equal(await popover.locator('.dsh-tide-stats-popover-badge').textContent(), '5% 已用')
  assert.equal(await popover.locator('.dsh-tide-stats-progress-header strong').textContent(), '25k / 500k')
  assert.match(await popover.locator('.dsh-tide-stats-progress-footer').textContent(), /剩余空间: 475,000 tokens/)
})

test('340px 与 390px 容器窄屏自适应响应、短视口 bounds 与浮层内部点击不误关', async (t) => {
  const page = await browser.newPage({ viewport: { width: 450, height: 420 } })
  t.after(() => page.close())
  await page.goto(`${origin}/fixture`)

  await page.evaluate(async () => {
    await import('/tests/client/dock-stats-fixture.mjs')
    const { React, ReactDOM, UI_CSS, createDockStats } = window.testFixture

    const style = document.createElement('style')
    style.textContent = `
      :root {
        --dsw-alias-bg-base: #fff;
        --dsw-alias-bg-layer-2: #fff;
        --dsw-alias-border-l1: rgba(0, 0, 0, 0.08);
        --dsw-alias-border-l2: rgba(0, 0, 0, 0.12);
        --dsw-radius-md: 8px;
        --dsw-radius-lg: 12px;
      }
      body { margin: 0; background: #f9fafb; height: 100vh; }
      #mount { position: fixed; bottom: 12px; left: 16px; width: 390px; }
      ${UI_CSS}
    `
    document.head.append(style)

    const mount = document.getElementById('mount')
    mount.innerHTML = `
      <div data-composer-seat>
        <div data-composer-dock>
          <div data-dsh-tide-dock>
            <div id="stats-mount"></div>
          </div>
        </div>
      </div>
    `

    const projections = {
      sessionStats: { turns: 3, steps: 12, decodeTokens: 5000, llmMs: 12000 },
      tokenUsage: { uncachedInputTokens: 10000, cacheReadTokens: 40000, outputTokens: 5000 },
      contextPressure: { pressureTokens: 50000, contextWindow: 200000 }
    }

    const shared = { h: React.createElement, hooks: React, t: (k) => k }
    const StatsComponent = createDockStats(shared)
    const root = ReactDOM.createRoot(document.getElementById('stats-mount'))
    root.render(React.createElement(StatsComponent, { useProjection: (k) => projections[k] }))
  })

  await page.waitForSelector('[data-dsh-tide-dock-center]')
  const trigger = page.locator('.dsh-tide-dock-stats-trigger')
  assert.ok(await trigger.isVisible())

  // 1. 验证 390px 容器正常显示且宽度受控
  const triggerBox390 = await trigger.boundingBox()
  assert.ok(triggerBox390.width <= 390, `trigger width ${triggerBox390.width} exceeds container`)

  // 展开浮层验证短视口（height: 420）下的 bounds
  await trigger.click()
  await page.waitForSelector('[data-dsh-tide-stats-popover][style*="left"]')
  const popover = page.locator('[data-dsh-tide-stats-popover]')

  // 验证 portal 真实挂在 document.body
  const isDirectBodyChild = await page.evaluate(() => document.querySelector('[data-dsh-tide-stats-popover]')?.parentElement === document.body)
  assert.equal(isDirectBodyChild, true)

  const popoverBox = await popover.boundingBox()
  assert.ok(popoverBox.y >= 0, `popover top ${popoverBox.y} out of viewport`)
  assert.ok(popoverBox.x >= 0, `popover left ${popoverBox.x} out of viewport`)

  // 验证浮层内部点击不误关
  await popover.locator('.dsh-tide-stats-popover-title').click()
  await page.waitForTimeout(50)
  assert.equal(await popover.count(), 1)

  // 外部点击成功关闭
  await page.mouse.click(5, 5)
  await page.waitForFunction(() => document.querySelector('[data-dsh-tide-stats-popover]') === null)

  // 2. 进一步缩小到 340px 极端小屏容器
  await page.evaluate(() => {
    document.getElementById('mount').style.width = '340px'
  })
  await page.waitForTimeout(50)
  const triggerBox340 = await trigger.boundingBox()
  assert.ok(triggerBox340.width <= 340, `trigger width ${triggerBox340.width} exceeds 340px`)
})

test('真实调用 dockStats 开关与无投影 null 处理，验证原生 dock 与 align 变量恢复', async (t) => {
  const page = await browser.newPage()
  t.after(() => page.close())
  await page.goto(`${origin}/fixture`)

  await page.evaluate(async () => {
    await import('/tests/client/dock-stats-fixture.mjs')
    const { React, ReactDOM, UI_CSS, createDockControl, mountDockAlign, saveSimplifyConfig, DEFAULT_SIMPLIFY_CONFIG } = window.testFixture

    // 初始化重置配置
    saveSimplifyConfig(DEFAULT_SIMPLIFY_CONFIG)

    const style = document.createElement('style')
    style.textContent = `
      body { margin: 0; background: #fff; }
      #mount { padding: 20px; }
      [data-composer-card] { width: 600px; height: 120px; border-radius: 14px; }
      [data-composer-dock] { width: 100%; }
      ${UI_CSS}
    `
    document.head.append(style)

    const mount = document.getElementById('mount')
    mount.innerHTML = `
      <div data-composer-seat>
        <div data-composer-card></div>
        <div data-composer-dock>
          <div id="dock-ctrl-mount"></div>
        </div>
      </div>
    `

    window.alignHandle = mountDockAlign()

    window.mockProjs = {
      sessionStats: { turns: 1, steps: 5, decodeTokens: 200, llmMs: 1000 },
      tokenUsage: { uncachedInputTokens: 500, cacheReadTokens: 1000, outputTokens: 200 },
      contextPressure: { pressureTokens: 5000, contextWindow: 100000 }
    }

    const shared = { h: React.createElement, hooks: React, t: (k) => k }
    const DockControl = createDockControl({
      sessionId: 'sess-test',
      directories: { directoryFor: () => ({ store: { subscribe: () => () => {}, getSnapshot: () => ({ groups: [], status: 'ready', current: null, pending: null, error: null, retainedEffort: undefined }) }, load: async () => {}, select: async () => {} }) },
      remote: { permissionPresets: { catalog: async () => ({ ok: true, value: { presets: [] } }) } },
      useProjection: (k) => window.mockProjs[k],
      session: () => undefined,
      shared
    })

    const root = ReactDOM.createRoot(document.getElementById('dock-ctrl-mount'))
    window.testRoot = root
    window.renderCtrl = () => root.render(React.createElement(DockControl, {}))
    window.renderCtrl()
  })

  // 1. 验证初始化时 DockControl 平铺正常挂载，并且 mountDockAlign 为 dock 注入了 card 宽度和 inset
  await page.waitForSelector('[data-dsh-tide-dock-center]')
  await page.waitForFunction(() => {
    const row = document.querySelector('[data-composer-dock]')
    return row?.style.getPropertyValue('--dsh-tide-card-width') === '600px' &&
           row?.style.getPropertyValue('--dsh-tide-dock-inset-x') === '14px'
  })

  // 2. 真实调用配置保存开关，关闭 dockStats（禁止手动设属性代替真实开关）
  await page.evaluate(() => {
    const { saveSimplifyConfig } = window.testFixture
    saveSimplifyConfig({ dockStats: false })
  })

  // 验证 DockControl 响应开关关闭返回 null，并且 mountDockAlign 自动清理了 row 上的 CSS 变量
  await page.waitForFunction(() => document.querySelector('[data-dsh-tide-dock-center]') === null)
  await page.waitForFunction(() => {
    const row = document.querySelector('[data-composer-dock]')
    return row?.style.getPropertyValue('--dsh-tide-card-width') === '' &&
           row?.style.getPropertyValue('--dsh-tide-dock-inset-x') === ''
  })

  // 3. 再次通过真实调用打开开关，验证恢复
  await page.evaluate(() => {
    const { saveSimplifyConfig } = window.testFixture
    saveSimplifyConfig({ dockStats: true })
  })
  await page.waitForSelector('[data-dsh-tide-dock-center]')
  await page.waitForFunction(() => {
    const row = document.querySelector('[data-composer-dock]')
    return row?.style.getPropertyValue('--dsh-tide-card-width') === '600px'
  })

  // 4. 测试无投影数据时真实 mount：必须真实挂载组件断言 null，而非跳过 mount
  await page.evaluate(() => {
    window.mockProjs = {} // 清空投影
    window.renderCtrl()
  })
  await page.waitForFunction(() => document.querySelector('[data-dsh-tide-dock-center]') === null)
  // 确认在无投影状态下 dock row 变量也被优雅清理
  await page.waitForFunction(() => {
    const row = document.querySelector('[data-composer-dock]')
    return row?.style.getPropertyValue('--dsh-tide-card-width') === ''
  })
})

// 展示策略：默认只显示模型名（避免标签过长被省略），仅在跨供应商重名时补前缀；
// title 始终是完整「供应商 / 模型」，悬停可追溯来源。
const modelLabelCases = [
  { name: '唯一模型', expected: 'GPT-6', title: 'CPA / GPT-6', groups: [{ id: 'cpa', name: 'CPA', models: [{ id: 'gpt-6', name: 'GPT-6' }] }], current: { provider: 'cpa', model: 'gpt-6' } },
  { name: '跨供应商同名模型', expected: 'OMC / GPT-6', title: 'OMC / GPT-6', groups: ['CPA', 'OMC'].map(name => ({ id: name.toLowerCase(), name, models: [{ id: 'gpt-6', name: 'GPT-6' }] })), current: { provider: 'omc', model: 'gpt-6' } },
  { name: '目录缺失', expected: 'gpt-6', title: 'cpa / gpt-6', groups: [], current: { provider: 'cpa', model: 'gpt-6' }, status: 'loading' },
  { name: '模型缺失', expected: 'gpt-6', title: 'CPA / gpt-6', groups: [{ id: 'cpa', name: 'CPA', models: [] }], current: { provider: 'cpa', model: 'gpt-6' } },
  { name: '内置供应商本地化', expected: 'V3', title: 'DeepSeek 官方 / V3', groups: [{ id: 'deepseek-official', name: 'deepseek-official', models: [{ id: 'v3', name: 'V3' }] }], current: { provider: 'deepseek-official', model: 'v3' } },
  { name: 'pending 优先于 current', expected: 'gpt-6', title: 'omc / gpt-6', groups: [], current: { provider: 'cpa', model: 'old' }, pending: { provider: 'omc', model: 'gpt-6' }, status: 'selecting' },
  { name: '无选择占位', expected: '选择模型', title: '选择模型', groups: [], current: null }
]

for (const scenario of modelLabelCases) {
  test(`ModelControl 关闭态供应商前缀：${scenario.name}`, async (t) => {
    const page = await browser.newPage()
    t.after(() => page.close())
    await page.goto(`${origin}/fixture`)
    await page.evaluate(async (scenario) => {
      await import('/tests/client/dock-stats-fixture.mjs')
      const { React, ReactDOM, createModelControl } = window.testFixture
      const snapshot = { pending: null, status: 'ready', error: null, failures: [], ...scenario }
      const ModelControl = createModelControl({
        sessionId: 'model-label-test',
        directories: { directoryFor: () => ({
          store: { subscribe: () => () => {}, getSnapshot: () => snapshot },
          load: async () => snapshot,
          select: async () => ({ ok: true })
        }) },
        shared: { h: React.createElement, hooks: React, t: key => key === 'model.placeholder' ? '选择模型' : key }
      })
      ReactDOM.createRoot(document.getElementById('mount')).render(React.createElement(ModelControl))
    }, scenario)
    const pill = page.locator('[data-dsh-tide-control="model"]')
    await pill.waitFor({ state: 'visible' })
    assert.equal(await pill.locator('[data-dsh-tide-pill-label]').textContent(), scenario.expected)
    assert.equal(await pill.getAttribute('title'), scenario.title)
    assert.equal(await pill.getAttribute('aria-expanded'), 'false')
    assert.equal(await page.locator('[data-dsh-tide-model-grid]').count(), 0)
  })
}

test('模型 pill 不把常见「供应商 / 模型」标签截断（宽度上限回归）', async (t) => {
  const page = await browser.newPage()
  t.after(() => page.close())
  await page.goto(`${origin}/fixture`)

  const result = await page.evaluate(async () => {
    await import('/tests/client/dock-stats-fixture.mjs')
    const { React, ReactDOM, UI_CSS, createModelControl } = window.testFixture
    const style = document.createElement('style')
    style.textContent = UI_CSS
    document.head.append(style)

    // 真实场景里最常见也最长的组合：供应商名 + 带版本号的模型名。
    const snapshot = {
      pending: null, status: 'ready', error: null, failures: [],
      groups: [{ id: 'workbuddy', name: 'WorkBuddy', models: [{ id: 'v41', name: 'Deepseek-V4.1-Flash' }] }],
      current: { provider: 'workbuddy', model: 'v41' }
    }
    const ModelControl = createModelControl({
      sessionId: 'width-test',
      directories: { directoryFor: () => ({
        store: { subscribe: () => () => {}, getSnapshot: () => snapshot },
        load: async () => snapshot,
        select: async () => ({ ok: true })
      }) },
      shared: { h: React.createElement, hooks: React, t: (k) => k }
    })
    const holder = document.createElement('div')
    holder.setAttribute('data-dsh-tide-seat', 'model')
    document.getElementById('mount').append(holder)
    ReactDOM.createRoot(holder).render(React.createElement(ModelControl))
    await new Promise((resolve) => setTimeout(resolve, 300))

    const label = holder.querySelector('[data-dsh-tide-pill-label]')
    return {
      text: label?.textContent,
      // 横向溢出即说明被 ellipsis 截断。
      truncated: label ? label.scrollWidth > label.clientWidth + 1 : null
    }
  })

  // 唯一供应商时只显示模型名；完整来源在 title 中。
  assert.equal(result.text, 'Deepseek-V4.1-Flash')
  assert.equal(result.truncated, false, '模型名不应被截断，否则与同行其他控件显得不协调')
})

test('模型 pill 在窄容器下收缩而非把 composer 行撑出横向溢出', async (t) => {
  const page = await browser.newPage()
  t.after(() => page.close())
  await page.goto(`${origin}/fixture`)

  const result = await page.evaluate(async () => {
    await import('/tests/client/dock-stats-fixture.mjs')
    const { React, ReactDOM, UI_CSS, createModelControl } = window.testFixture
    const style = document.createElement('style')
    style.textContent = UI_CSS
    document.head.append(style)

    // 最长的真实形态：长供应商名 + 长版本号模型名。
    const snapshot = {
      pending: null, status: 'ready', error: null, failures: [],
      groups: [{ id: 'anthropic', name: 'Anthropic', models: [{ id: 'c35', name: 'claude-3-5-sonnet-20241022' }] }],
      current: { provider: 'anthropic', model: 'c35' }
    }
    const ModelControl = createModelControl({
      sessionId: 'overflow-test',
      directories: { directoryFor: () => ({
        store: { subscribe: () => () => {}, getSnapshot: () => snapshot },
        load: async () => snapshot,
        select: async () => ({ ok: true })
      }) },
      shared: { h: React.createElement, hooks: React, t: (k) => k }
    })

    const widths = [340, 390, 600]
    const out = []
    for (const width of widths) {
      const mount = document.getElementById('mount')
      mount.innerHTML = ''
      const card = document.createElement('div')
      card.setAttribute('data-composer-card', '')
      card.style.cssText = `width:${width}px;padding:8px;box-sizing:border-box;`
      const dock = document.createElement('div')
      dock.setAttribute('data-composer-dock', '')
      dock.style.cssText = 'display:flex;align-items:center;gap:6px;min-width:0;'
      const seat = document.createElement('div')
      seat.setAttribute('data-dsh-tide-seat', 'model')
      dock.append(seat)
      card.append(dock)
      mount.append(card)
      ReactDOM.createRoot(seat).render(React.createElement(ModelControl))
      await new Promise((resolve) => setTimeout(resolve, 300))

      const pill = card.querySelector('[data-dsh-tide-control="model"]')
      out.push({
        width,
        // 卡片自身不应产生横向滚动（内容被撑破的直接信号）。
        overflowX: card.scrollWidth > card.clientWidth + 1,
        pillWidth: Math.round(pill.getBoundingClientRect().width),
        insideCard: pill.getBoundingClientRect().right <= card.getBoundingClientRect().right + 1,
        hasTitle: pill.getAttribute('title') !== null
      })
      seat.remove()
    }
    return out
  })

  for (const row of result) {
    assert.equal(row.overflowX, false, `${row.width}px 容器下 composer 行不应出现横向溢出`)
    assert.equal(row.insideCard, true, `${row.width}px 容器下模型 pill 不应超出卡片边界`)
    assert.equal(row.hasTitle, true, `${row.width}px 容器下应保留完整名称的 title 提示`)
  }
  // 宽容器应能完整显示，窄容器则收缩，形成有意义的梯度。
  assert.ok(result[2].pillWidth > result[0].pillWidth, '宽容器下的 pill 应比窄容器宽')
})

test('ModelControl 与 EffortControl 弹层真实使用 Portal 挂载到 body，点击内部不误关', async (t) => {
  const page = await browser.newPage()
  t.after(() => page.close())
  page.on('console', msg => console.log('PAGE LOG:', msg.text()))
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message))
  await page.goto(`${origin}/fixture`)

  await page.evaluate(async () => {
    await import('/tests/client/dock-stats-fixture.mjs')
    const { React, ReactDOM, UI_CSS, createModelControl } = window.testFixture

    const style = document.createElement('style')
    style.textContent = `
      body { margin: 0; background: #fff; height: 100vh; }
      #mount { position: fixed; bottom: 20px; left: 40px; }
      [data-composer-card] { backdrop-filter: blur(10px); }
      ${UI_CSS}
    `
    document.head.append(style)

    const mount = document.getElementById('mount')
    mount.innerHTML = `
      <div data-composer-seat>
        <div data-composer-card>
          <div id="model-mount"></div>
        </div>
      </div>
    `

    const mockCatalog = [
      {
        id: 'deepseek',
        name: 'DeepSeek',
        models: [
          {
            id: 'deepseek-chat',
            name: 'DeepSeek-V3',
            reasoning: {
              defaultEffort: 'medium',
              efforts: [
                { id: 'low', name: '低' },
                { id: 'medium', name: '中' },
                { id: 'high', name: '高' }
              ]
            }
          }
        ]
      }
    ]

    let currentSelection = { provider: 'deepseek', model: 'deepseek-chat', reasoningEffort: 'medium' }
    let snapshot = {
      groups: mockCatalog,
      status: 'ready',
      current: currentSelection,
      pending: null,
      error: null,
      retainedEffort: undefined
    }
    const storeListeners = new Set()
    const store = {
      subscribe: (fn) => { storeListeners.add(fn); return () => storeListeners.delete(fn) },
      getSnapshot: () => snapshot
    }

    const directories = {
      directoryFor: () => ({
        store,
        load: async () => {},
        select: async (sel) => {
          currentSelection = { ...currentSelection, ...sel }
          snapshot = { ...snapshot, current: currentSelection }
          for (const l of storeListeners) l()
        }
      })
    }

    const shared = { h: React.createElement, hooks: React, t: (k) => k }
    const ModelComponent = createModelControl({
      sessionId: 'sess-model-test',
      directories,
      shared
    })

    const root = ReactDOM.createRoot(document.getElementById('model-mount'))
    root.render(React.createElement(ModelComponent, {}))
  })

  await page.waitForSelector('[data-dsh-tide-control="model"]')
  const modelPill = page.locator('[data-dsh-tide-control="model"]')
  const effortPill = page.locator('[data-dsh-tide-control="effort"]')

  // 1. 点击模型 pill 展开模型网格浮层
  await modelPill.click()
  await page.waitForSelector('[data-dsh-tide-model-grid]')
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-dsh-tide-model-grid]')
    return el && el.style.top !== ''
  })

  // 验证弹层向上弹出：底部在按钮上方（允许少量边框重叠或间距）
  const modelPopup = await page.locator('[data-dsh-tide-model-grid]').boundingBox()
  const modelAnchor = await modelPill.boundingBox()
  assert.ok(modelPopup && modelAnchor)
  assert.ok(
    modelPopup.y + modelPopup.height <= modelAnchor.y + 10,
    `ModelControl 弹层应向上弹出: popup bottom (${modelPopup.y + modelPopup.height}) <= anchor y (${modelAnchor.y}) + 10`
  )

  // 验证弹层真实 portal 挂载在 document.body 上，跳脱 card 的 backdrop-filter containing block
  const isModelInBody = await page.evaluate(() => document.querySelector('[data-dsh-tide-model-grid]')?.parentElement === document.body)
  assert.equal(isModelInBody, true)

  // 验证点击模型浮层内部（标题/空白处）不触发关闭
  await page.locator('[data-dsh-tide-grid-title]').click()
  await page.waitForTimeout(50)
  assert.equal(await page.locator('[data-dsh-tide-model-grid]').count(), 1)

  // 点击外部关闭
  await page.mouse.click(10, 10)
  await page.waitForFunction(() => document.querySelector('[data-dsh-tide-model-grid]') === null)

  // 2. 点击思考等级 pill 展开思考等级弹层
  await effortPill.click()
  await page.waitForSelector('[data-dsh-tide-effort]')
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-dsh-tide-effort]')
    return el && el.style.top !== ''
  })

  // 验证思考等级弹层向上弹出：底部在按钮上方（允许少量边框重叠或间距）
  const effortPopup = await page.locator('[data-dsh-tide-effort]').boundingBox()
  const effortAnchor = await effortPill.boundingBox()
  assert.ok(effortPopup && effortAnchor)
  assert.ok(
    effortPopup.y + effortPopup.height <= effortAnchor.y + 10,
    `EffortControl 弹层应向上弹出: popup bottom (${effortPopup.y + effortPopup.height}) <= anchor y (${effortAnchor.y}) + 10`
  )

  // 验证思考等级弹层也真实 portal 挂载在 document.body 上
  const isEffortInBody = await page.evaluate(() => document.querySelector('[data-dsh-tide-effort]')?.parentElement === document.body)
  assert.equal(isEffortInBody, true)

  // 点击思考等级弹层内部（标题/文字）不误触发关闭
  await page.locator('[data-dsh-tide-effort-title]').click()
  await page.waitForTimeout(50)
  assert.equal(await page.locator('[data-dsh-tide-effort]').count(), 1)

  // 点击外部关闭
  await page.mouse.click(10, 10)
  await page.waitForFunction(() => document.querySelector('[data-dsh-tide-effort]') === null)
})

test('关 themeOverrides 恢复原生全局表面', async (t) => {
  const page = await browser.newPage()
  t.after(() => page.close())
  await page.goto(`${origin}/fixture`)

  await page.evaluate(async () => {
    await import('/tests/client/dock-stats-fixture.mjs')
    const { saveSimplifyConfig, DEFAULT_SIMPLIFY_CONFIG } = window.testFixture
    saveSimplifyConfig(DEFAULT_SIMPLIFY_CONFIG)
  })

  // 验证初始状态应用了主题
  const initialTheme = await page.evaluate(() => {
    const { loadSimplifyConfig } = window.testFixture
    return loadSimplifyConfig().themeOverrides
  })
  assert.equal(initialTheme, true)

  // 真实调用保存配置关闭主题覆盖
  await page.evaluate(() => {
    const { saveSimplifyConfig } = window.testFixture
    saveSimplifyConfig({ themeOverrides: false })
  })

  const updatedTheme = await page.evaluate(() => {
    const { loadSimplifyConfig } = window.testFixture
    return loadSimplifyConfig().themeOverrides
  })
  assert.equal(updatedTheme, false)
})
