import { getData, diagnosesWithTreatment, isEntityVisible, getModLabel } from '../store.js';

function modBadge(entity) {
  if (!entity?.modId) return '';
  return `<span class="badge badge-mod" title="Community mod: ${esc(getModLabel(entity.modId))}">🧩</span>`;
}
import { iconHtml } from '../icons.js';
import { getRoomTagLabel } from './examinations.js';
import { t } from '../i18n/index.js';

const TRT_ROOM_CATS = {
  clinic:     new Set(['any_outpatient_office', 'examinations_basic_equipment', 'cardiology_office',
                       'emergency_doctors_office', 'general_surgery_office', 'infectious_diseases_office',
                       'internal_medicine_office', 'neurology_office', 'orthopaedy_office',
                       'traumatology_office', 'im_unique_office']),
  ward:       new Set(['any_inpatient_office', 'ward', 'observation', 'hospitalization_normal',
                       'hospitalization_high', 'did_inpatient_office', 'gs_inpatient_office',
                       'im_inpatient_office', 'neurology_inpatient_office', 'orthopaedy_inpatient_office',
                       'traumatology_inpatient_office']),
  trauma_icu: new Set(['icu', 'trauma_center', 'burn_unit']),
  operating:  new Set(['operating_room']),
};

const TRT_CAT_I18N = {
  clinic:     'room_clinic',
  ward:       'room_ward',
  trauma_icu: 'room_trauma_icu',
  operating:  'room_operating',
};

const TRT_CAT_BADGE_CLS = {
  clinic:     'badge-room-clinic',
  ward:       'badge-room-ward',
  trauma_icu: 'badge-room-trauma',
  operating:  'badge-room-operating',
};

function getTrtRoomCategories(tags) {
  if (!tags?.length) return [];
  return Object.keys(TRT_ROOM_CATS).filter(cat =>
    tags.some(tag => TRT_ROOM_CATS[cat].has(tag))
  );
}

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

