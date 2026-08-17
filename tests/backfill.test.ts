import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addCandidatesToRun } from '../src/candidates/backfill.ts';
import type { AppConfig } from '../src/core/config.ts';
import { loadConfig } from '../src/core/config.ts';
import { runBenchmark } from '../src/execution/runner.ts';
import { addJudgesToRun } from '../src/judges/backfill.ts';
import { OpenRouterClient } from '../src/openrouter/client.ts';

const originalFetch = globalThis.fetch;
let generationCounter = 0;
const temporaryDirectories: string[] = [];

const mockFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const url = String(input);

  if (url.endsWith('/models')) {
    return Response.json({
      data: [
        {
          id: 'candidate/model',
          pricing: { prompt: '0.000001', completion: '0.000002', request: '0' },
        },
        {
          id: 'candidate/two',
          pricing: { prompt: '0.000001', completion: '0.000002', request: '0' },
        },
        { id: 'judge/one', pricing: { prompt: '0.000003', completion: '0.000004', request: '0' } },
        { id: 'judge/two', pricing: { prompt: '0.000003', completion: '0.000004', request: '0' } },
        {
          id: 'judge/three',
          pricing: { prompt: '0.000003', completion: '0.000004', request: '0' },
        },
      ],
    });
  }

  if (url.includes('/generation?id=')) {
    return Response.json({ data: { total_cost: 0.001 } });
  }

  const body = JSON.parse(String(init?.body)) as {
    response_format?: {
      json_schema?: { name?: string; schema?: { properties?: Record<string, unknown> } };
    };
  };
  const schemaName = body.response_format?.json_schema?.name ?? '';
  let content: unknown;

  if (schemaName === 'natural_translation_batch') {
    content = { translations: [{ translatedText: 'Aunque llovía, fue al mercado.' }] };
  } else if (schemaName.startsWith('sentence_gloss_batch')) {
    const token = schemaName.includes('logographic')
      ? { surface: '虽然', gloss: 'aunque', reading: 'suīrán' }
      : { surface: 'Although', gloss: 'aunque' };
    content = { glosses: [{ tokens: [token] }] };
  } else if (schemaName === 'grammar_points_payload') {
    content = {
      points: [
        {
          grammar_point: 'Concesión',
          sentence: 'Although it was raining, she went to the market.',
          explanation: 'Although introduce una subordinada concesiva.',
        },
      ],
    };
  } else {
    const scoreProperties = body.response_format?.json_schema?.schema?.properties?.scores;
    const dimensions =
      scoreProperties && typeof scoreProperties === 'object' && !Array.isArray(scoreProperties)
        ? Object.keys(
            (scoreProperties as { properties?: Record<string, unknown> }).properties ?? {},
          )
        : ['overall'];
    content = {
      scores: Object.fromEntries(dimensions.map((dimension) => [dimension, 4])),
      errorTags: [],
      confidence: 0.9,
      rationale: 'Salida correcta.',
    };
  }

  generationCounter += 1;
  return Response.json(
    {
      id: `gen-${generationCounter}`,
      model: 'mock/model',
      choices: [{ message: { content: JSON.stringify(content) } }],
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    },
    { headers: { 'x-openrouter-generation-id': `gen-${generationCounter}` } },
  );
};

