#!/usr/bin/env python3
"""Generate per-tool skill adapters from the neutral skills/ source.

Each skill is one skills/<name>/SKILL.md file. Its YAML frontmatter carries
the manifest fields (name, description, invocation, aliases, includes,
capabilities); the body is tool-neutral prose. Composition is written in the
body as a line "> Run playbook: <name>". This tool expands that per target:

  claude-code : frontmatter + body, the include line becomes the Skill-tool call
  codex       : the body with each include inlined as a pointer, header comment
  polymetis   : one manifest.json array the internal harness reads

Run: python3 tools/build-adapters.py
Check (CI): python3 tools/build-adapters.py --check   # exit 1 if adapters stale
"""

from __future__ import annotations

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKILLS = os.path.join(ROOT, "skills")
OUT = os.path.join(ROOT, "adapters")
INCLUDE = re.compile(r"^>\s*Run playbook:\s*(\S+)\s*$", re.MULTILINE)


def parse_frontmatter(text: str) -> tuple[dict, str]:
    if not text.startswith("---\n"):
        return {}, text
    end = text.index("\n---\n", 4)
    raw, body = text[4:end], text[end + 5 :]
    meta: dict = {}
    for line in raw.splitlines():
        if not line.strip() or line.strip().startswith("#"):
            continue
        key, _, val = line.partition(":")
        key, val = key.strip(), val.strip()
        if val.startswith("[") and val.endswith("]"):
            items = [v.strip() for v in val[1:-1].split(",") if v.strip()]
            meta[key] = items
        else:
            meta[key] = val
    return meta, body.lstrip("\n")


def load_skills() -> list[dict]:
    out = []
    for name in sorted(os.listdir(SKILLS)):
        path = os.path.join(SKILLS, name, "SKILL.md")
        if not os.path.isfile(path):
            continue
        with open(path, encoding="utf-8") as fh:
            meta, body = parse_frontmatter(fh.read())
        meta["name"] = meta.get("name", name)
        meta["_body"] = body
        out.append(meta)
    return out


def claude_adapter(s: dict) -> str:
    fm = [f"name: {s['name']}", f"description: {s.get('description', '')}"]
    if s.get("invocation") == "user":
        fm.append("disable-model-invocation: true")
    body = INCLUDE.sub(
        lambda m: f'Call the Skill tool with "{m.group(1)}".', s["_body"]
    )
    return "---\n" + "\n".join(fm) + "\n---\n\n" + body


def codex_adapter(s: dict) -> str:
    body = INCLUDE.sub(
        lambda m: f"Follow the {m.group(1)} playbook (skills/{m.group(1)}/SKILL.md).",
        s["_body"],
    )
    header = f"# {s['name']}\n\n{s.get('description', '')}\n\n"
    return header + body


def polymetis_manifest(skills: list[dict]) -> str:
    entries = [
        {
            "name": s["name"],
            "description": s.get("description", ""),
            "invocation": s.get("invocation", "model"),
            "aliases": s.get("aliases", []),
            "includes": s.get("includes", []),
            "capabilities": s.get("capabilities", []),
            "body": f"skills/{s['name']}/SKILL.md",
        }
        for s in skills
    ]
    return json.dumps(entries, indent=2) + "\n"


def build() -> dict[str, str]:
    skills = load_skills()
    files: dict[str, str] = {}
    for s in skills:
        files[f"claude-code/{s['name']}.md"] = claude_adapter(s)
        files[f"codex/{s['name']}.md"] = codex_adapter(s)
    files["polymetis/manifest.json"] = polymetis_manifest(skills)
    return files


def main(argv: list[str]) -> int:
    files = build()
    check = "--check" in argv
    stale = 0
    for rel, content in files.items():
        path = os.path.join(OUT, rel)
        existing = None
        if os.path.isfile(path):
            with open(path, encoding="utf-8") as fh:
                existing = fh.read()
        if existing == content:
            continue
        stale += 1
        if check:
            print(f"stale: adapters/{rel}")
        else:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(content)
            print(f"wrote adapters/{rel}")
    if check and stale:
        print(f"\n{stale} adapter(s) out of date. Run tools/build-adapters.py.")
        return 1
    if not check:
        print(f"\n{len(files)} adapter file(s) up to date.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
