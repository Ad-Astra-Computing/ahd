{
  description = "AHD — Artificial Human Design: a brief compiler, linter and style-token library that forces LLMs out of design slop.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        nodejs = pkgs.nodejs_22;

        ahd = pkgs.buildNpmPackage {
          pname = "ahd";
          version = "0.1.0";
          src = ./.;
          inherit nodejs;

          npmDepsHash = "sha256-qaR7QF73nXsDzeAl0LH2Rge7OGXXeUre4USzNUF+nb8=";

          dontNpmBuild = true;

          installPhase = ''
            runHook preInstall
            mkdir -p $out/lib/node_modules/ahd
            cp -r bin src tokens docs package.json $out/lib/node_modules/ahd/
            cp -r node_modules $out/lib/node_modules/ahd/node_modules
            mkdir -p $out/bin
            makeWrapper ${nodejs}/bin/node $out/bin/ahd \
              --add-flags "$out/lib/node_modules/ahd/bin/ahd.js"
            runHook postInstall
          '';

          nativeBuildInputs = [ pkgs.makeWrapper ];

          meta = with pkgs.lib; {
            description = "Artificial Human Design — force LLMs out of design slop";
            homepage = "https://github.com/Ad-Astra-Computing/ahd";
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
            pkgs.nodePackages.typescript
            pkgs.prefetch-npm-deps
          ];
          shellHook = ''
            echo "ahd dev shell · node $(node --version) · npm $(npm --version)"
            echo "tip: npm install && npm test"
            echo "tip: after editing package-lock.json, regenerate the flake hash with:"
            echo "     prefetch-npm-deps package-lock.json"
          '';
        };
      });
}
