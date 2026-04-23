import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { createTools, handleStdioLine } from "../src/mcp/server.js";

const TOKENS = resolve(__dirname, "..", "tokens");

describe("mcp server", () => {
  const tools = createTools({ tokensDir: TOKENS });

  it("exposes the documented tool set", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "ahd.list_tokens",
        "ahd.get_token",
        "ahd.brief",
        "ahd.palette",
        "ahd.type_system",
        "ahd.reference",
        "ahd.lint",
        "ahd.vision_rules",
      ]),
    );
  });

  it("initialize returns the protocol handshake", async () => {
    const req = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" });
    const res = JSON.parse(await handleStdioLine(req, tools));
    expect(res.result.serverInfo.name).toBe("ahd-mcp");
    expect(res.result.capabilities.tools).toBeDefined();
  });

  it("tools/list returns every tool with an inputSchema", async () => {
    const req = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const res = JSON.parse(await handleStdioLine(req, tools));
    expect(res.result.tools.length).toBe(tools.length);
    for (const t of res.result.tools) {
      expect(t.inputSchema).toBeDefined();
    }
  });

  it("tools/call ahd.list_tokens returns the seed library", async () => {
    const req = JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "ahd.list_tokens", arguments: {} },
    });
    const res = JSON.parse(await handleStdioLine(req, tools));
    const payload = JSON.parse(res.result.content[0].text);
    expect(payload.tokens).toContain("swiss-editorial");
    expect(payload.tokens.length).toBeGreaterThanOrEqual(5);
  });

  it("tools/call ahd.brief compiles a minimal brief", async () => {
    const req = JSON.stringify({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "ahd.brief",
        arguments: {
          intent: "portfolio for a small studio",
          token: "swiss-editorial",
          surfaces: ["web"],
        },
      },
    });
    const res = JSON.parse(await handleStdioLine(req, tools));
    const payload = JSON.parse(res.result.content[0].text);
    expect(payload.prompts.claude).toContain("FORBIDDEN");
  });

  it("tools/call on unknown tool returns an error", async () => {
    const req = JSON.stringify({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "ahd.unknown", arguments: {} },
    });
    const res = JSON.parse(await handleStdioLine(req, tools));
    expect(res.error).toBeDefined();
    expect(res.error.code).toBe(-32601);
  });
});
