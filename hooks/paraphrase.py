#!/usr/bin/env python3
"""Reword your own drafts and report the AI tells that survive.

This rewords prose you already own. The editing guards measure preservation
and style. Watermark experiments live in tools/eval/watermark.py and require
a matching scheme and key. Text similarity alone cannot measure removal.
Anthropic documents a SynthID-Text variant; its private-preview detector is
not implemented here. See docs/specs/0005-watermark-measurement.md.

Everything sent leaves your machine and goes to Cloudflare, so egress is
opt-in via --send and refused outright when the secret scanner objects.

Never rewritten, passed through byte for byte: fenced blocks, indented
blocks, blockquotes, tables, headings, link definitions, HTML and
frontmatter. Quotations included, because a rewritten quotation puts words in
someone's mouth. Short prose, a commit subject included, is reworded now: the
reply and length guards catch a model that answers about the text instead of
rewording it.

Output is stdout only. There is no in-place mode.

A rewrite is recorded against the exact text that produced it, so running this
twice on an unedited file sends nothing the second time and costs nothing. The
cache lives under XDG_CACHE_HOME, is keyed by model and contract as well as
text, and is never committed: drafts are yours. Pass --no-cache for a second
opinion, and remember that a second opinion is a second sample rather than a
better answer.

Usage:
  paraphrase.py --check FILE ...          # what would be sent, and cost. No calls.
  paraphrase.py --send FILE ...           # rewrite to stdout
  cat x | paraphrase.py --send --stdin
  paraphrase.py --send --rounds 2 FILE
  paraphrase.py --send --no-cache FILE    # re-send text reworded before
"""

from __future__ import annotations

import argparse
import difflib
import hashlib
from collections import Counter
import json
import math
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
ENDPOINT_BODY_CAP = _CONTRACT["endpoint_body_cap"]
MAX_TOKENS = _CONTRACT["max_tokens"]
TEMPERATURE = _CONTRACT["temperature"]
AVOID = _CONTRACT["avoid"]
PROMPT = _CONTRACT["prompt"].replace("{avoid}", AVOID)


def present_terms(body: str) -> str:
    """The avoid-list entries this passage actually contains, for {present}.

    Handing the model all hundred-odd entries and asking it not to reach for one
    left it swapping a listed word for another listed word: a run that finally
    started editing introduced leverage, intricate, paradigm and transformative.
    Naming the handful in front of it is a short instruction it can follow."""
    low = body.lower()
    hits = [t for t in (t.strip() for t in AVOID.split(",")) if t and t in low]
    return ", ".join(sorted(set(hits))) if hits else "none"


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
    # A sequential str.replace per span rescans the whole string on every
    # pass, so a restored span that itself looks like a later placeholder
    # gets swapped again. One regex pass, matched against the original text
    # only, restores each span exactly once regardless of what it contains.
    def repl(m: re.Match) -> str:
        i = int(m.group(1))
        try:
            return spans[i]
        except IndexError:
            return m.group(0)

    return _PLACEHOLDER.sub(repl, text)


_PLACEHOLDER = re.compile(r"MASK_(\d+)_MASK")


def placeholders_ok(text: str, n: int) -> bool:
    """The reword kept every protected span exactly once and in order. Requires
    the placeholders in the output to read 0, 1, ... n-1 with none missing,
    duplicated, added or reordered. A protected number, link or command that
    the reword dropped, doubled or moved is caught here, before unmasking puts
    the real spans back and hides the damage.

    A digit group is accepted only in its own canonical decimal form, so a
    zero-padded or otherwise aliased placeholder the model invented does not
    read as the real index it merely resembles. The length is bounded before
    int() ever sees the group, so a placeholder padded with thousands of
    digits reports False instead of raising."""
    digit_groups = _PLACEHOLDER.findall(text)
    if any(len(g) > 6 or g != str(int(g)) for g in digit_groups):
        return False
    return [int(i) for i in digit_groups] == list(range(n))


FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})([^\r\n]*)$")
ATX_HEADING = re.compile(r"^ {0,3}#{1,6}(?:[ \t]+|$)")
SETEXT_UNDERLINE = re.compile(r"^ {0,3}(?:=+|-+)[ \t]*$")
THEMATIC_BREAK = re.compile(
    r"^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$"
)
LIST_ITEM = re.compile(r"^ {0,3}(?:[-*+]|\d{1,9}[.)])[ \t]+")
BLOCKQUOTE = re.compile(r"^ {0,3}>")
LINK_DEFINITION = re.compile(r"^ {0,3}\[[^\]\r\n]+\]:[ \t]*\S")
INDENTED_CODE = re.compile(r"^(?:\t| {4})")
TABLE_DELIMITER = re.compile(
    r"^ {0,3}\|?[ \t]*:?-{3,}:?[ \t]*"
    r"(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?[ \t]*$"
)
HTML_START = re.compile(r"^ {0,3}<(?:[A-Za-z][A-Za-z0-9-]*\b|/[A-Za-z]|!|\?)")
RAW_HTML_START = re.compile(r"^ {0,3}<(script|pre|style|textarea)(?:[ \t>]|$)", re.I)
NUMBER = re.compile(r"\d[\d,.]*")
# Used only inside drift(), never in PROTECT: PROTECT hides a span from the
# model before the call, which would degrade the reword of the prose around a
# hostname or address the writer never asked to have masked. A check here
# costs nothing until after the call and only demands the token survive, so a
# greedy match is safe where a greedy mask would not be.
EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
# Excludes a match that starts right after "@" or "/" so an email's domain
# half and a URL's host are counted once each, by EMAIL and the existing url
# check, rather than a second time here. The final label is lowercase because
# a full stop that lost its space reads as a domain otherwise, and closing
# that gap is a grammar fix the prompt asks for.
DOMAIN = re.compile(r"(?<![@/\w.-])(?:[A-Za-z0-9-]+\.)+[a-z]{2,}\b")
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
                str(_CONTRACT["request_timeout_seconds"]),
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
            timeout=_CONTRACT["request_timeout_seconds"] + 20,
        )
    finally:
        os.unlink(fh.name)
    if proc.returncode != 0:
        raise RuntimeError(f"curl failed: {proc.stderr.decode()[:200]}")
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"unparseable response: {exc}") from exc


