# Punctuation and grammar

Small punctuation and grammar mistakes in public copy read as carelessness,
and they are cheap to avoid. A repository description once shipped as "Client
packages for AER, the flight recorder for AI agents" when it needed a colon:
"Client packages for AER: the flight recorder for AI agents". The comma turns
a definition into a dangling list; the colon says "namely". This file is the
rule set that stops that class of error, in descriptions, READMEs, docs,
commit messages and UI copy. Voice and the AI-tell vocabulary live in
`00-prose-and-output.md`; this file is the mechanics.

## Punctuation

- Colon to introduce a definition, an appositive or a list. If you could say
  "namely" or "that is" in its place, use a colon, not a comma. Right: "AER: the
  flight recorder for AI agents." Wrong: "AER, the flight recorder for AI
  agents."
- No comma splice. Two complete sentences cannot be joined by a comma alone.
  Use a period, a semicolon, or a comma with and/but/so. Wrong: "The build
  passed, we shipped it." Right: "The build passed, so we shipped it."
- Semicolon joins two closely related complete clauses, or separates list
  items that already contain commas. Do not use it where a colon introduces.
- Hyphen joins a compound modifier before a noun; drop it after the noun and
  after any -ly adverb. Right: "an open-source library", "the library is open
  source", "a fully managed service". Wrong: "a fully-managed service".
- En dash for numeric ranges only: "pages 10-20", "the 2024-2025 release".
- No em dash. Recast with a colon, a comma pair, parentheses or a period.
  Where you would reach for one to set off a phrase, use a comma pair or
  parentheses: "AER, the recorder, is stable" or "AER (the recorder) is
  stable". See `00-prose-and-output.md`.
- No serial comma. Write "logs, metrics and traces", not "logs, metrics, and
  traces". When dropping it is genuinely ambiguous, reorder or split the
  sentence rather than adding the comma back.
- Possessive takes an apostrophe; a plural does not. "the agent's logs" (one),
  "the agents' logs" (many), "its config" (possessive), "it's failing" (it
  is). Acronym plurals take no apostrophe: "APIs", "SDKs", "IDs".
- Code font, not quotation marks, for commands, flags, filenames and literal
  values: "Run `git status`", "set the flag to `true`". Never pull a sentence
  period inside a backtick span, it changes the literal string.
- Sentence case for headings and UI labels: "Configure the client", not
  "Configure The Client". Proper and product names stay capitalized.

## Match the audience

- For developers, assume the toolchain is known. Be terse and exact. Lead with
  the command or the signature, show copy-pasteable examples and the expected
  output, and use one term per concept. Never vary "endpoint", "route" and
  "URL" for the same thing.
- For end users, assume the goal not the internals. Explain in tasks and
  outcomes, define a term on first use, and name UI elements in bold.
- Both share the same spine: second person, active voice, present tense, one
  idea per sentence. "Run the migration", not "The migration should be run".

## Structure a document by its job

Keep the four Diataxis modes separate rather than blending them:

- Tutorial: a guided first success for a newcomer.
- How-to: steps to reach one real goal, for someone past the basics. The
  heading starts with a verb: "Configure the exporter".
- Reference: dry, complete, accurate description of the machinery. The heading
  starts with the noun: "Exporter configuration".
- Explanation: the background and the why.

Front-load every level: state the outcome before the procedure, the point
before the detail. Keep sentences under about 25 words, one idea each. Use
numbered lists for sequences and bullets for sets, with parallel grammar
across items. Show a short example, then one line on what it does.

## Durable principles

Omit needless words. Prefer the active voice and concrete, specific language.
Put statements in positive form and do not overstate. Know the reader and
organize by what they need to do. One term per concept, no synonyms for
variety, no hedges or filler. Prefer the example to the abstract claim.

## Sources

- Google developer documentation style guide: https://developers.google.com/style
- Microsoft Writing Style Guide: https://learn.microsoft.com/en-us/style-guide/welcome/
- The Chicago Manual of Style: https://www.chicagomanualofstyle.org/
- Diataxis, a framework for documentation: https://diataxis.fr/
- Plain language guidelines, Digital.gov: https://digital.gov/guides/plain-language/
