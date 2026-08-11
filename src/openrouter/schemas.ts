import type { JsonObject, Stage } from '../core/types.ts';

export type JsonSchema = JsonObject;

const stringSchema = (description: string): JsonSchema => ({
  type: 'string',
  description,
});

const glossTokenSchema = (isLogographic: boolean): JsonSchema => {
  const properties: Record<string, JsonSchema> = {
    surface: stringSchema('Original token from the source sentence.'),
    gloss: stringSchema('Short gloss in the learner native language for the token.'),
  };
  const required = ['surface', 'gloss'];

  if (isLogographic) {
    properties.reading = stringSchema('Phonetic reading, for example pinyin with tones.');
    required.push('reading');
  }

  return {
    type: 'object',
    additionalProperties: false,
    properties,
    required,
  };
};

export const buildTranslationSchema = (): JsonSchema => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    translations: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          translatedText: stringSchema('Natural translation of the corresponding source sentence.'),
        },
        required: ['translatedText'],
      },
    },
  },
  required: ['translations'],
});

export const buildGlossSchema = (isLogographic: boolean): JsonSchema => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    glosses: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          tokens: {
            type: 'array',
            minItems: 1,
            items: glossTokenSchema(isLogographic),
          },
        },
        required: ['tokens'],
      },
    },
  },
  required: ['glosses'],
});

export const buildGrammarSchema = (): JsonSchema => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    points: {
      type: 'array',
      minItems: 0,
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          grammar_point: stringSchema('Name of the grammar pattern.'),
          sentence: stringSchema('Example sentence where the pattern appears.'),
          explanation: stringSchema('Practical explanation for language learners.'),
        },
        required: ['grammar_point', 'sentence', 'explanation'],
      },
    },
  },
  required: ['points'],
});

export const judgeDimensions = (stage: Stage, isLogographic: boolean): string[] => {
  if (stage === 'translation') {
    return ['overall', 'meaning', 'completeness', 'naturalness', 'spanish', 'context'];
  }

  if (stage === 'gloss') {
    return [
      'overall',
      'surfaceAlignment',
      'morphemeGranularity',
      'glossAccuracy',
      'punctuationHandling',
      ...(isLogographic ? ['readingAccuracy'] : []),
      'learnerUsefulness',
    ];
  }

  return ['overall', 'presence', 'accuracy', 'evidence', 'explanation', 'pedagogy'];
};

export const buildJudgeSchema = (stage: Stage, isLogographic: boolean): JsonSchema => {
  const scoreProperties = Object.fromEntries(
    judgeDimensions(stage, isLogographic).map((dimension) => [
      dimension,
      {
        type: 'number',
        minimum: 1,
        maximum: 5,
        description: 'Score from 1 (poor) to 5 (excellent).',
      },
    ]),
  );

  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      scores: {
        type: 'object',
        additionalProperties: false,
        properties: scoreProperties,
        required: judgeDimensions(stage, isLogographic),
      },
      errorTags: {
        type: 'array',
        items: { type: 'string' },
      },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
      },
      rationale: {
        type: 'string',
      },
    },
    required: ['scores', 'errorTags', 'confidence', 'rationale'],
  };
};

export const schemaName = (
  stage: Stage,
  actor: 'candidate' | 'judge',
  isLogographic = false,
): string => {
  if (actor === 'judge') {
    return `${stage}_quality_judgement`;
  }

  if (stage === 'translation') {
    return 'natural_translation_batch';
  }

  if (stage === 'gloss') {
    return isLogographic ? 'sentence_gloss_batch_logographic' : 'sentence_gloss_batch';
  }

  return 'grammar_points_payload';
};

export const schemaFor = (
  stage: Stage,
  actor: 'candidate' | 'judge',
  isLogographic: boolean,
): JsonSchema => {
  if (actor === 'judge') {
    return buildJudgeSchema(stage, isLogographic);
  }

  if (stage === 'translation') {
    return buildTranslationSchema();
  }

  if (stage === 'gloss') {
    return buildGlossSchema(isLogographic);
  }

  return buildGrammarSchema();
};
