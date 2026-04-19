const AXES = ["roll", "pitch", "yaw"];
const SHORTLINK_API_BASE = document
  .querySelector('meta[name="rates-shortlink-api"]')
  ?.getAttribute("content")
  ?.trim();
const AXIS_COLORS = {
  roll: "#93f1c6",
  pitch: "#86c7ff",
  yaw: "#ffbf7e",
};
const THROTTLE_LIMIT_TYPES = new Set(["OFF", "SCALE", "CLIP"]);

const RATE_MODELS = {
  ACTUAL: {
    label: "Actual",
    summary: "Center sensitivity, max rate, and expo.",
    fields: [
      { key: "rcRate", label: "center sensitivity", min: 20, max: 400, step: 1, integer: true },
      { key: "sRate", label: "max rate", min: 50, max: 2000, step: 1, integer: true },
      { key: "expo", label: "expo", min: 0, max: 1, step: 0.01 },
    ],
  },
  BETAFLIGHT: {
    label: "Betaflight",
    summary: "RC rate, super rate, and expo.",
    fields: [
      { key: "rcRate", label: "rc rate", min: 1, max: 255, step: 1, integer: true },
      { key: "sRate", label: "super rate", min: 0, max: 100, step: 1, integer: true },
      { key: "expo", label: "expo", min: 0, max: 1, step: 0.01 },
    ],
  },
};

const DEFAULT_STATE = {
  pilotName: "dyofpv",
  modelName: "air75",
  setupName: "indoor small house",
  bfVersion: "2025.12.1",
  rateType: "ACTUAL",
  linkedAxes: true,
  axes: {
    roll: { rcRate: 73, sRate: 640, expo: 0.32 },
    pitch: { rcRate: 73, sRate: 640, expo: 0.32 },
    yaw: { rcRate: 110, sRate: 600, expo: 0.17 },
  },
  throttle: {
    hover: 0.5,
    mid: 0.5,
    expo: 0.15,
    limitType: "SCALE",
    limitPercent: 80,
  },
};

const elements = {
  subtitle: document.querySelector(".subtitle"),
  pageTitle: document.getElementById("pageTitle"),
  heroMarkers: document.querySelector(".hero-markers"),
  pilotName: document.getElementById("pilotName"),
  modelName: document.getElementById("modelName"),
  setupName: document.getElementById("setupName"),
  bfVersion: document.getElementById("bfVersion"),
  rateType: document.getElementById("rateType"),
  linkedAxes: document.getElementById("linkedAxes"),
  axisGrid: document.getElementById("axisGrid"),
  throttleHover: document.getElementById("throttleHover"),
  throttleMid: document.getElementById("throttleMid"),
  throttleExpo: document.getElementById("throttleExpo"),
  throttleLimitType: document.getElementById("throttleLimitType"),
  throttleLimitPercent: document.getElementById("throttleLimitPercent"),
  throttleCanvas: document.getElementById("throttleCanvas"),
  throttleStats: document.getElementById("throttleStats"),
  curveCanvas: document.getElementById("curveCanvas"),
  shareUrl: document.getElementById("shareUrl"),
  shortAlias: document.getElementById("shortAlias"),
  shareLabel: document.getElementById("shareLabel"),
  cliOutput: document.getElementById("cliOutput"),
  graphDescription: document.getElementById("graphDescription"),
  graphStats: document.getElementById("graphStats"),
  summaryPilotItem: document.getElementById("summaryPilotItem"),
  summaryPilot: document.getElementById("summaryPilot"),
  summaryModel: document.getElementById("summaryModel"),
  summaryName: document.getElementById("summaryName"),
  summaryType: document.getElementById("summaryType"),
  summaryRoll: document.getElementById("summaryRoll"),
  shareViewSection: document.getElementById("shareViewSection"),
  shareFocusGrid: document.getElementById("shareFocusGrid"),
  editSetupLink: document.getElementById("editSetupLink"),
  createShortLinkShareButton: document.getElementById("createShortLinkShareButton"),
  copyShareViewButton: document.getElementById("copyShareViewButton"),
  copyCliShareButton: document.getElementById("copyCliShareButton"),
  createShortLinkButton: document.getElementById("createShortLinkButton"),
  copyShareButton: document.getElementById("copyShareButton"),
  copyCliButton: document.getElementById("copyCliButton"),
  resetButton: document.getElementById("resetButton"),
  cliImportInput: document.getElementById("cliImportInput"),
  importCliButton: document.getElementById("importCliButton"),
  clearCliImportButton: document.getElementById("clearCliImportButton"),
};