class GenerationError(RuntimeError):
    def __init__(
        self,
        message: str,
        usd: float = 0,
        kind: str = "output_limit",
        attempts=None,
        usage_unknown: bool = False,
    ):
        super().__init__(message)
        self.usd = usd
        self.kind = kind
        self.attempts = attempts or []
        self.usage_unknown = usage_unknown or any(
            a.get("usage_unknown") for a in self.attempts
        )


class GenerationResult(tuple):
    def __new__(cls, output, usd, attempts):
        result = super().__new__(cls, (output, usd))
        result.attempts = attempts
        result.usage_unknown = any(a.get("usage_unknown") for a in attempts)
        return result


# --- Response cache -------------------------------------------------------
#
# The evaluation harness caches model responses so CI can replay a run offline.
# This client, which is the one a person actually runs, did not, so every
# invocation re-sent the same prose to Cloudflare and paid for it again. The
# file's own contract is that egress is opt-in; re-sending text that has not
# changed is egress nobody asked for.
#
# Hosted inference is also not reproducible. The batch a request lands in
# varies with server load, and kernels that are not batch invariant return
# different results for identical input, so a guard that re-samples can change
# its mind about prose nobody edited. Measured against the current contract the
# reply was stable, five identical answers over five calls on two blocks while
# the neuron accounting varied from 27 to 49, so this is not repairing an
# observed fault. It removes the opportunity for one: a rewrite recorded
# against exact input stays the answer for that input.
#
# Keyed like the eval's cache, on the model, a hash covering the contract and
# the tell list, and the exact text sent. A contract edit is a different key,
# so stale rewrites cannot outlive the prompt that produced them.

CACHE_VERSION = 1

_TELLS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib-tells.sh")


def _contract_fingerprint() -> str:
    material = json.dumps(
        {k: v for k, v in _CONTRACT.items() if k != "models"}, sort_keys=True
    ).encode()
    try:
        with open(_TELLS_PATH, "rb") as fh:
            material += fh.read()
    except OSError:
        # The tell list is part of what shapes a rewrite. If it cannot be read,
        # say so in the key rather than silently keying on less than was used.
        material += b"\x00tells-unreadable"
    return hashlib.sha256(material).hexdigest()[:12]


CONTRACT_FINGERPRINT = _contract_fingerprint()


def cache_dir() -> str:
    base = os.environ.get("PARAPHRASE_CACHE_DIR")
    if base:
        return base
    xdg = os.environ.get("XDG_CACHE_HOME") or os.path.join(
        os.path.expanduser("~"), ".cache"
    )
    return os.path.join(xdg, "adastra-paraphrase")


def cache_key(model: str, text: str) -> str:
    raw = f"{CACHE_VERSION}\x00{model}\x00{CONTRACT_FINGERPRINT}\x00{text}".encode()
    return hashlib.sha256(raw).hexdigest()


def cache_load(model: str, text: str):
    """The stored rewrite for this exact input, or None.

    Every failure here is a miss. A cache that cannot be read is not an
    answer, and refusing to run because of it would make an optimisation into
    a dependency.
    """
    path = os.path.join(cache_dir(), cache_key(model, text) + ".json")
    try:
        with open(path, encoding="utf-8") as fh:
            entry = json.load(fh)
    except (OSError, ValueError):
        return None
    output = entry.get("output")
    if not isinstance(output, str) or not output:
        return None
    return output


def cache_store(model: str, text: str, output: str, usd: float) -> None:
    """Record a rewrite. Best effort: a cache write must never fail a run."""
    try:
        directory = cache_dir()
        os.makedirs(directory, exist_ok=True)
        path = os.path.join(directory, cache_key(model, text) + ".json")
        payload = {
            "output": output,
            "model": model,
            "contract": CONTRACT_FINGERPRINT,
            "usd": usd,
        }
        # Written whole, then moved, so an interrupted run cannot leave a
        # half-written file that reads as a rewrite.
        fd, tmp = tempfile.mkstemp(dir=directory)
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(payload, fh)
        os.replace(tmp, path)
    except OSError:
        pass


def messages_for(text: str, feedback=()):
    hints = [_CONTRACT["repair_hints"][key] for key in feedback]
    system = PROMPT.replace("{present}", present_terms(text))
    if hints:
        system += "\n\nValidation feedback:\n" + "\n".join(hints)
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": _CONTRACT["user_template"].replace("{body}", text)},
    ]


