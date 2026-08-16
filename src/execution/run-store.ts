import { appendFile, mkdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AppConfig } from '../core/config.ts';
import type {
  BenchmarkRun,
  CallResult,
  CandidateRun,
  JudgeRecord,
  ModelPricing,
} from '../core/types.ts';

export interface RunManifest {
  schemaVersion: '1.0';
  status: 'running' | 'completed' | 'failed';
  runId: string;
  startedAt: string;
  endedAt?: string;
  datasetPath: string;
  datasetCaseCount: number;
  candidateModels: string[];
  judgeModels: string[];
  repetitions: number;
  seed: string;
  promptVersion: string;
  totalJobs: number;
  pricing: ModelPricing[];
  error?: string;
}

interface RunProgress {
  status: RunManifest['status'];
  runId: string;
  totalJobs: number;
  completedJobs: number;
  candidateRunsPersisted: number;
  judgeRecordsPersisted: number;
  callsPersisted: number;
  updatedAt: string;
  lastJob?: {
    candidateModel: string;
    caseId: string;
    repetition: number;
  };
  error?: string;
}

const toJsonLine = (value: unknown): string => `${JSON.stringify(value)}\n`;

const callMetadata = (call: CallResult): Record<string, unknown> => ({
  callId: call.callId,
  actor: call.actor,
  model: call.model,
  evaluatedModel: call.evaluatedModel,
  caseId: call.caseId,
  stage: call.stage,
  batchIndex: call.batchIndex,
  repetition: call.repetition,
  startedAt: call.startedAt,
  endedAt: call.endedAt,
  latencyMs: call.latencyMs,
  statsLookupMs: call.statsLookupMs,
});

const readJsonLines = async <T>(path: string): Promise<T[]> => {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return [];
  }

  const lines = (await file.text()).split(/\r?\n/).filter(Boolean);
  return lines
    .map((line, index) => {
      try {
        return JSON.parse(line) as T;
      } catch {
        if (index === lines.length - 1) {
          return undefined as T;
        }
        throw new Error(`JSONL inválido en ${path}, línea ${index + 1}.`);
      }
    })
    .filter((item): item is T => item !== undefined);
};

export const jobKey = (candidateModel: string, caseId: string, repetition: number): string => {
  return JSON.stringify([candidateModel, caseId, repetition]);
};

export class RunStore {
  private queue: Promise<void> = Promise.resolve();
  private completedJobs = 0;
  private candidateRunsPersisted = 0;
  private judgeRecordsPersisted = 0;
  private callsPersisted = 0;
  private readonly completedJobKeys = new Set<string>();

  private constructor(
    public readonly directory: string,
    private readonly manifest: RunManifest,
  ) {}

  public static async start(
    config: AppConfig,
    runId: string,
    datasetCaseCount: number,
    totalJobs: number,
    promptVersion: string,
  ): Promise<RunStore> {
    const directory = join(config.outputDir, runId);
    await mkdir(directory, { recursive: true });
    const manifest: RunManifest = {
      schemaVersion: '1.0',
      status: 'running',
      runId,
      startedAt: new Date().toISOString(),
      datasetPath: config.datasetPath,
      datasetCaseCount,
      candidateModels: config.models,
      judgeModels: config.judges,
      repetitions: config.repetitions,
      seed: config.seed,
      promptVersion,
      totalJobs,
      pricing: [],
    };
    const store = new RunStore(directory, manifest);
    await store.writeInitialState();
    return store;
  }

  public static async resume(directory: string): Promise<RunStore> {
    const manifest = JSON.parse(
      await Bun.file(join(directory, 'manifest.json')).text(),
    ) as RunManifest;
    const store = new RunStore(directory, manifest);
    const completed = await readJsonLines<{ jobKey: string }>(join(directory, 'completed.jsonl'));
    for (const item of completed) {
      store.completedJobKeys.add(item.jobKey);
    }
    const progressFile = Bun.file(join(directory, 'progress.json'));
    if (await progressFile.exists()) {
      const progress = JSON.parse(await progressFile.text()) as Partial<RunProgress>;
      store.completedJobs = progress.completedJobs ?? completed.length;
      store.candidateRunsPersisted = progress.candidateRunsPersisted ?? 0;
      store.judgeRecordsPersisted = progress.judgeRecordsPersisted ?? 0;
      store.callsPersisted = progress.callsPersisted ?? 0;
    } else {
      store.completedJobs = completed.length;
    }
    store.manifest.status = 'running';
    await store.writeManifestUnsafe();
    await store.writeProgressUnsafe();
    return store;
  }

