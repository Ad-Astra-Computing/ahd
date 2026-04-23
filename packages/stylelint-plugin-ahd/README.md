# stylelint-plugin-ahd

Stylelint plugin that enforces the CSS-side rules of the AHD slop taxonomy. Wraps the shared rule engine in [@adastracomputing/ahd](https://www.npmjs.com/package/@adastracomputing/ahd).

## Install

```bash
npm install --save-dev stylelint @adastracomputing/stylelint-plugin-ahd
```

## Config

```json
{
  "plugins": ["stylelint-plugin-ahd"],
  "rules": {
    "ahd/no-default-grotesque": true,
    "ahd/no-purple-blue-gradient": true,
    "ahd/no-flat-dark-mode": true,
    "ahd/weight-variety": true,
    "ahd/require-type-pairing": true
  }
}
```

## What it catches

Every CSS-decidable rule in the AHD slop taxonomy. See [`docs/LINTER_SPEC.md`](https://github.com/Ad-Astra-Computing/ahd/blob/main/docs/LINTER_SPEC.md) in the parent repository for the full list.

## Licence

FSL-1.1-Apache-2.0. See the `LICENSE` file.
