const LOCALE_KEY = 'ph_diag_lang';
const MODS_KEY   = 'ph_diag_enabled_mods';

let _baseData    = null;   // immutable: contents of base.json
let _manifest    = null;   // immutable: contents of mods/manifest.json
let _modCache    = {};     // modId -> immutable mod data file contents
let _activeData  = null;   // mutable merged view (what the UI reads)
let _lang        = localStorage.getItem(LOCALE_KEY) || 'en';
let _baseLocale  = null;   // locale/base/{lang}.json
let _modLocales  = {};     // modId -> locale/mods/{modId}/{lang}.json

// ---------------------------------------------------------------------------
// Initial load
// ---------------------------------------------------------------------------
let _loadPromise = null;

export async function loadData() {
  if (_activeData) return _activeData;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    const [baseJson, manifestJson] = await Promise.all([
      fetch('data/base.json').then(r => { if (!r.ok) throw new Error('Failed to load base data'); return r.json(); }),
      fetch('data/mods/manifest.json').then(r => { if (!r.ok) throw new Error('Failed to load mod manifest'); return r.json(); }),
    ]);
    _baseData = baseJson;
    _manifest = manifestJson;

    // Pre-load any mods that were enabled in a previous session
    const enabled = getEnabledMods();
    if (enabled.size > 0) {
      await Promise.all([...enabled].map(id => _fetchModData(id).catch(() => {})));
    }

    _rebuildActive();

    if (_lang !== 'en') await setLang(_lang);

    return _activeData;
  })();

  return _loadPromise;
}

export function getData() { return _activeData; }
export function getLang()  { return _lang; }

// ---------------------------------------------------------------------------
// Mod data fetching
// ---------------------------------------------------------------------------
async function _fetchModData(modId) {
  if (_modCache[modId]) return;
  const r = await fetch(`data/mods/${modId}.json`);
  if (!r.ok) throw new Error(`Failed to load mod data: ${modId}`);
  _modCache[modId] = await r.json();
}

// ---------------------------------------------------------------------------
// Active dataset assembly
// ---------------------------------------------------------------------------
function _rebuildActive() {
  // Start with shallow copies of base entities so mutations don't corrupt the source
  const active = {
    version:     _baseData.version,
    buildDate:   _baseData.buildDate,
    dataUpdated: _baseData.dataUpdated,
    occurrences: _baseData.occurrences,
    labTestOf:   _baseData.labTestOf,
    ui:          JSON.parse(JSON.stringify(_baseData.ui)),
    departments: {},
    diagnoses:   {},
    symptoms:    {},
    examinations: {},
    treatments:  {},
  };

  for (const [id, e] of Object.entries(_baseData.departments))   active.departments[id]   = { ...e };
  for (const [id, e] of Object.entries(_baseData.diagnoses))     active.diagnoses[id]     = { ...e };
  for (const [id, e] of Object.entries(_baseData.symptoms))      active.symptoms[id]      = { ...e };
  for (const [id, e] of Object.entries(_baseData.examinations))  active.examinations[id]  = { ...e };
  for (const [id, e] of Object.entries(_baseData.treatments))    active.treatments[id]    = { ...e };

  // Merge each enabled mod in turn
  const enabled = getEnabledMods();
  for (const modId of enabled) {
    const modData = _modCache[modId];
    if (!modData) continue;
    _mergeModData(active, modData);
  }

  // Rebuild reverse indexes from the merged symptom set
  active.examToSymptoms      = _buildExamIndex(active.symptoms);
  active.treatmentToSymptoms = _buildTrtIndex(active.symptoms);

  _activeData = active;
}

