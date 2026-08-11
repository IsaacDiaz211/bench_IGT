import type {
  BenchmarkReport,
  BenchmarkRun,
  CallResult,
  CandidateSummary,
  Stage,
} from '../core/types.ts';
import { mergeCostSummaries, summarizeCost } from '../metrics/cost.ts';
import { summarizeStageLatency } from '../metrics/latency.ts';
import { summarizeJudgeScores } from '../metrics/quality.ts';
import { summarizeStageReliability } from '../metrics/reliability.ts';
import { summarizeTokens } from '../metrics/tokens.ts';

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

const buildCandidateSummary = (run: BenchmarkRun, candidateModel: string): CandidateSummary => {
  const candidateRuns = run.candidateRuns.filter(
    (candidateRun) => candidateRun.candidateModel === candidateModel,
  );
  const candidateCalls = callsForCandidate(run, candidateModel);
  const judgeCalls = callsForJudges(run, candidateModel);
  const candidateJudgeRecords = run.judgeRecords.filter(
    (record) => record.candidateModel === candidateModel,
  );
  const reliability = Object.fromEntries(
    stages.map((stage) => [stage, summarizeStageReliability(candidateRuns, candidateCalls, stage)]),
  ) as CandidateSummary['reliability'];
  const latencyMs = Object.fromEntries(
    stages.map((stage) => [stage, summarizeStageLatency(candidateRuns, stage)]),
  ) as CandidateSummary['latencyMs'];
  const tokenUsage = Object.fromEntries(
    stages.map((stage) => [
      stage,
      summarizeTokens(candidateCalls.filter((call) => call.stage === stage)),
    ]),
  ) as CandidateSummary['tokenUsage'];
  const judgeScores = Object.fromEntries(
    stages.map((stage) => [stage, summarizeJudgeScores(candidateJudgeRecords, stage)]),
  ) as CandidateSummary['judgeScores'];
  const candidateCost = summarizeCost(candidateCalls);
  const judgeCost = summarizeCost(judgeCalls);

  return {
    candidateModel,
    runCount: candidateRuns.length,
    candidateCost,
    judgeCost,
    totalCost: mergeCostSummaries(candidateCost, judgeCost),
    reliability,
    latencyMs,
    tokenUsage,
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
    '## Fiabilidad por modelo',
    '',
    '| Modelo | Etapa | Salida válida | Transporte OK | Llamadas fallidas | Timeouts |',
    '| --- | --- | ---: | ---: | ---: | ---: |',
  );
  for (const summary of report.candidateSummaries) {
    for (const stage of stages) {
      const reliability = summary.reliability[stage];
      lines.push(
        `| ${summary.candidateModel} | ${stage} | ${formatPercent(reliability.validRate)} | ${formatPercent(reliability.transportSuccessRate)} | ${reliability.failedCalls} | ${reliability.timeoutCalls} |`,
      );
    }
  }

  lines.push(
    '',
    '## Calidad de jueces',
    '',
    '| Modelo | Etapa | Media | Evaluaciones | Desacuerdo medio | Casos comparados |',
    '| --- | --- | ---: | ---: | ---: | ---: |',
  );
  for (const summary of report.candidateSummaries) {
    for (const stage of stages) {
      const quality = summary.judgeScores[stage];
      lines.push(
        `| ${summary.candidateModel} | ${stage} | ${quality.mean.toFixed(2)} | ${quality.count} | ${quality.disagreementMean.toFixed(2)} | ${quality.disagreementCount} |`,
      );
    }
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
    '## Tokens por etapa',
    '',
    '| Modelo | Etapa | Entrada | Salida | Total | Cache leído | Cache escrito |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
  );
  for (const summary of report.candidateSummaries) {
    for (const stage of stages) {
      const tokens = summary.tokenUsage[stage];
      lines.push(
        `| ${summary.candidateModel} | ${stage} | ${tokens.promptTokens} | ${tokens.completionTokens} | ${tokens.totalTokens} | ${tokens.cachedTokens} | ${tokens.cacheWriteTokens} |`,
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
