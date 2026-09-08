#!/usr/bin/env python3
"""Reword your own drafts and report the AI tells that survive.

Scope, deliberately narrow. This rewords prose you already own so it reads
less like machine output. It is NOT a de-watermarking tool and must not be
described as one:

  - It cannot certify that text fails any vendor detector. The detectors are
    not public.
  - The output is fresh model text. It carries its own stylometric signature,
    including the negative space left by the avoid-list below, which is
    identical in every file this touches. Against a stylometric or perplexity
    detector that may be worse than the input.
  - Reported detection drops for paraphrase attacks were measured with a
    frontier paraphraser against green-list watermarks, not with these models
    against a shipped vendor scheme.

Everything sent leaves your machine and goes to Cloudflare, so egress is
opt-in via --send and refused outright when the secret scanner objects.

Never rewritten, passed through byte for byte: fenced blocks, indented
blocks, blockquotes, tables, headings, link definitions, HTML and
frontmatter. Quotations included, because a rewritten quotation puts words in
someone's mouth. Blocks under 120 characters are also left alone: they are
too short to carry a statistical mark and short prompts make the models
answer about the text rather than reword it.

Output is stdout only. There is no in-place mode.

Usage:
  paraphrase.py --check FILE ...          # what would be sent, and cost. No calls.
  paraphrase.py --send FILE ...           # rewrite to stdout
  cat x | paraphrase.py --send --stdin
  paraphrase.py --send --rounds 2 FILE
"""

from __future__ import annotations

import argparse
import difflib
from collections import Counter
import json
import os
import re
import subprocess
import sys
import tempfile
import textwrap

# The prompt, avoid list, model allowlist and caps live in one place,
# shared/contract.json, so the Worker and this client never drift.
_CONTRACT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "shared", "contract.json"
)
with open(_CONTRACT_PATH, encoding="utf-8") as _fh:
    _CONTRACT = json.load(_fh)

CF_MODELS = _CONTRACT["models"]
NEURON_USD = 0.011 / 1000
MAX_CHARS = _CONTRACT["max_chars"]
MIN_BLOCK = _CONTRACT["min_block"]
MAX_TOKENS = _CONTRACT["max_tokens"]
TEMPERATURE = _CONTRACT["temperature"]
AVOID = _CONTRACT["avoid"]
PROMPT = _CONTRACT["prompt"].replace("{avoid}", AVOID)
MIN_RATIO = _CONTRACT["min_output_ratio"]
MAX_RATIO = _CONTRACT["max_output_ratio"]

# Inline spans the model must not touch: backtick code, URLs and numbers. They
# are swapped for opaque placeholders before the call and restored after, so
# the reword cannot alter a command, a link or a figure.
PROTECT = re.compile(r"`[^`]+`|https?://\S+|\b\d[\d,.]*\b")


def mask(text: str) -> tuple[str, list[str]]:
    spans: list[str] = []

    def repl(m: re.Match) -> str:
        spans.append(m.group(0))
        return f"MASK_{len(spans) - 1}_MASK"

    return PROTECT.sub(repl, text), spans


def unmask(text: str, spans: list[str]) -> str:
    for i, span in enumerate(spans):
        text = text.replace(f"MASK_{i}_MASK", span)
    return text


_PLACEHOLDER = re.compile(r"MASK_(\d+)_MASK")


def placeholders_ok(text: str, n: int) -> bool:
    """The reword kept every protected span exactly once and in order. Requires
    the placeholders in the output to read 0, 1, ... n-1 with none missing,
    duplicated, added or reordered. A protected number, link or command that
    the reword dropped, doubled or moved is caught here, before unmasking puts
    the real spans back and hides the damage."""
    return [int(i) for i in _PLACEHOLDER.findall(text)] == list(range(n))


FENCE = re.compile(r"^\s*(?:```|~~~)")
SKIP_LINE = re.compile(
    r"^\s*(?:>|\||#{1,6}\s|={3,}\s*$|-{3,}\s*$|\[[^\]]+\]:\s|<[a-zA-Z/!]|\t|    \S)"
)
NUMBER = re.compile(r"\d[\d,.]*")
META = re.compile(
    r"(?i)^(?:there is no|the (?:text|passage) (?:provided|between)|"
    r"i (?:cannot|can't|am unable)|sure[,!]|here (?:is|'s) the|"
    r"as an ai|no passage|please provide)"
)


