import Ajv, { type ValidateFunction } from 'ajv';
import type { JsonValue, Stage, ValidationResult } from '../core/types.ts';
import { asNonEmptyString, isRecord } from '../core/utils.ts';
import {
  buildGlossSchema,
  buildGrammarSchema,
  buildTranslationSchema,
  type JsonSchema,
} from '../openrouter/schemas.ts';

const ajv = new Ajv({ allErrors: true, strict: false });

const validatorCache = new Map<string, ValidateFunction>();

const getValidator = (stage: Stage, isLogographic: boolean): ValidateFunction => {
  const cacheKey = `${stage}:${isLogographic}`;
  const cached = validatorCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const schema: JsonSchema =
    stage === 'translation'
      ? buildTranslationSchema()
      : stage === 'gloss'
        ? buildGlossSchema(isLogographic)
        : buildGrammarSchema();
  const validator = ajv.compile(schema);
  validatorCache.set(cacheKey, validator);
  return validator;
};

const parseContentCandidate = (content: unknown): string => {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (isRecord(part) && typeof part.text === 'string' ? part.text : ''))
      .join('')
      .trim();
  }

  return '';
};

export const parseStructuredContent = (content: unknown): JsonValue => {
  if (content !== null && typeof content === 'object' && !Array.isArray(content)) {
    return content as JsonValue;
  }

  const raw = parseContentCandidate(content);
  if (!raw) {
    throw new Error('OpenRouter no devolvió contenido estructurado.');
  }

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim() ?? raw;
  const candidate =
    (fenced.startsWith('{') && fenced.endsWith('}')) ||
    (fenced.startsWith('[') && fenced.endsWith(']'))
      ? fenced
      : fenced.slice(fenced.indexOf('{'), fenced.lastIndexOf('}') + 1);

  if (!candidate || candidate === '0') {
    throw new Error('OpenRouter devolvió JSON inválido.');
  }

  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (parsed === null || typeof parsed !== 'object') {
      throw new Error('La respuesta no es un objeto JSON.');
    }
    return parsed as JsonValue;
  } catch {
    throw new Error('OpenRouter devolvió JSON inválido.');
  }
};

const semanticErrors = (
  stage: Stage,
  payload: unknown,
  expectedCount: number,
  isLogographic: boolean,
): string[] => {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    return ['La respuesta debe ser un objeto JSON.'];
  }

  if (stage === 'translation') {
    if (!Array.isArray(payload.translations) || payload.translations.length !== expectedCount) {
      errors.push(`translations debe contener exactamente ${expectedCount} elementos.`);
    } else {
      payload.translations.forEach((item, index) => {
        if (!isRecord(item) || !asNonEmptyString(item.translatedText)) {
          errors.push(`translations[${index}].translatedText está vacío o ausente.`);
        }
      });
    }
  }

  if (stage === 'gloss') {
    if (!Array.isArray(payload.glosses) || payload.glosses.length !== expectedCount) {
      errors.push(`glosses debe contener exactamente ${expectedCount} elementos.`);
    } else {
      payload.glosses.forEach((sentence, sentenceIndex) => {
        if (
          !isRecord(sentence) ||
          !Array.isArray(sentence.tokens) ||
          sentence.tokens.length === 0
        ) {
          errors.push(`glosses[${sentenceIndex}].tokens debe ser un array no vacío.`);
          return;
        }

        sentence.tokens.forEach((token, tokenIndex) => {
          if (!isRecord(token)) {
            errors.push(`glosses[${sentenceIndex}].tokens[${tokenIndex}] debe ser un objeto.`);
            return;
          }
          const surface = asNonEmptyString(token.surface);
          const gloss = asNonEmptyString(token.gloss);
          if (!surface || !gloss) {
            errors.push(`glosses[${sentenceIndex}].tokens[${tokenIndex}] tiene campos vacíos.`);
          }
          if (surface && /^[\p{P}\p{S}]+$/u.test(surface)) {
            errors.push(`glosses[${sentenceIndex}].tokens[${tokenIndex}] es solo puntuación.`);
          }
          if (
            isLogographic &&
            surface &&
            !/^[\p{P}\p{S}]+$/u.test(surface) &&
            !asNonEmptyString(token.reading)
          ) {
            errors.push(`glosses[${sentenceIndex}].tokens[${tokenIndex}] no tiene reading.`);
          }
        });
      });
    }
  }

  if (stage === 'grammar') {
    if (!Array.isArray(payload.points) || payload.points.length > 2) {
      errors.push('points debe ser un array de cero a dos elementos.');
    } else {
      payload.points.forEach((point, index) => {
        if (
          !isRecord(point) ||
          !asNonEmptyString(point.grammar_point) ||
          !asNonEmptyString(point.sentence) ||
          !asNonEmptyString(point.explanation)
        ) {
          errors.push(
            `points[${index}] debe tener grammar_point, sentence y explanation no vacíos.`,
          );
        }
      });
    }
  }

  return errors;
};

export const validateStructuredOutput = (
  stage: Stage,
  payload: unknown,
  expectedCount: number,
  isLogographic: boolean,
): ValidationResult => {
  const validator = getValidator(stage, isLogographic);
  const schemaValid = validator(payload);
  const errors = schemaValid
    ? []
    : (validator.errors ?? []).map(
        (error) => `${error.instancePath || '/'} ${error.message ?? 'schema inválido'}`,
      );
  errors.push(...semanticErrors(stage, payload, expectedCount, isLogographic));

  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
  };
};

export const validateJudgeOutput = (
  payload: unknown,
  dimensions: readonly string[],
): ValidationResult => {
  const errors: string[] = [];
  if (!isRecord(payload) || !isRecord(payload.scores)) {
    errors.push('El juez debe devolver scores.');
  } else {
    for (const dimension of dimensions) {
      const score = payload.scores[dimension];
      if (typeof score !== 'number' || score < 1 || score > 5) {
        errors.push(`scores.${dimension} debe ser un número entre 1 y 5.`);
      }
    }
  }
  if (!Array.isArray(isRecord(payload) ? payload.errorTags : undefined)) {
    errors.push('errorTags debe ser un array.');
  }
  if (typeof (isRecord(payload) ? payload.confidence : undefined) !== 'number') {
    errors.push('confidence debe ser numérico.');
  }
  if (typeof (isRecord(payload) ? payload.rationale : undefined) !== 'string') {
    errors.push('rationale debe ser string.');
  }

  return { valid: errors.length === 0, errors };
};
