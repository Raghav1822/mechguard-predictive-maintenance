import { calculateMetrics } from "./analyzer.js";
import { makeSampleRows, sampleCsv, SAMPLE_RATE } from "./data.js";
import "./style.css";

const state = {
  rows: makeSampleRows(),
  sampleRate: SAMPLE_RATE,
  asset: "P-204",
  fileName: "Demo · pump_bearing_trend.csv",
  page: "overview",
  chartRange: 0
};

const app = document.querySelector("#app");

function render() {
  const metrics = calculateMetrics(state.rows, state.sampleRate);
  app.innerHTML = `
    <div class="workspace">
      <aside class="sidebar">
        <a class="brand" href="#" aria-label="MechGuard home"><span class="brand-mark">M</span><span>mech<span class="brand-light">guard</span></span></a>
        <div class="side-label">WORKSPACE</div>
        <nav class="side-nav" aria-label="Main navigation">
          ${navItem("overview", "▦", "Overview")}
          ${navItem("vibration", "⌁", "Vibration lab")}
          ${navItem("diagnostics", "⌘", "Diagnostics")}
          ${navItem("data", "↥", "Data & reports")}
        </nav>
        <div class="side-spacer"></div>
        <div class="plant-card"><span class="plant-pulse"></span><div><strong>North plant</strong><small>Line 04 · online</small></div><span class="chevron">⌄</span></div>
        <div class="sidebar-footer"><span class="avatar">RG</span><div><strong>Reliability team</strong><small>Engineering workspace</small></div><span class="more">···</span></div>
      </aside>
      <main class="main">
        <header class="topbar"><div class="crumb"><span>North plant</span><span class="crumb-slash">/</span><strong>Reliability</strong></div><div class="top-actions"><span class="last-updated"><i></i> Live analysis</span><button class="icon-button" id="report-button" aria-label="Download report" title="Download report">↓</button><button class="avatar avatar-small" title="Reliability team">RG</button></div></header>
        <section class="content">
          <div class="page-heading"><div><div class="eyebrow"><span class="eyebrow-dot"></span> CONDITION MONITORING <span class="eyebrow-line"></span> ${escapeHtml(state.asset)}</div><h1>Good morning, engineer<span class="heading-period">.</span></h1><p class="lede">A clearer read on your machines. Catch the small signals before they become big stops.</p></div><button class="button button-outline" id="upload-trigger"><span>＋</span> Import sensor data</button><input id="file-input" type="file" accept=".csv,text/csv" hidden /></div>
          <div class="asset-toolbar"><div class="asset-select-wrap"><span class="asset-icon">◈</span><label for="asset-select">ASSET</label><select id="asset-select"><option value="P-204" ${state.asset === "P-204" ? "selected" : ""}>P-204 · Feedwater pump</option><option value="M-108" ${state.asset === "M-108" ? "selected" : ""}>M-108 · Drive motor</option><option value="F-017" ${state.asset === "F-017" ? "selected" : ""}>F-017 · Cooling fan</option></select><span class="select-arrow">⌄</span></div><span class="toolbar-separator"></span><span class="asset-meta">Centrifugal · <b>1480 rpm</b></span><span class="toolbar-spacer"></span><span class="data-source"><span class="tiny-dot"></span>${escapeHtml(state.fileName)}</span></div>
          <div class="nav-tabs" role="tablist">${tabItem("overview", "Overview")}${tabItem("vibration", "Vibration analysis")}${tabItem("diagnostics", "Health & RUL")}${tabItem("data", "Dataset")}</div>
          ${renderPage(metrics)}
          <footer class="footer"><span>MECHGUARD <b>·</b> CONDITION INTELLIGENCE</span><span>On-device analysis · Your data stays in this browser</span></footer>
        </section>
      </main>
    </div>`;
  bindEvents(metrics);
}

function renderPage(metrics) {
  if (state.page === "vibration") return renderVibration(metrics);
  if (state.page === "diagnostics") return renderDiagnostics(metrics);
  if (state.page === "data") return renderData(metrics);
  return renderOverview(metrics);
}

