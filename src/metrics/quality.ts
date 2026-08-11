import type { JudgeRecord, JudgeScoreSummary, Stage } from '../core/types.ts';
import { asNumber, isRecord, mean } from '../core/utils.ts';

const readOverallScore = (record: JudgeRecord): number | undefined => {
  if (!isRecord(record.result) || !isRecord(record.result.scores)) {
    return undefined;
  }
  return asNumber(record.result.scores.overall);
};

export const summarizeJudgeScores = (
  records: readonly JudgeRecord[],
  stage: Stage,
): JudgeScoreSummary => {
  const validRecords = records.filter((record) => record.stage === stage && record.valid);
  const scores = validRecords
    .map(readOverallScore)
    .filter((score): score is number => score !== undefined);
  const scoresByJudge = new Map<string, number[]>();
  const scoresByCandidateRun = new Map<string, number[]>();

  for (const record of validRecords) {
    const score = readOverallScore(record);
    if (score === undefined) {
      continue;
    }
    const judge = record.judgeCall.judgeModel ?? record.judgeCall.model;
    scoresByJudge.set(judge, [...(scoresByJudge.get(judge) ?? []), score]);
    scoresByCandidateRun.set(record.candidateRunId, [
      ...(scoresByCandidateRun.get(record.candidateRunId) ?? []),
      score,
    ]);
  }

  const disagreements = [...scoresByCandidateRun.values()]
    .filter((runScores) => runScores.length > 1)
    .map((runScores) => Math.max(...runScores) - Math.min(...runScores));
  const byJudge: Record<string, { mean: number; count: number }> = {};
  for (const [judge, judgeScores] of scoresByJudge) {
    byJudge[judge] = { mean: mean(judgeScores), count: judgeScores.length };
  }

  return {
    mean: mean(scores),
    count: scores.length,
    disagreementMean: mean(disagreements),
    disagreementCount: disagreements.length,
    byJudge,
  };
};