def generation_issues(source: str, output: str):
    issues = []
    if "<<<BEGIN>>>" in output or "<<<END>>>" in output or META.match(output.strip()):
        issues.append("format")
    if _PLACEHOLDER.findall(source) != _PLACEHOLDER.findall(output):
        issues.append("protected")
    if implausible(source, output):
        issues.append("length")
    for problem in drift(source, output):
        issues.append("length" if problem.startswith("shrank") else "preservation")
    cleaned = plain_language(output)
    tells = tells_in(cleaned)
    if tells:
        issues.append("style")
    if any(hit.startswith("humanness claim:") for hit in tells):
        issues.append("wording_preference")
    if any(
        not _carried(hit, _by_label(advisories_in(source)))
        for hit in advisories_in(cleaned)
    ):
        issues.append("house")
    return list(dict.fromkeys(issues))


def generate_checked(source: str, generate):
    attempts, candidates, feedback = [], [], []
    spent = 0.0
    for _ in range(_CONTRACT["repair_attempts"]):
        try:
            output, cost = generate(source, feedback)
            spent += cost
            issues = generation_issues(source, output)
            attempts.append({"output": output, "usd": cost, "issues": issues})
            rank = (
                sum(
                    key not in ("style", "house", "wording_preference")
                    for key in issues
                ),
                sum(
                    not _carried(hit, _by_label(tells_in(source)))
                    for hit in tells_in(plain_language(output))
                ),
                len(tells_in(plain_language(output))),
                len(issues),
            )
            candidates.append((rank, output))
            if not issues:
                return GenerationResult(output, spent, attempts)
            feedback = issues
        except GenerationError as exc:
            spent += exc.usd
            if exc.kind != "temporary":
                feedback = list(dict.fromkeys([*feedback, exc.kind]))
            attempts.append(
                {
                    "error": str(exc),
                    "usd": exc.usd,
                    "issues": [exc.kind],
                    "usage_unknown": exc.usage_unknown,
                }
            )
        except RuntimeError as exc:
            attempts.append(
                {
                    "error": str(exc),
                    "usd": 0,
                    "issues": ["transport"],
                    "usage_unknown": True,
                }
            )
            raise GenerationError(str(exc), spent, "transport", attempts) from exc
        if spent >= _CONTRACT["repair_budget_usd"]:
            break
    if not candidates:
        raise GenerationError(
            "all generation attempts failed", spent, attempts=attempts
        )
    return GenerationResult(
        min(candidates, key=lambda item: item[0])[1], spent, attempts
    )


def call_cf(model: str, text: str, account: str, token: str) -> tuple[str, float]:
    return generate_checked(
        text,
        lambda source, feedback: _call_cf_once(model, source, account, token, feedback),
    )


