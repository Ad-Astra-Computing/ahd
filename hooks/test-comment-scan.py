#!/usr/bin/env python3
"""Tests for comment-scan.py, the comment detector the prose hook relies on.

The first case is the bug these tests exist for: eight consecutive CSS custom
properties were counted as an eight-line comment block and the commit refused.
"""

import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCAN = HERE / "comment-scan.py"

failures = []


def run(path, added):
    diff = "".join("+" + line + "\n" for line in added)
    out = subprocess.run(
        [sys.executable, str(SCAN), path],
        input="+++ b/%s\n" % path + diff,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.splitlines()
    return int(out[0]), out[1:]


def check(name, got, want):
    if got == want:
        print("  ok   %s" % name)
    else:
        print("  FAIL %s: got %r, want %r" % (name, got, want))
        failures.append(name)


CSS_TOKENS = [
    ":root {",
    "  --ink: #101014;",
    "  --paper: #fbfbfa;",
    "  --rule: #e4e4e0;",
    "  --accent: #2f5d50;",
    "  --muted: #6b6b70;",
    "  --shadow: 0 1px 2px rgba(0,0,0,.06);",
    "  --radius: 6px;",
    "  --gap: 12px;",
    "}",
]

run_css, _ = run("public/style.css", CSS_TOKENS)
check("CSS custom properties are not a comment block", run_css, 0)

run_ids, _ = run(
    "public/style.css",
    [
        "#field-layer { position: fixed; }",
        "#field { display: block; }",
        "#sections { width: 12rem; }",
    ],
)
check("CSS id selectors are not comments", run_ids, 0)

run_sql, _ = run(
    "db/migrate.sql",
    [
        "-- Backfill the column before we make it NOT NULL.",
        "-- Rows written before the migration have no value at all.",
        "UPDATE accounts SET tier = 'free' WHERE tier IS NULL;",
    ],
)
check("SQL double-dash comments still count", run_sql, 2)

run_scss, bodies = run(
    "styles/main.scss",
    [
        "// Sass keeps a line comment even though plain CSS does not.",
        "$ink: #101014;",
    ],
)
check("SCSS line comments still count", run_scss, 1)
check(
    "comment bodies are extracted",
    bodies,
    ["Sass keeps a line comment even though plain CSS does not."],
)

run_js, _ = run(
    "tests/footer-layout.test.js",
    [
        "// The footer wraps because a negative margin is counted when the flex",
        "// item resolves its width, so the item is narrower than its own text.",
        "// Measuring the ink extent with a Range is the only way to see it.",
        "const rows = await page.evaluate(() => 1);",
    ],
)
check("a real JS comment run is counted", run_js, 3)

run_sheb, _ = run(
    "scripts/build.sh",
    [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
    ],
)
check("a shebang is not commentary", run_sheb, 0)

run_hex, _ = run(
    "scripts/palette.sh",
    [
        "# The brand ink, as the exported tokens carry it.",
        "INK=#101014",
    ],
)
check("shell comments still count", run_hex, 1)

run_html, _ = run(
    "public/index.html",
    [
        "<p>Sections 3-4 and the range #1-#9 are prose, not markers.</p>",
    ],
)
check("HTML has no line comment", run_html, 0)

run_unknown, _ = run(
    "config/thing.unknownext",
    [
        "# Fallback still catches an obvious comment.",
        "# Two of them, in fact.",
    ],
)
check("unknown extensions fall back to # and //", run_unknown, 2)

print()
if failures:
    print("%d failing" % len(failures))
    sys.exit(1)
print("all passing")
