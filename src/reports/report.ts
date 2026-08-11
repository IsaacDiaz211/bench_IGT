import type {
  BenchmarkReport,
  BenchmarkRun,
  CallResult,
  CandidateSummary,
  Stage,
} from '../core/types.ts';
import { asNumber, mean, median, percentile } from '../core/utils.ts';
import { mergeCostSummaries, summarizeCost } from '../metrics/cost.ts';

const stages: Stage[] = ['translation', 'gloss', 'grammar'];

const callsForCandidate = (run: BenchmarkRun, candidateModel: string): CallResult[] => {
  return run.calls.filter(
    (call) => call.candidateModel === candidateModel && call.actor === 'candidate',
  );
};

const callsForJudges = (run: BenchmarkRun, candidateModel: string): CallResult[] => {
  return run.calls.filter(
    (call) => call.candidateModel === candidateModel && call.actor === 'judge',
  );
};

const stageLatencies = (run: BenchmarkRun, candidateModel: string, stage: Stage): number[] => {
  return run.candidateRuns
    .filter((candidateRun) => candidateRun.candidateModel === candidateModel)
    .map((candidateRun) => {
      const calls = candidateRun.calls.filter((call) => call.stage === stage);
      return calls.reduce((maximum, call) => Math.max(maximum, call.latencyMs), 0);
    });
};

const buildCandidateSummary = (run: BenchmarkRun, candidateModel: string): CandidateSummary => {
  const candidateRuns = run.candidateRuns.filter(
    (candidateRun) => candidateRun.candidateModel === candidateModel,
  );
  const candidateCalls = callsForCandidate(run, candidateModel);
  const judgeCalls = callsForJudges(run, candidateModel);
  const validRate = Object.fromEntries(
    stages.map((stage) => {
      const validCount = candidateRuns.filter(
        (candidateRun) => candidateRun.stages[stage].valid,
      ).length;
      return [stage, candidateRuns.length ? validCount / candidateRuns.length : 0];
    }),
  ) as Record<Stage, number>;
  const latencyMs = Object.fromEntries(
    stages.map((stage) => {
      const values = stageLatencies(run, candidateModel, stage);
      return [stage, { mean: mean(values), median: median(values), p95: percentile(values, 95) }];
    }),
  ) as CandidateSummary['latencyMs'];
  const judgeScores = Object.fromEntries(
    stages.map((stage) => {
      const scores = run.judgeRecords
        .filter(
          (record) =>
            record.candidateModel === candidateModel && record.stage === stage && record.valid,
        )
        .map((record) => {
          const result = record.result;
          if (!result || typeof result !== 'object' || Array.isArray(result)) {
            return undefined;
          }
          const scores = (result as { scores?: unknown }).scores;
          if (!scores || typeof scores !== 'object' || Array.isArray(scores)) {
            return undefined;
          }
          return asNumber((scores as { overall?: unknown }).overall);
        })
        .filter((score): score is number => score !== undefined);
      return [stage, { mean: mean(scores), count: scores.length }];
    }),
  ) as CandidateSummary['judgeScores'];

  const candidateCost = summarizeCost(candidateCalls);
  const judgeCost = summarizeCost(judgeCalls);
  return {
    candidateModel,
    runCount: candidateRuns.length,
    candidateCost,
    judgeCost,
    totalCost: mergeCostSummaries(candidateCost, judgeCost),
    validRate,
    latencyMs,
    judgeScores,
  };
};

export const buildReport = (run: BenchmarkRun): BenchmarkReport => {
  const candidateSummaries = run.candidateModels.map((model) => buildCandidateSummary(run, model));
  const allCandidateCalls = run.calls.filter((call) => call.actor === 'candidate');
  const allJudgeCalls = run.calls.filter((call) => call.actor === 'judge');

  return {
    runId: run.runId,
    generatedAt: new Date().toISOString(),
    grandTotalCost: mergeCostSummaries(
      summarizeCost(allCandidateCalls),
      summarizeCost(allJudgeCalls),
    ),
    judgeTotalCost: summarizeCost(allJudgeCalls),
    candidateSummaries,
  };
};

