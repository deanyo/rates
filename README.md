# Rates

Rates is a Betaflight-first browser tool for viewing, tweaking, and sharing FPV rate setups.

It is built as a simple static site for GitHub Pages, with an optional Cloudflare Worker for shortlinks.

Live URLs:

- app: `https://rates.fpvtools.co.uk`
- shortlinks: `https://r.fpvtools.co.uk`

## What It Does

- supports `Actual` and `Betaflight` rate models
- shows a live rate curve preview
- shows a throttle curve preview
- supports roll / pitch linking
- stores pilot tag, model name, setup name, and Betaflight version in shared state
- shares setups by readable URL
- creates branded shortlinks through Cloudflare Workers KV
- imports pasted Betaflight CLI
- exports a Betaflight CLI block

## Scope

This project is intentionally Betaflight-oriented.

Current support:

- `Actual`
- `Betaflight`
- per-axis roll, pitch, yaw editing
- throttle hover, mid, expo, and throttle limit
- share view
- custom shortlink aliases

Not in scope yet:

- simulator-specific formats
- every historical Betaflight edge case
- claiming exact parity with Betaflight Configurator graph math

## Share Format

Normal share URLs use readable query params.

Example fields:

- `pilot`
- `model`
- `name`
- `bf`
- `type`
- `link`
- `thrHover`
- `thrMid`
- `thrEx`
- `thrLimitType`
- `thrLimit`
- `rollRc`, `rollSr`, `rollEx`
- `pitchRc`, `pitchSr`, `pitchEx`
- `yawRc`, `yawSr`, `yawEx`

Shortlinks store a compact internal state payload in KV and redirect back to the main app in share view.

Older compact `s=` links still load for compatibility.

## CLI Notes

The tool imports and exports common Betaflight CLI fields including:

- `rates_type`
- `roll_rc_rate`, `roll_srate`, `roll_expo`
- `pitch_rc_rate`, `pitch_srate`, `pitch_expo`
- `yaw_rc_rate`, `yaw_srate`, `yaw_expo`
- `thr_hover`
- `thr_mid`
- `thr_expo`
- `throttle_limit_type`
- `throttle_limit_percent`

Rate fields are treated as integers in the UI to better match what Betaflight expects. Expo remains decimal in the editor and percent-based in CLI export.

## Run Locally

Serve the root directory with any static server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Shortlink Worker

The Worker lives in `worker/` and uses one KV namespace bound as `SHORTLINKS`.

Current worker routes:

- `POST /api/shorten`
- `GET /:id`
- `GET /health`

Worker setup:

1. `cd worker`
2. `wrangler login`
3. `wrangler kv namespace create SHORTLINKS` or another title such as `SHORTLINKS_CLEAN`
4. copy the returned namespace ID into `worker/wrangler.toml` under the `SHORTLINKS` binding
5. `wrangler deploy`

Production worker config currently expects:

- `APP_BASE_URL = "https://rates.fpvtools.co.uk/"`
- `PUBLIC_BASE_URL = "https://r.fpvtools.co.uk"`

## References

- Oscar Liang rates guide: https://oscarliang.com/rates/
- Oscar Liang throttle mid / expo guide: https://oscarliang.com/throttle-mid-expo/
- Oscar Liang throttle scale guide: https://oscarliang.com/throttle-scale/
- Betaflight profiles and rate profiles: https://www.betaflight.com/docs/development/Profiles
- Betaflight CLI docs: https://www.betaflight.com/docs/development/Cli

## Notes

- the graph and throttle preview are meant to be useful and close, but should still be sanity-checked against Betaflight Configurator when exact parity matters
- readable share URLs are the public default; compact state is mainly for shortlink storage and legacy compatibility
- rotating or replacing the KV namespace will invalidate existing shortlinks, but not readable share URLs
