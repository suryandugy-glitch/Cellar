"use strict";

const workflows = [
  { id: "inventory-report", required: "order_id and sku" },
  { id: "finance-summary", required: "total_cents and currency" }
];
const samples = {};

const csv = document.querySelector("#csv");
const sampleLabel = document.querySelector("#sample-label");
const buttons = [...document.querySelectorAll("[data-sample]")];
const stages = [...document.querySelectorAll(".stage")];
const results = [...document.querySelectorAll(".result")];
const verdict = document.querySelector("#verdict");
const verdictTitle = document.querySelector("#verdict-title");
const verdictNote = document.querySelector("#verdict-note");
const exitCode = document.querySelector("#exit-code");
const announcer = document.querySelector("#announcer");
const run = document.querySelector("#run");
const fix = document.querySelector("#fix");
const reset = document.querySelector("#reset");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let current = "breaking";
let busy = false;

function setIcon(element, icon) {
  element.querySelector("use").setAttribute("href", "#" + icon);
}

function drawCsv() {
  const { header, rows } = samples[current];
  const table = [header, ...rows].map((values, index) => {
    const row = document.createElement("div");
    row.className = "csv-grid" + (current === "fixed" ? " fixed" : "") + (index === 0 ? " csv-head" : "");
    row.setAttribute("role", "row");
    values.forEach(value => {
      const field = document.createElement("span");
      field.setAttribute("role", index === 0 ? "columnheader" : "cell");
      field.textContent = value;
      if (index === 0 && value === "id" && current === "breaking") field.classList.add("changed");
      if (index === 0 && value === "order_id" && current === "fixed") field.classList.add("restored");
      row.append(field);
    });
    return row;
  });
  csv.replaceChildren(...table);
  sampleLabel.textContent = rows.length + (current === "fixed" ? " rows · fix applied" : " rows · synthetic data");
}

function setStage(index, state) {
  const stage = stages[index];
  const labels = { waiting: "Waiting", active: "Running", complete: "Done" };
  const icons = { waiting: "wait", active: "loader", complete: "check" };
  stage.dataset.state = state;
  stage.querySelector(".stage-state").textContent = labels[state];
  setIcon(stage, icons[state]);
  if (state === "active") stage.setAttribute("aria-current", "step");
  else stage.removeAttribute("aria-current");
}

function setResult(index, state, text, detail) {
  const result = results[index];
  const icons = { waiting: "wait", active: "loader", pass: "check", fail: "close" };
  result.dataset.state = state;
  result.querySelector(".result-state span").textContent = text;
  result.querySelector("p").textContent = detail;
  setIcon(result.querySelector(".result-state"), icons[state]);
}

function setVerdict(state, title, note, exit) {
  verdict.dataset.state = state;
  verdictTitle.textContent = title;
  verdictNote.textContent = note;
  exitCode.textContent = exit === undefined ? "" : "Exit code " + exit;
  setIcon(verdict, state === "working" ? "loader" : state === "block" ? "close" : "shield");
}

function prepare(sample) {
  current = sample;
  drawCsv();
  buttons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.sample === sample)));
  stages.forEach((_, index) => setStage(index, "waiting"));
  workflows.forEach((workflow, index) => {
    results[index].open = false;
    const owner = samples[sample].outcomes[index].owner;
    setResult(index, "waiting", "Waiting", owner + " requires " + workflow.required + ".");
  });
  fix.hidden = true;
  reset.hidden = true;
  setVerdict("ready", "Ready to check", sample === "breaking"
    ? "Run the check to see what happens when an export renames a column."
    : "Run the check to compare this export with both contracts.");
}

function pause(milliseconds, jitter) {
  return new Promise(resolve => setTimeout(resolve, reducedMotion.matches ? 85 : Math.round(milliseconds * jitter)));
}

