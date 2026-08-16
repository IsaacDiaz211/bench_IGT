import { cp } from 'node:fs/promises';
import { join } from 'node:path';
import type { BenchmarkRun } from '../core/types.ts';
import { runWithConcurrency } from '../core/utils.ts';
import { loadDataset } from '../dataset/loader.ts';
import { loadPersistedRun, RunStore } from '../execution/run-store.ts';
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

export const addJudgesToRun = async (
  sourceDirectory: string,
  options: AddJudgesOptions,
  client: OpenRouterClient,
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
      `La versión de prompts actual (${PROMPT_VERSION}) difiere de la de la ejecución (${sourceRun.promptVersion}). Las puntuaciones del nuevo juez pueden no ser directamente comparables.`,
    );
  }

  let judgeCallCount = 0;
  await runWithConcurrency(
    sourceRun.candidateRuns,
    options.concurrency ?? 1,
    async (candidateRun) => {
      const benchmarkCase = casesById.get(candidateRun.caseId);
      if (!benchmarkCase) {
        throw new Error(`El dataset no contiene el caso ${candidateRun.caseId}.`);
      }
      const records = await judgeCandidateRun(
        client,
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
