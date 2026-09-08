# Prose and output

The most-repeated rule at Ad Astra: nothing we write may read as
machine-written. It applies to every artifact, not only marketing copy.
Commits, PR bodies, issues, release notes, changelogs, specs, code
comments and chat replies are all in scope.

## The reasoning

Readers spot machine-written text by a small set of habits. Once a
reader sees them, they stop trusting the content. On a public repo the
cost is reputational, so the bar is that a tired human engineer could
have written the line.

## Tone

Write so a non-expert can follow, without dumbing the content down. The
tone to match is the tulpa foreign-agents guide at
https://docs.tulpa.network/guide/foreign-agents/. It explains a
technical topic clearly and never reaches for a jargon word to sound
expert. The blog at https://blog.odoom.net is the informal end of the
range; the standard sits a little more formal than that.

These rules matter most for PR bodies, since many people read them.

- Lead with the change in one plain sentence: what it does and who it
  affects, before any reasoning.
- Keep sentences under about 25 words. Split a longer one.
- Address the reader in second person and active voice. Write "this
  adds X", not "X has been added".
- Define a non-obvious term the first time it appears, inline, in half a
  sentence. If you cannot, the term is too big for that sentence.
- Spell out an acronym on first use, then use the short form.
- Cut intensifiers and marketing words. The enforced set is in
  `hooks/lib-tells.sh`; more jargon to avoid is in `tone-examples.txt`.
- Describe a failure in the same plain register as the success: what
  breaks, what is rejected, what the reader sees when it goes wrong.
- Prefer the specific verb to the abstract noun. Write "scans the
  message", not "runs a scan of the message".
- One idea per sentence.

Worked rewrites and a list of jargon that hides meaning are in
`tone-examples.txt`, kept as plain text so its anti-examples do not trip
the prose guard.

## Categories the guards catch

The enforced list is `hooks/lib-tells.sh`, shared by every guard so the
definitions never drift. It covers four families:

- Figurative jargon and inflated verbs that cluster in model prose.
- Filler and throat-clearing openers that add no information.
- False-contrast cadences that deny one thing to assert another.
- Shape tells: emphasis used to punch a claim mid-sentence, headings
  written as sentences rather than labels, and a run of short-label
  bullets that all look the same.

The single strongest structural tell is a list where every item is a
short bold label followed by one explanatory sentence. Do not write
that. Uniform paragraph length and identical sentence rhythm are the
next strongest, so vary sentence length on purpose.

## Punctuation

No em dashes. A reader treats them as a strong sign of generated text.
Use a comma, a colon or two sentences. A real en dash inside a numeric
or code range is correct and the guards leave heading lines alone, so do
not "fix" a range. One exception rides on that carve-out: a heading may
use a dash between a date and a title, which is the DECISIONS log
convention. The guard skips heading lines, so it is allowed there and
nowhere else.

No Oxford commas. Write "a, b and c" rather than "a, b, and c".

## Commit and PR prose

Name the change, do not narrate it. A subject that needs "wherever",
"that", a subordinate clause or an "and" joining two changes is either
too long or should be two commits. Bodies are the exception, a few plain
lines only when the why is not obvious. Never a bullet list, never an
"Adds X, implements Y" template, never a "what / how / why" scaffold. The
test is simple: does it look like a commit in the Linux kernel or the Go
core, or does it look like a release-notes generator wrote it.

PR bodies are two or three short plain paragraphs. What broke, what
changed, what else you found. No headers, no bold, no emoji.

## A public artifact is not a work log

A pull request, an issue, a release note and a commit message are read by
people who were not in the work. They want what changed and what it means for
them. The deliberation behind it is not theirs to read, and including it is
how an artifact starts sounding like notes to yourself.

- Say what broke, what changed and what else you found. Then stop.
- Cut every part that exists to show your work. An "out of scope" section, a
  "not addressed" list, a verification narrative, a caveat written for a
  colleague who already has the context: none of it belongs. Where a decision
  genuinely affects a reader it is one sentence in the body. Everything else
  goes to the owner directly.
- Structure is itself a tell. Headings, bold labels and bullet lists turn a
  change description into a status report.
- A finding that is real but out of scope is worth raising. Raise it where it
  can be acted on, an issue of its own or a message to the owner, not as an
  aside in an artifact about something else.

The hooks read phrasing, not register, so an artifact that passes the outbound
check can still read as a work log. Two habits close that gap. Re-read the
standard for the artifact at the moment you post it rather than trusting your
memory of it, because the rule you learned last week is not in front of you
while you are writing. Then read the draft once as its reader rather than its
author, and cut what only the author needed.

## Public argument prose

A letter, a manifesto or a positioning page argues; it does not describe a
product. The register differs from documentation and the guards do not catch
what goes wrong here.

- Argue from the world the reader is heading into, not from what we sell.
  Our products appear as evidence, late, and briefly.
- Balance the three appeals deliberately. Ethos is what we have built and
  can be held to, logos is the argument someone could check, pathos is the
  stake for a real person. All logos reads as a spec, all pathos as a pitch.
- Use the vocabulary we use. An agent sends a response, not a reply.
- Cut the model's rhetorical furniture: a claim built on denying its
  opposite, a sentence announcing which question is worth asking, a phrase
  declaring what is no longer the hard part.
- Sentences the owner wrote stay as written. When editing around them, they
  are fixed points.
- Read it aloud before publishing. Anything you would not say in the room
  comes out.

## The cleanup stays private

Never name the AI-cleanup concern in a public artifact, and never open a
standalone PR just to scrub tells. Talk about house style instead, and
fold the fix into the next real change. A PR that announces it removed
machine-written phrasing is itself the embarrassment we avoid.

## Audit before shipping public prose

Before a public artifact ships, run the guards over it. `hooks/check-text.sh`
scans a file or stdin. Count em dashes per file, grep the tell list, and
look at the spread of paragraph lengths.

## Sources

- The enforced patterns: `hooks/lib-tells.sh`.
- House rules captured in agent memory across the Ad Astra hosts.
