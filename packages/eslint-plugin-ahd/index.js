// Thin re-export of @adastra/ahd's ESLint-plugin builder. This package exists
// so consumers can install it under the ESLint-conventional
// `eslint-plugin-ahd` name; the actual rule engine lives in @adastra/ahd and
// is shared with the standalone CLI and the MCP server.
import plugin from "@adastra/ahd/dist/plugins/eslint-plugin.js";
export default plugin;
export const { rules, configs, meta } = plugin;