async function check(sample = current) {
  if (busy) return;
  busy = true;
  prepare(sample);
  buttons.forEach(button => { button.disabled = true; });
  // The run button remains focusable so a keyboard user's focus survives the check.
  run.setAttribute("aria-disabled", "true");
  run.querySelector("span").textContent = "Running check";
  setIcon(run, "loader");

  const jitter = .85 + Math.random() * .3;
  const { outcomes, rows, blocking: blocked } = samples[sample];
  const triage = blocked
    ? "order_id was probably renamed to id. Keep both columns until the inventory import is updated."
    : sample === "fixed" ? "Restoring order_id keeps the inventory import compatible while id is still available." : "Both workflows satisfy their declared contracts.";

  verdict.classList.remove("reveal");
  setStage(0, "active");
  announcer.textContent = "Reading sales.csv.";
  setVerdict("working", "Reading sales.csv", "Cellar reads the header and " + rows.length + " data rows.");
  csv.dataset.scanning = "";
  await pause(620, 1);
  delete csv.dataset.scanning;
  setStage(0, "complete");

  setStage(1, "active");
  announcer.textContent = "Checking inventory and finance contracts.";
  workflows.forEach((workflow, index) => {
    setResult(index, "active", "Checking", outcomes[index].owner + " requires " + workflow.required + ".");
  });
  setVerdict("working", "Checking two contracts", "Inventory and Finance have different required columns.");
  await pause(1080, jitter);
  outcomes.forEach((outcome, index) => {
    const missing = outcome.missing.join(", ");
    const status = outcome.passed ? "Pass" : missing ? "Fail · missing " + missing : "Fail";
    const detail = outcome.passed ? "Required columns and row rules passed." : outcome.issues[0]?.message;
    setResult(index, outcome.passed ? "pass" : "fail", status, outcome.owner + " · " + detail);
  });
  setStage(1, "complete");

  setStage(2, "active");
  announcer.textContent = blocked ? "Inventory failed. Finance passed." : "Inventory and Finance both passed.";
  setVerdict("working", "Triaging results", blocked ? "Looking for a likely replacement for order_id." : "Checking whether either workflow needs a fix.");
  await pause(920, jitter);
  setStage(2, "complete");

  setStage(3, "active");
  setVerdict("working", "Evaluating the release gate", triage);
  await pause(620, jitter);
  setStage(3, "complete");
  setVerdict(blocked ? "block" : "ship", blocked ? "Release blocked" : "Ready to ship", triage, blocked ? 1 : 0);
  verdict.classList.add("reveal");
  announcer.textContent = verdictTitle.textContent + ". " + triage + " " + exitCode.textContent + ".";

  busy = false;
  buttons.forEach(button => { button.disabled = false; });
  run.removeAttribute("aria-disabled");
  run.querySelector("span").textContent = "Replay check";
  setIcon(run, "play");
  fix.hidden = sample !== "breaking" || !blocked;
  reset.hidden = false;
}

function selectSample(sample) {
  if (busy) return;
  prepare(sample);
  run.querySelector("span").textContent = "Run check";
  announcer.textContent = (sample === "breaking" ? "Breaking" : "Passing") + " sample ready.";
}

buttons.forEach(button => button.addEventListener("click", () => selectSample(button.dataset.sample)));
run.addEventListener("click", () => check());
fix.addEventListener("click", () => {
  run.focus();
  check("fixed");
});
reset.addEventListener("click", () => {
  run.focus();
  selectSample(current === "fixed" ? "breaking" : current);
});

async function loadSample(name) {
  const [csvResponse, reportResponse] = await Promise.all([
    fetch("./samples/" + name + ".csv"),
    fetch("./samples/" + name + ".json")
  ]);
  if (!csvResponse.ok || !reportResponse.ok) throw new Error("Sample data is unavailable.");
  const [source, report] = await Promise.all([csvResponse.text(), reportResponse.json()]);
  // The bundled synthetic samples use plain, comma-separated fields.
  const [header, ...rows] = source.trim().split(/\r?\n/).map(line => line.split(","));
  const outcomes = workflows.map(workflow => report.results.find(result => result.integration === workflow.id));
  if (outcomes.some(outcome => !outcome)) throw new Error("The sample report is incomplete.");
  samples[name] = { header, rows, outcomes, blocking: report.blocking };
}

Promise.all(["breaking", "passing", "fixed"].map(loadSample)).then(() => {
  prepare(current);
  run.disabled = false;
  buttons.forEach(button => { button.disabled = false; });
}).catch(() => {
  const message = "Reload the page to retry, or open the full sample reports.";
  setVerdict("ready", "Samples could not load", message);
  announcer.textContent = "Samples could not load. " + message;
});
