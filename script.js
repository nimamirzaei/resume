const form = document.getElementById("resume-form");
const statusEl = document.getElementById("status");
const langBtn = document.getElementById("lang-btn");
const profileSelect = document.getElementById("profile-select");
const newResumeBtn = document.getElementById("new-resume-btn");
const addExpBtn = document.getElementById("add-exp-btn");
const experienceList = document.getElementById("experience-list");
const badgeEls = document.querySelectorAll(".badge");
const photoInput = document.getElementById("photo-input");
const photoClearBtn = document.getElementById("photo-clear-btn");
const photoPreview = document.getElementById("photo-preview");
const i18nNodes = document.querySelectorAll("[data-i18n]");

const i18n = {
  en: {
    cover_letter: "COVER LETTER",
    cover_recipient: "Recipient",
    cover_date: "Date",
    cover_subject: "Subject",
    cover_body: "Letter",
    cover_closing: "Closing",
    experience: "EXPERIENCE",
    skills: "SKILLS",
    education: "EDUCATION",
    languages: "LANGUAGES",
    certifications_training: "CERTIFICATIONS & TRAINING",
    interests_hobbies: "INTERESTS / HOBBIES:",
    add_experience: "Add Experience",
    remove_experience: "Remove Experience",
    save: "Save",
    new_resume: "New Resume",
    print: "Export as PDF (Text)",
    photo: "Photo",
    remove_photo: "Remove Photo",
    not_saved: "Not saved yet",
    loaded: "Loaded saved data",
    saved: "Saved",
    created: "Created",
    save_failed: "Save failed",
    profile_empty: "No saved content for this language/profile",
    lang_button: "Deutsch",
    company: "Company profile",
    profile_list: "Saved profiles",
    load_profile: "Load Profile",
    company_placeholder: "default",
    active_profile: "Profile",
    active_language: "Language",
    language_name: "English",
  },
  de: {
    cover_letter: "ANSCHREIBEN",
    cover_recipient: "Empfänger",
    cover_date: "Datum",
    cover_subject: "Betreff",
    cover_body: "Schreiben",
    cover_closing: "Grußformel",
    experience: "BERUFSERFAHRUNG",
    skills: "FÄHIGKEITEN",
    education: "AUSBILDUNG",
    languages: "SPRACHEN",
    certifications_training: "ZERTIFIKATE & SCHULUNGEN",
    interests_hobbies: "INTERESSEN / HOBBYS:",
    add_experience: "Erfahrung hinzufügen",
    remove_experience: "Erfahrung entfernen",
    save: "Speichern",
    new_resume: "Neuer Lebenslauf",
    print: "Als PDF exportieren (Text)",
    photo: "Foto",
    remove_photo: "Foto entfernen",
    not_saved: "Noch nicht gespeichert",
    loaded: "Gespeicherte Daten geladen",
    saved: "Gespeichert",
    created: "Erstellt",
    save_failed: "Speichern fehlgeschlagen",
    profile_empty: "Kein gespeicherter Inhalt für diese Sprache/dieses Profil",
    lang_button: "English",
    company: "Firmenprofil",
    profile_list: "Gespeicherte Profile",
    load_profile: "Profil laden",
    company_placeholder: "default",
    active_profile: "Profil",
    active_language: "Sprache",
    language_name: "Deutsch",
  },
};

let currentLang = "de";
let currentCompany = "default";
const printMirrors = new WeakMap();
const initializedTextareas = new WeakSet();
const initializedEditableFields = new WeakSet();

function getAutoTextareas() {
  return form.querySelectorAll("textarea.field");
}

function getStaticFields() {
  return form.querySelectorAll("[data-name]");
}

function normalizeCompanyName(value) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  const safe = normalized.replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return safe || "default";
}

function profileLabel(name) {
  return name === "default" ? "default" : name;
}

function syncCompany(companyName) {
  currentCompany = normalizeCompanyName(companyName);
  localStorage.setItem("resume_company_profile", currentCompany);
  syncProfileSelectValue();
  renderBadge();
}

function syncProfileSelectValue() {
  if (!profileSelect) return;
  const options = Array.from(profileSelect.options).map((option) => option.value);
  if (!options.includes(currentCompany)) return;
  profileSelect.value = currentCompany;
}

