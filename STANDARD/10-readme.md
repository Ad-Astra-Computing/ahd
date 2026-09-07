# The README

The README is the front door. A first-time reader should learn what the
project is, whether it fits their need, and how to run it, without leaving
the page. Write it for that reader, not for search engines.

## Structure

Sections run top to bottom in the order a reader scans. Keep the required
ones; add the rest when the project has something real to put there.

- Title, matching the repo name. Required.
- Logo block directly under the title, no heading. Optional.
- Badges, no heading, one short row. Optional but expected for a code repo.
- One-line description, under about 120 characters, no heading. Required.
- A paragraph or two on what it does, why it exists and who it is for.
- Table of contents. Only past about 100 lines, or when the repo is
  mirrored to a host without an outline menu. GitHub and Forgejo both
  generate one from the headings, so a hand-written one is for long docs.
- Install, with explicit steps in a fenced block, and a requirements
  subsection for prerequisites. Required for a code project.
- Usage, with code blocks that show the expected output. Required for a
  code project.
- Configuration: env vars, files and flags, a table reads well.
- Development and contributing: how to set up locally, the PR policy, a
  link to the standard. Required.
- Testing: how to run the suite and the guards.
- Maintainers: who owns it. Useful on an internal repo.
- License, last, with an SPDX identifier and the copyright holder.
  Required.

Too long beats too short. Push overflow into `docs/`, do not cut the
README to a stub.

## The logo and title block

Markdown cannot center, so the top block is HTML. This renders on both
GitHub and Forgejo, which allow `p`, `div`, `img` and `a` with `align`
but strip style attributes:

```html
<p align="center">
  <img src="docs/assets/logo.svg" alt="Project name" width="180" />
</p>

<h1 align="center">Project name</h1>

<p align="center">One line on what this does.</p>
```

- Center with `align="center"` on the element, never a `style` attribute.
- Size with the `width` attribute, not CSS. Set one dimension and let the
  other scale.
- Store the logo in the repo, for example `docs/assets/`, and link it with
  a relative path. Both hosts rewrite relative paths, so it survives a
  clone. Never hotlink an external URL.
- Prefer SVG for a logo. It scales cleanly and stays small. Use PNG for a
  screenshot or when the logo uses effects that may not render the same.
- A `picture` element with `prefers-color-scheme` gives a dark and light
  logo on GitHub, but Forgejo support is uneven, so a single logo that
  reads on both themes is the safer choice for a mirrored repo.
- Every image carries `alt` text.

## Badges

Badges are signal, not decoration. Keep four to six. Each must earn its
place: CI status, latest release, license, and coverage only if a gate
actually enforces it. Drop per-dependency badges, star counts on an
internal repo, "PRs welcome" and anything that restates another badge.

CI status on GitHub Actions:

```markdown
![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg?branch=main)
```

The same on Forgejo Actions, which serves badges under `/badges/`:

```markdown
![CI](https://forgejo.example/OWNER/REPO/badges/workflows/ci.yml/badge.svg?branch=main)
```

Forgejo also serves `/badges/release.svg`, `/badges/issues/open.svg` and
`/badges/pulls/open.svg` natively. A static badge through shields.io:

```markdown
![license](https://img.shields.io/badge/license-MIT-blue)
```

A badge in a private repo is not reachable from outside it, so it renders
broken to a logged-out viewer. On a high-trust internal repo prefer the
host's native badges over an external image service, which can leak
referrer data.

## Accessibility

- Alt text on every image, describing its purpose, not the filename. An
  image that is pure decoration takes an empty `alt`.
- One H1, the title, then H2 for sections and H3 for subsections. Do not
  skip a level. The heading tree drives the auto-generated outline.
- Never rely on color alone. A failing badge still reads the word
  failing. Do not write "the green button".
- Link text that makes sense out of context. Write "see the contributing
  guide", not "click here" or a bare URL.
- Short paragraphs, lists and tables over dense text, and a language tag
  on every fenced code block.

## What makes a README look low-effort

- A wall of text with no headings, lists or code.
- An emoji on every heading. This is the strongest template tell.
- Superlatives with nothing behind them, the figurative-jargon vocabulary
  the guards catch. The prose rules in `00-prose-and-output.md` apply here
  in full: a README that reads as AI-generated fails review.
- Restating the obvious, or narrating the structure of the document.
- No real usage example, or an example that hides its output.
- A row of low-signal badges.
- A half-filled template: a TODO, a `<your-project-name>` placeholder or a
  lorem-ipsum block left in place.

## Sources

- standard-readme: https://github.com/RichardLitt/standard-readme/blob/master/spec.md
- Make a README: https://www.makeareadme.com/
- About READMEs, GitHub: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes
- Workflow status badges, GitHub: https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/monitoring-workflows/adding-a-workflow-status-badge
- README badges, Forgejo: https://forgejo.org/docs/latest/user/readme-badges/
- shields.io: https://shields.io/