def _neuron_cost(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    try:
        return value * NEURON_USD if value >= 0 and math.isfinite(value) else None
    except OverflowError:
        return None


def _call_cf_once(
    model: str, text: str, account: str, token: str, feedback=()
) -> tuple[str, float]:
    body = json.dumps(
        {
            "messages": messages_for(text, feedback),
            "max_tokens": MAX_TOKENS,
            "temperature": TEMPERATURE,
            "reasoning_effort": _CONTRACT["reasoning_effort"],
        }
    ).encode()
    data = _run_curl(
        f"https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/{model}",
        token,
        body,
    )
    if not data.get("success"):
        errors = data.get("errors")
        if (
            isinstance(errors, list)
            and errors
            and all(isinstance(e, dict) and e.get("code") == 3046 for e in errors)
        ):
            raise GenerationError(
                f"workers ai: {errors}", kind="temporary", usage_unknown=True
            )
        raise RuntimeError(f"workers ai: {data.get('errors')}")
    result = data["result"]
    cost = _neuron_cost((result.get("usage") or {}).get("neurons"))
    choices = result.get("choices") or []
    if choices and (choices[0].get("finish_reason") or "") == "length":
        raise GenerationError(
            "output truncated; split the input",
            cost or 0,
            usage_unknown=cost is None,
        )
    out = ""
    if choices:
        out = (choices[0].get("message") or {}).get("content") or ""
    out = (out or result.get("response") or "").strip()
    if not out:
        raise GenerationError(
            "model returned nothing",
            cost or 0,
            "format",
            usage_unknown=cost is None,
        )
    if cost is None:
        raise RuntimeError("no neuron accounting; cost cannot be reported")
    return out, cost


def call_endpoint(
    base_url: str, model: str, text: str, client_id: str, client_secret: str
) -> tuple[str, float]:
    return generate_checked(
        text,
        lambda source, feedback: _call_endpoint_once(
            base_url, model, source, client_id, client_secret, feedback
        ),
    )


def _call_endpoint_once(
    base_url: str,
    model: str,
    text: str,
    client_id: str,
    client_secret: str,
    feedback=(),
) -> tuple[str, float]:
    """Send one masked block to the Worker, which wraps it in the shared
    prompt and returns the reword. The client never sends a raw prompt."""
    if len(text.encode("utf-16-le")) // 2 > ENDPOINT_BODY_CAP:
        raise RuntimeError(
            f"masked block exceeds the {ENDPOINT_BODY_CAP} character endpoint cap"
        )
    body = json.dumps(
        {"text": text, "model": model, "feedback": list(feedback)}
    ).encode()
    fh = tempfile.NamedTemporaryFile("wb", delete=False, suffix=".json")
    fh.write(body)
    fh.close()
    try:
        proc = subprocess.run(
            [
                "curl",
                "-sS",
                "--max-time",
                str(_CONTRACT["request_timeout_seconds"]),
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
            timeout=_CONTRACT["request_timeout_seconds"] + 20,
        )
    finally:
        os.unlink(fh.name)
    if proc.returncode != 0:
        raise RuntimeError(f"curl failed: {proc.stderr.decode()[:200]}")
    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"unparseable response: {exc}") from exc
    cost = _neuron_cost(data.get("neurons"))
    if "error" in data:
        err = data["error"]
        if err.get("code") == "empty_output":
            raise GenerationError(
                "model returned nothing",
                cost or 0,
                "format",
                usage_unknown=cost is None,
            )
        if err.get("code") == "output_truncated":
            raise GenerationError(
                "output truncated; split the input",
                cost or 0,
                usage_unknown=cost is None,
            )
        raise RuntimeError(f"endpoint {err.get('code')}: {err.get('message')}")
    out = (data.get("output") or "").strip()
    if not out:
        raise RuntimeError("endpoint returned nothing")
    if cost is None:
        raise RuntimeError("no neuron accounting; cost cannot be reported")
    if data.get("rejected"):
        kind = "format" if data["rejected"] == "marker_in_output" else "length"
        raise GenerationError("endpoint rejected generated output", cost, kind)
    return out, cost


def _line_text(line: str) -> str:
    return line.rstrip("\r\n")


def _append_block(out: list[tuple[str, bool]], text: str, protected: bool) -> None:
    if not text:
        return
    if out and out[-1][1] == protected:
        previous, _ = out[-1]
        out[-1] = (previous + text, protected)
    else:
        out.append((text, protected))


def _fence_open(line: str) -> tuple[str, int] | None:
    match = FENCE.match(_line_text(line))
    if not match:
        return None
    marker, info = match.groups()
    if marker[0] == "`" and "`" in info:
        return None
    return marker[0], len(marker)


def _fence_close(line: str, marker: str, length: int) -> bool:
    body = _line_text(line)
    return bool(re.fullmatch(rf" {{0,3}}{re.escape(marker)}{{{length},}}[ \t]*", body))


def _frontmatter_end(lines: list[str]) -> int:
    if not lines:
        return 0
    first = _line_text(lines[0])
    if first.startswith("\ufeff"):
        first = first[1:]
    if first not in ("---", "+++"):
        return 0
    for i in range(1, len(lines)):
        if _line_text(lines[i]) == first:
            return i + 1
    # An incomplete top-level delimiter is ambiguous. Protect everything.
    return len(lines)


def _html_block_end(lines: list[str], start: int) -> int:
    body = _line_text(lines[start]).lstrip(" ")
    terminator = None
    raw = RAW_HTML_START.match(_line_text(lines[start]))
    if body.startswith("<!--"):
        terminator = re.compile(r"-->")
    elif body.startswith("<![CDATA["):
        terminator = re.compile(r"\]\]>")
    elif body.startswith("<?"):
        terminator = re.compile(r"\?>")
    elif re.match(r"<![A-Z]", body):
        terminator = re.compile(r">")
    elif raw:
        terminator = re.compile(rf"</{re.escape(raw.group(1))}[ \t]*>", re.I)
    if terminator:
        for i in range(start, len(lines)):
            if terminator.search(_line_text(lines[i])):
                return i + 1
        return len(lines)
    # Ordinary HTML blocks end at a blank line. An unknown HTML-looking
    # construct follows the same conservative rule.
    i = start + 1
    while i < len(lines) and _line_text(lines[i]).strip():
        i += 1
    return i


def _has_table_pipe(line: str) -> bool:
    """A pipe outside an inline-code span may be table structure. A
    backslash-escaped pipe is still treated as ambiguous and protected."""
    body = _line_text(line)
    in_code = False
    ticks = 0
    i = 0
    while i < len(body):
        if body[i] == "`":
            end = i
            while end < len(body) and body[end] == "`":
                end += 1
            run = end - i
            if not in_code:
                in_code = True
                ticks = run
            elif run == ticks:
                in_code = False
                ticks = 0
            i = end
            continue
        if body[i] == "|" and not in_code:
            return True
        i += 1
    return False


def _masked_endpoint_len(text: str) -> int:
    masked, _ = mask(text)
    return len(masked.encode("utf-16-le")) // 2


def _sentence_ends(text: str, start: int) -> list[int]:
    return [
        start + match.end()
        for match in re.finditer(r"""[.!?]+["')\]]*(?=\s|$)""", text[start:])
        if match.end() > 0
    ]


def _split_capped_prose(text: str) -> list[tuple[str, bool]]:
    """Split prose without losing boundary whitespace. Editable pieces fit the
    Worker's decoded-text cap after masking; whitespace between request-sized
    pieces is protected so the calls cannot alter it."""
    out: list[tuple[str, bool]] = []
    leading = re.match(r"[ \t]*", text).group(0)
    if leading:
        _append_block(out, leading, True)
        text = text[len(leading) :]
    trailing_match = re.search(r"\s+\Z", text)
    trailing = trailing_match.group(0) if trailing_match else ""
    core = text[: len(text) - len(trailing)] if trailing else text
    position = 0
    while position < len(core):
        remainder = core[position:]
        if _masked_endpoint_len(remainder) <= ENDPOINT_BODY_CAP:
            _append_block(out, remainder, False)
            break
        ends = _sentence_ends(core, position)
        fitting = [
            end
            for end in ends
            if _masked_endpoint_len(core[position:end]) <= ENDPOINT_BODY_CAP
        ]
        if fitting:
            end = fitting[-1]
            _append_block(out, core[position:end], False)
        elif ends:
            # One sentence is too large. Sending only part of it would make
            # clause loss harder to detect, so preserve that sentence.
            end = ends[0]
            _append_block(out, core[position:end], True)
        else:
            _append_block(out, core[position:], True)
            break
        gap = re.match(r"\s*", core[end:]).group(0)
        if gap:
            _append_block(out, gap, True)
        position = end + len(gap)
    if trailing:
        _append_block(out, trailing, True)
    return out


def split_blocks(text: str) -> list[tuple[str, bool]]:
    """Return lossless editable and protected runs. Structural constructs are
    recognized before prose; an unknown or incomplete construct is protected.
    Joining every returned text reproduces the input exactly."""
    if not text:
        return []
    lines = text.splitlines(keepends=True)
    scanned: list[tuple[str, bool]] = []
    frontmatter_end = _frontmatter_end(lines)
    if frontmatter_end:
        _append_block(scanned, "".join(lines[:frontmatter_end]), True)
    i = frontmatter_end
    fence: tuple[str, int] | None = None
    while i < len(lines):
        line = lines[i]
        body = _line_text(line)
        if fence:
            marker, length = fence
            _append_block(scanned, line, True)
            if _fence_close(line, marker, length):
                fence = None
            i += 1
            continue
        opened = _fence_open(line)
        if opened:
            fence = opened
            _append_block(scanned, line, True)
            i += 1
            continue
        if not body.strip():
            _append_block(scanned, line, True)
            i += 1
            continue
        # A Setext underline makes every line above it, back to the last
        # blank line, part of the heading. The heading text itself can span
        # more than one line, so the lookahead walks the run of non-blank
        # lines rather than only the one line directly above the underline.
        j = i
        while (
            j + 1 < len(lines)
            and _line_text(lines[j + 1]).strip()
            and not SETEXT_UNDERLINE.fullmatch(_line_text(lines[j + 1]))
        ):
            j += 1
        if j + 1 < len(lines) and SETEXT_UNDERLINE.fullmatch(_line_text(lines[j + 1])):
            _append_block(scanned, "".join(lines[i : j + 2]), True)
            i = j + 2
            continue
        # A delimiter row makes this line the table header.
        if i + 1 < len(lines) and TABLE_DELIMITER.fullmatch(_line_text(lines[i + 1])):
            end = i + 2
            while (
                end < len(lines)
                and _line_text(lines[end]).strip()
                and _has_table_pipe(lines[end])
            ):
                end += 1
            _append_block(scanned, "".join(lines[i:end]), True)
            i = end
            continue
        # Lazy continuation lines can belong to lists and blockquotes even when
        # they do not repeat the opening marker.
        if LIST_ITEM.match(body) or BLOCKQUOTE.match(body):
            end = i + 1
            while end < len(lines) and _line_text(lines[end]).strip():
                end += 1
            _append_block(scanned, "".join(lines[i:end]), True)
            i = end
            continue
        if LINK_DEFINITION.match(body):
            end = i + 1
            while end < len(lines) and _line_text(lines[end]).strip():
                end += 1
            _append_block(scanned, "".join(lines[i:end]), True)
            i = end
            continue
        if HTML_START.match(body):
            end = _html_block_end(lines, i)
            _append_block(scanned, "".join(lines[i:end]), True)
            i = end
            continue
        if INDENTED_CODE.match(body):
            _append_block(scanned, line, True)
            i += 1
            continue
        if (
            ATX_HEADING.match(body)
            or THEMATIC_BREAK.fullmatch(body)
            or TABLE_DELIMITER.fullmatch(body)
            or _has_table_pipe(line)
        ):
            _append_block(scanned, line, True)
            i += 1
            continue
        _append_block(scanned, line, False)
        i += 1

    out: list[tuple[str, bool]] = []
    for piece, is_protected in scanned:
        if is_protected:
            _append_block(out, piece, True)
            continue
        for part, part_protected in _split_capped_prose(piece):
            _append_block(out, part, part_protected)

    if "".join(piece for piece, _ in out) != text:
        raise RuntimeError(
            "split_blocks is not lossless; keeping the document unchanged"
        )
    return out


def _hook(name: str) -> str:
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), name)


