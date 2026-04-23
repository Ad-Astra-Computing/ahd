# Security policy

## Reporting a vulnerability

If you have found a security vulnerability in AHD, please report it privately. Do not open a public issue.

Email: `security@adastracomputing.com`

Include:

- A description of the vulnerability and its impact.
- Steps to reproduce.
- The version or commit SHA affected.
- Your name or handle for attribution, or a note that you want to stay anonymous.

We will acknowledge receipt within seventy-two hours, provide a regular status update while we investigate, and credit you in the release notes when the fix ships unless you ask otherwise.

## Scope

- The `ahd` CLI and its published npm package
- The `ahd-mcp` stdio server
- The `eslint-plugin-ahd` and `stylelint-plugin-ahd` wrappers
- The style token schema and the tokens in `tokens/`

## Out of scope

- Vulnerabilities in third-party runtimes (node, chromium) — report to the upstream project.
- Vulnerabilities in model-provider APIs (Anthropic, OpenAI, Google, Cloudflare) — report to the provider.
- Social-engineering and physical-security issues.

## Credentials and secrets

AHD does not require secrets to run. When secrets are provided (for live eval runs) they are read from environment variables or a gitignored `.env`. If you ever commit a secret by accident, rotate it immediately in the provider's dashboard and open an issue (without the secret) so we can document the incident and, if needed, adjust the ignore list or workflow templates.