function renderOverview(m) {
  const riskCopy = m.risk === "critical" ? "Intervention recommended" : m.risk === "watch" ? "Keep a closer watch" : "Operating within range";
  const trendCopy = m.risk === "critical" ? "Vibration exceeds the action line" : m.risk === "watch" ? "Early-stage wear signal detected" : "Signals are steady against baseline";
  return `
    <div class="summary-row">
      <div class="section-title"><h2>Asset pulse</h2><span>Latest capture · ${m.sampleCount.toLocaleString()} samples</span></div>
      <div class="status-pill status-${m.risk}"><span></span>${riskCopy}</div>
    </div>
    <div class="metric-grid">
      <article class="metric-card health-card"><div class="metric-top"><span>HEALTH INDEX</span><span class="metric-symbol">↗</span></div><div class="health-row"><strong>${m.healthScore}</strong><span class="health-unit">/ 100</span><div class="health-ring" style="--score:${m.healthScore * 3.6}deg"><i></i></div></div><div class="metric-foot"><span class="tiny-dot ${m.healthScore < 55 ? "dot-alert" : ""}"></span>${m.healthScore < 55 ? "Degraded condition" : m.healthScore < 78 ? "Minor degradation" : "Healthy condition"}</div></article>
      <article class="metric-card"><div class="metric-top"><span>VIBRATION RMS</span><span class="metric-symbol">〰</span></div><div class="metric-value">${m.vibrationRms.toFixed(2)}<small>mm/s</small></div><div class="metric-foot"><span class="metric-delta ${m.vibrationRms >= 2.3 ? "delta-warn" : ""}">${m.vibrationRms >= 4.5 ? "Above action line" : m.vibrationRms >= 2.3 ? "Above watch threshold" : "Within baseline"}</span><span class="metric-ref">ISO 20816*</span></div></article>
      <article class="metric-card"><div class="metric-top"><span>BEARING SIGNAL</span><span class="metric-symbol">◌</span></div><div class="metric-value">${m.peaks.find((peak) => peak.key === "bpfi")?.peak?.amplitude.toFixed(2) || "0.00"}<small>mm/s pk</small></div><div class="metric-foot"><span class="metric-delta ${m.peaks.find((peak) => peak.key === "bpfi")?.peak?.amplitude > 0.75 ? "delta-warn" : ""}">${m.peaks.find((peak) => peak.key === "bpfi")?.peak?.amplitude > 0.75 ? "BPFI energy elevated" : "No fault signature"}</span><span class="metric-ref">Inner race</span></div></article>
      <article class="metric-card"><div class="metric-top"><span>REMAINING LIFE</span><span class="metric-symbol">◷</span></div><div class="metric-value">${m.rul.value === null ? "—" : m.rul.value.toLocaleString()}<small>${m.rul.value === null ? "hours" : "hours"}</small></div><div class="metric-foot"><span class="metric-delta">${m.rul.value === null ? "Trend history needed" : `${m.rul.confidence} confidence · trend-based`}</span><span class="metric-ref">Estimate</span></div></article>
    </div>
    <div class="dashboard-grid">
      <article class="panel trend-panel"><div class="panel-heading"><div><h3>Vibration trend</h3><p>Overall RMS · mm/s</p></div><div class="chart-controls"><span class="legend"><i class="legend-line"></i> RMS</span><button class="select-button" id="range-button">${state.chartRange ? "All captures" : "Last 8 captures"} <span>⌄</span></button></div></div>${lineChart(m.history, "rms", { threshold: 4.5, thresholdLabel: "Action 4.5" })}<div class="chart-foot"><span>Watch line <b>2.3 mm/s</b></span><span>Action line <b class="alert-text">4.5 mm/s</b></span></div></article>
      <article class="panel signal-panel"><div class="panel-heading"><div><h3>Signal snapshot</h3><p>Frequency domain · last capture</p></div><button class="text-button" data-nav="vibration">Open lab <span>↗</span></button></div>${spectrumChart(m.spectrum, m.peaks)}<div class="signal-note"><span class="note-icon">✳</span><span><b>${m.risk === "critical" ? "Fault energy is climbing." : m.risk === "watch" ? "A bearing-frequency signature is forming." : "No significant bearing peaks."}</b><small>${m.risk === "healthy" ? "Keep monitoring at current cadence." : "Inner-race band shows increased energy at " + m.peaks.find((peak) => peak.key === "bpfi").frequency.toFixed(1) + " Hz."}</small></span></div></article>
    </div>
    <div class="dashboard-grid lower-grid">
      <article class="panel findings-panel"><div class="panel-heading"><div><h3>What needs your attention</h3><p>${trendCopy}</p></div><span class="finding-count">${m.risk === "healthy" ? "01" : "03"}</span></div>${findingRows(m)}</article>
      <article class="panel action-panel"><div class="action-kicker"><span class="action-icon">✦</span> NEXT BEST ACTION</div><h3>${m.risk === "critical" ? "Plan a bearing inspection." : m.risk === "watch" ? "Schedule a focused inspection." : "Keep the cadence steady."}</h3><p>${m.risk === "critical" ? "Capture a follow-up waveform and inspect the inner race at the next safe opportunity." : m.risk === "watch" ? "Recheck this pump within 48 operating hours. Compare against a known-good baseline." : "No immediate intervention. Keep collecting comparable captures to build a reliable trend."}</p><button class="button button-dark" data-nav="diagnostics">${m.risk === "healthy" ? "View maintenance plan" : "Review diagnostic"} <span>→</span></button><div class="action-decoration">MG<span>·</span>04</div></article>
    </div>
    <p class="disclaimer">* ISO 20816 severity bands are indicative screening references. Actual limits depend on machine class, mounting and operating conditions. MechGuard estimates are decision support, not a certified diagnosis.</p>`;
}

