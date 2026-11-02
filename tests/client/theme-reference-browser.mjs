// 独立浏览器夹具：使用真实插件组件和 token，不连接或改写用户会话。
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --test tests/client/theme-reference-browser.mjs
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { mkdir } from 'node:fs/promises'

const require = createRequire(import.meta.url)
const { createServer } = await import(pathToFileURL(require.resolve('vite', { paths: [require.resolve('vitest/package.json')] })).href)
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright')
let server, browser, origin
before(async () => {
  server = await createServer({ configFile: false, server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'reference-fixture', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (req.url !== '/reference') return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await vite.transformIndexHtml('/reference', '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>'))
    })
  } }] })
  await server.listen()
  origin = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) })
})
after(async () => { await browser?.close(); await server?.close() })

async function setup(t, { width = 1320, mode = 'dark', running = true } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  t.after(async () => { await page.close(); assert.deepEqual(errors, []) })
  await page.goto(`${origin}/reference`)
  await page.evaluate(async ({ mode, running }) => {
    const { SIMPLIFY_TOKENS } = await import('/src/client/tokens.ts')
    const { mountDelegationPanel } = await import('/src/client/delegation-panel.ts')
    await import('/tests/client/dock-stats-fixture.mjs')
    const { React, ReactDOM, UI_CSS, createDockStats } = window.testFixture
    document.body.toggleAttribute('data-ds-dark-theme', mode === 'dark')
    document.body.setAttribute('data-dsh-tide-theme', '')
    document.documentElement.style.colorScheme = mode
    const style = document.createElement('style')
    style.textContent = `:root { ${Object.entries(SIMPLIFY_TOKENS).map(([k,v]) => `${k}:${v[mode]}`).join(';')} }
      * { box-sizing:border-box; }
      body { margin:0; font:13px/20px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-base); }
      .fixture-header { height:64px; display:flex; align-items:center; justify-content:space-between; padding:0 24px; border-bottom:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-1); }
      .fixture-brand { font-size:16px; font-weight:650; display:flex; gap:12px; align-items:center; }
      .fixture-brand svg { color:#589cff; }
      .fixture-note { color:var(--dsw-alias-label-secondary); font-size:12px; }
      .fixture-shell { display:grid; grid-template-columns:220px minmax(0,1fr); min-height:836px; }
      aside { background:var(--dsw-specific-sidebar-fill); border-right:1px solid var(--dsw-alias-border-l1); padding:24px 12px; }
      aside h2 { font-size:12px; font-weight:500; color:var(--dsw-alias-label-secondary); padding:0 12px; margin:0 0 16px; }
      aside [data-row-key] { min-height:36px; display:flex; align-items:center; gap:12px; padding:6px 12px; margin:4px 0; border-radius:7px; }
      aside svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.4; }
      .fixture-divider { border:0; border-top:1px solid var(--dsw-alias-border-l1); margin:28px 8px; }
      main { min-width:0; display:flex; flex-direction:column; padding:24px 28px; gap:24px; }
      #graph { min-width:0; }
      [data-composer-seat] { margin-top:auto; min-width:0; }
      [data-composer-card] { border:1px solid var(--dsw-alias-border-l2); border-radius:18px; padding:18px; }
      textarea { display:block; width:100%; min-height:100px; resize:none; border:0; background:transparent; color:inherit; font:inherit; outline:none; }
      textarea::placeholder { color:var(--dsw-alias-label-secondary); }
      .fixture-actions { display:flex; align-items:center; gap:10px; }
      .fixture-actions button { font:inherit; color:inherit; border:1px solid var(--dsw-alias-border-l2); border-radius:8px; padding:6px 12px; background:var(--dsw-alias-button-elevated-fill); }
      .fixture-actions .fixture-send { margin-left:auto; background:var(--dsw-alias-button-info-fill); color:white; }
      [data-composer-dock] { display:flex; align-items:center; }
      .fixture-empty { height:8px; }
      @media(max-width:700px) { .fixture-shell { grid-template-columns:minmax(0,1fr); } aside { display:none; } main { padding:16px; } .fixture-note { display:none; } }
      ${UI_CSS}`
    document.head.append(style)
    const folder = '<svg viewBox="0 0 24 24"><path d="M3 6h7l2 2h9v12H3z"/></svg>'
    document.body.innerHTML = `<header class="fixture-header"><span class="fixture-brand"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2 3 7v10l9 5 9-5V7L12 2ZM3 7l9 5 9-5M12 12v10"/></svg>DeepSeek Harness</span><span class="fixture-note">主题组件预览 · 独立测试数据</span></header>
      <div class="fixture-shell"><aside data-slot="sidebar.workspaces"><h2>Workspaces</h2>${['Personal','Production','Research','Client Projects','Playground'].map(x => `<div data-row-key="workspace:${x}" ${x==='Research'?'aria-selected="true"':''}>${folder}${x}</div>`).join('')}<hr class="fixture-divider"><h2>Development</h2>${['Prompts','Subagents','Knowledge','Evaluations','Settings'].map(x => `<div data-row-key="nav:${x}">${folder}${x}</div>`).join('')}<hr class="fixture-divider"><h2>Resources</h2><div data-row-key="nav:docs">${folder}Documentation</div></aside>
      <main data-conversation-scroll><div id="graph"></div><div class="fixture-empty"></div><div data-composer-seat><div data-composer-card><textarea aria-label="消息" placeholder="Ask DeepSeek anything…"></textarea><div class="fixture-actions"><button aria-label="添加附件">＋</button><span data-dsh-tide-seat="model"><button>DeepSeek-V3⌄</button></span><button>Think</button><button class="fixture-send" aria-label="发送">➤</button></div></div><div data-composer-dock><div data-dsh-tide-dock><div data-dsh-tide-dock-left></div><div id="stats"></div><div data-dsh-tide-dock-right></div></div></div></div></main></div>`
    const ids = [1,2,3,4].map(n => `${n}`.repeat(8)+'-'+`${n}`.repeat(4)+'-'+`${n}`.repeat(4)+'-'+`${n}`.repeat(4)+'-'+`${n}`.repeat(12))
    const titles = ['Research Agent','Code Agent','Analysis Agent','Writer Agent']
    const rows = Object.fromEntries(ids.map((id,i) => [id, { id, origin:'subagent', parentId:'demo', displayTitle:titles[i], running:running && i<3, projectionValues:{ modelSelection:{model:'DeepSeek-V3'}, sessionStats:{steps:3+i}, subagentTiming:{settledMs:12500} } }]))
    document.querySelector('#graph').innerHTML = `<div data-step-process data-chat-turn="turn">${ids.map((id,i) => `<div data-chat-turn="turn" data-chat-node-key="${i}"><div data-tool="subagent" data-state="done">${id}</div></div>`).join('')}</div>`
    const words = { 'delegation.title':'Agent Graph', 'delegation.agent':'Orchestrator', 'delegation.coordinating':'Plans · Delegates · Synthesizes', 'delegation.state.running':'Running', 'delegation.state.done':'Done', 'delegation.stopLabel':'Stop', 'duration.s':'s', 'delegation.batch':'Agent Graph', 'delegation.agents':'4 agents', 'delegation.steps': p => `${p?.count ?? 0} steps` }
    const graph = mountDelegationPanel({ sessions:{getSnapshot:()=>({byId:rows}),subscribe:()=>()=>{}}, currentSessionId:()=> 'demo', locale:(k,p)=>typeof words[k]==='function'?words[k](p):(words[k]??k), openSession:()=>{}, canCancel:()=>true, cancelSession:()=>{} })
    const projections = { sessionStats:{turns:8,steps:32,decodeTokens:2840,llmMs:100000,decodeMs:80000,ttftMs:20000}, tokenUsage:{totals:{uncachedInputTokens:8000,cacheReadTokens:92000,outputTokens:2840}}, contextPressure:{projectedTokens:64000,contextWindow:128000} }
    const Stats = createDockStats({h:React.createElement,hooks:React,t:k=>k})
    const root = ReactDOM.createRoot(document.querySelector('#stats'))
    root.render(React.createElement(Stats,{useProjection:k=>projections[k]}))
    window.disposeFixture = () => { graph.dispose(); root.unmount() }
  }, { mode, running })
  await page.waitForSelector('.subagent-topology-root', { state: 'attached', timeout: 5000 })
  const summary = page.locator('.subagent-topology-summary')
  if (await summary.getAttribute('aria-expanded') !== 'true') await summary.click()
  await page.waitForSelector('.dsh-tide-dock-stats-trigger')
  await page.waitForFunction(() => {
    const path = document.querySelector('.subagent-topology-lines path')
    return path?.getAttribute('d')?.includes('C') === true
  })
  return page
}