def tells_in(text: str) -> list[str]:
    lib = _hook("lib-tells.sh")
    if not os.path.exists(lib):
        raise RuntimeError(f"lib-tells.sh missing at {lib}; refusing a clean verdict")
    # Both scanners, because the hook blocks a commit on either. Reading only
    # the wording scan left the shape family, an inline bold, a narrative
    # heading, a run of bold labels and a mirrored sentence, outside anything
    # the eval could measure.
    proc = subprocess.run(
        ["bash", "-c", f'. "{lib}"; scan_tells "$1"; scan_shape "$1"', "_", text],
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
    """True when the text carries a secret. gitleaks on PATH, then gitleaks
    via nix, then a conservative regex. It never returns False without
    scanning: a missing or failing scanner must not let a secret leave the
    machine, so a nix failure falls through to the regex rather than passing
    the text as clean."""
    fh = tempfile.NamedTemporaryFile("w", delete=False, suffix=".txt")
    fh.write(text)
    fh.close()
    gitleaks_args = [
        "detect",
        "--no-git",
        "--source",
        fh.name,
        "--redact",
        "--no-banner",
        "--log-level",
        "error",
    ]
    try:
        try:
            proc = subprocess.run(["gitleaks", *gitleaks_args], capture_output=True)
            if proc.returncode in (0, 1):
                return proc.returncode == 1
        except FileNotFoundError:
            pass
        try:
            proc = subprocess.run(
                [
                    "nix",
                    "--extra-experimental-features",
                    "nix-command flakes",
                    "run",
                    "nixpkgs#gitleaks",
                    "--",
                    *gitleaks_args,
                ],
                capture_output=True,
            )
            if proc.returncode in (0, 1):
                return proc.returncode == 1
        except FileNotFoundError:
            pass
        # WHY: a fresh sandbox has neither gitleaks on PATH nor a working nix,
        # which is exactly where the pre-commit gitleaks hook also does
        # nothing, so this fallback has to be broad enough to catch on its
        # own what a real scanner would have caught.
        return bool(
            re.search(
                r"(?i:api[_-]?key|secret|password|token)\s*[:=]\s*\S{12,}|"
                r"-----BEGIN [A-Z ]*PRIVATE KEY-----|"
                r"\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|"
                r"cf(?:ut|at)_[A-Za-z0-9]{20,}|"
                r"AKIA[A-Z0-9]{16}|"
                r"xox[baprs]-[0-9]+-[0-9]+-[A-Za-z0-9]{24}|"
                r"AIza[A-Za-z0-9_-]{35})\b",
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
    "i",
    "me",
    "my",
    "mine",
    "we",
    "us",
    "our",
    "ours",
    "you",
    "your",
    "yours",
    "may",
    "might",
    "must",
    "shall",
    "will",
    "would",
    "can",
    "could",
    "should",
    "not",
    "no",
    "never",
    "cannot",
    "none",
    "neither",
    "nor",
    "only",
    "all",
    "every",
    "each",
    "any",
    "most",
    "both",
    "either",
    "suggest",
    "suggests",
    "suggested",
    "suggesting",
    "seem",
    "seems",
    "seemed",
    "appear to",
    "appears to",
    "appeared to",
    "perhaps",
    "possibly",
    "probably",
    "apparently",
    "likely",
    "unlikely",
)


def _marker_counts(text: str) -> dict[str, int]:
    low = (
        " ".join(text.lower().split())
        .replace("’", "'")
        .replace("won't", "will not")
        .replace("shan't", "shall not")
    )
    counts = {
        w: len(re.findall(r"\b" + re.escape(w) + r"\b", low)) for w in GUARD_MARKERS
    }
    counts["not"] += len(re.findall(r"n't\b", low))
    return counts


def drift(before: str, after: str) -> list[str]:
    issues = []
    if Counter(NUMBER.findall(before)) != Counter(NUMBER.findall(after)):
        issues.append("numbers added, dropped or changed")
    url = re.compile(r"https?://\S+")
    if Counter(url.findall(before)) != Counter(url.findall(after)):
        issues.append("urls added, dropped or changed")
    if Counter(EMAIL.findall(before)) != Counter(EMAIL.findall(after)):
        issues.append("email addresses added, dropped or changed")
    if Counter(DOMAIN.findall(before)) != Counter(DOMAIN.findall(after)):
        issues.append("domains added, dropped or changed")
    if META.match(after.strip()):
        issues.append("model returned commentary or a refusal instead of a rewrite")
    if len(after) < len(before) * 0.6:
        issues.append(
            f"shrank {len(before)} to {len(after)} chars; content may be missing"
        )
    # A question that comes back as a statement has been answered, not
    # reworded. None of the checks above see it: no number or link moves, and
    # the interrogative carries no person or modality marker. An email closing
    # "Is there a working group where this belongs?" returned as "There is a
    # working group where this belongs." and shipped clean, asserting something
    # the writer had asked.
    if before.count("?") != after.count("?"):
        issues.append("a question became a statement, or a statement a question")
    negated = re.compile(
        r"\b(?:not|never)\s+(?:(?:be|been|being|remain|remained|seem|seemed|"
        r"entirely|completely|wholly|fully|particularly|necessarily|really|quite)\s+){0,3}([a-z]+)\b",
        re.IGNORECASE,
    )
    old_sequence = negated.findall(before.lower())
    new_sequence = negated.findall(after.lower())
    old_words = Counter(old_sequence)
    new_words = Counter(new_sequence)
    removed, added = old_words - new_words, new_words - old_words
    candidates = [(old, new) for old in removed for new in added]
    if len(old_sequence) == len(new_sequence):
        candidates.extend(zip(old_sequence, new_sequence))
    if any(
        old == prefix + new or new == prefix + old
        for old, new in candidates
        for prefix in ("un", "in", "im", "ir", "dis", "non")
    ):
        issues.append("a negative prefix reversed a negated claim")
    before_marks, after_marks = _marker_counts(before), _marker_counts(after)
    additive = re.compile(
        r"\b(?P<verb>is|was|are|were) not just (?P<first>(?:a|an|the) [\w -]+),? "
        r"but (?:also )?(?:a|an|the) [\w -]+",
        re.I,
    )
    old_sentences = re.split(r"[.!?](?:\s+|$)", " ".join(before.lower().split()))
    new_sentences = re.split(r"[.!?](?:\s+|$)", " ".join(after.lower().split()))
    pairs = (
        zip(old_sentences, new_sentences)
        if len(old_sentences) == len(new_sentences)
        else zip(old_sentences[:1], new_sentences[:1])
    )
    for old, new in pairs:
        old_pairs = Counter((m["verb"], m["first"]) for m in additive.finditer(old))
        new_pairs = Counter((m["verb"], m["first"]) for m in additive.finditer(new))
        for (verb, first), removed in (old_pairs - new_pairs).items():
            direct = re.escape(verb + " " + first) + r" and (?:a|an|the) \w"
            added = len(re.findall(direct, new)) - len(re.findall(direct, old))
            before_marks["not"] -= min(removed, max(0, added))
    changed = [w for w in GUARD_MARKERS if before_marks[w] != after_marks[w]]
    if changed:
        issues.append("person, modality or scope changed: " + ", ".join(changed[:8]))
    return issues


LIST_LINE = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s")

# A wrapped line runs to the margin, so every line but the last sits close to
# the block's width. A signature or an address does not: its breaks are content.
FULL_LINE = 0.8


def rewrap(before: str, after: str) -> str:
    """Give the reword the input block's line wrapping, so a diff shows the
    words that changed and not every line. A hard-wrapped input comes back
    wrapped at its longest line; a single-line input stays one line. A block
    with list markers is returned as is, since a rewrap would merge items."""
    lines = before.splitlines()
    if len(lines) < 2 or any(LIST_LINE.match(l) for l in lines):
        return after
    width = max(len(l) for l in lines)
    # Refilling a block whose breaks are content turned "Jason Odoom" over
    # "Ad Astra Computing" into "Jason Odoom Ad Astra" over "Computing", which
    # would have gone out over the owner's name. A short line in the middle of
    # the block is the signal: wrapping fills every line but the last.
    if any(len(l) < width * FULL_LINE for l in lines[:-1]):
        return after
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


def plain_language(text: str) -> str:
    protected = re.compile(
        PROTECT.pattern
        + r"""|"[^"]*"|“[^”]*”|(?<!\w)'(?:[^']|(?<=\w)'(?=\w))*'(?!\w)|‘(?:[^’]|(?<=\w)’(?=\w))*’"""
    )
    replacements = {
        "make use of": "use",
        "in order to": "to",
        "due to the fact that": "because",
        "prior to": "before",
        "at this point in time": "now",
        "for the purpose of": "for",
        "on a daily basis": "daily",
        "on a regular basis": "regularly",
    }
    pattern = re.compile(r"\b(" + "|".join(replacements) + r")\b", re.I)

    def replace(match: re.Match) -> str:
        old = match.group()
        new = replacements[old.lower()]
        return (
            new.upper()
            if old.isupper()
            else new.capitalize()
            if old[0].isupper()
            else new
        )

    clause = re.compile(
        r"(?:the (?:(?:complex|detailed|simple|clear|careful|initial|final|current|previous|original|new|old) )?"
        r"(?-i:[a-z][a-z-]*)|this|that|these|those|it|we|you|they|I) "
        r"(?:is|are|was|were|has|have|had|shows?|reflects?|checked|worked|finished|failed|passed)\b",
        re.I,
    )
    has_protected = bool(protected.search(text))

    def punctuation(match: re.Match) -> str:
        left, right = match[2], match[3]
        if re.match(
            r"(?:although|because|if|when|while|unless|since|until|before|after|whether|as)\b",
            left,
            re.I,
        ):
            return match[0]
        if not clause.match(left.rsplit(",", 1)[-1].strip()) or not clause.match(right):
            return match[0]
        return match[1] + left + "; " + right

    def edit(segment: str) -> str:
        segment = pattern.sub(replace, segment)
        segment = re.sub(r"\*\*([^*\n]+)\*\*", r"\1", segment)
        if has_protected:
            return segment
        return re.sub(
            r"(^|[.!?]\s+)([^.!?;—]+) — ([^.!?;—]+)(?=[.!?]|$)", punctuation, segment
        )

    parts = []
    start = 0
    for span in protected.finditer(text):
        parts.extend((edit(text[start : span.start()]), span.group()))
        start = span.end()
    parts.append(edit(text[start:]))
    result = "".join(parts)
    # Only remove a preamble at the start of the block, outside protected spans.
    result = re.sub(
        r"^(\s*)It is (?:important to note|worth noting) that (the|this|these|those|it|we|you|a|an)(?= )",
        lambda m: m[1] + m[2].capitalize(),
        result,
    )
    if implausible(text, result) or drift(text, result):
        return text
    return result


def ship_decision(
    body: str, current: str, spans: list[str]
) -> tuple[str, list[tuple[str, bool]]]:
    """The text that ships for one block and the notes to report about it.

    This is the whole post-reword acceptance path, factored out so the CLI and
    the eval decide identically: the eval must score what would actually ship,
    not the raw reword. `body` is the original block, `current` is the masked
    model output after the rounds, `spans` are the masked spans. Returns the
    shipped text, which is the reword when it clears every gate and the input
    with checked local edits otherwise, and a list of (message, is_failure) notes. A carried
    through tell ships the reword but is still reported, so the shipped text and
    the failure flag are tracked separately rather than one implying the other.
    """
    notes: list[tuple[str, bool]] = []
    fallback = plain_language(body)
    fallback_note = (
        "using checked local edits" if fallback != body else "keeping the block as is"
    )
    # A reserved delimiter cannot be in eligible input, which is refused before
    # the call, so its presence in the model output is generated contract
    # residue. Drop the reword and keep the input.
    if "<<<BEGIN>>>" in current or "<<<END>>>" in current:
        notes.append(
            (f"model output carried a reserved delimiter; {fallback_note}", True)
        )
        return fallback, notes
    if not placeholders_ok(current, len(spans)):
        notes.append(
            (
                "a protected span was dropped, duplicated or reordered; "
                f"{fallback_note}",
                True,
            )
        )
        return fallback, notes
    restored = rewrap(body, unmask(current, spans))
    if "MASK_" in restored:
        notes.append((f"model altered a protected span; {fallback_note}", True))
        return fallback, notes
    hard = implausible(body, restored) or next(iter(drift(body, restored)), None)
    if hard:
        notes.append((f"{hard}; {fallback_note}", True))
        return fallback, notes
    cleaned = plain_language(restored)
    if not implausible(body, cleaned) and not drift(body, cleaned):
        restored = cleaned
    ratio = similarity(body, restored)
    if ratio > 0.95:
        notes.append(
            (
                f"block barely changed (similarity {ratio:.2f}); "
                "a clean block needs no reword",
                False,
            )
        )
    before = _by_label(tells_in(body))
    introduced = False
    for hit in tells_in(restored):
        carried = _carried(hit, before)
        verb = "carried through" if carried else "introduced"
        notes.append((f"rewrite {verb} {hit}", True))
        if not carried:
            introduced = True
    had = _by_label(advisories_in(body))
    for hit in advisories_in(restored):
        if not _carried(hit, had):
            notes.append((f"rewrite introduced {hit}", True))
            introduced = True
    # A rewrite that invented a tell or an advisory is worse than the input, so
    # it never ships. A carried through tell leaves the rewrite cleaner than the
    # input, so it still ships.
    if introduced:
        return fallback, notes
    return restored + (
        "\n" if body.endswith("\n") and not restored.endswith("\n") else ""
    ), notes


def main() -> int:
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("files", nargs="*")
    ap.add_argument("--stdin", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--send", action="store_true")
    ap.add_argument("--rounds", type=int, default=1)
    ap.add_argument("--model", default=CF_MODELS[0])
    ap.add_argument("--endpoint", default=os.environ.get("PARAPHRASE_ENDPOINT", ""))
    ap.add_argument(
        "--no-cache",
        action="store_true",
        help="re-send every block even if an identical one was reworded before",
    )
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

    cache_hits = [0]

    def reword(text: str) -> tuple[str, float]:
        if not args.no_cache:
            hit = cache_load(args.model, text)
            if hit is not None:
                cache_hits[0] += 1
                # Nothing left the machine and nothing was spent.
                return GenerationResult(hit, 0.0, [])

        if endpoint:
            generation = call_endpoint(
                endpoint, args.model, text, client_id, client_secret
            )
        else:
            generation = call_cf(args.model, text, account, token)

        # Only a completed rewrite is stored. A failure raises before this, and
        # recording one would turn a bad minute into a permanent answer.
        if not args.no_cache:
            output, spent = generation[0], generation[1]
            cache_store(args.model, text, output, spent)
        return generation

    total, failed = 0.0, 0
    usage_unknown = False
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
            # A cached block is not sent, so counting it as one that would be
            # overstates the egress this preview exists to report.
            cached = 0
            if not args.no_cache:
                for b in prose:
                    masked_block, _ = mask(b)
                    if cache_load(args.model, masked_block) is not None:
                        cached += 1
            outgoing = len(prose) - cached
            note = f", {cached} already reworded and not sent again" if cached else ""
            print(
                f"{name}: would send {outgoing} of "
                f"{len([b for b, _ in blocks if b.strip()])} "
                f"blocks, {chars} chars, {args.rounds} round(s){note}"
            )
            for b in prose[:3]:
                print(f"    {b.strip()[:70]}...")
            continue

        parts = []
        for body, skip in blocks:
            if skip or not body.strip():
                parts.append(body)
                continue
            # unmask restores a span by looking up its index in the placeholder
            # it finds in the output. Text that already reads MASK_<digits>_MASK
            # before masking would be indistinguishable from a real one at
            # unmask time, so it is refused up front like the other reserved
            # markers.
            if (
                "<<<BEGIN>>>" in body
                or "<<<END>>>" in body
                or _PLACEHOLDER.search(body)
            ):
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
                    generation = reword(current)
                    current, spent = generation
                    usage_unknown |= getattr(generation, "usage_unknown", False)
                    total += spent
            except RuntimeError as exc:
                total += getattr(exc, "usd", 0)
                usage_unknown |= getattr(exc, "usage_unknown", True)
                print(f"{name}: {exc}; keeping the block as is", file=sys.stderr)
                failed = 1
                parts.append(body)
                continue
            shipped, notes = ship_decision(body, current, spans)
            for msg, is_failure in notes:
                print(f"{name}: {msg}", file=sys.stderr)
                if is_failure:
                    failed = 1
            parts.append(shipped)
        documents.append("".join(parts))

    # One write, after every source is processed, so a mid-stream failure never
    # leaves a half-rewritten document on stdout. --check writes nothing.
    if not args.check:
        sys.stdout.write("".join(documents))
    if total or usage_unknown:
        suffix = " reported; additional usage is unknown" if usage_unknown else ""
        print(f"paraphrase: ${total:.6f}{suffix}", file=sys.stderr)
    if cache_hits[0]:
        # Said plainly, because the number that matters to somebody running
        # this on a private draft is how much of it left the machine.
        blocks = "block" if cache_hits[0] == 1 else "blocks"
        print(
            f"paraphrase: {cache_hits[0]} {blocks} reworded earlier and not sent again",
            file=sys.stderr,
        )
    return failed


if __name__ == "__main__":
    sys.exit(main())
