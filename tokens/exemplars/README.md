# Token exemplars

Every style token under `tokens/` points at exemplars here. Each file is a reference image (or, more commonly, a `reference.md` containing a verified public-domain URL plus license metadata) that a design agent can load as a few-shot reference when following the token's prompt.

## Sourcing policy

- **Public domain or Creative Commons only.** No studio-website scrapes, no Behance, no Pinterest. Every exemplar has a verifiable license trail.
- **Prefer museum open-access programs.** Rijksmuseum (CC0), Library of Congress (public domain), Smithsonian Open Access (CC0), Wikimedia Commons (public domain or CC-BY), MoMA Open Access (CC0 for eligible works), New York Public Library Digital Collections (public domain).
- **Attribution recorded per-file.** Each exemplar directory contains a `reference.md` with the source URL, the institution, the original date, the license identifier, and (when available) the author and the record id. CC-BY exemplars carry the attribution string verbatim.
- **No binary files committed by default.** Exemplars are referenced by URL in `reference.md`. The token's `provenance.exemplars[].path` points at the `reference.md`, not at a JPG. This keeps the repo small, respects source site terms, and ensures the metadata is version-controlled alongside the image reference.
- **Binary files allowed when the source is unambiguous CC0** (primarily Rijksmuseum, Smithsonian, MoMA CC0). In that case the `.jpg` lives in the exemplar directory alongside the `reference.md`.

## Layout

```
tokens/exemplars/
  <token-id>/
    reference.md               # canonical reference, always present
    <short-name>.jpg           # optional, CC0 sources only
    <another-short-name>.jpg
```

## Verifying a new exemplar

1. Confirm the image is on one of the archives above, not copied into it from a third-party site.
2. Note the specific license (CC0, public-domain, CC-BY-4.0, etc.).
3. Record source URL, author, date, and institution in `reference.md`.
4. If committing a binary, confirm the source allows redistribution. CC0 and pre-1929 public-domain always do; CC-BY-SA requires a share-alike downstream license which is incompatible with some token licenses — avoid.
5. Update the token YAML's `provenance.exemplars` to point at the `reference.md` (or the image, if committed).

## Token coverage

Status as of the most recent commit.

| Token | Exemplar directory | Status |
|---|---|---|
| `swiss-editorial` | `swiss-editorial/` | curated |
| `manual-sf` | `manual-sf/` | curated |
| `neubrutalist-gumroad` | `neubrutalist-gumroad/` | curated |
| `post-digital-green` | `post-digital-green/` | curated |
| `memphis-clash` | `memphis-clash/` | curated |
| `heisei-retro` | `heisei-retro/` | curated |
| `monochrome-editorial` | `monochrome-editorial/` | curated |
| `bauhaus-revival` | `bauhaus-revival/` | curated |
| `editorial-illustration` | `editorial-illustration/` | curated |
| `ad-creative-collision` | `ad-creative-collision/` | curated |
