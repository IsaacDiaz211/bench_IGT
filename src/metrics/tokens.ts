import type { CallResult, TokenSummary } from '../core/types.ts';

export const summarizeTokens = (calls: readonly CallResult[]): TokenSummary => {
  const summary: TokenSummary = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cachedTokens: 0,
    cacheWriteTokens: 0,
    calls: calls.length,
    callsWithUsage: 0,
  };

  for (const call of calls) {
    const hasUsage =
      call.usage.promptTokens !== undefined ||
      call.usage.completionTokens !== undefined ||
      call.usage.totalTokens !== undefined;
    if (hasUsage) {
      summary.callsWithUsage += 1;
    }
    summary.promptTokens += call.usage.promptTokens ?? 0;
    summary.completionTokens += call.usage.completionTokens ?? 0;
    summary.totalTokens += call.usage.totalTokens ?? 0;
    summary.cachedTokens += call.usage.cachedTokens ?? 0;
    summary.cacheWriteTokens += call.usage.cacheWriteTokens ?? 0;
  }

  return summary;
};
