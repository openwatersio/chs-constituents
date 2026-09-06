# chs-constituents

This is a public Open Waters repository for original MIT-licensed code and tooling. It must work as a standalone clone and must not depend on private instructions, repositories, credentials, or machine paths.

## Commands

```sh
npm ci
npm run build
npm test
npm run check:boundary
```

## CHS boundary

- Never commit or publish CHS/IWLS samples, fitted harmonic models, generated bundles, derived station values, or provider-minted station identifiers.
- Resolve provider identifiers from IWLS at runtime. Use obviously synthetic identifiers in tests.
- Keep generated output and caches ignored. The npm package may contain only `LICENSE`, `README.md`, `package.json`, and compiled `dist/` code.
- Run the boundary check before every release. Do not weaken it to accommodate generated data.

## Station identity

- Station identity — which gates exist, what they are called, their stable keys — is curated in [`@openwaters/station-metadata`](https://github.com/openwatersio/station-metadata). Read it from there; never fork a station list, gate list, or name table into this repo.
- Which registry entries count as gates is `currentGates`' call, not this repo's. Hand-rolling that filter has broken this consumer before.
- Do not read `providerId`. The registry has dropped it, and station ids come live from the IWLS index.
- The registry carries identifiers and hand-written names, not CHS predictions or constituents, so depending on it does not cross the CHS boundary above.

## Contributions

- Work on a branch and open a pull request; do not push to `main`.
- CI must pass before merge.

## Releases

- The npm identity is `@openwaters/chs-constituents`. Never introduce an `@openwatersio/*` npm scope; the GitHub org is `openwatersio`, the npm scope is `@openwaters`.
- A published GitHub release matching `package.json` triggers `.github/workflows/publish.yml`.
- npm trusted publishing must target `openwatersio/chs-constituents` and `publish.yml`. Do not add an npm token.
- **First publish under the new name is a bootstrap.** npm cannot configure a trusted publisher for a package that does not exist yet, so the first `@openwaters/chs-constituents` version is published once from the CLI with an OTP, by a maintainer with create-and-publish rights on the `@openwaters` org. Configure the trusted publisher immediately after, then prove OIDC with a no-behavior patch release. Expect a short registry-propagation window where the new name still 404s.
- `@sailingnaturali/chs-constituents` is superseded. Deprecate it on npm once the new package is published and verified.
