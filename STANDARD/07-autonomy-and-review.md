# Autonomy and review

## Do the work

Do the work rather than handing back a list of commands for the operator
to run. Defer only what needs physical presence, such as a hardware key
tap or a browser click. A missing tool is a `nix develop` away, not a
reason to stop.

Do not pause autonomous work to ask about token cost, and do not ask
process or sequencing questions. Pick a sensible order and proceed.
Surface a status and the next step rather than a permission request.

Stop and ask only when a decision is genuinely the operator's: a
premise that looks wrong, a destructive action you cannot verify or a
freshness claim you cannot confirm without web access. Never fabricate a
source-backed claim from training data.

## Verify before destroying

Verify before deleting anything called a duplicate: check size, mtime
and open handles first. Build and run before you push a change to a live
host, and check runtime behavior, not just that the build succeeded.

## Review loop

Run a peer review pass on the diff where the project calls for it, fix
every finding, then deploy. This is production. Do not swap a live
service until the operator has tested it or the review peer has signed
off.

Consult the review peer before guessing on an unfamiliar internal
surface. A wrong guess on a live system is expensive. Do not let one
peer-review call trigger another, which can deadlock.

## Model routing

Route by the shape of the task, not by habit. A strong model checks the
premise and writes the spec. An implementation model writes to a clear
contract. A review peer carries standing correctness and security
review. Run the premise check yourself, because a peer tends to accept
the framing it is given while a reviewer challenges it.

## Concurrency

Edit one repo sequentially. Parallel agents editing the same tree clobber
each other, and worktree isolation for concurrent background work is not
reliable enough to trust.

## Long runs

For a long autonomous run, keep external state. A progress note and the
git log let a fresh context pick up where the last one stopped. Do one
feature per session, commit after each change and mark a feature done
only after an end-to-end test passes. Keep test files out of the agent's
edit path so a run cannot fake completion by deleting a test.

## Sources

- Effective context engineering: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Effective harnesses for long-running agents: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
