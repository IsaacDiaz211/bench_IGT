import { join } from 'node:path';
import type { AppConfig } from '../core/config.ts';
import type { BenchmarkCase, BenchmarkRun } from '../core/types.ts';
import { runWithConcurrency, shuffle } from '../core/utils.ts';
import { loadDataset } from '../dataset/loader.ts';
import { judgeCandidateRun } from '../judges/run.ts';
import type { OpenRouterClient } from '../openrouter/client.ts';
import { buildReport, renderMarkdownReport } from '../reports/report.ts';
import { runCandidateCase } from '../stages/candidate.ts';
import { PROMPT_VERSION } from '../stages/prompts.ts';
import { jobKey, loadPersistedRun, RunStore } from './run-store.ts';

interface Job {
  benchmarkCase: BenchmarkCase;
  candidateModel: string;
  repetition: number;
}

const createRunId = (): string => {
  return `${new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14)}-${crypto.randomUUID().slice(0, 8)}`;
};

const buildJobs = (config: AppConfig, benchmarkCases: readonly BenchmarkCase[]): Job[] => {
  const jobs: Job[] = [];
  for (const candidateModel of config.models) {
    for (const benchmarkCase of benchmarkCases) {
      for (let repetition = 1; repetition <= config.repetitions; repetition += 1) {
        jobs.push({ benchmarkCase, candidateModel, repetition });
      }
    }
  }
  return jobs;
};

const loadPricing = async (
  client: OpenRouterClient,
): Promise<Awaited<ReturnType<OpenRouterClient['loadPricing']>>> => {
  return client.loadPricing().catch((error) => {
    console.warn(
      `No se pudo cargar el catálogo de precios: ${error instanceof Error ? error.message : error}`,
    );
    return [];
  });
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
  const jobs = buildJobs(config, benchmarkCases);
  const store = config.resumeDir
    ? await RunStore.resume(config.resumeDir)
    : await RunStore.start(
        config,
        createRunId(),
        benchmarkCases.length,
        jobs.length,
        PROMPT_VERSION,
      );

  try {
    const pricing = await loadPricing(client);
    await store.setPricing(pricing);

    const pendingJobs = shuffle(jobs, config.seed).filter(
      (job) => !store.isCompleted(job.candidateModel, job.benchmarkCase.id, job.repetition),
    );
    console.log(
      `Benchmark ${store.runId}: ${pendingJobs.length} jobs pendientes de ${store.totalJobs}. Resultados: ${store.directory}`,
    );

    await runWithConcurrency(pendingJobs, config.concurrency, async (job) => {
      const candidateRun = await runCandidateCase(
        client,
        job.benchmarkCase,
        job.candidateModel,
        job.repetition,
      );
      await store.recordCandidateRun(candidateRun);

      await judgeCandidateRun(client, job.benchmarkCase, candidateRun, config.judges, (record) =>
        store.recordJudgeRecord(record),
      );
      await store.completeJob(job.candidateModel, job.benchmarkCase.id, job.repetition);
      console.log(
        `[${store.completedJobCount}/${store.totalJobs}] ${job.candidateModel} ${job.benchmarkCase.id} r${job.repetition}`,
      );
    });

    const run = await loadPersistedRun(store.directory);
    const report = buildReport(run);
    const reportMarkdown = renderMarkdownReport(run, report);
    await store.finish(run, report, reportMarkdown);
    return {
      run,
      reportPath: join(store.directory, 'report.json'),
      reportMarkdown,
    };
  } catch (error) {
    await store.fail(error);
    throw error;
  }
};

export const readRun = async (path: string): Promise<BenchmarkRun> => {
  const directory = path.endsWith('.json') ? join(path, '..') : path;
  const runPath = join(directory, 'run.json');
  const runFile = Bun.file(runPath);
  if (await runFile.exists()) {
    return JSON.parse(await runFile.text()) as BenchmarkRun;
  }

  const manifestFile = Bun.file(join(directory, 'manifest.json'));
  if (!(await manifestFile.exists())) {
    throw new Error(`No existe una ejecución en: ${directory}`);
  }
  return loadPersistedRun(directory);
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

export { jobKey };
