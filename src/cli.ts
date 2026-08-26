import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { addCandidatesToRun } from './candidates/backfill.ts';
import { getProviderForModel, loadConfig, parseModelList } from './core/config.ts';
import { loadDataset } from './dataset/loader.ts';
import { runBenchmark, writeReportForRun } from './execution/runner.ts';
import { FireworksClient } from './fireworks/client.ts';
import { addJudgesToRun } from './judges/backfill.ts';
import { OpenRouterClient } from './openrouter/client.ts';

const printHelp = (): void => {
  console.log(`bench_IGT

Comandos:
  run                Ejecuta candidatos y jueces y escribe el informe completo.
  models             Lista modelos y precios disponibles en OpenRouter.
  validate-dataset   Valida un dataset JSONL sin hacer peticiones de red.
  report             Regenera el informe de una ejecución existente.
  add-judge          Evalúa una ejecución completada con modelos juez adicionales
                     y escribe el informe en un directorio derivado.
  add-candidate      Añade modelos candidato a una ejecución completada; solo se
                     ejecutan los nuevos y los jueces existentes evalúan sus salidas.

Ejemplo:
  pnpm benchmark -- --dataset datasets/evaluation/cases.jsonl \\
    --models openai/gpt-4o,anthropic/claude-haiku-4.5 \\
    --judges deepseek/deepseek-chat,openai/gpt-5

Opciones de run:
  --dataset <path>       Dataset JSONL.
  --models <a,b,c>       Modelos candidatos.
  --judges <a,b>         Modelos jueces. Se incluyen en el coste total.
  --repetitions <n>      Repeticiones por caso y modelo.
  --concurrency <n>      Ejecuciones de casos en paralelo.
  --output <path>        Directorio de resultados.
  --seed <value>         Semilla para aleatorizar el orden.
  --resume <path>        Reanuda una ejecución existente desde su directorio.
  --skip-judges          Solo para depuración; no produce el coste total final.

Opciones de add-judge:
  --run <path>           Directorio (o run.json) de la ejecución completada.
  --judges <a,b>         Modelos juez adicionales.
  --output <path>        Directorio derivado (por defecto, el original más "-addjudge-<modelos>").
  --concurrency <n>      Evaluaciones en paralelo.

Opciones de add-candidate:
  --run <path>           Directorio (o run.json) de la ejecución completada.
  --models <a,b>         Modelos candidato adicionales.
  --output <path>        Directorio derivado (por defecto, el original más "-addcandidate-<modelos>").
  --concurrency <n>      Ejecuciones de casos en paralelo.
`);
};

