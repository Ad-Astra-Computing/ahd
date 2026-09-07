# Staging and promotion

A production product deploys to staging first, proves itself there, then
promotes the same build to production. The gate between "merged" and "in
front of users" is where you catch the failures that pass unit tests but
only show against a production-like stack.

## Why, and when

Dev and prod should match: the same runtime, the same backing-service
types and versions, the same config shape. Differences are where code that
passed every test in development fails in production, on a config or secret
mismatch, a migration, a version drift or a missing binding. A staging
environment that mirrors production is where those surface first.

- Required for any product with real users or a live production
  deployment. If a bad deploy can cause a user-visible incident, there is a
  gate before users.
- Overkill for a library, whose staging is a pre-release version plus
  downstream CI, or a static docs site, or a throwaway prototype with no
  users. A pull-request preview build is enough there.

## What staging has to be

- As close to production as practical: the same runtime and platform, the
  same backing-service types and versions. No SQLite in development and
  Postgres in production.
- The same build artifact, promoted, not rebuilt. Staging validates the
  exact bytes that will reach production.
- The same config shape with its own values: identical binding and
  variable names, separate and isolated secrets and data.
- Fully isolated: its own database, its own credentials, its own routes.
  Never a production database, production secrets or a live third-party
  account. Use the sandbox keys, such as a payment provider's test mode.
- Realistic data, not real data. Staging must not hold real user
  information; use anonymized or synthetic data of the right shape.

## The promotion gate

Build once, deploy that artifact to staging, verify against staging,
promote the identical artifact to production, verify in production.

- Promote the artifact, do not rebuild it. Rebuilding for production ships
  bytes you never tested.
- The automated check on staging is a required gate: the full test suite
  plus smoke and end-to-end tests, run against the deployed staging
  environment, not localhost. A red gate blocks the promotion.
- Require a human sign-off for a high-risk or regulated change, and prevent
  the person who deployed it from approving their own change.
- Have a rehearsed rollback, and make it fast. Keep schema changes
  backward-compatible, expand then contract, so rolling back the code does
  not strand the database.
- Verify in production after the promotion: run the production smoke tests
  and watch the health and error signals before calling it done.
- Roll out progressively. Staging catches what is testable before
  production; a canary or a blue-green cutover catches what only shows
  under real traffic, by exposing the change to a slice first and widening
  as confidence holds.

## Cloudflare Workers

- Define named environments in the Wrangler config. Each `[env.<name>]`
  deploys as a separate Worker with its own routes and bindings. Deploy
  with `wrangler deploy --env staging`.
- Bindings, vars and secrets do not cascade from the top level. Each
  environment sets its own, which is what keeps staging and production
  isolated on one codebase. `wrangler secret put KEY --env production` and
  `--env staging` hold different values.
- Structure the project as one codebase reached through `env` at runtime,
  with a `staging` and a `production` block differing only in routes,
  bindings and secrets. Nothing about the environment is hard-coded.
- Roll out on the production side with versioned deployments:
  `wrangler versions upload` stages a version without serving it, then
  `wrangler versions deploy` splits traffic by percentage. Watch the error
  rate per version and roll back fast by sending all traffic to the last
  stable version.
- Wire the per-version preview URL into CI so each pull request gets a live
  environment for review and end-to-end checks.

## Anti-patterns

- Testing only in production. The users are the test suite.
- "It works on my machine." The development stack differs from production;
  parity exists to kill this.
- Staging that has drifted from production. It gives a false green.
- A shared database between staging and production. A staging test can
  corrupt production data or leak real information.
- Skipping staging for a small change. Small changes cause outages too. The
  gate is unconditional.
- No rollback plan, found out mid-incident.
- Promoting a different build than the one tested.

## Sources

- Dev/prod parity, The Twelve-Factor App: https://12factor.net/dev-prod-parity
- Blue Green Deployment, Martin Fowler: https://martinfowler.com/bliki/BlueGreenDeployment.html
- Canarying Releases, Google SRE Workbook: https://sre.google/workbook/canarying-releases/
- Environments, Cloudflare Workers: https://developers.cloudflare.com/workers/wrangler/environments/
- Gradual deployments, Cloudflare Workers: https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/
