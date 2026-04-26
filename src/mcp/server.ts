import { z } from "zod";
import { listTokens, loadToken } from "../load.js";
import { compile } from "../compile.js";
import { lintSource } from "../lint/engine.js";
import { VISION_RULES } from "../critique/critic.js";
import { BriefSchema, type StyleToken, type Brief } from "../types.js";

// Every tool's args parsed at the boundary. The MCP protocol surface
// is a user-controlled input, so it follows the same architectural
// rule as briefs and tokens: schema-validated at the entry point, no
// silent String() coercion. ahd.brief composes BriefSchema; the
// rest are tool-specific.
const TOKEN_ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const TokenIdSchema = z
  .string()
  .regex(TOKEN_ID_RE, {
    message: "must be a kebab-case token id (a-z, 0-9, hyphen).",
  });

const GetTokenArgsSchema = z.object({ id: TokenIdSchema }).strict();
const TokenOnlyArgsSchema = z.object({ token: TokenIdSchema }).strict();
const NoArgsSchema = z.object({}).strict();

const MCP_LINT_MAX_BYTES = 1024 * 1024;
const LintArgsSchema = z
  .object({
    html: z.string().max(MCP_LINT_MAX_BYTES).optional(),
    css: z.string().max(MCP_LINT_MAX_BYTES).optional(),
    file: z.string().max(2048).optional(),
  })
  .strict();

function parseArgs<T>(
  toolName: string,
  schema: z.ZodSchema<T>,
  args: unknown,
): T {
  const r = schema.safeParse(args);
  if (r.success) return r.data;
  const issues = r.error.issues
    .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
    .join("; ");
  throw new InvalidParamsError(`${toolName}: ${issues}`);
}

// JSON-RPC 2.0 standard error codes. Distinct codes let MCP clients
// tell parse/protocol errors from app-level invocation errors, which
// the prior single-catch implementation collapsed into -32700.
const JSONRPC = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Reserved server-error range: -32000 to -32099. -32001 marks
  // tool-handler exceptions (file IO, schema validation in handler,
  // anything that surfaced from inside a tool call).
  TOOL_INVOCATION_ERROR: -32001,
} as const;

// Custom error a tool handler throws to surface a structured
// invalid-params error to the caller without collapsing it into a
// generic 500.
class InvalidParamsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidParamsError";
  }
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface McpServerOptions {
  tokensDir: string;
}

export function createTools(options: McpServerOptions): McpTool[] {
  const TOKENS = options.tokensDir;

  return [
    {
      name: "ahd.list_tokens",
      description: "List every style token available in the AHD library.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler: async (args) => {
        parseArgs("ahd.list_tokens", NoArgsSchema, args);
        return { tokens: await listTokens(TOKENS) };
      },
    },
    {
      name: "ahd.get_token",
      description: "Return a single style token by id.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string", pattern: TOKEN_ID_RE.source } },
        required: ["id"],
        additionalProperties: false,
      },
      handler: async (args) => {
        const { id } = parseArgs("ahd.get_token", GetTokenArgsSchema, args);
        return loadToken(TOKENS, id);
      },
    },
    {
      name: "ahd.brief",
      description:
        "Compile a brief (structured intent) against a style token. Returns per-model prompts and a spec.json-shaped object.",
      inputSchema: {
        type: "object",
        properties: {
          intent: { type: "string" },
          token: { type: "string" },
          audience: { type: "string" },
          surfaces: { type: "array", items: { type: "string" } },
          mustInclude: { type: "array", items: { type: "string" } },
          mustAvoid: { type: "array", items: { type: "string" } },
        },
        required: ["intent", "token", "surfaces"],
      },
      handler: async (args) => {
        const parsed = BriefSchema.safeParse(args);
        if (!parsed.success) {
          const issues = parsed.error.issues
            .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
            .join("; ");
          throw new InvalidParamsError(`ahd.brief: ${issues}`);
        }
        const brief: Brief = parsed.data;
        if (!brief.token) {
          throw new InvalidParamsError(
            "ahd.brief: brief.token is required when calling this tool.",
          );
        }
        const token = await loadToken(TOKENS, brief.token);
        return compile(brief, token);
      },
    },
    {
      name: "ahd.palette",
      description:
        "Return the OKLCH palette declared by a style token, with role assignments.",
      inputSchema: {
        type: "object",
        properties: { token: { type: "string", pattern: TOKEN_ID_RE.source } },
        required: ["token"],
        additionalProperties: false,
      },
      handler: async (args) => {
        const { token } = parseArgs("ahd.palette", TokenOnlyArgsSchema, args);
        const t: StyleToken = await loadToken(TOKENS, token);
        return { palette: t.colour.palette, roles: t.colour.roles };
      },
    },
    {
      name: "ahd.type_system",
      description: "Return the type scale, families, weights and tracking for a token.",
      inputSchema: {
        type: "object",
        properties: { token: { type: "string", pattern: TOKEN_ID_RE.source } },
        required: ["token"],
        additionalProperties: false,
      },
      handler: async (args) => {
        const { token } = parseArgs("ahd.type_system", TokenOnlyArgsSchema, args);
        const t: StyleToken = await loadToken(TOKENS, token);
        return t.type;
      },
    },
    {
      name: "ahd.reference",
      description:
        "Return the movement, references and exemplars for a token (so the model can anchor in a specific lineage).",
      inputSchema: {
        type: "object",
        properties: { token: { type: "string", pattern: TOKEN_ID_RE.source } },
        required: ["token"],
        additionalProperties: false,
      },
      handler: async (args) => {
        const { token } = parseArgs("ahd.reference", TokenOnlyArgsSchema, args);
        const t: StyleToken = await loadToken(TOKENS, token);
        return {
          provenance: t.provenance,
          mood: t.mood,
          forbidden: t.forbidden,
          requiredQuirks: t["required-quirks"],
        };
      },
    },
    {
      name: "ahd.lint",
      description:
        "Run the AHD slop linter on an HTML/CSS source string. Returns violations per rule.",
      inputSchema: {
        type: "object",
        properties: {
          html: {
            type: "string",
            maxLength: MCP_LINT_MAX_BYTES,
            description: "HTML source. Up to 1 MiB.",
          },
          css: {
            type: "string",
            maxLength: MCP_LINT_MAX_BYTES,
            description: "CSS source. Up to 1 MiB.",
          },
          file: {
            type: "string",
            maxLength: 2048,
            description: "Optional path label for the report.",
          },
        },
        additionalProperties: false,
      },
      handler: async (args) => {
        // Size caps enforced by LintArgsSchema. stdio MCP doesn't bill
        // the client for oversized requests, so a buggy or hostile
        // client could stream a large string and stall the server on
        // regex. The 1 MiB cap on html and css is far above any
        // realistic single-page lint.
        const parsed = parseArgs("ahd.lint", LintArgsSchema, args);
        const html = parsed.html ?? "";
        const css = parsed.css ?? "";
        const file = parsed.file ?? "<inline>";
        return lintSource({ file, html, css });
      },
    },
    {
      name: "ahd.vision_rules",
      description:
        "Return the fourteen vision-only slop rules (9 web/graphic + 4 image-specific + 1 layout), for use when an agent has access to a screenshot or rendered page.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler: async (args) => {
        parseArgs("ahd.vision_rules", NoArgsSchema, args);
        return VISION_RULES;
      },
    },
  ];
}

