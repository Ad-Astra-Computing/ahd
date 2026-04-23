# The Slop Taxonomy

Most of what an LLM produces when you ask it for a landing page looks the same. Not *similar* — the same. Centered headline, pill-shaped "Now in beta" badge above it, purple-to-blue gradient behind it, three rounded cards in a row below it, Lucide icon in each card, Inter everywhere, a "Trusted by" logo bar that was never trusted by anyone. Open three different agent outputs side by side and the only variable is the copy.

This is not a failure of the models. It is what the models are for. An LLM emits the distributional centre of its training data, and the training data is a decade of SaaS landing pages converging on shadcn defaults. "Good design" in that corpus is a statistical majority, and the majority is slop.

The goal of Artificial Human Design is to make LLMs deliver what the distribution will not: specificity, asymmetry, voice, restraint, risk. Before we can force the models out of the centre, we need to name the centre precisely. The list below is that centre. Thirty-eight tells, catalogued across web, graphic design, and typography. If you can tick more than four in a row on a page, you are looking at slop.

## Web and UI

The easiest slop to spot, because the sample size is in the billions.

1. Inter as both display and body face. Interchangeable with Roboto, Open Sans, Poppins, Lato, system-ui. Grotesques with no voice, picked because they were already loaded.
2. Purple-to-blue hero gradient. `from-indigo-500 via-purple-500 to-pink-500`, or the blurred-blob variant of it pushed behind a glass panel.
3. Centred hero stack. Pill badge, 48–72px headline, 18px subhead, two CTAs (one filled, one ghost), `max-w-3xl`, everything on the centre line.
4. `rounded-2xl` on everything. Buttons, cards, inputs, avatars, modals, images, the page wrapper itself. No contrast between sharp and soft, because nothing is ever sharp.
5. Three feature cards in a row. Always three. Icon in a rounded square, 20px title, three lines of description. The holy trinity of feature sections.
6. Lucide icon in a rounded square with a subtle gradient fill. Always the obvious icon. Zap for speed, Shield for security, Sparkles for anything the product would prefer you call AI.
7. Emoji bullets in feature lists. ✨ 🚀 ⚡ 🎯 attached to sentences that are already trying too hard.
8. Glassmorphism panels used indiscriminately. `backdrop-blur-xl bg-white/10 border border-white/20` on a card that contains a paragraph of text. Frosted for no reason.
9. Dark mode that is `#0a0a0a` and one neon accent. No warm blacks, no paper-and-ink hierarchy, no midtones. A palette that thinks "dark" is a colour.
10. The same drop shadow on every card. `shadow` at `blur-2xl`, `opacity-0.1`, `offset-y-4`. Beige. Soft. Invisible.
11. Gradient text on the word "AI". Second place: gradient text on "future". Third: gradient text on both.
12. Faked testimonials with faked avatars. DiceBear silhouettes, five-star ratings, "John D., CEO at Acme". Three columns, because four would look like a list.
13. A "Trusted by" logo bar of companies the product has no relationship with. Desaturated SVGs arranged with suspiciously even spacing.
14. Bento grid on a dark background. Each cell a rounded-2xl card with a gradient border and a tiny 3D render inside. Every cell wants to be the hero.
15. Symmetry everywhere. Dead-centre compositions, equal gutters, cards of identical height, no visual tension, no reason to look at one part of the page before another.
16. Border-radius without hierarchy. Button, card, and page wrapper all at 12px. The radius is a habit, not a decision.
17. The AI shimmer. A silver diagonal sweep used for loading states, new features, hero text and whatever else the generator got bored of.
18. Fade-up-on-scroll on every element, staggered 100ms, triggered regardless of intent. Motion as decoration, not meaning.
19. The canonical CTA button. 44px tall, 12px radius, gradient fill, arrow icon, faint glow on hover. Copy reads "Get started" or "Try it free".
20. Pricing as three tiers with the middle one marked "Most Popular" by a gradient border. Tick-mark lists, a single toggle for monthly and annual, the word "custom" on the third tier.
21. The mandatory four-column footer. Product, Company, Resources, Legal, a copyright, a row of social icons in circles.
22. A scroll-jacked hero with a looping 3D blob behind it. Usually the Spline default scene. Iridescent. Inexplicable.
23. `prefers-reduced-motion` unrespected. Motion that nobody asked for and that nobody can opt out of.
24. The house style of SaaS copy. "Build the future of X." "Ship faster." "Your AI-native Y." The hedge "may" used to avoid saying anything.

## Graphic and Brand

Slop that predates the current wave but which LLMs have enthusiastically adopted.

