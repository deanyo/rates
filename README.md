# Rates

Rates is a static browser tool for exploring and sharing FPV rate setups.

This first pass focuses on a practical GitHub Pages workflow:

- set up `Actual` or `Betaflight` rates in the browser
- inspect the curve graph live
- share the exact setup via URL
- copy a CLI block for Betaflight

## Current Scope

- `Actual` rates
- `Betaflight` rates
- per-axis roll, pitch, yaw control
- optional roll/pitch linking
- live graph
- shareable URL state
- CLI export

## Important Note

This is an MVP. The UI, share flow, and CLI export are solid enough to build on, but the rate-curve math should still be validated against Betaflight's own calculator and configurator behavior before treating it as an exact reference implementation.

That is especially important if this grows into:

- import from CLI or `diff rates`
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
- add import from pasted CLI commands
- add per-profile naming
- add a compact mobile layout pass
