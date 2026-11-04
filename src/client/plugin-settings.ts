/**
 * 插件可视化配置页面组件。
 *
 * 挂载在 DSH 插件管理页面的 `plugins.bundle.config` 与 `plugins.row.config` slot 中。
 * 提供分组卡片、即时切换的开关联动与状态提示，避免手动编辑配置文件。
 */

import type { DockShared } from './dock-shared'
import {
  type SimplifyConfig,
  useSimplifyConfig,
  resetSimplifyConfig
} from './plugin-config'
import {
  readBindings,
  saveBindings,
  type ProviderBindings
} from './provider-binding'

export interface PluginSettingsProps {
  view?: string
  form?: unknown
}

interface SettingItemSpec {
  key: keyof SimplifyConfig
  title: string
  description: string
  type?: 'boolean' | 'number'
  min?: number
  max?: number
  unit?: string
  zeroLabel?: string
}

interface SettingGroupSpec {
  id: string
  title: string
  description?: string
  items: SettingItemSpec[]
}

const SETTING_GROUPS: SettingGroupSpec[] = [
  {
    id: 'dock',
    title: '底栏用量与性能看板',
    items: [
      {
        key: 'dockStats',
        title: '底部平铺性能状态流',
        description: '在底部输入栏中央平铺展示会话活动、上下文容量、实时端到端 TPS、缓存命中率与单轮耗时。'
      },
      {
        key: 'contextColorAlert',
        title: '上下文容量警戒变色',
        description: '当上下文占用达到阈值时自动采用语义颜色提示（≤50% 安全绿、50%~75% 提醒橙、>75% 警戒红）。'
      }
    ]
  },
  {
    id: 'delegation',
    title: '子代理协同派发图',
    items: [
      {
        key: 'delegationPanel',
        title: '启用子代理拓扑派发图',
        description: '在回合步骤之外绘制独立的子代理协同看板，避免被原生工作步骤折叠隐藏，支持实时进度与跳入子会话。'
      },
      {
        key: 'delegationExpandedDefault',
        title: '派发图默认保持展开',
        description: '默认展开展示所有子代理节点与模型拓扑连线；关闭时默认以单行胶囊摘要展示。'
      }
    ]
  },
  {
    id: 'sidebar',
    title: '侧栏界面增强',
    items: [
      {
        key: 'sidebarTabs',
        title: '侧栏未归档/归档分页与筛选',
        description: '在侧栏顶部提供“未归档 / 归档”双标签分页，并内置实时输入筛选框。'
      },
      {
        key: 'sidebarGrouping',
        title: '工作区按分组管理与折叠',
        description: '支持工作区会话分组折叠、置顶会话与批量管理功能。'
      },
      {
        key: 'sidebarPinnedLimit',
        title: '置顶文件夹显示上限',
        description: '折叠状态下允许常驻显示的置顶文件夹数量，超出部分收纳进“更多”（设为 0 表示不限制，全部常驻）。',
        type: 'number',
        min: 0,
        max: 20,
        unit: '个',
        zeroLabel: '不限制'
      },
      {
        key: 'sidebarUnpinnedLimit',
        title: '未置顶文件夹显示上限',
        description: '折叠状态下允许显示的普通文件夹数量，超出部分收纳进“更多”。',
        type: 'number',
        min: 1,
        max: 30,
        unit: '个'
      }
    ]
  },
  {
    id: 'composer',
    title: '输入框与交互控件',
    items: [
      {
        key: 'modelControl',
        title: '模型与思考等级选择控件',
        description: '在输入框左下方提供供应商分类模型面板及平滑思考等级（Reasoning Effort）调节滑块。'
      },
      {
        key: 'turnDuration',
        title: '每轮回答实际耗时徽标',
        description: '在每一轮模型回复操作栏尾部常驻显示该轮端到端实际耗时。'
      }
    ]
  },
  {
    id: 'theme',
    title: '潮汐主题',
    items: [
      {
        key: 'themeOverrides',
        title: '潮汐主题材质',
        description: '为底栏 HUD、用量看板与委派图套用潮汐主题材质（深海微透质感、精密发丝描边与自然漫反射柔影）；关闭此项后这些组件回落到 DSH 原生外观。'
      }
    ]
  }
]