function renderVibration(m) {
  return `<div class="page-intro"><div><div class="eyebrow">SIGNAL PROCESSING <span class="eyebrow-line"></span> FFT WORKBENCH</div><h2>Read the machine's rhythm.</h2><p>Inspect raw vibration and spectral peaks against calculated bearing defect frequencies.</p></div><div class="sample-rate"><label for="sample-rate">SAMPLE RATE</label><div><input id="sample-rate" type="number" min="1" max="1000000" step="1" value="${m.sampleRate}" /><span>Hz</span></div></div></div>
    <div class="dashboard-grid vibration-grid"><article class="panel wide-panel"><div class="panel-heading"><div><h3>Time waveform</h3><p>Velocity · mm/s · latest capture</p></div><span class="unit-tag">X AXIS</span></div>${lineChart(m.active.map((row, i) => ({ label: i, value: row.x })), "value", { compact: true, showThreshold: false })}<div class="chart-foot"><span>Peak <b>${Math.max(...m.active.map((row) => Math.abs(row.x))).toFixed(2)} mm/s</b></span><span>RMS <b>${m.rmsX.toFixed(2)} mm/s</b></span><span>${m.active.length} points · ${m.sampleRate} Hz</span></div></article>
    <article class="panel wide-panel"><div class="panel-heading"><div><h3>Frequency spectrum</h3><p>Hann window · single-sided amplitude · mm/s peak</p></div><span class="unit-tag">0—${Math.round(m.sampleRate / 2)} HZ</span></div>${spectrumChart(m.spectrum, m.peaks, true)}<div class="chart-foot"><span>Resolution <b>${(m.sampleRate / m.spectrum.length / 2).toFixed(2)} Hz</b></span><span>Dominant shaft <b>${m.shaftHz.toFixed(1)} Hz</b></span><span>FFT length <b>${m.spectrum.length * 2} pts</b></span></div></article></div>
    <article class="panel bearing-panel"><div class="panel-heading"><div><h3>Bearing frequency map</h3><p>Calculated from 6205-series geometry · ${m.rpm.toFixed(0)} rpm</p></div><span class="geometry-tag">8 rolling elements · 30% ratio</span></div><div class="bearing-grid">${m.peaks.map((peak) => `<div class="bearing-item"><span>${peak.short}</span><b>${peak.frequency.toFixed(1)}<small>Hz</small></b><small>${peak.name.split("(")[0].trim()}</small><div class="peak-meter"><i style="width:${Math.min(100, (peak.peak?.amplitude || 0) * 55)}%"></i></div><em>${peak.peak ? peak.peak.amplitude.toFixed(2) + " mm/s" : "no peak"}</em></div>`).join("")}</div></article>
    <p class="disclaimer">FFT assumes uniformly sampled velocity data. Confirm sensor mounting, sample rate, bearing geometry and machine speed before drawing maintenance conclusions.</p>`;
}