  public get runId(): string {
    return this.manifest.runId;
  }

  public get totalJobs(): number {
    return this.manifest.totalJobs;
  }

  public get completedJobCount(): number {
    return this.completedJobs;
  }

  public isCompleted(candidateModel: string, caseId: string, repetition: number): boolean {
    return this.completedJobKeys.has(jobKey(candidateModel, caseId, repetition));
  }

  public async setPricing(pricing: ModelPricing[]): Promise<void> {
    await this.enqueue(async () => {
      this.manifest.pricing = pricing;
      await this.writeManifestUnsafe();
    });
  }

  public async addJudgeModels(models: readonly string[]): Promise<void> {
    await this.enqueue(async () => {
      for (const model of models) {
        if (!this.manifest.judgeModels.includes(model)) {
          this.manifest.judgeModels.push(model);
        }
      }
      await this.writeManifestUnsafe();
    });
  }

  public async recordCandidateRun(candidateRun: CandidateRun): Promise<void> {
    await this.enqueue(async () => {
      await this.appendLineUnsafe('candidate-runs.jsonl', candidateRun);
      for (const stage of Object.values(candidateRun.stages)) {
        await this.appendLineUnsafe('validations.jsonl', {
          candidateRunId: candidateRun.runId,
          candidateModel: candidateRun.candidateModel,
          caseId: candidateRun.caseId,
          repetition: candidateRun.repetition,
          stage: stage.stage,
          valid: stage.valid,
          validation: stage.validation,
        });
      }
      await this.appendCallArtifactsUnsafe(candidateRun.calls);
      this.candidateRunsPersisted += 1;
      this.callsPersisted += candidateRun.calls.length;
      await this.writeProgressUnsafe();
    });
  }

  public async recordJudgeRecord(record: JudgeRecord): Promise<void> {
    await this.enqueue(async () => {
      await this.appendLineUnsafe('judgements.jsonl', record);
      await this.appendLineUnsafe('validations.jsonl', {
        candidateRunId: record.candidateRunId,
        evaluatedModel: record.judgeCall.evaluatedModel,
        caseId: record.judgeCall.caseId,
        repetition: record.judgeCall.repetition,
        stage: record.judgeCall.stage,
        actor: 'judge',
        valid: record.valid,
        validation: record.validation,
      });
      await this.appendCallArtifactsUnsafe([record.judgeCall]);
      this.judgeRecordsPersisted += 1;
      this.callsPersisted += 1;
      await this.writeProgressUnsafe();
    });
  }

  public async completeJob(
    candidateModel: string,
    caseId: string,
    repetition: number,
  ): Promise<void> {
    await this.enqueue(async () => {
      await this.appendLineUnsafe('completed.jsonl', {
        jobKey: jobKey(candidateModel, caseId, repetition),
        candidateModel,
        caseId,
        repetition,
        completedAt: new Date().toISOString(),
      });
      this.completedJobKeys.add(jobKey(candidateModel, caseId, repetition));
      this.completedJobs += 1;
      await this.writeProgressUnsafe({ candidateModel, caseId, repetition });
    });
  }

  public async finish(run: BenchmarkRun, report: unknown, reportMarkdown: string): Promise<void> {
    await this.enqueue(async () => {
      this.manifest.status = 'completed';
      this.manifest.endedAt = new Date().toISOString();
      await this.atomicWriteUnsafe('run.json', JSON.stringify(run, null, 2));
      await this.atomicWriteUnsafe('report.json', JSON.stringify(report, null, 2));
      await this.atomicWriteUnsafe('report.md', reportMarkdown);
      await this.writeManifestUnsafe();
      await this.writeProgressUnsafe();
    });
  }

