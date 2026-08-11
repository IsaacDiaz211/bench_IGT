import { afterEach, describe, expect, test } from 'bun:test';
import type { AppConfig } from '../src/core/config.ts';
import { loadConfig } from '../src/core/config.ts';
import { runBenchmark } from '../src/execution/runner.ts';
import { OpenRouterClient } from '../src/openrouter/client.ts';

const originalFetch = globalThis.fetch;
let generationCounter = 0;

const mockFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const url = String(input);

  if (url.endsWith('/models')) {
    return Response.json({
      data: [
        {
          id: 'candidate/model',
          pricing: { prompt: '0.000001', completion: '0.000002', request: '0' },
        },
        { id: 'judge/one', pricing: { prompt: '0.000003', completion: '0.000004', request: '0' } },
        { id: 'judge/two', pricing: { prompt: '0.000003', completion: '0.000004', request: '0' } },
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

afterEach(() => {
  globalThis.fetch = originalFetch;
  generationCounter = 0;
});

describe('complete benchmark cost', () => {
  test('includes candidate and judge generations in total cost', async () => {
    globalThis.fetch = mockFetch as typeof fetch;
    const config: AppConfig = {
      ...loadConfig({
        datasetPath: 'tests/fixtures/cases.jsonl',
        models: ['candidate/model'],
        judges: ['judge/one', 'judge/two'],
        repetitions: 1,
        concurrency: 1,
        outputDir: 'results/test-cost',
        seed: 'test',
      }),
      apiKey: 'test-key',
      baseUrl: 'https://openrouter.test/api/v1',
    };
    const client = new OpenRouterClient(config);
    const execution = await runBenchmark(config, client);
    const report = JSON.parse(
      await Bun.file(`results/test-cost/${execution.run.runId}/report.json`).text(),
    ) as {
      grandTotalCost: { amountUsd: number };
      candidateSummaries: Array<{
        candidateCost: { amountUsd: number };
        judgeCost: { amountUsd: number };
        totalCost: { amountUsd: number };
      }>;
    };
    const summary = report.candidateSummaries[0];

    expect(summary?.candidateCost.amountUsd).toBeCloseTo(0.006);
    expect(summary?.judgeCost.amountUsd).toBeCloseTo(0.012);
    expect(summary?.totalCost.amountUsd).toBeCloseTo(0.018);
    expect(report.grandTotalCost.amountUsd).toBeCloseTo(0.018);
  });
});
