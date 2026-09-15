#!/usr/bin/env python3
"""Extract the line comments a staged diff adds, and the longest run of them.

Reads `git diff --cached -U0` on stdin, takes the file path as argv[1], and
prints the longest run of consecutive added comment lines on the first line,
then one line per comment body.

Which markers count is decided by the file's extension, because the same
characters mean different things in different languages. CSS has no line
comment at all: `--accent: #fff` is a custom property and `#main {` is an id
selector, and a language-blind scanner reads a run of either as a comment
block and refuses the commit. A marker must also be followed by whitespace or
end the line, so a value never reads as prose.
"""

import re
import sys
from pathlib import Path

HASH = ("#",)
SLASH = ("//",)
DASH = ("--",)
SEMI = (";",)

BY_EXT = {
    ".sh": HASH,
    ".bash": HASH,
    ".zsh": HASH,
    ".py": HASH,
    ".rb": HASH,
    ".pl": HASH,
    ".yml": HASH,
    ".yaml": HASH,
    ".toml": HASH,
    ".nix": HASH,
    ".mk": HASH,
    ".r": HASH,
    ".jl": HASH,
    ".tf": HASH,
    ".cfg": HASH,
    ".conf": HASH,
    ".gitignore": HASH,
    ".env": HASH,
    ".dockerfile": HASH,
    ".c": SLASH,
    ".h": SLASH,
    ".cpp": SLASH,
    ".hpp": SLASH,
    ".cc": SLASH,
    ".js": SLASH,
    ".mjs": SLASH,
    ".cjs": SLASH,
    ".ts": SLASH,
    ".tsx": SLASH,
    ".jsx": SLASH,
    ".java": SLASH,
    ".go": SLASH,
    ".rs": SLASH,
    ".swift": SLASH,
    ".kt": SLASH,
    ".kts": SLASH,
    ".scala": SLASH,
    ".cs": SLASH,
    ".php": SLASH,
    ".dart": SLASH,
    ".zig": SLASH,
    ".sol": SLASH,
    ".proto": SLASH,
    ".gradle": SLASH,
    ".scss": SLASH,
    ".less": SLASH,
    ".sass": SLASH,
    ".sql": DASH,
    ".lua": DASH,
    ".hs": DASH,
    ".elm": DASH,
    ".vhd": DASH,
    ".lisp": SEMI,
    ".el": SEMI,
    ".clj": SEMI,
    ".cljs": SEMI,
    ".scm": SEMI,
    ".asm": SEMI,
    ".ini": SEMI,
    # CSS, HTML, XML, JSON and Markdown have no line comment. An empty tuple
    # is the point of the mapping, not an oversight.
    ".css": (),
    ".html": (),
    ".htm": (),
    ".xml": (),
    ".svg": (),
    ".json": (),
    ".jsonc": (),
    ".md": (),
    ".mdx": (),
}

BY_NAME = {
    "Makefile": HASH,
    "Dockerfile": HASH,
    "Gemfile": HASH,
    "Rakefile": HASH,
    "Justfile": HASH,
    "justfile": HASH,
    "makefile": HASH,
}

# A file we do not recognise gets the two markers that are nearly universal,
# still subject to the whitespace rule. Guessing wide here would resurrect the
# bug this scanner exists to fix.
FALLBACK = HASH + SLASH


def markers_for(path):
    p = Path(path)
    if p.name in BY_NAME:
        return BY_NAME[p.name]
    return BY_EXT.get(p.suffix.lower(), FALLBACK)


def matcher(markers):
    if not markers:
        return None
    alts = "|".join(re.escape(m) + "+" for m in markers)
    # The marker must be followed by a space, a tab, or the end of the line.
    # `# note` is a comment; `#fff` and `--accent:` are values.
    return re.compile(r"^\+[ \t]*(?:%s)(?:[ \t]+(.*))?$" % alts)


def main():
    pat = matcher(markers_for(sys.argv[1] if len(sys.argv) > 1 else ""))
    bodies, best, cur = [], 0, 0
    for line in sys.stdin:
        line = line.rstrip("\n")
        if not line.startswith("+") or line.startswith("+++"):
            cur = 0
            continue
        # A shebang is required syntax, not commentary.
        if line.lstrip("+").lstrip().startswith("#!"):
            cur = 0
            continue
        m = pat.match(line) if pat else None
        if m:
            cur += 1
            best = max(best, cur)
            body = (m.group(1) or "").strip()
            if body:
                bodies.append(body)
        else:
            cur = 0
    print(best)
    for b in bodies:
        print(b)


if __name__ == "__main__":
    main()
