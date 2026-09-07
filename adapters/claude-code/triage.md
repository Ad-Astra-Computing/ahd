---
name: triage
description: Move issues and external PRs through a small state machine of triage roles, categorise, verify, grill if needed and write agent-ready briefs.
disable-model-invocation: true
---

# Triage

Move issues on the tracker through a small state machine of roles. If
the repo treats external pull requests as a request surface, triage
covers them too: a PR is an issue with attached code, same roles, same
states.

House rule: a comment or issue you post lands under the owner's account
and in the owner's voice. Do not add a disclaimer that names an agent or
automation, and do not write a hand-off line such as "ready for
maintainer review". See `AGENTS.md`.

## Roles

Two category roles: `bug` (something is broken), `enhancement` (new
feature or improvement).

Five state roles: `needs-triage` (a person must evaluate), `needs-info`
(waiting on the reporter), `ready-for-agent` (fully specified, an agent
can take it), `ready-for-human` (needs a person) and `wontfix` (will not
be actioned).

Every triaged item carries one category role and one state role. If
state roles conflict, flag it and ask before doing anything else. The
label strings in the tracker may differ from these canonical names; the
mapping should be configured per repo.

## Show what needs attention

Query the tracker and present three buckets, oldest first: never
triaged, `needs-triage` in progress and `needs-info` where the reporter
has replied since the last notes. When PRs are in scope, include only
external ones and tag each line as PR or issue. Show counts and a
one-line summary, and let the person pick.

## Triage one item

1. Gather context. Read the full issue or PR, its comments, labels,
   author and dates, and for a PR the diff. Parse any prior triage notes
   so you do not re-ask settled questions. Explore the code using the
   domain glossary and respect the ADRs. Run two checks: redundancy,
   search for an existing implementation by concept, not just wording;
   and prior rejection, read any `.out-of-scope/` notes for a similar
   past request.
2. Recommend. Give your category and state recommendation with
   reasoning, plus a short codebase summary. Wait for direction.
3. Verify the claim. For a bug, reproduce it from the reporter's steps.
   For a PR, check it out and run the relevant tests to confirm the diff
   does what it claims. Report confirmed, failed or not enough detail,
   which is a strong `needs-info` signal.
4. Grill if the request needs shaping.

   > Run playbook: grilling

   > Run playbook: domain-modeling

5. Apply the outcome. `ready-for-agent`: post a brief (below).
   `ready-for-human`: same brief plus why it cannot be delegated.
   `needs-info`: post notes with what is established and the specific
   questions outstanding. `wontfix`: if already implemented, point to
   where it lives and close; if rejected, explain plainly, record an
   enhancement rejection under `.out-of-scope/`, and close.

## Agent brief

A brief is what lets an agent start cold. State the goal in one plain
sentence, the acceptance criteria, the relevant code paths found during
triage, and the reproduction or verification already done. Write it so a
fresh agent needs nothing else.

## Resuming

If prior triage notes exist, read them, check whether the reporter
answered, and present an updated picture before continuing. Do not
re-ask resolved questions.
