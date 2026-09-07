# New project defaults

Turn the secure settings on when you create the thing, not after an
incident. This is the checklist for a new GitHub repository and a new
Cloudflare zone. Enable every item marked required; the optional ones
depend on the plan or the surface.

## A new GitHub repository

### Visibility

- Create it private, or internal, unless a public release is the explicit
  intent. `gh repo create <name> --private`. New GitHub repos start private
  by default here.
- Turn off forking on a private or internal repo, so the code cannot be
  copied into a personal namespace outside the protections.

### Default-branch ruleset

Use a branch ruleset on the default branch, not the older per-branch
protection. `gh` has no ruleset command, so use `gh api POST
/repos/{owner}/{repo}/rulesets`.

- Require a pull request with at least one approving review. No direct push
  to the default branch.
- Dismiss stale approvals when new commits land, so the approval matches
  what merges.
- Require review from code owners.
- Require status checks to pass and the branch to be up to date before
  merge.
- Require conversation resolution.
- Block force-pushes and block deletion of the default branch.
- Require linear history, which pairs with squash-only merges.
- Require signed commits. Roll this out once contributors have signing set
  up, since it blocks a push otherwise.
- Include admins, or restrict bypass to a break-glass team. A rule anyone
  can bypass is not a control.
- Protect release tags with a tag ruleset if the repo cuts releases.

### Security features

- Dependency graph, Dependabot alerts and Dependabot security updates.
- Secret scanning with push protection. This is the highest-value toggle:
  it blocks a push that introduces a secret. Free on public repos, a paid
  Secret Protection license on private.
- Private vulnerability reporting, so a researcher has a private channel.
- CodeQL default setup where the license allows it. Free on public, needs
  Code Security on private.

### Actions hardening

- Default the workflow token to read-only, and widen it per job only where
  a step needs write.
- Allow GitHub-authored actions plus a named allowlist, and pin every
  third-party action to a full commit SHA. See `04-security.md`.
- Require approval for workflow runs from first-time and outside
  contributors, so a fork pull request does not auto-run on your runners.
- Do not send write tokens or secrets to fork-pull-request workflows.
- Gate a production deploy behind a protected environment with a required
  reviewer.

### Merge and hygiene

- One merge strategy, squash-only: `allow_squash_merge` on,
  `allow_merge_commit` and `allow_rebase_merge` off.
- Auto-delete the head branch after merge.
- A `CODEOWNERS`, a `SECURITY.md`, a `LICENSE`, a description and topics.
- Turn off the wiki, projects or issues if the repo does not use them.

`gh repo create` and `gh repo edit` cover visibility, forking, the merge
strategy, branch auto-delete and the description. The security toggles and
the rulesets go through `gh api`.

## A new Cloudflare zone or project

### SSL and TLS

- Encryption mode Full (strict), with a Cloudflare Origin CA certificate on
  the origin. This is the only mode that stops origin spoofing.
- Always Use HTTPS on, minimum TLS 1.2, Automatic HTTPS Rewrites on.
- HSTS on, max-age six months or more, include subdomains. Turn on
  `preload` only when every subdomain is HTTPS for good, since it is hard
  to undo.

### DNS

- Enable DNSSEC, then add the DS record at the registrar to complete it.
- Proxy every record that fronts a web service, so it gets the WAF, the CDN
  and DDoS protection and hides the origin IP. Leave only what must be
  direct unproxied, such as mail.
- Add CAA records naming the certificate authorities allowed to issue for
  the domain.

### Email

- A domain that does not send mail still needs anti-spoofing records: SPF
  `v=spf1 -all`, a DMARC `p=reject`, an empty DKIM key and a null MX
  (`MX 0 .`).
- A domain that does send mail needs SPF, DKIM and DMARC aligned to the
  sending service, moved to `p=reject` after a monitoring window.

### Edge security

- Deploy the WAF managed rules. The full rulesets are a paid tier; the free
  tier gets a limited core set.
- Bot Fight Mode, or Super Bot Fight Mode on a paid plan.
- Browser Integrity Check on, security level medium or higher, and leave
  the DDoS managed rulesets enabled.
- Rate-limiting rules on any authentication or API endpoint.

### Access and secrets

- Put every admin or internal surface behind Cloudflare Access with a
  deny-by-default policy, and validate the Access token at the origin.
  Replace a hidden URL with real identity-based auth.
- Store Worker secrets with `wrangler secret put`, never as plaintext vars
  in the config.
- Use scoped API tokens, never the global API key. Scope each to the
  narrowest permission and revoke it when done.

Most SSL, DNSSEC and bot toggles are one click in the dashboard and mirrored
in the `PATCH /zones/{id}/settings` API. The WAF rulesets, rate limiting and
Super Bot Fight Mode depend on the plan. Access is the separate Zero Trust
dashboard.

## Sources

- Quickstart for securing your repository, GitHub: https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository
- About rulesets, GitHub: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- Security hardening for GitHub Actions: https://docs.github.com/en/actions/reference/security/secure-use
- SSL/TLS encryption modes, Cloudflare: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/
- Configure email security records, Cloudflare: https://developers.cloudflare.com/dmarc-management/security-records/
- WAF managed rules, Cloudflare: https://developers.cloudflare.com/waf/managed-rules/
