# eslint-plugin-ahd

ESLint plugin that enforces the AHD slop-linter rules against JSX and HTML-in-source. Every rule in this plugin is derived programmatically from the shared rule engine in [@adastracomputing/ahd](https://www.npmjs.com/package/@adastracomputing/ahd), so it stays in lockstep with the CLI, the MCP server, and the eval pipeline.

## Install

```bash
npm install --save-dev eslint @adastracomputing/eslint-plugin-ahd
```

## Flat config (ESLint 9+)

```js
import ahd from "eslint-plugin-ahd";

export default [
  ahd.configs.recommended,
];
```

## Legacy config (.eslintrc)

```json
{
  "plugins": ["@adastracomputing/ahd"],
  "extends": ["plugin:ahd/recommended"]
}
```

## What it catches

Every source-level rule in the AHD slop taxonomy. The current set of 38 (35 HTML/CSS plus 3 SVG) is listed in [`docs/LINTER_SPEC.md`](https://github.com/Ad-Astra-Computing/ahd/blob/main/docs/LINTER_SPEC.md) in the parent repository. Run `ahd lint-rules` for the live list.

## Licence

FSL-1.1-Apache-2.0. See the `LICENSE` file.
