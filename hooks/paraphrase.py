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
import json
import os
import re
import subprocess
import sys
import tempfile

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
            "max_tokens": 4096,
            "temperature": 0.4,
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


def secrets_in(text: str) -> bool:
    checker = _hook("check-secrets.sh")
    if not os.path.exists(checker):
        return False
    if not os.path.exists("/usr/bin/env"):
        return False
    fh = tempfile.NamedTemporaryFile("w", delete=False, suffix=".txt")
    fh.write(text)
    fh.close()
    try:
        proc = subprocess.run(
            ["gitleaks", "detect", "--no-git", "--source", fh.name, "--redact", "-q"],
            capture_output=True,
        )
        return proc.returncode == 1
    except FileNotFoundError:
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
    if [d for d in drift(before, after) if "barely changed" not in d]:
        return before
    return after


def drift(before: str, after: str) -> list[str]:
    issues = []
    lost = sorted(set(NUMBER.findall(before)) - set(NUMBER.findall(after)))
    if lost:
        issues.append("numbers dropped or changed: " + ", ".join(lost[:8]))
    url = re.compile(r"https?://\S+")
    lost_urls = sorted(set(url.findall(before)) - set(url.findall(after)))
    if lost_urls:
        issues.append("urls dropped or changed: " + ", ".join(lost_urls[:5]))
    if META.match(after.strip()):
        issues.append("model returned commentary or a refusal instead of a rewrite")
    ratio = difflib.SequenceMatcher(None, before, after).ratio()
    if ratio > 0.95:
        issues.append(
            f"barely changed (similarity {ratio:.2f}); watermark likely intact"
        )
    if len(after) < len(before) * 0.6:
        issues.append(
            f"shrank {len(before)} to {len(after)} chars; content may be missing"
        )
    return issues


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
    for path, text in sources:
        name = path or "<stdin>"
        blocks = split_blocks(text)
        prose = [b for b, skip in blocks if not skip and b.strip()]
        chars = sum(len(b) for b in prose)

        if secrets_in("\n".join(prose)):
            print(
                f"{name}: possible secret in the text to be sent; refusing",
                file=sys.stderr,
            )
            failed = 1
            continue
        if chars > MAX_CHARS:
            print(
                f"{name}: {chars} chars exceeds the {MAX_CHARS} cap; split it",
                file=sys.stderr,
            )
            failed = 1
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
            for _ in range(args.rounds):
                current, spent = reword(current)
                total += spent
            current = unmask(current, spans)
            if "MASK_" in current:
                print(
                    f"{name}: model altered a protected span; keeping the block as is",
                    file=sys.stderr,
                )
                failed = 1
                parts.append(body)
                continue
            hard = implausible(body, current) or next(
                (d for d in drift(body, current) if "barely changed" not in d), None
            )
            if hard:
                print(f"{name}: {hard}; keeping the block as is", file=sys.stderr)
                failed = 1
                parts.append(body)
                continue
            for issue in drift(body, current):
                print(f"{name}: {issue}", file=sys.stderr)
                failed = 1
            for hit in tells_in(current):
                print(f"{name}: rewrite introduced {hit}", file=sys.stderr)
                failed = 1
            parts.append(current + ("\n" if body.endswith("\n") else ""))
        sys.stdout.write("".join(parts))

    if total:
        print(f"paraphrase: ${total:.6f}", file=sys.stderr)
    return failed


if __name__ == "__main__":
    sys.exit(main())
