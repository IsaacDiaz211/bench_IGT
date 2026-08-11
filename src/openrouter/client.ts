import type {
  CallActor,
  CallResult,
  GenerationMetadata,
  JsonObject,
  JsonValue,
  ModelPricing,
  Stage,
  UsageSnapshot,
} from '../core/types.ts';
import { asJsonValue, asNonEmptyString, asNumber, isRecord, sleep } from '../core/utils.ts';
import type { JsonSchema } from './schemas.ts';

interface OpenRouterClientConfig {
  apiKey: string;
  baseUrl: string;
  httpReferer: string;
  appTitle: string;
  timeoutMs: number;
}

interface CompleteInput {
  actor: CallActor;
  model: string;
  candidateModel: string;
  judgeModel?: string;
  caseId: string;
  stage: Stage;
  batchIndex?: number;
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

  return `OpenRouter HTTP ${status}`;
};

const extractGenerationId = (response: Response, body: unknown): string | undefined => {
  const fromHeader =
    response.headers.get('x-openrouter-generation-id') ?? response.headers.get('x-generation-id');
  if (fromHeader?.trim()) {
    return fromHeader.trim();
  }

  if (isRecord(body)) {
    return asNonEmptyString(body.generation_id) ?? asNonEmptyString(body.id);
  }

  return undefined;
};

const extractUsage = (body: unknown): UsageSnapshot => {
  if (!isRecord(body) || !isRecord(body.usage)) {
    return {};
  }

  const usage = body.usage;
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
    cachedTokens: firstNumber(usage.cached_tokens, usage.cachedTokens, usage.nativeTokensCached),
    costUsd: firstNumber(usage.cost, usage.total_cost, usage.totalCost),
  };
};

const extractGenerationMetadata = (value: unknown): GenerationMetadata | undefined => {
  const data = isRecord(value) && isRecord(value.data) ? value.data : value;
  if (!isRecord(data)) {
    return undefined;
  }

  const metadata: GenerationMetadata = {
    id: asNonEmptyString(data.id),
    model: asNonEmptyString(data.model),
    providerName: asNonEmptyString(data.provider_name) ?? asNonEmptyString(data.providerName),
    totalCostUsd: firstNumber(data.total_cost, data.totalCost, data.cost),
    latencyMs: firstNumber(data.latency),
    generationTimeMs: firstNumber(data.generation_time, data.generationTime),
    finishReason: asNonEmptyString(data.finish_reason) ?? asNonEmptyString(data.finishReason),
    nativeFinishReason:
      asNonEmptyString(data.native_finish_reason) ?? asNonEmptyString(data.nativeFinishReason),
  };

  return Object.values(metadata).some((item) => item !== undefined) ? metadata : undefined;
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
      strict: true,
      schema: input.schema,
    },
  },
  messages: [
    { role: 'system', content: input.systemPrompt },
    { role: 'user', content: input.userPrompt },
  ],
});

export class OpenRouterClient {
  private readonly config: OpenRouterClientConfig;
  private readonly pricing = new Map<string, ModelPricing>();

  public constructor(config: OpenRouterClientConfig) {
    if (!config.apiKey) {
      throw new Error('Falta OPENROUTER_API_KEY.');
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
    });

    if (!response.ok) {
      throw new Error(readErrorMessage(response.body, response.status));
    }

    if (!isRecord(response.body) || !Array.isArray(response.body.data)) {
      throw new Error('OpenRouter devolvió un catálogo de modelos inválido.');
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
    let generation: GenerationMetadata | undefined;
    let error: string | undefined;
    let ok = false;
    let statsLookupMs = 0;

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
        const generationId = extractGenerationId(response.response, response.body);
        if (generationId) {
          const statsStartedAt = performance.now();
          generation = await this.getGenerationMetadata(generationId);
          statsLookupMs = performance.now() - statsStartedAt;
        }
        usage = this.withResolvedCost(input.model, usage, generation);
      }
    } catch (caughtError) {
      error = caughtError instanceof Error ? caughtError.message : 'Error desconocido de red.';
    }

    const endedAt = new Date().toISOString();
    return {
      callId,
      actor: input.actor,
      model: input.model,
      candidateModel: input.candidateModel,
      judgeModel: input.judgeModel,
      caseId: input.caseId,
      stage: input.stage,
      batchIndex: input.batchIndex,
      startedAt,
      endedAt,
      latencyMs: performance.now() - startedAtMs - statsLookupMs,
      statsLookupMs,
      ok,
      status,
      requestBody,
      responseBody,
      messageContent,
      error,
      usage,
      generation,
    };
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (this.config.httpReferer) {
      headers['HTTP-Referer'] = this.config.httpReferer;
    }
    if (this.config.appTitle) {
      headers['X-Title'] = this.config.appTitle;
    }

    return headers;
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

  private async getGenerationMetadata(
    generationId: string,
  ): Promise<GenerationMetadata | undefined> {
    for (const delay of [0, 250, 750]) {
      if (delay) {
        await sleep(delay);
      }

      try {
        const response = await this.fetchJson(
          `${this.config.baseUrl}/generation?id=${encodeURIComponent(generationId)}`,
          {
            method: 'GET',
            headers: this.headers(),
          },
        );
        if (response.ok) {
          const metadata = extractGenerationMetadata(response.body);
          if (metadata) {
            return metadata;
          }
        }
      } catch {
        // The response usage or pricing catalogue remains available as fallback.
      }
    }

    return undefined;
  }

  private withResolvedCost(
    model: string,
    usage: UsageSnapshot,
    generation: GenerationMetadata | undefined,
  ): UsageSnapshot {
    const generationCost = generation?.totalCostUsd;
    if (generationCost !== undefined) {
      return {
        ...usage,
        promptTokens: usage.promptTokens ?? undefined,
        costUsd: generationCost,
        costSource: 'generation_metadata',
        costEstimated: false,
      };
    }

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
