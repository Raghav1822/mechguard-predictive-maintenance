import test from "node:test";
import assert from "node:assert/strict";
import { calculateMetrics, spectrum } from "./analyzer.js";
import { makeSampleRows, sampleCsv, SAMPLE_RATE } from "./data.js";

test("FFT identifies the frequency of a clean sine wave", () => {
  const sampleRate = 1024;
  const samples = Array.from({ length: 256 }, (_, index) => Math.sin((2 * Math.PI * 64 * index) / sampleRate));
  const bins = spectrum(samples, sampleRate);
  const peak = bins.reduce((best, item) => item.amplitude > best.amplitude ? item : best, bins[0]);
  assert.equal(peak.frequency, 64);
  assert.ok(Math.abs(peak.amplitude - 1) < 0.02);
});

test("demo captures yield a rising trend, bearing signatures, and a bounded health score", () => {
  const metrics = calculateMetrics(makeSampleRows(), SAMPLE_RATE);
  assert.equal(metrics.captures.length, 8);
  assert.equal(metrics.history.length, 8);
  assert.ok(metrics.healthScore >= 0 && metrics.healthScore <= 100);
  assert.ok(metrics.vibrationRms > 2.3);
  assert.ok(metrics.peaks.find((peak) => peak.key === "bpfi").peak.amplitude > 0);
  assert.ok(metrics.trend.slope > 0);
  assert.ok(metrics.rul.value >= 0);
  assert.equal(metrics.rul.confidence, "Moderate");
});

test("sample download contains analysis-ready headers and capture history", () => {
  const csv = sampleCsv();
  assert.match(csv, /^timestamp,vibration_x_mm_s,vibration_y_mm_s,temperature_c,rpm,current_a,capture_id,operating_hours/m);
  assert.match(csv, /CAP-08,672$/m);
  assert.equal(csv.trim().split("\n").length, 2049);
});

test("single-capture input does not invent an RUL trend", () => {
  const rows = makeSampleRows().filter((row) => row.captureId === "CAP-08");
  const metrics = calculateMetrics(rows, SAMPLE_RATE);
  assert.equal(metrics.rul.value, null);
  assert.match(metrics.rul.basis, /at least 3 captures/);
});