def _run_curl(url: str, token: str, body: bytes) -> dict:
    fh = tempfile.NamedTemporaryFile("wb", delete=False, suffix=".json")
    fh.write(body)
    fh.close()
    try:
        proc = subprocess.run(
            [
                "curl",
                "-sS",
                "--max-time",
                "180",
                "-X",
                "POST",
                url,
                "-H",
                "@-",
                "-H",
                "Content-Type: application/json",
                "--data-binary",
                "@" + fh.name,
            ],
            input=f"Authorization: Bearer {token}".encode(),
            capture_output=True,
            timeout=200,
        )
    finally:
        os.unlink(fh.name)
    if proc.returncode != 0:
        raise RuntimeError(f"curl failed: {proc.stderr.decode()[:200]}")
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"unparseable response: {exc}") from exc


def call_cf(model: str, text: str, account: str, token: str) -> tuple[str, float]:
    body = json.dumps(
        {
            "messages": [{"role": "user", "content": PROMPT.replace("{body}", text)}],
            "max_tokens": MAX_TOKENS,
            "temperature": TEMPERATURE,
        }
    ).encode()
    data = _run_curl(
        f"https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/{model}",
        token,
        body,
    )
    if not data.get("success"):
        raise RuntimeError(f"workers ai: {data.get('errors')}")
    result = data["result"]
    choices = result.get("choices") or []
    if choices and (choices[0].get("finish_reason") or "") == "length":
        raise RuntimeError("output truncated; split the input")
    out = ""
    if choices:
        out = (choices[0].get("message") or {}).get("content") or ""
    out = (out or result.get("response") or "").strip()
    if not out:
        raise RuntimeError("model returned nothing")
    neurons = (result.get("usage") or {}).get("neurons")
    if neurons is None:
        raise RuntimeError("no neuron accounting; cost cannot be reported")
    return out, neurons * NEURON_USD


def call_endpoint(
    base_url: str, model: str, text: str, client_id: str, client_secret: str
) -> tuple[str, float]:
    """Send one masked block to the Worker, which wraps it in the shared
    prompt and returns the reword. The client never sends a raw prompt."""
    body = json.dumps({"text": text, "model": model}).encode()
    fh = tempfile.NamedTemporaryFile("wb", delete=False, suffix=".json")
    fh.write(body)
    fh.close()
    try:
        proc = subprocess.run(
            [
                "curl",
                "-sS",
                "--max-time",
                "180",
                "-X",
                "POST",
                base_url.rstrip("/") + "/v1/reword",
                "-H",
                "@-",
                "-H",
                "Content-Type: application/json",
                "--data-binary",
                "@" + fh.name,
            ],
            input=(
                f"CF-Access-Client-Id: {client_id}\n"
                f"CF-Access-Client-Secret: {client_secret}"
            ).encode(),
            capture_output=True,
            timeout=200,
        )
    finally:
        os.unlink(fh.name)
    if proc.returncode != 0:
        raise RuntimeError(f"curl failed: {proc.stderr.decode()[:200]}")
    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"unparseable response: {exc}") from exc
    if "error" in data:
        err = data["error"]
        raise RuntimeError(f"endpoint {err.get('code')}: {err.get('message')}")
    out = (data.get("output") or "").strip()
    if not out:
        raise RuntimeError("endpoint returned nothing")
    neurons = data.get("neurons")
    if neurons is None:
        raise RuntimeError("no neuron accounting; cost cannot be reported")
    return out, neurons * NEURON_USD


def split_blocks(text: str) -> list[tuple[str, bool]]:
    out, in_fence = [], False
    for para in re.split(r"(\n\s*\n)", text):
        lines = [l for l in para.splitlines() if l.strip()]
        fences = sum(1 for l in lines if FENCE.match(l))
        protected = (
            in_fence
            or fences
            or not lines
            or len(para.strip()) < MIN_BLOCK
            or any(SKIP_LINE.match(l) for l in lines)
        )
        out.append((para, bool(protected)))
        if fences % 2:
            in_fence = not in_fence
    return out


def _hook(name: str) -> str:
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), name)


