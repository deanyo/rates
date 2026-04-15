const AXES = ["roll", "pitch", "yaw"];
const AXIS_COLORS = {
  roll: "#93f1c6",
  pitch: "#86c7ff",
  yaw: "#ffbf7e",
};

const RATE_MODELS = {
  ACTUAL: {
    label: "Actual",
    summary: "Actual first pass: center sensitivity, max rate, and expo.",
    fields: [
      { key: "rcRate", label: "center sensitivity", min: 20, max: 400, step: 0.1 },
      { key: "sRate", label: "max rate", min: 50, max: 2000, step: 1 },
      { key: "expo", label: "expo", min: 0, max: 1, step: 0.01 },
    ],
  },
  BETAFLIGHT: {
    label: "Betaflight",
    summary: "Betaflight first pass: rc rate, super rate, and expo.",
    fields: [
      { key: "rcRate", label: "rc rate", min: 1, max: 255, step: 0.1 },
      { key: "sRate", label: "super rate", min: 0, max: 100, step: 1 },
      { key: "expo", label: "expo", min: 0, max: 1, step: 0.01 },
    ],
  },
};

const DEFAULT_STATE = {
  pilotName: "dean",
  setupName: "indoor daily",
  bfVersion: "4.5",
  rateType: "ACTUAL",
  linkedAxes: true,
  axes: {
    roll: { rcRate: 72.5, sRate: 640, expo: 0.32 },
    pitch: { rcRate: 72.5, sRate: 640, expo: 0.32 },
    yaw: { rcRate: 110, sRate: 600, expo: 0.17 },
  },
  throttle: {
    mid: 0.5,
    expo: 0.01,
  },
};

const elements = {
  pilotName: document.getElementById("pilotName"),
  setupName: document.getElementById("setupName"),
  bfVersion: document.getElementById("bfVersion"),
  rateType: document.getElementById("rateType"),
  linkedAxes: document.getElementById("linkedAxes"),
  axisGrid: document.getElementById("axisGrid"),
  throttleMid: document.getElementById("throttleMid"),
  throttleExpo: document.getElementById("throttleExpo"),
  curveCanvas: document.getElementById("curveCanvas"),
  shareUrl: document.getElementById("shareUrl"),
  shareLabel: document.getElementById("shareLabel"),
  cliOutput: document.getElementById("cliOutput"),
  graphDescription: document.getElementById("graphDescription"),
  graphStats: document.getElementById("graphStats"),
  summaryPilot: document.getElementById("summaryPilot"),
  summaryName: document.getElementById("summaryName"),
  summaryType: document.getElementById("summaryType"),
  summaryRoll: document.getElementById("summaryRoll"),
  copyShareButton: document.getElementById("copyShareButton"),
  copyCliButton: document.getElementById("copyCliButton"),
  resetButton: document.getElementById("resetButton"),
  cliImportInput: document.getElementById("cliImportInput"),
  importCliButton: document.getElementById("importCliButton"),
  clearCliImportButton: document.getElementById("clearCliImportButton"),
  statusStrip: document.getElementById("statusStrip"),
};

const state = loadStateFromUrl();

renderAxisInputs();
bindEvents();
refreshAll();

function bindEvents() {
  elements.rateType.addEventListener("change", () => {
    state.rateType = elements.rateType.value;
    renderAxisInputs();
    refreshAll();
  });

  elements.pilotName.addEventListener("input", () => {
    state.pilotName = sanitizePilotName(elements.pilotName.value);
    refreshAll();
  });

  elements.setupName.addEventListener("input", () => {
    state.setupName = sanitizeSetupName(elements.setupName.value);
    refreshAll();
  });

  elements.bfVersion.addEventListener("input", () => {
    state.bfVersion = sanitizeVersion(elements.bfVersion.value);
    refreshAll();
  });

  elements.linkedAxes.addEventListener("change", () => {
    state.linkedAxes = elements.linkedAxes.checked;
    setStatus(state.linkedAxes ? "roll and pitch are linked." : "roll and pitch are unlinked.");
  });

  elements.throttleMid.addEventListener("input", () => {
    state.throttle.mid = clampNumber(Number(elements.throttleMid.value), 0, 1);
    refreshAll();
  });

  elements.throttleExpo.addEventListener("input", () => {
    state.throttle.expo = clampNumber(Number(elements.throttleExpo.value), 0, 1);
    refreshAll();
  });

  elements.copyShareButton.addEventListener("click", async () => {
    await copyText(elements.shareUrl.value, "share url copied.");
  });

  elements.copyCliButton.addEventListener("click", async () => {
    await copyText(elements.cliOutput.value, "cli block copied.");
  });

  elements.importCliButton.addEventListener("click", () => {
    importCliText(elements.cliImportInput.value);
  });

  elements.clearCliImportButton.addEventListener("click", () => {
    elements.cliImportInput.value = "";
    setStatus("cli paste cleared.");
  });

  elements.resetButton.addEventListener("click", () => {
    Object.assign(state, cloneState(DEFAULT_STATE));
    renderAxisInputs();
    refreshAll();
    setStatus("reset to defaults.");
  });
}