function renderDiagnostics(m) {
  const faultPeak = m.peaks.find((peak) => peak.key === "bpfi");
  const actions = m.risk === "critical"
    ? [["01", "Plan an inspection", "Prioritize inner-race inspection and verify lubrication, fit and sensor mounting."], ["02", "Confirm the signature", "Capture a second waveform under comparable load and speed before replacing components."], ["03", "Protect the operating window", "Review criticality and prepare a controlled maintenance window with operations."]]
    : m.risk === "watch"
      ? [["01", "Recheck within 48 hours", "Collect another waveform under comparable operating conditions."], ["02", "Review bearing lubrication", "Check lubricant condition and recent operating changes before changing parts."], ["03", "Build confidence in the trend", "Add more captures over time; current life estimate has limited history."]]
      : [["01", "Continue routine monitoring", "No immediate intervention indicated by this capture."], ["02", "Keep a baseline", "Capture at a consistent speed and load to make future comparisons meaningful."], ["03", "Inspect on scheduled service", "Use the next planned stop to verify mounting, alignment and lubrication."]];
  return `<div class="page-intro"><div><div class="eyebrow">CONDITION REVIEW <span class="eyebrow-line"></span> DECISION SUPPORT</div><h2>From signal to next step.</h2><p>A transparent, rules-based screening view—not a black-box verdict.</p></div><div class="status-pill status-${m.risk}"><span></span>${m.risk === "critical" ? "Action advised" : m.risk === "watch" ? "Watch condition" : "Normal condition"}</div></div>
    <div class="diagnostic-layout"><div><article class="panel diagnostic-score"><div class="score-visual"><div class="score-ring" style="--score:${m.healthScore * 3.6}deg"><span>${m.healthScore}<small>HEALTH</small></span></div></div><div class="score-copy"><span class="eyebrow">COMPOSITE CONDITION INDEX</span><h3>${m.healthScore >= 78 ? "In good shape." : m.healthScore >= 55 ? "Showing early wear." : "Needs your attention."}</h3><p>${m.risk === "critical" ? "Current vibration RMS exceeds the screening action band. Confirm with a second capture before acting." : m.risk === "watch" ? "One or more indicators have moved beyond baseline. Trend direction matters more than a single reading." : "Measured vibration and temperature sit within the current screening bands."}</p><div class="score-breakdown"><span>Vibration <b>${m.vibrationRms.toFixed(2)} mm/s</b></span><span>Temperature <b>${m.temperature.toFixed(1)} °C</b></span><span>Current <b>${m.current.toFixed(1)} A</b></span></div></div></article>
    <article class="panel recommendation-panel"><div class="panel-heading"><div><h3>Recommended action plan</h3><p>Prioritized by current condition and trend</p></div><span class="action-badge">${actions.length} STEPS</span></div>${actions.map(([number, title, copy]) => `<div class="recommendation"><span class="step-number">${number}</span><span><b>${title}</b><small>${copy}</small></span><span class="step-arrow">↗</span></div>`).join("")}</article></div>
    <div class="diag-side"><article class="panel rul-card"><div class="panel-heading"><div><h3>Remaining useful life</h3><p>Trend projection to 4.5 mm/s</p></div><span class="rul-icon">◷</span></div><div class="rul-number">${m.rul.value === null ? "—" : m.rul.value.toLocaleString()}<small>operating hours</small></div><div class="confidence-row"><span>Confidence</span><b class="confidence-${m.rul.confidence.toLowerCase()}">${m.rul.confidence}</b></div><div class="rul-bar"><i style="width:${m.rul.value === null ? 8 : Math.max(6, Math.min(95, 95 - m.healthScore))}%"></i></div><p class="rul-note">${m.rul.basis}. Estimate is an extrapolation, not a failure-time guarantee.</p></article>
    <article class="panel fault-card"><div class="panel-heading"><div><h3>Signal flags</h3><p>Rule-based screening</p></div></div>${m.peaks.map((peak) => `<div class="fault-row"><span class="fault-indicator ${peak.peak?.amplitude > 0.75 ? "flag-warn" : ""}"></span><span><b>${peak.short} ${peak.peak?.amplitude > 0.75 ? "elevated" : "nominal"}</b><small>${peak.frequency.toFixed(1)} Hz · ${peak.peak?.amplitude.toFixed(2) || "0.00"} mm/s pk</small></span></div>`).join("")}<div class="fault-row"><span class="fault-indicator ${m.temperature > 75 ? "flag-warn" : ""}"></span><span><b>Thermal ${m.temperature > 75 ? "watch" : "nominal"}</b><small>Average case temperature · ${m.temperature.toFixed(1)} °C</small></span></div><div class="fault-row"><span class="fault-indicator"></span><span><b>Speed stable</b><small>${m.rpm.toFixed(0)} rpm · ${((m.rpm / 60)).toFixed(1)} Hz shaft rate</small></span></div></article></div></div>
    <p class="disclaimer">Screening thresholds are illustrative and configurable only through domain validation. RUL is a simple linear trend projection and must not be used as the sole basis for safety or maintenance decisions.</p>`;
}

