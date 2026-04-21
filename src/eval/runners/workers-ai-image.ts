import type {
  ImageRunner,
  ImageRunnerInput,
  ImageRunnerOutput,
} from "./image-types.js";

export const WORKERS_AI_IMAGE_DEFAULTS = [
  "@cf/black-forest-labs/flux-1-schnell",
  "@cf/bytedance/stable-diffusion-xl-lightning",
  "@cf/lykon/dreamshaper-8-lcm",
  "@cf/stabilityai/stable-diffusion-xl-base-1.0",
] as const;

function b64FromBinary(buf: ArrayBuffer): string {
  return Buffer.from(new Uint8Array(buf)).toString("base64");
}

export function workersAiImageRunner(options: {
  apiToken: string;
  accountId: string;
  model: string;
}): ImageRunner {
  const url = `https://api.cloudflare.com/client/v4/accounts/${options.accountId}/ai/run/${options.model}`;
  return {
    id: options.model,
    provider: "cloudflare-workers-ai-image",
    kind: "image",
    async run(input: ImageRunnerInput): Promise<ImageRunnerOutput> {
      const start = Date.now();
      const MAX_PROMPT = 2000;
      const truncate = (s: string) =>
        s.length > MAX_PROMPT ? s.slice(0, MAX_PROMPT) : s;
      const body: Record<string, unknown> = {
        prompt: truncate(input.prompt),
      };
      if (input.negativePrompt)
        body.negative_prompt = truncate(input.negativePrompt);
      if (input.width) body.width = input.width;
      if (input.height) body.height = input.height;
      if (input.seed != null) body.seed = input.seed;
      if (input.numSteps != null) body.num_steps = input.numSteps;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(
          `workers-ai-image ${options.model}: ${res.status} ${(await res.text()).slice(0, 500)}`,
        );
      }
      const contentType = res.headers.get("content-type") ?? "";
      let pngBase64: string;
      let rawResponse: unknown;
      if (contentType.includes("application/json")) {
        const data: any = await res.json();
        rawResponse = data;
        const img = data?.result?.image;
        if (typeof img !== "string") {
          throw new Error(
            `workers-ai-image ${options.model}: no result.image in JSON response`,
          );
        }
        pngBase64 = img;
      } else {
        const buf = await res.arrayBuffer();
        pngBase64 = b64FromBinary(buf);
        rawResponse = { contentType, bytes: buf.byteLength };
      }
      return {
        model: options.model,
        pngBase64,
        rawResponse,
        latencyMs: Date.now() - start,
      };
    },
  };
}
