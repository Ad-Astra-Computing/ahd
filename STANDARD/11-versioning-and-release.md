# Versioning and release

A version number is a promise to whoever depends on you. Keep it, and a
consumer can upgrade with confidence. Break it silently, and you break
their build. Ad Astra versions with Semantic Versioning and releases with
discipline: batch the work, verify it, cut one honest version.

## Semantic versioning

A version is `MAJOR.MINOR.PATCH`.

- MAJOR: an incompatible change to the public API.
- MINOR: a backward-compatible feature, or a deprecation.
- PATCH: a backward-compatible fix.

A higher bump resets the parts below it to zero. `0.y.z` is initial
development: the public API is not yet stable and anything may change, so a
`0.x` bump can still carry a break. Reaching `1.0.0` is the commitment to a
stable public API. A pre-release is a hyphen suffix (`1.0.0-alpha.1`) with
lower precedence than the release. Build metadata is a plus suffix
(`1.0.0+build`) and is ignored for precedence.

## What counts as breaking

For a library, the exported surface is the contract. Removing or renaming
an export, adding a required parameter, changing a return shape, tightening
validation so inputs that used to pass now fail, or changing a default that
changes behavior are all MAJOR once past `1.0`. Adding an optional export or
field is a feature. A fix that keeps the documented contract is a patch.

For a CLI, the flags, the output and the exit codes are the public API.
Removing or renaming a subcommand or flag, changing a default, changing what
an exit code means, changing machine-readable output a script parses, or
making an optional argument required are all breaking. Adding a subcommand
or an optional flag is a feature.

## One verified bump per release, never a scramble

The version does not move as each change lands. Work accumulates under an
`Unreleased` heading in a changelog, in the Keep a Changelog format. At the
release boundary:

- Run the full build and the complete test suite on the batched state. The
  tag is the last action, applied only to a green tree.
- Compute one bump for the whole batch: any break makes it MAJOR, otherwise
  any feature makes it MINOR, otherwise PATCH.
- Conventional Commits make that deterministic: `fix:` is a patch, `feat:`
  is a minor, and a `!` before the colon or a `BREAKING CHANGE:` footer is a
  major. The highest bump any commit in the batch requires wins.
- Rename `Unreleased` to the version and date, then tag once.

Do not cut a point release to paper over a defect you caught minutes later.
Wait, fix it, and include it in the next real release. Every release is
forever: an npm version can never be republished, and a tag and a release
log cannot be cleanly undone. A run of `0.8.1`, `0.8.2`, `0.8.3` in one
night reads as a team that does not test before it ships. A security fix
found mid-cycle is the one exception and is its own release.

Tools such as release-please, semantic-release and changesets automate this
exact rule. They are a convenience on top of the discipline, not a
replacement for it.

## Every published version is tagged

A version published to a registry with no matching tag in the repository is
unrecoverable: nobody can check out the exact source a shipped artifact was
built from. The release is not done until the tag exists and is pushed. A
publish step with no tag step is a release bug, even when the publish
succeeds.

- Tag with the version and push the tag as part of the release, not after
  it. Use `git push --follow-tags` in the CI publish job so the tag reaches
  the remote with the commit. Note that `--follow-tags` pushes annotated
  tags only (Changesets creates annotated tags for exactly this reason), so
  any tag created by hand in a release script must be annotated too, or it
  silently stays behind.
- In a monorepo that publishes many packages, tag each published package
  with its own version (`pkg-name@1.4.0`; single-package repos get
  `v1.4.0`). One repo-wide tag cannot describe nine packages at nine
  versions.
- A GitHub release per tag is the reviewable record: it carries the
  changelog. Prefer it over a bare tag.
- A published tag is immutable. Never move or delete one, even for a broken
  release; ship a new version instead.
- If a version already shipped untagged, find the exact commit it was built
  from, tag it retroactively and push. If that commit cannot be identified,
  that is the failure this rule exists to prevent: record the gap and make
  sure the next release tags correctly.

With Changesets, the tags come from `changeset publish` itself, which
creates them locally. Getting them to the remote is the part that goes
wrong:

- Let the `changesets/action` step run the publish (its `publish` input,
  pointed at `changeset publish` or a script that ends in it). The action
  then pushes the tags and creates a GitHub release per tag by default
  (`createGithubReleases` and tag pushing both default to true). Do not
  turn these off.
