const form = document.getElementById("resume-form");
const statusEl = document.getElementById("status");
const langBtn = document.getElementById("lang-btn");
const profileSelect = document.getElementById("profile-select");
const newResumeBtn = document.getElementById("new-resume-btn");
const addExpBtn = document.getElementById("add-exp-btn");
const experienceList = document.getElementById("experience-list");
const styleTargetLabel = document.getElementById("style-target-label");
const styleLiveInfo = document.getElementById("style-live-info");
const styleFontSelect = document.getElementById("style-font");
const styleSizeInput = document.getElementById("style-size");
const styleColorInput = document.getElementById("style-color");
const styleBoldInput = document.getElementById("style-bold");
const badgeEls = document.querySelectorAll(".badge");
const photoInput = document.getElementById("photo-input");
const photoClearBtn = document.getElementById("photo-clear-btn");
const photoPreview = document.getElementById("photo-preview");
const backupDownloadBtn = document.getElementById("backup-download-btn");
const backupRestoreBtn = document.getElementById("backup-restore-btn");
const backupRestoreInput = document.getElementById("backup-restore-input");
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
    style_font: "Font",
    style_size: "Size",
    style_color: "Color",
    style_bold: "Bold",
    style_selected: "Selected",
    style_selected_none: "Selected: none",
    style_live_none: "Size: -",
    style_live: "Size",
    load_profile: "Load Profile",
    company_placeholder: "default",
    active_profile: "Profile",
    active_language: "Language",
    language_name: "English",
    backup_download: "Download Backup",
    backup_restore: "Restore Backup",
    backup_saved: "Backup downloaded",
    backup_failed: "Backup failed",
    restore_done: "Backup restored",
    restore_failed: "Restore failed",
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
    style_font: "Schrift",
    style_size: "Größe",
    style_color: "Farbe",
    style_bold: "Fett",
    style_selected: "Ausgewählt",
    style_selected_none: "Ausgewählt: keiner",
    style_live_none: "Größe: -",
    style_live: "Größe",
    load_profile: "Profil laden",
    company_placeholder: "default",
    active_profile: "Profil",
    active_language: "Sprache",
    language_name: "Deutsch",
    backup_download: "Backup herunterladen",
    backup_restore: "Backup wiederherstellen",
    backup_saved: "Backup heruntergeladen",
    backup_failed: "Backup fehlgeschlagen",
    restore_done: "Backup wiederhergestellt",
    restore_failed: "Wiederherstellung fehlgeschlagen",
  },
};

let currentLang = "de";
let currentCompany = "default";
const printMirrors = new WeakMap();
const richEditors = new WeakMap();
const initializedTextareas = new WeakSet();
const initializedEditableFields = new WeakSet();
let styleSettings = {};
let activeStyleTargetKey = "";
let lastRichSelectionRange = null;

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
  const rich = richEditors.get(el);
  if (rich) return;
  if (el.classList.contains("role")) {
    el.style.height = "40px";
    return;
  }
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function autoSizeTextareaForPrint(el) {
  const rich = richEditors.get(el);
  if (rich) return;
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
  const rich = richEditors.get(el);
  if (rich) {
    if (isLinkifiedContactField(el.name)) {
      renderContactPrintMirror(el, mirror, rich);
      applyStyleToElementByKey(el.name, mirror);
      return;
    }
    mirror.innerHTML = rich.innerHTML || "";
    return;
  }
  mirror.textContent = el.value || "";
  applyStyleToElementByKey(el.name, mirror);
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
  applyStyleToElementByKey(el.name, mirror);
  syncPrintMirror(el);
}

function setupPrintMirrors() {
  getAutoTextareas().forEach((el) => ensurePrintMirror(el));
}

