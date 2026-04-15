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
      { key: "rcRate", label: "center sensitivity", min: 20, max: 400, step: 1 },
      { key: "sRate", label: "max rate", min: 50, max: 2000, step: 1 },
      { key: "expo", label: "expo", min: 0, max: 100, step: 1 },
    ],
  },
  BETAFLIGHT: {
    label: "Betaflight",
    summary: "Betaflight first pass: rc rate, super rate, and expo.",
    fields: [
      { key: "rcRate", label: "rc rate", min: 1, max: 255, step: 1 },
      { key: "sRate", label: "super rate", min: 0, max: 100, step: 1 },
      { key: "expo", label: "expo", min: 0, max: 100, step: 1 },
    ],
  },
};

const DEFAULT_STATE = {
  rateType: "ACTUAL",
  linkedAxes: true,
  axes: {
    roll: { rcRate: 70, sRate: 670, expo: 0 },
    pitch: { rcRate: 70, sRate: 670, expo: 0 },
    yaw: { rcRate: 60, sRate: 540, expo: 0 },
  },
};

const elements = {
  rateType: document.getElementById("rateType"),
  linkedAxes: document.getElementById("linkedAxes"),
  axisGrid: document.getElementById("axisGrid"),
  curveCanvas: document.getElementById("curveCanvas"),
  shareUrl: document.getElementById("shareUrl"),
  cliOutput: document.getElementById("cliOutput"),
  graphDescription: document.getElementById("graphDescription"),
  graphStats: document.getElementById("graphStats"),
  summaryType: document.getElementById("summaryType"),
  summaryRoll: document.getElementById("summaryRoll"),
  summaryShare: document.getElementById("summaryShare"),
  copyShareButton: document.getElementById("copyShareButton"),
  copyCliButton: document.getElementById("copyCliButton"),
  resetButton: document.getElementById("resetButton"),
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

  elements.linkedAxes.addEventListener("change", () => {
    state.linkedAxes = elements.linkedAxes.checked;
    setStatus(state.linkedAxes ? "roll and pitch are linked." : "roll and pitch are unlinked.");
  });

  elements.copyShareButton.addEventListener("click", async () => {
    await copyText(elements.shareUrl.value, "share url copied.");
  });

  elements.copyCliButton.addEventListener("click", async () => {
    await copyText(elements.cliOutput.value, "cli block copied.");
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
  elements.rateType.value = state.rateType;
  elements.linkedAxes.checked = state.linkedAxes;
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
  const maxRate = Math.max(...AXES.map((axis) => sampleAxis(axis, 1)));

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
  ctx.lineTo(width - padding.right, height - padding.bottom);
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
    const xLabel = `${Math.round((100 * i) / 4)}%`;
    const yValue = Math.round((maxRate * (4 - i)) / 4);
    ctx.fillText(xLabel, padding.left + (plotWidth * i) / 4 - 12, height - 18);
    ctx.fillText(`${yValue}`, 12, padding.top + (plotHeight * i) / 4 + 4);
  }

  for (const axis of AXES) {
    ctx.beginPath();
    ctx.strokeStyle = AXIS_COLORS[axis];
    ctx.lineWidth = 3;

    for (let i = 0; i <= 100; i += 1) {
      const stick = i / 100;
      const rate = sampleAxis(axis, stick);
      const x = padding.left + stick * plotWidth;
      const y = padding.top + plotHeight - (rate / maxRate) * plotHeight;
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
    const center = Math.round(sampleAxis(axis, 0.5));
    const max = Math.round(sampleAxis(axis, 1));
    return `<span style="color:${color}">${axis}</span> center ${center} deg/s · max ${max} deg/s`;
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
  const x = clampNumber(stick, 0, 1);
  const expo = values.expo / 100;
  const shaped = x * (1 - expo) + Math.pow(x, 3) * expo;
  return x * (values.rcRate + (values.sRate - values.rcRate) * shaped);
}

function sampleBetaflight(values, stick) {
  const x = clampNumber(stick, 0, 1);
  const expo = values.expo / 100;
  const rcRate = values.rcRate / 100;
  const superRate = values.sRate / 100;
  const rcCommand = x * (1 - expo) + Math.pow(x, 3) * expo;
  const base = 200 * rcRate * rcCommand;
  const superFactor = 1 / Math.max(0.01, 1 - x * superRate);
  return base * superFactor;
}

function updateShareUrl() {
  const url = new URL(window.location.href);
  url.search = serializeState(state).toString();
  elements.shareUrl.value = url.toString();
  elements.summaryShare.textContent = "url state ready";
}

function updateCliOutput() {
  const lines = [
    "rateprofile 0",
    `set rates_type = ${state.rateType}`,
  ];

  for (const axis of AXES) {
    const values = state.axes[axis];
    lines.push(`set ${axis}_rc_rate = ${Math.round(values.rcRate)}`);
    lines.push(`set ${axis}_expo = ${Math.round(values.expo)}`);
    lines.push(`set ${axis}_srate = ${Math.round(values.sRate)}`);
  }

  lines.push("save");
  elements.cliOutput.value = lines.join("\n");
}

function updateSummary() {
  elements.summaryType.textContent = RATE_MODELS[state.rateType].label;
  elements.summaryRoll.textContent = `${Math.round(sampleAxis("roll", 1))} deg/s`;
}

function serializeState(current) {
  const params = new URLSearchParams();
  params.set("type", current.rateType);
  params.set("link", current.linkedAxes ? "1" : "0");

  for (const axis of AXES) {
    const values = current.axes[axis];
    params.set(`${axis}Rc`, String(values.rcRate));
    params.set(`${axis}Sr`, String(values.sRate));
    params.set(`${axis}Ex`, String(values.expo));
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

  if (params.has("link")) {
    nextState.linkedAxes = params.get("link") !== "0";
  }

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
  const value = Number(params.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function cloneState(source) {
  return JSON.parse(JSON.stringify(source));
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
