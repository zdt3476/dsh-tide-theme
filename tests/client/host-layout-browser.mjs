// 宿主结构契约测试：标明非真实桌面，采用真实host相同class后缀与slot wrappers
// 验证契约：不强加data-slot定位；修复216px HUD、image按钮误隐藏、无关header污染
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const vitePath = require.resolve('vite', { paths: [require.resolve('vitest/package.json')] })
const { createServer } = await import(pathToFileURL(vitePath).href)
const playwrightPath = process.env.PLAYWRIGHT_MODULE
  ? resolve(process.env.PLAYWRIGHT_MODULE)
  : '/Users/zdt/Code/games/tetris-mania/node_modules/playwright/index.mjs'
const { chromium } = await import(pathToFileURL(playwrightPath).href)

const chromiumExec = process.env.CHROMIUM_EXECUTABLE
  ?? '/Users/zdt/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell'

let server, browser, origin

before(async () => {
  server = await createServer({
    configFile: false,
    server: { host: '127.0.0.1', port: 0 },
    plugins: [{
      name: 'host-layout-fixture',
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (req.url !== '/host-layout') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await vite.transformIndexHtml('/host-layout', '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>'))
        })
      }
    }]
  })
  await server.listen()
  origin = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({
    headless: true,
    executablePath: chromiumExec
  })
})

after(async () => {
  await browser?.close()
  await server?.close()
})

async function mountHostLayout(page, { cardWidth = 720, hasStats = true, hasModelSeat = true } = {}) {
  await page.goto(`${origin}/host-layout`)
  await page.evaluate(async ({ cardWidth, hasStats, hasModelSeat }) => {
    await import('/tests/client/dock-stats-fixture.mjs')
    const { React, ReactDOM, UI_CSS, createDockStats } = window.testFixture
    const { SIMPLIFY_TOKENS } = await import('/src/client/tokens.ts')

    document.body.setAttribute('data-ds-dark-theme', '')
    document.body.setAttribute('data-dsh-simplify-theme', '')
    for (const [k, v] of Object.entries(SIMPLIFY_TOKENS)) {
      document.body.style.setProperty(k, v.dark)
    }

    const style = document.createElement('style')
    style.textContent = `
      body { margin: 0; font: 13px/20px -apple-system, sans-serif; color: var(--dsw-alias-label-primary); }
      * { box-sizing: border-box; }
      #frame { position: fixed; bottom: 24px; left: 24px; width: ${cardWidth}px; }
      [data-composer-card] { border: 1px solid gray; border-radius: 18px; padding: 16px; min-height: 120px; }
      .action { display: flex; gap: 10px; }
      .host_standardControls { display: flex; gap: 8px; }
      [data-composer-dock] { display: flex; gap: 10px; padding: 0 8px; }
      .unrelated_header { background: rgb(80, 60, 60); height: 40px; }
      ${UI_CSS}
    `
    document.head.append(style)

    const modelSeatHtml = hasModelSeat ? '<span data-dsh-simplify-seat="model">替代模型</span>' : ''
    document.body.innerHTML = `
      <div class="unrelated_header">其他面板标题</div>
      <div id="frame">
        <div data-composer-seat>
          <div data-composer-card>
            <p>宿主结构契约基线（非实际应用截图）</p>
            <div class="action">
              <button id="permission" class="host_selector" aria-haspopup="menu">权限</button>
              ${modelSeatHtml}
              <div class="host_standardControls">
                <button id="image" aria-haspopup="menu">图像插件</button>
                <div class="host_root">
                  <button id="model" class="host_trigger" aria-haspopup="menu">
                    <span class="host_triggerLabel">原生模型</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div data-composer-dock>
            <div class="slot-wrap">
              <div data-dsh-simplify-dock>
                <div id="stats"></div>
              </div>
            </div>
            <span data-composer-stat><button>原生统计</button></span>
          </div>
        </div>
      </div>
    `

    if (hasStats) {
      const p = {
        sessionStats: { turns: 8, steps: 32, decodeTokens: 2840, llmMs: 100000, decodeMs: 80000, ttftMs: 20000 },
        tokenUsage: { totals: { uncachedInputTokens: 8000, cacheReadTokens: 92000, outputTokens: 2840 } },
        contextPressure: { projectedTokens: 64000, contextWindow: 128000 }
      }
      const Stats = createDockStats({ h: React.createElement, hooks: React, t: (k) => k })
      ReactDOM.createRoot(document.querySelector('#stats')).render(React.createElement(Stats, { useProjection: (k) => p[k] }))
    }
  }, { cardWidth, hasStats, hasModelSeat })
}