- The failure mode is publishing outside the action. A separate step that
  runs `npm publish` directly creates no tags at all. One that runs
  `changeset publish` without a following `git push --follow-tags` creates
  the tags on the runner, where they die with the job. Either way the
  version ships untraceable.
- Give the release job `contents: write`. The workflow `GITHUB_TOKEN` is
  read-only by default in newer repos and orgs, so declare the permission
  explicitly instead of inheriting whatever the repo happens to allow.
- Verify after the first release: each published version resolves to a tag
  on the remote. Packages on npm with no tags get caught here, before it
  becomes the norm.

release-please and semantic-release tag and push by default. The rule is
the same: confirm the tag is on the remote.

## Test the artifact you publish, not the repo

In-repo tests can pass while the published package is broken: a wrong
`main`, a missing built `dist`, a file left out of the tarball. So the
green proof includes the packaged artifact.

- Pack the tarball with `npm pack`, install it into a clean directory,
  import the public entry point and exercise it. `npm pack --dry-run` and
  in-repo `npm test` both pass on a package that will not import.
- Put the build in `prepack` and the publish gate in `prepublishOnly`.
  `npm pack` runs `prepack` but not `prepublishOnly`, so anything the
  tarball needs, such as a built `dist`, goes in `prepack`.
- For a protocol or a wire format, run the reference sender against the
  reference receiver end to end. Unit tests pass against the code that
  wrote them and do not prove that two implementations interoperate. Treat
  the end-to-end run as a release gate equal to the unit tests.

## Run the instructions you print

A command shown to a reader is an artifact you publish. A test that runs
its own version of that command proves nothing about the version on the
page, and the two drift the moment either one is edited.

- Read the command out of the built page or the published README, not out
  of the test file, and run it verbatim.
- Run it in a directory holding only what a reader can obtain. A command
  that passes in the repo can fail for anyone else, because the repo holds
  files the reader never receives.
- Assert on stdout and stderr together. Tools report warnings on stderr, so
  a test that captures stdout alone goes green while the reader is shown a
  warning.
- A warning a reader cannot act on is a defect, not noise. Fix the command
  until its output is clean.

This covers any instruction published for someone else to run: an install
line in a README, a verification step in a release note, a curl example in
documentation.

## Deploy a build, not a directory

A deploy uploads whatever is in the output directory. If that directory was
built before the last edit, the deploy carries part of the change and drops
the rest, and nothing fails: the upload succeeds and the site looks current.
A Pages deploy here shipped a commit's new sitemap dates while silently
leaving out the CSS rule from the same commit, because the build had run two
steps earlier.

- Build as the first step of the deploy, ideally in the same command as the
  upload. A build from earlier in the session is not evidence, however few
  minutes ago it ran.
- Verify against the deployed artifact, not the local one. Fetch the live
  page and read what came back.
- Check something only the new build can carry: a string, a class or a date
  this change introduced. A 200 proves the host is up and nothing else.
- Where a deploy is more than one command, make it one script, so the build
  cannot be skipped by running the second half.

## Pre-1.0 dist-tags

For a pre-1.0 npm package, never advance the `latest` dist-tag to a
pre-stable release. Publish to `next` or `beta`. `latest` moves only when a
release is promoted by an explicit maturity sign-off, a deliberate
`npm dist-tag add pkg@version latest`. A downstream consumer should soak the
`next` version in production before it is promoted. This holds for every
pre-1.0 package, not one.

## The release gate

Before any tag or publish, on a green main with every open pull request
merged:

- the build is clean and the full test suite is green, including a
  regression test for each fix,
- the packaged-artifact smoke test passes, and the end-to-end test passes
  where two implementations must interoperate,
- the secret scan and the dependency audit are clean,
- a CLI or usage smoke test passes,
- for a nix flake, the build actually builds from a fresh hash.

If any step fails, it does not tag. Fix it and return to the top, or wait
for a later batch. The release notes are written by a person and do not
read as AI-generated.

## Sources

- Semantic Versioning 2.0.0: https://semver.org/
- Conventional Commits 1.0.0: https://www.conventionalcommits.org/en/v1.0.0/
- Keep a Changelog 1.1.0: https://keepachangelog.com/en/1.1.0/
- About semantic versioning, npm: https://docs.npmjs.com/about-semantic-versioning/
- npm-publish: https://docs.npmjs.com/cli/v10/commands/npm-publish
- Changesets Action: https://github.com/changesets/action
