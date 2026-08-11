import type {
  BenchmarkCase,
  CallResult,
  CandidateRun,
  JsonValue,
  StageResult,
} from '../core/types.ts';
import { chunk } from '../core/utils.ts';
import type { OpenRouterClient } from '../openrouter/client.ts';
import { schemaFor, schemaName } from '../openrouter/schemas.ts';
import { parseStructuredContent, validateStructuredOutput } from '../validation/structured.ts';
import { APP_SYSTEM_PROMPT, buildCandidatePrompt } from './prompts.ts';

const BATCH_SIZE = 4;

interface ParsedBatch {
  call: CallResult;
  payload?: JsonValue;
  validation: { valid: boolean; errors: string[] };
  error?: string;
}

const runBatchCall = async (
  client: OpenRouterClient,
  stage: 'translation' | 'gloss',
  benchmarkCase: BenchmarkCase,
  candidateModel: string,
  sentences: string[],
  batchIndex: number,
): Promise<ParsedBatch> => {
  const call = await client.complete({
    actor: 'candidate',
    model: candidateModel,
    candidateModel,
    caseId: benchmarkCase.id,
    stage,
    batchIndex,
    schemaName: schemaName(stage, 'candidate', benchmarkCase.isLogographic),
    schema: schemaFor(stage, 'candidate', benchmarkCase.isLogographic),
    systemPrompt: APP_SYSTEM_PROMPT,
    userPrompt: buildCandidatePrompt(stage, benchmarkCase, sentences),
  });

  if (!call.ok) {
    return {
      call,
      validation: { valid: false, errors: [call.error ?? 'La petición falló.'] },
      error: call.error,
    };
  }

  try {
    const payload = parseStructuredContent(call.messageContent);
    const validation = validateStructuredOutput(
      stage,
      payload,
      sentences.length,
      benchmarkCase.isLogographic,
    );
    return {
      call,
      payload,
      validation,
      error: validation.valid ? undefined : validation.errors.join(' '),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Respuesta estructurada inválida.';
    return {
      call,
      validation: { valid: false, errors: [message] },
      error: message,
    };
  }
};

const mergeBatchOutputs = (
  stage: 'translation' | 'gloss',
  batches: ParsedBatch[],
): JsonValue | undefined => {
  if (batches.some((batch) => !batch.validation.valid || !batch.payload)) {
    return undefined;
  }

  if (stage === 'translation') {
    return {
      translations: batches.flatMap((batch) => {
        const payload = batch.payload as { translations: JsonValue[] };
        return payload.translations;
      }),
    };
  }

  return {
    glosses: batches.flatMap((batch) => {
      const payload = batch.payload as { glosses: JsonValue[] };
      return payload.glosses;
    }),
  };
};

const runBatchedStage = async (
  client: OpenRouterClient,
  stage: 'translation' | 'gloss',
  benchmarkCase: BenchmarkCase,
  candidateModel: string,
): Promise<{ result: StageResult; calls: CallResult[] }> => {
  const batches = chunk(benchmarkCase.sentences, BATCH_SIZE);
  const parsedBatches = await Promise.all(
    batches.map((sentences, index) =>
      runBatchCall(client, stage, benchmarkCase, candidateModel, sentences, index),
    ),
  );
  const calls = parsedBatches.map((batch) => batch.call);
  const errors = parsedBatches.flatMap((batch) => batch.validation.errors);
  const output = mergeBatchOutputs(stage, parsedBatches);
  const validation = {
    valid: errors.length === 0 && output !== undefined,
    errors: [...new Set(errors)],
  };

  return {
    result: {
      stage,
      valid: validation.valid,
      output,
      validation,
      callIds: calls.map((call) => call.callId),
      error: validation.valid ? undefined : validation.errors.join(' '),
    },
    calls,
  };
};

const runGrammarStage = async (
  client: OpenRouterClient,
  benchmarkCase: BenchmarkCase,
  candidateModel: string,
): Promise<{ result: StageResult; calls: CallResult[] }> => {
  const call = await client.complete({
    actor: 'candidate',
    model: candidateModel,
    candidateModel,
    caseId: benchmarkCase.id,
    stage: 'grammar',
    schemaName: schemaName('grammar', 'candidate', benchmarkCase.isLogographic),
    schema: schemaFor('grammar', 'candidate', benchmarkCase.isLogographic),
    systemPrompt: APP_SYSTEM_PROMPT,
    userPrompt: buildCandidatePrompt('grammar', benchmarkCase, benchmarkCase.sentences),
  });

  if (!call.ok) {
    return {
      result: {
        stage: 'grammar',
        valid: false,
        validation: { valid: false, errors: [call.error ?? 'La petición falló.'] },
        callIds: [call.callId],
        error: call.error,
      },
      calls: [call],
    };
  }

  try {
    const output = parseStructuredContent(call.messageContent);
    const validation = validateStructuredOutput('grammar', output, 1, benchmarkCase.isLogographic);
    return {
      result: {
        stage: 'grammar',
        valid: validation.valid,
        output,
        validation,
        callIds: [call.callId],
        error: validation.valid ? undefined : validation.errors.join(' '),
      },
      calls: [call],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Respuesta estructurada inválida.';
    return {
      result: {
        stage: 'grammar',
        valid: false,
        validation: { valid: false, errors: [message] },
        callIds: [call.callId],
        error: message,
      },
      calls: [call],
    };
  }
};

export const runCandidateCase = async (
  client: OpenRouterClient,
  benchmarkCase: BenchmarkCase,
  candidateModel: string,
  repetition: number,
): Promise<CandidateRun> => {
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const startedAtMs = performance.now();
  const [translation, gloss, grammar] = await Promise.all([
    runBatchedStage(client, 'translation', benchmarkCase, candidateModel),
    runBatchedStage(client, 'gloss', benchmarkCase, candidateModel),
    runGrammarStage(client, benchmarkCase, candidateModel),
  ]);
  const endedAt = new Date().toISOString();

  return {
    runId,
    caseId: benchmarkCase.id,
    candidateModel,
    repetition,
    startedAt,
    endedAt,
    elapsedMs: performance.now() - startedAtMs,
    stages: {
      translation: translation.result,
      gloss: gloss.result,
      grammar: grammar.result,
    },
    calls: [...translation.calls, ...gloss.calls, ...grammar.calls],
  };
};