test('宿主结构契约基线（标明非真实桌面）：图片插件不被隐藏、原生模型按需隐藏、无关header不受污染、单行HUD收纳档高度<=44px', async (t) => {
  const page = await browser.newPage({ viewport: { width: 1040, height: 900 } })
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()))
  t.after(async () => { await page.close() })

  await mountHostLayout(page, { cardWidth: 720, hasStats: true, hasModelSeat: true })
  await page.waitForSelector('.dsh-simplify-dock-stats-trigger')

  const result = await page.evaluate(() => {
    const visible = (id) => {
      const el = document.getElementById(id)
      if (!el) return false
      return getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0
    }
    const r = (s) => {
      const el = document.querySelector(s)
      if (!el) return null
      const b = el.getBoundingClientRect()
      return { x: b.x, y: b.y, width: b.width, height: b.height }
    }
    const hudEl = document.querySelector('.dsh-simplify-dock-stats-trigger')
    const hudRect = hudEl ? r('.dsh-simplify-dock-stats-trigger') : null
    const items = [...document.querySelectorAll('.dsh-simplify-stat-item:not(.is-duration)')]
      .map((e) => {
        const b = e.getBoundingClientRect()
        return { x: b.x, y: b.y, width: b.width, height: b.height }
      })
      // 窄档收纳项 display:none，矩形为零，不参与同行断言
      .filter((b) => b.width > 0)
    return {
      source: 'isolated host structure baseline, not live desktop',
      imagePluginVisible: visible('image'),
      nativePermissionVisible: visible('permission'),
      nativeModelVisible: visible('model'),
      unrelatedHeaderBackground: getComputedStyle(document.querySelector('.unrelated_header')).backgroundColor,
      hud: hudRect,
      items
    }
  })

  // 1. 契约标识：明确标明这是独立宿主契约基线，非真实桌面
  assert.equal(result.source, 'isolated host structure baseline, not live desktop')

  // 2. 图像插件按钮必须可见（禁止被 standardControls 规则误杀）
  assert.equal(result.imagePluginVisible, true, 'image plugin button in standardControls must remain visible')

  // 3. 原生模型按钮在有替代 seat 时被隐藏
  assert.equal(result.nativeModelVisible, false, 'native model button must be hidden when substitute model seat exists')

  // 4. 原生权限按钮必须可见
  assert.equal(result.nativePermissionVisible, true, 'native permission button must remain visible')

  // 5. 无关 header 不受污染（保持 rgb(80, 60, 60)，禁止被赋成深色半透明 rgba(11, 19, 32, 0.75)）
  assert.equal(result.unrelatedHeaderBackground, 'rgb(80, 60, 60)', 'unrelated header must not be styled by conversation header rules')

  // 6. 单行形态：720px 卡片处于 640–759.9 收纳档（隐藏 activity/tps，余 context/cache/duration），高度 <= 44px
  assert.ok(result.hud, 'HUD element must exist')
  assert.ok(result.hud.height <= 44, `HUD height in wide mode must be <= 44px, got ${result.hud.height}px`)

  // 验证可见的非耗时指标在同一行（Y 坐标一致）：收纳后剩 context + cache 两项
  assert.equal(result.items.length, 2, '720px 收纳档应剩 2 个非耗时可见项')
  const firstY = result.items[0].y
  for (let i = 1; i < result.items.length; i++) {
    assert.ok(Math.abs(result.items[i].y - firstY) < 3, `item ${i} should be on the same row in wide mode`)
  }
})