afterEach(async () => {
  globalThis.fetch = originalFetch;
  generationCounter = 0;
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const testConfig = (outputDir: string): AppConfig => ({
  ...loadConfig({
    datasetPath: 'tests/fixtures/cases.jsonl',
    models: ['candidate/model'],
    judges: ['judge/one', 'judge/two'],
    repetitions: 1,
    concurrency: 1,
    outputDir,
    seed: 'test',
  }),
  apiKey: 'test-key',
  baseUrl: 'https://openrouter.test/api/v1',
});

const countLines = async (path: string): Promise<number> => {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return 0;
  }
  return (await file.text()).split(/\r?\n/).filter(Boolean).length;
};

describe('addJudgesToRun', () => {
  test('añade un tercer juez en un directorio derivado sin tocar el original', async () => {
    globalThis.fetch = mockFetch as typeof fetch;
    const outputDir = await mkdtemp(join(tmpdir(), 'bench-igt-test-'));
    temporaryDirectories.push(outputDir);
    const config = testConfig(outputDir);
    const client = new OpenRouterClient(config);
    const execution = await runBenchmark(config, client);
    const sourceDirectory = join(execution.reportPath, '..');

    const originalJudgements = await countLines(join(sourceDirectory, 'judgements.jsonl'));
    const originalRun = JSON.parse(await Bun.file(join(sourceDirectory, 'run.json')).text()) as {
      judgeModels: string[];
      judgeRecords: unknown[];
    };

    const derivedOutput = join(outputDir, 'derived');
    const result = await addJudgesToRun(
      sourceDirectory,
      { judgeModels: ['judge/three'], outputDir: derivedOutput },
      client,
    );

    expect(result.addedJudges).toEqual(['judge/three']);
    expect(result.skippedJudges).toEqual([]);
    expect(result.judgeCallCount).toBe(6);

    const derivedManifest = JSON.parse(
      await Bun.file(join(derivedOutput, 'manifest.json')).text(),
    ) as { judgeModels: string[]; status: string };
    expect(derivedManifest.judgeModels).toEqual(['judge/one', 'judge/two', 'judge/three']);
    expect(derivedManifest.status).toBe('completed');

    const derivedRun = JSON.parse(await Bun.file(join(derivedOutput, 'run.json')).text()) as {
      judgeModels: string[];
      judgeRecords: Array<{ judgeCall: { model: string } }>;
    };
    expect(derivedRun.judgeModels).toEqual(['judge/one', 'judge/two', 'judge/three']);
    expect(derivedRun.judgeRecords).toHaveLength(originalRun.judgeRecords.length + 6);
    const threeRecords = derivedRun.judgeRecords.filter(
      (record) => record.judgeCall.model === 'judge/three',
    );
    expect(threeRecords).toHaveLength(6);

    const derivedJudgements = await countLines(join(derivedOutput, 'judgements.jsonl'));
    expect(derivedJudgements).toBe(originalJudgements + 6);

    const reportMarkdown = await Bun.file(join(derivedOutput, 'report.md')).text();
    expect(reportMarkdown).toContain('## Calidad por juez');
    expect(reportMarkdown).toContain('| judge/three |');

    const originalManifest = JSON.parse(
      await Bun.file(join(sourceDirectory, 'manifest.json')).text(),
    ) as { judgeModels: string[] };
    expect(originalManifest.judgeModels).toEqual(['judge/one', 'judge/two']);
    expect(await countLines(join(sourceDirectory, 'judgements.jsonl'))).toBe(originalJudgements);
  });

  test('omite jueces ya presentes y falla si todos se repiten', async () => {
    globalThis.fetch = mockFetch as typeof fetch;
    const outputDir = await mkdtemp(join(tmpdir(), 'bench-igt-test-'));
    temporaryDirectories.push(outputDir);
    const config = testConfig(outputDir);
    const client = new OpenRouterClient(config);
    const execution = await runBenchmark(config, client);
    const sourceDirectory = join(execution.reportPath, '..');

    const derivedOutput = join(outputDir, 'derived');
    await addJudgesToRun(
      sourceDirectory,
      { judgeModels: ['judge/three'], outputDir: derivedOutput },
      client,
    );

    await expect(
      addJudgesToRun(derivedOutput, { judgeModels: ['judge/three'] }, client),
    ).rejects.toThrow('ya evaluaron');

    const mixedOutput = join(outputDir, 'mixed');
    const mixed = await addJudgesToRun(
      sourceDirectory,
      { judgeModels: ['judge/one', 'judge/three'], outputDir: mixedOutput },
      client,
    );
    expect(mixed.addedJudges).toEqual(['judge/three']);
    expect(mixed.skippedJudges).toEqual(['judge/one']);
  });

  test('usa el nombre derivado por defecto cuando no se pasa --output', async () => {
    globalThis.fetch = mockFetch as typeof fetch;
    const outputDir = await mkdtemp(join(tmpdir(), 'bench-igt-test-'));
    temporaryDirectories.push(outputDir);
    const config = testConfig(outputDir);
    const client = new OpenRouterClient(config);
    const execution = await runBenchmark(config, client);
    const sourceDirectory = join(execution.reportPath, '..');

    const result = await addJudgesToRun(sourceDirectory, { judgeModels: ['judge/three'] }, client);

    expect(result.directory).toBe(`${sourceDirectory}-addjudge-judge-three`);
    const manifest = JSON.parse(await Bun.file(join(result.directory, 'manifest.json')).text()) as {
      judgeModels: string[];
    };
    expect(manifest.judgeModels).toContain('judge/three');
  });
});

describe('addCandidatesToRun', () => {
  test('añade un segundo candidato en un directorio derivado sin tocar el original', async () => {
    globalThis.fetch = mockFetch as typeof fetch;
    const outputDir = await mkdtemp(join(tmpdir(), 'bench-igt-test-'));
    temporaryDirectories.push(outputDir);
    const config = testConfig(outputDir);
    const client = new OpenRouterClient(config);
    const execution = await runBenchmark(config, client);
    const sourceDirectory = join(execution.reportPath, '..');

    const originalCandidateRuns = await countLines(join(sourceDirectory, 'candidate-runs.jsonl'));
    const originalJudgements = await countLines(join(sourceDirectory, 'judgements.jsonl'));

    const derivedOutput = join(outputDir, 'derived');
    const result = await addCandidatesToRun(
      sourceDirectory,
      { candidateModels: ['candidate/two'], outputDir: derivedOutput },
      client,
    );

    expect(result.addedCandidates).toEqual(['candidate/two']);
    expect(result.skippedCandidates).toEqual([]);
    expect(result.candidateRunCount).toBe(2);
    expect(result.judgeCallCount).toBe(12);

    const derivedManifest = JSON.parse(
      await Bun.file(join(derivedOutput, 'manifest.json')).text(),
    ) as { candidateModels: string[]; totalJobs: number; status: string };
    expect(derivedManifest.candidateModels).toEqual(['candidate/model', 'candidate/two']);
    expect(derivedManifest.totalJobs).toBe(4);
    expect(derivedManifest.status).toBe('completed');

    const derivedRun = JSON.parse(await Bun.file(join(derivedOutput, 'run.json')).text()) as {
      candidateModels: string[];
      candidateRuns: Array<{ candidateModel: string }>;
      judgeRecords: Array<{ judgeCall: { model: string; evaluatedModel: string } }>;
    };
    expect(derivedRun.candidateModels).toEqual(['candidate/model', 'candidate/two']);
    expect(derivedRun.candidateRuns).toHaveLength(originalCandidateRuns + 2);

    const twoRecords = derivedRun.judgeRecords.filter(
      (record) => record.judgeCall.evaluatedModel === 'candidate/two',
    );
    expect(twoRecords).toHaveLength(12);
    expect(
      derivedRun.judgeRecords.filter(
        (record) => record.judgeCall.evaluatedModel === 'candidate/model',
      ),
    ).toHaveLength(originalJudgements);
    const judgeModelsUsed = new Set(twoRecords.map((record) => record.judgeCall.model));
    expect(judgeModelsUsed).toEqual(new Set(['judge/one', 'judge/two']));

    const reportMarkdown = await Bun.file(join(derivedOutput, 'report.md')).text();
    expect(reportMarkdown).toContain('| candidate/two |');

    const originalManifest = JSON.parse(
      await Bun.file(join(sourceDirectory, 'manifest.json')).text(),
    ) as { candidateModels: string[]; totalJobs: number };
    expect(originalManifest.candidateModels).toEqual(['candidate/model']);
    expect(originalManifest.totalJobs).toBe(2);
    expect(await countLines(join(sourceDirectory, 'candidate-runs.jsonl'))).toBe(
      originalCandidateRuns,
    );
    expect(await countLines(join(sourceDirectory, 'judgements.jsonl'))).toBe(originalJudgements);
  });

  test('omite candidatos ya presentes y falla si todos se repiten', async () => {
    globalThis.fetch = mockFetch as typeof fetch;
    const outputDir = await mkdtemp(join(tmpdir(), 'bench-igt-test-'));
    temporaryDirectories.push(outputDir);
    const config = testConfig(outputDir);
    const client = new OpenRouterClient(config);
    const execution = await runBenchmark(config, client);
    const sourceDirectory = join(execution.reportPath, '..');

    await expect(
      addCandidatesToRun(sourceDirectory, { candidateModels: ['candidate/model'] }, client),
    ).rejects.toThrow('ya participaron');

    const mixedOutput = join(outputDir, 'mixed');
    const mixed = await addCandidatesToRun(
      sourceDirectory,
      { candidateModels: ['candidate/model', 'candidate/two'], outputDir: mixedOutput },
      client,
    );
    expect(mixed.addedCandidates).toEqual(['candidate/two']);
    expect(mixed.skippedCandidates).toEqual(['candidate/model']);
  });

  test('usa el nombre derivado por defecto cuando no se pasa --output', async () => {
    globalThis.fetch = mockFetch as typeof fetch;
    const outputDir = await mkdtemp(join(tmpdir(), 'bench-igt-test-'));
    temporaryDirectories.push(outputDir);
    const config = testConfig(outputDir);
    const client = new OpenRouterClient(config);
    const execution = await runBenchmark(config, client);
    const sourceDirectory = join(execution.reportPath, '..');

    const result = await addCandidatesToRun(
      sourceDirectory,
      { candidateModels: ['candidate/two'] },
      client,
    );

    expect(result.directory).toBe(`${sourceDirectory}-addcandidate-candidate-two`);
    const manifest = JSON.parse(await Bun.file(join(result.directory, 'manifest.json')).text()) as {
      candidateModels: string[];
    };
    expect(manifest.candidateModels).toContain('candidate/two');
  });
});