export async function handleStdioLine(
  line: string,
  tools: McpTool[],
): Promise<string> {
  // Parse phase: failure here means the input was not valid JSON, so
  // the request id is unknowable. Only this branch can return id:null
  // legitimately (per JSON-RPC 2.0 §5.1).
  let req: { id?: unknown; method?: string; params?: any };
  try {
    req = JSON.parse(line);
  } catch (err) {
    return JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: JSONRPC.PARSE_ERROR,
        message: err instanceof Error ? err.message : String(err),
      },
    });
  }

  // Once the request parsed, we have an id (or null). Every subsequent
  // error path preserves it so the client can correlate.
  const reqId = (req.id ?? null) as string | number | null;

  if (typeof req.method !== "string") {
    return JSON.stringify({
      jsonrpc: "2.0",
      id: reqId,
      error: {
        code: JSONRPC.INVALID_REQUEST,
        message: "request missing required `method` string field",
      },
    });
  }

  try {
    if (req.method === "initialize") {
      return JSON.stringify({
        jsonrpc: "2.0",
        id: reqId,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "ahd-mcp", version: "0.5.0-beta.1" },
        },
      });
    }
    if (req.method === "tools/list") {
      return JSON.stringify({
        jsonrpc: "2.0",
        id: reqId,
        result: {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        },
      });
    }
    if (req.method === "tools/call") {
      const tool = tools.find((t) => t.name === req.params?.name);
      if (!tool) {
        return JSON.stringify({
          jsonrpc: "2.0",
          id: reqId,
          error: {
            code: JSONRPC.METHOD_NOT_FOUND,
            message: `unknown tool ${req.params?.name}`,
          },
        });
      }
      // Inner try: a tool handler throwing must surface as a tool
      // invocation error tied to the same request id, not as a parse
      // error with id:null.
      try {
        const result = await tool.handler(req.params?.arguments ?? {});
        return JSON.stringify({
          jsonrpc: "2.0",
          id: reqId,
          result: {
            content: [
              { type: "text", text: JSON.stringify(result, null, 2) },
            ],
          },
        });
      } catch (err) {
        const isInvalidParams =
          err instanceof Error && err.name === "InvalidParamsError";
        return JSON.stringify({
          jsonrpc: "2.0",
          id: reqId,
          error: {
            code: isInvalidParams
              ? JSONRPC.INVALID_PARAMS
              : JSONRPC.TOOL_INVOCATION_ERROR,
            message: err instanceof Error ? err.message : String(err),
            data: { tool: req.params?.name },
          },
        });
      }
    }
    return JSON.stringify({
      jsonrpc: "2.0",
      id: reqId,
      error: {
        code: JSONRPC.METHOD_NOT_FOUND,
        message: `unknown method ${req.method}`,
      },
    });
  } catch (err) {
    // Fallback for anything outside a tool call: still preserve the
    // request id rather than collapsing to null.
    return JSON.stringify({
      jsonrpc: "2.0",
      id: reqId,
      error: {
        code: JSONRPC.INTERNAL_ERROR,
        message: err instanceof Error ? err.message : String(err),
      },
    });
  }
}

export async function runStdioServer(options: McpServerOptions): Promise<void> {
  const tools = createTools(options);
  process.stdin.setEncoding("utf8");
  let buffer = "";
  process.stdin.on("data", async (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      const response = await handleStdioLine(line, tools);
      process.stdout.write(response + "\n");
    }
  });
}