function renderData(m) {
  return `<div class="page-intro"><div><div class="eyebrow">DATA WORKSPACE <span class="eyebrow-line"></span> LOCAL PROCESSING</div><h2>Your sensor data, made useful.</h2><p>Upload a CSV or explore the built-in pump-bearing dataset. Nothing leaves this browser.</p></div><button class="button button-dark" id="data-upload"><span>＋</span> Upload CSV</button></div>
    <div class="data-layout"><article class="panel dataset-panel"><div class="panel-heading"><div><h3>Current dataset</h3><p>Source file · ${escapeHtml(state.fileName)}</p></div><span class="dataset-chip"><i></i> READY</span></div><div class="dataset-stats"><div><span>ROWS</span><b>${state.rows.length.toLocaleString()}</b></div><div><span>CAPTURES</span><b>${m.captures.length}</b></div><div><span>FIELDS</span><b>8</b></div></div><div class="table-wrap"><table><thead><tr><th>CAPTURE</th><th>OPERATING HRS</th><th>VIB X RMS</th><th>VIB Y RMS</th><th>TEMP</th><th>RPM</th><th>CURRENT</th></tr></thead><tbody>${m.history.slice(-6).reverse().map((capture, index) => { const rows = m.captures.at(-(index + 1)); return `<tr><td><span class="table-dot"></span>${escapeHtml(capture.label)}</td><td>${capture.hours ?? "—"}</td><td>${rms(rows.map((row) => row.x)).toFixed(2)}</td><td>${rms(rows.map((row) => row.y)).toFixed(2)}</td><td>${capture.temperature.toFixed(1)} °C</td><td>${average(rows, "rpm").toFixed(0)}</td><td>${capture.current.toFixed(1)} A</td></tr>`; }).join("")}</tbody></table></div><div class="dataset-foot"><span>Latest capture shown first</span><button class="text-button" id="download-sample">Download sample CSV <span>↓</span></button></div></article>
    <aside class="panel format-panel"><div class="format-icon">↥</div><h3>Bring your own data</h3><p>Use a CSV with one row per vibration sample. Add capture IDs and operating hours to enable trend-based life estimation.</p><div class="format-label">REQUIRED COLUMNS</div><code>vibration_x_mm_s</code><code>vibration_y_mm_s</code><div class="format-label">OPTIONAL COLUMNS</div><code>capture_id, operating_hours</code><code>temperature_c, rpm, current_a</code><div class="format-label">SAMPLE RATE</div><p class="format-small">Set your sensor's sampling rate in the Vibration lab. Keep units consistent: mm/s, °C, rpm and A.</p><button class="button button-outline button-full" id="download-sample-2">Get example dataset <span>↓</span></button></aside></div>
    <div class="panel sample-callout"><span class="sample-icon">✳</span><div><b>Explore before you upload.</b><p>The demo contains eight simulated captures across 672 operating hours with progressive inner-race fault energy. Use it to test the full workflow.</p></div><button class="text-button" id="load-sample">Reload sample dataset <span>↻</span></button></div>
    <p class="disclaimer">CSV parsing and analysis run locally in your browser. The sample dataset is synthetic and for demonstration only; it is not operational equipment data.</p>`;
}

