import { describe, expect, test } from 'bun:test';
import { loadDataset } from '../src/dataset/loader.ts';

describe('dataset loader', () => {
  test('loads the smoke fixture', async () => {
    const cases = await loadDataset('tests/fixtures/cases.jsonl');
    expect(cases).toHaveLength(2);
    expect(cases[1]?.isLogographic).toBe(true);
  });
});
