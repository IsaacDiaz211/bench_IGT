import { cp } from 'node:fs/promises';
import { join } from 'node:path';
import { getProviderForModel } from '../core/config.ts';
import type { BenchmarkCase, BenchmarkRun } from '../core/types.ts';
import { runWithConcurrency } from '../core/utils.ts';
import { loadDataset } from '../dataset/loader.ts';
import { loadPersistedRun, RunStore } from '../execution/run-store.ts';
import type { FireworksClient } from '../fireworks/client.ts';
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

type CandidateJudgeClients =
  | OpenRouterClient
  | { openrouter: OpenRouterClient; fireworks?: FireworksClient };

const isClientsObject = (
  value: unknown,
): value is { openrouter: OpenRouterClient; fireworks?: FireworksClient } => {
  return (
    !!value &&
    typeof value === 'object' &&
    'openrouter' in (value as Record<string, unknown>) &&
    (value as { openrouter: unknown }).openrouter !== undefined
  );
};

const getJudgeClientForBackfill = (
  clients: CandidateJudgeClients,
  model: string,
): OpenRouterClient | FireworksClient => {
  const provider = getProviderForModel(model);
  if (isClientsObject(clients)) {
    if (provider === 'fireworks') {
      if (!clients.fireworks) {
        throw new Error(`Falta FIREWORKS_API_KEY para el juez ${model}.`);
      }
      return clients.fireworks;
    }
    return clients.openrouter;
  }
  if (provider === 'fireworks') {
    throw new Error(
      `Falta FIREWORKS_API_KEY para el juez ${model}. Configura FIREWORKS_API_KEY o usa un cliente Fireworks.`,
    );
  }
  return clients as OpenRouterClient;
};

const resolveCandidateClient = (clients: CandidateJudgeClients): OpenRouterClient => {
  if (isClientsObject(clients)) {
    return clients.openrouter;
  }
  return clients as OpenRouterClient;
};

export const addCandidatesToRun = async (
  sourceDirectory: string,
  options: AddCandidatesOptions,
  client: CandidateJudgeClients,
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
  const candidateClient = resolveCandidateClient(client);
  const loadPricing = async (): Promise<void> => {
    if (isClientsObject(client)) {
      const needsOpenrouter =
        sourceRun.judgeModels.some((m) => getProviderForModel(m) === 'openrouter') || true;
      const needsFireworks = sourceRun.judgeModels.some(
        (m) => getProviderForModel(m) === 'fireworks',
      );

      if (needsOpenrouter) {
        const pricing = await client.openrouter.loadPricing().catch((error: unknown) => {
          console.warn(
            `No se pudo cargar el catálogo de precios OpenRouter: ${error instanceof Error ? error.message : error}`,
          );
          return [];
        });
        for (const item of pricing) {
          pricingByModel.set(item.model, item);
        }
        client.openrouter.setPricing([...pricingByModel.values()]);
      }
      if (needsFireworks && client.fireworks) {
        const pricing = await client.fireworks.loadPricing().catch((error: unknown) => {
          console.warn(
            `No se pudo cargar el catálogo de precios Fireworks: ${error instanceof Error ? error.message : error}`,
          );
          return [];
        });
        for (const item of pricing) {
          pricingByModel.set(item.model, item);
        }
        client.fireworks.setPricing([...pricingByModel.values()]);
      }
      if (needsFireworks) {
        client.openrouter.setPricing([...pricingByModel.values()]);
        client.fireworks?.setPricing([...pricingByModel.values()]);
      }
    } else {
      const freshPricing = await (client as OpenRouterClient)
        .loadPricing()
        .catch((error: unknown) => {
          console.warn(
            `No se pudo cargar el catálogo de precios: ${error instanceof Error ? error.message : error}`,
          );
          return [];
        });
      for (const item of freshPricing) {
        pricingByModel.set(item.model, item);
      }
      (client as OpenRouterClient).setPricing([...pricingByModel.values()]);
    }
  };
  await loadPricing();
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

    const getJudgeClient = (model: string) => getJudgeClientForBackfill(client, model);
    await runWithConcurrency(jobs, options.concurrency ?? 1, async (job) => {
      const candidateRun = await runCandidateCase(
        candidateClient,
        job.benchmarkCase,
        job.candidateModel,
        job.repetition,
      );
      await store.recordCandidateRun(candidateRun);
      candidateRunCount += 1;

      const records = await judgeCandidateRun(
        getJudgeClient,
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