  public async fail(error: unknown): Promise<void> {
    await this.enqueue(async () => {
      this.manifest.status = 'failed';
      this.manifest.endedAt = new Date().toISOString();
      this.manifest.error = error instanceof Error ? error.message : String(error);
      await this.writeManifestUnsafe();
      await this.writeProgressUnsafe(undefined, this.manifest.error);
    });
  }

  private async writeInitialState(): Promise<void> {
    await this.writeManifestUnsafe();
    await this.writeProgressUnsafe();
  }

  private async appendLineUnsafe(fileName: string, value: unknown): Promise<void> {
    await appendFile(join(this.directory, fileName), toJsonLine(value), 'utf8');
  }

  private async appendCallArtifactsUnsafe(calls: readonly CallResult[]): Promise<void> {
    for (const call of calls) {
      const metadata = callMetadata(call);
      await this.appendLineUnsafe('requests.jsonl', { ...metadata, body: call.requestBody });
      await this.appendLineUnsafe('responses.jsonl', {
        ...metadata,
        ok: call.ok,
        status: call.status,
        body: call.responseBody,
        messageContent: call.messageContent,
        error: call.error,
      });
      await this.appendLineUnsafe('usage.jsonl', {
        ...metadata,
        usage: call.usage,
        generation: call.generation,
      });
    }
  }

  private async writeManifestUnsafe(): Promise<void> {
    await this.atomicWriteUnsafe('manifest.json', JSON.stringify(this.manifest, null, 2));
  }

  private async writeProgressUnsafe(
    lastJob?: RunProgress['lastJob'],
    error?: string,
  ): Promise<void> {
    const progress: RunProgress = {
      status: this.manifest.status,
      runId: this.manifest.runId,
      totalJobs: this.manifest.totalJobs,
      completedJobs: this.completedJobs,
      candidateRunsPersisted: this.candidateRunsPersisted,
      judgeRecordsPersisted: this.judgeRecordsPersisted,
      callsPersisted: this.callsPersisted,
      updatedAt: new Date().toISOString(),
      lastJob,
      error,
    };
    await this.atomicWriteUnsafe('progress.json', JSON.stringify(progress, null, 2));
  }

  private async atomicWriteUnsafe(fileName: string, content: string): Promise<void> {
    const targetPath = join(this.directory, fileName);
    const tempPath = `${targetPath}.tmp`;
    await writeFile(tempPath, content);
    await rename(tempPath, targetPath);
  }

  private async enqueue(operation: () => Promise<void>): Promise<void> {
    const next = this.queue.then(operation);
    this.queue = next.catch(() => undefined);
    return next;
  }
}

export const loadPersistedRun = async (directory: string): Promise<BenchmarkRun> => {
  const manifestPath = join(directory, 'manifest.json');
  const manifest = JSON.parse(await Bun.file(manifestPath).text()) as RunManifest;
  const candidateRuns = await readJsonLines<CandidateRun>(join(directory, 'candidate-runs.jsonl'));
  const judgeRecords = await readJsonLines<JudgeRecord>(join(directory, 'judgements.jsonl'));

  return {
    schemaVersion: manifest.schemaVersion,
    runId: manifest.runId,
    startedAt: manifest.startedAt,
    endedAt: manifest.endedAt ?? new Date().toISOString(),
    datasetPath: manifest.datasetPath,
    datasetCaseCount: manifest.datasetCaseCount,
    candidateModels: manifest.candidateModels,
    judgeModels: manifest.judgeModels,
    repetitions: manifest.repetitions,
    seed: manifest.seed,
    promptVersion: manifest.promptVersion,
    candidateRuns,
    judgeRecords,
    calls: [
      ...candidateRuns.flatMap((candidateRun) => candidateRun.calls),
      ...judgeRecords.map((record) => record.judgeCall),
    ],
    pricing: manifest.pricing,
  };
};
