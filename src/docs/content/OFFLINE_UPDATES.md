Each igni release ships as one signed file, `igni-bundle-<version>.tar`. You carry it into your network, check it with a public key you already hold, and import it into your own container registry when it suits you. Nothing in this process contacts Ignite Ember or the internet. This page summarises how; the full procedure, including how a bundle is made, is `docs/OFFLINE_UPDATES.md` in the server repository.

## Where images and bundles come from

igni's release images are published to GitHub Container Registry, at `ghcr.io/ignite-ember/<name>` under the same names the bundle uses. A release is an unprefixed tag such as `0.6.0`; tags beginning `dev-` or `stage-` are pre-release builds and never go into a bundle. Each bundle is built from those release images, and Ignite Ember hands it to you. An air-gapped install never contacts the registry: everything it needs is in the bundle.

## What is in a bundle

```
igni-bundle-0.6.0/
  MANIFEST            version, commit, and the sha256 of every other file
  MANIFEST.minisig    minisign signature over MANIFEST; the version is in its signed comment
  igni-import         the import tool, covered by the MANIFEST like everything else
  images.tsv          name, tag and digest of each image
  images/<name>/image/   the image, in skopeo's dir layout, byte for byte as signed
  images/<name>/sig/     its cosign signature
  images/<name>/att/     its cosign SBOM attestation
  sboms/<name>.cdx.json  a CycloneDX SBOM per image, plus one for the portal's npm packages
  charts/igni-<chart version>.tgz
```

The images are `igni-api`, `igni-portal`, `igni-artifacts`, `igni-artifacts-embedder` and `igni-codeindex`, each tagged with its own version. The CodeIndex image carries what its extension needs on people's machines, including Neo4j, a Java runtime and the embedding model.

**What a bundle does not carry:**

- **Fleet.** Its gateway, node agent and guest image are not in the bundle. See [Fleet](/docs/fleet).
- **The desktop app and the CLI.** See [Installing igni](/docs/installing-igni).
- **Model weights.** Your inference nodes are yours to run. See [Models and the Factory](/docs/models-and-the-factory).
- **The licence file.** It comes from Ignite Ember separately. See [Licensing and evaluations](/docs/licensing-and-evaluations).

## The two keys

Two keys sign a release. You need the public half of each.

| Key | Signs | Checked by |
|---|---|---|
| minisign release key, `igni-release.pub` | The bundle's `MANIFEST`, so every file in it | `igni-import`, or `minisign` by hand |
| cosign release key, `igni-cosign.pub` | Each image, and its SBOM attestation | `cosign verify` against your registry, or an admission controller |

Get both public keys from Ignite Ember once, through a channel other than the bundle — with the contract, say, or read aloud and compared by fingerprint. Never trust a key that arrives inside the bundle it is meant to check.

## Verify and import

The import host needs `tar`, `minisign` and `skopeo`. `cosign` is optional.

```bash
# Verify only: the signature and every hash. Nothing is pushed.
./igni-import --bundle igni-bundle-0.6.0.tar --public-key igni-release.pub \
              --expect-version 0.6.0 --verify-only --keep ./igni-0.6.0

# Import into your registry. Log in first: skopeo login registry.example.internal
./igni-import --bundle igni-bundle-0.6.0.tar --public-key igni-release.pub \
              --registry registry.example.internal/igni --expect-version 0.6.0 \
              --cosign-key igni-cosign.pub --keep ./igni-0.6.0
```

| Flag | What it does |
|---|---|
| `--bundle FILE` | The bundle. Required. |
| `--public-key FILE` | The minisign public key. Required. |
| `--registry URL` | Where to push. Required unless `--verify-only`. |
| `--expect-version V` | Refuse a bundle of any other version. |
| `--verify-only` | Check everything, push nothing. |
| `--keep DIR` | Keep the unpacked bundle (the chart and SBOMs) here. The directory must not exist yet. |
| `--cosign-key FILE` | After pushing, check each image's signature and SBOM attestation in your registry. |
| `--authfile FILE` | A registry credentials file other than skopeo's default. |
| `--dest-tls-verify false` | For a plain-HTTP registry. |

`igni-import` refuses if:

- the archive holds an absolute path, a `..`, a link or a device file;
- the `MANIFEST` signature does not verify with the key you gave;
- the signed version differs from the `MANIFEST`'s, or from `--expect-version`;
- any file is missing, altered, or present but not listed;
- your registry stores an image under a digest other than the signed one;
- with `--cosign-key`, an image's signature or attestation does not verify.

A refusal prints `igni-import: REFUSED: <reason>` and exits non-zero. Images are pushed one at a time, so if a later image is refused, the earlier ones are already in your registry. Nothing that failed is pushed.

On success it prints `Verified igni <version>`, then each image as `registry/name:tag@sha256:…`.

**Use the `igni-import` you already trust.** The first time, run the copy from the bundle only after checking the bundle by hand, below. After that, each verified bundle carries the next version of the tool.

## Install from the bundle

`igni-import` imports images only. It does not install anything. Install the chart from the kept directory and point it at your registry:

```bash
helm upgrade --install igni ./igni-0.6.0/igni-bundle-0.6.0/charts/igni-0.1.0.tgz \
  --namespace igni \
  --set image.repository=registry.example.internal/igni/igni-api \
  --set portalImage.repository=registry.example.internal/igni/igni-portal \
  --set image.tag=0.6.0 --set portalImage.tag=0.6.0 \
  --reuse-values
```

The CodeIndex and Artifacts images are deployed from your own manifests; igni's chart does not deploy them.

Before upgrading, take a backup. A `helm rollback` moves the pods back but not the database schema. See [Upgrading, and what a rollback does not undo](/docs/self-hosting-the-server).

## Verify by hand

For a security team that would rather not run the script:

```bash
tar -xf igni-bundle-0.6.0.tar && cd igni-bundle-0.6.0
minisign -V -p igni-release.pub -m MANIFEST     # prints the signed version
grep -v '^#' MANIFEST | sha256sum -c -          # every file
find . -type f ! -name 'MANIFEST*' | sed 's#^\./##' | sort \
  | diff - <(grep -v '^#' MANIFEST | cut -c67- | sort)   # nothing unlisted
```

## Verify in your registry

Images keep their digests through the import, so their signatures stay valid in your registry. igni's images are signed with a key pair and not recorded in the public Rekor log, so tell cosign there is no log entry to check:

```bash
cosign verify --key igni-cosign.pub --insecure-ignore-tlog=true \
  registry.example.internal/igni/igni-api@sha256:…
cosign verify-attestation --key igni-cosign.pub --insecure-ignore-tlog=true \
  --type cyclonedx registry.example.internal/igni/igni-api@sha256:…
```

The same key works in an admission controller, such as Sigstore policy-controller or Kyverno, to refuse unsigned igni images.

## What is not finished

- **The release keys have not been published yet.** Ask Ignite Ember for the fingerprints before your first import.
- **There is no download site for bundles yet.** A bundle is handed over by Ignite Ember.
- **The desktop app updates outside the bundle.** It can be pointed at a release mirror you host (`update_endpoint`), but the bundle does not carry the desktop builds or their update manifest, and only the macOS build is in that manifest today. On an air-gapped machine, the simplest course is to turn update checks off and install new versions by hand. See [Installing igni](/docs/installing-igni).

## Where to go next

- **[Self-hosting the igni server](/docs/self-hosting-the-server)** — the chart values the install command above sets.
- **[Licensing and evaluations](/docs/licensing-and-evaluations)** — the licence file, which the bundle does not carry.
