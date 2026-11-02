/**
 * 截图用的 locale 字典。
 *
 * 放在独立模块里而不是当成 evaluate 的参数传进页面：Playwright 无法序列化函数值，
 * 由页面自己 `import` 才能拿到带插值的真实文案。
 */
const TEMPLATES = {
  'groups.more': (p) => `还有 ${p.count} 个工作区`,
  'delegation.batch': (p) => `第 ${p.index} 次委派`,
  'delegation.agents': (p) => `${p.count} 个代理`,
  'delegation.steps': (p) => `${p.count} 步`,
  'delegation.coordinating': (p) => `Plans · Delegates · Synthesizes（${p.count} 个子代理并行）`,
  'model.providers': (p) => `${p.count} 个供应商`,
  'duration.s': () => '秒',
  'duration.m': () => '分'
}

const CONSTANTS = {
  'groups.pin': '置顶',
  'groups.pinHint': '选择置顶工作区',
  'groups.pinnedTitle': '置顶',
  'groups.unpinnedTitle': '工作区',
  'groups.collapse': '收起工作区',
  'delegation.state.done': '已完成',
  'delegation.state.running': '运行中',
  'delegation.state.failed': '失败',
  'delegation.state.denied': '已拒绝',
  'delegation.agent': 'Orchestrator',
  'delegation.stopLabel': '停止',
  'delegation.stop': '停止该子代理',
  'delegation.expand': '展开',
  'delegation.collapse': '收起',
  'delegation.title': '子代理委派',
  'filter.placeholder': '筛选工作区或会话...',
  'duration.prefix': '耗时',
  'duration.took': '耗时',
  'model.placeholder': '选择模型',
  'model.title': '选择模型',
  'model.empty': '暂无可用模型',
  'effort.title': '思考等级',
  'effort.providerDefault': '默认',
  'effort.unavailable': '当前模型没有可选的思考等级',
  'effort.unavailableShort': '不可用',
  'permission.title': '访问模式',
  'permission.hint': '减少确认范围',
  'permission.readOnly': '仅可查看',
  'permission.workspaceWrite': '工作区内修改',
  'permission.fullAccess': '完全权限',
  'permission.auto': '自动审查',
  'permission.experimental': '实验',
  'permission.loading': '正在加载权限目录…',
  'permission.confirmTitle': '此模式将减少确认步骤，确认继续？',
  'permission.confirmEnable': '我已了解风险，继续启用',
  'permission.cancel': '取消',
  'error.load': '加载失败',
  'error.session': '会话尚未就绪'
}

/** 宿主 locale 解析入口：命中模板就插值，命中常量就直取，否则回落键名。 */
export function locale(key, params) {
  const template = TEMPLATES[key]
  if (template !== undefined) return template(params ?? {})
  return CONSTANTS[key] ?? key
}

export default locale