function findingRows(m) {
  const rows = [
    { icon: "〰", title: m.vibrationRms >= 4.5 ? "Overall vibration exceeds action line" : m.vibrationRms >= 2.3 ? "Overall vibration above watch threshold" : "Overall vibration within screening band", detail: `${m.vibrationRms.toFixed(2)} mm/s RMS · ISO 20816 screening reference`, warning: m.vibrationRms >= 2.3 },
    { icon: "◌", title: m.peaks.find((peak) => peak.key === "bpfi")?.peak?.amplitude > 0.75 ? "Inner-race frequency band is elevated" : "Bearing frequencies are within baseline", detail: `BPFI ${m.peaks.find((peak) => peak.key === "bpfi").frequency.toFixed(1)} Hz · 6205-series geometry`, warning: m.peaks.find((peak) => peak.key === "bpfi")?.peak?.amplitude > 0.75 },
    { icon: "♨", title: m.temperature > 75 ? "Temperature elevated" : "Operating temperature is stable", detail: `${m.temperature.toFixed(1)} °C average case temperature`, warning: m.temperature > 75 }
  ];
  return rows.map((row) => `<div class="finding-row"><span class="finding-icon ${row.warning ? "finding-warning" : ""}">${row.icon}</span><span><b>${row.title}</b><small>${row.detail}</small></span><span class="finding-status ${row.warning ? "text-warning" : ""}">${row.warning ? "Review" : "Normal"}</span></div>`).join("");
}

function lineChart(items, key, options = {}) {
  const width = 720;
  const height = options.compact ? 204 : 198;
  const pad = { left: 36, right: 12, top: 16, bottom: 30 };
  const values = items.map((item) => Number(item[key] ?? item.value));
  const minimum = options.compact ? Math.min(...values, -1) : 0;
  const maxData = Math.max(...values, options.threshold || 0, 1);
  const maximum = options.compact ? maxData * 1.18 : Math.max(5, maxData * 1.18);
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const coords = values.map((value, index) => ({
    x: pad.left + (index / Math.max(1, values.length - 1)) * plotWidth,
    y: pad.top + ((maximum - value) / (maximum - minimum)) * plotHeight
  }));
  const path = coords.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = `${path} L${coords.at(-1)?.x || pad.left},${height - pad.bottom} L${coords[0]?.x || pad.left},${height - pad.bottom} Z`;
  const labels = options.compact ? ["0", "25%", "50%", "75%", "100%"] : items.map((item) => item.label);
  const tickValues = options.compact ? [maximum, maximum * 0.5, 0, minimum * 0.5, minimum] : [maximum, maximum * 0.66, maximum * 0.33, 0];
  return `<div class="chart-wrap"><svg class="line-chart ${options.compact ? "chart-compact" : ""}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.compact ? "Vibration time waveform" : "Vibration RMS trend"}">
    ${tickValues.map((value) => { const y = pad.top + ((maximum - value) / (maximum - minimum)) * plotHeight; return `<line class="grid-line" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"/><text class="axis-label" x="${pad.left - 7}" y="${y + 3}" text-anchor="end">${value.toFixed(options.compact ? 1 : 0)}</text>`; }).join("")}
    ${options.threshold && !options.compact ? `<line class="threshold-line" x1="${pad.left}" y1="${pad.top + ((maximum - options.threshold) / (maximum - minimum)) * plotHeight}" x2="${width - pad.right}" y2="${pad.top + ((maximum - options.threshold) / (maximum - minimum)) * plotHeight}"/><text class="threshold-label" x="${width - pad.right - 2}" y="${pad.top + ((maximum - options.threshold) / (maximum - minimum)) * plotHeight - 5}" text-anchor="end">${options.thresholdLabel}</text>` : ""}
    ${options.compact ? "" : `<path class="area-path" d="${area}"/>`}
    <path class="data-path" d="${path}"/>
    ${coords.filter((_, index) => options.compact ? index % 20 === 0 : index === coords.length - 1 || index % 2 === 0).map((point) => `<circle class="data-point" cx="${point.x}" cy="${point.y}" r="${options.compact ? 1.5 : 3}"/>`).join("")}
    ${(options.compact ? ["0", `${Math.round(items.length / 4)}`, `${Math.round(items.length / 2)}`, `${Math.round(items.length * 0.75)}`, `${items.length}`] : [labels[0], labels[Math.floor(labels.length / 2)], labels.at(-1)]).map((label, index, list) => `<text class="axis-label x-axis" x="${pad.left + (index / (list.length - 1)) * plotWidth}" y="${height - 7}" text-anchor="${index === 0 ? "start" : index === list.length - 1 ? "end" : "middle"}">${escapeHtml(String(label ?? ""))}</text>`).join("")}
    </svg></div>`;
}

function spectrumChart(values, peaks, expanded = false) {
  const width = 500;
  const height = expanded ? 246 : 152;
  const pad = { left: 36, right: 10, top: 16, bottom: 28 };
  const limit = Math.min(values.length, expanded ? 220 : 160);
  const sample = values.slice(0, limit);
  const max = Math.max(0.5, ...sample.map((item) => item.amplitude)) * 1.2;
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const path = sample.map((item, index) => `${index ? "L" : "M"}${(pad.left + (index / Math.max(1, limit - 1)) * plotWidth).toFixed(1)},${(pad.top + (1 - item.amplitude / max) * plotHeight).toFixed(1)}`).join(" ");
  const maxFrequency = sample.at(-1)?.frequency || 1;
  const markers = peaks.map((peak) => {
    const x = pad.left + (peak.frequency / maxFrequency) * plotWidth;
    return `<line class="spectrum-marker" x1="${x}" y1="${pad.top}" x2="${x}" y2="${height - pad.bottom}"/><text class="spectrum-label" x="${x + 3}" y="${pad.top + 10 + (peak.key === "bsf" || peak.key === "ftf" ? 11 : 0)}">${peak.short}</text>`;
  }).join("");
  return `<div class="spectrum-wrap"><svg viewBox="0 0 ${width} ${height}" class="spectrum-chart" role="img" aria-label="FFT frequency spectrum with bearing fault markers"><line class="grid-line" x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}"/><line class="grid-line" x1="${pad.left}" y1="${pad.top + plotHeight / 2}" x2="${width - pad.right}" y2="${pad.top + plotHeight / 2}"/>${markers}<path class="spectrum-path" d="${path}"/><text class="axis-label" x="${pad.left}" y="${height - 6}">0 Hz</text><text class="axis-label" x="${width - pad.right}" y="${height - 6}" text-anchor="end">${maxFrequency.toFixed(0)} Hz</text><text class="axis-label" x="8" y="${pad.top + 5}">${max.toFixed(1)}</text></svg></div>`;
}