const parsePositiveInteger = (value: string | undefined, name: string): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} debe ser un entero positivo.`);
  }
  return parsed;
};

const cli = parseArgs({
  args: Bun.argv.slice(2).filter((argument) => argument !== '--'),
  allowPositionals: true,
  strict: true,
  options: {
    dataset: { type: 'string', short: 'd' },
    models: { type: 'string', short: 'm' },
    judges: { type: 'string', short: 'j' },
    repetitions: { type: 'string' },
    concurrency: { type: 'string' },
    output: { type: 'string', short: 'o' },
    seed: { type: 'string' },
    resume: { type: 'string' },
    run: { type: 'string' },
    'skip-judges': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
});

const command = cli.positionals[0] ?? 'run';

const extraPositionals = cli.positionals.slice(1);
if (extraPositionals.length) {
  throw new Error(`Argumento desconocido: ${extraPositionals.join(' ')}.`);
}

const run = async (): Promise<void> => {
  if (cli.values.help || command === 'help') {
    printHelp();
    return;
  }

  if (command === 'validate-dataset') {
    const datasetPath = cli.values.dataset ?? undefined;
    const config = loadConfig({ datasetPath });
    const cases = await loadDataset(config.datasetPath);
    console.log(`Dataset válido: ${cases.length} casos (${config.datasetPath}).`);
    return;
  }

  if (command === 'report') {
    const runPath = cli.values.run;
    if (!runPath) {
      throw new Error('report requiere --run <directorio-o-run.json>.');
    }
    const reportMarkdown = await writeReportForRun(runPath);
    console.log(reportMarkdown);
    return;
  }

  if (command === 'add-judge') {
    const runPath = cli.values.run;
    const judgeModels = cli.values.judges ? parseModelList(cli.values.judges) : undefined;
    if (!runPath) {
      throw new Error('add-judge requiere --run <directorio-o-run.json>.');
    }
    if (!judgeModels?.length) {
      throw new Error('add-judge requiere --judges <modelos adicionales>.');
    }
    const config = loadConfig();
    const openrouter = new OpenRouterClient(config);
    const needsFireworks = judgeModels.some((m) => getProviderForModel(m) === 'fireworks');
    const fireworks = needsFireworks
      ? new FireworksClient({
          apiKey: config.fireworksApiKey,
          baseUrl: config.fireworksBaseUrl,
          timeoutMs: config.fireworksTimeoutMs,
        })
      : undefined;
    const clients = needsFireworks && fireworks ? { openrouter, fireworks } : openrouter;
    const directory = runPath.endsWith('.json') ? join(runPath, '..') : runPath;
    const concurrency =
      parsePositiveInteger(cli.values.concurrency, '--concurrency') ?? config.concurrency;
    const result = await addJudgesToRun(
      directory,
      { judgeModels, outputDir: cli.values.output, concurrency },
      clients as unknown as Parameters<typeof addJudgesToRun>[2],
    );
    console.log(`Jueces añadidos: ${result.addedJudges.join(', ')}`);
    if (result.skippedJudges.length) {
      console.log(`Jueces ya presentes, omitidos: ${result.skippedJudges.join(', ')}`);
    }
    console.log(`Evaluaciones nuevas: ${result.judgeCallCount}`);
    console.log(`Informe: ${result.reportPath}`);
    console.log(result.reportMarkdown);
    return;
  }

  if (command === 'add-candidate') {
    const runPath = cli.values.run;
    const candidateModels = cli.values.models ? parseModelList(cli.values.models) : undefined;
    if (!runPath) {
      throw new Error('add-candidate requiere --run <directorio-o-run.json>.');
    }
    if (!candidateModels?.length) {
      throw new Error('add-candidate requiere --models <modelos adicionales>.');
    }
    const config = loadConfig();
    const openrouter = new OpenRouterClient(config);
    // If the source run already contains fireworks judges, we need fireworks client to evaluate them.
    // Instantiate lazily if key exists.
    let fireworks: FireworksClient | undefined;
    if (config.fireworksApiKey) {
      try {
        fireworks = new FireworksClient({
          apiKey: config.fireworksApiKey,
          baseUrl: config.fireworksBaseUrl,
          timeoutMs: config.fireworksTimeoutMs,
        });
      } catch {
        fireworks = undefined;
      }
    }
    const clients = fireworks ? { openrouter, fireworks } : openrouter;
    const directory = runPath.endsWith('.json') ? join(runPath, '..') : runPath;
    const concurrency =
      parsePositiveInteger(cli.values.concurrency, '--concurrency') ?? config.concurrency;
    const result = await addCandidatesToRun(
      directory,
      { candidateModels, outputDir: cli.values.output, concurrency },
      clients as unknown as Parameters<typeof addCandidatesToRun>[2],
    );
    console.log(`Candidatos añadidos: ${result.addedCandidates.join(', ')}`);
    if (result.skippedCandidates.length) {
      console.log(`Candidatos ya presentes, omitidos: ${result.skippedCandidates.join(', ')}`);
    }
    console.log(`Ejecuciones de candidato nuevas: ${result.candidateRunCount}`);
    console.log(`Evaluaciones nuevas: ${result.judgeCallCount}`);
    console.log(`Informe: ${result.reportPath}`);
    console.log(result.reportMarkdown);
    return;
  }

  const skipJudges = Boolean(cli.values['skip-judges']);
  const config = loadConfig({
    datasetPath: cli.values.dataset,
    models: cli.values.models ? parseModelList(cli.values.models) : undefined,
    judges: skipJudges ? [] : cli.values.judges ? parseModelList(cli.values.judges) : undefined,
    repetitions: parsePositiveInteger(cli.values.repetitions, '--repetitions'),
    concurrency: parsePositiveInteger(cli.values.concurrency, '--concurrency'),
    outputDir: cli.values.output,
    seed: cli.values.seed,
    resumeDir: cli.values.resume,
  });

  if (command === 'models') {
    const client = new OpenRouterClient(config);
    const models = await client.listModels();
    for (const model of models) {
      if (!model || typeof model !== 'object' || Array.isArray(model)) {
        continue;
      }
      const record = model as {
        id?: unknown;
        name?: unknown;
        pricing?: { prompt?: unknown; completion?: unknown };
      };
      console.log(
        JSON.stringify({
          id: record.id,
          name: record.name,
          prompt: record.pricing?.prompt,
          completion: record.pricing?.completion,
        }),
      );
    }
    return;
  }

  if (command !== 'run') {
    throw new Error(`Comando desconocido: ${command}`);
  }

  if (!config.models.length) {
    throw new Error('No hay modelos candidatos. Usa --models o BENCHMARK_MODELS.');
  }
  if (!config.judges.length && !skipJudges) {
    throw new Error(
      'No hay modelos jueces. Usa --judges o BENCHMARK_JUDGES; el coste total requiere jueces.',
    );
  }

  const client = new OpenRouterClient(config);
  const result = await runBenchmark(config, client);
  console.log(`Ejecución ${result.run.runId} completada.`);
  console.log(`Informe: ${result.reportPath}`);
  console.log(result.reportMarkdown);
};

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
