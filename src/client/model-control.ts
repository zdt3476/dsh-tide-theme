/**
 * 模型 + 思考等级 dock 控件。
 *
 * 触发行是两颗 pill：模型名（带供应商前缀）与思考等级，各自独立展开；
 * 思考等级用 range 滑块直接映射 adapter 宣告的 efforts，滑杆释放才提交，
 * 拖动过程只在本地预览。模型列表按供应商分组、带粘性组头，无内置搜索
 * ——分组后的层级已经可控，保留原生 `/model` 做搜索场景。
 */

import type { ModelDirectories, ModelSelection, CatalogGroup } from './model-directory'
import { effortLabel, effortLevels, displayName, orderGroups, providerColor, retainEffort } from './model-directory'
import { rankCatalog, type UsageRank } from './usage-rank'
import { effortName, providerName } from './localize'
import { placePopup, measurePopup } from './popup'
import { useDismiss } from './dock-shared'
import { createPortal } from 'react-dom'
import type { DockShared } from './dock-shared'
import {
  bindingViolated,
  blockedProviders,
  readBindings,
  recordKnownProviders,
  type ProviderBindings
} from './provider-binding'

export interface ModelControlProps {
  sessionId: string
  directories: ModelDirectories
  shared: DockShared
  /** 打开面板时读取一次用量聚合，用于按使用频率排序。 */
  usage?: () => UsageRank
  /** 选择模型后记录一次本地使用，用于清理历史后仍保留排序。 */
  recordSelection?: (provider: string, model: string) => void
  /**
   * 当前会话所属工作区 id；undefined 表示无法判定（新会话尚未落盘等）。
   * 绑定限制只在能确定工作区时生效，避免误把整个选择器锁死。
   */
  workspaceId?: () => string | undefined
}