def tells_in(text: str) -> list[str]:
    lib = _hook("lib-tells.sh")
    if not os.path.exists(lib):
        raise RuntimeError(f"lib-tells.sh missing at {lib}; refusing a clean verdict")
    proc = subprocess.run(
        ["bash", "-c", f'. "{lib}"; scan_tells "$1"', "_", text],
        capture_output=True,
        text=True,
    )
    if proc.returncode not in (0, 1):
        raise RuntimeError(f"tells scan failed: {proc.stderr[:200]}")
    return [l.strip() for l in proc.stdout.splitlines() if l.strip()]


def _by_label(hits: list[str]) -> dict[str, str]:
    """Index a scan by its category label.

    The scanner joins every hit in a category onto one line, so two scans over
    different text rarely produce an identical line even when they share a
    term. Comparing whole lines would call every survivor an introduction and
    send the reader hunting a regression in the model that is not there.
    """
    out: dict[str, str] = {}
    for hit in hits:
        label, _, terms = hit.partition(":")
        out[label] = out.get(label, "") + " " + terms.strip()
    return out


def _carried(hit: str, before: dict[str, str]) -> bool:
    label, _, terms = hit.partition(":")
    terms = terms.strip()
    return bool(terms) and terms in before.get(label, "")


def advisories_in(text: str) -> list[str]:
    """The advisory house rules the text breaks: a serial comma or a
    contraction. Advisory in the guards, since the patterns also match some
    correct prose, but a reword that adds one has broken a rule the input
    kept, so the caller treats an introduced hit as a failed block."""
    lib = _hook("lib-tells.sh")
    if not os.path.exists(lib):
        raise RuntimeError(f"lib-tells.sh missing at {lib}; refusing a clean verdict")
    proc = subprocess.run(
        ["bash", "-c", f'. "{lib}"; scan_advisory "$1"', "_", text],
        capture_output=True,
        text=True,
    )
    if proc.returncode not in (0, 1):
        raise RuntimeError(f"advisory scan failed: {proc.stderr[:200]}")
    return [l.strip() for l in proc.stdout.splitlines() if l.strip()]


def secrets_in(text: str) -> bool:
    """True when the text carries a secret. gitleaks when it is installed, a
    conservative regex otherwise. It never returns False without scanning: a
    missing scanner must not let a secret leave the machine."""
    fh = tempfile.NamedTemporaryFile("w", delete=False, suffix=".txt")
    fh.write(text)
    fh.close()
    try:
        try:
            proc = subprocess.run(
                [
                    "gitleaks",
                    "detect",
                    "--no-git",
                    "--source",
                    fh.name,
                    "--redact",
                    "--no-banner",
                    "--log-level",
                    "error",
                ],
                capture_output=True,
            )
            if proc.returncode in (0, 1):
                return proc.returncode == 1
        except FileNotFoundError:
            pass
        return bool(
            re.search(
                r"(?i)(api[_-]?key|secret|password|token)\s*[:=]\s*\S{12,}|"
                r"-----BEGIN [A-Z ]*PRIVATE KEY-----|"
                r"\b(gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|cfut_[A-Za-z0-9]{20,})\b",
                text,
            )
        )
    finally:
        os.unlink(fh.name)


def implausible(before: str, after: str) -> str | None:
    """Why the reword must be rejected, or None when it is a plausible reword.
    A reword stays close to the input in length and does not answer back. Text
    that collapses to a few words or balloons past the input is a refusal or an
    instruction obeyed from inside the passage, never a reword. Callers drop an
    implausible output and keep the input, so injected text can never surface."""
    if not after or META.match(after.strip()):
        return "model replied instead of rewording"
    ratio = len(after) / len(before) if before else 1.0
    if ratio < MIN_RATIO:
        return f"output collapsed to {ratio:.2f} of the input length"
    if ratio > MAX_RATIO:
        return f"output grew to {ratio:.2f} of the input length"
    return None


def guard(before: str, after: str) -> str:
    """The shipped output for one block: the reword when it is safe to use,
    else the input unchanged. Unsafe means an implausible length or a reply
    instead of a reword, or a lost number or link. The Worker enforces the
    length rule on the server; span loss is caught here, after unmasking."""
    if implausible(before, after):
        return before
    if drift(before, after):
        return before
    return after


def similarity(before: str, after: str) -> float:
    """Character-level similarity, 1.0 when the reword equals the input. A
    high value on a clean block means the model left it alone, which is the
    tool doing its job, so callers report it and never fail on it."""
    return difflib.SequenceMatcher(None, before, after).ratio()


