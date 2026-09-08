#!/usr/bin/env python3
"""Tests for strip-watermarks.py. Run: python3 hooks/test-watermarks.py"""

import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
STRIP = os.path.join(HERE, "strip-watermarks.py")


def strip(text: str) -> str:
    p = subprocess.run(
        [sys.executable, STRIP, "--stdin"],
        input=text.encode("utf-8"),
        stdout=subprocess.PIPE,
        check=True,
    )
    return p.stdout.decode("utf-8")


# Inputs are built from chr() so this file stays pure ascii and passes
# check-invisible.sh itself.
ZWSP = chr(0x200B)
ZWJ = chr(0x200D)
VS1 = chr(0xFE00)
VS16 = chr(0xFE0F)
FVS = chr(0x180F)
MFVS = chr(0x180B)
TAG_NEIGHBOR = chr(0xE0090)
IVS = chr(0xE0100)
IVS_NEXT = chr(0xE0101)
MAN = chr(0x1F468)
WOMAN = chr(0x1F469)
HEART = chr(0x2764)
KANJI = chr(0x6F22)

CASES = [
    ("plain ascii is untouched", "hello world\n", "hello world\n"),
    ("zwsp stripped", "a" + ZWSP + "b", "ab"),
    ("zwj emoji sequence kept", MAN + ZWJ + WOMAN, MAN + ZWJ + WOMAN),
    ("vs after letter stripped", "A" + VS1, "A"),
    ("vs smuggling channel stripped", "A" + VS1 + IVS_NEXT, "A"),
    ("emoji vs16 kept", HEART + VS16, HEART + VS16),
    ("double vs collapses to one", HEART + VS16 + VS16, HEART + VS16),
    ("mongolian fvs stripped", "a" + FVS + "b", "ab"),
    ("mongolian free var sel stripped", "a" + MFVS + "b", "ab"),
    ("reserved tag neighbor stripped", "a" + TAG_NEIGHBOR + "b", "ab"),
    ("cjk ivs kept", KANJI + IVS, KANJI + IVS),
    ("cjk ivs after latin stripped", "A" + IVS, "A"),
]


def main() -> int:
    fails = 0
    for name, src, want in CASES:
        got = strip(src)
        if got != want:
            fails += 1
            print(f"FAIL {name}: got {got!r} want {want!r}")
        else:
            print(f"ok   {name}")
    if fails:
        print(f"\n{fails} failing")
        return 1
    print("\nall passing")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