function _mergeModData(active, modData) {
  // Departments
  for (const [id, d] of Object.entries(modData.departments || {})) {
    active.departments[id] = { ...d };
  }
  // New / additional entities
  for (const [id, e] of Object.entries(modData.diagnoses    || {})) active.diagnoses[id]    = { ...e };
  for (const [id, e] of Object.entries(modData.symptoms     || {})) active.symptoms[id]     = { ...e };
  for (const [id, e] of Object.entries(modData.examinations || {})) active.examinations[id] = { ...e };
  for (const [id, e] of Object.entries(modData.treatments   || {})) active.treatments[id]   = { ...e };

  // Overrides
  const ov = modData.overrides || {};

  // replace: fully swap out an existing entity
  for (const [id, data] of Object.entries(ov.replace?.diagnoses    || {})) active.diagnoses[id]    = { id, ...data };
  for (const [id, data] of Object.entries(ov.replace?.symptoms     || {})) active.symptoms[id]     = { id, ...data };
  for (const [id, data] of Object.entries(ov.replace?.examinations || {})) active.examinations[id] = { id, ...data };
  for (const [id, data] of Object.entries(ov.replace?.treatments   || {})) active.treatments[id]   = { id, ...data };

  // patch: merge specific fields onto an existing entity
  for (const [id, patch] of Object.entries(ov.patch?.diagnoses    || {})) {
    if (active.diagnoses[id]) {
      // Array fields: support {add:[], remove:[]} or direct replacement
      const merged = { ...active.diagnoses[id] };
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'symptoms' && v && typeof v === 'object' && !Array.isArray(v)) {
          // symptoms patch: {add:[...], remove:[...]}
          let arr = [...(merged.symptoms || [])];
          if (v.remove) arr = arr.filter(s => !v.remove.includes(s.symptomRef));
          if (v.add)    arr = arr.concat(v.add);
          merged.symptoms = arr;
        } else {
          merged[k] = v;
        }
      }
      active.diagnoses[id] = merged;
    }
  }
  for (const [id, patch] of Object.entries(ov.patch?.symptoms     || {})) { if (active.symptoms[id])     active.symptoms[id]     = { ...active.symptoms[id],     ...patch }; }
  for (const [id, patch] of Object.entries(ov.patch?.examinations || {})) { if (active.examinations[id]) active.examinations[id] = { ...active.examinations[id], ...patch }; }
  for (const [id, patch] of Object.entries(ov.patch?.treatments   || {})) { if (active.treatments[id])   active.treatments[id]   = { ...active.treatments[id],   ...patch }; }

  // remove: delete entities from the active set
  for (const id of (ov.remove?.diagnoses    || [])) delete active.diagnoses[id];
  for (const id of (ov.remove?.symptoms     || [])) delete active.symptoms[id];
  for (const id of (ov.remove?.examinations || [])) delete active.examinations[id];
  for (const id of (ov.remove?.treatments   || [])) delete active.treatments[id];
}

function _buildExamIndex(syms) {
  const idx = {};
  for (const sym of Object.values(syms)) {
    for (const eid of sym.examinations || []) {
      if (!idx[eid]) idx[eid] = [];
      if (!idx[eid].includes(sym.id)) idx[eid].push(sym.id);
    }
  }
  return idx;
}

function _buildTrtIndex(syms) {
  const idx = {};
  for (const sym of Object.values(syms)) {
    for (const tid of sym.treatments || []) {
      if (!idx[tid]) idx[tid] = [];
      if (!idx[tid].includes(sym.id)) idx[tid].push(sym.id);
    }
  }
  return idx;
}

// ---------------------------------------------------------------------------
// Language / locale
// ---------------------------------------------------------------------------
export async function setLang(lang) {
  _lang = lang;
  localStorage.setItem(LOCALE_KEY, lang);

  if (lang === 'en') {
    _baseLocale = null;
    _modLocales = {};
    _rebuildActive();
    return;
  }

  // Load base locale
  try {
    const r = await fetch(`data/locale/base/${lang}.json`);
    _baseLocale = r.ok ? await r.json() : null;
  } catch { _baseLocale = null; }

  // Load locale for each enabled mod that supports this language
  _modLocales = {};
  const enabled = getEnabledMods();
  await Promise.all([...enabled].map(async modId => {
    const info = _manifest?.[modId];
    if (!info?.localizedLanguages?.includes(lang)) return;
    try {
      const r = await fetch(`data/locale/mods/${modId}/${lang}.json`);
      if (r.ok) _modLocales[modId] = await r.json();
    } catch {}
  }));

  _rebuildActive();
  _applyLocale();
}

