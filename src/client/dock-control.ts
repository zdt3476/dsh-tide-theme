/**
 * dock 根控件：把模型、思考等级、权限三颗控件排进 composer 的 dock 行。
 *
 * 两条渲染路径共用同一套控件：
 * - 会话态：DSH 的 `conversation.composer.dock` list slot 承载（slot 提供标准
 *   `useProjection` hook 读会话权限投影）。
 * - 新会话 hero 态：DSH 不渲染该 slot，由 hero-dock 注入容器承载，权限值改为
 *   轮询读取（见 hero-dock.ts）。
 *
 * 布局：模型组靠左、权限组靠右、统计项在中间聚簇（两侧 flex:1 等分）。
 */

import type { ModelDirectories } from './model-directory'
import { createModelControl } from './model-control'
import { createPermissionControl } from './permission-control'
import { createDockStats } from './dock-stats'
import { useSimplifyConfig } from './plugin-config'
import type { DockShared, H } from './dock-shared'

export interface DockHostProps {
  sessionId: string
  directories: ModelDirectories
  remote: { permissionPresets: { catalog: () => Promise<{ ok: boolean; value?: import('./permission-catalog').PermissionCatalog; error?: { code: string; message: string } }> } }
  useProjection: (key: string) => unknown
  session: () => import('./permission-control').PermissionSession | undefined
  shared: DockShared
  usage?: () => import('./usage-rank').UsageRank
  recordSelection?: (provider: string, model: string) => void
}

export function createDockControl(props: DockHostProps) {
  const stats = createDockStats(props.shared)
  const h = props.shared.h

  // 底栏直接返回统计 Stats 组件，避免空左右配重与重复 derive 事实源。
  return function DockControl(runtimeProps?: { useProjection?: (key: string) => unknown }) {
    const useProj = runtimeProps?.useProjection ?? props.useProjection
    const [config] = useSimplifyConfig(props.shared.hooks)
    if (!config.dockStats) return null
    return h(stats as never, { useProjection: useProj })
  }
}

/**
 * 输入框内部行动行专用的模型 + 思考等级控件（对应效果图里输入框左下角的位置）。
 * 与 `createDockControl` 共用同一套控件实例工厂，只是不带统计 HUD。
 */
export function createModelSeat(props: DockHostProps) {
  const model = createModelControl({
    sessionId: props.sessionId,
    directories: props.directories,
    shared: props.shared,
    usage: props.usage,
    recordSelection: props.recordSelection
  })
  const h = props.shared.h
  return function ModelSeat() {
    const [config] = useSimplifyConfig(props.shared.hooks)
    if (!config.modelControl) return null
    return h('div', { 'data-dsh-tide-seat': 'model' }, h(model as never, {}))
  }
}

/** 输入框内部行动行专用的权限控件（对应效果图里输入框右下角的位置）。 */
export function createPermissionSeat(props: DockHostProps) {
  const permission = createPermissionControl({
    sessionId: props.sessionId,
    remote: props.remote,
    session: props.session,
    shared: props.shared
  })
  const h = props.shared.h
  return function PermissionSeat(runtimeProps?: { useProjection?: (key: string) => unknown }) {
    const useProj = runtimeProps?.useProjection ?? props.useProjection
    const [config] = useSimplifyConfig(props.shared.hooks)
    const projection = useProj('permissions') as { currentValue: string } | undefined
    if (!config.permissionControl) return null
    return h('div', { 'data-dsh-tide-seat': 'permission' },
      h(permission as never, { permissionValue: projection?.currentValue }))
  }
}
