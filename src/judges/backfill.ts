import { cp } from 'node:fs/promises';
import { join } from 'node:path';
import { getProviderForModel } from '../core/config.ts';
import type { BenchmarkRun } from '../core/types.ts';
import { runWithConcurrency } from '../core/utils.ts';
import { loadDataset } from '../dataset/loader.ts';
import { loadPersistedRun, RunStore } from '../execution/run-store.ts';
import type { FireworksClient } from '../fireworks/client.ts';
import type { OpenRouterClient } from '../openrouter/client.ts';
import { buildReport, renderMarkdownReport } from '../reports/report.ts';
import { PROMPT_VERSION } from '../stages/prompts.ts';
import { judgeCandidateRun } from './run.ts';

export interface AddJudgesOptions {
  judgeModels: readonly string[];
  outputDir?: string;
  concurrency?: number;
}

export interface AddJudgesResult {
  run: BenchmarkRun;
  directory: string;
  reportPath: string;
  reportMarkdown: string;
  addedJudges: string[];
  skippedJudges: string[];
  judgeCallCount: number;
}

const slugify = (model: string): string => {
  return model.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
};

const unique = (models: readonly string[]): string[] => [...new Set(models)];

type JudgeClients =
  | OpenRouterClient
  | FireworksClient
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

const getJudgeClient = (
  clients: JudgeClients,
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
  return clients as OpenRouterClient | FireworksClient;
};

export const addJudgesToRun = async (
  sourceDirectory: string,
  options: AddJudgesOptions,
  client: JudgeClients,
): Promise<AddJudgesResult> => {
  const sourceRun = await loadPersistedRun(sourceDirectory);
  const dataset = await loadDataset(sourceRun.datasetPath);
  if (dataset.length !== sourceRun.datasetCaseCount) {
    throw new Error(
      `El dataset ${sourceRun.datasetPath} tiene ${dataset.length} casos, pero la ejecución registra ${sourceRun.datasetCaseCount}.`,
    );
  }
  const casesById = new Map(dataset.map((benchmarkCase) => [benchmarkCase.id, benchmarkCase]));

  const existingJudges = new Set(sourceRun.judgeModels);
  const addedJudges = unique(options.judgeModels).filter((model) => !existingJudges.has(model));
  const skippedJudges = unique(options.judgeModels).filter((model) => existingJudges.has(model));

  if (!addedJudges.length) {
    throw new Error(
      `Todos los jueces solicitados ya evaluaron esta ejecución: ${skippedJudges.join(', ')}.`,
    );
  }

  const directory =
    options.outputDir ?? `${sourceDirectory}-addjudge-${slugify(addedJudges.join('+'))}`;
  const directoryFile = Bun.file(directory);
  if (await directoryFile.exists()) {
    throw new Error(`El directorio de salida ya existe: ${directory}`);
  }

  await cp(sourceDirectory, directory, { recursive: true });
  const store = await RunStore.resume(directory);
  await store.addJudgeModels(addedJudges);

  const pricingByModel = new Map(sourceRun.pricing.map((item) => [item.model, item]));

  const loadPricingForClients = async (): Promise<void> => {
    if (isClientsObject(client)) {
      const needsOpenrouter = addedJudges.some((m) => getProviderForModel(m) === 'openrouter');
      const needsFireworks = addedJudges.some((m) => getProviderForModel(m) === 'fireworks');

      if (needsOpenrouter) {
        const openrouterPricing = await client.openrouter.loadPricing().catch((error: unknown) => {
          console.warn(
            `No se pudo cargar el catálogo de precios OpenRouter: ${error instanceof Error ? error.message : error}`,
          );
          return [];
        });
        for (const item of openrouterPricing) {
          pricingByModel.set(item.model, item);
        }
        client.openrouter.setPricing([...pricingByModel.values()]);
      }

      if (needsFireworks && client.fireworks) {
        const fireworksPricing = await client.fireworks.loadPricing().catch((error: unknown) => {
          console.warn(
            `No se pudo cargar el catálogo de precios Fireworks: ${error instanceof Error ? error.message : error}`,
          );
          return [];
        });
        for (const item of fireworksPricing) {
          pricingByModel.set(item.model, item);
        }
        client.fireworks.setPricing([...pricingByModel.values()]);
      }

      if (needsOpenrouter && needsFireworks) {
        // Ensure both clients share the merged pricing map
        client.openrouter.setPricing([...pricingByModel.values()]);
        client.fireworks?.setPricing([...pricingByModel.values()]);
      }
    } else {
      const freshPricing = await (client as OpenRouterClient | FireworksClient)
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
      (client as OpenRouterClient | FireworksClient).setPricing([...pricingByModel.values()]);
    }
  };

  await loadPricingForClients();
  await store.setPricing([...pricingByModel.values()]);

  if (sourceRun.promptVersion !== PROMPT_VERSION) {
    console.warn(
      `La versión de prompts actual (${PROMPT_VERSION}) difiere de la de la ejecución (${sourceRun.promptVersion}). Las puntuaciones del nuevo juez pueden no ser directamente comparables.`,
    );
  }

  let judgeCallCount = 0;
  const getClient = (model: string) => getJudgeClient(client, model);
  await runWithConcurrency(
    sourceRun.candidateRuns,
    options.concurrency ?? 1,
    async (candidateRun) => {
      const benchmarkCase = casesById.get(candidateRun.caseId);
      if (!benchmarkCase) {
        throw new Error(`El dataset no contiene el caso ${candidateRun.caseId}.`);
      }
      const records = await judgeCandidateRun(
        getClient,
        benchmarkCase,
        candidateRun,
        addedJudges,
        (record) => store.recordJudgeRecord(record),
      );
      judgeCallCount += records.length;
    },
  );

  const run = await loadPersistedRun(directory);
  const report = buildReport(run);
  const reportMarkdown = renderMarkdownReport(run, report);
  await store.finish(run, report, reportMarkdown);

  return {
    run,
    directory,
    reportPath: join(directory, 'report.json'),
    reportMarkdown,
    addedJudges,
    skippedJudges,
    judgeCallCount,
  };
};