for (const mode of ['dark','light']) test(`${mode}: 图标比例、指标层级、全宽玻璃 HUD 和四列卡片`, async t => {
  const page = await setup(t, {mode})
  const geometry = await page.evaluate(() => {
    const box = s => document.querySelector(s).getBoundingClientRect()
    return { hud:box('.dsh-tide-dock-stats-trigger').width, dock:box('[data-composer-dock]').width,
      avatar:box('.subagent-topology-avatar').width, hub:box('.subagent-topology-root').width,
      valueSize:parseFloat(getComputedStyle(document.querySelector('.dsh-tide-hud-number')).fontSize),
      columns:getComputedStyle(document.querySelector('.subagent-topology-agents')).gridTemplateColumns.split(' ').length }
  })
  assert.ok(geometry.hud >= geometry.dock * .95, JSON.stringify(geometry))
  assert.ok(geometry.avatar >= 42)
  assert.ok(geometry.hub >= 320)
  // 比例基线：读数固定 13px（DSH TodoPanel 标题规格），字重 500 与 400 标签拉开层级。
  assert.ok(geometry.valueSize >= 13 && geometry.valueSize <= 13.5,
    `读数 ${geometry.valueSize}px 超出 13px 规格`)
  assert.equal(geometry.columns, 4)
  assert.match(await page.locator('.subagent-topology-lines path').getAttribute('d'), /C/)
  assert.match(await page.locator('.subagent-topology-node-steps').first().textContent(), /^[0-9]+ steps$/)
  assert.doesNotMatch(await page.locator('.subagent-topology-checklist').first().textContent(), /✔/)
  assert.equal(await page.locator('.dsh-tide-stat-item:not(.is-duration)').count(), 4)
  assert.equal(await page.locator('.subagent-topology-status-icon').count(), 0)
  assert.equal(await page.locator('[data-agent-theme="orange"]').count(), 1)
  const output = resolve('dsh-image-gen/theme-validation')
  await mkdir(output, {recursive:true})
  await page.screenshot({path:resolve(output, `reference-${mode}.png`), fullPage:true})
  await page.locator('.dsh-tide-dock-stats-trigger').click()
  await page.waitForSelector('[data-dsh-tide-stats-popover][style*="left"]')
  const popup = await page.locator('[data-dsh-tide-stats-popover]').boundingBox()
  assert.ok(popup.x >= 0 && popup.y >= 0 && popup.x + popup.width <= 1320 && popup.y + popup.height <= 900, JSON.stringify(popup))
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('[data-dsh-tide-stats-popover]').count(), 0)
})