function normalizeListText(value) {
  const decoded = decodeHtmlEntitiesRepeatedly(String(value || ""));
  return decoded
    .replace(/\r\n?/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li)>\s*<(div|p|li)[^>]*>/gi, "\n")
    .replace(/<(div|p|li)[^>]*>/gi, "")
    .replace(/<\/(div|p|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
}

function ensureBullets(el) {
  if (richEditors.has(el)) return;
  const lines = normalizeListText(el.value).split("\n");
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function decodeHtmlEntitiesRepeatedly(value) {
  let current = String(value || "");
  for (let i = 0; i < 5; i += 1) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = current;
    const decoded = textarea.value;
    if (decoded === current) break;
    current = decoded;
  }
  return current;
}

function toEditableHtml(value) {
  const raw = String(value || "");
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  const normalized = decodeHtmlEntitiesRepeatedly(raw);
  return escapeHtml(normalized).replace(/\n/g, "<br>");
}

function createLinkifiedTextFragment(text, doc) {
  const fragment = doc.createDocumentFragment();
  const value = String(text || "");
  const pattern =
    /((https?:\/\/|www\.)[^\s<]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b(?:[A-Z0-9-]+\.)+[A-Z]{2,}(?:\/[^\s<]*)?)/gi;
  let lastIndex = 0;
  let matched = false;
  let match = pattern.exec(value);
  while (match) {
    const token = match[0];
    const cleaned = token.replace(/[.,;:!?]+$/g, "");
    const trailing = token.slice(cleaned.length);
    const start = match.index;
    const end = start + token.length;
    if (start > lastIndex) {
      fragment.appendChild(doc.createTextNode(value.slice(lastIndex, start)));
    }
    if (!cleaned) {
      fragment.appendChild(doc.createTextNode(token));
      lastIndex = end;
      match = pattern.exec(value);
      continue;
    }
    const anchor = doc.createElement("a");
    const isEmail =
      cleaned.includes("@") && !/^https?:\/\//i.test(cleaned) && !/^www\./i.test(cleaned);
    const href = isEmail
      ? `mailto:${cleaned}`
      : /^https?:\/\//i.test(cleaned)
        ? cleaned
        : `https://${cleaned}`;
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.setAttribute("contenteditable", "false");
    anchor.className = "contact-link";
    anchor.textContent = cleaned;
    fragment.appendChild(anchor);
    if (trailing) fragment.appendChild(doc.createTextNode(trailing));
    lastIndex = end;
    matched = true;
    match = pattern.exec(value);
  }
  if (!matched) return null;
  if (lastIndex < value.length) {
    fragment.appendChild(doc.createTextNode(value.slice(lastIndex)));
  }
  return fragment;
}

function normalizeContactHref(href, text) {
  const rawHref = String(href || "").trim();
  if (rawHref) {
    if (/^(https?:|mailto:)/i.test(rawHref)) return rawHref;
    if (rawHref.includes("@")) return `mailto:${rawHref}`;
    return `https://${rawHref}`;
  }
  const rawText = String(text || "").trim();
  if (!rawText) return "";
  if (rawText.includes("@")) return `mailto:${rawText}`;
  if (/^https?:\/\//i.test(rawText)) return rawText;
  return `https://${rawText}`;
}

function isLinkifiedContactField(name) {
  return (
    name === "contact" ||
    name === "cover_recipient" ||
    name === "cover_text" ||
    name === "cover_date"
  );
}

function normalizeContactAnchors(rich) {
  if (!rich || !isLinkifiedContactField(rich.getAttribute("data-rich-name") || "")) return;
  rich.querySelectorAll("a").forEach((anchor) => {
    const normalizedHref = normalizeContactHref(anchor.getAttribute("href"), anchor.textContent);
    if (!normalizedHref) return;
    anchor.setAttribute("href", normalizedHref);
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
    anchor.setAttribute("contenteditable", "false");
    anchor.classList.add("contact-link");
  });
}

function linkifyContactRichField(rich) {
  if (!rich || !isLinkifiedContactField(rich.getAttribute("data-rich-name") || "")) return false;
  normalizeContactAnchors(rich);
  const walker = document.createTreeWalker(rich, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (parent && !parent.closest("a")) textNodes.push(node);
    node = walker.nextNode();
  }
  let changed = false;
  textNodes.forEach((textNode) => {
    const replacement = createLinkifiedTextFragment(textNode.nodeValue, document);
    if (!replacement) return;
    textNode.replaceWith(replacement);
    changed = true;
  });
  return changed;
}

function findAnchorFromEventTarget(target) {
  if (!target) return null;
  if (target instanceof HTMLAnchorElement) return target;
  if (target instanceof Element) return target.closest("a");
  if (target.nodeType === Node.TEXT_NODE && target.parentElement) {
    return target.parentElement.closest("a");
  }
  return null;
}

function openLinkFromAnchor(anchor) {
  if (!anchor) return false;
  const href = (anchor.getAttribute("href") || "").trim();
  if (!href) return false;
  const opened = window.open(href, "_blank", "noopener,noreferrer");
  if (!opened) window.location.href = href;
  return true;
}

function renderContactPrintMirror(el, mirror, rich) {
  const visibleText = rich ? String(rich.innerText || rich.textContent || "") : String(el.value || "");
  const normalized = visibleText.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const container = document.createElement("div");
  lines.forEach((line) => {
    const row = document.createElement("div");
    row.className = "print-link-line";
    const fragment = createLinkifiedTextFragment(line, document);
    if (fragment) row.appendChild(fragment);
    else row.appendChild(document.createTextNode(line));
    container.appendChild(row);
  });
  mirror.innerHTML = container.innerHTML;
}

function syncRichToTextarea(textarea) {
  const rich = richEditors.get(textarea);
  if (!rich) return;
  const html = rich.innerHTML || "";
  textarea.value = /<[a-z][\s\S]*>/i.test(html) ? html : rich.textContent || "";
  syncPrintMirror(textarea);
}

function setupRichEditor(textarea) {
  if (richEditors.has(textarea)) return;
  const rich = document.createElement("div");
  rich.className = `${textarea.className} rich-field`;
  rich.setAttribute("contenteditable", "true");
  rich.setAttribute("spellcheck", "false");
  rich.setAttribute("data-rich-name", textarea.name || "");
  rich.innerHTML = toEditableHtml(textarea.value || "");
  normalizeContactAnchors(rich);
  linkifyContactRichField(rich);
  textarea.classList.add("field-storage");
  textarea.setAttribute("aria-hidden", "true");
  textarea.tabIndex = -1;
  textarea.insertAdjacentElement("afterend", rich);
  richEditors.set(textarea, rich);
  syncRichToTextarea(textarea);

  const sync = () => {
    if (isLinkifiedContactField(textarea.name)) linkifyContactRichField(rich);
    syncRichToTextarea(textarea);
    setStatus("not_saved");
  };
  rich.addEventListener("input", sync);
  rich.addEventListener("blur", () => {
    if (linkifyContactRichField(rich)) syncRichToTextarea(textarea);
    setStatus("not_saved");
  });
  rich.addEventListener("click", (event) => {
    if (!isLinkifiedContactField(textarea.name)) return;
    const link = findAnchorFromEventTarget(event.target);
    if (!link) return;
    event.preventDefault();
    openLinkFromAnchor(link);
  });
  rich.addEventListener("mousedown", (event) => {
    if (!isLinkifiedContactField(textarea.name)) return;
    const link = findAnchorFromEventTarget(event.target);
    if (!link) return;
    event.preventDefault();
    openLinkFromAnchor(link);
  });
  rich.addEventListener("auxclick", (event) => {
    if (!isLinkifiedContactField(textarea.name)) return;
    const link = findAnchorFromEventTarget(event.target);
    if (!link) return;
    event.preventDefault();
    openLinkFromAnchor(link);
  });
  rich.addEventListener("keydown", (event) => {
    if (!isLinkifiedContactField(textarea.name)) return;
    if (event.key !== "Enter") return;
    const selection = window.getSelection();
    const node = selection && selection.anchorNode ? selection.anchorNode : null;
    const link = findAnchorFromEventTarget(node);
    if (!link) return;
    event.preventDefault();
    openLinkFromAnchor(link);
  });
  rich.addEventListener("mouseup", () => rememberRichSelectionRange());
  rich.addEventListener("keyup", () => rememberRichSelectionRange());
  rich.addEventListener("pointerup", () => rememberRichSelectionRange());
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

  if (!el.classList.contains("list-style")) setupRichEditor(el);
  if (!richEditors.has(el) && el.classList.contains("list-style")) ensureBullets(el);
  autoSizeTextarea(el);
  ensurePrintMirror(el);

  if (richEditors.has(el)) return;
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
  applyAllStyleSettings();
  ensureActiveStyleTarget();
}

function listStylableKeys() {
  const keys = new Set();
  form.querySelectorAll("textarea.field[name]").forEach((el) => {
    if (!el.name) return;
    keys.add(el.name);
  });
  form.querySelectorAll("[data-name]").forEach((el) => {
    const key = el.getAttribute("data-name");
    if (key) keys.add(key);
  });
  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

function getStylableElementsByKey(key) {
  const byName = Array.from(form.querySelectorAll(`[name="${CSS.escape(key)}"]`)).filter(
    (el) => !(el.tagName === "INPUT" && el.type === "hidden")
  );
  const byDataName = Array.from(form.querySelectorAll(`[data-name="${CSS.escape(key)}"]`));
  const byRichName = Array.from(form.querySelectorAll(`[data-rich-name="${CSS.escape(key)}"]`));
  const mirrors = Array.from(form.querySelectorAll(`[data-print-for="${CSS.escape(key)}"]`));
  return [...new Set([...byName, ...byDataName, ...byRichName, ...mirrors])];
}

function applyStyleToElementByKey(key, el) {
  const style = styleSettings[key];
  if (!style) return;
  if (style.fontFamily) el.style.fontFamily = style.fontFamily;
  if (style.fontSize) el.style.fontSize = `${style.fontSize}px`;
  el.style.fontWeight = style.bold ? "700" : "400";
  if (style.color) el.style.color = style.color;
}

function applyStyleToKey(key) {
  const elements = getStylableElementsByKey(key);
  elements.forEach((el) => applyStyleToElementByKey(key, el));
}

function applyAllStyleSettings() {
  Object.keys(styleSettings).forEach((key) => applyStyleToKey(key));
}

function clearAllStyleSettingsFromDom() {
  listStylableKeys().forEach((key) => {
    getStylableElementsByKey(key).forEach((el) => {
      el.style.removeProperty("font-family");
      el.style.removeProperty("font-size");
      el.style.removeProperty("font-weight");
      el.style.removeProperty("color");
    });
  });
}

function normalizeFontFamilyValue(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll('"', "")
    .replaceAll("'", "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstFontToken(value) {
  const normalized = normalizeFontFamilyValue(value);
  const first = normalized.split(",")[0] || "";
  return first.trim();
}

function selectClosestFontOption(fontFamily) {
  if (!styleFontSelect) return;
  const normalized = normalizeFontFamilyValue(fontFamily);
  const first = firstFontToken(fontFamily);
  const options = Array.from(styleFontSelect.options);
  const exact = options.find((option) => normalizeFontFamilyValue(option.value) === normalized);
  if (exact) {
    styleFontSelect.value = exact.value;
    return;
  }
  const partial = options.find((option) => {
    const opt = normalizeFontFamilyValue(option.value);
    const optFirst = firstFontToken(option.value);
    return (
      opt.includes(normalized) ||
      normalized.includes(optFirst) ||
      opt.includes(first) ||
      first.includes(optFirst)
    );
  });
  if (partial) styleFontSelect.value = partial.value;
}

function parseFontSizeValue(rawValue, fallback = 14) {
  const normalized = String(rawValue || "")
    .trim()
    .replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(40, Math.max(8, parsed));
}

function getSelectionStyleElement() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);

  const nodeToElement = (node, offset = 0) => {
    if (!node) return null;
    if (node.nodeType === Node.TEXT_NODE) return node.parentElement;
    if (!(node instanceof Element)) return null;
    if (node.childNodes && node.childNodes.length > 0) {
      const clamped = Math.max(0, Math.min(offset, node.childNodes.length - 1));
      const child = node.childNodes[clamped];
      if (child) {
        if (child.nodeType === Node.TEXT_NODE) return child.parentElement;
        if (child instanceof Element) return child;
      }
    }
    return node;
  };

  const candidates = [
    nodeToElement(selection.anchorNode, selection.anchorOffset || 0),
    nodeToElement(selection.focusNode, selection.focusOffset || 0),
    nodeToElement(range.startContainer, range.startOffset || 0),
    nodeToElement(range.endContainer, range.endOffset || 0),
    nodeToElement(range.commonAncestorContainer, 0),
  ];

  for (const el of candidates) {
    if (!el || !form.contains(el)) continue;
    const richScope = el.closest("[data-rich-name]");
    if (richScope) return el;
  }

  for (const el of candidates) {
    if (el && form.contains(el)) return el;
  }
  return null;
}

function refreshStyleEditorFromSelection() {
  if (!styleFontSelect || !styleSizeInput || !styleBoldInput || !styleColorInput) return;
  const styleElement = isInRichEditingContext() ? getSelectionStyleElement() : null;
  if (styleElement) {
    const cs = window.getComputedStyle(styleElement);
    if (cs.fontFamily) selectClosestFontOption(cs.fontFamily);
    const size = Number.parseFloat(cs.fontSize || "14");
    if (Number.isFinite(size)) {
      const rounded = Math.round(size * 10) / 10;
      styleSizeInput.value = String(rounded);
      const dict = i18n[currentLang] || i18n.en;
      if (styleLiveInfo) styleLiveInfo.textContent = `${dict.style_live}: ${rounded}px`;
    }
    const rawWeight = String(cs.fontWeight || "400").toLowerCase();
    const parsedWeight = Number.parseInt(rawWeight, 10);
    styleBoldInput.checked =
      rawWeight === "bold" || (Number.isFinite(parsedWeight) ? parsedWeight >= 600 : false);
    const colorHex = (() => {
      const raw = String(cs.color || "");
      const m = raw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (!m) return "";
      const toHex = (n) => Number(n).toString(16).padStart(2, "0");
      return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
    })();
    if (/^#[0-9a-f]{6}$/i.test(colorHex)) styleColorInput.value = colorHex;
    return;
  }
  const key = activeStyleTargetKey;
  if (!key) return;
  const style = styleSettings[key];
  if (!style) return;
  if (style.fontFamily) styleFontSelect.value = style.fontFamily;
  if (style.fontSize) styleSizeInput.value = String(style.fontSize);
  styleBoldInput.checked = !!style.bold;
  if (style.color) styleColorInput.value = style.color;
  const dict = i18n[currentLang] || i18n.en;
  if (styleLiveInfo) {
    styleLiveInfo.textContent = style.fontSize
      ? `${dict.style_live}: ${style.fontSize}px`
      : dict.style_live_none;
  }
}

function updateStyleTargetLabel() {
  if (!styleTargetLabel) return;
  const dict = i18n[currentLang] || i18n.en;
  if (!activeStyleTargetKey) {
    styleTargetLabel.textContent = dict.style_selected_none;
    return;
  }
  styleTargetLabel.textContent = `${dict.style_selected}: ${activeStyleTargetKey}`;
}

function updateLiveStyleEmptyLabel() {
  if (!styleLiveInfo) return;
  const dict = i18n[currentLang] || i18n.en;
  styleLiveInfo.textContent = dict.style_live_none;
}

function getStylableKeyFromNode(node) {
  if (!node || !(node instanceof Element)) return "";
  const richNode = node.closest("[data-rich-name]");
  if (richNode) return richNode.getAttribute("data-rich-name") || "";
  const dataNode = node.closest("[data-name]");
  if (dataNode) return dataNode.getAttribute("data-name") || "";
  const namedNode = node.closest("[name]");
  if (!namedNode) return "";
  if (namedNode.tagName === "INPUT" && namedNode.type === "hidden") return "";
  if (!namedNode.classList.contains("field")) return "";
  return namedNode.name || "";
}

function setActiveStyleTargetKey(key) {
  activeStyleTargetKey = key || "";
  refreshStyleEditorFromSelection();
  updateStyleTargetLabel();
}

function ensureActiveStyleTarget() {
  const keys = listStylableKeys();
  if (!activeStyleTargetKey || !keys.includes(activeStyleTargetKey)) {
    setActiveStyleTargetKey(keys[0] || "");
    return;
  }
  updateStyleTargetLabel();
}

function detectActiveStyleTargetFromSelection() {
  const selection = document.getSelection();
  const anchor = selection && selection.anchorNode ? selection.anchorNode : null;
  if (anchor && form.contains(anchor)) {
    const fromSelection = getStylableKeyFromNode(
      anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor
    );
    if (fromSelection) {
      setActiveStyleTargetKey(fromSelection);
      return;
    }
  }
  const active = document.activeElement;
  if (active && form.contains(active)) {
    const fromActive = getStylableKeyFromNode(active);
    if (fromActive) setActiveStyleTargetKey(fromActive);
    else updateLiveStyleEmptyLabel();
    return;
  }
  updateLiveStyleEmptyLabel();
}

function getRichContainerFromRange(range) {
  if (!range) return null;
  const node =
    range.commonAncestorContainer && range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentElement
      : range.commonAncestorContainer;
  if (!node || !node.closest) return null;
  return node.closest("[data-rich-name]");
}

function rememberRichSelectionRange() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (range.collapsed) return;
  if (!range.startContainer || !range.endContainer) return;
  if (!range.startContainer.isConnected || !range.endContainer.isConnected) return;
  const rich = getRichContainerFromRange(range);
  if (!rich) return;
  lastRichSelectionRange = range.cloneRange();
}

function initStyleTargetTracking() {
  const sync = () => {
    window.requestAnimationFrame(() => {
      rememberRichSelectionRange();
      detectActiveStyleTargetFromSelection();
    });
  };
  form.addEventListener("focusin", sync);
  form.addEventListener("mouseup", sync);
  form.addEventListener("keyup", sync);
  form.addEventListener("pointerup", sync);
  document.addEventListener("selectionchange", sync);
}

function refreshStyleTargetOptions() {
  ensureActiveStyleTarget();
  refreshStyleEditorFromSelection();
}

function applySelectedStyle() {
  if (!styleFontSelect || !styleSizeInput || !styleBoldInput || !styleColorInput) return;
  const selection = window.getSelection();
  let range = null;
  if (selection && selection.rangeCount > 0) {
    const current = selection.getRangeAt(0);
    if (!current.collapsed && getRichContainerFromRange(current)) {
      range = current;
    }
  }
  if (!range && lastRichSelectionRange && !lastRichSelectionRange.collapsed) {
    if (
      !lastRichSelectionRange.startContainer ||
      !lastRichSelectionRange.endContainer ||
      !lastRichSelectionRange.startContainer.isConnected ||
      !lastRichSelectionRange.endContainer.isConnected
    ) {
      lastRichSelectionRange = null;
      return false;
    }
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(lastRichSelectionRange);
    }
    range = lastRichSelectionRange;
  }
  if (!range) return false;
  if (range.collapsed) return false;
  const rich = getRichContainerFromRange(range);
  if (!rich) return false;

  const size = parseFontSizeValue(styleSizeInput.value, 14);
  const span = document.createElement("span");
  span.style.fontFamily = styleFontSelect.value;
  span.style.fontSize = `${size}px`;
  span.style.fontWeight = styleBoldInput.checked ? "700" : "400";
  span.style.color = styleColorInput.value || "#0e0f12";
  span.appendChild(range.extractContents());
  range.insertNode(span);
  if (selection) {
    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    selection.addRange(nextRange);
    lastRichSelectionRange = nextRange.cloneRange();
  }

  const key = rich.getAttribute("data-rich-name") || "";
  if (key) {
    const textarea = form.elements[key];
    if (textarea && textarea.tagName === "TEXTAREA") {
      syncRichToTextarea(textarea);
    }
  }
  setStatus("not_saved");
  return true;
}

function isInRichEditingContext() {
  const active = document.activeElement;
  if (active && active.closest && active.closest("[data-rich-name]")) return true;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  return !range.collapsed && !!getRichContainerFromRange(range);
}

function serializeStyleSettings() {
  try {
    return JSON.stringify(styleSettings);
  } catch (_) {
    return "{}";
  }
}

function parseStyleSettings(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const output = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (!value || typeof value !== "object") return;
      const fontFamily = typeof value.fontFamily === "string" ? value.fontFamily : "";
      const fontSize = Number(value.fontSize);
      const color = typeof value.color === "string" ? value.color : "";
      output[key] = {
        fontFamily,
        fontSize: Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 14,
        bold: !!value.bold,
        color: /^#[0-9a-f]{6}$/i.test(color) ? color : "",
      };
    });
    return output;
  } catch (_) {
    return {};
  }
}

