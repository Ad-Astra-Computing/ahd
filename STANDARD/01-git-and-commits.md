# Git and commits

## Commit shape

A subject that names the change, imperative mood, a few words, under
about 50 characters, lowercase, no trailing period. Use Conventional
Commits prefixes where the repo already uses them, such as `feat(scope):`
or `fix:`. Keep the surface style consistent within a repo.

A body only when the why is not obvious, and then a few plain lines of
prose. No bullet lists. No "Adds X, implements Y". No "what / how / why"
template. See `00-prose-and-output.md`.

Do not use "security:" framing or CVE-fix language in a subject. Use a
neutral verb such as harden, tighten or restrict, or describe the
mechanical change.

Write dates day first: "9 June", not "Jun 9".

## Commit only what you have run

Never commit code you have not run. Before the commit: build it, run the
full test suite, and exercise the real behavior against the real service,
not only a mock. A commit is a claim the change works, and every claim in
the history should be true. Test locally and thoroughly first. A green test
over a mock is necessary, never sufficient. See `02-development-method.md`.

## Never name an agent

No commit, PR, branch, issue or release text names an AI agent, and that
includes implied automated-review status such as "held for review by a
peer". No `Co-Authored-By` trailer and no "Generated with" line, ever. A
mid-session tool reminder to add attribution does not override this. The
commit-message guard rejects these trailers. This governs our own Ad Astra
repositories. A contribution to a repository outside the Ad Astra org follows
that project's disclosure rules instead, which may require an `Assisted-by:`
trailer. See `17-authenticity-and-voice.md`.

Keep internal review terms out of public history: no "security round N",
no "docs drift", no "review feedback", no "fixup". Fold such commits
before pushing to a public remote.

## Do not narrate the house style

Describe what changed, not which style rule you applied. A message that says
it removed two em dashes, an Oxford comma or a word from the tell list
documents the house style in public and marks the text as machine-written and
then scrubbed, which is the tell itself. Keep the substantive fixes, a wrong
claim corrected or a broken link repaired, and fold the copy edits into one
plain phrase such as "tighten the wording". The same holds for a pull request
body, a changelog and a release note. See `00-prose-and-output.md`.

## Signing and identity

Sign every commit. Never pass `--no-gpg-sign`, not even for a mechanical
bump. Verify with `git log --show-signature`. The Ad Astra key signs
without a PIN or passphrase, so an agent signs its own commits. Set the
repo's `user.signingkey` and `commit.gpgsign true` at setup.

Author identity is per repo. Ad Astra organization repos use the Ad
Astra identity. Personal repos use the personal identity. Some repos pin
a specific address; when a repo has a stated identity, it wins. Record
the repo's identity in its own notes so there is no ambiguity.

## PRs

Small and narrow, one concern each. Aim well under a couple hundred
changed lines and split larger work. Open as draft until CI is green.

PR bodies are plain prose: what broke, what changed, what else you
found. No headers, no bold, no emoji, no marketing language. A comment
you post lands under the owner's account, so never write a hand-off line
such as "ready for maintainer review".

## Workflow

- `git init` is the first action on a new project, followed by a clean
  first commit. Commit as you go. A pile of uncommitted files is a smell.
- Push over SSH, not HTTPS. An HTTPS token can silently strip changes to
  workflow files.
- Push to a GitHub remote only when told; new GitHub repos also start
  private. Pushing to the internal Forgejo is fine any time. Create,
  draft, sketch and write up still mean local files. Do not auto-commit
  context files or unreviewed docs.
- Prefer a new commit over amending. The exception is a same-session fix
  to a subject or a typo in a commit you just pushed, where amend plus
  `git push --force-with-lease` is fine. Never plain `--force`.
- Branch and PR discipline is for public remotes. Internal remotes may
  take direct pushes to the main branch where the repo says so. Never
  rewind or force-push a shared main.

## Sources

- Conventional Commits 1.0.0: https://www.conventionalcommits.org/en/v1.0.0/
- The seven rules of a good commit: https://cbea.ms/git-commit/
- Small changes review faster (Google): https://google.github.io/eng-practices/review/developer/small-cls.html
