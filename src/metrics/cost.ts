import type { CallResult, CostSummary } from '../core/types.ts';

export const emptyCostSummary = (): CostSummary => ({
  amountUsd: 0,
  exactAmountUsd: 0,
  estimatedAmountUsd: 0,
  unknownCalls: 0,
  callCount: 0,
});

export const summarizeCost = (calls: readonly CallResult[]): CostSummary => {
  const summary = emptyCostSummary();

  for (const call of calls) {
    summary.callCount += 1;
    const cost = call.usage.costUsd;
    if (cost === undefined) {
      summary.unknownCalls += 1;
      continue;
    }

    summary.amountUsd += cost;
    if (call.usage.costEstimated) {
      summary.estimatedAmountUsd += cost;
    } else {
      summary.exactAmountUsd += cost;
    }
  }

  return summary;
};

export const mergeCostSummaries = (...summaries: readonly CostSummary[]): CostSummary => {
  return summaries.reduce(
    (total, summary) => ({
      amountUsd: total.amountUsd + summary.amountUsd,
      exactAmountUsd: total.exactAmountUsd + summary.exactAmountUsd,
      estimatedAmountUsd: total.estimatedAmountUsd + summary.estimatedAmountUsd,
      unknownCalls: total.unknownCalls + summary.unknownCalls,
      callCount: total.callCount + summary.callCount,
    }),
    emptyCostSummary(),
  );
};
