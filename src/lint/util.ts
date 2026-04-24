import { parse as parseHtml5, parseFragment } from "parse5";
import postcss from "postcss";
import type { Root as PostcssRoot } from "postcss";
import type { DefaultTreeAdapterMap } from "parse5";
import type { Violation, Rule, LintInput } from "./types.js";

export function lineOf(source: string, offset: number): number {
  return source.slice(0, offset).split("\n").length;
}

export function findAll(source: string, pattern: RegExp): RegExpExecArray[] {
  const out: RegExpExecArray[] = [];
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  let m;
  while ((m = re.exec(source)) !== null) {
    out.push(m);
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

export function extractInline(
  html: string,
): { style: string; script: string; text: string } {
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join("\n");
  const scriptBlocks = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1])
    .join("\n");
  const text = html.replace(/<[^>]+>/g, " ");
  return { style: styleBlocks, script: scriptBlocks, text };
}

export function violation(
  rule: Rule,
  input: LintInput,
  message: string,
  extra?: { line?: number; snippet?: string },
): Violation {
  return {
    ruleId: rule.id,
    severity: rule.severity,
    file: input.file,
    message,
    line: extra?.line,
    snippet: extra?.snippet,
  };
}

// ---------------------------------------------------------------------------
// Parsed-tree helpers. Added in 0.8.0 to replace regex-based rule
// implementations that mishandle nested prose, CSS custom properties, and
// other structural cases. Rules that need proper structure call these and
// iterate the AST directly. The raw `html` / `css` fields on LintInput are
// still present so legacy regex rules keep working unchanged.
// ---------------------------------------------------------------------------

type Parse5Node = DefaultTreeAdapterMap["node"];
type Parse5Element = DefaultTreeAdapterMap["element"];

let _htmlCache = new WeakMap<LintInput, Parse5Node | null>();
let _cssCache = new WeakMap<LintInput, PostcssRoot | null>();

/**
 * Parse an HTML string with parse5. Returns the document root for a full
 * document or a fragment root when the input doesn't contain `<html>`.
 * Memoised per LintInput so engine and rules don't re-parse.
 */
export function parseHtml(input: LintInput): Parse5Node {
  const cached = _htmlCache.get(input);
  if (cached) return cached;
  const looksLikeDoc = /<!doctype\s|<html[\s>]/i.test(input.html);
  const tree = looksLikeDoc
    ? (parseHtml5(input.html) as Parse5Node)
    : (parseFragment(input.html) as Parse5Node);
  _htmlCache.set(input, tree);
  return tree;
}

/**
 * Parse combined CSS (external stylesheets + inline <style> blocks from
 * the HTML) with postcss. Custom properties declared on :root / html are
 * collected so downstream rules can resolve `var(--token)` to its value.
 * Memoised per LintInput.
 */
export function parseCss(input: LintInput): PostcssRoot {
  const cached = _cssCache.get(input);
  if (cached) return cached;
  const inline = extractInline(input.html).style;
  const combined = [input.css, inline].filter(Boolean).join("\n");
  // postcss.parse returns a Root; we cast to our exported alias.
  const root = postcss.parse(combined) as PostcssRoot;
  _cssCache.set(input, root);
  return root;
}

const PROSE_ELEMENT_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "figcaption",
  "blockquote",
  "dd",
  "dt",
  "summary",
  "em",
  "strong",
  "a",
  "span",
]);

// Tags whose text contents are NOT prose and must be skipped when walking
// for em-dashes, slop phrases, copy smells, etc.
const NON_PROSE_TAGS = new Set([
  "code",
  "pre",
  "script",
  "style",
  "kbd",
  "samp",
  "var",
  "tt",
  "svg",
  "math",
  "template",
  "noscript",
]);

function isElement(node: Parse5Node): node is Parse5Element {
  return typeof (node as any).tagName === "string";
}

/**
 * Walk the AST and yield the concatenated text content of every prose
 * element, excluding text inside <code>/<pre>/<script>/<style> and their
 * kin. Each yielded entry is the element AST node and the text the rule
 * should scan. Nested prose elements (e.g. <strong> inside <li>) don't
 * break containment: the <li> yields the full paragraph it wraps, and
 * the <strong> also yields separately. Rules should deduplicate by
 * position if they care.
 */
export function* proseText(tree: Parse5Node): Generator<{
  element: Parse5Element;
  text: string;
  sourceLine: number | undefined;
}> {
  const stack: Parse5Node[] = [tree];
  while (stack.length > 0) {
    const node = stack.pop()!;
    const childNodes = (node as any).childNodes as Parse5Node[] | undefined;
    if (!childNodes) continue;
    for (let i = childNodes.length - 1; i >= 0; i--) stack.push(childNodes[i]);
    if (isElement(node) && PROSE_ELEMENT_TAGS.has(node.tagName)) {
      const text = collectProseText(node);
      if (text.trim().length > 0) {
        yield {
          element: node,
          text,
          sourceLine: (node as any).sourceCodeLocation?.startLine,
        };
      }
    }
  }
}

function collectProseText(element: Parse5Element): string {
  let out = "";
  const childNodes = (element as any).childNodes as Parse5Node[] | undefined;
  if (!childNodes) return out;
  for (const child of childNodes) {
    if (isElement(child)) {
      if (NON_PROSE_TAGS.has(child.tagName)) continue;
      out += collectProseText(child);
    } else if ((child as any).nodeName === "#text") {
      out += (child as any).value as string;
    }
  }
  return out;
}

/**
 * Collect all CSS custom property declarations on :root or html so
 * downstream rules can resolve var(--name) → value. Returns a Map from
 * property name (without leading "--") to value string. Shallow: does
 * not follow var() chains; a value that is itself `var(--other)` comes
 * back unresolved. That matches how real browsers resolve tokens within
 * a single cascade level.
 */
export function collectRootVars(root: PostcssRoot): Map<string, string> {
  const vars = new Map<string, string>();
  root.walkRules((rule) => {
    const sel = rule.selector;
    // Accept :root, html, and selector lists that contain either.
    const parts = sel.split(",").map((s) => s.trim());
    const hasRoot = parts.some(
      (p) => /^:root(\s|$|:)/.test(p) || /^html(\s|$|:)/.test(p),
    );
    if (!hasRoot) return;
    rule.walkDecls((decl) => {
      if (decl.prop.startsWith("--")) {
        vars.set(decl.prop.slice(2), decl.value);
      }
    });
  });
  return vars;
}

/**
 * Resolve `var(--name)` references in a CSS value using the given vars
 * map. Leaves unresolved vars in place. Does not follow chains of
 * var()-of-var().
 */
export function resolveVars(value: string, vars: Map<string, string>): string {
  return value.replace(
    /var\(\s*--([\w-]+)\s*(?:,\s*[^)]*)?\)/g,
    (_, name) => vars.get(name) ?? `var(--${name})`,
  );
}
