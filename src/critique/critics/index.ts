import type { Critic } from "../critic.js";
import { mockCritic, anthropicVisionCritic } from "../critic.js";
import { claudeCodeVisionCritic } from "./claude-code.js";

export type CriticSpec = "mock" | "claude-code" | "anthropic";

export interface ResolveCriticOptions {
  anthropicApiKey?: string;
  anthropicModel?: string;
  claudeCodeModel?: string;
}

// Dispatcher for the --critic flag. `claude-code` is the default when no
// spec is provided because it's the only path that doesn't require a
// separate API key on top of whatever the user already pays for.
// `anthropic` remains fully functional as a fallback.
export function resolveCritic(
  spec: string | undefined,
  opts: ResolveCriticOptions = {},
): Critic {
  const s = (spec ?? "claude-code") as CriticSpec;
  switch (s) {
    case "mock":
      return mockCritic({});
    case "claude-code":
      return claudeCodeVisionCritic({ model: opts.claudeCodeModel });
    case "anthropic": {
      const key = opts.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY;
      if (!key) {
        throw new Error(
          "--critic anthropic requires ANTHROPIC_API_KEY; set the env var or pass --critic claude-code for subscription-backed auth, or --critic mock for offline scoring.",
        );
      }
      return anthropicVisionCritic({
        apiKey: key,
        model: opts.anthropicModel,
      });
    }
    default:
      throw new Error(
        `Unknown --critic spec "${spec}". Expected one of: mock, claude-code, anthropic.`,
      );
  }
}

export { claudeCodeVisionCritic };
