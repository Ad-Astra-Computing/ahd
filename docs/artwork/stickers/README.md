# Stickers

Conference-distribution stickers for AHD. Two directions, both 3" × 3" die-cut matte vinyl, pure black on natural cream.

## Files

| File | Purpose |
| --- | --- |
| `02-rule-final.svg` | Editable source for *The Rule*. Live `<text>` elements, font references intact. |
| `02-rule-print.svg` | Production. Text outlined to paths. No font dependency. |
| `02-rule-print.pdf` | Production. Upload to printer. Vector, 3" page. |
| `02-rule-print.png` | Preview only. 900 × 900 px (= 3" at 300 DPI). |
| `03-manifest-final.svg` | Editable source for *The Manifest*. |
| `03-manifest-print.svg` | Production. Text outlined. |
| `03-manifest-print.pdf` | Production. Upload to printer. |
| `03-manifest-print.png` | Preview only. |

QR codes encode `https://ahd.adastra.computer` and are scanned-verified.

## Regenerating from sources

If you edit either `-final.svg`, regenerate the `-print` outputs with Inkscape under nix-shell so fonts resolve correctly:

```sh
nix-shell -E 'with import <nixpkgs> {}; let
  fontsConf = makeFontsConf { fontDirectories = [ inter jetbrains-mono ]; };
in mkShell {
  buildInputs = [ inkscape fontconfig ];
  shellHook = "export FONTCONFIG_FILE=" + fontsConf;
}' --run '
for stem in 02-rule-final 03-manifest-final; do
  out="${stem%-final}-print"
  inkscape "${stem}.svg" --export-text-to-path --export-plain-svg --export-type=svg --export-filename="${out}.svg"
  inkscape "${out}.svg" --export-type=pdf --export-filename="${out}.pdf"
  inkscape "${out}.svg" --export-type=png --export-dpi=300 --export-filename="${out}.png"
done
'
```

## Font note

The editable sources reference Inter (SIL OFL) and JetBrains Mono (Apache 2.0). Both are free for commercial print. The live AHD site uses Neue Haas Grotesk (Linotype, paid); if you have a license, swap `font-family` in the `-final.svg` files before regenerating.
