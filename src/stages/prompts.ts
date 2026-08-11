import { join } from 'node:path';
import type { BenchmarkCase, Stage } from '../core/types.ts';

const promptRoot = join(import.meta.dir, '../../prompts');

const readPrompt = async (relativePath: string): Promise<string> => {
  const file = Bun.file(join(promptRoot, relativePath));
  if (!(await file.exists())) {
    throw new Error(`No existe la plantilla de prompt: ${relativePath}`);
  }
  return (await file.text()).trimEnd();
};

const [
  promptVersion,
  APP_SYSTEM_PROMPT,
  translationTemplate,
  glossTemplate,
  grammarTemplate,
  judgeSystemPrompt,
  judgeTranslationTemplate,
  judgeGlossTemplate,
  judgeGrammarTemplate,
] = await Promise.all([
  readPrompt('VERSION'),
  readPrompt('app-compatible/system.txt'),
  readPrompt('app-compatible/translation.md'),
  readPrompt('app-compatible/gloss.md'),
  readPrompt('app-compatible/grammar.md'),
  readPrompt('judges/system.txt'),
  readPrompt('judges/translation.md'),
  readPrompt('judges/gloss.md'),
  readPrompt('judges/grammar.md'),
]);

export const PROMPT_VERSION = promptVersion;
export { APP_SYSTEM_PROMPT };

type TemplateValues = Record<string, string>;

const renderTemplate = (template: string, values: TemplateValues): string => {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (match, key: string) => {
    if (!(key in values)) {
      throw new Error(`Falta el valor de plantilla ${match}.`);
    }
    return values[key] ?? '';
  });
};

const formatSentenceList = (sentences: readonly string[]): string => {
  return sentences.map((sentence, index) => `[${index}] ${sentence}`).join('\n');
};

export const buildCandidatePrompt = (
  stage: Stage,
  benchmarkCase: BenchmarkCase,
  sentences: string[],
): string => {
  const commonValues = {
    SOURCE_LANG: benchmarkCase.sourceLang,
    TARGET_LANG: benchmarkCase.targetLang,
    SENTENCES: formatSentenceList(sentences),
    TEXT: benchmarkCase.text,
    READING_INSTRUCTION: benchmarkCase.isLogographic
      ? 'For each token include reading as pinyin with tones.'
      : 'Do not include phonetic readings unless truly necessary.',
  };

  if (stage === 'translation') {
    return renderTemplate(translationTemplate, commonValues);
  }
  if (stage === 'gloss') {
    return renderTemplate(glossTemplate, commonValues);
  }
  return renderTemplate(grammarTemplate, commonValues);
};

export const buildJudgePrompt = (
  stage: Stage,
  benchmarkCase: BenchmarkCase,
  candidateOutput: unknown,
): string => {
  const values = {
    SOURCE_LANG: benchmarkCase.sourceLang,
    TARGET_LANG: benchmarkCase.targetLang,
    TEXT: benchmarkCase.text,
    SENTENCES_JSON: JSON.stringify(benchmarkCase.sentences),
    CANDIDATE_OUTPUT_JSON: JSON.stringify(candidateOutput) ?? 'null',
  };

  if (stage === 'translation') {
    return renderTemplate(judgeTranslationTemplate, values);
  }
  if (stage === 'gloss') {
    return renderTemplate(judgeGlossTemplate, values);
  }
  return renderTemplate(judgeGrammarTemplate, values);
};

export { judgeSystemPrompt as JUDGE_SYSTEM_PROMPT };
