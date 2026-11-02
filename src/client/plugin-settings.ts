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
    title: '潮汐玻璃主题',
    items: [
      {
        key: 'themeOverrides',
        title: '潮汐玻璃主题材质',
        description: '为底栏 HUD、用量看板与委派图套用冰蓝玻璃材质（径向微光、定向投影、发丝描边与彩色图标）；关闭此项后这些组件回落到 DSH 原生外观。'
      }
    ]
  }
]

export function createPluginSettings(shared: DockShared) {
  const { h, hooks } = shared

  return function PluginSettings(_props: PluginSettingsProps) {
    const [config, updateConfig] = useSimplifyConfig(hooks)
    const [savedNotice, setSavedNotice] = hooks.useState(false)

    const handleToggle = (key: keyof SimplifyConfig) => {
      updateConfig({ [key]: !config[key] })
      setSavedNotice(true)
      setTimeout(() => setSavedNotice(false), 2000)
    }

    const handleNumberChange = (key: keyof SimplifyConfig, nextVal: number) => {
      updateConfig({ [key]: nextVal })
      setSavedNotice(true)
      setTimeout(() => setSavedNotice(false), 2000)
    }

    const handleReset = () => {
      resetSimplifyConfig()
      setSavedNotice(true)
      setTimeout(() => setSavedNotice(false), 2000)
    }

    return h('div', {
      className: 'dsh-tide-settings-root',
      'data-dsh-tide-settings': ''
    },
      // 头部说明
      h('div', { className: 'dsh-tide-settings-head' },
        h('div', { className: 'dsh-tide-settings-title-wrap' },
          h('h4', { className: 'dsh-tide-settings-title' }, '潮汐玻璃 · 主题与增强功能配置'),
          h('span', { className: 'dsh-tide-settings-badge' }, '即时生效')
        ),
        h('p', { className: 'dsh-tide-settings-desc' },
          '可视化切换各项界面增强与显示模块。主题材质开启时套用冰蓝玻璃皮肤，关闭后回落到 DSH 原生外观；所有设置实时保存在本地。'
        )
      ),

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
          savedNotice
            ? h('span', { className: 'dsh-tide-settings-notice' }, '✓ 设置已更新并即时生效')
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
