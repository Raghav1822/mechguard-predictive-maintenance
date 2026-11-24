const BEARING = { balls: 8, ballToPitchRatio: 0.3, contactAngleDeg: 0 };

export function nextPowerOfTwo(value) {
  let result = 1;
  while (result < value) result *= 2;
  return result;
}

export function spectrum(samples, sampleRate) {
  const size = nextPowerOfTwo(samples.length);
  const real = new Float64Array(size);
  const imaginary = new Float64Array(size);
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const windowSum = samples.length / 2;

  for (let index = 0; index < samples.length; index += 1) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * index) / Math.max(1, samples.length - 1)));
    real[index] = (samples[index] - mean) * window;
  }

  for (let index = 1, reversed = 0; index < size; index += 1) {
    let bit = size >> 1;
    while (reversed & bit) {
      reversed ^= bit;
      bit >>= 1;
    }
    reversed ^= bit;
    if (index < reversed) {
      [real[index], real[reversed]] = [real[reversed], real[index]];
      [imaginary[index], imaginary[reversed]] = [imaginary[reversed], imaginary[index]];
    }
  }

  for (let length = 2; length <= size; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const stepReal = Math.cos(angle);
    const stepImaginary = Math.sin(angle);
    for (let start = 0; start < size; start += length) {
      let factorReal = 1;
      let factorImaginary = 0;
      for (let offset = 0; offset < length / 2; offset += 1) {
        const even = start + offset;
        const odd = even + length / 2;
        const oddReal = real[odd] * factorReal - imaginary[odd] * factorImaginary;
        const oddImaginary = real[odd] * factorImaginary + imaginary[odd] * factorReal;
        real[odd] = real[even] - oddReal;
        imaginary[odd] = imaginary[even] - oddImaginary;
        real[even] += oddReal;
        imaginary[even] += oddImaginary;
        [factorReal, factorImaginary] = [
          factorReal * stepReal - factorImaginary * stepImaginary,
          factorReal * stepImaginary + factorImaginary * stepReal
        ];
      }
    }
  }

  return Array.from({ length: size / 2 }, (_, index) => ({
    frequency: (index * sampleRate) / size,
    amplitude: (2 * Math.hypot(real[index], imaginary[index])) / windowSum
  }));
}

export function calculateMetrics(rows, sampleRate) {
  const captures = groupCaptures(rows);
  const active = captures.at(-1) || [];
  const xs = active.map((row) => row.x);
  const ys = active.map((row) => row.y);
  const rmsX = rms(xs);
  const rmsY = rms(ys);
  const vibrationRms = Math.sqrt((rmsX ** 2 + rmsY ** 2) / 2);
  const temperature = average(active, "temperature");
  const rpm = average(active, "rpm");
  const current = average(active, "current");
  const shaftHz = rpm / 60;
  const spectrumData = spectrum(xs, sampleRate);
  const bearingFrequencies = getBearingFrequencies(shaftHz);
  const peaks = bearingFrequencies.map((bearing) => ({
    ...bearing,
    peak: nearestPeak(spectrumData, bearing.frequency, Math.max(3, bearing.frequency * 0.035))
  }));
  const history = captures.map((capture) => ({
    label: capture[0].captureId || new Date(capture[0].timestamp || Date.now()).toLocaleDateString(),
    hours: capture[0].operatingHours,
    rms: Math.sqrt((rms(capture.map((row) => row.x)) ** 2 + rms(capture.map((row) => row.y)) ** 2) / 2),
    temperature: average(capture, "temperature"),
    current: average(capture, "current")
  }));
  const trend = linearTrend(history);
  const risk = vibrationRms >= 4.5 ? "critical" : vibrationRms >= 2.3 || temperature >= 75 ? "watch" : "healthy";
  const healthScore = Math.round(clamp(100 - vibrationRms * 7 - Math.max(0, temperature - 60) * 0.55 - Math.max(0, current - 10) * 2, 0, 100));
  const rul = estimateRul(trend, vibrationRms, history.length);

  return {
    captures,
    active,
    spectrum: spectrumData,
    peaks,
    history,
    trend,
    vibrationRms,
    rmsX,
    rmsY,
    temperature,
    rpm,
    current,
    shaftHz,
    healthScore,
    risk,
    rul,
    sampleCount: active.length,
    sampleRate
  };
}

function groupCaptures(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = row.captureId || "Current capture";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.values()];
}

function getBearingFrequencies(shaftHz) {
  const { balls, ballToPitchRatio: ratio, contactAngleDeg } = BEARING;
  const cosine = Math.cos((contactAngleDeg * Math.PI) / 180);
  return [
    { key: "bpfo", name: "Outer race (BPFO)", frequency: (balls / 2) * shaftHz * (1 - ratio * cosine), short: "BPFO" },
    { key: "bpfi", name: "Inner race (BPFI)", frequency: (balls / 2) * shaftHz * (1 + ratio * cosine), short: "BPFI" },
    { key: "bsf", name: "Ball spin (BSF)", frequency: (shaftHz / (2 * ratio)) * (1 - (ratio * cosine) ** 2), short: "BSF" },
    { key: "ftf", name: "Cage (FTF)", frequency: (shaftHz / 2) * (1 - ratio * cosine), short: "FTF" }
  ];
}

function nearestPeak(values, target, tolerance) {
  const candidates = values.filter((item) => Math.abs(item.frequency - target) <= tolerance);
  return candidates.reduce((best, item) => item.amplitude > (best?.amplitude || 0) ? item : best, null);
}

function estimateRul(trend, vibrationRms, historyCount) {
  if (historyCount < 3 || !Number.isFinite(trend.slope) || trend.coverageHours <= 0) {
    return { value: null, confidence: "Low", basis: "Add at least 3 captures with operating-hour history" };
  }
  if (trend.slope <= 0.0002 || vibrationRms < 2.3) {
    return { value: null, confidence: trend.confidence, basis: "No rising degradation trend above the watch threshold" };
  }
  const hoursToThreshold = (4.5 - vibrationRms) / trend.slope;
  return {
    value: Math.round(clamp(hoursToThreshold, 0, 9999)),
    confidence: trend.confidence,
    basis: `Linear RMS trend across ${Math.round(trend.coverageHours)} operating hours`
  };
}

function linearTrend(history) {
  const usable = history.filter((item) => Number.isFinite(item.hours));
  if (usable.length < 2) return { slope: NaN, coverageHours: 0, confidence: "Low" };
  const firstHour = usable[0].hours;
  const points = usable.map((item) => ({ x: item.hours - firstHour, y: item.rms }));
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const numerator = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
  const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  const slope = denominator ? numerator / denominator : NaN;
  const coverageHours = points.at(-1).x;
  return {
    slope,
    coverageHours,
    confidence: usable.length >= 6 && coverageHours >= 200 ? "Moderate" : "Low"
  };
}

function rms(values) {
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / Math.max(1, values.length));
}

function average(rows, key) {
  const values = rows.map((row) => row[key]).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : NaN;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
