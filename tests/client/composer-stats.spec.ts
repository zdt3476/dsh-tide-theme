import { describe, expect, it } from 'vitest'
import {
  calculateRealTps,
  calculateCacheRate,
  calculateContextCapacity,
  formatCompactTokens,
  deriveComposerStats,
  extractTokenUsage,
  type SessionStatsProjection,
  type TokenUsageProjection,
  type ContextPressureProjection
} from '../../src/client/composer-stats'

describe('formatCompactTokens', () => {
  it('格式化千与百万', () => {
    expect(formatCompactTokens(0)).toBe('0')
    expect(formatCompactTokens(492)).toBe('492')
    expect(formatCompactTokens(1200)).toBe('1.2k')
    expect(formatCompactTokens(121_055)).toBe('121k')
    expect(formatCompactTokens(500_000)).toBe('500k')
    expect(formatCompactTokens(1_500_000)).toBe('1.5M')
    expect(formatCompactTokens(23_333_115)).toBe('23.3M')
  })
})

describe('calculateRealTps (包含首字延迟)', () => {
  it('计算包含首字延迟的真实 TPS', () => {
    // 假设输出 100 tokens，首字延迟 8000ms，流式解码 2000ms，总耗时 10s
    const stats: SessionStatsProjection = {
      decodeTokens: 100,
      ttftMs: 8000,
      decodeMs: 2000,
      llmMs: 10000
    }
    // 原生算法会算出 100 / 2 = 50 t/s（虚高）
    // 包含首字延迟的真实算法为 100 / (8 + 2) = 10 t/s
    expect(calculateRealTps(stats)).toBe(10)
  })

  it('使用真实会话真实数据计算（非 0，不虚高）', () => {
    const stats: SessionStatsProjection = {
      decodeTokens: 116532,
      ttftMs: 3704044,
      decodeMs: 570592,
      llmMs: 4291888
    }
    // 116532 / (4291888 / 1000) = 27.15... -> 27.2 t/s
    expect(calculateRealTps(stats)).toBe(27.2)
  })

  it('异常与边界条件返回 null', () => {
    expect(calculateRealTps(undefined)).toBeNull()
    expect(calculateRealTps({ decodeTokens: 0, llmMs: 1000 })).toBeNull()
    expect(calculateRealTps({ decodeTokens: 100, llmMs: 0, decodeMs: 0, ttftMs: 0 })).toBeNull()
  })
})

describe('calculateCacheRate', () => {
  it('按输入与缓存读取计算命中率', () => {
    expect(calculateCacheRate(200, 800)).toBe(80)
    expect(calculateCacheRate(0, 1000)).toBe(100)
    expect(calculateCacheRate(1000, 0)).toBe(0)
  })

  it('无输入或无效数据时返回 null', () => {
    expect(calculateCacheRate(0, 0)).toBeNull()
    expect(calculateCacheRate(undefined, undefined)).toBeNull()
  })
})

describe('extractTokenUsage (兼容平铺与嵌套投影)', () => {
  it('解析 DSH 宿主 useProjection("tokenUsage") 返回的平铺结构', () => {
    // 真实宿主返回的是扁平对象
    const flatUsage = {
      uncachedInputTokens: 15425147,
      cacheReadTokens: 559962931,
      cacheWriteTokens: 1482880,
      outputTokens: 917801
    }
    const res = extractTokenUsage(flatUsage)
    expect(res).toEqual({
      uncachedInputTokens: 15425147,
      cacheReadTokens: 559962931,
      cacheWriteTokens: 1482880,
      outputTokens: 917801,
      totalTokens: 15425147 + 559962931 + 1482880 + 917801,
      cacheRate: 97
    })
  })

  it('解析磁盘持久化带 totals 的嵌套结构', () => {
    const nestedUsage = {
      totals: {
        uncachedInputTokens: 2000,
        cacheReadTokens: 8000,
        cacheWriteTokens: 500,
        outputTokens: 1000
      }
    }
    const res = extractTokenUsage(nestedUsage)
    expect(res).toEqual({
      uncachedInputTokens: 2000,
      cacheReadTokens: 8000,
      cacheWriteTokens: 500,
      outputTokens: 1000,
      totalTokens: 11500,
      cacheRate: 80
    })
  })
})