/** 设置页可用的数据源；缺省时绑定编辑器退化为只读说明。 */
export interface PluginSettingsOptions {
  shared: DockShared
  /** 当前全部供应商（异步，来自模型目录）。 */
  providerCatalog?: () => Promise<Array<{ id: string; name: string }>>
  /** 当前全部工作区，label 用于展示。 */
  workspaces?: () => Array<{ id: string; label: string }>
}

/** 兼容两种调用：直接传 shared（旧用法）或传完整 options。 */
function normalizeOptions(input: DockShared | PluginSettingsOptions): PluginSettingsOptions {
  return 'shared' in input ? input : { shared: input }
}

export function createPluginSettings(input: DockShared | PluginSettingsOptions) {
  const options = normalizeOptions(input)
  const { h, hooks, t } = options.shared

  return function PluginSettings(props?: PluginSettingsProps) {
    // 1. 摘要视图：在插件列表卡片描述位（view === 'summary'）精简呈现，不展开完整表单
    if (props?.view === 'summary') {
      return h('span', {
        className: 'dsh-tide-settings-summary',
        'data-dsh-tide-summary': ''
      }, t('settings.summary') || '潮汐主题 · 深海微透材质、底栏性能HUD看板与子代理状态增强')
    }

    const [config, updateConfig] = useSimplifyConfig(hooks)
    const [notice, setNotice] = hooks.useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const timerRef = hooks.useRef<ReturnType<typeof setTimeout> | null>(null)

    // 组件卸载时清理定时器，避免悬挂调用
    hooks.useEffect(() => {
      return () => {
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      }
    }, [])

    const showNotice = (type: 'success' | 'error', text: string) => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setNotice({ type, text })
      timerRef.current = setTimeout(() => {
        setNotice(null)
        timerRef.current = null
      }, 2500)
    }

    const handleToggle = (key: keyof SimplifyConfig) => {
      try {
        updateConfig({ [key]: !config[key] })
        showNotice('success', '✓ 设置已更新并即时生效')
      } catch {
        showNotice('error', '✗ 设置保存失败：本地存储已满或不可用')
      }
    }

    const handleNumberChange = (key: keyof SimplifyConfig, nextVal: number) => {
      try {
        updateConfig({ [key]: nextVal })
        showNotice('success', '✓ 设置已更新并即时生效')
      } catch {
        showNotice('error', '✗ 设置保存失败：本地存储已满或不可用')
      }
    }

    // —— 供应商 ↔ 工作区绑定编辑 ——
    const [bindings, setBindings] = hooks.useState<ProviderBindings>(() => readBindings())
    const [catalog, setCatalog] = hooks.useState<{
      status: 'idle' | 'loading' | 'ready' | 'error'
      providers: Array<{ id: string; name: string }>
      workspaces: Array<{ id: string; label: string }>
    }>(() => ({
      status: options.providerCatalog === undefined ? 'error' : 'loading',
      providers: [],
      workspaces: options.workspaces?.() ?? []
    }))

    // 目录异步加载；失败时保留错误态并允许用户手动重试。
    // reloadToken 递增即重跑本 effect，避免为「重试」再造一套独立状态机。
    const [reloadToken, setReloadToken] = hooks.useState(0)
    hooks.useEffect(() => {
      if (options.providerCatalog === undefined) return
      let alive = true
      setCatalog((prev) => ({ ...prev, status: 'loading' }))
      options.providerCatalog()
        .then((providers) => {
          if (!alive) return
          setCatalog({
            status: 'ready',
            providers,
            workspaces: options.workspaces?.() ?? []
          })
        })
        .catch(() => {
          if (alive) setCatalog((prev) => ({ ...prev, status: 'error' }))
        })
      return () => {
        alive = false
      }
    }, [reloadToken])

    const applyBindings = (next: ProviderBindings) => {
      try {
        saveBindings(next)
        setBindings(next)
        showNotice('success', '✓ 供应商可用范围已更新')
      } catch {
        showNotice('error', '✗ 绑定配置保存失败：本地存储已满或不可用')
      }
    }

    // 勾选/取消勾选某供应商的某工作区。
    const toggleBinding = (providerId: string, workspaceId: string, checked: boolean) => {
      const current = bindings[providerId]?.workspaces ?? []
      const nextList = checked
        ? (current.includes(workspaceId) ? current : [...current, workspaceId])
        : current.filter((id) => id !== workspaceId)
      const next: ProviderBindings = { ...bindings }
      if (nextList.length === 0) {
        // 取消勾选最后一个工作区 = 回到「所有工作区可用」。
        // 不落成 workspaces: []：那会让供应商在所有工作区彻底消失，
        // 而用户点一下复选框就得到这种全局后果，属于误操作陷阱。
        // 真要全禁，语义上应使用「禁用该供应商」这类显式操作，而不是取消勾选。
        delete next[providerId]
        try {
          saveBindings(next)
          setBindings(next)
          showNotice('success', '✓ 已取消限制，该供应商恢复为所有工作区可用')
        } catch {
          showNotice('error', '✗ 绑定配置保存失败：本地存储已满或不可用')
        }
        return
      }
      next[providerId] = { workspaces: nextList }
      applyBindings(next)
    }

    // 解除某供应商的限制，回到「所有工作区可用」。
    const clearBinding = (providerId: string) => {
      const next: ProviderBindings = { ...bindings }
      delete next[providerId]
      applyBindings(next)
    }

    /**
     * 「供应商可用范围」卡片。
     *
     * 语义：默认全部工作区可用；一旦为某供应商勾选了工作区，它就只在这些工作区可用。
     * 一个都没勾 = 任何工作区都不可用（合法，但 UI 上会明确警示，避免误配置）。
     */
    const renderBindingCard = () => {
      const { status, providers, workspaces } = catalog

      let body: unknown
      if (status === 'loading') {
        body = h('div', { className: 'dsh-tide-settings-hint', 'data-dsh-tide-binding-loading': '' }, '正在读取供应商目录…')
      } else if (status === 'error' && providers.length === 0) {
        body = h('div', { className: 'dsh-tide-binding-error-wrap', 'data-dsh-tide-binding-error': '' },
          h('span', { className: 'dsh-tide-settings-hint' }, '无法读取供应商目录（通常是因为还没有任何会话）。'),
          h('button', {
            type: 'button',
            className: 'dsh-tide-binding-retry',
            'data-dsh-tide-binding-retry': '',
            onClick: () => setReloadToken((n) => n + 1)
          }, '重试')
        )
      } else if (providers.length === 0) {
        // 供应商目录是会话级数据：全新环境（一次模型面板都没打开过）时确实拿不到。
        // 这里给出可执行的下一步，而不是一句无信息量的「暂无」。
        body = h('div', { className: 'dsh-tide-binding-error-wrap', 'data-dsh-tide-binding-empty': '' },
          h('span', { className: 'dsh-tide-settings-hint' },
            '还没有读到供应商。请先在任意会话里打开一次输入框左侧的模型选择，再回到本页。'),
          h('button', {
            type: 'button',
            className: 'dsh-tide-binding-retry',
            'data-dsh-tide-binding-retry': '',
            onClick: () => setReloadToken((n) => n + 1)
          }, '重新读取')
        )
      } else if (workspaces.length === 0) {
        body = h('div', { className: 'dsh-tide-settings-hint', 'data-dsh-tide-binding-empty': '' }, '暂无工作区，无法配置可用范围。')
      } else {
        body = h('div', { className: 'dsh-tide-binding-list' },
          providers.map((provider) => {
            const binding = bindings[provider.id]
            const restricted = binding !== undefined
            const workspaces4 = binding?.workspaces ?? []
            const noneSelected = restricted && workspaces4.length === 0

            return h('div', {
              key: provider.id,
              className: 'dsh-tide-binding-row',
              'data-dsh-tide-binding-row': provider.id
            },
              h('div', { className: 'dsh-tide-binding-head' },
                h('span', { className: 'dsh-tide-binding-name' }, provider.name),
                restricted
                  ? h('span', { className: 'dsh-tide-binding-tag', 'data-dsh-tide-binding-tag': 'restricted' }, '已限制')
                  : h('span', { className: 'dsh-tide-binding-tag is-open', 'data-dsh-tide-binding-tag': 'open' }, '全部工作区可用'),
                restricted
                  ? h('button', {
                      type: 'button',
                      className: 'dsh-tide-binding-clear',
                      'data-dsh-tide-binding-clear': provider.id,
                      title: '解除限制，恢复为所有工作区可用',
                      onClick: () => clearBinding(provider.id)
                    }, '解除限制')
                  : null
              ),
              h('div', { className: 'dsh-tide-binding-workspaces' },
                workspaces.map((workspace) => {
                  const checked = restricted && workspaces4.includes(workspace.id)
                  return h('label', {
                    key: workspace.id,
                    className: `dsh-tide-binding-check ${restricted ? '' : 'is-unrestricted'}`,
                    title: restricted ? '' : '该供应商当前不受限制；勾选任意工作区即可开始限制'
                  },
                    h('input', {
                      type: 'checkbox',
                      checked,
                      'data-dsh-tide-binding-check': `${provider.id}::${workspace.id}`,
                      onChange: (event: { target: { checked: boolean } }) =>
                        toggleBinding(provider.id, workspace.id, event.target.checked)
                    }),
                    h('span', { className: 'dsh-tide-binding-label' }, workspace.label)
                  )
                })
              ),
              noneSelected
                ? h('div', { className: 'dsh-tide-binding-warn', 'data-dsh-tide-binding-warn': provider.id },
                    '该供应商未勾选任何工作区（可能来自手动编辑的配置）：它在所有工作区都不可用，勾选任意工作区或点「解除限制」即可恢复。')
                : null
            )
          })
        )
      }

      return h('div', {
        className: 'dsh-tide-settings-card',
        'data-group': 'provider-binding',
        'data-dsh-tide-binding-card': ''
      },
        h('div', { className: 'dsh-tide-settings-group-title' }, '供应商可用范围'),
        h('div', { className: 'dsh-tide-binding-body' },
          h('div', { className: 'dsh-tide-settings-hint' },
            '默认所有供应商在任何工作区都可用。为某个供应商勾选工作区后，它只在这些工作区可选；在其它工作区里它仍会显示在模型面板中，但置灰并标注「本工作区不可用」。已选中的会话不会被自动切换，只在选择器上标红提示。'),
          body
        )
      )
    }

    const handleReset = () => {
      try {
        resetSimplifyConfig()
        // 绑定关系是独立存储键，必须一并清空：否则用户以为「恢复默认」了，
        // 供应商限制却还在生效，属于会让人排查半天的隐性残留。
        saveBindings({})
        setBindings({})
        showNotice('success', '✓ 已恢复全部默认设置')
      } catch {
        showNotice('error', '✗ 重置失败：本地存储操作异常')
      }
    }

    return h('div', {
      className: 'dsh-tide-settings-root',
      'data-dsh-tide-settings': ''
    },
      // 头部说明
      h('div', { className: 'dsh-tide-settings-head' },
        h('div', { className: 'dsh-tide-settings-title-wrap' },
          h('h4', { className: 'dsh-tide-settings-title' }, '潮汐主题 · 主题与增强功能配置'),
          h('span', { className: 'dsh-tide-settings-badge' }, '即时生效')
        ),
        h('p', { className: 'dsh-tide-settings-desc' },
          '可视化切换各项界面增强与显示模块。主题材质开启时套用潮汐深海皮肤，关闭后回落到 DSH 原生外观；所有设置实时保存在本地。'
        )
      ),

      // 供应商可用范围（按工作区限制）
      renderBindingCard(),

      // 各功能分组卡片
      h('div', { className: 'dsh-tide-settings-groups' },
        SETTING_GROUPS.map((group) =>
          h('div', {
            key: group.id,
            className: 'dsh-tide-settings-card',
            'data-group': group.id
          },
            h('div', { className: 'dsh-tide-settings-group-title' }, group.title),
            h('div', { className: 'dsh-tide-settings-list' },
              group.items.map((item) => {
                if (item.type === 'number') {
                  const num = typeof config[item.key] === 'number' ? (config[item.key] as number) : 5
                  const min = item.min ?? 0
                  const max = item.max ?? 50
                  const displayVal = num === 0 && item.zeroLabel ? item.zeroLabel : `${num} ${item.unit ?? ''}`

                  return h('div', {
                    key: item.key,
                    className: 'dsh-tide-settings-row'
                  },
                    h('div', { className: 'dsh-tide-settings-row-text' },
                      h('div', { className: 'dsh-tide-settings-item-title' }, item.title),
                      h('div', { className: 'dsh-tide-settings-item-desc' }, item.description)
                    ),
                    h('div', { className: 'dsh-tide-stepper', 'data-dsh-tide-stepper': item.key },
                      h('button', {
                        type: 'button',
                        className: 'dsh-tide-stepper-btn is-dec',
                        disabled: num <= min,
                        'aria-label': `${item.title} 减小`,
                        onClick: () => handleNumberChange(item.key, Math.max(min, num - 1))
                      }, '−'),
                      h('span', { className: 'dsh-tide-stepper-val' }, displayVal),
                      h('button', {
                        type: 'button',
                        className: 'dsh-tide-stepper-btn is-inc',
                        disabled: num >= max,
                        'aria-label': `${item.title} 增加`,
                        onClick: () => handleNumberChange(item.key, Math.min(max, num + 1))
                      }, '+')
                    )
                  )
                }

                const active = config[item.key] as boolean
                return h('div', {
                  key: item.key,
                  className: 'dsh-tide-settings-row'
                },
                  h('div', { className: 'dsh-tide-settings-row-text' },
                    h('div', { className: 'dsh-tide-settings-item-title' }, item.title),
                    h('div', { className: 'dsh-tide-settings-item-desc' }, item.description)
                  ),
                  h('button', {
                    type: 'button',
                    role: 'switch',
                    className: 'dsh-tide-switch',
                    'aria-checked': active,
                    'data-active': active,
                    'aria-label': `${item.title}: ${active ? '已启用' : '已禁用'}`,
                    onClick: () => handleToggle(item.key)
                  },
                    h('span', { className: 'dsh-tide-switch-knob' })
                  )
                )
              })
            )
          )
        )
      ),

      // 底部操作区
      h('div', { className: 'dsh-tide-settings-footer' },
        h('div', { className: 'dsh-tide-settings-status' },
          notice
            ? h('span', {
                className: `dsh-tide-settings-notice ${notice.type === 'error' ? 'is-error' : 'is-success'}`,
                'data-notice-type': notice.type
              }, notice.text)
            : h('span', { className: 'dsh-tide-settings-hint' }, '设置已持久化存储至本地')
        ),
        h('button', {
          type: 'button',
          className: 'dsh-tide-settings-reset-btn',
          onClick: handleReset
        }, '恢复全部默认设置')
      )
    )
  }
}
