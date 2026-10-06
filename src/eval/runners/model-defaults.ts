// Single source of truth for the default Anthropic/Claude model id used
// across every runner and critic that talks to Claude when the caller
// does not pass an explicit `model`. Previously duplicated as three
// independent hardcoded strings in anthropic.ts, claude-code-cli.ts and
// critique/critics/claude-code.ts, which let them drift out of sync.
export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";
