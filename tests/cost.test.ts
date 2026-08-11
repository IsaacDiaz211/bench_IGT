import { describe, expect, test } from 'bun:test';
import type { CallResult } from '../src/core/types.ts';
import { summarizeCost } from '../src/metrics/cost.ts';

const call = (costUsd: number | undefined, estimated = false): CallResult => ({
  callId: crypto.randomUUID(),
  actor: 'candidate',
  model: 'candidate/model',
  candidateModel: 'candidate/model',
  caseId: 'test',
  stage: 'translation',
  startedAt: new Date().toISOString(),
  endedAt: new Date().toISOString(),
  latencyMs: 10,
  statsLookupMs: 0,
  ok: true,
  requestBody: {},
  usage: costUsd === undefined ? {} : { costUsd, costEstimated: estimated },
});

describe('cost aggregation', () => {
  test('separates exact, estimated, and unknown calls', () => {
    const result = summarizeCost([call(0.01), call(0.02, true), call(undefined)]);
    expect(result.amountUsd).toBeCloseTo(0.03);
    expect(result.exactAmountUsd).toBeCloseTo(0.01);
    expect(result.estimatedAmountUsd).toBeCloseTo(0.02);
    expect(result.unknownCalls).toBe(1);
  });
});
