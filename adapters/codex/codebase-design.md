# codebase-design

Shared vocabulary for designing deep modules. Use when the shape of an interface or a seam is in question, or when comparing designs.

# Codebase design

A small vocabulary for talking about structure, so a design discussion
stays precise. Use these words exactly and do not drift into "component",
"service" or "boundary".

- Module: a unit that hides an implementation behind an interface.
- Interface: what a caller sees and depends on. Everything else is
  hidden.
- Depth: how much a module does relative to how much its interface
  exposes. A deep module hides a lot behind a small interface.
- Seam: the public boundary you observe behavior at, and therefore where
  a test lives.
- Adapter: a thin piece that translates between a module's interface and
  the outside, such as a framework or an IO library.
- Reach: how much a module does per unit of interface. High reach is the
  goal. The source project uses a different word for this idea.
- Locality: keeping the code that changes together in one place, so a
  change does not fan out across many files.

## Principles

- The interface is the test surface. If a module is hard to test through
  its interface, the interface is wrong, not the test.
- Prefer a deep module: a simple interface over a substantial
  implementation. A shallow module, whose interface is nearly as complex
  as its implementation, earns its place rarely.
- The deletion test: if deleting a module would concentrate complexity
  rather than just move it elsewhere, it is deep and worth keeping.
- One adapter is a hypothetical seam. Two adapters for the same
  interface make the seam real, so design the interface for the second
  one only once it exists.

## Designing it twice

For a central interface, sketch two genuinely different designs
before committing, and compare them on depth, reach and locality. The
second design is often better, and having both makes the trade-offs
visible.
