# Documentation is one artifact

Documentation for a project usually lives in more than one place: a README,
files under `docs/`, a published site, generated reference output. They are
one artifact with several renderings, and a change that updates one and not
the others has published a contradiction. Readers do not know which
rendering is the current one, so the stale rendering is the one they act on.

## Ships with the change that invalidates it

- A change to behaviour updates every place that describes that behaviour,
  in the same change. Not a follow-up, and not a ticket.
- Know the full set before you start. List it once, keep the list in the
  context file, and walk it.
- A published site is not downstream of the repository, it is a peer.
  Neither is allowed to be the stale one.
- Prefer generating a fact over restating it. Anything derived from the
  code, a version, a route table, a flag list, is generated or checked by
  CI, so the two cannot drift.

## Runnable renderings count

The set is wider than prose. Anything that shows the reader how the thing
works is a rendering of the same artifact, and code renderings fail louder
than paragraphs, because a reader copies them.

- Example programs, quickstarts and sample configurations are updated with
  the change, and they are run, not read. An example that no longer
  compiles is a broken page with a worse failure mode.
- Interoperability fixtures and conformance vectors are part of the
  contract, not a test detail. A wire change that lands without them leaves
  every other implementation reading a spec nothing enforces.
- A second implementation of the same contract, in another language or on
  another platform, moves in the same change or the change is not done.
  Where it genuinely cannot, say which one is behind and what is missing,
  in the release notes, before anyone finds out by using it.
- A client or app that mirrors a surface counts too. Parity is a property
  of the release, not a follow-up milestone.

## Sources

- Diátaxis, the four documentation modes: https://diataxis.fr/
- Docs as code: https://www.writethedocs.org/guide/docs-as-code/