# The pronoun, modal, negation and scope words that carry who is responsible
# and what is claimed. A reword must leave the count of every one unchanged: a
# change means the meaning moved, not the wording. "we may cancel" becoming "we
# will cancel", or "if we claim" becoming "if you claim", each shows up here.
GUARD_MARKERS = (
    "i", "me", "my", "mine", "we", "us", "our", "ours",
    "you", "your", "yours",
    "may", "might", "must", "shall", "will", "would", "can", "could", "should",
    "not", "no", "never", "cannot", "none", "neither", "nor",
    "only", "all", "every", "each", "any", "most", "both", "either",
)


def _marker_counts(text: str) -> dict[str, int]:
    low = text.lower()
    counts = {w: len(re.findall(r"\b" + re.escape(w) + r"\b", low)) for w in GUARD_MARKERS}
    counts["not"] += len(re.findall(r"n't\b", low))
    return counts


def drift(before: str, after: str) -> list[str]:
    issues = []
    if Counter(NUMBER.findall(before)) != Counter(NUMBER.findall(after)):
        issues.append("numbers added, dropped or changed")
    url = re.compile(r"https?://\S+")
    if Counter(url.findall(before)) != Counter(url.findall(after)):
        issues.append("urls added, dropped or changed")
    if META.match(after.strip()):
        issues.append("model returned commentary or a refusal instead of a rewrite")
    if len(after) < len(before) * 0.6:
        issues.append(
            f"shrank {len(before)} to {len(after)} chars; content may be missing"
        )
    before_marks, after_marks = _marker_counts(before), _marker_counts(after)
    changed = [w for w in GUARD_MARKERS if before_marks[w] != after_marks[w]]
    if changed:
        issues.append("person, modality or scope changed: " + ", ".join(changed[:8]))
    return issues


LIST_LINE = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s")


def rewrap(before: str, after: str) -> str:
    """Give the reword the input block's line wrapping, so a diff shows the
    words that changed and not every line. A hard-wrapped input comes back
    wrapped at its longest line; a single-line input stays one line. A block
    with list markers is returned as is, since a rewrap would merge items."""
    lines = before.splitlines()
    if len(lines) < 2 or any(LIST_LINE.match(l) for l in lines):
        return after
    width = max(len(l) for l in lines)
    first = lines[0][: len(lines[0]) - len(lines[0].lstrip())]
    rest = lines[1][: len(lines[1]) - len(lines[1].lstrip())]
    return textwrap.fill(
        " ".join(after.split()),
        width=width,
        initial_indent=first,
        subsequent_indent=rest,
        break_long_words=False,
        break_on_hyphens=False,
    )


