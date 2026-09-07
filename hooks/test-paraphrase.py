#!/usr/bin/env python3
"""Tests for the paraphrase client's local guards. Run: python3 hooks/test-paraphrase.py"""

from __future__ import annotations

import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("paraphrase", os.path.join(HERE, "paraphrase.py"))
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

print()
print("all passing" if failed == 0 else f"{failed} failing")
sys.exit(1 if failed else 0)
