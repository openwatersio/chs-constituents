# Contributing

Thanks for helping out. This repository is MIT-licensed original code that fits tidal-current
harmonic constituents from CHS IWLS predictions.

## The one rule that is not negotiable

**No CHS-derived data enters this repository, ever.** Not samples, not fitted models, not
generated bundles, not derived station values, not provider-minted station identifiers. The
[CHS licence agreement](https://tides.gc.ca/en/licence-agreement) does not permit redistributing
it, which is why this is a pipeline you run yourself rather than a dataset you download. See
[Why you have to run this yourself](README.md#why-you-have-to-run-this-yourself).

Practically, this means:

- Use obviously synthetic identifiers and values in tests. Real 24-hex IWLS station ids are
  refused by the boundary check.
- Keep generated output and caches out of commits. `.gitignore` already excludes `currents.json`
  and `.cache`.
- Run `npm run check:boundary` before you push. It scans tracked and packed files and fails on
  provider identifiers or anything shaped like a generated bundle. Do not weaken it to
  accommodate generated data.

## Setup

Node.js 20.10 or newer.

```sh
npm ci
```

## Validation

Run all four before opening a pull request:

```sh
npm run build
npm test
npm run check:boundary
npm pack --dry-run
```

## Station identity

Station identity — which gates exist, what they are called, their stable keys — is curated in
[`@openwaters/station-metadata`](https://github.com/openwatersio/station-metadata) and read from
there. Never fork a station list, gate list, or name table into this repository. If a gate is
missing or misnamed, fix it in that repository.

## Pull requests

- Work on a branch and open a pull request; do not push to `main`.
- CI must pass before merge.
- Keep the diff focused. A change to the fit or the validation tiers should say what it measured
  and against what.

## Releases

Maintainers only. Bump the version, merge, and publish a GitHub Release tagged `vX.Y.Z` matching
`package.json`. That triggers `.github/workflows/publish.yml`, which publishes to npm through
OIDC trusted publishing with provenance. Never add an npm token to the workflow.