test('窄屏契约：当容器宽度为 500px (<760px) 时 HUD 单行收纳次要指标且高度 <= 44px', async (t) => {
  const page = await browser.newPage({ viewport: { width: 1040, height: 900 } })
  t.after(async () => { await page.close() })

  await mountHostLayout(page, { cardWidth: 500, hasStats: true, hasModelSeat: true })
  await page.waitForSelector('.dsh-simplify-dock-stats-trigger')

  const result = await page.evaluate(() => {
    const b = document.querySelector('.dsh-simplify-dock-stats-trigger').getBoundingClientRect()
    const items = [...document.querySelectorAll('.dsh-simplify-stat-item')].map((e) => {
      const rect = e.getBoundingClientRect()
      const style = getComputedStyle(e)
      return { cls: e.className, x: rect.x, y: rect.y, visible: style.display !== 'none', width: rect.width, scrollW: e.scrollWidth, clientW: e.clientWidth }
    })
    return { hudHeight: b.height, items }
  })

  // 单行形态总高 <= 44px
  assert.ok(result.hudHeight <= 44, `HUD height in narrow mode must be <= 44px, got ${result.hudHeight}px`)
  // 上下文与耗时必须可见且读数无截断；会话规模/TPS/缓存窄屏收纳
  const byName = (frag) => result.items.filter((i) => i.cls.includes(frag))
  assert.ok(byName('is-context').every((i) => i.visible), '上下文必须可见')
  assert.ok(byName('is-duration').every((i) => i.visible), '耗时必须可见')
  assert.ok(byName('is-activity').every((i) => !i.visible), '窄屏收纳会话规模')
  assert.ok(byName('is-tps').every((i) => !i.visible), '窄屏收纳 TPS')
  assert.ok(byName('is-cache').every((i) => !i.visible), '窄屏收纳缓存命中')
  // 窄档读数不得出现省略号截断（阻断级 B1 验收线）
  const clipped = result.items.filter((i) => i.visible && i.scrollW > i.clientW + 1)
  assert.equal(clipped.length, 0, `可见项读数不得截断：${JSON.stringify(clipped)}`)
})

test('模型控件恢复契约：当替代模型座不存在时原生模型按钮自动恢复可见', async (t) => {
  const page = await browser.newPage({ viewport: { width: 1040, height: 900 } })
  t.after(async () => { await page.close() })

  await mountHostLayout(page, { cardWidth: 720, hasStats: true, hasModelSeat: false })

  const modelVisible = await page.evaluate(() => {
    const el = document.getElementById('model')
    return el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0
  })
  assert.equal(modelVisible, true, 'native model button must be visible when substitute model seat is absent')
})

test('无数据契约：无会话统计数据时不渲染空托盘', async (t) => {
  const page = await browser.newPage({ viewport: { width: 1040, height: 900 } })
  t.after(async () => { await page.close() })

  await mountHostLayout(page, { cardWidth: 720, hasStats: false, hasModelSeat: true })

  const hudExists = await page.evaluate(() => {
    return document.querySelector('.dsh-simplify-dock-stats-trigger') !== null
  })
  assert.equal(hudExists, false, 'HUD should not render when there is no stats data')
})