const formatUsd = (value: number): string => `$${value.toFixed(6)}`;
const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

export const renderMarkdownReport = (run: BenchmarkRun, report: BenchmarkReport): string => {
  const lines = [
    '# Benchmark report',
    '',
    `- Run: \`${run.runId}\``,
    `- Dataset: \`${run.datasetPath}\` (${run.datasetCaseCount} casos)`,
    `- Repeticiones: ${run.repetitions}`,
    `- Jueces: ${run.judgeModels.length ? run.judgeModels.join(', ') : 'ninguno'}`,
    '',
    '## Coste total',
    '',
    `Coste total de la ejecución, incluyendo candidatos y jueces: **${formatUsd(report.grandTotalCost.amountUsd)}**.`,
    '',
    '| Concepto | Coste | Exacto | Estimado | Llamadas sin coste |',
    '| --- | ---: | ---: | ---: | ---: |',
    `| Candidatos + jueces | ${formatUsd(report.grandTotalCost.amountUsd)} | ${formatUsd(report.grandTotalCost.exactAmountUsd)} | ${formatUsd(report.grandTotalCost.estimatedAmountUsd)} | ${report.grandTotalCost.unknownCalls} |`,
    `| Solo jueces | ${formatUsd(report.judgeTotalCost.amountUsd)} | ${formatUsd(report.judgeTotalCost.exactAmountUsd)} | ${formatUsd(report.judgeTotalCost.estimatedAmountUsd)} | ${report.judgeTotalCost.unknownCalls} |`,
    '',
    '## Coste por modelo candidato',
    '',
    '| Modelo | Generación | Jueces | Total | Llamadas sin coste |',
    '| --- | ---: | ---: | ---: | ---: |',
  ];

  for (const summary of report.candidateSummaries) {
    lines.push(
      `| ${summary.candidateModel} | ${formatUsd(summary.candidateCost.amountUsd)} | ${formatUsd(summary.judgeCost.amountUsd)} | **${formatUsd(summary.totalCost.amountUsd)}** | ${summary.totalCost.unknownCalls} |`,
    );
  }

  lines.push(
    '',
    '## Calidad y fiabilidad por modelo',
    '',
    '| Modelo | Traducción válida | Glosa válida | Gramática válida | Traducción juez | Glosa juez | Gramática juez |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  );
  for (const summary of report.candidateSummaries) {
    lines.push(
      `| ${summary.candidateModel} | ${formatPercent(summary.validRate.translation)} | ${formatPercent(summary.validRate.gloss)} | ${formatPercent(summary.validRate.grammar)} | ${summary.judgeScores.translation.mean.toFixed(2)} (${summary.judgeScores.translation.count}) | ${summary.judgeScores.gloss.mean.toFixed(2)} (${summary.judgeScores.gloss.count}) | ${summary.judgeScores.grammar.mean.toFixed(2)} (${summary.judgeScores.grammar.count}) |`,
    );
  }

  lines.push(
    '',
    '## Latencia por etapa',
    '',
    '| Modelo | Etapa | Media | Mediana | P95 |',
    '| --- | --- | ---: | ---: | ---: |',
  );
  for (const summary of report.candidateSummaries) {
    for (const stage of stages) {
      const latency = summary.latencyMs[stage];
      lines.push(
        `| ${summary.candidateModel} | ${stage} | ${latency.mean.toFixed(0)} ms | ${latency.median.toFixed(0)} ms | ${latency.p95.toFixed(0)} ms |`,
      );
    }
  }

  lines.push(
    '',
    '> El coste total incluye una llamada a cada juez por cada salida válida de cada etapa. Las llamadas cuyo coste no pudo resolverse aparecen como desconocidas y no se inventa un valor.',
    '',
  );
  return lines.join('\n');
};
