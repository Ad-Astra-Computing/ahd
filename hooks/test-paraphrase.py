#!/usr/bin/env python3
"""Tests for the paraphrase client's local guards. Run: python3 hooks/test-paraphrase.py"""

from __future__ import annotations

import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location(
    "paraphrase", os.path.join(HERE, "paraphrase.py")
)
paraphrase = importlib.util.module_from_spec(spec)
spec.loader.exec_module(paraphrase)

failed = 0


def check(name: str, got, want) -> None:
    global failed
    if got == want:
        print(f"ok   {name}")
    else:
        failed += 1
        print(f"FAIL {name}: got {got!r}, want {want!r}")


check(
    "clean prose is not a secret",
    paraphrase.secrets_in("The build passed, so we shipped it. Nothing else changed."),
    False,
)
# Assembled at runtime so this file never holds a token-shaped string.
fake_token = "ghp_" + "A1b2C3d4" * 4 + "E5f6"
check(
    "a GitHub token shape is a secret",
    paraphrase.secrets_in(f"Set the token to {fake_token} before you run it."),
    True,
)

wrapped = (
    "The exporter reads the queue once a minute and writes each record to\n"
    "the store. If the store rejects a record, the exporter keeps it in the\n"
    "queue and tries again on the next pass, up to three times."
)
reworded = (
    "The exporter reads the queue once a minute and writes each record to the "
    "store. When the store rejects a record, the exporter keeps it queued and "
    "tries again on the next pass, up to three times."
)
out = paraphrase.rewrap(wrapped, reworded)
check("rewrap keeps the words", out.split(), reworded.split())
check(
    "rewrap holds the input width",
    max(len(l) for l in out.splitlines()) <= max(len(l) for l in wrapped.splitlines()),
    True,
)
check("rewrap wraps to more than one line", len(out.splitlines()) > 1, True)
check(
    "a single-line input stays a single line",
    paraphrase.rewrap("One line in, however long it is.", reworded),
    reworded,
)
listed = "- first item that is long enough\n- second item that is long enough"
check("a list block is left as returned", paraphrase.rewrap(listed, reworded), reworded)
indented = "  The first line is indented\n  and so is the second one here."
out = paraphrase.rewrap(
    indented, "The first line is indented and so is the second one here, reworded."
)
check(
    "rewrap keeps the indent", all(l.startswith("  ") for l in out.splitlines()), True
)

near = (
    "The build passed, so we shipped it. Nothing else changed today, and the "
    "release notes list the one fix that went out with the build this morning."
)
check(
    "a near-identical reword is not drift",
    paraphrase.drift(near, near.replace("today", "this week")),
    [],
)
check(
    "similarity reports a near-identical reword",
    paraphrase.similarity(near, near.replace("today", "this week")) > 0.95,
    True,
)
check(
    "a dropped number is still drift",
    paraphrase.drift("Retry 3 times before you give up.", "Retry before you give up."),
    ["numbers added, dropped or changed"],
)

check(
    "a serial comma is an advisory",
    [
        h.split(":")[0]
        for h in paraphrase.advisories_in("We ship logs, metrics, and traces.")
    ],
    ["serial comma"],
)
check(
    "a contraction is an advisory",
    [h.split(":")[0] for h in paraphrase.advisories_in("You can't run it twice.")],
    ["contraction"],
)
check(
    "a list without a serial comma is clean",
    paraphrase.advisories_in("We ship logs, metrics and traces. It's fine."),
    ["contraction: It's"],
)
check(
    "a possessive is not a contraction",
    paraphrase.advisories_in("The agent's logs and the agents' logs."),
    [],
)

# The guard rejects a wider vocabulary than the model is told to avoid. A word
# only the guard knows is one the reword cannot remove on purpose and will then
# report against itself, so a --send over prose holding one can never exit 0.
# The two lists live in different files and different syntaxes, so nothing but
# this test stops them drifting apart again.
import pathlib
import re

lib = (pathlib.Path(HERE) / "lib-tells.sh").read_text()


def expand(pattern: str) -> list[str]:
    """Split a guard pattern into the phrases it matches.

    A group such as "comprehensive (suite|guide|overview)" is three phrases,
    not an alternate called "guide". Splitting on the bar without expanding
    first invents bare words the guard never rejects on their own.
    """
    out = [""]
    terms: list[str] = []
    i = 0
    while i < len(pattern):
        c = pattern[i]
        if c == "(":
            close = pattern.index(")", i)
            inner = pattern[i + 1 : close].split("|")
            out = [prefix + alt for prefix in out for alt in inner]
            i = close + 1
        elif c == "|":
            terms.extend(out)
            out = [""]
            i += 1
        else:
            out = [prefix + c for prefix in out]
            i += 1
    terms.extend(out)
    return terms


def alternates(name: str) -> list[str]:
    m = re.search(rf"^{name}=(['\"])(.*?)\1", lib, re.M | re.S)
    return [] if not m else expand(m.group(2))


def literal(term: str) -> bool:
    """A term still carrying regex syntax is a pattern, not a word to quote."""
    return not re.search(r"[\[\]().*?+{}\\]", term)


def normalise(term: str) -> str:
    return term.lower().strip().rstrip(",.").replace("\u2019", "'")


check(
    "the expander splits a group into whole phrases",
    expand("big (cat|dog)"),
    ["big cat", "big dog"],
)
guard = {
    normalise(t)
    for t in alternates("TELL_WORDS") + alternates("TELL_PHRASES")
    if literal(t)
}
told = {normalise(a) for a in paraphrase.AVOID.split(",")}
check("the guard's word lists parse", len(guard) > 20, True)
check("the model is told every word the guard rejects", sorted(guard - told), [])

