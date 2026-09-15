# Development method

Every non-trivial change follows the same loop: spec, then a failing
test, then the code that makes it pass, then refactor.

## Spec-driven

Write a short spec before code. It states the problem, the intended
behavior, the alternatives you rejected and the acceptance criteria.
Specs live in `docs/specs/` and use `docs/specs/template.md`. Trivial
changes such as typo fixes are exempt.

A decision that is cross-cutting or hard to reverse gets an Architecture
Decision Record in `docs/adr/`, using the Nygard format in
`docs/adr/template.md`. Number ADRs sequentially and never reuse a
number. Do not rewrite an accepted ADR: supersede it with a new one and
mark the old one superseded.

A spec that runs past one page is a sign the work should be split.

## Test-driven

Write the failing test first. Make it pass with the smallest change.
Refactor with the tests green. The red state that precedes the code is
the proof the test drove the change, and it belongs in the history.

Shape the suite as a pyramid. Many fast unit tests. A middle layer of
integration tests. A thin layer of end-to-end tests reserved for real
user journeys. Reach for table-driven tests when a unit has many input
and output cases, and property-based tests for parsers, encoders and
invariants.

Coverage is a negative signal, not a target. Low coverage is a problem;
a high percentage proves little. Judge a test by whether it would catch
a real defect, and require a meaningful assertion in every test. A
coverage floor may guard against regressions, but it is never the
acceptance bar.

A stub proves the caller's logic, not the integration. Code that talks to
a real service, an endpoint, a model, a queue, is not done until it has
run against that service at least once, not only against a mock. A green
unit test over a fake is necessary, never sufficient. Gate the live check
behind its own credentials so CI skips it without them, and run it
yourself before you call the work done.

## A control is not tested until a test operates it

A suite can cover a feature thoroughly and still never use it. Tests that
render a page, measure it and read its markup all observe; none of them press
the thing the reader presses. Appearance and behaviour fail independently, and
a control that is laid out correctly and does nothing passes every test that
only looks.

- For anything a reader operates, a test performs the action and asserts the
  state the reader would then see. Not that the handler is bound, not that the
  element is present: click it, and check what changed.
- Exercise the whole range, not one representative. Bugs live at the ends and
  past them, in the item a hardcoded bound cuts off.
- Assert against what the reader can observe, such as the text that states
  which item is showing, rather than internal state a refactor can rename.
- Where a control has a second path for keyboard or assistive tech, test that
  path too. It is a separate implementation and it fails separately.

The corporate site shipped a revision scrubber with layout tests at two
viewports and no test that clicked a date. An invisible slider serving keyboard
users sat over the dates and swallowed every click, and its maximum was a
placeholder that stopped six revisions short. The feature was inert on all four
pages for as long as it had been public, and the owner found it, not the suite.

## Diagnose from evidence, not from a hypothesis that fits

A plausible cause is not a cause. The trap is that a good hypothesis explains
the symptom well enough to act on, so the fix goes out, the symptom stays, and
the next hypothesis is built on the wreckage of the first.

Read the thing itself before changing code. Most of what you need is already
being printed somewhere and nobody has looked at it.

- Read the response headers, the stored value, the build output and the exit
  code of the command you actually ran. One of them usually says outright what
  you are about to spend an hour inferring.
- Check the exit code of the command you care about, not of the last one in
  the pipe. A status of zero from `tail` says nothing about the `git fetch`
  feeding it, and a stale tracking ref will report the remote agreeing with you
  when the fetch never completed.
- Ask the system, not its configuration. A record listed twice in an API is not
  necessarily served twice; query the resolver. A long value split across two
  strings is one value, and "fixing" it breaks something that worked.
- A green suite is not a green build. Run the build before the commit, because
  bundlers reject things test runners tolerate.
- When a fix deploys and the symptom survives, stop and find out whether the
  code ran at all. A cached response, a route that never matched or a task on a
  schedule that has not fired yet all look exactly like a fix that did not work.
- Say which reading you took. "The header said HIT" can be checked by someone
  else; "it seemed to be cached" cannot.

Three deploys were once spent on a severity that would not update. The cause
was in the response header the whole time: the request was served from cache
and the new code had never executed.

## Read the documentation before concluding the platform is broken

The section above is about reading your own system's output. This one is about
reading someone else's manual, and it guards a different mistake: not fixing
the wrong thing, but fixing a thing that was never broken.

An error message describes what the system refused, not why. Reasoning from
one, or from how a similar resource behaves, produces a confident diagnosis
that sends you to change something nobody asked you to touch.

The tell is a conclusion of the form "this is stuck" or "this is not
supported". Both are claims about the platform, and the platform has written
down what it does.

- Read the vendor's page for the thing before deciding the thing is broken.
  Where it states a timescale, a rollout window or a propagation delay, that
  is the answer and there is nothing to fix.
- A refused API call tells you that one call was refused. It does not tell you
  the operation is unavailable, and it does not tell you the operation was
  needed.
- Comparing against a similar resource that works is a hypothesis, not a
  diagnosis. Two resources can differ for reasons unrelated to the one you are
  chasing.
- Before acting on "the platform is broken", say which page you read. If the
  answer is none, reading it is the next step rather than the fix.
- Where documentation and observed behaviour genuinely disagree, record it: say
  what you read, what you saw and which one you acted on.

