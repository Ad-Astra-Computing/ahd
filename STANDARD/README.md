# STANDARD

The Ad Astra operating manual. `AGENTS.md` at the repo root is the short
form every agent reads each session. These files carry the reasoning and
the sources behind those rules. When the two disagree, `AGENTS.md` is the
rule and a file here is the explanation, so fix the explanation.

## Contents

- `00-prose-and-output.md`: nothing reads as AI-generated, and copy serves the
  reader rather than explaining the build
- `01-git-and-commits.md`: commits, identity, signing, PRs
- `02-development-method.md`: spec-driven and test-driven, operating controls, determinism, diagnosis
- `03-nix-first.md`: hermetic environments and flakes
- `04-security.md`: secure by design, and the scanner-gate stance
- `05-clean-code.md`: architecture boundaries over length dogma
- `06-ui-ux.md`: self-evident design and accessibility
- `07-autonomy-and-review.md`: how agents work without a babysitter
- `08-context-files.md`: AGENTS.md, CLAUDE.md and hook discipline
- `09-language-and-runtime.md`: choose the runtime first, then the language
- `10-readme.md`: the README front door, logo block, badges and structure
- `11-versioning-and-release.md`: SemVer, one verified bump per release,
  test the packaged artifact and the instructions you print, tag every
  published version
- `12-legal-and-user-obligations.md`: notify users of policy changes, and
  the day-one legal mechanisms
- `13-new-project-defaults.md`: the secure settings to enable on a new
  GitHub repo and a new Cloudflare zone
- `14-staging-and-promotion.md`: staging first, promote the same build,
  roll back fast
- `15-seo-and-aeo.md`: found by search and answer engines, kept accurate
- `16-punctuation-and-grammar.md`: the punctuation and grammar mechanics, so
  simple mistakes stay out of public copy
- `17-authenticity-and-voice.md`: work that reads as natural human work under
  our own true identity, kept honest
- `18-platform-notes.md`: quirks that cost real debugging time, iOS Safari
  first, recorded so the next project does not pay for them twice
- `19-documentation-sync.md`: docs, site, examples, interop fixtures and a
  second implementation are one artifact, updated together
- `20-legal-documents.md`: terms, privacy and the rest as product surfaces
  with legal weight, and what triggers which document

## Keeping this current

The prompt surface, meaning AGENTS.md, CLAUDE.md, skills and hooks, is a
cost paid on every request. Review it after each major model upgrade.
Delete what a current model no longer needs and add back only what earns
its place. Treat these files as living, not write-once.