export function createModelControl(props: ModelControlProps) {
  const { h, hooks, t } = props.shared
  const sh = props.shared
  const directory = props.directories.directoryFor(props.sessionId)

  return function ModelControl() {
    const state = hooks.useSyncExternalStore(
      (fn) => directory.store.subscribe(fn),
      () => directory.store.getSnapshot()
    )
    // 挂载即拉目录：思考等级 pill 与供应商分组不依赖用户先点开弹层。
    // 顺手把「见过的供应商」记下来，供设置页在没有会话时兜底展示。
    hooks.useEffect(() => {
      directory.load()
        .then((snapshot) => {
          recordKnownProviders(
            (snapshot.groups ?? [])
              .filter((group) => group.models.length > 0)
              .map((group) => ({ id: group.id, name: group.name }))
          )
        })
        .catch(() => {})
    }, [])
    const [open, setOpen] = hooks.useState<'none' | 'model' | 'effort'>('none')
    const [draftEffort, setDraftEffort] = hooks.useState<string | null>(null)
    const triggerRef = hooks.useRef<HTMLElement | null>(null)
    const effortRef = hooks.useRef<HTMLElement | null>(null)
    const popupRef = hooks.useRef<HTMLElement | null>(null)
    const [pos, setPos] = hooks.useState<{ left: number; top: number } | null>(null)

    const baseGroups: CatalogGroup[] = orderGroups(state.groups)
    // 面板打开时才聚合用量（避免每次渲染都扫全量会话），目录展示顺序按真实使用频率。
    const [usageRank, setUsageRank] = hooks.useState<UsageRank | null>(null)
    const rankedGroups: CatalogGroup[] = usageRank === null ? baseGroups : rankCatalog(baseGroups, usageRank)

    // —— 供应商 ↔ 工作区绑定限制 ——
    // 配置在 localStorage，组件挂载时读一次；同时订阅 storage 事件，
    // 让用户在另一个标签页/设置页改完绑定后，这里无需重开面板即可生效。
    const [bindings, setBindings] = hooks.useState<ProviderBindings>(() => readBindings())
    hooks.useEffect(() => {
      const sync = () => setBindings(readBindings())
      window.addEventListener('storage', sync)
      return () => window.removeEventListener('storage', sync)
    }, [])
    const workspaceId = props.workspaceId?.()
    // null = 未配置任何绑定，全部允许。
    // 注意：受限供应商**不从列表里剔除**，而是置灰并给出原因——用户需要知道
    // 这个供应商确实存在、只是在本工作区不可用，否则会误以为它没配好或消失了。
    const isBlocked = blockedProviders(bindings, workspaceId)
    const blockedProvider = (id: string): boolean => isBlocked !== null && isBlocked(id)
    // 全部目录原样展示（仍未按 allow 过滤），置灰只作用于交互层。
    const groups: CatalogGroup[] = rankedGroups

    const selection: ModelSelection | null = state.pending ?? state.current
    // 当前选中的供应商若被限制在本工作区之外，不自动切换（静默换模型副作用太大），
    // 而是在 pill 与面板里显式标出来，由用户自己决定换哪个。
    const violated = bindingViolated(bindings, selection?.provider, workspaceId)
    // 名称与供应商标签一律从「未过滤」的完整目录里取：受限供应商虽不在可选列表里，
    // 但当前会话可能正跑在它上面，pill 仍须如实显示名称而不是退化成一个 id。
    const name = displayName(rankedGroups, selection)
    const group = selection === null ? undefined : rankedGroups.find((candidate) => candidate.id === selection.provider)
    const providerLabel = group === undefined ? selection?.provider ?? '' : providerName(group.id, group.name)
    // 始终显示「供应商 / 模型」：供应商是判断模型来源的必要信息，不能为了宽度把它去掉。
    // 宽度问题由 CSS 侧的 max-width 解决；真放不下时省略号作用在模型名尾部，
    // 供应商名位于最左侧，始终可读。
    // 供应商缺失时不能拼出前导孤立斜杠（「 / gpt-4」），此时退化为只显示模型名。
    const fullLabel = name === ''
      ? t('model.placeholder')
      : (providerLabel === '' ? name : `${providerLabel} / ${name}`)
    const modelLabel = fullLabel
    const effort = effortLabel(groups, selection, t('effort.providerDefault'), state.retainedEffort)
    const busy = state.status === 'selecting' || state.status === 'loading'

    const close = () => {
      setOpen('none')
      setDraftEffort(null)
    }

    // 弹层锚定 dock 行（与聊天卡片同宽）的左缘，与控件所在侧一致：
    // 宽面板不会因供应商多而溢出屏幕，位置也稳定可预期。
    hooks.useEffect(() => {
      if (open === 'none') {
        setPos(null)
        return
      }
      const popup = popupRef.current
      if (popup === null) return
      const size = measurePopup(popup)
      const viewport = { width: window.innerWidth, height: window.innerHeight }
      // 模型面板宽，沿卡片左缘展开；思考等级是窄弹层，以它自己的按钮为中心。
      const anchor = open === 'effort'
        ? effortRef.current
        : (triggerRef.current?.closest('[data-composer-dock]') as HTMLElement | null) ?? triggerRef.current
      if (anchor === null) return
      const rect = anchor.getBoundingClientRect()
      const align = open === 'effort' ? 'center' : 'left'
      const computedPos = placePopup({ left: rect.left, right: rect.right, bottom: rect.bottom, top: rect.top }, size, viewport, align, 'top')
      // 短视口边界约束：浮层顶部永远在视口可见范围之内
      setPos({
        left: Math.max(8, computedPos.left),
        top: Math.max(8, computedPos.top)
      })
    }, [open, state.groups.length])

    hooks.useEffect(() => {
      if (open === 'none') return
      const onResize = () => close()
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }, [open])

    useDismiss(sh, close, open !== 'none')

    const openDirectory = () => {
      directory.load().catch(() => {})
      if (props.usage !== undefined) setUsageRank(props.usage())
      setOpen((prev) => (prev === 'model' ? 'none' : 'model'))
    }

    const pickModel = (provider: string, model: string, meta?: import('./model-directory').ReasoningMeta) => {
      // 兜底拦截：受限条目虽然渲染出来（置灰），但 disabled 只管住鼠标点击；
      // 键盘、程序化触发或样式失效等路径仍可能到达这里，此时直接忽略，
      // 绝不把受限供应商真正设进会话。
      if (isBlocked !== null && isBlocked(provider)) return
      // 换模型保留原思考档位；目标模型不支持该档位时用它自己的默认档位。
      const nextEffort = retainEffort(meta, selection?.reasoningEffort)
      props.recordSelection?.(provider, model)
      void directory.select({ provider, model, ...(nextEffort === undefined ? {} : { reasoningEffort: nextEffort }) })
      close()
    }

    const commitEffort = (value: string | undefined) => {
      if (selection === null) return
      void directory.select({ provider: selection.provider, model: selection.model, ...(value === undefined ? {} : { reasoningEffort: value }) })
      close()
    }

    // 受限供应商：pill 打上 data 标记供样式标红，并把原因写进 title / aria-label，
    // 保证鼠标悬浮与读屏用户都能知道「为什么这个模型在本工作区不可选」。
    const violationHint = t('model.bindingBlocked', { provider: providerLabel })

    const pill = (kind: 'model' | 'effort', label: unknown, color?: string) =>
      h('button', {
        type: 'button',
        'data-dsh-tide-pill': '',
        'data-dsh-tide-control': kind,
        'data-dsh-tide-emphasis': kind,
        ...(kind === 'model' && violated ? { 'data-dsh-tide-binding-blocked': '' } : {}),
        // title 与 aria-label 都给完整「供应商 / 模型」：pill 上被省略或读屏时都能拿到来源。
        title: kind === 'model' ? (violated ? `${fullLabel} · ${violationHint}` : fullLabel) : undefined,
        style: color === undefined ? undefined : { '--dsh-tide-provider-color': color },
        'aria-label': kind === 'model'
          ? (name === '' ? t('model.placeholder') : `${t('model.title')}：${fullLabel}`)
          : `${t('effort.title')}：${effort ?? t('effort.unavailableShort')}`,
        'aria-haspopup': 'dialog',
        'aria-expanded': open === kind ? 'true' : 'false',
        disabled: busy,
        ref: (el: HTMLElement | null) => {
          if (kind === 'model') triggerRef.current = el
          else effortRef.current = el
        },
        onClick: (event: Event) => {
          event.stopPropagation()
          if (kind === 'model') openDirectory()
          else setOpen((prev) => (prev === 'effort' ? 'none' : 'effort'))
        }
      },
      h('span', { 'data-dsh-tide-pill-glyph': '', 'aria-hidden': 'true' }),
      label,
      h('span', { 'data-dsh-tide-pill-caret': '', 'aria-hidden': 'true' }))

    // 供应商色按「有模型的供应商」在面板里的顺序取，保证同面板内不撞色。
    const orderedProviders = groups.filter((candidate) => candidate.models.length > 0)
    const providerIndex = group === undefined ? -1 : orderedProviders.findIndex((candidate) => candidate.id === group.id)
    const modelPill = pill('model', h('span', { 'data-dsh-tide-pill-label': '' }, modelLabel), providerIndex < 0 || group === undefined ? undefined : providerColor(group.id, providerIndex))
    const children: unknown[] = [modelPill]

    // 两颗 pill 之间不再插入「·」：宿主原生 seat 之间靠间距分隔，多一个符号会让
    // 这一行比右侧原生控件更杂，还会白白吃掉模型名可用的宽度。
    children.push(pill('effort', h('span', { 'data-dsh-tide-pill-label': '' }, effort ?? t('effort.unavailableShort'))))

    let popupNode: unknown = null

    // 模型列表：平铺放大——一供应商一列，列内模型纵向排列，全目录一屏可见。
    if (open === 'model') {
      const columns: unknown[] = []
      const visibleGroups = groups.filter((group) => group.models.length > 0)
      if (state.status === 'error' || state.error !== null) {
        columns.push(h('div', { key: 'note-error', 'data-dsh-tide-note': '', 'data-dsh-tide-error': '' }, state.error ?? t('error.load')))
      }
      if (visibleGroups.length === 0 && state.status !== 'loading') {
        columns.push(h('div', { key: 'note-empty', 'data-dsh-tide-note': '' }, t('model.empty')))
      }
      // 目录非空、但本工作区把所有供应商都限制了：给一条明确提示。
      // 注意必须放在列栅格之外（见下方 footer）：塞进 columns 会变成「第 0 列」，
      // 挤占横向空间并把每列宽度从 260px 压到 223px，属于真实的布局缺陷。
      const allBlocked = visibleGroups.length > 0 && visibleGroups.every((group) => blockedProvider(group.id))
      for (const [index, group] of visibleGroups.entries()) {
        const color = providerColor(group.id, index)
        const blocked = blockedProvider(group.id)
        const models: unknown[] = []
        for (const model of group.models) {
          const active = selection !== null && selection.provider === group.id && selection.model === model.id
          const effortCount = model.reasoning?.efforts?.length ?? 0
          models.push(
            // 受限供应商的模型仍然渲染出来，但 disabled 且标题说明原因：
            // 让用户知道「它存在、只是这里用不了」，而不是以为它消失了。
            h('button', {
              type: 'button',
              'data-dsh-tide-item': '',
              'data-active': active ? 'true' : 'false',
              ...(blocked ? { 'data-dsh-tide-item-blocked': '', disabled: true } : {}),
              style: { '--dsh-tide-provider-color': color },
              key: `m:${group.id}:${model.id}`,
              title: blocked ? t('model.bindingBlocked', { provider: providerName(group.id, group.name) }) : undefined,
              onClick: () => pickModel(group.id, model.id, model.reasoning)
            },
            h('span', { style: { flex: 1, minWidth: 0 } }, model.name),
            effortCount > 1 ? h('span', { 'data-dsh-tide-badge': '' }, String(effortCount)) : null,
            blocked ? h('span', { 'data-dsh-tide-lock': '', 'aria-hidden': 'true' }, '🔒') : null,
            active ? h('span', { 'data-dsh-tide-check': '', 'aria-hidden': 'true' }, '✓') : null
            )
          )
        }
        columns.push(
          h('div', {
            'data-dsh-tide-column': '',
            ...(blocked ? { 'data-dsh-tide-column-blocked': '' } : {}),
            key: `g:${group.id}`,
            style: { '--dsh-tide-provider-color': color }
          },
            h('div', { 'data-dsh-tide-group': '' },
              h('span', { 'data-dsh-tide-provider-dot': '', 'aria-hidden': 'true' }),
              h('span', { 'data-dsh-tide-provider-name': '' }, providerName(group.id, group.name))
            ),
            blocked
              ? h('div', { 'data-dsh-tide-blocked-hint': '' }, t('model.bindingBlockedShort'))
              : null,
            h('div', { 'data-dsh-tide-column-body': '' }, models)
          )
        )
      }
      popupNode = h('div', {
        'data-dsh-tide-popup': '',
        'data-dsh-tide-portal-root': '',
        'data-dsh-tide-model-grid': '',
        ref: (el: HTMLElement | null) => { popupRef.current = el },
        style: pos === null ? { visibility: 'hidden' } : { left: pos.left, top: pos.top }
      },
      h('div', { 'data-dsh-tide-grid-head': '' },
        h('span', { 'data-dsh-tide-grid-title': '' }, t('model.title')),
        visibleGroups.length === 0 ? null : h('span', { 'data-dsh-tide-grid-hint': '' }, t('model.providers', { count: visibleGroups.length }))
      ),
      h('div', { 'data-dsh-tide-grid-columns': '' }, columns),
      allBlocked
        ? h('div', {
            key: 'note-all-blocked',
            'data-dsh-tide-note': '',
            'data-dsh-tide-binding-empty': ''
          }, t('model.allBlocked'))
        : null)
    }

    // 思考等级滑块：标题行给出当前档位，轨道带填充进度，刻度文字标出全部档位。
    if (open === 'effort') {
      const meta = groups.find((candidate) => candidate.id === selection?.provider)?.models.find((candidate) => candidate.id === selection?.model)?.reasoning
      const levels = effortLevels(meta, t('effort.providerDefault'))
      if (levels.length === 0) {
        popupNode = h('div', {
          'data-dsh-tide-popup': '',
          'data-dsh-tide-portal-root': '',
          ref: (el: HTMLElement | null) => { popupRef.current = el },
          style: pos === null ? { visibility: 'hidden' } : { left: pos.left, top: pos.top }
        }, h('div', { 'data-dsh-tide-note': '' }, t('effort.unavailable')))
      } else {
        const currentId = draftEffort === null ? selection?.reasoningEffort ?? meta?.defaultEffort : draftEffort || undefined
        const draftIndex = draftEffort === null ? -1 : levels.findIndex((level) => (level.id ?? '') === draftEffort)
        const index = draftIndex >= 0 ? draftIndex : Math.max(0, levels.findIndex((level) => level.id === currentId))
        const fill = levels.length > 1 ? (index / (levels.length - 1)) * 100 : 100
        popupNode = h('div', {
          'data-dsh-tide-popup': '',
          'data-dsh-tide-portal-root': '',
          'data-dsh-tide-effort': '',
          ref: (el: HTMLElement | null) => { popupRef.current = el },
          style: pos === null ? { visibility: 'hidden' } : { left: pos.left, top: pos.top }
        },
        h('div', { 'data-dsh-tide-effort-head': '' },
          h('span', { 'data-dsh-tide-effort-title': '' }, t('effort.title')),
          h('span', { 'data-dsh-tide-effort-value': '' }, levels[index]?.name ?? '')
        ),
        h('div', { 'data-dsh-tide-effort-rail': '', style: { '--dsh-tide-fill': `${fill}%` } },
          h('input', {
            type: 'range',
            'aria-label': t('effort.title'),
            'aria-valuetext': levels[index]?.name,
            'data-dsh-tide-effort-slider': '',
            min: 0,
            max: levels.length - 1,
            step: 1,
            value: index,
            onChange: (event: Event) => {
              const input = event.target as HTMLInputElement
              setDraftEffort(levels[Number(input.value)]?.id ?? '')
            },
            onPointerUp: (event: Event) => {
              const level = levels[Number((event.target as HTMLInputElement).value)]
              if (level !== undefined) commitEffort(level.id)
            },
            onKeyUp: (event: KeyboardEvent) => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') {
                const input = event.target as HTMLInputElement
                const level = levels[Number(input.value)]
                if (level !== undefined) commitEffort(level.id)
              }
            }
          })
        ),
        h('div', { 'data-dsh-tide-effort-scale': '' }, levels.map((level, levelIndex) => {
          const ratio = levels.length > 1 ? levelIndex / (levels.length - 1) : 0
          return h('span', {
            key: level.id ?? 'provider-default',
            'data-active': levelIndex === index ? 'true' : 'false',
            // 标签中心对准档位位置（含两端），与滑块拇指轨迹重合。
            style: { left: `${ratio * 100}%`, transform: 'translateX(-50%)' }
          }, level.name)
        }))
        )
      }
    }

    const popupPortal = popupNode && typeof document !== 'undefined'
      ? createPortal(popupNode, document.body)
      : popupNode

    return h('div', { 'data-dsh-tide-dock-root': '' }, ...children, popupPortal)
  }
}

export interface ColumnBuildInput {
  groups: readonly { id: string; name: string; models: readonly { id: string; name: string; reasoning?: { defaultEffort?: string; efforts?: readonly { id: string; name: string }[] } }[] }[]
  selection: { provider: string; model: string } | null
  accountLabel: string
}

/**
 * 平铺网格的列数据：一供应商一列；返回列头与列内条目 id 列表（展示名）。
 * 独立成纯函数供单测；组件侧只负责把它渲染成 DOM。
 */
export function buildModelColumns(input: ColumnBuildInput): Array<{ id: string; label: string; models: Array<{ id: string; name: string; active: boolean; effortCount: number }> }> {
  return input.groups
    .filter((group) => group.models.length > 0)
    .map((group) => ({
      id: group.id,
      label: group.id === 'deepseek-account' ? input.accountLabel : group.name,
      models: group.models.map((model) => ({
        id: model.id,
        name: model.name,
        active: input.selection !== null && input.selection.provider === group.id && input.selection.model === model.id,
        effortCount: model.reasoning?.efforts?.length ?? 0
      }))
    }))
}
