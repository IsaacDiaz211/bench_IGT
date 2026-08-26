export type Stage = 'translation' | 'gloss' | 'grammar';

export type CallActor = 'candidate' | 'judge';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export interface BenchmarkCase {
  id: string;
  sourceLang: 'en' | 'zh';
  targetLang: 'es';
  text: string;
  sentences: string[];
  isLogographic: boolean;
  tags: string[];
  difficulty?: string;
  source?: string;
}

export interface GlossToken {
  surface: string;
  gloss: string;
  reading?: string;
}

export interface GlossedSentence {
  tokens: GlossToken[];
}

export interface GrammarPoint {
  grammar_point: string;
  sentence: string;
  explanation: string;
}

export interface UsageSnapshot {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
  cachedTokens?: number;
  cacheWriteTokens?: number;
  costUsd?: number;
  costSource?: 'generation_metadata' | 'response_usage' | 'pricing_estimate';
  costEstimated?: boolean;
}

export interface GenerationMetadata {
  id?: string;
  model?: string;
  providerName?: string;
  totalCostUsd?: number;
  latencyMs?: number;
  generationTimeMs?: number;
  finishReason?: string;
  nativeFinishReason?: string;
}

export interface CallResult {
  callId: string;
  actor: CallActor;
  provider?: string;
  model: string;
  evaluatedModel: string;
  caseId: string;
  stage: Stage;
  batchIndex?: number;
  repetition: number;
  startedAt: string;
  endedAt: string;
  latencyMs: number;
  statsLookupMs: number;
  ok: boolean;
  status?: number;
  requestBody: JsonObject;
  responseBody?: JsonValue;
  messageContent?: JsonValue;
  error?: string;
  usage: UsageSnapshot;
  generation?: GenerationMetadata;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface StageResult {
  stage: Stage;
  valid: boolean;
  output?: JsonValue;
  validation: ValidationResult;
  callIds: string[];
  error?: string;
}

export interface CandidateRun {
  runId: string;
  caseId: string;
  candidateModel: string;
  repetition: number;
  startedAt: string;
  endedAt: string;
  elapsedMs: number;
  stages: Record<Stage, StageResult>;
  calls: CallResult[];
}

export interface JudgeRecord {
  judgeCall: CallResult;
  candidateRunId: string;
  valid: boolean;
  result?: JsonValue;
  validation: ValidationResult;
}

export interface ModelPricing {
  model: string;
  promptPerToken?: number;
  completionPerToken?: number;
  requestPerCall?: number;
}

export interface CostSummary {
  amountUsd: number;
  exactAmountUsd: number;
  estimatedAmountUsd: number;
  unknownCalls: number;
  callCount: number;
}

export interface LatencySummary {
  mean: number;
  median: number;
  p95: number;
}

export interface ReliabilitySummary {
  validRate: number;
  transportSuccessRate: number;
  failedCalls: number;
  timeoutCalls: number;
  httpErrors: Record<string, number>;
}

export interface TokenSummary {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  calls: number;
  callsWithUsage: number;
}

export interface JudgeScoreSummary {
  mean: number;
  count: number;
  disagreementMean: number;
  disagreementCount: number;
  byJudge: Record<string, { mean: number; count: number }>;
}

export interface BenchmarkRun {
  schemaVersion: '1.0';
  runId: string;
  startedAt: string;
  endedAt: string;
  datasetPath: string;
  datasetCaseCount: number;
  candidateModels: string[];
  judgeModels: string[];
  repetitions: number;
  seed: string;
  promptVersion: string;
  candidateRuns: CandidateRun[];
  judgeRecords: JudgeRecord[];
  calls: CallResult[];
  pricing: ModelPricing[];
}

export interface CandidateSummary {
  candidateModel: string;
  runCount: number;
  candidateCost: CostSummary;
  judgeCost: CostSummary;
  totalCost: CostSummary;
  reliability: Record<Stage, ReliabilitySummary>;
  latencyMs: Record<Stage, LatencySummary>;
  tokenUsage: Record<Stage, TokenSummary>;
  judgeScores: Record<Stage, JudgeScoreSummary>;
}

export interface BenchmarkReport {
  runId: string;
  generatedAt: string;
  grandTotalCost: CostSummary;
  judgeTotalCost: CostSummary;
  candidateSummaries: CandidateSummary[];
}
