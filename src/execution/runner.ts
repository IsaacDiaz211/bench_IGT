import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AppConfig } from '../core/config.ts';
import type {
  BenchmarkCase,
  BenchmarkRun,
  CallResult,
  CandidateRun,
  JudgeRecord,
} from '../core/types.ts';
import { shuffle } from '../core/utils.ts';
import { loadDataset } from '../dataset/loader.ts';
import { judgeCandidateRun } from '../judges/run.ts';
import type { OpenRouterClient } from '../openrouter/client.ts';
import { buildReport, renderMarkdownReport } from '../reports/report.ts';
import { runCandidateCase } from '../stages/candidate.ts';

interface Job {
  benchmarkCase: BenchmarkCase;
  candidateModel: string;
  repetition: number;
}

const runWithConcurrency = async <T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> => {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item !== undefined) {
        await worker(item);
      }
    }
  });
  await Promise.all(workers);
};

const toJsonLine = (value: unknown): string => `${JSON.stringify(value)}\n`;

const writeJsonLines = async (path: string, values: readonly unknown[]): Promise<void> => {
  await Bun.write(path, values.map(toJsonLine).join(''));
};

const callMetadata = (call: CallResult): Record<string, unknown> => ({
  callId: call.callId,
  actor: call.actor,
  model: call.model,
  candidateModel: call.candidateModel,
  judgeModel: call.judgeModel,
  caseId: call.caseId,
  stage: call.stage,
  batchIndex: call.batchIndex,
  startedAt: call.startedAt,
  endedAt: call.endedAt,
  latencyMs: call.latencyMs,
  statsLookupMs: call.statsLookupMs,
});

const writeArtifacts = async (config: AppConfig, run: BenchmarkRun): Promise<string> => {
  const runDirectory = join(config.outputDir, run.runId);
  await mkdir(runDirectory, { recursive: true });
  const report = buildReport(run);
  const manifest = {
    schemaVersion: run.schemaVersion,
    runId: run.runId,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    datasetPath: run.datasetPath,
    datasetCaseCount: run.datasetCaseCount,
    candidateModels: run.candidateModels,
    judgeModels: run.judgeModels,
    repetitions: run.repetitions,
    seed: run.seed,
    promptVersion: run.promptVersion,
    pricing: run.pricing,
  };

  await Bun.write(join(runDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await Bun.write(join(runDirectory, 'run.json'), JSON.stringify(run, null, 2));
  await Bun.write(join(runDirectory, 'report.json'), JSON.stringify(report, null, 2));
  await Bun.write(join(runDirectory, 'report.md'), renderMarkdownReport(run, report));
  await writeJsonLines(
    join(runDirectory, 'requests.jsonl'),
    run.calls.map((call) => ({ ...callMetadata(call), body: call.requestBody })),
  );
  await writeJsonLines(
    join(runDirectory, 'responses.jsonl'),
    run.calls.map((call) => ({
      ...callMetadata(call),
      ok: call.ok,
      status: call.status,
      body: call.responseBody,
      messageContent: call.messageContent,
      error: call.error,
    })),
  );
  await writeJsonLines(join(runDirectory, 'validations.jsonl'), [
    ...run.candidateRuns.flatMap((candidateRun) =>
      Object.values(candidateRun.stages).map((stage) => ({
        candidateRunId: candidateRun.runId,
        candidateModel: candidateRun.candidateModel,
        caseId: candidateRun.caseId,
        repetition: candidateRun.repetition,
        stage: stage.stage,
        valid: stage.valid,
        validation: stage.validation,
      })),
    ),
    ...run.judgeRecords.map((record) => ({
      candidateRunId: record.candidateRunId,
      candidateModel: record.candidateModel,
      caseId: record.caseId,
      repetition: record.repetition,
      stage: record.stage,
      actor: 'judge',
      valid: record.valid,
      validation: record.validation,
    })),
  ]);
  await writeJsonLines(
    join(runDirectory, 'usage.jsonl'),
    run.calls.map((call) => ({
      ...callMetadata(call),
      usage: call.usage,
      generation: call.generation,
    })),
  );
  await writeJsonLines(join(runDirectory, 'judgements.jsonl'), run.judgeRecords);

  return runDirectory;
};

export interface RunExecutionResult {
  run: BenchmarkRun;
  reportPath: string;
  reportMarkdown: string;
}

export const runBenchmark = async (
  config: AppConfig,
  client: OpenRouterClient,
): Promise<RunExecutionResult> => {
  const benchmarkCases = await loadDataset(config.datasetPath);
  const pricing = await client.loadPricing().catch((error) => {
    console.warn(
      `No se pudo cargar el catálogo de precios: ${error instanceof Error ? error.message : error}`,
    );
    return [];
  });
  const jobs: Job[] = [];

  for (const candidateModel of config.models) {
    for (const benchmarkCase of benchmarkCases) {
      for (let repetition = 1; repetition <= config.repetitions; repetition += 1) {
        jobs.push({ benchmarkCase, candidateModel, repetition });
      }
    }
  }

  const candidateRuns: CandidateRun[] = [];
  const judgeRecords: JudgeRecord[] = [];
  await runWithConcurrency(shuffle(jobs, config.seed), config.concurrency, async (job) => {
    const candidateRun = await runCandidateCase(
      client,
      job.benchmarkCase,
      job.candidateModel,
      job.repetition,
    );
    const records = config.judges.length
      ? await judgeCandidateRun(client, job.benchmarkCase, candidateRun, config.judges)
      : [];
    candidateRuns.push(candidateRun);
    judgeRecords.push(...records);
  });

  const calls = [
    ...candidateRuns.flatMap((candidateRun) => candidateRun.calls),
    ...judgeRecords.map((record) => record.judgeCall),
  ];
  const runId = `${new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14)}-${crypto.randomUUID().slice(0, 8)}`;
  const run: BenchmarkRun = {
    schemaVersion: '1.0',
    runId,
    startedAt: calls[0]?.startedAt ?? new Date().toISOString(),
    endedAt: new Date().toISOString(),
    datasetPath: config.datasetPath,
    datasetCaseCount: benchmarkCases.length,
    candidateModels: config.models,
    judgeModels: config.judges,
    repetitions: config.repetitions,
    seed: config.seed,
    promptVersion: 'app-compatible-v1',
    candidateRuns,
    judgeRecords,
    calls,
    pricing,
  };

  const runDirectory = await writeArtifacts(config, run);
  const reportMarkdown = await Bun.file(join(runDirectory, 'report.md')).text();
  return {
    run,
    reportPath: join(runDirectory, 'report.json'),
    reportMarkdown,
  };
};

export const readRun = async (path: string): Promise<BenchmarkRun> => {
  const filePath = path.endsWith('.json') ? path : join(path, 'run.json');
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new Error(`No existe la ejecución: ${filePath}`);
  }
  return JSON.parse(await file.text()) as BenchmarkRun;
};

export const writeReportForRun = async (path: string): Promise<string> => {
  const run = await readRun(path);
  const report = buildReport(run);
  const directory = path.endsWith('.json') ? join(path, '..') : path;
  await Bun.write(join(directory, 'report.json'), JSON.stringify(report, null, 2));
  const reportMarkdown = renderMarkdownReport(run, report);
  await Bun.write(join(directory, 'report.md'), reportMarkdown);
  return reportMarkdown;
};
