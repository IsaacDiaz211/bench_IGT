import type {
  CallActor,
  CallResult,
  JsonObject,
  JsonValue,
  ModelPricing,
  Stage,
  UsageSnapshot,
} from '../core/types.ts';
import { asJsonValue, asNonEmptyString, asNumber, isRecord } from '../core/utils.ts';
import type { JsonSchema } from '../openrouter/schemas.ts';

interface FireworksClientConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
}

interface CompleteInput {
  actor: CallActor;
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
}

interface ModelCatalogEntry {
  id?: unknown;
  pricing?: unknown;
}

const firstNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const number = asNumber(value);
    if (number !== undefined) {
      return number;
    }
  }
  return undefined;
};

const parseResponseBody = (rawText: string): unknown => {
  if (!rawText.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return rawText;
  }
};

const readMessageContent = (body: unknown): JsonValue | undefined => {
  if (!isRecord(body) || !Array.isArray(body.choices)) {
    return undefined;
  }

  const firstChoice = body.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    return undefined;
  }

  return asJsonValue(firstChoice.message.content);
};

const readErrorMessage = (body: unknown, status: number): string => {
  if (isRecord(body) && isRecord(body.error)) {
    const message = asNonEmptyString(body.error.message);
    if (message) {
      return message;
    }
  }

  if (typeof body === 'string' && body.trim()) {
    return body.trim().slice(0, 500);
  }

  return `Fireworks HTTP ${status}`;
};

const extractUsage = (body: unknown): UsageSnapshot => {
  if (!isRecord(body) || !isRecord(body.usage)) {
    return {};
  }

  const usage = body.usage;
  const promptTokenDetails = isRecord(usage.prompt_tokens_details)
    ? usage.prompt_tokens_details
    : undefined;
  return {
    promptTokens: firstNumber(usage.prompt_tokens, usage.promptTokens, usage.tokensPrompt),
    completionTokens: firstNumber(
      usage.completion_tokens,
      usage.completionTokens,
      usage.tokensCompletion,
    ),
    totalTokens: firstNumber(usage.total_tokens, usage.totalTokens),
    reasoningTokens: firstNumber(
      usage.reasoning_tokens,
      usage.reasoningTokens,
      usage.nativeTokensReasoning,
    ),
    cachedTokens: firstNumber(
      usage.cached_tokens,
      usage.cachedTokens,
      usage.nativeTokensCached,
      promptTokenDetails?.cached_tokens,
      promptTokenDetails?.cachedTokens,
    ),
    cacheWriteTokens: firstNumber(
      usage.cache_write_tokens,
      usage.cacheWriteTokens,
      promptTokenDetails?.cache_write_tokens,
      promptTokenDetails?.cacheWriteTokens,
    ),
    costUsd: firstNumber(usage.cost, usage.total_cost, usage.totalCost),
  };
};

const parsePricing = (model: ModelCatalogEntry): ModelPricing | undefined => {
  const id = asNonEmptyString(model.id);
  if (!id || !isRecord(model.pricing)) {
    return undefined;
  }

  return {
    model: id,
    promptPerToken: firstNumber(model.pricing.prompt),
    completionPerToken: firstNumber(model.pricing.completion),
    requestPerCall: firstNumber(model.pricing.request),
  };
};

const makeRequestBody = (input: CompleteInput): JsonObject => ({
  model: input.model,
  temperature: 0.2,
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: input.schemaName,
      schema: input.schema,
    },
  },
  messages: [
    { role: 'system', content: input.systemPrompt },
    { role: 'user', content: input.userPrompt },
  ],
});

export class FireworksClient {
  private readonly config: FireworksClientConfig;
  private readonly pricing = new Map<string, ModelPricing>();

  public constructor(config: FireworksClientConfig) {
    if (!config.apiKey) {
      throw new Error('Falta FIREWORKS_API_KEY.');
    }

    this.config = config;
  }

  public setPricing(pricing: readonly ModelPricing[]): void {
    this.pricing.clear();
    for (const item of pricing) {
      this.pricing.set(item.model, item);
    }
  }

  public async listModels(): Promise<unknown[]> {
    const response = await this.fetchJson(`${this.config.baseUrl}/models`, {
      method: 'GET',
      headers: this.headers(),
    });

    if (!response.ok) {
      throw new Error(readErrorMessage(response.body, response.status));
    }

    if (!isRecord(response.body) || !Array.isArray(response.body.data)) {
      throw new Error('Fireworks devolvió un catálogo de modelos inválido.');
    }

    return response.body.data;
  }

  public async loadPricing(): Promise<ModelPricing[]> {
    const models = await this.listModels();
    const pricing = models
      .map((model) => parsePricing(model as ModelCatalogEntry))
      .filter((item): item is ModelPricing => item !== undefined);
    this.setPricing(pricing);
    return pricing;
  }

  public async complete(input: CompleteInput): Promise<CallResult> {
    const callId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const startedAtMs = performance.now();
    const requestBody = makeRequestBody(input);
    let responseBody: JsonValue | undefined;
    let messageContent: JsonValue | undefined;
    let status: number | undefined;
    let usage: UsageSnapshot = {};
    let error: string | undefined;
    let ok = false;

    try {
      const response = await this.fetchJson(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(requestBody),
      });
      status = response.status;
      responseBody = asJsonValue(response.body);
      usage = extractUsage(response.body);
      messageContent = readMessageContent(response.body);

      if (!response.ok) {
        error = readErrorMessage(response.body, response.status);
      } else {
        ok = true;
        usage = this.withResolvedCost(input.model, usage);
      }
    } catch (caughtError) {
      error = caughtError instanceof Error ? caughtError.message : 'Error desconocido de red.';
    }

    const endedAt = new Date().toISOString();
    return {
      callId,
      actor: input.actor,
      provider: 'fireworks',
      model: input.model,
      evaluatedModel: input.evaluatedModel,
      caseId: input.caseId,
      stage: input.stage,
      batchIndex: input.batchIndex,
      repetition: input.repetition,
      startedAt,
      endedAt,
      latencyMs: performance.now() - startedAtMs,
      statsLookupMs: 0,
      ok,
      status,
      requestBody,
      responseBody,
      messageContent,
      error,
      usage,
      generation: undefined,
    };
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJson(
    url: string,
    init: RequestInit,
  ): Promise<{ response: Response; status: number; ok: boolean; body: unknown }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const rawText = await response.text();
      return {
        response,
        status: response.status,
        ok: response.ok,
        body: parseResponseBody(rawText),
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`La petición superó el timeout de ${this.config.timeoutMs} ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private withResolvedCost(model: string, usage: UsageSnapshot): UsageSnapshot {
    if (usage.costUsd !== undefined) {
      return {
        ...usage,
        costSource: 'response_usage',
        costEstimated: false,
      };
    }

    const modelPricing = this.pricing.get(model);
    if (!modelPricing) {
      return usage;
    }

    const promptCost = (usage.promptTokens ?? 0) * (modelPricing.promptPerToken ?? 0);
    const completionCost = (usage.completionTokens ?? 0) * (modelPricing.completionPerToken ?? 0);
    const requestCost = modelPricing.requestPerCall ?? 0;
    const hasTokenPricing =
      usage.promptTokens !== undefined || usage.completionTokens !== undefined;

    if (!hasTokenPricing && requestCost === 0) {
      return usage;
    }

    return {
      ...usage,
      costUsd: promptCost + completionCost + requestCost,
      costSource: 'pricing_estimate',
      costEstimated: true,
    };
  }
}