test('窄屏与长标题不产生水平溢出，减弱动态时不闪动', async t => {
  const page = await setup(t, {width:390})
  await page.locator('.subagent-topology-node-title').first().evaluate(el => {el.textContent='Research: 检查跨工作区的长标题以及连续英文标识符 without-truncating-the-controls'})
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  for (const selector of ['.subagent-topology-node-header','.dsh-tide-dock-stats-trigger']) {
    assert.equal(await page.locator(selector).first().evaluate(el=>el.scrollWidth<=el.clientWidth),true,selector)
  }
  assert.equal(await page.locator('.subagent-topology-spinner').count(), 0)
  await mkdir(resolve('dsh-image-gen/theme-validation'),{recursive:true})
  await page.screenshot({path:resolve('dsh-image-gen/theme-validation/reference-mobile.png'),fullPage:true})
})

test('全部子代理完成后不再显示 Active 或持续播放运行指示', async t => {
  const page = await setup(t, {running:false})
  assert.doesNotMatch(await page.locator('.subagent-active-chip').textContent(), /Active/)
  assert.equal(await page.locator('.subagent-active-chip').evaluate(el=>getComputedStyle(el).animationName),'none')
})

test('卸载不会遗留组件，并保留原生输入布局', async t => {
  const page = await setup(t)
  await page.evaluate(()=>window.disposeFixture())
  assert.equal(await page.locator('.subagent-topology').count(),0)
  assert.equal(await page.locator('.dsh-tide-dock-stats-trigger').count(),0)
  assert.equal(await page.locator('textarea').isVisible(),true)
})

