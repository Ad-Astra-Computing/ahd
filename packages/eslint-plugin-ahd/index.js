// Thin re-export of @adastracomputing/ahd's ESLint-plugin builder. This package exists
// so consumers can install it under the ESLint-conventional
// `eslint-plugin-ahd` name; the actual rule engine lives in @adastracomputing/ahd and
// is shared with the standalone CLI and the MCP server.
import plugin from "@adastracomputing/ahd/dist/plugins/eslint-plugin.js";
export default plugin;
export const { rules, configs, meta } = plugin;
