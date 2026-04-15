# Rates

Rates is a static browser tool for exploring and sharing FPV rate setups.

It is intentionally Betaflight-first rather than simulator-first.

The current version focuses on a practical GitHub Pages workflow:

- set up `Actual` or `Betaflight` rates in the browser
- add a pilot tag so shared links feel like named setups
- add a setup name and Betaflight version tag to shared state
- include throttle mid and throttle expo in shared state and CLI export
- inspect the curve graph live
- share the exact setup via URL
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
- setup name and `bf` version tag
- throttle mid and throttle expo fields
- CLI export
- CLI import

## Scope And Assumptions

- the tool is designed around Betaflight terminology and workflow
- `Actual` and `Betaflight` are the supported rate models for now
- throttle settings are handled as separate Betaflight-style decimal values
- shared URLs are meant to preserve Betaflight-oriented setup state, not simulate every possible FPV app format

## References

- Oscar Liang rates guide: https://oscarliang.com/rates/
- Oscar Liang throttle mid/expo guide: https://oscarliang.com/throttle-mid-expo/
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

## Next Good Steps

- validate curve math against Betaflight's official rate calculator
- add `Quick` rates
- support more pasted Betaflight config variants
- add per-profile naming
- add a compact mobile layout pass