test('宽度自适应：单行 HUD 在各窗口比例下不换行、不溢出、不越界', async (t) => {
  // 420/640 命中审查发现的截断带（阻断级 B1），760 是全显档下限
  for (const width of [420, 500, 640, 700, 760, 900, 1200, 1680]) {
    const page = await browser.newPage({ viewport: { width: Math.max(900, width + 100), height: 720 } })
    try {
      await mountHostLayout(page, { cardWidth: width, hasStats: true, hasModelSeat: true })
      await page.waitForSelector('.dsh-simplify-dock-stats-trigger')
      const data = await page.evaluate(() => {
        const trigger = document.querySelector('.dsh-simplify-dock-stats-trigger')
        const tb = trigger.getBoundingClientRect()
        const items = [...document.querySelectorAll('.dsh-simplify-stat-item')]
          .map((el) => {
            const b = el.getBoundingClientRect()
            return { left: b.left, right: b.right, top: b.top, height: b.height, width: b.width, scrollW: el.scrollWidth, clientW: el.clientWidth }
          })
          // 窄屏下收纳的指标 display:none，矩形为零，不参与几何断言
          .filter((b) => b.width > 0)
        const boxes = items
        return {
          triggerWidth: Math.round(tb.width),
          triggerHeight: Math.round(tb.height),
          count: boxes.length,
          overflow: boxes.some((b) => b.scrollW > b.clientW + 1),
          crossesEdges: boxes.some((b) => b.left < tb.left - 1 || b.right > tb.right + 1),
          singleRow: new Set(boxes.map((b) => Math.round(b.top))).size === 1,
          uniformHeight: new Set(boxes.map((b) => Math.round(b.height))).size === 1
        }
      })
      assert.ok(data.count >= 2, `${width}px: 应渲染指标项`)
      assert.equal(data.overflow, false, `${width}px: 指标内容不得溢出（阻断级 B1 验收线）`)
      assert.equal(data.crossesEdges, false, `${width}px: 指标不得越过 HUD 边界`)
      assert.equal(data.singleRow, true, `${width}px: 单行形态不得换行`)
      assert.equal(data.uniformHeight, true, `${width}px: 指标项同高`)
      assert.ok(data.triggerHeight >= 30 && data.triggerHeight <= 44, `${width}px: HUD 高度应保持紧凑（实测 ${data.triggerHeight}px）`)
    } finally {
      await page.close()
    }
  }
})

test('宽卡片契约：单行 HUD 与卡片同宽对齐，左端起点贴近，材质走 DSH token', async (t) => {
  const page = await browser.newPage({ viewport: { width: 1480, height: 720 } })
  t.after(async () => { await page.close() })
  // 直接复现用户截图条件：卡片约 1300px 宽。
  await mountHostLayout(page, { cardWidth: 1300, hasStats: true, hasModelSeat: true })

  const data = await page.evaluate(() => {
    const trigger = document.querySelector('.dsh-simplify-dock-stats-trigger')
    const tb = trigger.getBoundingClientRect()
    const items = [...document.querySelectorAll('.dsh-simplify-stat-item')].map((el) => {
      const b = el.getBoundingClientRect()
      return { cls: el.className, left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), height: Math.round(b.height) }
    })
    const style = getComputedStyle(trigger)
    return {
      triggerWidth: Math.round(tb.width),
      triggerHeight: Math.round(tb.height),
      triggerLeft: Math.round(tb.left),
      triggerRight: Math.round(tb.right),
      items,
      background: style.backgroundColor
    }
  })

  assert.equal(data.triggerWidth, 1300, 'HUD 应与卡片同宽')
  assert.ok(data.triggerHeight <= 44, `HUD 应保持单行紧凑（实测 ${data.triggerHeight}px）`)
  assert.equal(new Set(data.items.map((item) => item.top)).size, 1, '全部指标同基线')
  assert.equal(data.items.length, 5, '四项指标 + 耗时共五项')
  // 内容居中：首末项到触发条两端的留白应近似相等（与输入卡中轴对齐）
  const firstLeft = data.items[0].left - data.triggerLeft
  const lastRight = data.triggerRight - data.items[data.items.length - 1].right
  assert.ok(Math.abs(firstLeft - lastRight) <= 12, `内容应水平居中：左距 ${firstLeft}px vs 右距 ${lastRight}px`)
  // 材质走 DSH 原生 menu 表面：backgroundColor 应解析为具体色值（--dsw-specific-menu）
  assert.match(data.background, /rgba|rgb|#/, `背景应消费 var(--dsw-specific-menu)，实测 ${data.background}`)
})