DNSSEC on a zone was reported as stuck and needing manual work, from a
registrar API refusing a write and a similar zone already showing its DS
record. The documentation said Cloudflare submits DS records automatically for
its own registrar domains and that the scan takes one to two days. Nothing was
stuck and nothing needed doing. The write that was refused was never
required.

## A test that is not deterministic is not a test

A test that passes on one run and fails on the next teaches the team to
rerun rather than to read, and the first real regression it catches is
dismissed as noise.

- Treat a flaky test as a failure, not a nuisance. Fix it in the run where
  you see it flake, before the work it was guarding is called done.
- Wait for the condition, not for a duration. Poll for the state the test
  needs, and where a fixed delay is unavoidable, give it enough margin that
  a slow machine cannot land inside the window.
- Assert on what the code guarantees. A test written against incidental
  timing, ordering or spacing fails on a machine that is merely different.
- Run a new or repaired test twice before trusting it green.

## Walk the deployed surface before you call it done

A passing suite says the code behaves the way the test set it up to behave.
It says nothing about the surface a user reaches, because the suite never
resolves a real hostname, never presents a real session and never touches
the real dependency behind the route.

So the last step of every change that ships a surface is to open that
surface where the user opens it and use it, with the browser console
visible.

- Load the page in the environment it was deployed to, not a local dev
  server. Sign in the way a user signs in.
- Exercise each panel on the page, not only the one you changed. A
  neighbouring panel that has quietly been broken for a month is your bug
  the moment you were the last person on that page.
- Read the console and the network tab. A failed request or a thrown error
  is a defect even when the page looks right, and it is the cheapest defect
  you will ever find.
- A panel still rendering its loading state after the request settled is a
  failure, not a slow load. Wait for it to settle before you move on.
- When you cannot reach the surface yourself, say so plainly and name what
  went unverified. An unexercised surface reported as finished is worse
  than one reported as blocked.

## The two together

The spec is the what and the why. The tests are the executable proof.
The code is the how. A feature is done when every acceptance criterion
in the spec has a passing test.

## A claim made to someone else is a finding, and needs the same evidence

The rule above governs diagnosis, and diagnosis is not where this usually
fails. It fails in the sentences written between investigations: what a file
contains, whether an endpoint exists, what a service will do once something
else changes. Those arrive feeling like recall rather than like findings, so
they never trigger the checking that a symptom would.

That feeling is the problem. Recall is reconstruction, and it reconstructs
confidently whether or not it is right.

- Before stating that something is absent, query for it. "It is not there" is
  the easiest claim to make and the one most often made against the wrong
  host, path or name. Absence needs stronger evidence than presence, not
  weaker.
- Before stating that a change will improve something, check that the code
  taking the change is the code serving the thing. Two call sites that look
  alike are not one call site.
- Before recommending an approach, test the assumption it rests on. A plan
  that cannot work is more expensive than no plan, because it is acted on.
- Say which command produced the answer. A claim with a command behind it can
  be re-run by whoever doubts it; one without is an opinion wearing the
  clothes of a fact.
- When a claim turns out to be wrong, correct it plainly and say what the
  check was that would have caught it. The correction is worth less than the
  missing check.

## Search the project before building for it

Before writing a feature, find out whether the project already has one. Read
the API description, the specs directory and the route table for the thing you
are about to add. This costs a minute and the alternative costs a day, plus a
revert.

- Grep the interface description first: an OpenAPI document, a route table, a
  command list. A name close to the one you were about to use is the signal.
- Then grep the specs and design notes. A document explaining the problem you
  are solving means somebody solved it.
- Say what you searched and what you found before building. Naming the files
  read and the terms used is worth writing down: it is either true and you
  proceed, or it is false and you have just saved the work.
- A duplicate costs more than the wasted effort. Two implementations of one
  idea drift apart, and where the output is public they contradict each other
  in front of the people relying on it, each with its own names and
  identifiers for the same thing.
- The same check applies to a defect. Before fixing something, look for the
  code that already handles it, or you will add a second mechanism beside a
  working one.

## Judge an example by what it shows, not by whether it returns

Anything placed in front of someone as a demonstration is a claim about the
product: a sample query, a worked example in a README, a default in a form, a
seeded record. It has to be judged as one. A check that it returns something
is not that judgement; it only rules out the most obvious failure.

- Ask what the example demonstrates to a person who has never seen the thing
  before, because that is who clicks it first. Two stale records and a thin
  result set say the data is thin, whatever the feature is worth.
- Look at volume, recency and relevance together. Any one of them alone
  passes cases the other two would reject.
- Compare against the alternatives before settling. The first candidate that
  works is rarely the best one available, and the cost of trying three more is
  a few minutes.
- When nothing available demonstrates the thing well, say so and leave it out.
  A weak example is worse than none: it is read as the best the product can
  do, and nobody looks past it.
- The bar rises with reach. A demonstration on a public landing page is seen
  by everyone who arrives, most of whom will form their whole impression from
  it and leave.

## Sources

- Kent Beck, Canon TDD: https://newsletter.kentbeck.com/p/canon-tdd
- The practical test pyramid: https://martinfowler.com/articles/practical-test-pyramid.html
- Test coverage as a signal: https://martinfowler.com/bliki/TestCoverage.html
- Documenting architecture decisions (Nygard): https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
