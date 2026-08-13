import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AppConfig } from '../src/core/config.ts';
import type { CandidateRun } from '../src/core/types.ts';
import { loadPersistedRun, RunStore } from '../src/execution/run-store.ts';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const config = (outputDir: string): AppConfig => ({
  apiKey: 'test-key',
  baseUrl: 'https://openrouter.test/api/v1',
  httpReferer: '',
  appTitle: 'bench_IGT-test',
  timeoutMs: 1000,
  datasetPath: 'tests/fixtures/cases.jsonl',
  models: ['candidate/model'],
  judges: ['judge/model'],
  repetitions: 1,
  concurrency: 1,
  outputDir,
  seed: 'test',
});

const candidateRun: CandidateRun = {
  runId: 'candidate-run-1',
  caseId: 'en-test-001',
  candidateModel: 'candidate/model',
  repetition: 1,
  startedAt: new Date().toISOString(),
  endedAt: new Date().toISOString(),
  elapsedMs: 1,
  stages: {
    translation: {
      stage: 'translation',
      valid: false,
      validation: { valid: false, errors: ['test'] },
      callIds: [],
    },
    gloss: {
      stage: 'gloss',
      valid: false,
      validation: { valid: false, errors: ['test'] },
      callIds: [],
    },
    grammar: {
      stage: 'grammar',
      valid: false,
      validation: { valid: false, errors: ['test'] },
      callIds: [],
    },
  },
  calls: [],
};

describe('incremental run store', () => {
  test('persists a candidate before the job completes and can resume it', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'bench-igt-store-test-'));
    temporaryDirectories.push(outputDir);
    const store = await RunStore.start(config(outputDir), 'run-1', 1, 1, 'app-compatible-v1');

    await store.recordCandidateRun(candidateRun);
    expect(await Bun.file(join(store.directory, 'candidate-runs.jsonl')).exists()).toBe(true);
    const progressBeforeCompletion = JSON.parse(
      await Bun.file(join(store.directory, 'progress.json')).text(),
    ) as { completedJobs: number; candidateRunsPersisted: number };
    expect(progressBeforeCompletion.completedJobs).toBe(0);
    expect(progressBeforeCompletion.candidateRunsPersisted).toBe(1);

    await store.completeJob('candidate/model', 'en-test-001', 1);
    const resumed = await RunStore.resume(store.directory);
    expect(resumed.isCompleted('candidate/model', 'en-test-001', 1)).toBe(true);

    const persistedRun = await loadPersistedRun(store.directory);
    expect(persistedRun.candidateRuns).toHaveLength(1);
    expect(persistedRun.candidateRuns[0]?.runId).toBe('candidate-run-1');
  });
});
