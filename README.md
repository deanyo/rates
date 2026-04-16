# Rates

Rates is a static browser tool for exploring and sharing FPV rate setups.

It is intentionally Betaflight-first rather than simulator-first.

The current version focuses on a practical GitHub Pages workflow:

- set up `Actual` or `Betaflight` rates in the browser
- add a pilot tag so shared links feel like named setups
- add a model name so shared links carry the craft as well as the pilot
- add a setup name and Betaflight version tag to shared state
- include hover point, throttle mid, throttle expo, and throttle limit in shared state and CLI export
- inspect the curve graph live
- inspect a throttle curve preview for modern Betaflight throttle shaping
- share the exact setup via URL, with a read-only share view and an edit link back to the full tool
- copy a CLI block for Betaflight
- import from pasted Betaflight CLI lines

## Current Scope

- `Actual` rates
- `Betaflight` rates
- per-axis roll, pitch, yaw control
- optional roll/pitch linking
- live graph
- shareable URL state
- pilot tag in shared setups
- model name in shared setups
- setup name and `bf` version tag
- hover point, throttle mid, throttle expo, and throttle limit fields
- CLI export
- CLI import

## Scope And Assumptions

- the tool is designed around Betaflight terminology and workflow
- `Actual` and `Betaflight` are the supported rate models for now
- throttle settings are handled as Betaflight-style fields, including `throttle_limit_type` and `throttle_limit_percent`
- the default Betaflight version uses the current calendar-based scheme, e.g. `2025.12.1`
- shared URLs are meant to preserve Betaflight-oriented setup state, not simulate every possible FPV app format

## References

- Oscar Liang rates guide: https://oscarliang.com/rates/
- Oscar Liang throttle mid/expo guide: https://oscarliang.com/throttle-mid-expo/
- Oscar Liang throttle scale guide: https://oscarliang.com/throttle-scale/
- Betaflight Profiles and Rate Profiles: https://www.betaflight.com/docs/development/Profiles
- Betaflight CLI docs: https://www.betaflight.com/docs/development/Cli

## Important Note

This is an MVP. The UI, share flow, and CLI export are solid enough to build on, but the rate-curve math should still be validated against Betaflight's own calculator and configurator behavior before treating it as an exact reference implementation.

That is especially important if this grows into:

- import from CLI or `diff` / `dump` variants
- support for `Quick`, `KISS`, and `Raceflight`
- compatibility claims across Betaflight versions

## Run Locally

Serve the directory with any static file server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Shortlinks

The repo includes a Cloudflare Worker under `worker/` for real short share links backed by Workers KV.

High-level setup:

1. `cd worker`
2. `wrangler login`
3. `wrangler kv namespace create SHORTLINKS`
4. copy the returned namespace ID into `worker/wrangler.toml`
5. `wrangler deploy`
6. copy the deployed Worker base URL into the `rates-shortlink-api` meta tag in `index.html`

Current public app domain:

- `https://rates.fpvtools.co.uk`

The Worker exposes:

- `POST /api/shorten` to create a short link from the compact `s=` state payload
- `GET /r/:id` to redirect to the full `rates` share view

## Next Good Steps

- validate curve math against Betaflight's official rate calculator
- add `Quick` rates
- support more pasted Betaflight config variants
- add per-profile naming
- add a compact mobile layout pass
