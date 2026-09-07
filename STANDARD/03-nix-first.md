# Nix-first

Ad Astra is nix-first. Dependencies are declared, not installed by hand.
A fresh checkout plus `nix develop` yields a working environment on any
machine that has Nix.

## Rules

- Every repo has a `flake.nix` at its root. Nothing the project needs to
  build, test or run is installed through brew, apt, `pip install`,
  global `npm -g` or `nix-env`. If a tool is needed, it is a flake input.
- All work happens inside the devShell. `devShells.default` is the one
  source of truth for the toolchain. Nothing is installed locally or
  globally.
- Activate automatically with direnv. Commit a `.envrc` that contains
  `use flake`, run `direnv allow` once, and the shell activates on entry.
  Use nix-direnv so re-entry is fast and the shell is pinned against
  garbage collection.
- Pin nixpkgs and do not use channels. The `nixpkgs` input names a branch
  and the exact revision is recorded in `flake.lock`. Reproducibility
  comes from the lockfile, not from ambient channel state.
- Commit `flake.lock`. Update it deliberately with `nix flake update` or
  a single-input update, in its own commit, never mixed with feature
  work. Review the lock diff like any other dependency change.
- One formatter for the whole tree, wired through the flake with
  treefmt-nix and exposed as `formatter`, so `nix fmt` formats
  everything and CI can fail on unformatted code.
- Expose the project's commands as flake apps, so each launches with
  `nix run .#<name>` from the repo root rather than only as a script
  inside the devShell. The skeleton ships `eval`, `eval-report` and
  `paraphrase` as examples.
- `nix flake check` is the CI gate. It builds the shells and packages,
  runs the checks and verifies formatting. Green is the merge bar.
- Use a shared binary cache such as Cachix or a self-hosted attic so CI
  pushes results and developers pull prebuilt artifacts.

A missing toolchain is never a reason to skip local verification. The
fix is one `nix develop` away. Run the repo's own gates from inside the
devShell, in CI too, so nothing ships that only worked because a tool
happened to be on the host.

## The flakes caveat, stated openly

nix.dev still labels flakes an experimental feature and notes their
functionality can be achieved without them. Ad Astra adopts flakes
anyway, because the input, output and lockfile model is the reproducible
result we want and flakes are the de facto community standard. Enable
`experimental-features = nix-command flakes` in `nix.conf`. This is a
deliberate stance, recorded so the experimental label surprises nobody.

## Starting point

`flake.nix` at the repo root ships a devShell, a treefmt `nix fmt` and a
formatting check surfaced through `nix flake check`. Add real build
outputs under `packages` and more `checks` as the project grows.

## Sources

- Flakes: https://nix.dev/concepts/flakes.html
- Declarative shells: https://nix.dev/tutorials/first-steps/declarative-shell
- treefmt-nix: https://github.com/numtide/treefmt-nix
- nix-direnv: https://github.com/nix-community/nix-direnv
- Binary cache setup: https://nix.dev/tutorials/nixos/binary-cache-setup.html
