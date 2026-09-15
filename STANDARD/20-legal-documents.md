# Legal documents

Terms, privacy, EULA, cookie and imprint pages are part of the product, and
they carry legal weight. This file governs how we draft and maintain them:
their structure, what triggers which document, how they bind and how they stay
accurate. It does not reproduce the law, which shifts; it points to the source
and to the reviewing lawyer. The obligations behind these documents, notifying
users of a change, breach notice, retention and deletion, live in
`12-legal-and-user-obligations.md`.

This is not legal advice. Agents and engineers draft; counsel reviews and
approves the binding text before it ships. This standard governs structure and
process, not the legal substance.

## Two rules first

- Accurate to reality. A legal document must describe what the product
  actually does. Ship it only after engineering confirms it matches the real
  data flows, trackers, defaults and vendors. A policy that misstates practice
  is independently actionable under the FTC Act and under GDPR transparency, so
  an inaccurate policy is worse than none.
- Original, never copied. Draft from our own facts. Another company's policy
  describes their practices, not ours. Its text is copyrighted.

## The documents, and the law each follows

Keep each short and point to the source. Do not inline the full field list,
which dates quickly; counsel confirms the current requirements at drafting.

- Privacy policy: the GDPR Article 13 and 14 disclosures for EU users, and a
  notice at collection plus the full policy for US state laws, with a
  do-not-sell-or-share path and the universal opt-out signal where they apply.
  Layered, so the summary carries purpose, basis and rights, not only a link.
  Source: GDPR Articles 12 to 14; EDPB transparency guidelines; the California
  privacy authority.
- Terms of service: the usual clause set, drafted in plain intelligible
  language. For EU consumers a choice-of-law clause cannot strip their home
  protections, liability for death or personal injury cannot be excluded, and
  an unfair non-negotiated term is struck. Source: Unfair Contract Terms
  Directive 93/13/EEC; Rome I Article 6.
- EULA: only for software that runs on the user's device. Draft it as a
  license, not a sale, ship a third-party-notices file for open-source
  components with a copyleft review before distribution, and include an
  export-control clause. On the app stores, meet Apple's minimum EULA terms or
  use its default, and link the privacy policy on both. Source: the component
  licenses; Apple and Google developer terms; the US export rules.
- Cookie policy and banner: for EU users, no non-essential cookie or tracker
  before granular affirmative consent, reject as easy as accept, no pre-ticked
  boxes, no dark patterns and withdrawal as easy as giving. Source: ePrivacy
  Directive Article 5(3); EDPB guidelines; the Planet49 ruling.
- Imprint: a legal-notice page for commercial sites targeting Germany and the
  member states with the same duty. Source: German DDG Section 5; E-Commerce
  Directive 2000/31/EC Article 5.

## Which document a product owes

Owe only what the product's shape and reach require. Do not force a small
US-only tool through EU platform duties it does not have.

- EU users: a GDPR privacy notice, cookie consent and plain-language terms.
- Paid to consumers: pre-contract disclosures, an order button that says it
  obliges payment, a 14-day withdrawal right (the digital-content waiver only
  when we capture prior express consent and acknowledgment of losing it), and
  auto-renewal compliance. Source: Consumer Rights Directive 2011/83/EU; the
  FTC and California auto-renewal rules; the EU withdrawal button.
- Hosts user content: plain-language terms with a moderation policy, a
  notice-and-action mechanism and contact points. The full online-platform
  duties apply only above micro and small size, under fifty staff and ten
  million euro turnover, and always to a designated very large platform.
  Source: Digital Services Act, Regulation (EU) 2022/2065.
- Uses AI: tell users they are dealing with an AI, mark generative output and
  label deep fakes, from 2 August 2026. Source: AI Act Article 50.
- A digital product or service: meet the European Accessibility Act from 28
  June 2025, the legal pages included, unless a microenterprise services
  exemption applies, under ten staff and two million euro. Source: Directive
  (EU) 2019/882.

## How they bind, and stay current

- Acceptance by clickwrap, never browsewrap. A distinct affirmative agreement
  next to a link to the current terms, shown before first use or purchase.
- Log every acceptance: the user, the document version and a content hash, the
  time and the method. That record is what lets us enforce.
- A material change needs advance notice, an effective date and a fresh
  prompt, never a silent edit. A consent-based purpose needs fresh consent.
- Every document carries an effective date, a version and a changelog, and is
  reviewed on any new data flow, vendor, feature or transfer.

## Governance

One canonical location per document, consistent footer links and no
contradiction between layers: the banner matches the cookie policy and the
summary matches the full policy. The pages themselves meet the accessibility
bar in `06-ui-ux.md`.

## Sources

- GDPR Articles 12 to 14: https://gdpr-info.eu/art-13-gdpr/
- Unfair Contract Terms Directive 93/13/EEC: https://eur-lex.europa.eu/eli/dir/1993/13/oj/eng
- Consumer Rights Directive 2011/83/EU: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02011L0083-20220528
- ePrivacy Directive 2002/58/EC: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32002L0058
- Digital Services Act, Regulation (EU) 2022/2065: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2065
- AI Act Article 50: https://artificialintelligenceact.eu/article/50/
- European Accessibility Act, Directive (EU) 2019/882: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019L0882
- Apple minimum EULA terms: https://www.apple.com/legal/internet-services/itunes/dev/minterms/