describe('calculateContextCapacity', () => {
  it('计算已用、上限与占用百分比和状态等级', () => {
    const pressure: ContextPressureProjection = {
      pressureTokens: 121055,
      contextWindow: 500000
    }
    const cap = calculateContextCapacity(pressure)
    expect(cap).toEqual({
      usedTokens: 121055,
      contextWindow: 500000,
      remainingTokens: 378945,
      usedPercent: 24,
      level: 'comfortable',
      bucket: 'good',
      breakdown: undefined
    })
  })

  it('上下文压缩后优先采用 projectedTokens，立即刷新反映压缩后的容量', () => {
    // 压缩前：LLM 请求采样的 pressureTokens 为 121,055
    // 压缩后：表面积削减，projectedTokens 立即降为 25,000
    const pressure: ContextPressureProjection = {
      pressureTokens: 121055,
      projectedTokens: 25000,
      contextWindow: 500000
    }
    const cap = calculateContextCapacity(pressure)
    expect(cap).toEqual({
      usedTokens: 25000,
      contextWindow: 500000,
      remainingTokens: 475000,
      usedPercent: 5,
      level: 'comfortable',
      bucket: 'good',
      breakdown: undefined
    })
  })

  it('支持传入 contextBreakdown 提供构成明细', () => {
    const pressure: ContextPressureProjection = {
      projectedTokens: 30000,
      contextWindow: 100000
    }
    const breakdown = {
      systemTokens: 8000,
      toolsTokens: 12000,
      messageTokens: 10000
    }
    const cap = calculateContextCapacity(pressure, undefined, breakdown)
    expect(cap?.breakdown).toEqual({
      systemTokens: 8000,
      toolsTokens: 12000,
      messageTokens: 10000,
      totalTokens: 30000
    })
  })

  it('超过 50% 提醒，超过 75% 警戒', () => {
    expect(calculateContextCapacity({ pressureTokens: 300000, contextWindow: 500000 })?.bucket).toBe('warn')
    expect(calculateContextCapacity({ pressureTokens: 400000, contextWindow: 500000 })?.bucket).toBe('bad')
  })

  describe('契约防御：当前上下文来源可信度与边界值 (Task-4)', () => {
    it('宁可缺测：缺失可靠当前上下文来源时，不可由历史累计 tokenUsage 冒充', () => {
      // 只有 contextWindow，但没有当前上下文 (projectedTokens/pressureTokens/breakdown)
      const pressureWithoutCurrentTokens: ContextPressureProjection = {
        contextWindow: 200000
      }
      // 历史累计可能有数十万 token
      const cumulativeUsage: TokenUsageProjection = {
        totals: {
          uncachedInputTokens: 50000,
          cacheReadTokens: 100000,
          cacheWriteTokens: 10000,
          outputTokens: 40000
        }
      }

      // calculateContextCapacity 必须返回 null，绝不能返回 200000/200000 导致虚假 100% 满
      const cap = calculateContextCapacity(pressureWithoutCurrentTokens, cumulativeUsage)
      expect(cap).toBeNull()
    })

    it('有效性支持：projectedTokens=0 有效，应能正常显示 0% 占用而非当成无数据', () => {
      const pressureZero: ContextPressureProjection = {
        projectedTokens: 0,
        contextWindow: 200000
      }
      const cap = calculateContextCapacity(pressureZero)
      expect(cap).not.toBeNull()
      expect(cap).toEqual({
        usedTokens: 0,
        contextWindow: 200000,
        remainingTokens: 200000,
        usedPercent: 0,
        level: 'comfortable',
        bucket: 'good',
        breakdown: undefined
      })
    })

    it('invalid NaN 与负值不可产生百分比，必须防御并返回 null', () => {
      const validWindow = 200000
      // 负值
      expect(calculateContextCapacity({ projectedTokens: -1, contextWindow: validWindow })).toBeNull()
      expect(calculateContextCapacity({ pressureTokens: -100, contextWindow: validWindow })).toBeNull()
      // NaN 与非法数值
      expect(calculateContextCapacity({ projectedTokens: Number.NaN, contextWindow: validWindow })).toBeNull()
      expect(calculateContextCapacity({ pressureTokens: Number.NaN, contextWindow: validWindow })).toBeNull()
      expect(calculateContextCapacity({ projectedTokens: Number.POSITIVE_INFINITY, contextWindow: validWindow })).toBeNull()
      // 非法 contextWindow
      expect(calculateContextCapacity({ projectedTokens: 1000, contextWindow: 0 })).toBeNull()
      expect(calculateContextCapacity({ projectedTokens: 1000, contextWindow: -200000 })).toBeNull()
      expect(calculateContextCapacity({ projectedTokens: 1000, contextWindow: Number.NaN })).toBeNull()
      // breakdown 中的负值或 NaN 防御
      expect(calculateContextCapacity(
        { contextWindow: validWindow },
        undefined,
        { systemTokens: -10, toolsTokens: 100, messageTokens: 200 }
      )).toBeNull()
      expect(calculateContextCapacity(
        { contextWindow: validWindow },
        undefined,
        { systemTokens: Number.NaN, toolsTokens: 100, messageTokens: 200 }
      )).toBeNull()
    })

    it('仅在可靠 breakdown 存在时作为当前上下文来源', () => {
      const cap = calculateContextCapacity(
        { contextWindow: 100000 },
        undefined,
        { systemTokens: 500, toolsTokens: 1500, messageTokens: 3000 }
      )
      expect(cap).not.toBeNull()
      expect(cap?.usedTokens).toBe(5000)
      expect(cap?.usedPercent).toBe(5)
    })
  })
})