function removeExperienceSection(section) {
  if (!section) return;
  section.remove();
  refreshStyleTargetOptions();
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
  updateStyleTargetLabel();
  updateLiveStyleEmptyLabel();
  refreshStyleEditorFromSelection();
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

async function loadSharedPhoto() {
  try {
    const res = await fetch("/photo");
    if (!res.ok) return false;
    if (res.status === 204) {
      setPhotoData("");
      return true;
    }
    const data = await res.text();
    setPhotoData(data);
    return true;
  } catch (_) {
    return false;
  }
}

async function saveSharedPhoto() {
  const photoValue = form.elements.photo_data ? String(form.elements.photo_data.value || "") : "";
  try {
    const res = await fetch("/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_data: photoValue }),
    });
    return res.ok;
  } catch (_) {
    return false;
  }
}

async function downloadBackup() {
  try {
    const res = await fetch("/backup");
    if (!res.ok) return false;
    const blob = await res.blob();
    const contentDisposition = res.headers.get("Content-Disposition") || "";
    const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/i);
    const fileName = fileNameMatch && fileNameMatch[1] ? fileNameMatch[1] : "resume_backup.json";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch (_) {
    return false;
  }
}

async function restoreBackupFile(file) {
  if (!file) return false;
  try {
    const text = await file.text();
    const res = await fetch("/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: text,
    });
    if (!res.ok) return false;
    await loadProfileList(currentLang);
    await loadData(currentLang, currentCompany);
    return true;
  } catch (_) {
    return false;
  }
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
  styleSettings = {};
  clearAllStyleSettingsFromDom();

  Array.from(form.elements).forEach((el) => {
    if (!el.name) return;
    if (el.type === "hidden") {
      el.value = "";
      syncStaticField(el.name, "");
      return;
    }
    if ("value" in el) {
      el.value = "";
      const rich = richEditors.get(el);
      if (rich) rich.innerHTML = "";
      if (!rich && el.classList && el.classList.contains("list-style")) ensureBullets(el);
      if (el.tagName === "TEXTAREA") {
        autoSizeTextarea(el);
        syncPrintMirror(el);
      }
    }
  });

  setupDynamicInputs();
}

