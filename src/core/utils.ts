import type { JsonObject, JsonValue } from './types.ts';

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

export const asJsonValue = (value: unknown): JsonValue | undefined => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const converted = value.map(asJsonValue);
    return converted.every((item) => item !== undefined) ? (converted as JsonValue[]) : undefined;
  }

  if (isRecord(value)) {
    const converted: JsonObject = {};
    for (const [key, item] of Object.entries(value)) {
      const jsonItem = asJsonValue(item);
      if (jsonItem === undefined) {
        return undefined;
      }
      converted[key] = jsonItem;
    }
    return converted;
  }

  return undefined;
};

export const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

export const asNonEmptyString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

export const sleep = async (milliseconds: number): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
};

export const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

export const sum = (values: readonly number[]): number => {
  return values.reduce((total, value) => total + value, 0);
};

export const mean = (values: readonly number[]): number => {
  return values.length ? sum(values) / values.length : 0;
};

export const median = (values: readonly number[]): number => {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
};

export const percentile = (values: readonly number[], percentileValue: number): number => {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  );
  return sorted[index] ?? 0;
};

export const stableHash = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const shuffle = <T>(items: readonly T[], seed: string): T[] => {
  const result = [...items];
  let state = stableHash(seed) || 1;

  for (let index = result.length - 1; index > 0; index -= 1) {
    state = Math.imul(state ^ (state >>> 15), 2246822519) >>> 0;
    const swapIndex = state % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex] as T, result[index] as T];
  }

  return result;
};