const hasInitialStateInUrl = hasShareableStateInUrl();
const isShareView = loadViewFromUrl() === "share";
const state = loadStateFromUrl();

applyViewMode();
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

  elements.modelName.addEventListener("input", () => {
    state.modelName = sanitizeModelName(elements.modelName.value);
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
    refreshAll();
    setStatus(state.linkedAxes ? "roll and pitch are linked." : "roll and pitch are unlinked.");
  });

  elements.throttleHover.addEventListener("input", () => {
    state.throttle.hover = clampNumber(Number(elements.throttleHover.value), 0, 1);
    refreshAll();
  });

  elements.throttleMid.addEventListener("input", () => {
    state.throttle.mid = clampNumber(Number(elements.throttleMid.value), 0, 1);
    refreshAll();
  });

  elements.throttleExpo.addEventListener("input", () => {
    state.throttle.expo = clampNumber(Number(elements.throttleExpo.value), 0, 1);
    refreshAll();
  });

  elements.throttleLimitType.addEventListener("change", () => {
    state.throttle.limitType = normalizeThrottleLimitType(elements.throttleLimitType.value);
    refreshAll();
  });

  elements.throttleLimitPercent.addEventListener("input", () => {
    state.throttle.limitPercent = clampNumber(Number(elements.throttleLimitPercent.value), 1, 100);
    refreshAll();
  });

  elements.copyShareButton.addEventListener("click", async () => {
    await copyText(elements.shareUrl.value, "share url copied.");
  });

  elements.createShortLinkButton.addEventListener("click", async () => {
    await createShortLink();
  });

  elements.createShortLinkShareButton.addEventListener("click", async () => {
    await createShortLink();
  });

  elements.copyShareViewButton.addEventListener("click", async () => {
    await copyText(buildStateUrl({ shareView: true }).toString(), "share url copied.");
  });

  elements.copyCliButton.addEventListener("click", async () => {
    await copyText(elements.cliOutput.value, "cli block copied.");
  });

  elements.copyCliShareButton.addEventListener("click", async () => {
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
  elements.modelName.value = state.modelName;
  elements.setupName.value = state.setupName;
  elements.bfVersion.value = state.bfVersion;
  elements.rateType.value = state.rateType;
  elements.linkedAxes.checked = state.linkedAxes;
  elements.throttleHover.value = formatDecimal(state.throttle.hover, 2);
  elements.throttleMid.value = formatDecimal(state.throttle.mid, 2);
  elements.throttleExpo.value = formatDecimal(state.throttle.expo, 2);
  elements.throttleLimitType.value = state.throttle.limitType;
  elements.throttleLimitPercent.value = String(Math.round(state.throttle.limitPercent));
  elements.graphDescription.textContent = model.summary;
  elements.axisGrid.innerHTML = AXES.map((axis) => renderAxisBlock(axis, model)).join("");

  for (const input of elements.axisGrid.querySelectorAll("input[data-axis][data-key]")) {
    input.addEventListener("input", () => {
      const axis = input.dataset.axis;
      const key = input.dataset.key;
      const field = model.fields.find((candidate) => candidate.key === key);
      const nextValue = sanitizeAxisFieldValue(field, Number(input.value));
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
  updatePageTitle();
  drawGraph();
  drawThrottleGraph();
  updateShareUrl();
  updateCliOutput();
  updateSummary();
  updateShareView();
  updateHistory();
}

function drawGraph() {
  const canvas = elements.curveCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const plottedAxes = getPlottedAxes();
  const padding = { top: 18, right: 18, bottom: 28, left: 18 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxRate = Math.ceil(
    Math.max(...plottedAxes.flatMap(({ axis }) => [Math.abs(sampleAxis(axis, -1)), Math.abs(sampleAxis(axis, 1))])) / 200,
  ) * 200;
  const centerX = padding.left + plotWidth / 2;
  const centerY = padding.top + plotHeight / 2;
  const stickScale = plotWidth / 2;
  const rateScale = plotHeight / 2 / maxRate;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0b0a11";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;

  for (let i = 1; i <= 4; i += 1) {
    const x = padding.left + (plotWidth * i) / 5;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
  }

  for (let i = 1; i <= 2; i += 1) {
    const topY = centerY - (plotHeight * i) / 6;
    const bottomY = centerY + (plotHeight * i) / 6;
    ctx.beginPath();
    ctx.moveTo(padding.left, topY);
    ctx.lineTo(width - padding.right, topY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padding.left, bottomY);
    ctx.lineTo(width - padding.right, bottomY);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.moveTo(centerX, padding.top);
  ctx.lineTo(centerX, height - padding.bottom);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(padding.left, centerY);
  ctx.lineTo(width - padding.right, centerY);
  ctx.stroke();

  ctx.fillStyle = "#a79eb8";
  ctx.font = '10px "JetBrains Mono"';
  ctx.fillText(`${maxRate}`, padding.left + 4, padding.top + 10);
  ctx.fillText("0", padding.left + 4, centerY - 6);
  ctx.fillText(`-${maxRate}`, padding.left + 4, height - padding.bottom - 4);
  ctx.fillText("-100%", padding.left, height - 8);
  ctx.fillText("0", centerX - 3, height - 8);
  ctx.fillText("+100%", width - padding.right - 34, height - 8);

  for (const { axis, color } of plottedAxes) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;

    for (let rc = -500; rc <= 500; rc += 2) {
      const stick = rc / 500;
      const rate = sampleAxis(axis, stick);
      const x = centerX + stick * stickScale;
      const y = centerY - rateScale * rate;
      if (rc === -500) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }

  elements.graphStats.innerHTML = plottedAxes.map(({ axis, color, label }) => {
    const center = Math.round(Math.abs(sampleAxis(axis, 0.5)));
    const max = Math.round(sampleAxis(axis, 1));
    return `<span class="graph-stat"><span style="color:${color}">${label}</span> 50% stick ${center} deg/s · max ${max} deg/s</span>`;
  }).join("");
}

function drawThrottleGraph() {
  const canvas = elements.throttleCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 18, right: 18, bottom: 28, left: 18 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const hover = state.throttle.hover;
  const mid = state.throttle.mid;
  const expo = state.throttle.expo;
  const limitType = state.throttle.limitType;
  const limitPercent = state.throttle.limitPercent;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0b0a11";
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(padding.left, padding.top);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;

  for (let i = 1; i <= 4; i += 1) {
    const x = (plotWidth * i) / 5;
    const y = (plotHeight * i) / 5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, plotHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(plotWidth, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(0, plotHeight);
  ctx.lineTo(plotWidth, 0);
  ctx.stroke();

  ctx.strokeStyle = "#ffbf7e";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let step = 0; step <= 100; step += 1) {
    const stick = step / 100;
    const output = sampleThrottle(stick);
    const x = plotWidth * stick;
    const y = plotHeight * (1 - output);
    if (step === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  const midOutput = sampleThrottle(mid);
  ctx.fillStyle = "#ffbf7e";
  ctx.beginPath();
  ctx.arc(plotWidth * mid, plotHeight * (1 - midOutput), 4, 0, Math.PI * 2);
  ctx.fill();

  if (limitType !== "OFF") {
    ctx.strokeStyle = "rgba(134,199,255,0.5)";
    ctx.lineWidth = 1.5;
    if (limitType === "SCALE") {
      ctx.beginPath();
      ctx.moveTo(plotWidth, plotHeight);
      ctx.lineTo(plotWidth, plotHeight * (1 - limitPercent / 100));
      ctx.stroke();
    } else {
      const clipY = plotHeight * (1 - limitPercent / 100);
      ctx.beginPath();
      ctx.moveTo(0, clipY);
      ctx.lineTo(plotWidth, clipY);
      ctx.stroke();
    }
  }

  ctx.fillStyle = "#a79eb8";
  ctx.font = '10px "JetBrains Mono"';
  ctx.fillText("100", 4, 10);
  ctx.fillText("0", 4, plotHeight - 4);
  ctx.fillText("0", 0, plotHeight + 18);
  ctx.fillText("100", plotWidth - 18, plotHeight + 18);
  ctx.restore();

  elements.throttleStats.innerHTML = [
    `<span class="graph-stat"><span style="color:#ffbf7e">hover point</span> ${formatPercent(hover)}</span>`,
    `<span class="graph-stat"><span style="color:#ffbf7e">throttle mid</span> ${formatPercent(mid)}</span>`,
    `<span class="graph-stat"><span style="color:#ffbf7e">throttle expo</span> ${formatDisplayValue(expo)}</span>`,
    `<span class="graph-stat"><span style="color:#86c7ff">limit</span> ${formatThrottleLimitLabel()}</span>`,
  ].join("");
}

function sampleThrottle(input) {
  const base = sampleThrottleBase(
    clampNumber(input, 0, 1),
    state.throttle.mid,
    state.throttle.hover,
    state.throttle.expo,
  );
  return applyThrottleLimit(base, state.throttle.limitType, state.throttle.limitPercent);
}

function sampleThrottleBase(input, mid, hover, expo) {
  const safeMid = clampNumber(mid, 0.01, 0.99);
  const leftControlY = clampNumber(hover * 0.5 * (expo + 1), 0, 1);
  const rightControlY = clampNumber(1 - (1 - hover) * 0.5 * (expo + 1), 0, 1);

  if (input <= safeMid) {
    const t = input / safeMid;
    return quadraticBezier(0, leftControlY, hover, t);
  }

  const t = (input - safeMid) / (1 - safeMid);
  return quadraticBezier(hover, rightControlY, 1, t);
}

function quadraticBezier(start, control, end, t) {
  const inverse = 1 - t;
  return inverse * inverse * start + 2 * inverse * t * control + t * t * end;
}

function applyThrottleLimit(output, type, percent) {
  const limit = clampNumber(percent, 1, 100) / 100;
  if (type === "SCALE") {
    return output * limit;
  }
  if (type === "CLIP") {
    return Math.min(output, limit);
  }
  return output;
}

function getPlottedAxes() {
  if (state.linkedAxes) {
    return [
      { axis: "roll", color: AXIS_COLORS.roll, label: "roll / pitch" },
      { axis: "yaw", color: AXIS_COLORS.yaw, label: "yaw" },
    ];
  }

  return AXES.map((axis) => ({
    axis,
    color: AXIS_COLORS[axis],
    label: axis,
  }));
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
  const url = buildStateUrl({ shareView: true });
  elements.shareUrl.value = url.toString();
  elements.shareLabel.textContent = getShareLabel();
}

function updateCliOutput() {
  const lines = [
    "rateprofile 0",
    `# ${getFullShareLabel()}`,
    `# model ${state.modelName}`,
    `# Betaflight ${state.bfVersion}`,
    `set rates_type = ${state.rateType}`,
  ];

  for (const axis of AXES) {
    const values = state.axes[axis];
    lines.push(`set ${axis}_rc_rate = ${Math.round(values.rcRate)}`);
    lines.push(`set ${axis}_expo = ${Math.round(values.expo * 100)}`);
    lines.push(`set ${axis}_srate = ${Math.round(values.sRate)}`);
  }

  lines.push(`set thr_hover = ${Math.round(state.throttle.hover * 100)}`);
  lines.push(`set thr_mid = ${Math.round(state.throttle.mid * 100)}`);
  lines.push(`set thr_expo = ${Math.round(state.throttle.expo * 100)}`);
  lines.push(`set throttle_limit_type = ${state.throttle.limitType}`);
  lines.push(`set throttle_limit_percent = ${Math.round(state.throttle.limitPercent)}`);
  lines.push("save");
  elements.cliOutput.value = lines.join("\n");
}

function updateSummary() {
  elements.summaryPilot.textContent = getShareLabel();
  elements.summaryModel.textContent = state.modelName;
  elements.summaryName.textContent = state.setupName;
  elements.summaryType.textContent = RATE_MODELS[state.rateType].label;
  elements.summaryRoll.textContent = `${Math.round(sampleAxis("roll", 1))} deg/s`;
}

function updateShareView() {
  if (!isShareView) {
    return;
  }

  elements.shareFocusGrid.innerHTML = getShareViewCards().join("");
  elements.editSetupLink.href = buildStateUrl({ shareView: false }).toString();
}

function getShareViewCards() {
  const model = RATE_MODELS[state.rateType];
  const cards = [];

  if (state.linkedAxes) {
    cards.push(renderShareAxisCard("roll / pitch", state.axes.roll, model));
  } else {
    cards.push(renderShareAxisCard("roll", state.axes.roll, model));
    cards.push(renderShareAxisCard("pitch", state.axes.pitch, model));
  }

  cards.push(renderShareAxisCard("yaw", state.axes.yaw, model));
  cards.push(renderThrottleCard());
  return cards;
}

function renderShareAxisCard(label, values, model) {
  const rows = model.fields.map((field) => `
    <div class="share-rate-row">
      <span>${field.label}</span>
      <strong>${formatDisplayValue(values[field.key])}</strong>
    </div>
  `).join("");

  return `
    <article class="share-rate-card">
      <h3>${label}</h3>
      <div class="share-rate-rows">${rows}</div>
    </article>
  `;
}

function renderThrottleCard() {
  return `
    <article class="share-rate-card">
      <h3>throttle</h3>
      <div class="share-rate-rows">
        <div class="share-rate-row">
          <span>hover point</span>
          <strong>${formatDisplayValue(state.throttle.hover)}</strong>
        </div>
        <div class="share-rate-row">
          <span>throttle mid</span>
          <strong>${formatDisplayValue(state.throttle.mid)}</strong>
        </div>
        <div class="share-rate-row">
          <span>throttle expo</span>
          <strong>${formatDisplayValue(state.throttle.expo)}</strong>
        </div>
        <div class="share-rate-row">
          <span>throttle limit</span>
          <strong>${formatThrottleLimitLabel()}</strong>
        </div>
      </div>
    </article>
  `;
}

function serializeState(current) {
  const params = new URLSearchParams();
  params.set("pilot", current.pilotName);
  params.set("model", current.modelName);
  params.set("name", current.setupName);
  params.set("bf", current.bfVersion);
  params.set("type", current.rateType);
  params.set("link", current.linkedAxes ? "1" : "0");
  params.set("thrHover", formatDecimal(current.throttle.hover, 2));
  params.set("thrMid", formatDecimal(current.throttle.mid, 2));
  params.set("thrEx", formatDecimal(current.throttle.expo, 2));
  params.set("thrLimitType", current.throttle.limitType);
  params.set("thrLimit", formatDecimal(current.throttle.limitPercent, 0));

  for (const axis of AXES) {
    const values = current.axes[axis];
    params.set(`${axis}Rc`, formatDecimal(values.rcRate, 0));
    params.set(`${axis}Sr`, formatDecimal(values.sRate, 0));
    params.set(`${axis}Ex`, formatDecimal(values.expo, 2));
  }

  return params;
}

function encodeCompactState(current) {
  const throttle = [
    Math.round(current.throttle.hover * 100),
    Math.round(current.throttle.mid * 100),
    Math.round(current.throttle.expo * 100),
  ];
  const throttleLimit = [
    encodeThrottleLimitType(current.throttle.limitType),
    Math.round(current.throttle.limitPercent),
  ];
  const axes = AXES.map((axis) => {
    const values = current.axes[axis];
    return [
      Math.round(values.rcRate * 10),
      Math.round(values.sRate),
      Math.round(values.expo * 100),
    ];
  });

  return [
    "v2",
    encodeURIComponent(current.pilotName),
    encodeURIComponent(current.modelName),
    encodeURIComponent(current.setupName),
    encodeURIComponent(current.bfVersion),
    current.rateType === "ACTUAL" ? "A" : "B",
    current.linkedAxes ? "1" : "0",
    encodeCompactNumberGroup(throttle),
    encodeCompactNumberGroup(throttleLimit),
    ...axes.map((values) => encodeCompactNumberGroup(values)),
  ].join("~");
}

function decodeCompactState(encoded) {
  if (!encoded) {
    return null;
  }

  if (encoded.startsWith("v2~")) {
    return decodeCompactStateV2(encoded);
  }

  if (encoded.startsWith("v1~")) {
    return decodeCompactStateV1(encoded);
  }

  try {
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return payload;
  } catch (_error) {
    return null;
  }
}

function decodeCompactStateV1(encoded) {
  try {
    const parts = encoded.split("~");
    if (parts.length !== 10 || parts[0] !== "v1") {
      return null;
    }

    const rateType = parts[4] === "A" ? "ACTUAL" : "BETAFLIGHT";
    const throttle = decodeCompactNumberGroup(parts[6]);
    const axes = parts.slice(7).map((group) => decodeCompactNumberGroup(group));

    return {
      p: decodeURIComponent(parts[1]),
      m: DEFAULT_STATE.modelName,
      n: decodeURIComponent(parts[2]),
      b: decodeURIComponent(parts[3]),
      t: rateType,
      l: parts[5] === "1" ? 1 : 0,
      th: [
        (throttle[0] ?? 50) / 100,
        (throttle[1] ?? 50) / 100,
        (throttle[2] ?? 25) / 100,
      ],
      a: axes.map((values, index) => {
        const defaults = DEFAULT_STATE.axes[AXES[index]];
        return [
          (values[0] ?? Math.round(defaults.rcRate * 10)) / 10,
          values[1] ?? Math.round(defaults.sRate),
          (values[2] ?? Math.round(defaults.expo * 100)) / 100,
        ];
      }),
    };
  } catch (_error) {
    return null;
  }
}

function decodeCompactStateV2(encoded) {
  try {
    const parts = encoded.split("~");
    if (parts.length !== 12 || parts[0] !== "v2") {
      return null;
    }

    const rateType = parts[5] === "A" ? "ACTUAL" : "BETAFLIGHT";
    const throttle = decodeCompactNumberGroup(parts[7]);
    const throttleLimit = decodeCompactNumberGroup(parts[8]);
    const axes = parts.slice(9).map((group) => decodeCompactNumberGroup(group));

    return {
      p: decodeURIComponent(parts[1]),
      m: decodeURIComponent(parts[2]),
      n: decodeURIComponent(parts[3]),
      b: decodeURIComponent(parts[4]),
      t: rateType,
      l: parts[6] === "1" ? 1 : 0,
      th: [
        (throttle[0] ?? 50) / 100,
        (throttle[1] ?? 50) / 100,
        (throttle[2] ?? 25) / 100,
      ],
      tl: [
        decodeThrottleLimitType(throttleLimit[0]),
        throttleLimit[1] ?? 100,
      ],
      a: axes.map((values, index) => {
        const defaults = DEFAULT_STATE.axes[AXES[index]];
        return [
          (values[0] ?? Math.round(defaults.rcRate * 10)) / 10,
          values[1] ?? Math.round(defaults.sRate),
          (values[2] ?? Math.round(defaults.expo * 100)) / 100,
        ];
      }),
    };
  } catch (_error) {
    return null;
  }
}

function encodeCompactNumberGroup(values) {
  return values.map((value) => Math.max(0, value).toString(36)).join(".");
}

function decodeCompactNumberGroup(group) {
  return `${group || ""}`.split(".").map((token) => parseInt(token, 36));
}

function applyCompactState(payload, nextState) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  if (payload.t && RATE_MODELS[payload.t]) {
    nextState.rateType = payload.t;
  }

  nextState.pilotName = sanitizePilotName(payload.p || nextState.pilotName);
  nextState.modelName = sanitizeModelName(payload.m || nextState.modelName);
  nextState.setupName = sanitizeSetupName(payload.n || nextState.setupName);
  nextState.bfVersion = sanitizeVersion(payload.b || nextState.bfVersion);
  nextState.linkedAxes = payload.l !== 0;

  if (Array.isArray(payload.th)) {
    nextState.throttle.hover = Number.isFinite(payload.th[0]) ? payload.th[0] : nextState.throttle.hover;
    nextState.throttle.mid = Number.isFinite(payload.th[1]) ? payload.th[1] : nextState.throttle.mid;
    nextState.throttle.expo = Number.isFinite(payload.th[2]) ? payload.th[2] : nextState.throttle.expo;
  }

  if (Array.isArray(payload.tl)) {
    nextState.throttle.limitType = normalizeThrottleLimitType(payload.tl[0]);
    nextState.throttle.limitPercent = Number.isFinite(payload.tl[1])
      ? payload.tl[1]
      : nextState.throttle.limitPercent;
  }

  if (Array.isArray(payload.a)) {
    AXES.forEach((axis, index) => {
      const values = payload.a[index];
      if (!Array.isArray(values)) {
        return;
      }
      nextState.axes[axis].rcRate = Number.isFinite(values[0]) ? values[0] : nextState.axes[axis].rcRate;
      nextState.axes[axis].sRate = Number.isFinite(values[1]) ? values[1] : nextState.axes[axis].sRate;
      nextState.axes[axis].expo = Number.isFinite(values[2]) ? values[2] : nextState.axes[axis].expo;
    });
  }

  sanitizeState(nextState);
  return true;
}

function buildStateUrl({ shareView }) {
  const url = new URL(window.location.href);
  const params = serializeState(state);

  if (shareView) {
    params.set("view", "share");
  }

  url.search = params.toString();
  return url;
}

function loadStateFromUrl() {
  const nextState = cloneState(DEFAULT_STATE);
  const params = new URLSearchParams(window.location.search);
  const compactState = decodeCompactState(params.get("s"));

  if (applyCompactState(compactState, nextState)) {
    return nextState;
  }

  const requestedType = params.get("type");

  if (requestedType && RATE_MODELS[requestedType]) {
    nextState.rateType = requestedType;
  }

  nextState.pilotName = sanitizePilotName(params.get("pilot") || nextState.pilotName);
  nextState.modelName = sanitizeModelName(params.get("model") || nextState.modelName);
  nextState.setupName = sanitizeSetupName(params.get("name") || nextState.setupName);
  nextState.bfVersion = sanitizeVersion(params.get("bf") || nextState.bfVersion);

  if (params.has("link")) {
    nextState.linkedAxes = params.get("link") !== "0";
  }

  nextState.throttle.hover = readNumberParam(params, "thrHover", nextState.throttle.hover);
  nextState.throttle.mid = readNumberParam(params, "thrMid", nextState.throttle.mid);
  nextState.throttle.expo = readNumberParam(params, "thrEx", nextState.throttle.expo);
  nextState.throttle.limitType = normalizeThrottleLimitType(params.get("thrLimitType") || nextState.throttle.limitType);
  nextState.throttle.limitPercent = readNumberParam(params, "thrLimit", nextState.throttle.limitPercent);

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
  current.modelName = sanitizeModelName(current.modelName);
  current.setupName = sanitizeSetupName(current.setupName);
  current.bfVersion = sanitizeVersion(current.bfVersion);
  current.throttle.hover = clampNumber(current.throttle.hover, 0, 1);
  current.throttle.mid = clampNumber(current.throttle.mid, 0, 1);
  current.throttle.expo = clampNumber(current.throttle.expo, 0, 1);
  current.throttle.limitType = normalizeThrottleLimitType(current.throttle.limitType);
  current.throttle.limitPercent = clampNumber(current.throttle.limitPercent, 1, 100);
  for (const axis of AXES) {
    for (const field of fields) {
      current.axes[axis][field.key] = sanitizeAxisFieldValue(field, current.axes[axis][field.key]);
    }
  }
}

function updateHistory() {
  if (!hasInitialStateInUrl && !isShareView && isDefaultState(state)) {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.search = "";
    window.history.replaceState({}, "", cleanUrl);
    return;
  }

  const nextUrl = buildStateUrl({ shareView: isShareView });
  window.history.replaceState({}, "", nextUrl);
}

function loadViewFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("view") || "edit";
}

function hasShareableStateInUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.has("s") || params.has("type") || params.has("pilot") || params.has("model") || params.has("name");
}

function applyViewMode() {
  document.body.classList.toggle("share-view", isShareView);
  elements.shareViewSection.hidden = !isShareView;
  elements.subtitle.hidden = true;
  elements.heroMarkers.hidden = true;
  elements.subtitle.textContent = "";
  elements.heroMarkers.innerHTML = "";
}

function updatePageTitle() {
  elements.pageTitle.textContent = isShareView ? getShareLabel() : "fpv rates tool";
  elements.summaryPilotItem.hidden = isShareView;
  document.title = isShareView
    ? `${getShareLabel()} | shared FPV rates setup`
    : "rates | FPV rates tool for Betaflight and Actual rates";
}

function readNumberParam(params, key, fallback) {
  if (!params.has(key)) {
    return fallback;
  }

  const value = Number(params.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeAxisFieldValue(field, value) {
  const clamped = clampNumber(value, field.min, field.max);
  if (field.integer) {
    return Math.round(clamped);
  }
  return clamped;
}

function cloneState(source) {
  return JSON.parse(JSON.stringify(source));
}

function sanitizePilotName(value) {
  return `${value || ""}`.trim().replace(/\s+/g, " ").slice(0, 40) || "pilot";
}

function sanitizeModelName(value) {
  return `${value || ""}`.trim().replace(/\s+/g, " ").slice(0, 40) || "air75";
}

function sanitizeSetupName(value) {
  return `${value || ""}`.trim().replace(/\s+/g, " ").slice(0, 60) || "untitled setup";
}

function sanitizeVersion(value) {
  return `${value || ""}`.trim().replace(/[^0-9.]/g, "").slice(0, 12) || "2025.12.1";
}

function getShareLabel() {
  const pilot = state.pilotName.endsWith("s") ? `${state.pilotName}' rates` : `${state.pilotName}'s rates`;
  return pilot;
}

function getFullShareLabel() {
  return `${getShareLabel()} · ${state.setupName}`;
}

function formatThrottleLimitLabel() {
  if (state.throttle.limitType === "OFF") {
    return "off";
  }
  return `${state.throttle.limitType.toLowerCase()} ${Math.round(state.throttle.limitPercent)}%`;
}

function formatDecimal(value, digits) {
  const fixed = Number(value).toFixed(digits);
  if (digits === 0 || !fixed.includes(".")) {
    return fixed;
  }
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*?[1-9])0+$/, "$1");
}

function formatDisplayValue(value) {
  return formatDecimal(value, 2);
}

function formatPercent(value) {
  return `${Math.round(clampNumber(value, 0, 1) * 100)}%`;
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function normalizeThrottleLimitType(value) {
  const normalized = `${value || ""}`.trim().toUpperCase();
  if (normalized === "1") {
    return "SCALE";
  }
  if (normalized === "2") {
    return "CLIP";
  }
  if (normalized === "0") {
    return "OFF";
  }
  return THROTTLE_LIMIT_TYPES.has(normalized) ? normalized : "OFF";
}

function encodeThrottleLimitType(value) {
  const normalized = normalizeThrottleLimitType(value);
  if (normalized === "SCALE") {
    return 1;
  }
  if (normalized === "CLIP") {
    return 2;
  }
  return 0;
}

function decodeThrottleLimitType(value) {
  if (value === 1) {
    return "SCALE";
  }
  if (value === 2) {
    return "CLIP";
  }
  return "OFF";
}

function isDefaultState(current) {
  return JSON.stringify(current) === JSON.stringify(DEFAULT_STATE);
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
  console.info(`[rates] ${message}`);
}

async function createShortLink() {
  if (!SHORTLINK_API_BASE) {
    setStatus("short link api is not configured yet.");
    return;
  }

  const alias = sanitizeShortAlias(elements.shortAlias.value);

  try {
    const response = await fetch(`${SHORTLINK_API_BASE.replace(/\/$/, "")}/api/shorten`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        state: encodeCompactState(state),
        alias,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      if (payload?.error === "alias_taken") {
        setStatus("that custom short link is already taken.");
        return;
      }
      if (payload?.error === "invalid_alias") {
        setStatus("custom short link must be 3-32 chars, lowercase letters, numbers, or hyphens.");
        return;
      }
      throw new Error(`shorten failed: ${response.status}`);
    }

    const payload = await response.json();
    if (!payload?.shortUrl) {
      throw new Error("missing short url");
    }

    elements.shareUrl.value = payload.shortUrl;
    await copyText(payload.shortUrl, "short link copied.");
  } catch (_error) {
    setStatus("failed to create short link.");
  }
}

function sanitizeShortAlias(value) {
  const alias = `${value || ""}`.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  return alias || "";
}

function importCliText(text) {
  const lines = `${text || ""}`.split(/\r?\n/);
  let importedAnything = false;

  for (const rawLine of lines) {
    const line = sanitizeCliLine(rawLine);
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
    const mappedType = mapRatesType(normalizedValue);
    if (mappedType && RATE_MODELS[mappedType]) {
      state.rateType = mappedType;
      return true;
    }
    return false;
  }

  if (normalizedKey === "thr_hover") {
    state.throttle.hover = parseCliPercent(rawValue);
    return true;
  }

  if (normalizedKey === "thr_mid") {
    state.throttle.mid = parseCliPercent(rawValue);
    return true;
  }

  if (normalizedKey === "thr_expo") {
    state.throttle.expo = parseCliPercent(rawValue);
    return true;
  }

  if (normalizedKey === "throttle_limit_type") {
    state.throttle.limitType = normalizeThrottleLimitType(rawValue);
    return true;
  }

  if (normalizedKey === "throttle_limit_percent") {
    state.throttle.limitPercent = clampNumber(Number(rawValue), 1, 100);
    return Number.isFinite(Number(rawValue));
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

function sanitizeCliLine(line) {
  return `${line || ""}`
    .replace(/;.*/, "")
    .replace(/#.*/, "")
    .trim();
}

function mapRatesType(value) {
  const cleaned = `${value || ""}`.trim().toUpperCase();
  if (RATE_MODELS[cleaned]) {
    return cleaned;
  }

  const numeric = Number(cleaned);
  if (numeric === 0) {
    return "BETAFLIGHT";
  }
  if (numeric === 4) {
    return "ACTUAL";
  }

  if (cleaned.includes("BETAFLIGHT")) {
    return "BETAFLIGHT";
  }
  if (cleaned.includes("ACTUAL")) {
    return "ACTUAL";
  }

  return null;
}
