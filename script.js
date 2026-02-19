const form = document.getElementById("resume-form");
const statusEl = document.getElementById("status");
const langBtn = document.getElementById("lang-btn");
const autoTextareas = document.querySelectorAll("textarea.field");
const listTextareas = document.querySelectorAll("textarea.list-style");
const staticFields = document.querySelectorAll("[data-name]");
const i18nNodes = document.querySelectorAll("[data-i18n]");

const i18n = {
  en: {
    experience: "Experience",
    skills: "Skills",
    education: "Education",
    languages: "Languages",
    certifications_training: "Certifications & Training",
    save: "Save",
    print: "Print",
    not_saved: "Not saved yet",
    loaded: "Loaded saved data",
    saved: "Saved",
    save_failed: "Save failed",
    lang_button: "Deutsch",
  },
  de: {
    experience: "Berufserfahrung",
    skills: "Fahigkeiten",
    education: "Ausbildung",
    languages: "Sprachen",
    certifications_training: "Zertifikate & Schulungen",
    save: "Speichern",
    print: "Drucken",
    not_saved: "Noch nicht gespeichert",
    loaded: "Gespeicherte Daten geladen",
    saved: "Gespeichert",
    save_failed: "Speichern fehlgeschlagen",
    lang_button: "English",
  },
};

let currentLang = "en";

function autoSizeTextarea(el) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function ensureBullets(el) {
  const lines = el.value.split("\n");
  const next = lines.map((line) => {
    const trimmed = line.trimStart();
    if (trimmed === "") return "";
    return trimmed.startsWith("• ") ? trimmed : `• ${trimmed}`;
  });
  const caret = el.selectionStart;
  el.value = next.join("\n");
  if (typeof caret === "number") {
    el.selectionStart = el.selectionEnd = caret;
  }
}

function syncStaticField(name, value) {
  const el = document.querySelector(`[data-name="${CSS.escape(name)}"]`);
  if (el) el.textContent = value;
  const hidden = form.elements[name];
  if (hidden && hidden.type === "hidden") hidden.value = value;
}

function applyUiLanguage(lang) {
  const dict = i18n[lang] || i18n.en;
  i18nNodes.forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (key && dict[key]) node.textContent = dict[key];
  });
  langBtn.textContent = dict.lang_button;
  document.documentElement.lang = lang;
}

function setStatus(key) {
  const dict = i18n[currentLang] || i18n.en;
  statusEl.textContent = dict[key] || dict.not_saved;
}

autoTextareas.forEach((el) => {
  autoSizeTextarea(el);
  el.addEventListener("input", () => autoSizeTextarea(el));
});

listTextareas.forEach((el) => {
  ensureBullets(el);
  autoSizeTextarea(el);
  el.addEventListener("input", () => {
    ensureBullets(el);
    autoSizeTextarea(el);
  });
});

window.addEventListener("beforeprint", () => {
  autoTextareas.forEach((el) => autoSizeTextarea(el));
});

async function loadData(lang) {
  const res = await fetch(`/data?lang=${encodeURIComponent(lang)}`);
  if (!res.ok) return;
  if (res.status === 204) return;
  const data = await res.json();
  for (const [key, value] of Object.entries(data)) {
    const el = form.elements[key];
    if (el) {
      el.value = value;
      if (el.classList.contains("list-style")) ensureBullets(el);
      if (el.tagName === "TEXTAREA") autoSizeTextarea(el);
      if (el.type === "hidden") syncStaticField(key, String(value));
    } else {
      syncStaticField(key, String(value));
    }
  }
  setStatus("loaded");
}

async function switchLanguage(lang) {
  currentLang = lang;
  applyUiLanguage(currentLang);
  await loadData(currentLang);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  staticFields.forEach((el) => {
    const name = el.getAttribute("data-name");
    if (!name) return;
    syncStaticField(name, el.textContent.trim());
  });
  const payload = {};
  new FormData(form).forEach((value, key) => {
    payload[key] = String(value);
  });
  const res = await fetch(`/data?lang=${encodeURIComponent(currentLang)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  setStatus(res.ok ? "saved" : "save_failed");
});

langBtn.addEventListener("click", async () => {
  const nextLang = currentLang === "en" ? "de" : "en";
  await switchLanguage(nextLang);
});

document.getElementById("print-btn").addEventListener("click", () => window.print());

applyUiLanguage(currentLang);
setStatus("not_saved");
loadData(currentLang);
