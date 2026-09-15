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
- Assert containment, not only page overflow. Every word belongs inside a
  box the reader can see, and an element positioned along a track hangs
  outside it whenever it is centred on either end of that track. Measure
  each label, badge and caption against the rectangle of the card it sits
  in, at every width, and anchor the ones at the ends by their inner edge.
- Never trade one defect for a worse one. Forcing a row onto a single line
  by forbidding a break can push the document sideways, which fails WCAG
  1.4.10. If content genuinely cannot fit, it shrinks or scrolls inside its
  own container, and the document never scrolls.
- Prove the test fails without the fix. A layout test that was never seen
  red is not evidence, and this class of test passes for the wrong reason
  more often than most.

A revision timeline centred each date on its tick. The first and last ticks
sit on the ends of the rail, so the date at each end hung outside the card
on every policy and at both widths. The document never scrolled sideways
and no two labels touched, so the page-level checks stayed green while the
defect was plain to anyone looking at the page.

Negative margins paired with padding, a common way to enlarge a touch
target in place, are counted when a flex item resolves its width. The item
then computes narrower than the text it holds and breaks under any
pressure. Prefer vertical padding, or an explicit unshrinkable item.

Phrases that read as one unit, a label with its value, a date beside the
link that explains it, break inside themselves when nothing forbids it.
Mark each part unbreakable so a break can only fall at a separator, and
give the type a fluid size so it fits the narrowest screen you support.

## Every gesture needs a plain control beside it

A gesture is a convenience layered over something simpler. Ship the
simpler thing as well. WCAG 2.2 2.5.7 requires a single-pointer
alternative to any dragging movement, and that alternative is also the
only version that exists on a phone, where a file cannot be dragged onto
a page at all.

- A drop zone carries a file input. The input is the control and the
  visible text names the action, so the same element answers a pointer, a
  keyboard and a touch screen.
- Write the label as the action rather than the gesture. "Choose a file"
  tells every reader what to do; "drop a file here" tells a phone user to
  do something their device cannot.
- A control that is only reachable by dragging is not a control with an
  accessibility gap, it is a feature that does not exist for part of the
  audience while still occupying space on the page and inviting them to
  try.
- The same rule covers reordering, sliders and canvas interactions: if the
  only way to set a value is to drag it, add a field, a pair of buttons or
  a select.

## A view change has to move the reader

When a click replaces what the screen is showing, put the reader at the start
of the new view. A page that swaps its content while leaving the viewport
halfway down the old one is indistinguishable, from where the reader is
sitting, from a click that did nothing: the heading, the loading line and the
first paragraph all render above the fold they are looking at.

- Reset scroll on the transition, not in the handler. One effect keyed on the
  view covers every route into it, and a fix applied to the control that was
  reported leaves the same defect on every other control beside it.
- Jump rather than animate. A long page gliding upward while its content is
  replaced underneath is worse than arriving, and a smooth scroll disregards a
  reader who asked for less motion.
- Move focus as well as the viewport where the new view is a document rather
  than a dialog. A reader on a keyboard or a screen reader is not helped by a
  scroll they cannot perceive.
- Going back restores the previous position. Forward is a new view and starts
  at the top; back is a return and should land where it left.
- The visible acknowledgement is part of this. A transition that takes time
  needs a state the reader can see from where they now are, which is only true
  once they have been moved.

## Every fetch has three endings

Anything that loads data can succeed, fail or still be waiting, and each of
those is a distinct thing to draw. Code that models only two collapses the
other into whichever state it drew first, and the usual result is a spinner
that never stops, because the error was caught and dropped and the
component still believes the request is in flight.

- Treat "failed" as a value the component holds, not as an absence.
  Deriving the loading state from "no data yet" makes every failure
  indistinguishable from a slow success.
- Never swallow a rejection into a null. If a panel is allowed to fail
  without taking the page down, it is still required to say that it failed.
- The failure state names what went wrong and what to try. A bare "error"
  costs the reader the same trip to the console you were trying to save.
- Test all three. The failure path is the one that ships broken, because it
  is the one nobody clicks.
- An empty result is a fourth case and it is not a failure. Say the list is
  empty rather than drawing nothing.

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
