import type { ModelPricing } from './types.ts';

export interface AppConfig {
  apiKey: string;
  baseUrl: string;
  httpReferer: string;
  appTitle: string;
  timeoutMs: number;
  datasetPath: string;
  models: string[];
  judges: string[];
  repetitions: number;
  concurrency: number;
  outputDir: string;
  seed: string;
  resumeDir?: string;
}

export interface ConfigOverrides {
  datasetPath?: string;
  models?: string[];
  judges?: string[];
  repetitions?: number;
  concurrency?: number;
  outputDir?: string;
  seed?: string;
  resumeDir?: string;
}

const readString = (name: string, fallback = ''): string => {
  return (Bun.env[name] ?? fallback).trim();
};

const readPositiveInteger = (name: string, fallback: number): number => {
  const value = Number.parseInt(readString(name), 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

const readList = (name: string): string[] => {
  return readString(name)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
};

export const parseModelList = (value: string | undefined): string[] => {
  return (value ?? '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
};

export const loadConfig = (overrides: ConfigOverrides = {}): AppConfig => {
  const apiKey = readString('OPENROUTER_API_KEY');

  return {
    apiKey,
    baseUrl: readString('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1').replace(/\/+$/, ''),
    httpReferer: readString('OPENROUTER_HTTP_REFERER'),
    appTitle: readString('OPENROUTER_APP_TITLE', 'bench_IGT'),
    timeoutMs: readPositiveInteger('OPENROUTER_TIMEOUT_MS', 40_000),
    datasetPath:
      overrides.datasetPath ?? readString('BENCHMARK_DATASET', 'datasets/smoke/cases.jsonl'),
    models: overrides.models ?? readList('BENCHMARK_MODELS'),
    judges: overrides.judges ?? readList('BENCHMARK_JUDGES'),
    repetitions: overrides.repetitions ?? readPositiveInteger('BENCHMARK_REPETITIONS', 1),
    concurrency: overrides.concurrency ?? readPositiveInteger('BENCHMARK_CONCURRENCY', 1),
    outputDir: overrides.outputDir ?? readString('BENCHMARK_OUTPUT_DIR', 'results'),
    seed: overrides.seed ?? readString('BENCHMARK_SEED', 'bench-igt-v1'),
    resumeDir: overrides.resumeDir,
  };
};

export const findPricing = (
  pricing: readonly ModelPricing[],
  model: string,
): ModelPricing | undefined => {
  return pricing.find((item) => item.model === model);
};