def main() -> int:
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("files", nargs="*")
    ap.add_argument("--stdin", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--send", action="store_true")
    ap.add_argument("--rounds", type=int, default=1)
    ap.add_argument("--model", default=CF_MODELS[0])
    ap.add_argument("--endpoint", default=os.environ.get("PARAPHRASE_ENDPOINT", ""))
    args = ap.parse_args()

    if args.rounds < 1:
        print("paraphrase: --rounds must be at least 1", file=sys.stderr)
        return 2
    if not args.check and not args.send:
        print(
            "paraphrase: pass --check to preview, or --send to transmit to Cloudflare",
            file=sys.stderr,
        )
        return 2
    if args.model not in CF_MODELS:
        print(
            f"paraphrase: model {args.model} is not on the contract allowlist",
            file=sys.stderr,
        )
        return 2

    sources = []
    if args.stdin:
        sources.append((None, sys.stdin.read()))
    for path in args.files:
        with open(path, encoding="utf-8") as fh:
            sources.append((path, fh.read()))
    if not sources:
        ap.print_usage(sys.stderr)
        return 2

    endpoint = args.endpoint.strip()
    account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    client_id = os.environ.get("PARAPHRASE_CLIENT_ID", "").strip()
    client_secret = os.environ.get("PARAPHRASE_CLIENT_SECRET", "").strip()
    if args.send:
        if endpoint and (not client_id or not client_secret):
            print(
                "paraphrase: endpoint mode needs PARAPHRASE_CLIENT_ID and "
                "PARAPHRASE_CLIENT_SECRET",
                file=sys.stderr,
            )
            return 2
        if not endpoint and (not account or not token):
            print(
                "paraphrase: set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN, "
                "or pass --endpoint",
                file=sys.stderr,
            )
            return 2

    def reword(text: str) -> tuple[str, float]:
        if endpoint:
            return call_endpoint(endpoint, args.model, text, client_id, client_secret)
        return call_cf(args.model, text, account, token)

    total, failed = 0.0, 0
    documents = []
    for path, text in sources:
        name = path or "<stdin>"
        blocks = split_blocks(text)
        prose = [b for b, skip in blocks if not skip and b.strip()]
        chars = sum(len(b) for b in prose)

        if secrets_in("\n".join(prose)):
            print(
                f"{name}: possible secret in the text to be sent; refusing, keeping it unchanged",
                file=sys.stderr,
            )
            failed = 1
            documents.append(text)
            continue
        if chars > MAX_CHARS:
            print(
                f"{name}: {chars} chars exceeds the {MAX_CHARS} cap; split it",
                file=sys.stderr,
            )
            failed = 1
            documents.append(text)
            continue

        if args.check:
            print(
                f"{name}: would send {len(prose)} of {len([b for b, _ in blocks if b.strip()])} "
                f"blocks, {chars} chars, {args.rounds} round(s)"
            )
            for b in prose[:3]:
                print(f"    {b.strip()[:70]}...")
            continue

        parts = []
        for body, skip in blocks:
            if skip or not body.strip():
                parts.append(body)
                continue
            if "<<<BEGIN>>>" in body or "<<<END>>>" in body:
                print(
                    f"{name}: text holds a reserved prompt marker; keeping the block as is",
                    file=sys.stderr,
                )
                failed = 1
                parts.append(body)
                continue
            masked, spans = mask(body)
            current = masked
            try:
                for _ in range(args.rounds):
                    current, spent = reword(current)
                    total += spent
            except RuntimeError as exc:
                print(f"{name}: {exc}; keeping the block as is", file=sys.stderr)
                failed = 1
                parts.append(body)
                continue
            if not placeholders_ok(current, len(spans)):
                print(
                    f"{name}: a protected span was dropped, duplicated or reordered; "
                    "keeping the block as is",
                    file=sys.stderr,
                )
                failed = 1
                parts.append(body)
                continue
            current = rewrap(body, unmask(current, spans))
            if "MASK_" in current:
                print(
                    f"{name}: model altered a protected span; keeping the block as is",
                    file=sys.stderr,
                )
                failed = 1
                parts.append(body)
                continue
            hard = implausible(body, current) or next(iter(drift(body, current)), None)
            if hard:
                print(f"{name}: {hard}; keeping the block as is", file=sys.stderr)
                failed = 1
                parts.append(body)
                continue
            ratio = similarity(body, current)
            if ratio > 0.95:
                print(
                    f"{name}: block barely changed (similarity {ratio:.2f}); "
                    "a clean block needs no reword",
                    file=sys.stderr,
                )
            before = _by_label(tells_in(body))
            introduced = False
            for hit in tells_in(current):
                # A tell the input already carried is one the reword failed to
                # remove, not one it invented. Both are failures, but only one
                # of them is the model's doing and the reader has to know which.
                carried = _carried(hit, before)
                verb = "carried through" if carried else "introduced"
                print(f"{name}: rewrite {verb} {hit}", file=sys.stderr)
                failed = 1
                if not carried:
                    introduced = True
            had = _by_label(advisories_in(body))
            for hit in advisories_in(current):
                if not _carried(hit, had):
                    print(f"{name}: rewrite introduced {hit}", file=sys.stderr)
                    failed = 1
                    introduced = True
            # A rewrite that invented a tell or an advisory is worse than the
            # input, so it never ships: keep the original block. A carried-through
            # tell leaves the rewrite cleaner than the input, so it still ships.
            if introduced:
                parts.append(body)
            else:
                parts.append(current + ("\n" if body.endswith("\n") else ""))
        documents.append("".join(parts))

    # One write, after every source is processed, so a mid-stream failure never
    # leaves a half-rewritten document on stdout. --check writes nothing.
    if not args.check:
        sys.stdout.write("".join(documents))
    if total:
        print(f"paraphrase: ${total:.6f}", file=sys.stderr)
    return failed


if __name__ == "__main__":
    sys.exit(main())
