#!/usr/bin/env python3
"""Strip invisible AI-watermark characters from text (deterministic, Layer A).

Companion to check-invisible.sh: that hook REFUSES a commit carrying invisible
carriers; this tool REMOVES them, so generated text can be cleaned in place
before it is committed or shipped. Modelled on the Layer A behaviour of
github.com/guillaumemeyer/watermarks-remover: strip the code points that are
invisible and useful only as a covert channel, while preserving the ones
that are legitimately invisible in real text (emoji joiners/selectors, script
joiners in their native context).

Layer B (statistical token-choice watermarks) is out of scope here: removing it
needs paraphrase, which is a model call and a judgement, not a deterministic
byte edit. House-style prose review handles that surface separately.

Usage:
  strip-watermarks.py FILE [FILE ...]     # rewrite each file in place
  strip-watermarks.py --check FILE ...    # exit 1 if any file WOULD change
  cat x | strip-watermarks.py --stdin     # clean stdin to stdout
"""

from __future__ import annotations

import sys
import unicodedata

# Always-strip: invisible carriers with no legitimate role in source or docs.
STRIP = set()
STRIP |= {0x200B, 0x200E, 0x200F, 0x061C}  # ZWSP, LRM, RLM, ALM
STRIP |= set(range(0x202A, 0x202F))  # bidi embed/override/PDF
STRIP |= set(range(0x2066, 0x206A))  # bidi isolates
STRIP |= set(range(0x2060, 0x2065))  # word joiner + invisible ops
STRIP |= {0x00AD}  # soft hyphen
STRIP |= {0x180E, 0x180F}  # Mongolian vowel/free var sep
STRIP |= {0x2065}  # reserved invisible
STRIP |= {0x3164, 0xFFA0}  # Hangul fillers
STRIP |= set(range(0xFFF0, 0xFFF9))  # unassigned specials
STRIP |= set(range(0xFDD0, 0xFDF0))  # noncharacters
STRIP |= {0xFFFE, 0xFFFF}  # plane-end noncharacters
STRIP |= set(range(0xE0000, 0xE0080))  # deprecated tag block
STRIP |= set(range(0xE0080, 0xE0100))  # reserved after tag block
STRIP |= set(range(0xE01F0, 0xE1000))  # reserved ignorables
STRIP |= {0xFEFF}  # BOM / ZWNBSP when mid-text

# Context-preserving: U+200C/U+200D (ZWNJ/ZWJ) stay, they are real text in
# emoji sequences and Persian/Arabic/Indic shaping. NBSP (U+00A0) is ordinary
# prose and is left alone.
#
# Variation selectors are the covert channel that the plain Cf sweep misses:
# they are category Mn, and the two ranges below carry a 256-value byte channel
# that survives copy-paste and renders invisibly. They are stripped, with two
# narrow exceptions kept because they are real: a single VS15/VS16 right after
# an emoji base, and a single supplementary selector right after a CJK base
# (an ideographic variation sequence).
VS_BMP = range(0xFE00, 0xFE10)  # VS1 to VS16
VS_SUPP = range(0xE0100, 0xE01F0)  # VS17 to VS256
MONGOLIAN_FVS = range(0x180B, 0x180E)  # U+180B to U+180D


def _is_emoji_base(cp: int) -> bool:
    if cp >= 0x1F000:
        return True
    if 0x2600 <= cp <= 0x27BF or 0x2190 <= cp <= 0x21FF or 0x2B00 <= cp <= 0x2BFF:
        return True
    return unicodedata.category(chr(cp)) == "So"


def _is_cjk(cp: int) -> bool:
    return 0x3400 <= cp <= 0x9FFF or 0x20000 <= cp <= 0x3FFFF


def clean(text: str) -> str:
    out: list[str] = []
    for ch in text:
        cp = ord(ch)
        if cp in STRIP:
            continue
        # Plane-end noncharacters at U+XFFFE/U+XFFFF across all planes.
        if (cp & 0xFFFF) in (0xFFFE, 0xFFFF):
            continue
        if cp in VS_BMP or cp in VS_SUPP or cp in MONGOLIAN_FVS:
            prev = ord(out[-1]) if out else None
            after_vs = prev in VS_BMP or prev in VS_SUPP if prev is not None else False
            if (
                cp in (0xFE0E, 0xFE0F)
                and prev is not None
                and not after_vs
                and _is_emoji_base(prev)
            ):
                out.append(ch)
            elif cp in VS_SUPP and prev is not None and not after_vs and _is_cjk(prev):
                out.append(ch)
            continue
        # Any remaining Cf format control that is not a legitimate joiner.
        if unicodedata.category(ch) == "Cf" and cp not in (0x200C, 0x200D):
            continue
        out.append(ch)
    return "".join(out)


def main(argv: list[str]) -> int:
    args = argv[1:]
    if not args:
        print(__doc__.strip().splitlines()[0], file=sys.stderr)
        return 2

    if args[0] == "--stdin":
        sys.stdout.write(clean(sys.stdin.read()))
        return 0

    check = args[0] == "--check"
    files = args[1:] if check else args
    if not files:
        print("no files given", file=sys.stderr)
        return 2

    would_change = 0
    for path in files:
        try:
            with open(path, encoding="utf-8") as fh:
                original = fh.read()
        except (OSError, UnicodeDecodeError):
            continue  # skip binary / unreadable; the blocker handles refusal
        cleaned = clean(original)
        if cleaned == original:
            continue
        would_change += 1
        if check:
            print(f"would strip watermark chars from {path}")
        else:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(cleaned)
            print(f"stripped watermark chars from {path}")

    if check and would_change:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