function renderAxisInputs() {
  const model = RATE_MODELS[state.rateType];
  elements.pilotName.value = state.pilotName;
  elements.setupName.value = state.setupName;
  elements.bfVersion.value = state.bfVersion;
  elements.rateType.value = state.rateType;
  elements.linkedAxes.checked = state.linkedAxes;
  elements.throttleMid.value = formatDecimal(state.throttle.mid, 2);
  elements.throttleExpo.value = formatDecimal(state.throttle.expo, 2);
  elements.graphDescription.textContent = model.summary;
  elements.axisGrid.innerHTML = AXES.map((axis) => renderAxisBlock(axis, model)).join("");

  for (const input of elements.axisGrid.querySelectorAll("input[data-axis][data-key]")) {
    input.addEventListener("input", () => {
      const axis = input.dataset.axis;
      const key = input.dataset.key;
      const field = model.fields.find((candidate) => candidate.key === key);
      const nextValue = clampNumber(Number(input.value), field.min, field.max);
      setAxisValue(axis, key, nextValue);
      refreshAll();
    });
  }
}

function renderAxisBlock(axis, model) {
  const values = state.axes[axis];
  return `
    <section class="axis-block">
      <div class="axis-block-head">
        <div class="axis-block-title">${axis}</div>
        <div class="axis-block-label">${model.label}</div>
      </div>
      <div class="axis-fields">
        ${model.fields.map((field) => `
          <div class="input-pair">
            <label for="${axis}-${field.key}">${field.label}</label>
            <input
              id="${axis}-${field.key}"
              type="number"
              data-axis="${axis}"
              data-key="${field.key}"
              min="${field.min}"
              max="${field.max}"
              step="${field.step}"
              value="${values[field.key]}"
            >
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function setAxisValue(axis, key, value) {
  state.axes[axis][key] = value;

  if (state.linkedAxes && (axis === "roll" || axis === "pitch")) {
    const otherAxis = axis === "roll" ? "pitch" : "roll";
    state.axes[otherAxis][key] = value;
    const pairedInput = elements.axisGrid.querySelector(`[data-axis="${otherAxis}"][data-key="${key}"]`);
    if (pairedInput) {
      pairedInput.value = String(value);
    }
  }
}

function refreshAll() {
  sanitizeState(state);
  drawGraph();
  updateShareUrl();
  updateCliOutput();
  updateSummary();
  updateHistory();
}

function drawGraph() {
  const canvas = elements.curveCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 24, right: 20, bottom: 42, left: 54 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxRate = Math.max(...AXES.flatMap((axis) => [Math.abs(sampleAxis(axis, -1)), Math.abs(sampleAxis(axis, 1))]));

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0d0b14";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i += 1) {
    const x = padding.left + (plotWidth * i) / 4;
    const y = padding.top + (plotHeight * i) / 4;

    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(padding.left, height / 2);
  ctx.lineTo(width - padding.right, height / 2);
  ctx.stroke();

  ctx.fillStyle = "#a79eb8";
  ctx.font = '11px "JetBrains Mono"';
  ctx.fillText("stick", width - padding.right - 28, height - 14);
  ctx.save();
  ctx.translate(14, padding.top + 12);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("deg/s", 0, 0);
  ctx.restore();

  for (let i = 0; i <= 4; i += 1) {
    const xLabel = `${Math.round(-100 + (200 * i) / 4)}%`;
    const yValue = Math.round(maxRate - (2 * maxRate * i) / 4);
    ctx.fillText(xLabel, padding.left + (plotWidth * i) / 4 - 12, height - 18);
    ctx.fillText(`${yValue}`, 12, padding.top + (plotHeight * i) / 4 + 4);
  }

  for (const axis of AXES) {
    ctx.beginPath();
    ctx.strokeStyle = AXIS_COLORS[axis];
    ctx.lineWidth = 3;

    for (let i = 0; i <= 200; i += 1) {
      const stick = -1 + i / 100;
      const rate = sampleAxis(axis, stick);
      const x = padding.left + ((stick + 1) / 2) * plotWidth;
      const y = padding.top + plotHeight / 2 - (rate / maxRate) * (plotHeight / 2);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }

  elements.graphStats.innerHTML = AXES.map((axis) => {
    const color = AXIS_COLORS[axis];
    const center = Math.round(Math.abs(sampleAxis(axis, 0.5)));
    const max = Math.round(sampleAxis(axis, 1));
    return `<span style="color:${color}">${axis}</span> 50% stick ${center} deg/s · max ${max} deg/s`;
  }).join("<br>");
}

function sampleAxis(axis, stick) {
  const values = state.axes[axis];
  if (state.rateType === "ACTUAL") {
    return sampleActual(values, stick);
  }
  return sampleBetaflight(values, stick);
}

function sampleActual(values, stick) {
  const x = clampNumber(stick, -1, 1);
  const xAbs = Math.abs(x);
  const expo = values.expo;
  const expof = xAbs * (Math.pow(x, 5) * expo + x * (1 - expo));
  const maxAdjustment = Math.max(0, values.sRate - values.rcRate);
  return x * values.rcRate + maxAdjustment * expof;
}

function sampleBetaflight(values, stick) {
  const x = clampNumber(stick, -1, 1);
  const xAbs = Math.abs(x);
  const expo = values.expo;
  let rcRate = values.rcRate / 100;
  const superRate = values.sRate / 100;

  if (rcRate > 2) {
    rcRate = rcRate + (rcRate - 2) * 14.54;
  }

  let rcCommand = x;
  if (expo > 0) {
    rcCommand = x * Math.pow(xAbs, 3) * expo + x * (1 - expo);
  }

  const base = 200 * rcRate * rcCommand;
  const superFactor = 1 / Math.max(0.01, 1 - xAbs * superRate);
  return base * superFactor;
}

function updateShareUrl() {
  const url = new URL(window.location.href);
  url.search = serializeState(state).toString();
  elements.shareUrl.value = url.toString();
  elements.shareLabel.textContent = getShareLabel();
}

function updateCliOutput() {
  const lines = [
    "rateprofile 0",
    `# ${getFullShareLabel()}`,
    `# Betaflight ${state.bfVersion}`,
    `set rates_type = ${state.rateType}`,
  ];

  for (const axis of AXES) {
    const values = state.axes[axis];
    lines.push(`set ${axis}_rc_rate = ${Math.round(values.rcRate)}`);
    lines.push(`set ${axis}_expo = ${Math.round(values.expo * 100)}`);
    lines.push(`set ${axis}_srate = ${Math.round(values.sRate)}`);
  }

  lines.push(`set thr_mid = ${Math.round(state.throttle.mid * 100)}`);
  lines.push(`set thr_expo = ${Math.round(state.throttle.expo * 100)}`);
  lines.push("save");
  elements.cliOutput.value = lines.join("\n");
}

function updateSummary() {
  elements.summaryPilot.textContent = getShareLabel();
  elements.summaryName.textContent = state.setupName;
  elements.summaryType.textContent = RATE_MODELS[state.rateType].label;
  elements.summaryRoll.textContent = `${Math.round(sampleAxis("roll", 1))} deg/s`;
}

function serializeState(current) {
  const params = new URLSearchParams();
  params.set("pilot", current.pilotName);
  params.set("name", current.setupName);
  params.set("bf", current.bfVersion);
  params.set("type", current.rateType);
  params.set("link", current.linkedAxes ? "1" : "0");
  params.set("thrMid", formatDecimal(current.throttle.mid, 2));
  params.set("thrEx", formatDecimal(current.throttle.expo, 2));

  for (const axis of AXES) {
    const values = current.axes[axis];
    params.set(`${axis}Rc`, formatDecimal(values.rcRate, 2));
    params.set(`${axis}Sr`, formatDecimal(values.sRate, 2));
    params.set(`${axis}Ex`, formatDecimal(values.expo, 2));
  }

  return params;
}

function loadStateFromUrl() {
  const nextState = cloneState(DEFAULT_STATE);
  const params = new URLSearchParams(window.location.search);
  const requestedType = params.get("type");

  if (requestedType && RATE_MODELS[requestedType]) {
    nextState.rateType = requestedType;
  }

  nextState.pilotName = sanitizePilotName(params.get("pilot") || nextState.pilotName);
  nextState.setupName = sanitizeSetupName(params.get("name") || nextState.setupName);
  nextState.bfVersion = sanitizeVersion(params.get("bf") || nextState.bfVersion);

  if (params.has("link")) {
    nextState.linkedAxes = params.get("link") !== "0";
  }

  nextState.throttle.mid = readNumberParam(params, "thrMid", nextState.throttle.mid);
  nextState.throttle.expo = readNumberParam(params, "thrEx", nextState.throttle.expo);

  for (const axis of AXES) {
    nextState.axes[axis].rcRate = readNumberParam(params, `${axis}Rc`, nextState.axes[axis].rcRate);
    nextState.axes[axis].sRate = readNumberParam(params, `${axis}Sr`, nextState.axes[axis].sRate);
    nextState.axes[axis].expo = readNumberParam(params, `${axis}Ex`, nextState.axes[axis].expo);
  }

  sanitizeState(nextState);
  return nextState;
}

function sanitizeState(current) {
  const fields = RATE_MODELS[current.rateType].fields;
  current.pilotName = sanitizePilotName(current.pilotName);
  current.setupName = sanitizeSetupName(current.setupName);
  current.bfVersion = sanitizeVersion(current.bfVersion);
  current.throttle.mid = clampNumber(current.throttle.mid, 0, 1);
  current.throttle.expo = clampNumber(current.throttle.expo, 0, 1);
  for (const axis of AXES) {
    for (const field of fields) {
      current.axes[axis][field.key] = clampNumber(current.axes[axis][field.key], field.min, field.max);
    }
  }
}

function updateHistory() {
  const nextUrl = new URL(window.location.href);
  nextUrl.search = serializeState(state).toString();
  window.history.replaceState({}, "", nextUrl);
}

function readNumberParam(params, key, fallback) {
  if (!params.has(key)) {
    return fallback;
  }

  const value = Number(params.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function cloneState(source) {
  return JSON.parse(JSON.stringify(source));
}

function sanitizePilotName(value) {
  return `${value || ""}`.trim().replace(/\s+/g, " ").slice(0, 40) || "pilot";
}

function sanitizeSetupName(value) {
  return `${value || ""}`.trim().replace(/\s+/g, " ").slice(0, 60) || "untitled setup";
}

function sanitizeVersion(value) {
  return `${value || ""}`.trim().replace(/[^0-9.]/g, "").slice(0, 12) || "4.5";
}

function getShareLabel() {
  const pilot = state.pilotName.endsWith("s") ? `${state.pilotName}' rates` : `${state.pilotName}'s rates`;
  return pilot;
}

function getFullShareLabel() {
  return `${getShareLabel()} · ${state.setupName}`;
}

function formatDecimal(value, digits) {
  const fixed = Number(value).toFixed(digits);
  return fixed.replace(/\.?0+$/, "");
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

async function copyText(value, successMessage) {
  try {
    await navigator.clipboard.writeText(value);
    setStatus(successMessage);
  } catch (_error) {
    setStatus("copy failed in this browser.");
  }
}

function setStatus(message) {
  elements.statusStrip.textContent = message;
}

function importCliText(text) {
  const lines = `${text || ""}`.split(/\r?\n/);
  let importedAnything = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) {
      continue;
    }

    const match = line.match(/^set\s+([a-zA-Z0-9_]+)\s*=\s*(.+)$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    const value = match[2].trim();
    importedAnything = applyCliValue(key, value) || importedAnything;
  }

  if (!importedAnything) {
    setStatus("no usable rate settings found in pasted cli.");
    return;
  }

  renderAxisInputs();
  refreshAll();
  setStatus("imported cli settings.");
}

function applyCliValue(key, rawValue) {
  const normalizedKey = key.toLowerCase();

  if (normalizedKey === "rates_type") {
    const normalizedValue = rawValue.toUpperCase();
    if (RATE_MODELS[normalizedValue]) {
      state.rateType = normalizedValue;
      return true;
    }
    return false;
  }

  if (normalizedKey === "thr_mid") {
    state.throttle.mid = parseCliPercent(rawValue);
    return true;
  }

  if (normalizedKey === "thr_expo") {
    state.throttle.expo = parseCliPercent(rawValue);
    return true;
  }

  const axisMatch = normalizedKey.match(/^(roll|pitch|yaw)_(rc_rate|expo|srate)$/);
  if (!axisMatch) {
    return false;
  }

  const [, axis, field] = axisMatch;
  const axisState = state.axes[axis];

  if (field === "expo") {
    axisState.expo = parseCliPercent(rawValue);
    return true;
  }

  if (field === "rc_rate") {
    axisState.rcRate = Number(rawValue);
    return Number.isFinite(axisState.rcRate);
  }

  if (field === "srate") {
    axisState.sRate = Number(rawValue);
    return Number.isFinite(axisState.sRate);
  }

  return false;
}

function parseCliPercent(rawValue) {
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  if (numeric > 1) {
    return clampNumber(numeric / 100, 0, 1);
  }

  return clampNumber(numeric, 0, 1);
}
