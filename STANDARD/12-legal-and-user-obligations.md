# Legal and user obligations

A product that registers users takes on duties to them and to the law.
Build the mechanism for each from day one; the legal trigger decides when
it becomes mandatory. This file is the floor Ad Astra products build to, it
is not legal advice: name the jurisdictions you operate in and get counsel
before launch.

## Notifying users when the privacy policy or terms change

When you materially change a privacy policy or the terms, existing
registered users have to be told before the change takes effect. Silence is
treated as deceptive, and applying a new policy to data collected under the
old one without notice is actionable.

- Notify by both email to the registered address and an in-app or on-site
  banner. The email is the individual record; the banner catches the people
  who do not read email.
- Give 30 days before the effective date, 14 at the very least.
- A material change is one that changes the deal for the user: new data
  collected, a new purpose, a new third party or subprocessor, new sharing
  or selling, a changed legal basis, a new transfer region, longer
  retention, reduced rights, or new arbitration or liability terms. A minor
  change, such as clarified wording, a typo, a section reorder or your own
  contact address, needs only a "last updated" date and a version history.
- Where the processing rests on consent, notice alone is not enough. A new
  purpose, a new third party, new tracking or marketing, or special-category
  or children's data needs a fresh affirmative opt-in. Not a pre-ticked box,
  not "continued use means acceptance". You cannot swap consent for another
  basis after the fact.

The notice states, in plain language: what changed, the effective date, a
link to the new policy and to the prior version or a redline, and the user's
options, which are to object, withdraw consent, export their data, or close
the account before the change takes effect.

## The notification email

A policy-change notice is a transactional service message, not marketing.

- It carries no unsubscribe link. A user may not opt out of a legally
  required notice, and an unsubscribe link weakens the transactional
  classification. Never blend marketing into it, which would flip it to
  commercial and pull in the full CAN-SPAM rules.
- Accurate From, Reply-To and routing headers, and a subject that is not
  deceptive.
- Send it from `privacy@<product-domain>`, the domain the user registered
  with, and set a monitored Reply-To so an objection reaches a person.
  Never `noreply@`. A corporate domain the user never signed up with reads
  as phishing and lands in spam.
- Deliverability is a compliance control, not a nicety. The sending domain
  has SPF, DKIM and an aligned DMARC policy. A notice in the spam folder is
  notice not given, and a regulator treats it as inadequate.
- Keep proof: the recipient list, the message and the policy version it
  carried, the timestamp, and the delivery and bounce logs, retained with
  the policy version they match.

## What every product project has from day one

Build the mechanism for each from the start. The trigger says when it is
legally mandatory rather than strongly recommended.

- A published privacy policy. Mandatory once you collect any personal data.
- Terms of service. Recommended, and mandatory in practice for a
  user-facing product.
- The change-notification process above. Mandatory once you change either
  document.
- A lawful basis for processing and a record of processing activities.
  Mandatory for EU or UK data past the Article 30 thresholds, and it forces
  you to know your own data flows.
- A breach-notification runbook, written before you need it. Mandatory: 72
  hours to the authority under GDPR, plus US state consumer-notice laws that
  vary by state.
- A data retention and deletion policy that minimizes what you keep.
  Mandatory under the right to erasure and storage limitation.
- Account deletion and data export, self-service where you can. Mandatory as
  a mechanism, for erasure and portability.
- Cookie and tracking consent, a prior opt-in for non-essential tags.
  Mandatory where you use them on EU or UK users; essential cookies are
  exempt.
- Marketing-email consent and a one-click unsubscribe, kept separate from
  the transactional notice above. Mandatory where you send commercial email.
- A data processing agreement with every processor, and a published
  subprocessor list. Mandatory for any vendor that touches personal data,
  and the list is what makes the change notice above possible.
- Age gating for children's data. Mandatory where the service reaches
  children: COPPA under 13 in the US, and the GDPR-K age by member state.
- A security disclosure path: a `security.txt` per RFC 9116 and a monitored
  `security@`. Recommended, and trending to expected for any
  internet-facing service.
- A named privacy contact, and a data protection officer where the scale
  requires one. Accessibility is its own bar in
  `STANDARD/06-ui-ux.md`.

Jurisdiction and scale decide the trigger. The record of processing and the
data protection officer scale with EU headcount and risk; cookie consent and
the children's rules bite hardest for EU and UK users; the US breach laws
are fifty separate timelines. Build every mechanism from day one and pin the
regions you operate in before launch.

## Sources

- FTC CAN-SPAM compliance guide: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- GDPR Article 33, breach notification: https://gdpr-info.eu/art-33-gdpr/
- GDPR Article 6, lawful basis: https://gdpr-info.eu/art-6-gdpr/
- GDPR consent requirements: https://gdpr.eu/gdpr-consent-requirements/
- CCPA privacy notice requirements: https://www.onetrust.com/blog/ccpa-privacy-policy-and-notice-requirements/
- RFC 9116, security.txt: https://www.rfc-editor.org/info/rfc9116/