function _applyLocale() {
  if (!_activeData || _lang === 'en') return;

  // Only apply locale for currently-enabled mods; stale cached entries are ignored
  const enabled = getEnabledMods();
  const overlays = [
    _baseLocale,
    ...Object.entries(_modLocales)
      .filter(([modId]) => enabled.has(modId))
      .map(([, loc]) => loc),
  ].filter(Boolean);
  for (const overlay of overlays) {
    for (const type of ['diagnoses', 'symptoms', 'examinations', 'treatments']) {
      for (const [id, ov] of Object.entries(overlay[type] || {})) {
        if (!_activeData[type][id]) continue;
        if (ov.name        !== undefined) _activeData[type][id].name        = ov.name;
        if (ov.description !== undefined) _activeData[type][id].description = ov.description;
      }
    }
    for (const [id, ov] of Object.entries(overlay.departments || {})) {
      if (_activeData.departments[id] && ov.name !== undefined) {
        _activeData.departments[id].name = ov.name;
      }
    }
    if (overlay.ui && _activeData.ui) {
      for (const [section, vals] of Object.entries(overlay.ui)) {
        if (_activeData.ui[section]) Object.assign(_activeData.ui[section], vals);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Mod state helpers
// ---------------------------------------------------------------------------
export function getEnabledMods() {
  try { return new Set(JSON.parse(localStorage.getItem(MODS_KEY) || '[]')); }
  catch { return new Set(); }
}

export async function setModEnabled(modId, enabled) {
  const mods = getEnabledMods();
  if (enabled) {
    mods.add(modId);
    localStorage.setItem(MODS_KEY, JSON.stringify([...mods]));
    // Fetch mod data if not already cached, then also its locale
    await _fetchModData(modId);
    if (_lang !== 'en') {
      const info = _manifest?.[modId];
      if (info?.localizedLanguages?.includes(_lang)) {
        try {
          const r = await fetch(`data/locale/mods/${modId}/${_lang}.json`);
          if (r.ok) _modLocales[modId] = await r.json();
        } catch {}
      }
    }
  } else {
    mods.delete(modId);
    localStorage.setItem(MODS_KEY, JSON.stringify([...mods]));
    delete _modLocales[modId];
  }
  _rebuildActive();
  if (_lang !== 'en') _applyLocale();
}

// Kept for backward compat with mods-banner.js (synchronous toggle)
export function setModEnabledSync(modId, enabled) {
  const mods = getEnabledMods();
  enabled ? mods.add(modId) : mods.delete(modId);
  localStorage.setItem(MODS_KEY, JSON.stringify([...mods]));
}

// isEntityVisible: with the new architecture, _activeData only contains entities
// that should be visible, so this is always true for anything in the dataset.
export function isEntityVisible(_entity) { return true; }

export function getAvailableMods() {
  return _manifest ? Object.values(_manifest) : [];
}

export function getModLabel(modId) {
  return _manifest?.[modId]?.name || modId || '';
}

// ---------------------------------------------------------------------------
// Department helpers
// ---------------------------------------------------------------------------
export function getDepts() {
  if (!_activeData) return [];
  return Object.values(_activeData.departments).sort((a, b) => a.order - b.order);
}

export function getSymptomsArray() {
  return Object.values(_activeData.symptoms).sort((a, b) => a.name.localeCompare(b.name));
}

export function diagnosesWithSymptom(symId) {
  return Object.values(_activeData.diagnoses).filter(d =>
    d.symptoms.some(s => s.symptomRef === symId)
  );
}

export function diagnosesWithExam(examId) {
  return Object.values(_activeData.diagnoses).filter(d => d.examinations.includes(examId));
}

export function diagnosesWithTreatment(trtId) {
  return Object.values(_activeData.diagnoses).filter(d => d.treatments.includes(trtId));
}

// ---------------------------------------------------------------------------
// Patient session storage
// ---------------------------------------------------------------------------
const SESSION_KEY = 'ph_diag_sessions';

export function getSessions() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || '[]'); }
  catch { return []; }
}

export function saveSession(session) {
  const sessions = getSessions();
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) sessions[idx] = session;
  else sessions.push(session);
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
}

export function deleteSession(id) {
  const sessions = getSessions().filter(s => s.id !== id);
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
}

export function newSession() {
  return {
    id: crypto.randomUUID(),
    name: '',
    activeDepts: ['DPT_EMERGENCY', 'DPT_INTERNAL_MEDICINE_DEPARTMENT', 'DPT_CARDIOLOGY',
                  'DPT_NEUROLOGY', 'DPT_GENERAL_SURGERY_DEPARTMENT', 'DPT_ORTHOPAEDICS_AND_TRAUMATOLOGY'],
    confirmedSymptoms: [],
    negatedSymptoms:   [],
    completedExams:    [],
  };
}
