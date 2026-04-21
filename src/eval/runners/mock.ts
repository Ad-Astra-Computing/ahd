import type {
  ModelRunner,
  ModelRunnerInput,
  ModelRunnerOutput,
} from "./types.js";

export function mockRunner(
  id: string,
  responder: (input: ModelRunnerInput) => string,
): ModelRunner {
  return {
    id,
    provider: "mock",
    async run(input) {
      const start = Date.now();
      const html = responder(input);
      const out: ModelRunnerOutput = {
        model: id,
        html,
        rawResponse: html,
        tokens: { in: input.userPrompt.length, out: html.length },
        latencyMs: Date.now() - start,
      };
      return out;
    },
  };
}

export const slopResponder = (): string => `<!doctype html><html><head>
<style>
body { background: #0a0a0a; color: #d4d4d8; font-family: Inter, sans-serif; font-weight: 600; }
.hero { background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899); }
</style></head><body>
<section class="hero">
  <h1 class="bg-clip-text text-transparent bg-gradient-to-r">Build the future of AI</h1>
  <p>Ship faster. Seamless. AI-native.</p>
</section>
<ul><li>✨ One</li><li>🚀 Two</li><li>⚡ Three</li></ul>
</body></html>`;

export const swissResponder = (): string => `<!doctype html><html><head>
<style>
@font-face { font-family: 'Neue Haas Grotesk Display'; src: local(sans-serif); }
body { font-family: 'Tiempos Text', Georgia, serif; font-weight: 400; font-size: 17px; line-height: 1.5; max-width: 62ch; margin: 0 auto; padding: 96px 32px; background: oklch(0.98 0.005 95); color: oklch(0.18 0 0); }
h1 { font-family: 'Neue Haas Grotesk Display'; font-weight: 700; font-size: 120px; letter-spacing: -0.035em; line-height: 1.05; }
h2 { font-family: 'Neue Haas Grotesk Display'; font-weight: 300; font-size: 36px; line-height: 1.15; }
.label { font-family: 'Neue Haas Grotesk Display'; font-weight: 900; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; }
.spot { color: oklch(0.58 0.22 27); }
.grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; }
</style></head><body>
<p class="label">Issue 01</p>
<h1>Specific.</h1>
<h2>A careful grammar for pages that expect to be read.</h2>
<p>Set on a 12-col grid with 24px gutters. One <span class="spot">moment of red</span>. No shadows. No rounded corners.</p>
</body></html>`;
