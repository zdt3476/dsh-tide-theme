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
          if (req.url === '/favicon.ico') { res.statusCode = 204; res.end(); return }
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

test('侧栏独立小节分区分组（方案A）：置顶标头与工作区标头正确位于列表内部，不飘在最上方', async (t) => {
  const page = await browser.newPage()
  t.after(() => page.close())
  await page.goto(`${origin}/fixture`)

  await page.evaluate(async () => {
    const { mountSidebarGroups } = await import('/src/client/sidebar-groups.ts')
    const { UI_CSS } = await import('/src/client/styles.ts')

    const style = document.createElement('style')
    style.textContent = `
      :root {
        --dsw-alias-bg-base: #f3f4f6;
        --dsw-alias-bg-layer-2: #ffffff;
        --dsw-alias-border-l1: rgba(0, 0, 0, 0.08);
        --dsw-alias-border-l2: rgba(0, 0, 0, 0.15);
        --dsw-alias-label-primary: #0f1115;
        --dsw-alias-label-secondary: #4b5563;
        --dsw-alias-label-tertiary: #6b7280;
        --dsw-alias-label-caption: #9ca3af;
        --dsw-alias-state-warn-label: #eab308;
        --dsw-alias-interactive-bg-hover: rgba(0, 0, 0, 0.05);
        --dsw-alias-interactive-bg-subtle: rgba(0, 0, 0, 0.02);
        --dsw-radius-md: 8px;
        --dsw-radius-sm: 4px;
      }
      body {
        margin: 0;
        padding: 24px;
        background: #e5e7eb;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      #mount {
        width: 260px;
        background: #f9fafb;
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 12px;
        padding: 12px;
      }
      ${UI_CSS}
    `
    document.head.append(style)

    // 设置置顶持久化项（4 个工作区置顶）
    localStorage.setItem('dsh-tide-theme.pinned-workspaces', JSON.stringify([
      'default', 'dsh-tide-theme', 'web-dashboard', 'api-service'
    ]))

    // 模拟 DSH 真实侧栏 DOM 结构
    const mount = document.getElementById('mount')
    mount.innerHTML = `
      <div data-slot="sidebar.workspaces">
        <!-- 侧栏头部 -->
        <div class="sidebar-header">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>工作区</strong>
            <button aria-label="搜索工作区">🔍</button>
          </div>
        </div>
        <!-- 分页 Tabs -->
        <div style="display:flex; gap:12px; margin: 8px 0; border-bottom:1px solid #e5e7eb; padding-bottom:6px; font-size:12px;">
          <span style="font-weight:600; color:#2563eb; border-bottom:2px solid #2563eb;">未归档</span>
          <span style="color:#6b7280;">已归档</span>
        </div>
        <!-- 搜索输入框 -->
        <div style="margin-bottom:8px;">
          <input placeholder="筛选工作区或会话..." style="width:100%; box-sizing:border-box; padding:4px 8px; font-size:12px; border:1px solid #d1d5db; border-radius:6px;" />
        </div>
        <!-- 工作区列表真实容器 -->
        <div class="workspace-list-container">
          <div><span><div data-row-key="workspace:default" style="padding:6px 8px; font-size:13px;">📁 default</div></span></div>
          <div><span><div data-row-key="workspace:dsh-tide-theme" style="padding:6px 8px; font-size:13px;">📁 dsh-tide-theme</div></span></div>
          <div><span><div data-row-key="workspace:web-dashboard" style="padding:6px 8px; font-size:13px;">📁 web-dashboard</div></span></div>
          <div><span><div data-row-key="workspace:api-service" style="padding:6px 8px; font-size:13px;">📁 api-service</div></span></div>
          <div><span><div data-row-key="workspace:server" style="padding:6px 8px; font-size:13px;">📁 server</div></span></div>
          <div><span><div data-row-key="workspace:code" style="padding:6px 8px; font-size:13px;">📁 code</div></span></div>
        </div>
      </div>
    `

    const workspaces = [
      { workspaceId: 'default', sessionIds: [] },
      { workspaceId: 'dsh-tide-theme', sessionIds: [] },
      { workspaceId: 'web-dashboard', sessionIds: [] },
      { workspaceId: 'api-service', sessionIds: [] },
      { workspaceId: 'server', sessionIds: [] },
      { workspaceId: 'code', sessionIds: [] }
    ]

    const dict = {
      'groups.pin': '置顶',
      'groups.pinHint': '选择置顶工作区',
      'groups.pinnedTitle': '置顶',
      'groups.unpinnedTitle': '工作区',
      'groups.more': (p) => `还有 ${p.count} 个工作区`,
      'groups.collapse': '收起工作区'
    }

    mountSidebarGroups({
      locale: (k, p) => typeof dict[k] === 'function' ? dict[k](p) : dict[k] ?? k,
      createElement: (t) => document.createElement(t),
      archivedFilter: () => 'default',
      workspaces: { getSnapshot: () => ({ items: workspaces }), subscribe: () => () => {} },
      sessions: { getSnapshot: () => ({ byId: {} }), subscribe: () => () => {} }
    })
  })

  await page.waitForSelector('[data-dsh-tide-section="pinned"]')
  await page.screenshot({ path: '/tmp/sidebar-sections.png' })

  // 1. 验证小节标头正确插入在列表容器内，而不是在搜索框或Tabs上方
  const pinnedHeader = page.locator('[data-dsh-tide-section="pinned"]')
  const unpinnedHeader = page.locator('[data-dsh-tide-section="unpinned"]')

  assert.equal(await pinnedHeader.isVisible(), true)
  assert.equal(await unpinnedHeader.isVisible(), true)

  // 标头必须是列表容器的子元素
  const inListContainer = await page.evaluate(() => {
    const p = document.querySelector('[data-dsh-tide-section="pinned"]')
    const u = document.querySelector('[data-dsh-tide-section="unpinned"]')
    const list = document.querySelector('.workspace-list-container')
    return p?.parentElement === list && u?.parentElement === list
  })
  assert.equal(inListContainer, true)

  // 2. 检查标头文案与数量
  assert.match(await pinnedHeader.textContent(), /置顶\s*4/)
  assert.match(await unpinnedHeader.textContent(), /工作区\s*2/)

  // 3. 检查几何位置：pinnedHeader 在 input 搜索框下方！
  const inputY = await page.locator('input').evaluate(el => el.getBoundingClientRect().bottom)
  const pinnedHeaderY = await pinnedHeader.evaluate(el => el.getBoundingClientRect().top)
  assert.equal(pinnedHeaderY > inputY, true, '置顶标头必须在搜索输入框的下方！')

  // 4. 真实排序断言：所有置顶工作区必须排在"工作区"小节标题之上，
  //    普通工作区绝不能出现在置顶区。此前只测标头位置，导致排序回退长期漏检。
  const order = await page.evaluate(() => {
    const list = document.querySelector('.workspace-list-container')
    const children = [...list.children]
    const pinnedHeaderIndex = children.findIndex((el) => el.getAttribute('data-dsh-tide-section') === 'pinned')
    const unpinnedHeaderIndex = children.findIndex((el) => el.getAttribute('data-dsh-tide-section') === 'unpinned')
    const rows = [...list.querySelectorAll('[data-row-key^="workspace:"]')].map((row) => ({
      id: (row.getAttribute('data-row-key') ?? '').replace('workspace:', ''),
      pinned: row.parentElement?.parentElement?.hasAttribute('data-dsh-tide-pinned') === true,
      top: row.getBoundingClientRect().top
    }))
    return { children: children.length, pinnedHeaderIndex, unpinnedHeaderIndex, rows }
  })

  assert.ok(order.unpinnedHeaderIndex > order.pinnedHeaderIndex, '未置顶小节标题必须在置顶小节之后')

  // 置顶行全部在未置顶小节标题之上
  const unpinnedHeaderTop = await unpinnedHeader.evaluate((el) => el.getBoundingClientRect().top)
  const pinnedRows = order.rows.filter((row) => row.pinned)
  const unpinnedRows = order.rows.filter((row) => !row.pinned)
  assert.equal(pinnedRows.length, 4, '应有 4 个置顶工作区')
  assert.equal(unpinnedRows.length, 2, '应有 2 个普通工作区')
  for (const row of pinnedRows) {
    assert.ok(row.top < unpinnedHeaderTop, `置顶工作区 ${row.id} 必须位于未置顶小节标题之上`)
  }
  for (const row of unpinnedRows) {
    assert.ok(row.top > unpinnedHeaderTop, `普通工作区 ${row.id} 不得出现在置顶区域内`)
  }
})

