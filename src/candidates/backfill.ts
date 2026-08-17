import { cp } from 'node:fs/promises';
import { join } from 'node:path';
import type { BenchmarkCase, BenchmarkRun } from '../core/types.ts';
import { runWithConcurrency } from '../core/utils.ts';
import { loadDataset } from '../dataset/loader.ts';
import { loadPersistedRun, RunStore } from '../execution/run-store.ts';
import { judgeCandidateRun } from '../judges/run.ts';
import type { OpenRouterClient } from '../openrouter/client.ts';
import { buildReport, renderMarkdownReport } from '../reports/report.ts';
import { runCandidateCase } from '../stages/candidate.ts';
import { PROMPT_VERSION } from '../stages/prompts.ts';

export interface AddCandidatesOptions {
  candidateModels: readonly string[];
  outputDir?: string;
  concurrency?: number;
}

export interface AddCandidatesResult {
  run: BenchmarkRun;
  directory: string;
  reportPath: string;
  reportMarkdown: string;
  addedCandidates: string[];
  skippedCandidates: string[];
  candidateRunCount: number;
  judgeCallCount: number;
}

const slugify = (model: string): string => {
  return model.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
};

const unique = (models: readonly string[]): string[] => [...new Set(models)];

interface CandidateJob {
  benchmarkCase: BenchmarkCase;
  candidateModel: string;
  repetition: number;
}

const buildJobs = (
  candidateModels: readonly string[],
  benchmarkCases: readonly BenchmarkCase[],
  repetitions: number,
): CandidateJob[] => {
  const jobs: CandidateJob[] = [];
  for (const candidateModel of candidateModels) {
    for (const benchmarkCase of benchmarkCases) {
      for (let repetition = 1; repetition <= repetitions; repetition += 1) {
        jobs.push({ benchmarkCase, candidateModel, repetition });
      }
    }
  }
  return jobs;
};

export const addCandidatesToRun = async (
  sourceDirectory: string,
  options: AddCandidatesOptions,
  client: OpenRouterClient,
): Promise<AddCandidatesResult> => {
  const sourceRun = await loadPersistedRun(sourceDirectory);
  const dataset = await loadDataset(sourceRun.datasetPath);
  if (dataset.length !== sourceRun.datasetCaseCount) {
    throw new Error(
      `El dataset ${sourceRun.datasetPath} tiene ${dataset.length} casos, pero la ejecución registra ${sourceRun.datasetCaseCount}.`,
    );
  }

  const existingCandidates = new Set(sourceRun.candidateModels);
  const addedCandidates = unique(options.candidateModels).filter(
    (model) => !existingCandidates.has(model),
  );
  const skippedCandidates = unique(options.candidateModels).filter((model) =>
    existingCandidates.has(model),
  );

  if (!addedCandidates.length) {
    throw new Error(
      `Todos los modelos solicitados ya participaron en esta ejecución: ${skippedCandidates.join(', ')}.`,
    );
  }

  const directory =
    options.outputDir ?? `${sourceDirectory}-addcandidate-${slugify(addedCandidates.join('+'))}`;
  const directoryFile = Bun.file(directory);
  if (await directoryFile.exists()) {
    throw new Error(`El directorio de salida ya existe: ${directory}`);
  }

  await cp(sourceDirectory, directory, { recursive: true });
  const store = await RunStore.resume(directory);
  await store.addCandidateModels(
    addedCandidates,
    addedCandidates.length * dataset.length * sourceRun.repetitions,
  );

  const pricingByModel = new Map(sourceRun.pricing.map((item) => [item.model, item]));
  const freshPricing = await client.loadPricing().catch((error: unknown) => {
    console.warn(
      `No se pudo cargar el catálogo de precios: ${error instanceof Error ? error.message : error}`,
    );
    return [];
  });
  for (const item of freshPricing) {
    pricingByModel.set(item.model, item);
  }
  client.setPricing([...pricingByModel.values()]);
  await store.setPricing([...pricingByModel.values()]);

  if (sourceRun.promptVersion !== PROMPT_VERSION) {
    console.warn(
      `La versión de prompts actual (${PROMPT_VERSION}) difiere de la de la ejecución (${sourceRun.promptVersion}). Las puntuaciones del nuevo candidato pueden no ser directamente comparables.`,
    );
  }

  let candidateRunCount = 0;
  let judgeCallCount = 0;
  try {
    const jobs = buildJobs(addedCandidates, dataset, sourceRun.repetitions).filter(
      (job) => !store.isCompleted(job.candidateModel, job.benchmarkCase.id, job.repetition),
    );

    await runWithConcurrency(jobs, options.concurrency ?? 1, async (job) => {
      const candidateRun = await runCandidateCase(
        client,
        job.benchmarkCase,
        job.candidateModel,
        job.repetition,
      );
      await store.recordCandidateRun(candidateRun);
      candidateRunCount += 1;

      const records = await judgeCandidateRun(
        client,
        job.benchmarkCase,
        candidateRun,
        sourceRun.judgeModels,
        (record) => store.recordJudgeRecord(record),
      );
      judgeCallCount += records.length;
      await store.completeJob(job.candidateModel, job.benchmarkCase.id, job.repetition);
      console.log(
        `[${store.completedJobCount}/${store.totalJobs}] ${job.candidateModel} ${job.benchmarkCase.id} r${job.repetition}`,
      );
    });

    const run = await loadPersistedRun(directory);
    const report = buildReport(run);
    const reportMarkdown = renderMarkdownReport(run, report);
    await store.finish(run, report, reportMarkdown);

    return {
      run,
      directory,
      reportPath: join(directory, 'report.json'),
      reportMarkdown,
      addedCandidates,
      skippedCandidates,
      candidateRunCount,
      judgeCallCount,
    };
  } catch (error) {
    await store.fail(error);
    throw error;
  }
};
