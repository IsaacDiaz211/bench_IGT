import type { BenchmarkCase, CallResult, CandidateRun, JudgeRecord, Stage } from '../core/types.ts';
import type { JsonSchema } from '../openrouter/schemas.ts';
import { judgeDimensions, schemaFor, schemaName } from '../openrouter/schemas.ts';
import { buildJudgePrompt, JUDGE_SYSTEM_PROMPT } from '../stages/prompts.ts';
import { parseStructuredContent, validateJudgeOutput } from '../validation/structured.ts';

interface JudgeClient {
  complete(input: {
    actor: 'judge';
    model: string;
    evaluatedModel: string;
    caseId: string;
    stage: Stage;
    batchIndex?: number;
    repetition: number;
    schemaName: string;
    schema: JsonSchema;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<CallResult>;
}

const judgeStage = async (
  client: JudgeClient,
  benchmarkCase: BenchmarkCase,
  candidateRun: CandidateRun,
  stage: Stage,
  judgeModel: string,
): Promise<JudgeRecord> => {
  const stageResult = candidateRun.stages[stage];
  const candidateOutput = stageResult.output;
  const call = await client.complete({
    actor: 'judge',
    model: judgeModel,
    evaluatedModel: candidateRun.candidateModel,
    caseId: benchmarkCase.id,
    stage,
    repetition: candidateRun.repetition,
    schemaName: schemaName(stage, 'judge', benchmarkCase.isLogographic),
    schema: schemaFor(stage, 'judge', benchmarkCase.isLogographic),
    systemPrompt: JUDGE_SYSTEM_PROMPT,
    userPrompt: buildJudgePrompt(stage, benchmarkCase, candidateOutput),
  });

  if (!call.ok) {
    return {
      judgeCall: call,
      candidateRunId: candidateRun.runId,
      valid: false,
      validation: { valid: false, errors: [call.error ?? 'La petición del juez falló.'] },
    };
  }

  try {
    const result = parseStructuredContent(call.messageContent);
    const validation = validateJudgeOutput(
      result,
      judgeDimensions(stage, benchmarkCase.isLogographic),
    );
    return {
      judgeCall: call,
      candidateRunId: candidateRun.runId,
      valid: validation.valid,
      result,
      validation,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Respuesta del juez inválida.';
    return {
      judgeCall: call,
      candidateRunId: candidateRun.runId,
      valid: false,
      validation: { valid: false, errors: [message] },
    };
  }
};

const resolveJudgeClient = (
  clientOrGet: JudgeClient | ((model: string) => JudgeClient),
): ((model: string) => JudgeClient) => {
  if (typeof clientOrGet === 'function') {
    return clientOrGet as (model: string) => JudgeClient;
  }
  const single = clientOrGet as JudgeClient;
  return () => single;
};

export const judgeCandidateRun = async (
  clientOrGet: JudgeClient | ((model: string) => JudgeClient),
  benchmarkCase: BenchmarkCase,
  candidateRun: CandidateRun,
  judgeModels: readonly string[],
  onRecord?: (record: JudgeRecord) => Promise<void>,
): Promise<JudgeRecord[]> => {
  const getClient = resolveJudgeClient(clientOrGet);
  const records: JudgeRecord[] = [];

  for (const stage of ['translation', 'gloss', 'grammar'] as const) {
    if (!candidateRun.stages[stage].valid || candidateRun.stages[stage].output === undefined) {
      continue;
    }

    for (const judgeModel of judgeModels) {
      const client = getClient(judgeModel);
      const record = await judgeStage(client, benchmarkCase, candidateRun, stage, judgeModel);
      records.push(record);
      await onRecord?.(record);
    }
  }

  return records;
};
