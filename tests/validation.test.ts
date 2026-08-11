import { describe, expect, test } from 'bun:test';
import { judgeDimensions } from '../src/openrouter/schemas.ts';
import {
  parseStructuredContent,
  validateJudgeOutput,
  validateStructuredOutput,
} from '../src/validation/structured.ts';

describe('structured output validation', () => {
  test('validates a translation batch', () => {
    const payload = {
      translations: [{ translatedText: 'Aunque llovía, fue al mercado.' }],
    };
    const result = validateStructuredOutput('translation', payload, 1, false);
    expect(result.valid).toBe(true);
  });

  test('rejects a gloss made only of punctuation', () => {
    const payload = {
      glosses: [{ tokens: [{ surface: '.', gloss: 'punto' }] }],
    };
    const result = validateStructuredOutput('gloss', payload, 1, false);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('solo puntuación'))).toBe(true);
  });

  test('requires readings in Chinese glosses', () => {
    const payload = {
      glosses: [{ tokens: [{ surface: '我', gloss: 'yo' }] }],
    };
    const result = validateStructuredOutput('gloss', payload, 1, true);
    expect(result.valid).toBe(false);
  });

  test('parses fenced JSON content', () => {
    expect(parseStructuredContent('```json\n{"points":[]}\n```')).toEqual({ points: [] });
  });

  test('validates judge scores', () => {
    const scores = Object.fromEntries(
      judgeDimensions('grammar', false).map((dimension) => [dimension, 4]),
    );
    const result = validateJudgeOutput(
      { scores, errorTags: [], confidence: 0.9, rationale: 'Correcto.' },
      judgeDimensions('grammar', false),
    );
    expect(result.valid).toBe(true);
  });
});