# The scanner joins a category's hits onto one line, so the carried-through
# check compares terms within a label rather than whole lines.
idx = paraphrase._by_label(
    ["flagged wording: seamless robust suite", "filler phrase: rest assured"]
)
check("hits are indexed by category", sorted(idx), ["filler phrase", "flagged wording"])
check(
    "a survivor of the input is carried through",
    paraphrase._carried("flagged wording: seamless", idx),
    True,
)
check(
    "a term the input never held is introduced",
    paraphrase._carried("flagged wording: delve", idx),
    False,
)
check(
    "a category the input never hit is introduced",
    paraphrase._carried("false contrast: isn't just", idx),
    False,
)


# The false-contrast list only knew the "not just X, but Y" join. A reword
# asked to avoid that phrasing reaches for the same cadence with a comma and a
# pronoun instead, which reads identically and passed the guard clean.
def flags(text: str) -> bool:
    return any("false contrast" in hit for hit in paraphrase.tells_in(text))


check(
    "the comma-and-pronoun false contrast is caught",
    flags("You do not just catch errors, you improve the whole process."),
    True,
)
check(
    "the third person form is caught",
    flags("The compiler does not just lint briefs, it rewrites them."),
    True,
)
check(
    "an ordinary negated sentence is left alone",
    flags("The runner does not just fail; it writes the reason to the log."),
    False,
)
check(
    "a plain sentence with a comma is left alone",
    flags("You do not need Docker, and the tests run without it."),
    False,
)


check(
    "placeholders in order pass",
    paraphrase.placeholders_ok("a MASK_0_MASK and MASK_1_MASK end", 2),
    True,
)
check(
    "a dropped placeholder fails",
    paraphrase.placeholders_ok("only MASK_0_MASK survived", 2),
    False,
)
check(
    "a duplicated placeholder fails",
    paraphrase.placeholders_ok("MASK_0_MASK MASK_0_MASK MASK_1_MASK", 2),
    False,
)
check(
    "a reordered placeholder fails",
    paraphrase.placeholders_ok("MASK_1_MASK then MASK_0_MASK", 2),
    False,
)
check(
    "an invented placeholder fails",
    paraphrase.placeholders_ok("MASK_0_MASK MASK_1_MASK MASK_2_MASK", 2),
    False,
)
check("no protected spans is fine", paraphrase.placeholders_ok("plain text", 0), True)


# CLI-level guards. These run main() over one stdin block with the transport
# stubbed, so no network is touched, and assert on the exact stdout: a rewrite
# the guards reject must never reach it, whatever the exit code says.
import io


def run_cli(text: str, stub):
    saved = (sys.argv, sys.stdin, sys.stdout, sys.stderr, paraphrase.call_cf)
    saved_env = {
        k: os.environ.get(k)
        for k in ("PARAPHRASE_ENDPOINT", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN")
    }
    os.environ["PARAPHRASE_ENDPOINT"] = ""
    os.environ["CLOUDFLARE_ACCOUNT_ID"] = "acct"
    os.environ["CLOUDFLARE_API_TOKEN"] = "tok"
    paraphrase.call_cf = stub if callable(stub) else (lambda m, t, a, k: (stub, 0.0))
    sys.argv = ["paraphrase", "--send", "--stdin"]
    sys.stdin = io.StringIO(text)
    out = io.StringIO()
    sys.stdout, sys.stderr = out, io.StringIO()
    try:
        code = paraphrase.main()
    finally:
        sys.argv, sys.stdin, sys.stdout, sys.stderr, paraphrase.call_cf = saved
        for k, v in saved_env.items():
            os.environ.pop(k, None) if v is None else os.environ.__setitem__(k, v)
    return code, out.getvalue()


CLEAN = (
    "We ship the build logs and the metrics to the shared store so the whole "
    "team can review them at the end of each working day here without fuss."
)
INTRODUCES = (
    "We seamlessly ship the build logs and the metrics to the shared store so "
    "the whole team review them at the end of each working day here for good."
)
code, out = run_cli(CLEAN, INTRODUCES)
check("an introduced tell keeps the original off stdout", out.strip(), CLEAN.strip())
check("an introduced tell exits nonzero", code, 1)

SWAP_IN = (
    "We will refund you the full amount, and we will never charge you again "
    "once you cancel the paid account that you now hold with us here today ok."
)
SWAPPED = (
    "You will refund us the full amount, and you will never charge us again "
    "once we cancel the paid account that we now hold with you here today ok."
)
_, out = run_cli(SWAP_IN, SWAPPED)
check("a person swap keeps the original off stdout", out.strip(), SWAP_IN.strip())


def _boom(m, t, a, k):
    raise RuntimeError("curl failed")


_, out = run_cli(CLEAN, _boom)
check("a transport error keeps the original off stdout", out.strip(), CLEAN.strip())

TELLY = (
    "We utilize a comprehensive suite to seamlessly deliver value to the whole "
    "team across the entire platform on every single day of the working week."
)
CLEAN_REWRITE = (
    "We use a toolkit to deliver value to the whole team across the platform "
    "on every day of the working week and they read it before they begin here."
)
code, out = run_cli(TELLY, CLEAN_REWRITE)
check("a clean rewrite reaches stdout", out.strip(), CLEAN_REWRITE.strip())
check("a clean rewrite exits zero", code, 0)


print()
print("all passing" if failed == 0 else f"{failed} failing")
sys.exit(1 if failed else 0)