test('主题风格开关：开=插件潮汐深海材质，关=DSH 原生 token 表面', async t => {
  const page = await setup(t, {mode:'light'})

  // 开态：三件套（HUD / 浮窗 / 委派图）都应带插件自有渐变材质
  const readMaterials = () => page.evaluate(() => {
    const bg = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const s = getComputedStyle(el)
      return { image: s.backgroundImage, color: s.backgroundColor, shadow: s.boxShadow }
    }
    return {
      gate: document.body.hasAttribute('data-dsh-tide-theme'),
      hud: bg('.dsh-tide-dock-stats-trigger'),
      summary: bg('.subagent-topology-summary'),
      node: bg('.subagent-topology-node')
    }
  })

  const on = await readMaterials()
  assert.equal(on.gate, true, '主题开启时 body 应带门控属性')
  // 潮汐材质是深海哑光表面：靠 token 底色 + 0.5px 发丝边 + 漫反射柔影建立层次，
  // 不再使用 radial-gradient 彩色光斑（那属于要杜绝的 AI 廉价风格）。
  for (const [name, mat] of Object.entries({ HUD: on.hud, 摘要条: on.summary, 节点卡: on.node })) {
    assert.ok(mat, `${name} 应存在`)
    assert.equal(mat.image, 'none', `${name} 开态不应再有渐变光斑，实测 ${mat?.image}`)
    assert.notEqual(mat.color, 'rgba(0, 0, 0, 0)', `${name} 开态应带插件表面底色`)
    assert.ok(mat.shadow && mat.shadow !== 'none', `${name} 开态应带插件投影`)
  }

  // 关态：移除门控，三件套回落到原生 token 表面（无插件渐变）
  const off = await page.evaluate(() => {
    document.body.removeAttribute('data-dsh-tide-theme')
    const bg = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const s = getComputedStyle(el)
      return { image: s.backgroundImage, color: s.backgroundColor }
    }
    return {
      gate: document.body.hasAttribute('data-dsh-tide-theme'),
      hud: bg('.dsh-tide-dock-stats-trigger'),
      summary: bg('.subagent-topology-summary'),
      node: bg('.subagent-topology-node')
    }
  })
  assert.equal(off.gate, false, '关态不应有门控属性')
  for (const [name, mat] of Object.entries({ HUD: off.hud, 摘要条: off.summary, 节点卡: off.node })) {
    assert.equal(mat?.image, 'none', `${name} 关态不应带插件渐变材质（实测 ${mat?.image}）`)
  }


  // 恢复门控后材质回归（开关可反复切换）
  const back = await page.evaluate(() => {
    document.body.setAttribute('data-dsh-tide-theme', '')
    const el = document.querySelector('.dsh-tide-dock-stats-trigger')
    const s = getComputedStyle(el)
    return { color: s.backgroundColor, shadow: s.boxShadow }
  })
  assert.equal(back.color, on.hud?.color, '重新开启后 HUD 底色应恢复插件材质')
  assert.notEqual(back.shadow, 'none', '重新开启后 HUD 应恢复插件投影')
})
