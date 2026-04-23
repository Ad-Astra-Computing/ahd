export interface ImageRunnerInput {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  numSteps?: number;
}

export interface ImageRunnerOutput {
  model: string;
  pngBase64: string;
  rawResponse: unknown;
  latencyMs: number;
}

export interface ImageRunner {
  id: string;
  provider: string;
  kind: "image";
  run(input: ImageRunnerInput): Promise<ImageRunnerOutput>;
}