test('置顶交互重构：顶栏移除置顶按钮，工作区三点菜单（···）注入置顶/取消置顶动作', async (t) => {
  const page = await browser.newPage()
  t.after(() => page.close())
  await page.goto(`${origin}/fixture`)

  await page.evaluate(async () => {
    const { mountSidebarGroups } = await import('/src/client/sidebar-groups.ts')

    localStorage.setItem('dsh-tide-theme.pinned-workspaces', JSON.stringify(['default']))

    const mount = document.getElementById('mount')
    mount.innerHTML = `
      <div data-slot="sidebar.workspaces">
        <div class="sidebar-header">
          <button aria-label="搜索工作区">🔍</button>
        </div>
        <div class="workspace-list-container">
          <div><span>
            <div data-row-key="workspace:default">
              📁 default
              <button class="menu-btn" aria-label="操作工作区 default">···</button>
            </div>
          </span></div>
          <div><span>
            <div data-row-key="workspace:server">
              📁 server
              <button class="menu-btn" aria-label="操作工作区 server">···</button>
            </div>
          </span></div>
        </div>
      </div>
    `
    const workspaces = [
      { workspaceId: 'default', sessionIds: [] },
      { workspaceId: 'server', sessionIds: [] }
    ]
    const dict = {
      'groups.pinWorkspace': '置顶工作区',
      'groups.unpinWorkspace': '取消置顶',
      'groups.pinnedTitle': '置顶',
      'groups.unpinnedTitle': '工作区'
    }
    mountSidebarGroups({
      locale: (k, p) => typeof dict[k] === 'function' ? dict[k](p) : dict[k] ?? k,
      createElement: (tag) => document.createElement(tag),
      archivedFilter: () => 'default',
      workspaces: { getSnapshot: () => ({ items: workspaces }), subscribe: () => () => {} },
      sessions: { getSnapshot: () => ({ byId: {} }), subscribe: () => () => {} }
    })
  })

  // 1. 验证顶栏不再存在置顶按钮
  assert.equal(await page.locator('[data-dsh-tide-pin-toggle]').count(), 0, '顶栏置顶按钮必须彻底移除')

  // 2. 模拟用户点击 server 的菜单按钮并唤出原生菜单
  await page.evaluate(() => {
    const serverBtn = document.querySelector('[data-row-key="workspace:server"] .menu-btn')
    serverBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    menu.innerHTML = `
      <button role="menuitem"><span>重命名</span></button>
      <button role="menuitem"><span>删除工作区</span></button>
    `
    document.body.appendChild(menu)
  })

  // 3. 验证菜单项被注入，且状态为"置顶工作区"（因为此时 server 未置顶）
  await page.waitForSelector('[data-dsh-tide-workspace-pin="server"]')
  const pinItem = page.locator('[data-dsh-tide-workspace-pin="server"]')
  assert.match(await pinItem.textContent(), /置顶工作区/)

  // 4. 点击该项，验证 server 被置顶
  await pinItem.click()
  const pinnedAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('dsh-tide-theme.pinned-workspaces') || '[]'))
  assert.ok(pinnedAfter.includes('server'), 'server 应加入置顶存储')

  // 5. 再次模拟打开 server 菜单，验证状态变为"取消置顶"
  await page.evaluate(() => {
    document.querySelector('[role="menu"]')?.remove()
    const serverBtn = document.querySelector('[data-row-key="workspace:server"] .menu-btn')
    serverBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    menu.innerHTML = `
      <button role="menuitem"><span>重命名</span></button>
      <button role="menuitem"><span>删除工作区</span></button>
    `
    document.body.appendChild(menu)
  })

  await page.waitForSelector('[data-dsh-tide-workspace-pin="server"]')
  const unpinItem = page.locator('[data-dsh-tide-workspace-pin="server"]')
  assert.match(await unpinItem.textContent(), /取消置顶/)
})

