import { describe, it, expect } from "vitest";
import { rule } from "../src/lint/rules/no-three-equal-cards.js";

function run(html: string) {
  return rule.check({ file: "t.html", html, css: "" });
}

describe("ahd/no-three-equal-cards", () => {
  it("fires on a flex row of three equal-tag cards", () => {
    const html = `
      <section class="flex gap-4">
        <div>one</div>
        <div>two</div>
        <div>three</div>
      </section>
    `;
    expect(run(html)).toHaveLength(1);
  });

  it("fires on a grid-cols-3 row of three equal-tag cards", () => {
    const html = `
      <div class="grid-cols-3">
        <article>one</article>
        <article>two</article>
        <article>three</article>
      </div>
    `;
    expect(run(html)).toHaveLength(1);
  });

  it("does not fire on a row of two or four", () => {
    const html = `
      <section class="flex gap-4">
        <div>one</div>
        <div>two</div>
      </section>
    `;
    expect(run(html)).toHaveLength(0);
  });

  // ReDoS regression guard; see the bounded-run comment in the rule.
  it("stays fast on an unterminated flex class attribute (ReDoS guard)", () => {
    const adversarial = `<div class="flex ${"gap-".repeat(50_000)}`;
    const start = Date.now();
    run(adversarial);
    expect(Date.now() - start).toBeLessThan(200);
  });
});
