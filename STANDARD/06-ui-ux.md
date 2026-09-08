# UI and UX

Two books set the philosophy and one standard sets the floor.

## Self-evident design

Steve Krug's rule is that a page should not make the user think. A
first-time user knows what the screen is and what to do without
instruction. Test this cheaply and often: watch a few people use the
thing each cycle and fix whatever makes them hesitate. Informal testing
with a handful of users beats a formal study you run once.

## The vocabulary of everyday things

Don Norman's revised edition gives the terms to design by. An affordance
is what an object lets you do. A signifier is the perceivable cue that
communicates it. Mapping is the match between a control and its effect.
Feedback is the immediate, informative response to an action. Design for
error: prevent it with forcing functions, and make a mistake easy to
notice and to undo.

## Accessibility

WCAG 2.2 Level AA is the minimum shippable bar, not a goal. Meet the 2.2
additions: a target size of at least 24 by 24 CSS pixels or adequate
spacing, focus that stays visible and unobscured, no drag-only
interactions, consistent help and no redundant re-entry. Gate UI changes
on an automated a11y check such as axe or Lighthouse, and require a
manual keyboard-only and screen-reader pass on new or changed flows,
since automation catches only a fraction of the issues.

## Proportion

Proportion and modular type scales, including golden-ratio ratios, are a
starting heuristic for layout and type. They are guidelines, not laws.
No evidence makes 1.618 uniquely correct. Legibility, content fit and
accessibility override any ratio.

## Measure the rendered page

Markup and CSS assertions prove a rule is present, never that the page is
right. Layout emerges from the browser, so layout is verified in a browser,
at the sizes people really use.

- Measure the rendered result: how many lines a row of links occupies, how
  wide the text actually is inside its container, whether the document
  scrolls sideways. Screenshots and a reading of the CSS are not proof.
- Cover both ends. A break reported on a phone is often reproducible only
  on a desktop, and the reverse, so a layout check runs at narrow and wide
  widths rather than the one that was reported.
- Where markup is copied between pages, measure every page that carries it.
  A fix applied to the page someone complained about is not a fix.
- Check every viewport before calling it done, a phone and a desktop at
  minimum. A break reported on one is often invisible on the other, and
  half a check is what lets a reader find the defect first.
- Assert the property that actually failed. No horizontal overflow and no
  overlap are necessary, not sufficient: a phrase that wraps mid-sentence
  passes both. Where text is meant to read as one line, assert it occupies
  one line, and that a link within it is not split across two.
- Never trade one defect for a worse one. Forcing a row onto a single line
  by forbidding a break can push the document sideways, which fails WCAG
  1.4.10. If content genuinely cannot fit, it shrinks or scrolls inside its
  own container, and the document never scrolls.
- Prove the test fails without the fix. A layout test that was never seen
  red is not evidence, and this class of test passes for the wrong reason
  more often than most.

Negative margins paired with padding, a common way to enlarge a touch
target in place, are counted when a flex item resolves its width. The item
then computes narrower than the text it holds and breaks under any
pressure. Prefer vertical padding, or an explicit unshrinkable item.

Phrases that read as one unit, a label with its value, a date beside the
link that explains it, break inside themselves when nothing forbids it.
Mark each part unbreakable so a break can only fall at a separator, and
give the type a fluid size so it fits the narrowest screen you support.

## Not the generated look

The result must not read as AI-generated either. The default output of a
UI generator has a recognizable look: a purple or blue gradient hero, a
row of identical rounded cards each with an emoji icon, filler headings
that restate the obvious and untouched component-library defaults. Skip
it. Design with intent: choose type and spacing for the content, cut
decoration that carries no meaning and make the layout specific to what
the product does. If a screen could belong to any product, it is not
done.

## Sources

- Steve Krug, Don't Make Me Think: https://sensible.com/dont-make-me-think/
- Don Norman, The Design of Everyday Things: https://mitpress.mit.edu/9780262525671/the-design-of-everyday-things/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Golden ratio as guideline: https://www.nngroup.com/articles/golden-ratio-ui-design/
