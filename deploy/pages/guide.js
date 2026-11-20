"use strict";

const shells = [...document.querySelectorAll("[data-shell]")];
const commands = document.querySelector("#commands");
const copy = document.querySelector("#copy");
const copyStatus = document.querySelector("#copy-status");
const cloneCommands = commands.textContent.split("\n").slice(0, 2).join("\n");
let copyTimer;

shells.forEach(button => button.addEventListener("click", () => {
  const selected = button.dataset.shell;
  shells.forEach(other => other.setAttribute("aria-pressed", String(other === button)));
  commands.textContent = cloneCommands + "\n" + (selected === "windows" ? ".\\run.bat" : "sh run.sh");
  clearTimeout(copyTimer);
  copy.textContent = "Copy";
  copyStatus.textContent = "";
}));

async function copyCommands(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Static file previews may require the selection-based fallback.
    }
  }
  const field = document.createElement("textarea");
  field.className = "sr-only";
  field.value = text;
  field.setAttribute("readonly", "");
  document.body.append(field);
  field.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
    copy.focus();
  }
}

copy.addEventListener("click", async () => {
  const text = commands.textContent;
  const copied = await copyCommands(text);
  if (text !== commands.textContent) return;
  clearTimeout(copyTimer);
  copy.textContent = copied ? "Copied" : "Select to copy";
  copyStatus.textContent = copied ? "Commands copied." : "Select the commands and copy them manually.";
  copyTimer = setTimeout(() => { copy.textContent = "Copy"; }, 1700);
});

copy.hidden = false;
