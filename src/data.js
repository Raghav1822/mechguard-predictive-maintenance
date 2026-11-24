const SAMPLE_RATE = 1024;
const CAPTURES = 8;
const POINTS_PER_CAPTURE = 256;
const SHAFT_RPM = 1480;

export function makeSampleRows() {
  const rows = [];
  const shaftHz = SHAFT_RPM / 60;
  const bpfi = shaftHz * 4 * (1 + 0.3);
  const epoch = Date.UTC(2026, 9, 20, 8);

  for (let capture = 0; capture < CAPTURES; capture += 1) {
    const hours = capture * 96;
    const faultAmplitude = 0.2 + capture * 0.19;
    const baseAmplitude = 1.45 + capture * 0.42;
    const captureStart = epoch + hours * 3_600_000;

    for (let index = 0; index < POINTS_PER_CAPTURE; index += 1) {
      const time = index / SAMPLE_RATE;
      const phase = capture * 0.31;
      const noise = Math.sin(index * 17.73 + capture * 2.4) * 0.14
        + Math.sin(index * 5.21 + capture) * 0.07;
      const x = baseAmplitude * Math.sin(2 * Math.PI * shaftHz * time + phase)
        + faultAmplitude * Math.sin(2 * Math.PI * bpfi * time)
        + 0.2 * Math.sin(2 * Math.PI * 2 * shaftHz * time + 0.4)
        + noise;
      const y = baseAmplitude * 0.78 * Math.sin(2 * Math.PI * shaftHz * time + 1.2)
        + faultAmplitude * 0.62 * Math.sin(2 * Math.PI * bpfi * time + 0.6)
        + noise * 0.8;
      const thermalRise = 3.2 + capture * 0.85 + Math.sin(index / 31) * 0.4;
      const current = 8.4 + capture * 0.12 + Math.sin(index / 23) * 0.16;

      rows.push({
        timestamp: new Date(captureStart + (index / SAMPLE_RATE) * 1000).toISOString(),
        x: Number(x.toFixed(5)),
        y: Number(y.toFixed(5)),
        temperature: Number((42 + thermalRise).toFixed(2)),
        rpm: SHAFT_RPM + Math.round(Math.sin(index / 19) * 3),
        current: Number(current.toFixed(2)),
        captureId: `CAP-${String(capture + 1).padStart(2, "0")}`,
        operatingHours: hours
      });
    }
  }

  return rows;
}

export function sampleCsv() {
  const rows = makeSampleRows();
  const headers = ["timestamp", "vibration_x_mm_s", "vibration_y_mm_s", "temperature_c", "rpm", "current_a", "capture_id", "operating_hours"];
  const columns = ["timestamp", "x", "y", "temperature", "rpm", "current", "captureId", "operatingHours"];
  return [headers.join(","), ...rows.map((row) => columns.map((column) => row[column]).join(","))].join("\n");
}

export { SAMPLE_RATE };
