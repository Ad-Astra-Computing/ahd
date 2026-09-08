#!/usr/bin/env bash
# Shared AI-tell pattern library, sourced by check-prose.sh and
# check-commit-msg.sh so the two never drift. No side effects on source;
# defines variables and one scanner function.
#
# Scope note: these are the patterns a reader uses to spot machine-written
# English. Each entry below is a tell that is UNAMBIGUOUS in a technical
# document or commit message. Correct-usage exceptions (an en dash in a range,
# "harness" the noun) are handled by keeping the lists tight, not by adding
# argue-with-the-writer heuristics: a check that cries wolf gets bypassed, and a
# bypassed check is worse than none.

# Single words / short verb phrases that cluster in LLM prose.
TELL_WORDS='delve|dive into|underscore|bolster|foster|unpack|shed light on|pave the way|pivotal|groundbreaking|cutting-edge|transformative|game-changing|seamless|intricate|multifaceted|holistic|testament to|realm of|leverage|boasts|robust suite|elevate|unleash|harness the power|navigate the (complex|landscape)|load-bearing|through-line|production lever|durable win|at its core|meticulous|comprehensive (suite|guide|overview)|innovative|paradigm|deep dive|key insight|crucially|notably,|importantly,|significantly,|that said,|here.s the thing'

# Filler / throat-clearing phrases.
TELL_PHRASES="it's worth noting|it is worth noting|it's important to note|it is important to note|essentially|serves as|can be found (in|at|under)|in today's ([a-z-]+ ){0,3}(world|landscape|environment|climate|era)|at the end of the day|when it comes to|this is where [a-z]* comes in|let's explore|let's dive|now let's|in conclusion|in summary,|rest assured"

# The same cadence also arrives with a comma and a pronoun in place of the
# "but", which reads identically and used to pass clean, so it is listed too.
# Contrast/emphasis cadences the models overuse: the "not just X, but Y" and
# "it's not X, it's Y" false contrast, and the "no X, no Y, just Z" staccato
# triple. These are among the most-cited written tells.
TELL_CONTRAST="not just [a-z ]+, but|(do|does|did)(n't| not) just [a-z ]+, (it|you|they|we|i) |isn't just|is not just|isn't about [a-z ]+\. it's about|it's not [a-z ]+, it's|it is not [a-z ]+, it is|no [a-z]+, no [a-z]+, (just|only) "

# Justifying a wording choice by how human it sounds. We do not write to pass
# as human; we write in the owner's voice, and the reason a word is better is
# what it means, not who it sounds like. A commit subject on this repo read
# "'staying in touch' reads human, upkeep did not", which is the machine's
# framing of its own output rather than an argument about the copy.
TELL_HUMANNESS="(reads|sounds?|feels?|looks?) (more )?human|human[- ]sounding|sounds? like a (real )?(human|person)|more natural[- ]sounding|less robotic|passes? as human|how a (person|human|reader) would (say|write|put|phrase)|how (you|we|people) would (say|write|put|phrase) it"

# Emphasis and layout tells. These are about SHAPE rather than vocabulary, and
# they are the ones that got a pull request body past the word lists: bold used
# to punch a claim mid-sentence, headings written as narrative beats instead of
# labels, and a run of bold-label bullets that all look the same.
#
# Each is scoped to keep it from crying wolf. Inline emphasis only counts when
# it sits inside a sentence, so a bold label at the start of a line is fine.
# Headings only count when they read as a clause with a verb, so "## Verification"
# passes and "## What it found immediately" does not.
TELL_HEADING_VERBS='^[[:space:]]*#{1,6}[[:space:]].*\b(could|cannot|can.t|does|doesn.t|did|will|would|found|finds|matters|means|works|breaks|happened|went|is|was|are|were)\b'
TELL_HEADING_OPENERS='^[[:space:]]*#{1,6}[[:space:]]+(what|why|how|here|the (surface|reason|problem|fix|answer|result))\b'

