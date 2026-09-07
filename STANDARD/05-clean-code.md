# Clean code and architecture

The durable, enforceable core of Robert Martin's work is naming, single
responsibility and the dependency rule. The contested part is the advice
to make functions ever smaller, which drives indirection and shared
state across a scatter of tiny functions. Ad Astra keeps the boundaries
and rejects length as a metric.

## Rules

- Names reveal intent. A name states what a thing is or does with no
  decoding. No abbreviations, no "manager" or "util" catch-alls. Rename
  on sight when a name misleads.
- Enforce the dependency rule. Business logic, meaning entities and use
  cases, has no import dependency on frameworks, databases, UI or IO.
  Those are reached through interfaces the core defines. This boundary is
  checked in review, and by import lint rules where the language allows.
- Apply SOLID as guidance, single responsibility and dependency
  inversion above all. Do not extract a function or a class only to hit a
  size limit.
- Prefer a deep module: a small interface over a substantial
  implementation. Split a unit when it has more than one reason to change
  or mixes distinct concerns, not because it crossed a line count.
  Function length is a smell to look into, never a gate that blocks a PR.
- When the length advice and readability collide, readability wins.
  Record the deviation rather than adding indirection to satisfy dogma.

For code that an agent generates, the architecture boundaries matter
most. They keep the generated logic testable and portable, and they
contain the blast radius of any one module.

## Sources

- The clean architecture: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- Ousterhout on deep modules: https://web.stanford.edu/~ouster/cgi-bin/book.php
- The Ousterhout and Martin debate: https://github.com/johnousterhout/aposd-vs-clean-code
