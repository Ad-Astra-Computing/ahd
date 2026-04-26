{
  description = "AHD — Artificial Human Design: a brief compiler, linter and style-token library that forces LLMs out of design slop.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        # allowUnfree is required on darwin because playwright-driver.browsers
        # bundles chromium under an unfree label in nixpkgs. Chromium itself
        # is free software; the marker is conservative on the packaging side.
        pkgs = import nixpkgs { inherit system; config.allowUnfree = true; };
        nodejs = pkgs.nodejs_22;

        ahd = pkgs.buildNpmPackage {
          pname = "ahd";
          version = "0.8.3";
          src = ./.;
          inherit nodejs;

          npmDepsHash = "sha256-jeUI21krXxwsdCg3MHaVvC29SMZ84WgYDkPNrSiy6M8=";

          # Run `tsc` to produce dist/; bin/*.js imports from dist/.
          npmBuildScript = "build";

          # The package's `prepare` script runs the same build pipeline
          # so consumers installing from git (no tarball) get the
          # generated dist/, schema/ and rules.manifest.json. That hook
          # fires during npm ci and breaks inside the Nix sandbox
          # because the freshly-installed node_modules/.bin/tsc shebang
          # `#!/usr/bin/env node` does not resolve here. Skipping
          # install-time scripts is safe because `npmBuildScript`
          # below runs the same `npm run build` content explicitly in
          # the build phase, where the path patches have applied.
          npmFlags = [ "--ignore-scripts" ];

          installPhase = ''
            runHook preInstall
            mkdir -p $out/lib/node_modules/ahd
            cp -r bin src dist tokens docs package.json $out/lib/node_modules/ahd/
            # workspace plugins live under packages/; node_modules contains
            # @adastracomputing/eslint-plugin-ahd → packages/eslint-plugin-ahd
            # symlinks that dangle without this copy.
            cp -r packages $out/lib/node_modules/ahd/packages
            cp -r node_modules $out/lib/node_modules/ahd/node_modules
            mkdir -p $out/bin
            makeWrapper ${nodejs}/bin/node $out/bin/ahd \
              --add-flags "$out/lib/node_modules/ahd/bin/ahd.js"
            makeWrapper ${nodejs}/bin/node $out/bin/ahd-mcp \
              --add-flags "$out/lib/node_modules/ahd/bin/ahd-mcp.js"
            runHook postInstall
          '';

          nativeBuildInputs = [ pkgs.makeWrapper ];

          meta = with pkgs.lib; {
            description = "Artificial Human Design — force LLMs out of design slop";
            homepage = "https://ahd.adastra.computer";
            license = {
              spdxId = "LicenseRef-FSL-1.1-Apache-2.0";
              fullName = "Functional Source License 1.1 with Apache 2.0 Future License";
              url = "https://fsl.software";
              free = false;
            };
            mainProgram = "ahd";
            platforms = platforms.unix;
          };
        };

        # Chromium on Linux uses pkgs.chromium directly. On darwin
        # pkgs.chromium is unsupported, so we fall back to playwright-driver's
        # bundled chromium build, which nixpkgs ships on darwin.
        isDarwin = pkgs.stdenv.isDarwin;
        chromiumPkg =
          if isDarwin
          then pkgs.playwright-driver.browsers
          else pkgs.chromium;
        # playwright-driver.browsers on darwin ships
        #   chromium-<rev>/chrome-mac-<arch>/Google Chrome for Testing.app/...
        # where <arch> is arm64 or x64. On linux pkgs.chromium exposes a
        # plain bin/chromium. We resolve the glob in the shellHook so the
        # arch-specific directory doesn't need to be hardcoded here.
        chromiumBinShell =
          if isDarwin
          then "${chromiumPkg}/chromium-*/chrome-mac-*/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
          else "${chromiumPkg}/bin/chromium";
      in {
        packages = {
          default = ahd;
          ahd = ahd;
        };

        apps.default = {
          type = "app";
          program = "${ahd}/bin/ahd";
        };

        devShells.default = pkgs.mkShell {
          buildInputs = [
            nodejs
            pkgs.typescript
            pkgs.prefetch-npm-deps
            chromiumPkg
          ];
          shellHook = ''
            # On darwin the playwright-driver chromium path contains a
            # version-dated directory; resolve it at shell entry.
            if [ -z "$AHD_CHROMIUM_PATH" ]; then
              # `find -L` follows symlinks — the nixpkgs playwright-driver
              # links chromium-<rev>/ into the browser out-path rather than
              # placing it inline, and the Chrome-for-Testing binary sits
              # inside an .app bundle (path contains spaces).
              export AHD_CHROMIUM_PATH="$(find -L "${chromiumPkg}" \
                \( -name 'Google Chrome for Testing' -o -name chromium \) \
                -type f 2>/dev/null | head -n1)"
            fi
            echo "ahd dev shell · node $(node --version) · npm $(npm --version)"
            if [ -n "$AHD_CHROMIUM_PATH" ]; then
              echo "chromium: $AHD_CHROMIUM_PATH"
            else
              echo "chromium: (not found — \`ahd critique\` will fail. export AHD_CHROMIUM_PATH manually)"
            fi
            echo "tip: npm install && npm run build && npm test"
            echo "tip: after editing package-lock.json, regenerate the flake hash with:"
            echo "     prefetch-npm-deps package-lock.json"
          '';
        };
      });
}