function navItem(id, icon, label) {
  return `<button class="side-item ${state.page === id ? "active" : ""}" data-nav="${id}"><span class="nav-icon">${icon}</span>${label}</button>`;
}

function tabItem(id, label) {
  return `<button class="tab ${state.page === id ? "selected" : ""}" role="tab" aria-selected="${state.page === id}" data-nav="${id}">${label}</button>`;
}

function bindEvents(metrics) {
  app.querySelectorAll("[data-nav]").forEach((button) => button.addEventListener("click", () => {
    state.page = button.dataset.nav;
    render();
  }));
  app.querySelector("#upload-trigger")?.addEventListener("click", () => app.querySelector("#file-input").click());
  app.querySelector("#data-upload")?.addEventListener("click", () => app.querySelector("#file-input").click());
  app.querySelector("#file-input")?.addEventListener("change", handleUpload);
  app.querySelector("#sample-rate")?.addEventListener("change", (event) => {
    const rate = Number(event.target.value);
    if (Number.isFinite(rate) && rate > 0 && rate <= 1_000_000) {
      state.sampleRate = rate;
      render();
    }
  });
  app.querySelector("#range-button")?.addEventListener("click", () => {
    state.chartRange = Number(!state.chartRange);
    render();
  });
  app.querySelector("#asset-select")?.addEventListener("change", (event) => {
    state.asset = event.target.value;
    render();
  });
  app.querySelector("#report-button")?.addEventListener("click", () => downloadReport(metrics));
  app.querySelector("#download-sample")?.addEventListener("click", downloadSample);
  app.querySelector("#download-sample-2")?.addEventListener("click", downloadSample);
  app.querySelector("#load-sample")?.addEventListener("click", () => {
    state.rows = makeSampleRows();
    state.sampleRate = SAMPLE_RATE;
    state.fileName = "Demo · pump_bearing_trend.csv";
    render();
  });
}

async function handleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const parsed = parseCsv(await file.text());
    state.rows = parsed;
    state.fileName = file.name;
    state.page = "overview";
    render();
    showToast(`Loaded ${parsed.length.toLocaleString()} rows from ${file.name}`);
  } catch (error) {
    showToast(error.message, true);
  }
  event.target.value = "";
}

