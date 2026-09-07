# prototype

Build a throwaway prototype to answer a design question. Use when the user wants to sanity-check a state model or logic, or explore what a UI should look like.

# Prototype

A prototype is throwaway code that answers a question. The question
decides the shape.

## Pick a branch

Identify which question is being answered, from the prompt, the code, or
by asking if the user is around:

- "Does this logic or state model feel right?" Build a single shareable
  HTML file, free-play buttons plus a guided walkthrough, that pushes
  the state machine through cases that are hard to reason about on paper
  and that a non-developer can drive.
- "What should this look like?" Generate several very different UI
  variations on a single route, switchable by a URL parameter and a
  floating bar.

Getting the branch wrong wastes the whole prototype. If the question is
genuinely ambiguous and the user is away, default to the branch that
matches the surrounding code, a backend module to logic, a page to UI,
and state the assumption at the top.

## Rules for both

1. Throwaway from day one and clearly marked so. Put it next to the
   module or page it prototypes for, and name it so a casual reader sees
   it is not production. Obey the project's routing convention.
2. Trivial to run. A UI prototype starts from one command in the task
   runner. A logic demo is a single HTML file the user double-clicks. No
   thinking required to start it.
3. No persistence by default. State lives in memory. Persistence is the
   thing you are checking, not something to depend on. If the question
   is about a database, use a scratch one with a clear "wipe me" name.
4. Skip the polish. No tests, no error handling beyond what makes it
   run, no abstractions. The point is to learn fast.
5. Show the state. After every action, or on every variant switch,
   render the full relevant state so the user sees what changed.
6. Capture it when done. Fold the validated decision into the real code,
   then keep the prototype as a primary source: commit it to a throwaway
   branch off main, and leave a pointer to that branch and to the answer
   it settled on the implementation issue. Main keeps only the decision.