describe('deriveComposerStats', () => {
  it('汇总底部栏平铺所需数据', () => {
    const stats: SessionStatsProjection = {
      turns: 3,
      steps: 8,
      decodeTokens: 1000,
      llmMs: 20000,
      ttftMs: 15000,
      decodeMs: 5000,
      toolMs: 3000
    }
    const usage: TokenUsageProjection = {
      totals: {
        uncachedInputTokens: 2000,
        cacheReadTokens: 8000,
        cacheWriteTokens: 500,
        outputTokens: 1000
      }
    }
    const pressure: ContextPressureProjection = {
      pressureTokens: 50000,
      contextWindow: 200000
    }

    const res = deriveComposerStats(stats, usage, pressure, 4200)
    expect(res).toMatchObject({
      activity: {
        turns: 3,
        steps: 8,
        label: '3 轮 8 步'
      },
      context: {
        label: '50k / 200k (25%)',
        level: 'comfortable'
      },
      tps: {
        value: 50,
        label: '50 t/s'
      },
      cache: {
        percent: 80,
        label: '缓存 80%',
        bucket: 'good'
      },
      duration: {
        ms: 4200,
        label: '4.2 秒'
      },
      tokensDetail: {
        uncachedInputTokens: 2000,
        cacheReadTokens: 8000,
        cacheWriteTokens: 500,
        outputTokens: 1000,
        totalTokens: 11500
      },
      timingDetail: {
        llmMs: 20000,
        toolMs: 3000,
        totalMs: 23000,
        ttftMs: 15000,
        decodeMs: 5000
      }
    })
  })

  it('deriveComposerStats 在 projectedTokens=0 时能正常生成 contextView', () => {
    const pressure: ContextPressureProjection = {
      projectedTokens: 0,
      contextWindow: 200000
    }
    const res = deriveComposerStats(undefined, undefined, pressure)
    expect(res.context).not.toBeNull()
    expect(res.context?.usedTokens).toBe(0)
    expect(res.context?.usedPercent).toBe(0)
    expect(res.context?.label).toBe('0 / 200k (0%)')
  })

  it('deriveComposerStats 在仅有累计 tokenUsage 时宁可 context 为 null，绝不冒充当前上下文', () => {
    const usage: TokenUsageProjection = {
      totals: {
        uncachedInputTokens: 50000,
        cacheReadTokens: 100000,
        cacheWriteTokens: 10000,
        outputTokens: 40000
      }
    }
    const pressureWithoutCurrentTokens: ContextPressureProjection = {
      contextWindow: 200000
    }
    const res = deriveComposerStats(undefined, usage, pressureWithoutCurrentTokens)
    // context 不得被历史累计占用冒充
    expect(res.context).toBeNull()
    // 但累计 tokens 详情和缓存数据正常提取
    expect(res.tokensDetail?.totalTokens).toBe(200000)
    expect(res.cache?.percent).toBe(67)
  })
})