test('重复挂载不产生第二个「置顶」小节（宿主重挂载回归）', async (t) => {
  const page = await browser.newPage()
  t.after(() => page.close())
  await page.goto(`${origin}/fixture`)

  const result = await page.evaluate(async () => {
    const { mountSidebarGroups } = await import('/src/client/sidebar-groups.ts')

    localStorage.setItem('dsh-tide-theme.pinned-workspaces', JSON.stringify(['default']))
    document.getElementById('mount').innerHTML = `
      <div data-slot="sidebar.workspaces">
        <div class="workspace-list-container">
          <div><span><div data-row-key="workspace:default">default</div></span></div>
          <div><span><div data-row-key="workspace:other">other</div></span></div>
        </div>
      </div>`

    const dict = {
      'groups.pinnedTitle': '置顶',
      'groups.unpinnedTitle': '工作区',
      'groups.more': (p) => `还有 ${p.count} 个工作区`,
      'groups.collapse': '收起工作区'
    }
    const options = {
      locale: (k, p) => typeof dict[k] === 'function' ? dict[k](p) : dict[k] ?? k,
      createElement: (tag) => document.createElement(tag),
      archivedFilter: () => 'default',
      workspaces: {
        getSnapshot: () => ({ items: [{ workspaceId: 'default', sessionIds: [] }, { workspaceId: 'other', sessionIds: [] }] }),
        subscribe: () => () => {}
      },
      sessions: { getSnapshot: () => ({ byId: {} }), subscribe: () => () => {} }
    }

    const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    mountSidebarGroups(options)
    await settle()
    const first = document.querySelectorAll('[data-dsh-tide-section="pinned"]').length

    // 宿主重渲染工作区列表并再次挂载，旧实例的 observer 必须先被摘掉。
    mountSidebarGroups(options)
    await settle()
    const second = document.querySelectorAll('[data-dsh-tide-section="pinned"]').length

    return { first, second }
  })

  assert.equal(result.first, 1, '首次挂载应只有 1 个置顶小节')
  // 修复前此处为 2：旧实例未停用，observer 会把被删的标头重新插回来。
  assert.equal(result.second, 1, '重复挂载后仍应只有 1 个置顶小节')
})

