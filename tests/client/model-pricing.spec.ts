import { describe, expect, it } from 'vitest'
import { buildPriceIndex, estimateCost, formatCost, lookupPrice, normalizePrice, priceKey } from '../../src/client/model-pricing'
import { delegationUsage, toDelegationNode } from '../../src/client/delegation-tree'

describe('model-pricing 归一化', () => {
  it('把模型名统一成可比较的裸键', () => {
    expect(priceKey('deepseek/deepseek-v4.1-flash')).toBe('deepseek-v4-1-flash')
    expect(priceKey('DeepSeek-V4.1-Flash')).toBe('deepseek-v4-1-flash')
    expect(priceKey('claude_3_5_sonnet')).toBe('claude-3-5-sonnet')
  })

  it('OpenRouter 的字符串单价解析为数字', () => {
    expect(normalizePrice({ prompt: '0.0000003', completion: '0.0000012' })).toEqual({
      prompt: 0.0000003,
      completion: 0.0000012
    })
  })

  it('缺少 prompt 或 completion 视为无效价目', () => {
    expect(normalizePrice({ prompt: '0.1' })).toBeUndefined()
    expect(normalizePrice({ completion: '0.1' })).toBeUndefined()
    expect(normalizePrice(undefined)).toBeUndefined()
  })

  it('缓存读写价作为可选字段保留', () => {
    expect(normalizePrice({ prompt: '0.1', completion: '0.2', input_cache_read: '0.05' })).toEqual({
      prompt: 0.1,
      completion: 0.2,
      cacheRead: 0.05
    })
  })
})

describe('model-pricing 索引与查询', () => {
  const models = [
    { id: 'deepseek/deepseek-v4.1-flash', pricing: { prompt: '0.0000003', completion: '0.0000012' } },
    { id: 'anthropic/claude-3-5-sonnet', pricing: { prompt: '0.000003', completion: '0.000015' } },
    { id: 'broken/no-pricing', pricing: {} }
  ]

  it('构建索引时跳过无效条目并去掉供应商前缀', () => {
    const index = buildPriceIndex(models)
    expect(index.size).toBe(2)
    expect(index.has('no-pricing')).toBe(false)
  })

  it('宿主展示名能与 OpenRouter 目录对上', () => {
    const index = buildPriceIndex(models)
    expect(lookupPrice(index, 'DeepSeek-V4.1-Flash')?.prompt).toBe(0.0000003)
    expect(lookupPrice(index, 'claude 3 5 sonnet')?.completion).toBe(0.000015)
  })

  it('容忍 OpenRouter 的日期后缀；多个候选时放弃而非瞎猜', () => {
    const dated = buildPriceIndex([
      { id: 'x/model-a-20241022', pricing: { prompt: '1', completion: '2' } }
    ])
    expect(lookupPrice(dated, 'model-a')?.prompt).toBe(1)

    const ambiguous = buildPriceIndex([
      { id: 'x/model-a-20241022', pricing: { prompt: '1', completion: '2' } },
      { id: 'y/model-a-20250101', pricing: { prompt: '3', completion: '4' } }
    ])
    expect(lookupPrice(ambiguous, 'model-a')).toBeUndefined()
  })

  it('查不到价目返回 undefined，不编造数字', () => {
    const index = buildPriceIndex(models)
    expect(lookupPrice(index, 'unknown-model')).toBeUndefined()
    expect(lookupPrice(index, '')).toBeUndefined()
  })
})

describe('model-pricing 金额估算', () => {
  it('四桶分别按各自单价计价', () => {
    const cost = estimateCost(
      { prompt: 0.000001, completion: 0.000002, cacheRead: 0.0000001 },
      { uncachedInputTokens: 1000, cacheReadTokens: 2000, cacheWriteTokens: 0, outputTokens: 500 }
    )
    expect(cost).toBeCloseTo(1000 * 0.000001 + 2000 * 0.0000001 + 500 * 0.000002, 12)
  })

  it('缺缓存价时退回普通输入价（宁可高估不漏算）', () => {
    const cost = estimateCost(
      { prompt: 0.000001, completion: 0.000002 },
      { uncachedInputTokens: 0, cacheReadTokens: 1000, cacheWriteTokens: 1000, outputTokens: 0 }
    )
    expect(cost).toBeCloseTo(2000 * 0.000001, 12)
  })

  it('缺价目或缺用量都返回 undefined', () => {
    expect(estimateCost(undefined, { uncachedInputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 })).toBeUndefined()
  })

  it('小额金额保留有效位，不会全显示成 $0.00', () => {
    expect(formatCost(0)).toBe('$0')
    expect(formatCost(0.00012)).toBe('$0.0001')
    expect(formatCost(0.0234)).toBe('$0.023')
    expect(formatCost(1.234)).toBe('$1.23')
  })
})

describe('delegationUsage 四桶求和', () => {
  it('累加四个互不重叠的桶', () => {
    expect(delegationUsage({
      uncachedInputTokens: 100,
      cacheReadTokens: 200,
      cacheWriteTokens: 30,
      outputTokens: 70
    })).toEqual({
      uncachedInputTokens: 100,
      cacheReadTokens: 200,
      cacheWriteTokens: 30,
      outputTokens: 70,
      totalTokens: 400
    })
  })

  it('全零或缺失返回 undefined，避免渲染 0 tokens 噪声', () => {
    expect(delegationUsage({ uncachedInputTokens: 0, outputTokens: 0 })).toBeUndefined()
    expect(delegationUsage(undefined)).toBeUndefined()
  })

  it('子代理节点带上用量后仍保留原字段', () => {
    const node = toDelegationNode('id-1', {
      origin: 'subagent',
      running: false,
      displayTitle: 'Alpha',
      projectionValues: {
        modelSelection: { model: 'DeepSeek-V4.1-Flash' },
        sessionStats: { steps: 3 },
        tokenUsage: { uncachedInputTokens: 10, cacheReadTokens: 20, outputTokens: 30 }
      }
    }, 0)
    expect(node?.usage?.totalTokens).toBe(60)
    expect(node?.steps).toBe(3)
    expect(node?.status).toBe('done')
  })
})
