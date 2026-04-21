export type Condition = "raw" | "compiled";
export type ModelId = string;

export interface EvalSample {
  model: ModelId;
  condition: Condition;
  sampleId: string;
  html: string;
}

export interface ScoredSample {
  sample: EvalSample;
  tellsFired: string[];
  violationCount: number;
}

export interface CellCounts {
  attempted: number;
  errored: number;
  extractionFailed: number;
  scored: number;
}

export interface EvalCell {
  model: ModelId;
  condition: Condition;
  n: number;
  meanTells: number;
  perTellFrequency: Record<string, number>;
  counts: CellCounts;
  canonicalModelId: string;
}

export interface EvalReport {
  token: string;
  runAt: string;
  cells: EvalCell[];
  deltas: Array<{
    model: ModelId;
    canonicalModelId: string;
    rawMeanTells: number;
    compiledMeanTells: number;
    delta: number;
    reductionPct: number;
    rawScored: number;
    compiledScored: number;
  }>;
  caveats: string[];
  runManifest?: RunManifest;
}

export interface RunManifest {
  token: string;
  briefPath: string;
  n: number;
  maxTokens: number;
  runAt: string;
  models: Array<{
    spec: string;
    canonicalId: string;
    sanitizedId: string;
    provider: string;
  }>;
}