25. Corporate Memphis. Flat illustration, pastel palette, one accent colour, big-headed figures floating through space. Already a cliché in 2018, still the default in 2026.
26. The AI illustration look. Marginally too smooth, slightly too symmetrical, subsurface scatter on everything, six fingers when you zoom in.
27. The iridescent 3D blob as hero art. A Stripe reference lifted out of Stripe's reasons for using it.
28. Stock photography of a diverse team looking at a laptop in a sunlit office. If the laptop is open to a dashboard, the tell is complete.
29. Mesh gradient backdrops deployed with no typographic counter-force. Stripe's grammar without Stripe's sentences.
30. The wordmark that is a lowercase grotesque with a coloured dot or bracket. `productname.` Every Y Combinator batch since 2021.
31. A monoline icon set with uniform 1.5px stroke and rounded caps. Feather, Lucide, the same set renamed. Zero visual authorship.

## Typography and System

The quietest tells and the most reliable. Slop is almost always typographically thin.

32. Two weights in the whole system. Regular and semibold. No thin, no black, no italic, no small caps, no tabular figures.
33. Line-height 1.5 on everything. Body, headline, caption, button. One number does not fit all sizes.
34. Measure blown out to 80–100 characters per line. Text is set for screens instead of for reading.
35. Default tracking everywhere. No negative tracking on display sizes. No opened tracking on all-caps labels. Letters sit where the font delivered them.
36. One typeface for the whole page. No pairing, no contrast of genre, no moment where type changes voice.
37. Tailwind's default spacing scale applied flatly. 4, 8, 16, 24, 32, 48, 64. No compressed rhythms. No dramatic jumps. No reason for any one section to feel different from any other.
38. A single column with no underlying grid. Elements stacked but not aligned to a shared structure. Every page is a todo list.

## What this list is for

The taxonomy is the negative space of the framework. Every rule in Artificial Human Design exists to force an LLM out of one of these defaults: a forbidden list at the prompt layer, a constraint in the brief, a lint rule in CI. You do not teach a model taste by asking nicely. You teach it by naming the thirty-eight things it should never do, and by checking its work against that list before a human ever sees it.

Slop is a distributional problem. The answer is distributional too: shift the model off its median, and keep it there.

## Sources

- 925 Studios, *AI Slop Web Design Guide*. https://www.925studios.co/blog/ai-slop-web-design-guide
- prg.sh, *Why Your AI Keeps Building the Same Purple Gradient Website*. https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website
- Tech Bytes, *Escape AI Slop Frontend Design Guide*. https://techbytes.app/posts/escape-ai-slop-frontend-design-guide/
- Anna Arteeva, *Style AI Prototypes: Master Tailwind and ShadCN, Avoid Slop*. https://maven.com/p/af8a3f/style-ai-prototypes-master-tailwind-shad-cn-avoid-slop
- Bootcamp, *Aesthetics in the AI Era*. https://medium.com/design-bootcamp/aesthetics-in-the-ai-era-visual-web-design-trends-for-2026-5a0f75a10e98
- jampa.dev, *Should I Get a Designer? An LLM Benchmark*. https://www.jampa.dev/p/should-i-get-a-designer-an-llm-benchmark
- Simon Willison, *Leaked System Prompts from Vercel v0*. https://simonwillison.net/2024/Nov/25/leaked-system-prompts-from-vercel-v0/
- x1xhlol, *System Prompts and Models of AI Tools*. https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools
- Anna Arteeva, *Choosing Your AI Prototyping Stack*. https://annaarteeva.medium.com/choosing-your-ai-prototyping-stack-lovable-v0-bolt-replit-cursor-magic-patterns-compared-9a5194f163e9
- Banani, *Gemini 3.1 for Web and UI Design*. https://www.banani.co/blog/gemini-3.1-for-web-and-ui-design
- UX Planet, *Gemini 3 for UI Design*. https://uxplanet.org/gemini-3-for-ui-design-f3fb44a295a6
- designmd.app, *What is DESIGN.md*. https://designmd.app/en/what-is-design-md
- Hardik Pandya, *Expose Your Design System to LLMs*. https://hvpandya.com/llm-design-systems
- Nielsen Norman Group, *Neobrutalism: Definition and Best Practices*. https://www.nngroup.com/articles/neobrutalism/
- Bejamas, *Neubrutalism — UI Design Trend*. https://bejamas.com/blog/neubrutalism-web-design-trend
- Spec.fm, *Typographic Scales*. https://spec.fm/specifics/type-scale
- Prototypr, *Defining a Modular Type Scale for Web UI*. https://blog.prototypr.io/defining-a-modular-type-scale-for-web-ui-51acd5df31aa
- Evil Martians, *OKLCH in CSS: Why We Moved from RGB and HSL*. https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl
- LogRocket, *OKLCH in CSS: Consistent, Accessible Color Palettes*. https://blog.logrocket.com/oklch-css-consistent-accessible-color-palettes
- AREA 17, *Pentagram case study*. https://area17.com/work/pentagram-website
- pbakaus, *impeccable critique skill*. https://skills.sh/pbakaus/impeccable/critique
