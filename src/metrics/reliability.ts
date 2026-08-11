import type { CallResult, CandidateRun, ReliabilitySummary, Stage } from '../core/types.ts';

const isTimeout = (call: CallResult): boolean => {
  return (call.error ?? '').toLowerCase().includes('timeout');
};

export const summarizeStageReliability = (
  candidateRuns: readonly CandidateRun[],
  candidateCalls: readonly CallResult[],
  stage: Stage,
): ReliabilitySummary => {
  const stageCalls = candidateCalls.filter((call) => call.stage === stage);
  const httpErrors: Record<string, number> = {};
  for (const call of stageCalls) {
    if (!call.ok) {
      const key = call.status === undefined ? 'network' : String(call.status);
      httpErrors[key] = (httpErrors[key] ?? 0) + 1;
    }
  }

  const validCount = candidateRuns.filter(
    (candidateRun) => candidateRun.stages[stage].valid,
  ).length;
  return {
    validRate: candidateRuns.length ? validCount / candidateRuns.length : 0,
    transportSuccessRate: stageCalls.length
      ? stageCalls.filter((call) => call.ok).length / stageCalls.length
      : 0,
    failedCalls: stageCalls.filter((call) => !call.ok).length,
    timeoutCalls: stageCalls.filter(isTimeout).length,
    httpErrors,
  };
};
