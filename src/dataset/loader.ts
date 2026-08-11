import type { BenchmarkCase } from '../core/types.ts';
import { isRecord } from '../core/utils.ts';

const asString = (value: unknown, field: string, lineNumber: number): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Línea ${lineNumber}: ${field} debe ser un string no vacío.`);
  }
  return value.trim();
};

const validateCase = (value: unknown, lineNumber: number): BenchmarkCase => {
  if (!isRecord(value)) {
    throw new Error(`Línea ${lineNumber}: el caso debe ser un objeto JSON.`);
  }

  const sourceLang = asString(value.sourceLang, 'sourceLang', lineNumber);
  const targetLang = asString(value.targetLang, 'targetLang', lineNumber);
  const text = asString(value.text, 'text', lineNumber);
  const id = asString(value.id, 'id', lineNumber);

  if (sourceLang !== 'en' && sourceLang !== 'zh') {
    throw new Error(`Línea ${lineNumber}: sourceLang debe ser "en" o "zh".`);
  }
  if (targetLang !== 'es') {
    throw new Error(`Línea ${lineNumber}: targetLang debe ser "es".`);
  }
  if (text.length > 450) {
    throw new Error(`Línea ${lineNumber}: ${id} supera el límite de 450 caracteres de la app.`);
  }

  if (!Array.isArray(value.sentences) || value.sentences.length === 0) {
    throw new Error(`Línea ${lineNumber}: sentences debe ser un array no vacío.`);
  }
  const sentences = value.sentences.map((sentence, index) => {
    if (typeof sentence !== 'string' || !sentence.trim()) {
      throw new Error(`Línea ${lineNumber}: sentences[${index}] debe ser un string no vacío.`);
    }
    return sentence.trim();
  });

  if (value.isLogographic !== (sourceLang === 'zh')) {
    throw new Error(`Línea ${lineNumber}: isLogographic no coincide con sourceLang.`);
  }

  const tags = Array.isArray(value.tags)
    ? value.tags.map((tag, index) => asString(tag, `tags[${index}]`, lineNumber))
    : [];

  return {
    id,
    sourceLang,
    targetLang,
    text,
    sentences,
    isLogographic: sourceLang === 'zh',
    tags,
    difficulty: typeof value.difficulty === 'string' ? value.difficulty.trim() : undefined,
    source: typeof value.source === 'string' ? value.source.trim() : undefined,
  };
};

export const loadDataset = async (path: string): Promise<BenchmarkCase[]> => {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`No existe el dataset: ${path}`);
  }

  const lines = (await file.text()).split(/\r?\n/);
  const cases: BenchmarkCase[] = [];
  const ids = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? '';
    if (!line || line.startsWith('#')) {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch {
      throw new Error(`Línea ${index + 1}: JSON inválido.`);
    }

    const benchmarkCase = validateCase(parsed, index + 1);
    if (ids.has(benchmarkCase.id)) {
      throw new Error(`Línea ${index + 1}: id duplicado ${benchmarkCase.id}.`);
    }
    ids.add(benchmarkCase.id);
    cases.push(benchmarkCase);
  }

  if (!cases.length) {
    throw new Error(`El dataset no contiene casos: ${path}`);
  }

  return cases;
};
