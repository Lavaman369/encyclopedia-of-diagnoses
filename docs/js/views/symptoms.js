import { getData, diagnosesWithSymptom, isEntityVisible, getModLabel } from '../store.js';

function modBadge(entity) {
  if (!entity?.modId) return '';
  return `<span class="badge badge-mod" title="Community mod: ${esc(getModLabel(entity.modId))}">🧩</span>`;
}
import { iconHtml } from '../icons.js';
import { t } from '../i18n/index.js';

function renderDesc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\\n/g, '\n')
    .replace(/[\s]*Required room:[\s\S]*$/, '')
    .trim()
    .replace(/\n\n+/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

const COLLAPSE_FATAL_FILTERS = [
  { id: 'collapse', labelKey: 'qf_collapse', onCls: 'on-yellow', group: 'danger' },
  { id: 'fatal',    labelKey: 'qf_fatal',    onCls: 'on-red',    group: 'danger' },
];
const COMPLAINT_FILTERS = [
  { id: 'complains',   labelKey: 'qf_complains',   onCls: 'on-green'  },
  { id: 'cannot-talk', labelKey: 'qf_cannot_talk', onCls: 'on-yellow' },
];
const MAIN_FILTERS = [
  { id: 'main', labelKey: 'qf_main', onCls: 'on' },
];
const ORIGIN_FILTERS = [
  { id: 'base-game', label: 'Base Game', onCls: 'on',        group: 'origin' },
  { id: 'modded',    label: 'Mod',       onCls: 'on-mod',    group: 'origin' },
];

function getHazardFilters() {
  return [
    { id: 'haz-low',    labelKey: 'haz_low',    onCls: 'on-green',  group: 'hazard' },
    { id: 'haz-medium', labelKey: 'haz_medium', onCls: 'on-yellow', group: 'hazard' },
    { id: 'haz-high',   labelKey: 'haz_high',   onCls: 'on-red',    group: 'hazard' },
  ];
}
function getMobilityFilters() {
  const m = getData().ui?.mobility || {};
  return [
    { id: 'mobile',    labelKey: 'qf_mobile',               onCls: 'on-green',  group: 'mobility' },
    { id: 'immobile',  label: m.IMOBILE   || 'Immobile',   onCls: 'on-yellow', group: 'mobility' },
    { id: 'intubated', label: m.INTUBATED || 'Intubated',  onCls: 'on-purple', group: 'mobility' },
  ];
}

const EXCLUSIVE_GROUPS = {
  hazard:   new Set(['haz-low', 'haz-medium', 'haz-high']),
  mobility: new Set(['mobile', 'immobile', 'intubated']),
  danger:   new Set(['collapse', 'fatal']),
  origin:   new Set(['base-game', 'modded']),
};

export function renderSymptoms(root, id) {
  if (id) return renderDetail(root, id);
  renderList(root);
}

function renderList(root) {
  const data = getData();
  const all = Object.values(data.symptoms)
    .filter(s => !s.isStub && isEntityVisible(s))
    .sort((a, b) => a.name.localeCompare(b.name));

  let filterQ = '';
  const activeFilters = new Set();

  function symMatchesFilters(s) {
    if (activeFilters.has('haz-low')    && s.hazard?.toLowerCase() !== 'low')    return false;
    if (activeFilters.has('haz-medium') && s.hazard?.toLowerCase() !== 'medium') return false;
    if (activeFilters.has('haz-high')   && s.hazard?.toLowerCase() !== 'high')   return false;
    if (activeFilters.has('mobile')     && s.patientMobility && s.patientMobility !== 'MOBILE') return false;
    if (activeFilters.has('immobile')   && s.patientMobility !== 'IMOBILE')    return false;
    if (activeFilters.has('intubated')  && s.patientMobility !== 'INTUBATED')  return false;
    if (activeFilters.has('collapse')   && !s.collapseSymptomRef)               return false;
    if (activeFilters.has('fatal')      && s.riskOfDeathStartHours == null)     return false;
    if (activeFilters.has('complains')  && !s.patientComplains)                 return false;
    if (activeFilters.has('cannot-talk')&& !s.canNotTalk)                       return false;
    if (activeFilters.has('main')       && !s.isMainSymptom)                    return false;
    if (activeFilters.has('base-game')  && s.modId)                             return false;
    if (activeFilters.has('modded')     && !s.modId)                            return false;
    return true;
  }

  function applyNameFilter() {
    const q = filterQ.toLowerCase();
    root.querySelectorAll('.entity-row').forEach(row => {
      const name = row.dataset.name || '';
      row.style.display = q && !name.includes(q) ? 'none' : '';
    });
  }

  function build() {
    const hazardFilters   = getHazardFilters();
    const mobilityFilters = getMobilityFilters();
    const allFilters = [
      ...hazardFilters,
      ...mobilityFilters,
      ...COLLAPSE_FATAL_FILTERS,
      ...COMPLAINT_FILTERS,
      ...MAIN_FILTERS,
      ...ORIGIN_FILTERS,
    ];
    const hLen = hazardFilters.length;
    const mLen = mobilityFilters.length;
    const SEPS = new Set([hLen, hLen + mLen, hLen + mLen + 2, hLen + mLen + 4, hLen + mLen + 5]);
    const visible = all.filter(s => symMatchesFilters(s));

    const quickFilterBtns = allFilters.map((f, i) => {
      const isOn = activeFilters.has(f.id);
      const sep = SEPS.has(i) ? '<span class="qf-sep"></span>' : '';
      const label = f.labelKey ? t(f.labelKey) : f.label;
      return sep + `<button class="qf${isOn ? ' ' + f.onCls : ''}" data-qf="${f.id}">${label}</button>`;
    }).join('');

    const rows = visible.map((s, i) => {
      const hazCls = s.hazard?.toLowerCase() || 'low';
      const ui = getData().ui;
      const complains = s.patientComplains ? `<span class="badge badge-low" title="${t('tip_patient_complains')}">${t('badge_patient_complains')}</span>` : '';
      const main = s.isMainSymptom ? `<span class="badge badge-blue" title="${t('tip_main_symptom')}">${t('badge_main_symptom')}</span>` : '';
      const collapse = s.collapseSymptomRef ? `<span class="badge badge-collapse" title="${t('tip_collapse')}">${t('badge_collapse')}</span>` : '';
      const lethal = s.riskOfDeathStartHours != null ? `<span class="badge badge-lethal" title="${t('tip_fatal')}">${t('badge_fatal')}</span>` : '';
      const mobLabel = ui?.mobility?.[s.patientMobility];
      const mobility = s.patientMobility === 'IMOBILE'
        ? `<span class="badge badge-yellow" title="${t('tip_mobility')}">${mobLabel || 'Immobile'}</span>`
        : s.patientMobility === 'INTUBATED'
          ? `<span class="badge badge-purple" title="${t('tip_mobility')}">${mobLabel || 'Intubated'}</span>`
          : '';
      const canNotTalk = s.canNotTalk ? `<span class="badge badge-yellow" title="${t('tip_cannot_talk')}">${t('badge_cannot_talk')}</span>` : '';
      return `
        <a class="entity-row" style="--i:${i}" data-name="${esc(s.name.toLowerCase())}" href="#/symptoms/${s.id}">
          ${iconHtml(s, 'sm')}
          <span class="entity-row-name">${esc(s.name)}</span>
          <span class="entity-row-meta">
            ${main}${complains}${collapse}${lethal}${mobility}${canNotTalk}
            <span class="badge badge-${hazCls}" title="${t('tip_hazard')}">${t('haz_' + hazCls)}</span>
            ${modBadge(s)}
          </span>
        </a>`;
    }).join('');

    const headerSub = visible.length === all.length
      ? t('symptoms_count', all.length)
      : t('symptoms_showing', visible.length, all.length);

    root.innerHTML = `
      <div class="page">
        <div class="page-header">
          <h1>${t('symptoms_title')}</h1>
          <p>${headerSub}</p>
        </div>
        <div class="quick-filters">${quickFilterBtns}</div>
        <div class="list-filter">
          <input class="list-filter-input" id="sym-filter" type="search"
            placeholder="${t('filter_symptoms_by_name')}" autocomplete="off" value="${esc(filterQ)}">
        </div>
        <div class="entity-list">${rows || `<div class="empty-state">${t('sym_no_results')}</div>`}</div>
      </div>`;

    applyNameFilter();
    root.querySelectorAll('.qf').forEach(btn => {
      btn.addEventListener('click', () => {
        const filterId = btn.dataset.qf;
        const filter = allFilters.find(f => f.id === filterId);
        if (filter?.group && EXCLUSIVE_GROUPS[filter.group]) {
          for (const otherId of EXCLUSIVE_GROUPS[filter.group]) {
            if (otherId !== filterId) activeFilters.delete(otherId);
          }
        }
        if (activeFilters.has(filterId)) activeFilters.delete(filterId);
        else activeFilters.add(filterId);
        build();
      });
    });

    const filterInput = root.querySelector('#sym-filter');
    filterInput?.addEventListener('input', () => {
      filterQ = filterInput.value;
      applyNameFilter();
    });
    filterInput?.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      filterQ = '';
      filterInput.value = '';
      applyNameFilter();
    });
  }

  build();
}

