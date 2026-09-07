# grilling

Grill the user relentlessly about a plan, decision or idea. Use when the user wants to stress-test their thinking or uses a 'grill' trigger.

# Grilling

Interview the user relentlessly until you reach a shared understanding.
Map this as a design tree: every decision branches into the decisions
that hang off it.

Work the tree in rounds. The frontier is every decision whose
prerequisites are already settled, meaning the questions you can ask now
without guessing at answers you have not heard yet. Ask the whole
frontier in one round. Number each question and give your recommended
answer. Then wait for the user's answers before the next round.

Format a round like this:

```
Q1 - <question title>: <question body, may be several paragraphs,
including any choices>

Recommended: <your recommended answer>

---

Q2 - <question title>: <question body>

Recommended: <your recommended answer>
```

Each round of answers reshapes the tree. Settled decisions push the
frontier outward and unblock questions that depended on them. Recompute
the frontier and ask the next round. A question whose answer depends on
another question still open in this round belongs to a later round.

Finding facts is your job, never the user's. When a frontier question
needs a fact from the environment, the filesystem or a tool, find it
yourself, with a subagent if you have that capability. Do not block on
it: a running exploration is an unsettled prerequisite, so only the
questions downstream of it wait; ask the rest of the frontier now. The
decisions are the user's. Put each to them and wait.

The session is done when the frontier is empty: every branch of the tree
visited, nothing left silently assumed. Do not act on the result until
the user confirms you have reached a shared understanding.
