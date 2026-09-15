# Platform notes

Quirks that cost real debugging time, recorded so the next project does not
pay for them again. Add to this file when a platform surprises you, and say
what the symptom looked like, because the symptom is what someone searches
for.

## iOS Safari

Every browser on an iPhone is Safari. When a reader says a page is broken
in Chrome and Firefox on their phone as well, that is one engine failing,
not three, and it usually means WebKit.

- A canvas backing store sized for a dpr of 3 can fail to allocate, and the
  failure is silent: the canvas stays empty with no error. Cap the device
  pixel ratio at about 1.5 on small viewports.
- `window.innerHeight` is stale during the first paint while the address bar
  is in transition, and `visualViewport` can report almost nothing while the
  bar settles. Size from a fixed `inset: 0` layer's own box, which resolves
  against the viewport, and re-measure on the next frame and again shortly
  after.
- A fixed child of an `overflow-x: hidden` ancestor is treated as part of
  that ancestor's scrolling chain on some builds, so it is sized to the
  ancestor's content height rather than the viewport. The layer then renders
  empty or frozen. Keep fixed layers as siblings of the wrapper.
- `requestAnimationFrame` is throttled below 60Hz in low power mode and on
  a backgrounded tab. Drive animation from a clock, in units per second,
  never per frame, or the speed reads as wrong or as static.
- Animation frames keep arriving for a short while after a tab is hidden.
  Bail on `document.hidden` rather than drawing what nobody can see.
- A freshly failed response can persist in the disk cache across a sleep and
  wake cycle and be served back as an instant failure. Probe with
  `cache: "no-store"`.
- `visibilitychange` and `pageshow` often fire before the OS has restored
  networking after an unlock, so the first wave of requests fails with no
  response at all. Treat every probe failing with status 0 as one network
  blip and retry once, rather than as several independent outages.

## Cloudflare

- DNSSEC on a zone registered with Cloudflare Registrar sits at `pending` while
  the registry scans for the CDS and CDNSKEY records the zone publishes, and
  that scan takes one to two days. The zone API reports `pending` throughout
  and the registrar record shows an empty `ds_records` list, which reads
  exactly like a submission that never happened. Check `dig +short DS <zone>`
  against a public resolver before deciding anything is wrong, and do not reach
  for the registrar API: it refuses the write to every API token, and the write
  was never needed.
- A `_redirects` rewrite whose target ends in `.html` is normalised to the
  extensionless path and served as a 308, so an SPA rule such as
  `/* /index.html 200` sends every real route to a redirect rather than
  rendering the app. This is not specific to `index.html`; a second copy under
  another name behaves the same way. A Pages Function is the mechanism that
  sets a status without rewriting.

## Reduced motion

Honour `prefers-reduced-motion`, and honour it the same way across a site. A
page that opts out while its neighbours comply looks like the compliant
pages are broken, and the reader reports it as a bug.

Reduced motion forbids travel, not life. A mark can fade up where it belongs
and a field can twinkle in place: nothing moves across the screen, and the
page is not a still image.

## CSS

- A class name that appears twice means the second element inherits the
  first's rules. A sections sidebar named `rail` inherited `height: 2px`
  from a scrubber track of the same name and spilled over the text beneath
  it, visible only in the single-column layout.
- Custom properties are not comments, but a tool that scans for lines
  beginning with `--` may count them as one. When a commit guard fires on a
  `:root` block, that is the guard's bug.
