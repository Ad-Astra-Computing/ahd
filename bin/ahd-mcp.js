#!/usr/bin/env node
import { resolve } from "node:path";
import { runStdioServer } from "../dist/mcp/server.js";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const TOKENS = resolve(ROOT, "tokens");

runStdioServer({ tokensDir: TOKENS });
