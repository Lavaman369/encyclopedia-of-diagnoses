import { getData, diagnosesWithExam, isEntityVisible, getModLabel } from '../store.js';

function modBadge(entity) {
  if (!entity?.modId) return '';
  return `<span class="badge badge-mod" title="Community mod: ${esc(getModLabel(entity.modId))}">🧩</span>`;
}
import { iconHtml } from '../icons.js';
import { t } from '../i18n/index.js';

export function getRoomTagLabel(tag) {
  return getData().ui?.roomTags?.[tag] ?? tag;
}

const EXAM_ROOM_CATS = {
  clinic:     new Set(['any_outpatient_office', 'only_clinic', 'examinations_basic_equipment',
                       'examinations_no_equipment', 'cardiology_office', 'emergency_doctors_office',
                       'general_surgery_office', 'infectious_diseases_office', 'internal_medicine_office',
                       'neurology_office', 'orthopaedy_office', 'traumatology_office']),
  ward:       new Set(['any_inpatient_office', 'ward', 'observation']),
  trauma_icu: new Set(['icu', 'trauma_center', 'cardio_unit', 'cardio_unit_car',
                       'cardio_unit_gs', 'cardio_unit_im', 'neurology_unit']),
  med_lab:    new Set(['hematology_lab', 'histology_lab', 'microbiology_lab']),
  radiology:  new Set(['room_ct', 'room_mri', 'room_x_ray', 'room_angiography',
                       'sonography_unit', 'gs_sonography_unit']),
};

const CAT_I18N = {
  clinic:     'room_clinic',
  ward:       'room_ward',
  trauma_icu: 'room_trauma_icu',
  med_lab:    'room_med_lab',
  radiology:  'room_radiology',
  operating:  'room_operating',
};

const CAT_BADGE_CLS = {
  clinic:     'badge-room-clinic',
  ward:       'badge-room-ward',
  trauma_icu: 'badge-room-trauma',
  med_lab:    'badge-room-med-lab',
  radiology:  'badge-room-radiology',
};

export function getExamRoomCategories(tags) {
  if (!tags?.length) return [];
  return Object.keys(EXAM_ROOM_CATS).filter(cat =>
    tags.some(tag => EXAM_ROOM_CATS[cat].has(tag))
  );
}