function parseCsv(text) {
  const records = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) records.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field.trim());
    records.push(row);
  }
  if (records.length < 2) throw new Error("The CSV needs a header row and at least one sample.");
  const headers = records[0].map((header) => header.trim().replace(/^\uFEFF/, "").toLowerCase().replace(/[\s-]+/g, "_"));
  const column = (...names) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0);
  const xCol = column("vibration_x_mm_s", "vibration_x", "x_mm_s", "vib_x", "acceleration_x");
  const yCol = column("vibration_y_mm_s", "vibration_y", "y_mm_s", "vib_y", "acceleration_y");
  if (xCol === undefined || yCol === undefined) throw new Error("Required columns not found. Include vibration_x_mm_s and vibration_y_mm_s (or vibration_x and vibration_y).");
  const timestampCol = column("timestamp", "time", "datetime");
  const captureCol = column("capture_id", "capture", "run_id");
  const hoursCol = column("operating_hours", "hours", "run_hours");
  const tempCol = column("temperature_c", "temperature", "temp_c");
  const rpmCol = column("rpm", "speed_rpm");
  const currentCol = column("current_a", "current", "motor_current_a");
  const parsed = records.slice(1).map((values, index) => {
    const x = Number(values[xCol]);
    const y = Number(values[yCol]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`Invalid vibration value on CSV row ${index + 2}.`);
    const optionalNumber = (col, label) => {
      if (col === undefined || values[col] === "") return NaN;
      const value = Number(values[col]);
      if (!Number.isFinite(value)) throw new Error(`Invalid ${label} value on CSV row ${index + 2}.`);
      return value;
    };
    return {
      x,
      y,
      timestamp: timestampCol === undefined ? "" : values[timestampCol],
      captureId: captureCol === undefined || !values[captureCol] ? "Current capture" : values[captureCol],
      operatingHours: optionalNumber(hoursCol, "operating hours"),
      temperature: optionalNumber(tempCol, "temperature"),
      rpm: optionalNumber(rpmCol, "RPM"),
      current: optionalNumber(currentCol, "current")
    };
  }).filter((row) => Number.isFinite(row.x) && Number.isFinite(row.y));
  if (parsed.length < 16) throw new Error("At least 16 valid vibration samples are needed for a useful FFT.");
  const normalized = parsed.map((row) => ({
    ...row,
    temperature: Number.isFinite(row.temperature) ? row.temperature : 25,
    rpm: Number.isFinite(row.rpm) ? row.rpm : 1480,
    current: Number.isFinite(row.current) ? row.current : 0
  }));
  return normalized;
}

function downloadSample() {
  download(sampleCsv(), "mechguard-sample-pump-bearing.csv", "text/csv");
}

function downloadReport(metrics) {
  const report = {
    generatedAt: new Date().toISOString(),
    asset: state.asset,
    dataset: state.fileName,
    sampleRateHz: metrics.sampleRate,
    sampleCount: metrics.sampleCount,
    vibrationRmsMmPerS: Number(metrics.vibrationRms.toFixed(3)),
    healthIndex: metrics.healthScore,
    condition: metrics.risk,
    temperatureC: Number(metrics.temperature.toFixed(1)),
    speedRpm: Number(metrics.rpm.toFixed(0)),
    remainingUsefulLifeHours: metrics.rul.value,
    rulConfidence: metrics.rul.confidence,
    bearingPeaks: metrics.peaks.map(({ short, frequency, peak }) => ({ type: short, frequencyHz: Number(frequency.toFixed(2)), amplitudeMmPerSPeak: Number((peak?.amplitude || 0).toFixed(3)) })),
    caveat: "Decision-support estimate only. Validate against machine-specific limits and qualified engineering review."
  };
  download(JSON.stringify(report, null, 2), `mechguard-${state.asset.toLowerCase()}-report.json`, "application/json");
}

function download(content, name, type) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function showToast(message, isError = false) {
  app.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = `toast ${isError ? "toast-error" : ""}`;
  toast.setAttribute("role", isError ? "alert" : "status");
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 4200);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function rms(values) {
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / Math.max(1, values.length));
}

function average(rows, key) {
  const values = rows.map((row) => row[key]).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

render();
