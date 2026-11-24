# MechGuard

**A browser-first predictive-maintenance workbench for rotating equipment.**

MechGuard turns vibration captures into a readable condition review: inspect a time waveform, calculate a Hann-windowed FFT, compare spectral energy with bearing defect frequencies, track health indicators, and project remaining useful life when the dataset contains enough operating history.

## Live demo

After the first successful GitHub Pages deployment, the app is available at:

**https://raghav1822.github.io/mechguard-predictive-maintenance/**

The GitHub Actions workflow builds, tests, and deploys each push to `main`.

## Features

- **Bearing diagnostics:** BPFO, BPFI, BSF, and FTF frequency markers calculated from shaft speed and documented 6205-series geometry.
- **Vibration lab:** time waveform and single-sided FFT spectrum with a Hann window; set the acquisition sample rate.
- **Asset condition:** vibration severity screening, temperature/current context, a composite health index, and a transparent rule-based action plan.
- **Trend-based RUL:** linear vibration RMS trend to an indicative action threshold. Requires at least three captures with operating-hour history; confidence is shown and the estimate is intentionally withheld when data is insufficient.
- **CSV import/export:** process sensor files locally in the browser and export a JSON condition report.
- **Built-in demo:** eight synthetic pump captures across 672 operating hours, with progressive inner-race fault energy. Download it from **Data & reports** to try the upload flow.
- **Privacy by design:** analysis runs client-side; no account, server, or telemetry is used.

## Run locally

Requirements: Node.js 20+.

```bash
npm ci
npm test
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```

## CSV format

Required headers:

```text
vibration_x_mm_s,vibration_y_mm_s
```

Accepted aliases include `vibration_x` / `vibration_y`, `x_mm_s` / `y_mm_s`, and `vib_x` / `vib_y`. Optional columns:

```text
timestamp,temperature_c,rpm,current_a,capture_id,operating_hours
```

Use one row per uniformly sampled vibration point. `capture_id` groups separate waveform captures; `operating_hours` should be consistent within a capture and increase between captures to support trend-based RUL. Set the actual sensor sample rate in the Vibration lab.

## Method and limitations

The FFT and bearing-frequency markers are signal-processing aids, not an automated fault classifier. The condition index uses explicit screening rules; RUL uses a linear extrapolation of capture-level RMS to 4.5 mm/s. ISO 20816 bands are indicative and depend on machine class, mounting, operating conditions, and applicable standard edition. Synthetic data is provided for interface testing only.

Do not use this prototype as the sole basis for safety decisions, component replacement, or declaring equipment fit for service. Validate sensors, units, limits, bearing geometry, and any diagnosis with qualified reliability engineering and machine-specific failure history.