const DISCOMFORT_CLASS = { Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high' };

const QUICK_FILTERS = [
  { id: 'room-clinic',     labelKey: 'qf_room_clinic',     onCls: 'on'        },
  { id: 'room-ward',       labelKey: 'qf_room_ward',       onCls: 'on-yellow' },
  { id: 'room-trauma-icu', labelKey: 'qf_room_trauma_icu', onCls: 'on-red'    },
  { id: 'room-med-lab',    labelKey: 'qf_room_med_lab',    onCls: 'on-green'  },
  { id: 'room-radiology',  labelKey: 'qf_room_radiology',  onCls: 'on-purple' },
  { id: 'spawns-lab',      labelKey: 'qf_spawns_lab',      onCls: 'on-teal',  group: 'lab' },
  { id: 'lab-test',        labelKey: 'qf_lab_test',        onCls: 'on-green', group: 'lab' },
  { id: 'must-talk',       labelKey: 'qf_must_talk',       onCls: 'on-yellow' },
  { id: 'base-game',       label: 'Base Game',             onCls: 'on',        group: 'origin' },
  { id: 'modded',          label: 'Mod',                   onCls: 'on-mod',    group: 'origin' },
];

const EXAM_ROOM_FILTER_MAP = {
  'room-clinic':     'clinic',
  'room-ward':       'ward',
  'room-trauma-icu': 'trauma_icu',
  'room-med-lab':    'med_lab',
  'room-radiology':  'radiology',
};

const EXCLUSIVE_GROUPS = {
  lab:    new Set(['spawns-lab', 'lab-test']),
  origin: new Set(['base-game', 'modded']),
};

function discomfortBadge(ex) {
  if (!ex.discomfortLevel || ex.discomfortLevel === 'None') return '';
  const cls = DISCOMFORT_CLASS[ex.discomfortLevel] || 'badge-none';
  const label = getData().ui?.discomfort?.[ex.discomfortLevel] ?? ex.discomfortLevel;
  return `<span class="badge ${cls}" title="${t('tip_discomfort')}">${esc(label)}</span>`;
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

export function renderExaminations(root, id) {
  if (id) return renderDetail(root, id);
  renderList(root);
}

function renderList(root) {
  const data = getData();
  const all = Object.values(data.examinations)
    .filter(ex => ex.id !== 'EXM_OBSERVATION' && isEntityVisible(ex))
    .sort((a, b) => a.name.localeCompare(b.name));

  let filterQ = '';
  const activeFilters = new Set();

  function examMatchesFilters(ex) {
    const hasLabTest = !!ex.labTestingExaminationRef;
    const isLabTest  = !!data.labTestOf[ex.id];
    if (activeFilters.has('spawns-lab') && !hasLabTest)                    return false;
    if (activeFilters.has('lab-test')   && !isLabTest)                     return false;
    if (activeFilters.has('must-talk')  && !ex.patientNeedsToBeAbleToTalk) return false;
    if (activeFilters.has('base-game')  && ex.modId)                       return false;
    if (activeFilters.has('modded')     && !ex.modId)                      return false;
    const activeRooms = Object.keys(EXAM_ROOM_FILTER_MAP).filter(r => activeFilters.has(r));
    if (activeRooms.length > 0) {
      const exCats = getExamRoomCategories(ex.requiredRoomTags);
      if (!activeRooms.some(r => exCats.includes(EXAM_ROOM_FILTER_MAP[r]))) return false;
    }
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
    const visible = all.filter(ex => examMatchesFilters(ex));

    const quickFilterBtns = QUICK_FILTERS.map((f, i) => {
      const isOn = activeFilters.has(f.id);
      const sep = (i === 5 || i === 7 || i === 8) ? '<span class="qf-sep"></span>' : '';
      const label = f.labelKey ? t(f.labelKey) : f.label;
      return sep + `<button class="qf${isOn ? ' ' + f.onCls : ''}" data-qf="${f.id}">${label}</button>`;
    }).join('');

    const rows = visible.map((ex, i) => {
      const hasLabTest = !!ex.labTestingExaminationRef;
      const isLabTest  = !!data.labTestOf[ex.id];
      const labBadge = hasLabTest
        ? `<span class="badge badge-spawns-lab" title="${t('tip_spawns_lab')}">${t('badge_spawns_lab_test')}</span>`
        : isLabTest
          ? `<span class="badge badge-lab-test" title="${t('tip_lab_test')}">${t('badge_lab_test')}</span>`
          : '';
      const roomCats = getExamRoomCategories(ex.requiredRoomTags);
      const roomBadges = roomCats.map(cat =>
        `<span class="badge ${CAT_BADGE_CLS[cat]}" title="${t('tip_' + CAT_I18N[cat])}">${t('badge_' + CAT_I18N[cat])}</span>`
      ).join('');
      return `
        <a class="entity-row" style="--i:${i}" data-name="${esc(ex.name.toLowerCase())}" href="#/examinations/${ex.id}">
          ${iconHtml(ex, 'sm')}
          <span class="entity-row-name">${esc(ex.name)}</span>
          <span class="entity-row-meta">
            ${roomBadges}${labBadge}${modBadge(ex)}
          </span>
        </a>`;
    }).join('');

    const headerSub = visible.length === all.length
      ? t('examinations_count', all.length)
      : t('examinations_showing', visible.length, all.length);

    root.innerHTML = `
      <div class="page">
        <div class="page-header">
          <h1>${t('examinations_title')}</h1>
          <p>${headerSub}</p>
        </div>
        <div class="quick-filters">${quickFilterBtns}</div>
        <div class="list-filter">
          <input class="list-filter-input" id="exam-filter" type="search"
            placeholder="${t('filter_examinations_by_name')}" autocomplete="off" value="${esc(filterQ)}">
        </div>
        <div class="entity-list">${rows || `<div class="empty-state">${t('exam_no_results')}</div>`}</div>
      </div>`;

    applyNameFilter();
    root.querySelectorAll('.qf').forEach(btn => {
      btn.addEventListener('click', () => {
        const filterId = btn.dataset.qf;
        const filter = QUICK_FILTERS.find(f => f.id === filterId);
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

    const filterInput = root.querySelector('#exam-filter');
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
  const ex = data.examinations[id];
  if (!ex) {
    root.innerHTML = `<div class="page"><p class="text-muted">${t('examination_not_found', esc(id))}</p></div>`;
    return;
  }

  const allRevealedSymptoms = (data.examToSymptoms[id] || []).map((sid, i) => {
    const sym = data.symptoms[sid];
    const collapseBadge = sym?.collapseSymptomRef
      ? `<span class="badge badge-collapse" style="flex-shrink:0">${t('badge_collapse')}</span>` : '';
    const lethalBadge = sym?.riskOfDeathStartHours != null
      ? `<span class="badge badge-lethal" style="flex-shrink:0">${t('badge_fatal')}</span>` : '';
    return { sid, sym, html: `
      <a class="linked-item" style="--i:${i}" data-name="${esc((sym?.name || sid).toLowerCase())}" href="#/symptoms/${sid}">
        ${iconHtml(sym, 'sm')}
        <span class="linked-item-name">${esc(sym?.name || sid)}</span>
        ${sym?.isMainSymptom ? `<span class="badge badge-blue" style="flex-shrink:0">${t('badge_main')}</span>` : ''}
        ${collapseBadge}${lethalBadge}
      </a>` };
  });

  const allDiagItems = diagnosesWithExam(id).map((d, i) => {
    const dept = data.departments[d.departmentRef];
    return { name: d.name.toLowerCase(), html: `
      <a class="linked-item" style="--i:${i}" data-name="${esc(d.name.toLowerCase())}" href="#/diagnoses/${d.id}">
        ${iconHtml(d, 'sm')}
        <span class="linked-item-name">${esc(d.name)}</span>
        ${dept ? `<span class="badge badge-dept-${dept.colorKey}" style="flex-shrink:0">${esc(dept.name)}</span>` : ''}
      </a>` };
  });

  // Available rooms — always first below the top card
  let roomTagsHtml = '';
  if (ex.requiredRoomTags?.length) {
    const names = [...new Set(ex.requiredRoomTags.map(tag => getRoomTagLabel(tag)))].sort();
    roomTagsHtml = `
      <div class="detail-section">
        <h3>${t('exam_rooms_section')}</h3>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${names.map(name => `<span class="badge badge-room-tag">${esc(name)}</span>`).join('')}
        </div>
      </div>`;
  }

  // Lab test relationship
  let labTestHtml = '';
  if (ex.labTestingExaminationRef) {
    const labEx = data.examinations[ex.labTestingExaminationRef];
    labTestHtml = `
      <div class="detail-section">
        <h3>${t('exam_spawns_lab_section')}</h3>
        <div class="linked-list">
          <a class="linked-item" style="--i:0" href="#/examinations/${ex.labTestingExaminationRef}">
            ${labEx ? iconHtml(labEx, 'sm') : ''}
            <span class="linked-item-name">${esc(labEx?.name || ex.labTestingExaminationRef)}</span>
            <span class="badge badge-lab-test" style="flex-shrink:0" title="${t('tip_lab_test')}">${t('badge_lab_test')}</span>
          </a>
        </div>
      </div>`;
  } else if (data.labTestOf[id]) {
    const parentId = data.labTestOf[id];
    const parentEx = data.examinations[parentId];
    labTestHtml = `
      <div class="detail-section">
        <h3>${t('exam_spawned_by_section')}</h3>
        <div class="linked-list">
          <a class="linked-item" style="--i:0" href="#/examinations/${parentId}">
            ${parentEx ? iconHtml(parentEx, 'sm') : ''}
            <span class="linked-item-name">${esc(parentEx?.name || parentId)}</span>
            <span class="badge badge-spawns-lab" style="flex-shrink:0" title="${t('tip_spawns_lab')}">${t('badge_spawns_lab_test')}</span>
          </a>
        </div>
      </div>`;
  }

  const revealedCount = allRevealedSymptoms.length;
  const diagCount = allDiagItems.length;

  root.innerHTML = `
    <div class="page">
      <a class="back-link" href="#/examinations">${t('back_examinations')}</a>
      <div class="detail-header">
        <div class="detail-icon-wrap">${iconHtml(ex, 'lg')}</div>
        <div class="detail-title-block">
          <div class="detail-title">${esc(ex.name)}</div>
          <div class="detail-badges">
            ${getExamRoomCategories(ex.requiredRoomTags).map(cat =>
              `<span class="badge ${CAT_BADGE_CLS[cat]}" title="${t('tip_' + CAT_I18N[cat])}">${t('badge_' + CAT_I18N[cat])}</span>`
            ).join('')}
            ${discomfortBadge(ex)}
            ${ex.patientNeedsToBeAbleToTalk ? `<span class="badge badge-yellow" title="${t('tip_must_talk')}">${t('badge_patient_must_talk')}</span>` : ''}
            ${ex.labTestingExaminationRef ? `<span class="badge badge-spawns-lab" title="${t('tip_spawns_lab')}">${t('badge_spawns_lab_test')}</span>` : ''}
            ${data.labTestOf[id] ? `<span class="badge badge-lab-test" title="${t('tip_lab_test')}">${t('badge_lab_test')}</span>` : ''}
            ${modBadge(ex)}
          </div>
          ${ex.description ? `<div class="detail-description">${renderDesc(ex.description)}</div>` : ''}
        </div>
      </div>

      ${roomTagsHtml}
      ${labTestHtml}

      ${revealedCount ? `
      <div class="detail-section">
        <h3>${t('exam_reveals_section', revealedCount)}</h3>
        <input class="detail-list-filter" id="sym-filter" type="search" placeholder="${t('filter_symptoms')}" autocomplete="off">
        <div class="linked-list" id="sym-list">${allRevealedSymptoms.map(x => x.html).join('')}</div>
      </div>` : ''}

      <div class="detail-section">
        <h3>${t('exam_diags_section', diagCount)}</h3>
        ${diagCount ? `
        <input class="detail-list-filter" id="diag-filter" type="search" placeholder="${t('filter_diagnoses')}" autocomplete="off">
        <div class="linked-list" id="diag-list">${allDiagItems.map(x => x.html).join('')}</div>` : `<div class="empty-state">${t('exam_no_diag_direct')}</div>`}
      </div>
    </div>`;

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