# scan_shape <text> -> prints one line per shape tell, returns 0 if any fired.
scan_shape() {
  local text=$1 rc=1 n
  # Bold inside a sentence: at least one word before it on the line, and not a
  # "**Label**:" opener.
  n=$(printf '%s' "$text" | grep -oE '[[:alnum:]][^*]*\*\*[^*]+\*\*' | wc -l)
  if [ "${n:-0}" -gt 0 ]; then
    printf '  inline bold x%s: state the number, do not shout it\n' "$n"
    rc=0
  fi
  n=$(printf '%s' "$text" | grep -ciE "$TELL_HEADING_VERBS" || true)
  local m
  m=$(printf '%s' "$text" | grep -ciE "$TELL_HEADING_OPENERS" || true)
  n=$(( ${n:-0} + ${m:-0} ))
  if [ "$n" -gt 0 ]; then
    printf '  narrative heading x%s: a heading is a label, not a sentence\n' "$n"
    rc=0
  fi
  # Three or more bold-label bullets in a row is a template, not writing.
  n=$(printf '%s' "$text" | grep -cE '^[[:space:]]*[-*]?[[:space:]]*\*\*[^*]+\*\*:' || true)
  if [ "${n:-0}" -ge 3 ]; then
    printf '  bold-label list x%s: vary the structure or use plain sentences\n' "$n"
    rc=0
  fi
  return $rc
}

# Advisory patterns. Each is a house rule the reader should hear about, but
# one whose pattern also matches correct prose, so it warns and never blocks.
# The serial comma pattern fires on a clause that ends in a short phrase
# before "and" as well as on a real list; a contraction is a register call.
ADVISORY_SERIAL="[^ ,]+, [^ ,]+( [^ ,]+){0,3}, (and|or|nor) "
ADVISORY_CONTRACTION="[[:alpha:]]+['’](t|re|ve|ll|d|m)|(it|that|there|here|what|let)['’]s"

# scan_advisory <text> -> prints one "  <label>: <hits>" line per advisory
# category, returns 0 if any fired, 1 if clean. Callers print the hits and
# leave their exit code alone.
scan_advisory() {
  local text=$1 hit rc=1
  hit=$(printf '%s' "$text" | grep -oE "$ADVISORY_SERIAL" | sort -u | tr '\n' ';')
  [ -n "$hit" ] && { printf '  serial comma: %s\n' "$hit"; rc=0; }
  hit=$(printf '%s' "$text" | grep -oiE "$ADVISORY_CONTRACTION" | sort -u | tr '\n' ' ')
  [ -n "$hit" ] && { printf '  contraction: %s\n' "$hit"; rc=0; }
  return $rc
}

# scan_tells <text>  -> prints one "  <label>: <hits>" line per category hit,
# returns 0 if any tell fired, 1 if clean. Caller supplies context.
scan_tells() {
  local text=$1 hit rc=1
  # An em dash (U+2014) is the tell the owner names most often, but ONLY in
  # flowing prose. A markdown heading uses "date — title" as a structural
  # separator (the project's DECISIONS convention), which is typography, not a
  # machine-written sentence. Flagging it is the cry-wolf failure these hooks
  # avoid, so exclude ATX heading lines from the em-dash count.
  local n
  n=$(printf '%s' "$text" | grep -vE '^[[:space:]]*#{1,6}[[:space:]]' | grep -c -- '—')
  if [ "$n" -gt 0 ]; then
    printf '  em dash x%s: use a comma, a colon or two sentences\n' "$n"
    rc=0
  fi
  hit=$(printf '%s' "$text" | grep -oiE "$TELL_WORDS" | sort -u | tr '\n' ' ')
  [ -n "$hit" ] && { printf '  flagged wording: %s\n' "$hit"; rc=0; }
  hit=$(printf '%s' "$text" | grep -oiE "$TELL_PHRASES" | sort -u | tr '\n' ' ')
  [ -n "$hit" ] && { printf '  filler phrase: %s\n' "$hit"; rc=0; }
  hit=$(printf '%s' "$text" | grep -oiE "$TELL_CONTRAST" | sort -u | tr '\n' ' ')
  [ -n "$hit" ] && { printf '  false contrast: %s\n' "$hit"; rc=0; }
  hit=$(printf '%s' "$text" | grep -oiE "$TELL_HUMANNESS" | sort -u | tr '\n' ' ')
  [ -n "$hit" ] && { printf '  humanness claim: %s (say what the word means, not who it sounds like)\n' "$hit"; rc=0; }
  return $rc
}