function autoSizeTextarea(el) {
  if (el.classList.contains("role")) {
    el.style.height = "40px";
    return;
  }
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function autoSizeTextareaForPrint(el) {
  el.style.maxHeight = "none";
  el.style.overflow = "hidden";
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 12}px`;
}

function autoSizeAllForPrint() {
  getAutoTextareas().forEach((el) => autoSizeTextareaForPrint(el));
}

function syncPrintMirror(el) {
  const mirror = printMirrors.get(el);
  if (!mirror) return;
  mirror.textContent = el.value || "";
}

function syncAllPrintMirrors() {
  getAutoTextareas().forEach((el) => syncPrintMirror(el));
}

function ensurePrintMirror(el) {
  if (printMirrors.has(el)) {
    syncPrintMirror(el);
    return;
  }
  const mirror = document.createElement("div");
  mirror.className = `${el.className} print-mirror`;
  mirror.setAttribute("data-print-for", el.name);
  el.insertAdjacentElement("afterend", mirror);
  printMirrors.set(el, mirror);
  syncPrintMirror(el);
}

function setupPrintMirrors() {
  getAutoTextareas().forEach((el) => ensurePrintMirror(el));
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

function setupEditableField(el) {
  if (initializedEditableFields.has(el)) return;
  initializedEditableFields.add(el);
  el.addEventListener("input", () => {
    const name = el.getAttribute("data-name");
    if (!name) return;
    syncStaticField(name, el.textContent.trim());
    setStatus("not_saved");
  });
}

function setupTextarea(el) {
  if (initializedTextareas.has(el)) return;
  initializedTextareas.add(el);

  if (el.classList.contains("list-style")) ensureBullets(el);
  autoSizeTextarea(el);
  ensurePrintMirror(el);

  el.addEventListener("input", () => {
    if (el.classList.contains("list-style")) ensureBullets(el);
    autoSizeTextarea(el);
    syncPrintMirror(el);
    setStatus("not_saved");
  });
}

function setupDynamicInputs() {
  setupExperienceRemoveButtons();
  getStaticFields().forEach((el) => setupEditableField(el));
  getAutoTextareas().forEach((el) => setupTextarea(el));
}

function removeExperienceSection(section) {
  if (!section) return;
  section.remove();
  setStatus("not_saved");
}

function ensureExperienceRemoveButton(section) {
  if (!section || section.querySelector(".remove-exp-btn")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "remove-exp-btn";
  button.textContent = (i18n[currentLang] || i18n.en).remove_experience;
  button.addEventListener("click", () => removeExperienceSection(section));
  section.appendChild(button);
}

function setupExperienceRemoveButtons() {
  experienceList
    .querySelectorAll(".section[data-exp-index]")
    .forEach((section) => ensureExperienceRemoveButton(section));
}

function localizeExperienceRemoveButtons() {
  const label = (i18n[currentLang] || i18n.en).remove_experience;
  experienceList.querySelectorAll(".remove-exp-btn").forEach((button) => {
    button.textContent = label;
  });
}

function applyUiLanguage(lang) {
  const dict = i18n[lang] || i18n.en;
  i18nNodes.forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (key && dict[key]) node.textContent = dict[key];
  });
  langBtn.textContent = dict.lang_button;
  document.documentElement.lang = lang;
  localizeExperienceRemoveButtons();
  renderBadge();
}

function setStatus(key) {
  const dict = i18n[currentLang] || i18n.en;
  statusEl.textContent = dict[key] || dict.not_saved;
}

function renderBadge() {
  const dict = i18n[currentLang] || i18n.en;
  const text = `${dict.active_profile}: ${profileLabel(currentCompany)} | ${dict.active_language}: ${dict.language_name}`;
  badgeEls.forEach((el) => {
    el.textContent = text;
  });
}

function setPhotoData(value) {
  const hidden = form.elements.photo_data;
  const data = String(value || "");
  if (hidden) hidden.value = data;
  if (!photoPreview) return;
  if (data) {
    photoPreview.src = data;
    photoPreview.style.display = "block";
    if (photoClearBtn) photoClearBtn.disabled = false;
    return;
  }
  photoPreview.removeAttribute("src");
  photoPreview.style.display = "none";
  if (photoClearBtn) photoClearBtn.disabled = true;
}

function nextExperienceIndex() {
  const indices = Array.from(experienceList.querySelectorAll("[data-exp-index]"))
    .map((node) => Number(node.getAttribute("data-exp-index")))
    .filter((value) => Number.isFinite(value));
  const max = indices.length > 0 ? Math.max(...indices) : 0;
  return max + 1;
}

function createExperienceSection(index, values = {}) {
  const section = document.createElement("div");
  section.className = "section no-lines";
  section.setAttribute("data-exp-index", String(index));
  section.setAttribute("data-dynamic-exp", "true");

  const titleName = `exp${index}_title`;
  const metaName = `exp${index}_meta`;
  const bulletsName = `exp${index}_bullets`;

  section.innerHTML = `
    <h3 class="field title" data-name="${titleName}" contenteditable="true" spellcheck="false"></h3>
    <input type="hidden" name="${titleName}" value="" />
    <p class="field" data-name="${metaName}" contenteditable="true" spellcheck="false"></p>
    <input type="hidden" name="${metaName}" value="" />
    <textarea class="field list-style" name="${bulletsName}"></textarea>
  `;

  experienceList.appendChild(section);

  const titleNode = section.querySelector(`[data-name="${titleName}"]`);
  const metaNode = section.querySelector(`[data-name="${metaName}"]`);
  const titleHidden = section.querySelector(`input[name="${titleName}"]`);
  const metaHidden = section.querySelector(`input[name="${metaName}"]`);
  const bullets = section.querySelector(`textarea[name="${bulletsName}"]`);

  if (titleNode && titleHidden) {
    const titleValue = String(values[titleName] || "");
    titleNode.textContent = titleValue;
    titleHidden.value = titleValue;
  }
  if (metaNode && metaHidden) {
    const metaValue = String(values[metaName] || "");
    metaNode.textContent = metaValue;
    metaHidden.value = metaValue;
  }
  if (bullets) bullets.value = String(values[bulletsName] || "");

  ensureExperienceRemoveButton(section);
  setupDynamicInputs();
  return section;
}

function removeDynamicExperienceSections() {
  experienceList
    .querySelectorAll("[data-dynamic-exp='true']")
    .forEach((section) => section.remove());
}

function ensureExperienceSectionsForData(data) {
  const indices = new Set();
  Object.keys(data).forEach((key) => {
    const match = key.match(/^exp(\d+)_(title|meta|bullets)$/);
    if (!match) return;
    indices.add(Number(match[1]));
  });

  const existing = new Set(
    Array.from(experienceList.querySelectorAll("[data-exp-index]"))
      .map((node) => Number(node.getAttribute("data-exp-index")))
      .filter((value) => Number.isFinite(value))
  );

  Array.from(indices)
    .sort((a, b) => a - b)
    .forEach((index) => {
      if (!existing.has(index) && index > 0) {
        createExperienceSection(index, data);
      }
    });
}

window.addEventListener("beforeprint", () => {
  syncAllPrintMirrors();
  autoSizeAllForPrint();
  setTimeout(autoSizeAllForPrint, 50);
  setTimeout(autoSizeAllForPrint, 150);
  setTimeout(autoSizeAllForPrint, 250);
  setTimeout(autoSizeAllForPrint, 500);
  setTimeout(autoSizeAllForPrint, 900);
});

window.addEventListener("afterprint", () => {
  getAutoTextareas().forEach((el) => autoSizeTextarea(el));
});

const printMedia = window.matchMedia("print");
if (printMedia && typeof printMedia.addEventListener === "function") {
  printMedia.addEventListener("change", (event) => {
    if (event.matches) {
      autoSizeAllForPrint();
      setTimeout(autoSizeAllForPrint, 50);
      setTimeout(autoSizeAllForPrint, 150);
      setTimeout(autoSizeAllForPrint, 250);
      setTimeout(autoSizeAllForPrint, 500);
      setTimeout(autoSizeAllForPrint, 900);
      return;
    }
    getAutoTextareas().forEach((el) => autoSizeTextarea(el));
  });
}

function clearFormFields() {
  removeDynamicExperienceSections();

  Array.from(form.elements).forEach((el) => {
    if (!el.name) return;
    if (el.type === "hidden") {
      el.value = "";
      syncStaticField(el.name, "");
      return;
    }
    if ("value" in el) {
      el.value = "";
      if (el.classList && el.classList.contains("list-style")) ensureBullets(el);
      if (el.tagName === "TEXTAREA") {
        autoSizeTextarea(el);
        syncPrintMirror(el);
      }
    }
  });

  setPhotoData("");
  setupDynamicInputs();
}

async function loadData(lang, company) {
  const res = await fetch(
    `/data?lang=${encodeURIComponent(lang)}&company=${encodeURIComponent(company)}`
  );
  if (!res.ok) return;
  if (res.status === 204) {
    clearFormFields();
    setStatus("profile_empty");
    return false;
  }

  const data = await res.json();
  // Backward compatibility: merge old cover fields into the new single cover_text field.
  if (!Object.prototype.hasOwnProperty.call(data, "cover_text")) {
    const legacyCover = [data.cover_subject, data.cover_body, data.cover_closing]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join("\n\n");
    data.cover_text = legacyCover;
  }
  clearFormFields();
  ensureExperienceSectionsForData(data);

  setPhotoData("");
  for (const [key, value] of Object.entries(data)) {
    if (key === "photo_data") {
      setPhotoData(value);
      continue;
    }
    const el = form.elements[key];
    if (el) {
      el.value = value;
      if (el.classList.contains("list-style")) ensureBullets(el);
      if (el.tagName === "TEXTAREA") {
        autoSizeTextarea(el);
        syncPrintMirror(el);
      }
      if (el.type === "hidden") syncStaticField(key, String(value));
    } else {
      syncStaticField(key, String(value));
    }
  }
  setStatus("loaded");
  return true;
}

async function loadProfileList(lang) {
  if (!profileSelect) return;
  const res = await fetch(`/profiles?lang=${encodeURIComponent(lang)}`);
  if (!res.ok) return [];
  const data = await res.json();
  const profiles = Array.isArray(data.profiles) ? data.profiles : [];
  const withCurrent = new Set([...profiles, currentCompany]);
  profileSelect.innerHTML = "";
  Array.from(withCurrent)
    .sort((a, b) => {
      if (a === "default") return -1;
      if (b === "default") return 1;
      return a.localeCompare(b);
    })
    .forEach((profile) => {
      const option = document.createElement("option");
      option.value = profile;
      option.textContent = profile;
      profileSelect.appendChild(option);
    });
  syncProfileSelectValue();
  return profiles;
}

async function switchLanguage(lang) {
  currentLang = lang;
  applyUiLanguage(currentLang);
  const profiles = await loadProfileList(currentLang);
  if (Array.isArray(profiles) && profiles.length > 0 && !profiles.includes(currentCompany)) {
    currentCompany = profiles[0];
    localStorage.setItem("resume_company_profile", currentCompany);
    syncProfileSelectValue();
    renderBadge();
  }
  await loadData(currentLang, currentCompany);
}

async function switchProfile(companyName) {
  syncCompany(companyName);
  await loadData(currentLang, currentCompany);
}

function emptyPayload() {
  const payload = {};
  Array.from(form.elements).forEach((el) => {
    if (!el.name) return;
    payload[el.name] = "";
  });
  return payload;
}

async function createNewResumeProfile() {
  const label = currentLang === "de" ? "Neuer Profilname:" : "New profile name:";
  const raw = window.prompt(label, "");
  if (raw === null) return;
  const nextProfile = normalizeCompanyName(raw);
  syncCompany(nextProfile);
  const res = await fetch(
    `/data?lang=${encodeURIComponent(currentLang)}&company=${encodeURIComponent(currentCompany)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emptyPayload()),
    }
  );
  if (!res.ok) {
    setStatus("save_failed");
    return;
  }
  await loadProfileList(currentLang);
  await switchProfile(currentCompany);
  setStatus("created");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  syncCompany(currentCompany);

  getStaticFields().forEach((el) => {
    const name = el.getAttribute("data-name");
    if (!name) return;
    syncStaticField(name, el.textContent.trim());
  });

  const payload = {};
  new FormData(form).forEach((value, key) => {
    payload[key] = String(value);
  });
  const res = await fetch(
    `/data?lang=${encodeURIComponent(currentLang)}&company=${encodeURIComponent(currentCompany)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  setStatus(res.ok ? "saved" : "save_failed");
  if (res.ok) await loadProfileList(currentLang);
});

langBtn.addEventListener("click", async () => {
  const nextLang = currentLang === "en" ? "de" : "en";
  await switchLanguage(nextLang);
});

if (profileSelect) {
  profileSelect.addEventListener("change", async () => {
    await switchProfile(profileSelect.value);
  });
}

if (newResumeBtn) {
  newResumeBtn.addEventListener("click", async () => {
    await createNewResumeProfile();
  });
}

if (addExpBtn) {
  addExpBtn.addEventListener("click", () => {
    const index = nextExperienceIndex();
    createExperienceSection(index);
    setStatus("not_saved");
  });
}

if (photoInput) {
  photoInput.addEventListener("change", () => {
    const [file] = photoInput.files || [];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoData(String(reader.result || ""));
      setStatus("not_saved");
    };
    reader.readAsDataURL(file);
  });
}

if (photoClearBtn) {
  photoClearBtn.addEventListener("click", () => {
    setPhotoData("");
    if (photoInput) photoInput.value = "";
    setStatus("not_saved");
  });
}

document.getElementById("print-btn").addEventListener("click", () => window.print());

currentCompany = normalizeCompanyName(localStorage.getItem("resume_company_profile") || "default");
setupDynamicInputs();
applyUiLanguage(currentLang);
setStatus("not_saved");
renderBadge();
setupPrintMirrors();
setPhotoData(form.elements.photo_data ? form.elements.photo_data.value : "");
loadProfileList(currentLang)
  .catch(() => {})
  .then(() => loadData(currentLang, currentCompany));
