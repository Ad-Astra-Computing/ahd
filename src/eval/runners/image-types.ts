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
  // Provider-side identifier for this image-gen call. See the
  // text-runner equivalent in types.ts for the header order.
  requestId?: string;
}

export interface ImageRunner {
  id: string;
  provider: string;
  kind: "image";
  run(input: ImageRunnerInput): Promise<ImageRunnerOutput>;
}
