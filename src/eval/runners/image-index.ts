import { workersAiImageRunner } from "./workers-ai-image.js";
import type { ImageRunner } from "./image-types.js";

export function imageRunnerFromSpec(spec: string): ImageRunner {
  if (spec.startsWith("cfimg:")) {
    const model = spec.slice("cfimg:".length);
    const token = process.env.CF_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN;
    const account =
      process.env.CF_ACCOUNT_ID ?? process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!token) throw new Error("CF_API_TOKEN is not set");
    if (!account) throw new Error("CF_ACCOUNT_ID is not set");
    return workersAiImageRunner({ apiToken: token, accountId: account, model });
  }
  throw new Error(
    `Unknown image model spec: ${spec}. Use 'cfimg:@cf/vendor/model' for Cloudflare Workers AI.`,
  );
}

export { workersAiImageRunner };
export type { ImageRunner, ImageRunnerInput, ImageRunnerOutput } from "./image-types.js";