test('两份独立模块实例先后挂载也不产生重复「置顶」小节（插件重复加载回归）', async (t) => {
  const page = await browser.newPage()
  t.after(() => page.close())
  await page.goto(`${origin}/fixture`)

  const result = await page.evaluate(async () => {
    // 用不同 query 绕过模块缓存，得到两份互不可见的模块实例，
    // 等价于插件被加载两次时各持一份模块级状态的情形。
    const first = await import('/src/client/sidebar-groups.ts?instance=1')
    const second = await import('/src/client/sidebar-groups.ts?instance=2')

    localStorage.setItem('dsh-tide-theme.pinned-workspaces', JSON.stringify(['default']))
    document.getElementById('mount').innerHTML = `
      <div data-slot="sidebar.workspaces">
        <div class="workspace-list-container">
          <div><span><div data-row-key="workspace:default">default</div></span></div>
          <div><span><div data-row-key="workspace:other">other</div></span></div>
        </div>
      </div>`

    const dict = {
      'groups.pinnedTitle': '置顶',
      'groups.unpinnedTitle': '工作区',
      'groups.more': (p) => `还有 ${p.count} 个工作区`,
      'groups.collapse': '收起工作区'
    }
    const options = {
      locale: (k, p) => typeof dict[k] === 'function' ? dict[k](p) : dict[k] ?? k,
      createElement: (tag) => document.createElement(tag),
      archivedFilter: () => 'default',
      workspaces: {
        getSnapshot: () => ({ items: [{ workspaceId: 'default', sessionIds: [] }, { workspaceId: 'other', sessionIds: [] }] }),
        subscribe: () => () => {}
      },
      sessions: { getSnapshot: () => ({ byId: {} }), subscribe: () => () => {} }
    }
    const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    first.mountSidebarGroups(options)
    await settle()
    second.mountSidebarGroups(options)
    await settle()
    // 旧实例的 observer 可能在接管后才触发，再等一帧确认它没有把标头插回来。
    await settle()

    return {
      pinned: document.querySelectorAll('[data-dsh-tide-section="pinned"]').length,
      unpinned: document.querySelectorAll('[data-dsh-tide-section="unpinned"]').length
    }
  })

  assert.equal(result.pinned, 1, '两份模块实例下应只有 1 个置顶小节')
  assert.equal(result.unpinned, 1, '两份模块实例下应只有 1 个工作区小节')
})
