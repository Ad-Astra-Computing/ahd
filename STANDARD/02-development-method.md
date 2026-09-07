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

## The two together

The spec is the what and the why. The tests are the executable proof.
The code is the how. A feature is done when every acceptance criterion
in the spec has a passing test.

## Sources

- Kent Beck, Canon TDD: https://newsletter.kentbeck.com/p/canon-tdd
- The practical test pyramid: https://martinfowler.com/articles/practical-test-pyramid.html
- Test coverage as a signal: https://martinfowler.com/bliki/TestCoverage.html
- Documenting architecture decisions (Nygard): https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
