# chs-constituents

This is a public Open Waters repository for original MIT-licensed code and tooling. It must work as a standalone clone and must not depend on Sailing Naturali instructions, repositories, credentials, or machine paths.

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

## Releases

- The npm identity remains `@sailingnaturali/chs-constituents`.
- A published GitHub release matching `package.json` triggers `.github/workflows/publish.yml`.
- npm trusted publishing must target `openwatersio/chs-constituents` and `publish.yml`. Do not add an npm token.
