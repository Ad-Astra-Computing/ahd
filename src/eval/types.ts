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

export interface EvalCell {
  model: ModelId;
  condition: Condition;
  n: number;
  meanTells: number;
  perTellFrequency: Record<string, number>;
}

export interface EvalReport {
  token: string;
  runAt: string;
  cells: EvalCell[];
  deltas: Array<{
    model: ModelId;
    rawMeanTells: number;
    compiledMeanTells: number;
    delta: number;
    reductionPct: number;
  }>;
  caveats: string[];
}