const DISCOMFORT_CLASS = { Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high' };

const TYPE_CLS = {
  PRESCRIPTION: 'badge-blue',
  RECEIPT: 'badge-blue',
  HOSPITALIZATION: 'badge-purple',
  PROCEDURE: 'badge-yellow',
  SURGERY: 'badge-red',
};

const TRT_TYPE_FILTERS = [
  { id: 'room-clinic',          labelKey: 'qf_room_clinic',     onCls: 'on'        },
  { id: 'room-ward',            labelKey: 'qf_room_ward',       onCls: 'on-yellow' },
  { id: 'room-trauma-icu',      labelKey: 'qf_room_trauma_icu', onCls: 'on-red'    },
  { id: 'room-operating',       labelKey: 'qf_room_operating',  onCls: 'on-teal'   },
  { id: 'PRESCRIPTION_RECEIPT', labelKey: 'qf_prescription',    onCls: 'on',        group: 'type' },
  { id: 'HOSPITALIZATION',      labelKey: 'qf_hospitalization', onCls: 'on-purple', group: 'type' },
  { id: 'PROCEDURE',            labelKey: 'qf_procedure',       onCls: 'on-yellow', group: 'type' },
  { id: 'SURGERY',              labelKey: 'qf_surgery',         onCls: 'on-red',    group: 'type' },
  { id: 'pharmacy',             labelKey: 'qf_pharmacy',        onCls: 'on-green'                 },
  { id: 'base-game',            label: 'Base Game',             onCls: 'on',        group: 'origin' },
  { id: 'modded',               label: 'Mod',                   onCls: 'on-mod',    group: 'origin' },
];

const TRT_ROOM_FILTER_MAP = {
  'room-clinic':    'clinic',
  'room-ward':      'ward',
  'room-trauma-icu':'trauma_icu',
  'room-operating': 'operating',
};

const EXCLUSIVE_GROUPS = {
  type:   new Set(['PRESCRIPTION_RECEIPT', 'HOSPITALIZATION', 'PROCEDURE', 'SURGERY']),
  origin: new Set(['base-game', 'modded']),
};

function trtTypeTip(type) {
  const map = {
    PRESCRIPTION:    'tip_prescription',
    RECEIPT:         'tip_prescription',
    HOSPITALIZATION: 'tip_hospitalization',
    PROCEDURE:       'tip_procedure',
    SURGERY:         'tip_surgery',
  };
  return map[type] ? t(map[type]) : '';
}

export function renderTreatments(root, id) {
  if (id) return renderDetail(root, id);
  renderList(root);
}

function renderList(root) {
  const data = getData();
  const all = Object.values(data.treatments)
    .filter(trt => isEntityVisible(trt))
    .sort((a, b) => a.name.localeCompare(b.name));

  let filterQ = '';
  const activeFilters = new Set();

  function applyNameFilter() {
    const q = filterQ.toLowerCase();
    root.querySelectorAll('.entity-row').forEach(row => {
      const name = row.dataset.name || '';
      row.style.display = q && !name.includes(q) ? 'none' : '';
    });
  }

  function build() {
    const visible = all.filter(trt => {
      const activeType = [...EXCLUSIVE_GROUPS.type].find(type => activeFilters.has(type));
      if (activeType) {
        if (activeType === 'PRESCRIPTION_RECEIPT') {
          if (trt.treatmentType !== 'PRESCRIPTION' && trt.treatmentType !== 'RECEIPT') return false;
        } else if (trt.treatmentType !== activeType) return false;
      }
      if (activeFilters.has('pharmacy')  && !trt.pharmacyPickup) return false;
      if (activeFilters.has('base-game') && trt.modId)           return false;
      if (activeFilters.has('modded')    && !trt.modId)          return false;
      const activeRooms = Object.keys(TRT_ROOM_FILTER_MAP).filter(r => activeFilters.has(r));
      if (activeRooms.length > 0) {
        const trtCats = getTrtRoomCategories(trt.requiredRoomTags);
        if (!activeRooms.some(r => trtCats.includes(TRT_ROOM_FILTER_MAP[r]))) return false;
      }
      return true;
    });

    const quickFilterBtns = TRT_TYPE_FILTERS.map((f, i) => {
      const isOn = activeFilters.has(f.id);
      const sep = (i === 4 || i === 8 || i === 9) ? '<span class="qf-sep"></span>' : '';
      const label = f.labelKey ? t(f.labelKey) : f.label;
      return sep + `<button class="qf${isOn ? ' ' + f.onCls : ''}" data-qf="${f.id}">${label}</button>`;
    }).join('');

    const rows = visible.map((trt, i) => {
      const typeCls = TYPE_CLS[trt.treatmentType] || 'badge-none';
      const roomCats = getTrtRoomCategories(trt.requiredRoomTags);
      const roomBadges = roomCats.map(cat =>
        `<span class="badge ${TRT_CAT_BADGE_CLS[cat]}" title="${t('tip_' + TRT_CAT_I18N[cat])}">${t('badge_' + TRT_CAT_I18N[cat])}</span>`
      ).join('');
      return `
        <a class="entity-row" style="--i:${i}" data-name="${esc(trt.name.toLowerCase())}" href="#/treatments/${trt.id}">
          ${iconHtml(trt, 'sm')}
          <span class="entity-row-name">${esc(trt.name)}</span>
          <span class="entity-row-meta">
            <span class="badge ${typeCls}" title="${trtTypeTip(trt.treatmentType)}">${t('trt_label_' + trt.treatmentType)}</span>
            ${roomBadges}${modBadge(trt)}
          </span>
        </a>`;
    }).join('');

    const headerSub = visible.length === all.length
      ? t('treatments_count', all.length)
      : t('treatments_showing', visible.length, all.length);

    root.innerHTML = `
      <div class="page">
        <div class="page-header">
          <h1>${t('treatments_title')}</h1>
          <p>${headerSub}</p>
        </div>
        <div class="quick-filters">${quickFilterBtns}</div>
        <div class="list-filter">
          <input class="list-filter-input" id="trt-filter" type="search"
            placeholder="${t('filter_treatments_by_name')}" autocomplete="off" value="${esc(filterQ)}">
        </div>
        <div class="entity-list">${rows || `<div class="empty-state">${t('trt_no_results')}</div>`}</div>
      </div>`;

    applyNameFilter();
    root.querySelectorAll('.qf').forEach(btn => {
      btn.addEventListener('click', () => {
        const filterId = btn.dataset.qf;
        const filter = TRT_TYPE_FILTERS.find(f => f.id === filterId);
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

    const filterInput = root.querySelector('#trt-filter');
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
  const trt = data.treatments[id];
  if (!trt) {
    root.innerHTML = `<div class="page"><p class="text-muted">${t('treatment_not_found', esc(id))}</p></div>`;
    return;
  }

  const symIds = data.treatmentToSymptoms[id] || [];
  const allSymItems = symIds.map((sid, i) => {
    const sym = data.symptoms[sid];
    const collapseBadge = sym?.collapseSymptomRef
      ? `<span class="badge badge-collapse" style="flex-shrink:0">${t('badge_collapse')}</span>` : '';
    const lethalBadge = sym?.riskOfDeathStartHours != null
      ? `<span class="badge badge-lethal" style="flex-shrink:0">${t('badge_fatal')}</span>` : '';
    return `
      <a class="linked-item" style="--i:${i}" data-name="${esc((sym?.name || sid).toLowerCase())}" href="#/symptoms/${sid}">
        ${iconHtml(sym, 'sm')}
        <span class="linked-item-name">${esc(sym?.name || sid)}</span>
        ${sym?.isMainSymptom ? `<span class="badge badge-blue" style="flex-shrink:0">${t('badge_main')}</span>` : ''}
        ${collapseBadge}${lethalBadge}
      </a>`;
  }).join('');

  const allDiagItems = diagnosesWithTreatment(id).map((d, i) => {
    const dept = data.departments[d.departmentRef];
    return `
      <a class="linked-item" style="--i:${i}" data-name="${esc(d.name.toLowerCase())}" href="#/diagnoses/${d.id}">
        ${iconHtml(d, 'sm')}
        <span class="linked-item-name">${esc(d.name)}</span>
        ${dept ? `<span class="badge badge-dept-${dept.colorKey}" style="flex-shrink:0">${esc(dept.name)}</span>` : ''}
      </a>`;
  }).join('');

  const typeCls = TYPE_CLS[trt.treatmentType] || 'badge-none';
  const diagCount = diagnosesWithTreatment(id).length;

  const discLabel = getData().ui?.discomfort?.[trt.discomfortLevel] ?? trt.discomfortLevel;
  const discomfortBadge = trt.discomfortLevel && trt.discomfortLevel !== 'None'
    ? `<span class="badge ${DISCOMFORT_CLASS[trt.discomfortLevel] || 'badge-none'}" title="${t('tip_discomfort')}">${esc(discLabel)}</span>`
    : '';

  const pharmacyCostBadge = trt.pharmacyPickup && trt.cost > 0
    ? `<span class="qf-sep"></span><span class="detail-payout-label">${t('badge_pharmacy_cost_label')}</span><span class="badge badge-green" title="${t('tip_pharmacy_cost')}">$${trt.cost}</span>`
    : '';

  const roomTagsHtml = trt.requiredRoomTags?.length
    ? `<div class="detail-section">
        <h3>${t('trt_rooms_section')}</h3>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${[...new Set(trt.requiredRoomTags.map(tag => getRoomTagLabel(tag)))].sort()
              .map(name => `<span class="badge badge-room-tag">${esc(name)}</span>`).join('')}
        </div>
      </div>`
    : '';

  const complicationItems = (trt.complications || []).map((c, i) => {
    const sym = data.symptoms[c.symptomRef];
    const pct = c.probabilityPercentMaxSkillLevel > 0 && c.probabilityPercentMaxSkillLevel !== c.probabilityPercent
      ? `${c.probabilityPercent}% (${c.probabilityPercentMaxSkillLevel}%)`
      : `${c.probabilityPercent}%`;
    const collapseBadge = sym?.collapseSymptomRef
      ? `<span class="badge badge-collapse" style="flex-shrink:0">${t('badge_collapse')}</span>` : '';
    const lethalBadge = sym?.riskOfDeathStartHours != null
      ? `<span class="badge badge-lethal" style="flex-shrink:0">${t('badge_fatal')}</span>` : '';
    return `
      <a class="linked-item" style="--i:${i}" data-name="${esc((sym?.name || c.symptomRef).toLowerCase())}" href="#/symptoms/${c.symptomRef}">
        ${iconHtml(sym, 'sm')}
        <span class="linked-item-name">${esc(sym?.name || c.symptomRef)}</span>
        ${collapseBadge}${lethalBadge}
        <span class="linked-item-meta" style="margin-left:auto;flex-shrink:0" title="${t('tip_complication')}">${pct}</span>
      </a>`;
  }).join('');

  root.innerHTML = `
    <div class="page">
      <a class="back-link" href="#/treatments">${t('back_treatments')}</a>
      <div class="detail-header">
        <div class="detail-icon-wrap">${iconHtml(trt, 'lg')}</div>
        <div class="detail-title-block">
          <div class="detail-title">${esc(trt.name)}</div>
          <div class="detail-badges">
            <span class="badge ${typeCls}" title="${trtTypeTip(trt.treatmentType)}">${t('trt_label_' + trt.treatmentType)}</span>
            ${getTrtRoomCategories(trt.requiredRoomTags).map(cat =>
              `<span class="badge ${TRT_CAT_BADGE_CLS[cat]}" title="${t('tip_' + TRT_CAT_I18N[cat])}">${t('badge_' + TRT_CAT_I18N[cat])}</span>`
            ).join('')}
            ${discomfortBadge}
            ${modBadge(trt)}
            ${pharmacyCostBadge}
          </div>
          ${trt.description ? `<div class="detail-description">${renderDesc(trt.description)}</div>` : ''}
        </div>
      </div>

      ${roomTagsHtml}

      ${complicationItems ? `
      <div class="detail-section">
        <h3>${t('trt_complications_section')}</h3>
        <input class="detail-list-filter" id="comp-filter" type="search" placeholder="${t('filter_complications')}" autocomplete="off">
        <div class="linked-list" id="comp-list">${complicationItems}</div>
      </div>` : ''}

      ${symIds.length ? `
      <div class="detail-section">
        <h3>${t('trt_symptoms_section', symIds.length)}</h3>
        <input class="detail-list-filter" id="sym-filter" type="search" placeholder="${t('filter_symptoms')}" autocomplete="off">
        <div class="linked-list" id="sym-list">${allSymItems}</div>
      </div>` : ''}

      <div class="detail-section">
        <h3>${t('trt_diags_section', diagCount)}</h3>
        ${allDiagItems ? `
        <input class="detail-list-filter" id="diag-filter" type="search" placeholder="${t('filter_diagnoses')}" autocomplete="off">
        <div class="linked-list" id="diag-list">${allDiagItems}</div>` : `<div class="empty-state">${t('trt_no_diag_direct')}</div>`}
      </div>
    </div>`;

  attachFilter(root, '#comp-filter', '#comp-list');
  attachFilter(root, '#sym-filter', '#sym-list');
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
