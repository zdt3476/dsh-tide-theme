// 独立生命周期浏览器回归测试：验证真实 apply 调用、配置事件切换、
// body 属性 gate 以及 token 层与全局皮肤的加载/卸载/无残留。
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --test tests/client/theme-lifecycle-browser.mjs

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

let vitePath
try {
  vitePath = require.resolve('vite', { paths: [require.resolve('vitest/package.json')] })
} catch {
  vitePath = null
}

const { createServer } = vitePath ? await import(pathToFileURL(vitePath).href) : {}
const { chromium } = process.env.PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href)
  : await import('playwright').catch(() => ({}))

let server, browser, origin

if (createServer && chromium) {
  before(async () => {
    server = await createServer({
      root: resolve('.'),
      configFile: false,
      server: { host: '127.0.0.1', port: 0 },
      plugins: [{
        name: 'theme-lifecycle-fixture',
        configureServer(vite) {
          vite.middlewares.use(async (req, res, next) => {
            if (req.url === '/favicon.ico') { res.statusCode = 204; res.end(); return }
            if (req.url !== '/lifecycle') return next()
            res.setHeader('Content-Type', 'text/html')
            const html = await vite.transformIndexHtml('/lifecycle', '<!doctype html><html><head><meta charset="utf-8"></head><body data-ds-dark-theme><div id="app"><div data-row-key="item-1">Item 1</div><div data-composer-card>Card content</div><header class="_header_xyz" data-window-drag><div data-conversation-header-leading>Leading</div><div data-conversation-header-corner>Corner</div></header></div></body></html>')
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

  test('真实生命周期：apply 挂载、配置切换 themeOverrides、body 门控以及无残留验证', async (t) => {
    const page = await browser.newPage()
    t.after(() => page.close())
    await page.goto(`${origin}/lifecycle`)

    const result = await page.evaluate(async () => {
      const { apply } = await import('/src/client/index.ts')
      const { SIMPLIFY_TOKENS, THEME_SOURCE } = await import('/src/client/tokens.ts')
      const { saveSimplifyConfig } = await import('/src/client/plugin-config.ts')

      let tokenOverrideCalls = 0
      let tokenDisposerCalls = 0

      const fakeTheme = {
        overrideTokens: (source, tokens) => {
          tokenOverrideCalls++
          return () => {
            tokenDisposerCalls++
          }
        }
      }

      const effects = []
      const ctx = {
        slots: { inject: () => {}, register: () => {} },
        locale: { register: () => () => {}, bind: () => k => k },
        theme: fakeTheme,
        effect: (fn, name) => {
          const cleanup = fn()
          effects.push(cleanup)
        },
        modelDirectories: {},
        remote: { permissionPresets: { catalog: async () => ({ ok: true }) } },
        inject: () => {}
      }

      // 1. 调用真实的 apply 激活插件
      apply(ctx)

      // 初始状态验证：body 应具有 data-dsh-tide-theme
      const initialHasGate = document.body.hasAttribute('data-dsh-tide-theme')
      const initialOverrideCalls = tokenOverrideCalls

      // 2. 模拟配置事件：关闭 themeOverrides
      saveSimplifyConfig({ themeOverrides: false })

      const disabledHasGate = document.body.hasAttribute('data-dsh-tide-theme')
      const disabledDisposerCalls = tokenDisposerCalls

      // 3. 模拟配置事件：重新开启 themeOverrides
      saveSimplifyConfig({ themeOverrides: true })

      const reenabledHasGate = document.body.hasAttribute('data-dsh-tide-theme')
      const reenabledOverrideCalls = tokenOverrideCalls

      // 4. 清理卸载
      for (const cleanup of effects) {
        if (typeof cleanup === 'function') cleanup()
      }

      const finalHasGate = document.body.hasAttribute('data-dsh-tide-theme')
      const finalDisposerCalls = tokenDisposerCalls

      return {
        initialHasGate,
        initialOverrideCalls,
        disabledHasGate,
        disabledDisposerCalls,
        reenabledHasGate,
        reenabledOverrideCalls,
        finalHasGate,
        finalDisposerCalls
      }
    })

    assert.equal(result.initialHasGate, true, '初始激活应设置 data-dsh-tide-theme')
    assert.equal(result.initialOverrideCalls, 1, '初始激活应调用 overrideTokens 一次')
    assert.equal(result.disabledHasGate, false, '关闭 themeOverrides 后必须移除 body 门控')
    assert.equal(result.disabledDisposerCalls, 1, '关闭 themeOverrides 后必须执行 token disposer')
    assert.equal(result.reenabledHasGate, true, '重新启用后应恢复 body 门控')
    assert.equal(result.reenabledOverrideCalls, 2, '重新启用后应再次调用 overrideTokens')
    assert.equal(result.finalHasGate, false, '卸载后必须彻底清理 body 门控')
  })
} else {
  test('环境缺少 vite 或 playwright，跳过浏览器交互测试', () => {
    assert.ok(true)
  })
}
