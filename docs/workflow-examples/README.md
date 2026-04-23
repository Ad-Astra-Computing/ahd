# AHD workflow examples

Consumer templates showing how to wire AHD into a downstream
project's GitHub Actions. These files live under `docs/` rather
than `.github/workflows/` so GitHub doesn't try to run them
against the AHD repo itself.

- `ahd-lint.example.yml` — minimal `ahd lint` on every push; blocks
  the build on error-severity rules.
- `ahd-nix.example.yml` — the same check routed through the AHD
  flake's `devShell` for reproducible tooling.
- `ahd-deploy.example.yml` — source lint against the deployed
  output before publishing.
- `ahd-deploy-with-vision.example.yml` — adds the vision critic
  step for rendered-pixel tells. Needs a browser in the runner
  image and a vision-critic spec (`--critic claude-code` or
  `--critic anthropic`).
- `ahd-eval.example.yml` — scheduled empirical eval across a
  configured roster of models. Most projects will not need this;
  it is mainly useful for framework contributors.

Copy any of these into `.github/workflows/` in your own
repository and adapt the step list, triggers, and secrets to
your environment.