async function loadData(lang, company) {
  const res = await fetch(
    `/data?lang=${encodeURIComponent(lang)}&company=${encodeURIComponent(company)}`
  );
  if (!res.ok) return;
  if (res.status === 204) {
    clearFormFields();
    await loadSharedPhoto();
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
  styleSettings = parseStyleSettings(data.__style_settings);
  ensureExperienceSectionsForData(data);

  for (const [key, value] of Object.entries(data)) {
    if (key === "photo_data") continue;
    const el = form.elements[key];
    if (el) {
      el.value = value;
      const rich = richEditors.get(el);
      if (rich) {
        rich.innerHTML = toEditableHtml(value);
        linkifyContactRichField(rich);
        syncRichToTextarea(el);
      }
      if (!rich && el.classList.contains("list-style")) ensureBullets(el);
      if (el.tagName === "TEXTAREA") {
        autoSizeTextarea(el);
        syncPrintMirror(el);
      }
      if (el.type === "hidden") syncStaticField(key, String(value));
    } else {
      syncStaticField(key, String(value));
    }
  }
  applyAllStyleSettings();
  refreshStyleTargetOptions();
  await loadSharedPhoto();
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
    if (el.name === "photo_data") return;
    payload[el.name] = "";
  });
  payload.__style_settings = "{}";
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
    if (key === "photo_data") return;
    payload[key] = String(value);
  });
  payload.__style_settings = serializeStyleSettings();
  const res = await fetch(
    `/data?lang=${encodeURIComponent(currentLang)}&company=${encodeURIComponent(currentCompany)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const photoSaved = await saveSharedPhoto();
  const ok = res.ok && photoSaved;
  setStatus(ok ? "saved" : "save_failed");
  if (ok) await loadProfileList(currentLang);
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
    refreshStyleTargetOptions();
    setStatus("not_saved");
  });
}

function autoApplyStyleFromControls() {
  if (!styleFontSelect || !styleSizeInput || !styleBoldInput || !styleColorInput) return;

  const appliedToSelection = isInRichEditingContext() ? applySelectedStyle() : false;
  if (appliedToSelection) {
    refreshStyleEditorFromSelection();
    return;
  }

  const key = activeStyleTargetKey;
  const size = parseFontSizeValue(styleSizeInput.value, 14);
  const nextStyle = {
    fontFamily: styleFontSelect.value || "",
    fontSize: size,
    bold: !!styleBoldInput.checked,
    color: /^#[0-9a-f]{6}$/i.test(styleColorInput.value) ? styleColorInput.value : "#0e0f12",
  };

  if (key) {
    styleSettings[key] = nextStyle;
    applyStyleToKey(key);
    setStatus("not_saved");
  }
  refreshStyleEditorFromSelection();
}

if (styleFontSelect) {
  styleFontSelect.addEventListener("change", () => {
    autoApplyStyleFromControls();
  });
}

if (styleSizeInput) {
  styleSizeInput.addEventListener("input", () => {
    autoApplyStyleFromControls();
  });
  styleSizeInput.addEventListener("change", () => {
    autoApplyStyleFromControls();
  });
}

if (styleColorInput) {
  styleColorInput.addEventListener("change", () => {
    autoApplyStyleFromControls();
  });
}

if (styleBoldInput) {
  styleBoldInput.addEventListener("change", () => {
    autoApplyStyleFromControls();
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

if (backupDownloadBtn) {
  backupDownloadBtn.addEventListener("click", async () => {
    const ok = await downloadBackup();
    setStatus(ok ? "backup_saved" : "backup_failed");
  });
}

if (backupRestoreBtn && backupRestoreInput) {
  backupRestoreBtn.addEventListener("click", () => {
    backupRestoreInput.click();
  });
}

if (backupRestoreInput) {
  backupRestoreInput.addEventListener("change", async () => {
    const [file] = backupRestoreInput.files || [];
    const ok = await restoreBackupFile(file);
    backupRestoreInput.value = "";
    setStatus(ok ? "restore_done" : "restore_failed");
  });
}

document.getElementById("print-btn").addEventListener("click", () => window.print());

currentCompany = normalizeCompanyName(localStorage.getItem("resume_company_profile") || "default");
setupDynamicInputs();
initStyleTargetTracking();
refreshStyleTargetOptions();
applyUiLanguage(currentLang);
setStatus("not_saved");
renderBadge();
setupPrintMirrors();
loadSharedPhoto().catch(() => {});
loadProfileList(currentLang)
  .catch(() => {})
  .then(() => loadData(currentLang, currentCompany));
