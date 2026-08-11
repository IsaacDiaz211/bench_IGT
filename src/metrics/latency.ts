import type { CandidateRun, LatencySummary, Stage } from '../core/types.ts';
import { mean, median, percentile } from '../core/utils.ts';

export const summarizeStageLatency = (
  candidateRuns: readonly CandidateRun[],
  stage: Stage,
): LatencySummary => {
  const values = candidateRuns
    .map((candidateRun) => {
      const calls = candidateRun.calls.filter((call) => call.stage === stage);
      return calls.reduce((maximum, call) => Math.max(maximum, call.latencyMs), 0);
    })
    .filter((value) => value > 0);

  return {
    mean: mean(values),
    median: median(values),
    p95: percentile(values, 95),
  };
};