function renderDetail(root, id) {
  const data = getData();
  const sym = data.symptoms[id];
  if (!sym) {
    root.innerHTML = `<div class="page"><p class="text-muted">${t('symptom_not_found', esc(id))}</p></div>`;
    return;
  }

  const hazCls = sym.hazard?.toLowerCase() || 'low';
  const discomfortCls = (sym.discomfortLevel || 'none').toLowerCase();

  const collapseSym = sym.collapseSymptomRef ? data.symptoms[sym.collapseSymptomRef] : null;
  const collapseHoursHtml = (sym.riskOfCollapseStartHours != null && sym.riskOfCollapseEndHours != null)
    ? `<span class="badge badge-yellow" title="${t('tip_collapse_range')}">${sym.riskOfCollapseStartHours}h – ${sym.riskOfCollapseEndHours}h</span>`
    : '';
  const collapseHtml = sym.collapseSymptomRef ? `
    <div class="collapse-warning">
      <span>${t('sym_collapse_trigger')}</span>
      <a href="#/symptoms/${sym.collapseSymptomRef}">${esc(collapseSym?.name || sym.collapseSymptomRef)}</a>
      ${collapseHoursHtml}
      ${collapseSym?.riskOfDeathStartHours != null
        ? `<span class="badge badge-lethal" title="${t('tip_fatal')}">${t('badge_fatal_if_untreated')}</span>`
        : ''}
    </div>` : '';
  const ui = getData().ui;
  const discLabel = ui?.discomfort?.[sym.discomfortLevel] ?? sym.discomfortLevel ?? 'None';
  const mobKeys   = ui?.mobility;
  const mobilityBadge = sym.patientMobility && sym.patientMobility !== 'MOBILE'
    ? (sym.patientMobility === 'INTUBATED'
        ? `<span class="badge badge-purple" title="${t('tip_mobility')}">${mobKeys?.INTUBATED || 'Intubated'}</span>`
        : `<span class="badge badge-yellow" title="${t('tip_mobility')}">${mobKeys?.IMOBILE || 'Immobile'}</span>`)
    : '';
  const canNotTalkBadge = sym.canNotTalk ? `<span class="badge badge-yellow" title="${t('tip_cannot_talk')}">${t('badge_cannot_talk')}</span>` : '';
  const shameBadge = sym.shameLevel > 0 ? `<span class="badge badge-none" title="${t('tip_shame_level')}">${t('sym_shame_badge', sym.shameLevel)}</span>` : '';

  const allExamItems = sym.examinations.map((eid, i) => {
    const ex = data.examinations[eid];
    return `
      <a class="linked-item" style="--i:${i}" data-name="${esc((ex?.name || eid).toLowerCase())}" href="#/examinations/${eid}">
        ${iconHtml(ex, 'sm')}
        <span class="linked-item-name">${esc(ex?.name || eid)}</span>
      </a>`;
  }).join('');

  const allTrtItems = sym.treatments.map((tid, i) => {
    const trt = data.treatments[tid];
    return `
      <a class="linked-item" style="--i:${i}" data-name="${esc((trt?.name || tid).toLowerCase())}" href="#/treatments/${tid}">
        ${iconHtml(trt, 'sm')}
        <span class="linked-item-name">${esc(trt?.name || tid)}</span>
      </a>`;
  }).join('');

  const allDiagnosesWithSym = diagnosesWithSymptom(id);
  const allDiagItems = allDiagnosesWithSym.map((d, i) => {
    const dept = data.departments[d.departmentRef];
    const sr = d.symptoms.find(s => s.symptomRef === id);
    return `
      <a class="linked-item" style="--i:${i}" data-name="${esc(d.name.toLowerCase())}" href="#/diagnoses/${d.id}">
        ${iconHtml(d, 'sm')}
        <span class="linked-item-name">${esc(d.name)}</span>
        <span class="linked-item-meta">${sr ? sr.probability + '%' : ''}</span>
        ${dept ? `<span class="badge badge-dept-${dept.colorKey}" style="flex-shrink:0">${esc(dept.name)}</span>` : ''}
      </a>`;
  }).join('');

  root.innerHTML = `
    <div class="page">
      <a class="back-link" href="#/symptoms">${t('back_symptoms')}</a>
      <div class="detail-header">
        <div class="detail-icon-wrap">${iconHtml(sym, 'lg')}</div>
        <div class="detail-title-block">
          <div class="detail-title">${esc(sym.name)}</div>
          <div class="detail-badges">
            <span class="badge badge-${hazCls}" title="${t('tip_hazard')}">${t('haz_' + hazCls)}</span>
            <span class="badge badge-${discomfortCls}" title="${t('tip_discomfort')}">${discLabel}</span>
            ${sym.isMainSymptom ? `<span class="badge badge-blue" title="${t('tip_main_symptom')}">${t('badge_main_symptom')}</span>` : ''}
            ${sym.patientComplains ? `<span class="badge badge-low" title="${t('tip_patient_complains')}">${t('badge_patient_complains')}</span>` : ''}
            ${mobilityBadge}
            ${canNotTalkBadge}
            ${shameBadge}
            ${sym.riskOfDeathStartHours != null ? `<span class="badge badge-lethal" title="${t('tip_fatal')}">${t('badge_fatal_collapse_symptom')}</span>` : ''}
            ${sym.isStub ? `<span class="badge badge-none">${t('badge_basic_symptom')}</span>` : ''}
            ${modBadge(sym)}
          </div>
          ${sym.description ? `<div class="detail-description">${renderDesc(sym.description)}</div>` : ''}
          ${collapseHtml}
        </div>
      </div>

      ${sym.examinations.length ? `
      <div class="detail-section">
        <h3>${t('sym_exams_section', sym.examinations.length)}</h3>
        <input class="detail-list-filter" id="exam-filter" type="search" placeholder="${t('filter_examinations')}" autocomplete="off">
        <div class="linked-list" id="exam-list">${allExamItems}</div>
      </div>` : ''}

      ${sym.treatments.length ? `
      <div class="detail-section">
        <h3>${t('sym_treated_section')}</h3>
        <div class="linked-list" id="trt-list">${allTrtItems}</div>
      </div>` : ''}

      <div class="detail-section">
        <h3>${t('sym_diags_section', allDiagnosesWithSym.length)}</h3>
        ${allDiagItems ? `
        <input class="detail-list-filter" id="diag-filter" type="search" placeholder="${t('filter_diagnoses')}" autocomplete="off">
        <div class="linked-list" id="diag-list">${allDiagItems}</div>` : `<div class="empty-state">${t('sym_no_diag')}</div>`}
      </div>
    </div>`;

  attachFilter(root, '#exam-filter', '#exam-list');
  attachFilter(root, '#diag-filter', '#diag-list');
}

function attachFilter(root, inputSel, listSel) {
  const input = root.querySelector(inputSel);
  const list = root.querySelector(listSel);
  if (!input || !list) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    list.querySelectorAll('.linked-item').forEach(item => {
      const name = item.dataset.name || item.querySelector('.linked-item-name')?.textContent.toLowerCase() || '';
      item.style.display = q && !name.includes(q) ? 'none' : '';
    });
  });
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
