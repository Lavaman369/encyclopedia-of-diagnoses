import { getData, getDepts, isEntityVisible, getModLabel } from '../store.js';

function modBadge(entity) {
  if (!entity?.modId) return '';
  return `<span class="badge badge-mod" title="Community mod: ${esc(getModLabel(entity.modId))}">🧩</span>`;
}
import { iconHtml } from '../icons.js';
import { t } from '../i18n/index.js';

const DEPT_RGB = {
  'emergency':           '233,69,96',
  'general-surgery':     '43,143,255',
  'internal-medicine':   '61,201,142',
  'orthopedics':         '245,166,35',
  'cardiology':          '233,108,168',
  'neurology':           '155,114,207',
  'infectious-diseases': '140,210,55',
  'traumatology':        '244,132,95',
  'oncology':            '120,144,156',
  'diagnostics':         '245,127,23',
  'hematology':          '191,26,47',
  'psychiatry':          '0,105,92',
  'ent':                 '51,105,30',
  'gynecology':          '194,24,91',
  'plastic-surgery':     '126,87,194',
  'sexual-health':       '216,67,21',
  'urology':             '224,184,26',
  'ophthalmology':       '92,107,192',
  'dentistry':           '230,230,240',
};

function occBadge(rate) {
  if (rate >= 100) return `<span class="badge badge-common">${t('badge_common')}</span>`;
  if (rate >= 75)  return `<span class="badge badge-uncommon">${t('badge_uncommon')}</span>`;
  return `<span class="badge badge-rare">${t('badge_rare')}</span>`;
}

function deptBadge(deptId, depts) {
  const dept = depts[deptId];
  if (!dept) return '';
  return `<span class="badge badge-dept-${dept.colorKey}">${dept.name}</span>`;
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

const QUICK_FILTERS = [
  { id: 'common',     labelKey: 'qf_common',     onCls: 'on-green',  group: 'rarity' },
  { id: 'uncommon',   labelKey: 'qf_uncommon',   onCls: 'on-yellow', group: 'rarity' },
  { id: 'rare',       labelKey: 'qf_rare',       onCls: 'on-red',    group: 'rarity' },
  { id: 'trauma',     labelKey: 'qf_trauma',     onCls: 'on',        group: 'type' },
  { id: 'disease',    labelKey: 'qf_disease',    onCls: 'on',        group: 'type' },
  { id: 'dangerous',  labelKey: 'qf_dangerous',  onCls: 'on-yellow', group: 'severity' },
  { id: 'deadly',     labelKey: 'qf_deadly',     onCls: 'on-red',    group: 'severity' },
  { id: 'base-game',  label: 'Base Game',        onCls: 'on',        group: 'origin' },
  { id: 'modded',     label: 'Mod',              onCls: 'on-mod',    group: 'origin' },
];

const EXCLUSIVE_GROUPS = {
  rarity:   new Set(['common', 'uncommon', 'rare']),
  type:     new Set(['trauma', 'disease']),
  severity: new Set(['dangerous', 'deadly']),
  origin:   new Set(['base-game', 'modded']),
};

export function renderDiagnoses(root, id, params) {
  if (id) return renderDetail(root, id);
  renderList(root, params);
}

function renderList(root, params) {
  const data = getData();
  const depts = data.departments;
  const allDepts = getDepts();

  const validDeptIds = new Set(allDepts.map(d => d.id));
  const activeDepts = new Set(
    (params.dept ? params.dept.split(',').filter(Boolean) : []).filter(id => validDeptIds.has(id))
  );
  let filterQ = '';
  const activeFilters = new Set();

  function diagMatchesFilters(d) {
    if (activeFilters.has('common')     && !(d.occurrenceRate >= 100)) return false;
    if (activeFilters.has('uncommon')   && !(d.occurrenceRate >= 75 && d.occurrenceRate < 100)) return false;
    if (activeFilters.has('rare')       && !(d.occurrenceRate < 75)) return false;
    if (activeFilters.has('trauma')  && !d.tags.includes('trauma'))  return false;
    if (activeFilters.has('disease') && !d.tags.includes('disease')) return false;
    if (activeFilters.has('dangerous')) {
      if (!d.symptoms.some(sr => data.symptoms[sr.symptomRef]?.collapseSymptomRef)) return false;
    }
    if (activeFilters.has('deadly')) {
      if (!d.symptoms.some(sr => data.symptoms[sr.symptomRef]?.riskOfDeathStartHours != null)) return false;
    }
    if (activeFilters.has('base-game') && d.modId) return false;
    if (activeFilters.has('modded') && !d.modId) return false;
    return true;
  }

  function applyNameFilter() {
    const q = filterQ.toLowerCase();
    root.querySelectorAll('.card').forEach(card => {
      const name = card.dataset.name || '';
      card.style.display = q && !name.includes(q) ? 'none' : '';
    });
  }

  function build() {
    const filtered = Object.values(data.diagnoses).filter(d => {
      if (!isEntityVisible(d)) return false;
      if (activeDepts.size > 0 && !activeDepts.has(d.departmentRef)) return false;
      return diagMatchesFilters(d);
    }).sort((a, b) => a.name.localeCompare(b.name));

    const total = Object.values(data.diagnoses).filter(d => isEntityVisible(d)).length;
    const headerSub = filtered.length === total
      ? t('diagnoses_count', total)
      : t('diagnoses_showing', filtered.length, total);

    const HOME_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="display:block"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`;
    const deptTabs = [null, ...allDepts].map(d => {
      const isAll = d === null;
      const id = isAll ? null : d.id;
      const activeCls = isAll ? (activeDepts.size === 0 ? ' active' : '') : (activeDepts.has(id) ? ' active' : '');
      const rgb = isAll ? '43,143,255' : (DEPT_RGB[d.colorKey] || '43,143,255');
      const content = isAll ? HOME_ICON : esc(d.name);
      const extra = isAll ? ` dept-tab--icon" title="${t('stats_overview_title')}` : '';
      return `<button class="dept-tab${activeCls}${extra}" style="--dept-rgb:${rgb}" data-dept="${isAll ? '' : id}">${content}</button>`;
    }).join('');

    const quickFilterBtns = QUICK_FILTERS.map((f, i) => {
      const isOn = activeFilters.has(f.id);
      const sep = (i === 3 || i === 5 || i === 7) ? '<span class="qf-sep"></span>' : '';
      const label = f.labelKey ? t(f.labelKey) : f.label;
      return sep + `<button class="qf${isOn ? ' ' + f.onCls : ''}" data-qf="${f.id}">${label}</button>`;
    }).join('');

    const cards = filtered.map((d, i) => {
      const dept = depts[d.departmentRef];
      const rgb = DEPT_RGB[dept?.colorKey] || '43,143,255';
      const isDangerous = d.symptoms.some(sr => data.symptoms[sr.symptomRef]?.collapseSymptomRef);
      const isDeadly = d.symptoms.some(sr => data.symptoms[sr.symptomRef]?.riskOfDeathStartHours != null);
      return `
      <a class="card" style="--i:${i};--dept-rgb:${rgb}" data-name="${esc(d.name.toLowerCase())}" href="#/diagnoses/${d.id}">
        <div class="card-header">
          ${iconHtml(d)}
          <span class="card-title">${esc(d.name)}</span>
        </div>
        <div class="card-meta">
          ${occBadge(d.occurrenceRate)}
          ${deptBadge(d.departmentRef, depts)}
          ${modBadge(d)}
        </div>
        <div class="card-footer">
          <span>${t('diag_card_symptoms', d.symptoms.length)}</span>
          <span>·</span>
          <span>${t('diag_card_exams', d.examinations.length)}</span>
          ${d.insurancePayment ? `<span>·</span><span>$${d.insurancePayment}</span>` : ''}
          ${isDeadly
            ? `<span>·</span><span class="deadly-caution deadly-caution-fatal" title="${t('tip_fatal_diag')}">⚠</span>`
            : isDangerous
              ? `<span>·</span><span class="deadly-caution" title="${t('tip_dangerous_diag')}">⚠</span>`
              : ''}
        </div>
      </a>`;
    }).join('');

    root.innerHTML = `
      <div class="page">
        <div class="page-header">
          <h1>${t('diagnoses_title')}</h1>
          <p>${headerSub}</p>
        </div>
        <div class="dept-tabs">${deptTabs}</div>
        <div class="quick-filters">${quickFilterBtns}</div>
        <div class="list-filter">
          <input class="list-filter-input" id="diag-filter" type="search"
            placeholder="${t('filter_diagnoses_by_name')}" autocomplete="off" value="${esc(filterQ)}">
        </div>
        ${filtered.length ? `<div class="card-grid">${cards}</div>` : `<div class="empty-state">${t('diag_no_results')}</div>`}
      </div>`;

    root.querySelectorAll('.dept-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.dept;
        if (!id) {
          activeDepts.clear();
        } else if (activeDepts.has(id)) {
          activeDepts.delete(id);
        } else {
          activeDepts.add(id);
        }
        const deptStr = [...activeDepts].join(',');
        history.replaceState(null, '', deptStr ? `#/diagnoses?dept=${deptStr}` : '#/diagnoses');
        build();
      });
    });

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

    applyNameFilter();

    const filterInput = root.querySelector('#diag-filter');
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
  const diag = data.diagnoses[id];
  if (!diag) {
    root.innerHTML = `<div class="page"><p class="text-muted">${t('diagnosis_not_found', esc(id))}</p></div>`;
    return;
  }
  const dept = data.departments[diag.departmentRef];
  const deptBadgeHtml = dept
    ? `<span class="badge badge-dept-${dept.colorKey}">${esc(dept.name)}</span>`
    : '';

  const allSympRows = diag.symptoms.map((sr, i) => {
    const sym = data.symptoms[sr.symptomRef];
    const name = sym ? sym.name : sr.symptomRef;
    const probPct = sr.probability;
    const probCls = probPct >= 70 ? 'high' : probPct >= 40 ? 'medium' : 'low';
    const hazardKey = sym?.hazard?.toLowerCase();
    const hazBadge = hazardKey ? `<span class="badge badge-${hazardKey}" title="${t('tip_hazard')}">${t('haz_' + hazardKey)}</span>` : '';
    const link = sym ? `href="#/symptoms/${sr.symptomRef}"` : '';
    const mainBadge = sym?.isMainSymptom ? `<span class="badge badge-blue" style="flex-shrink:0" title="${t('tip_main_symptom_diag')}">${t('badge_main_symptom')}</span>` : '';
    const collapseBadge = sym?.collapseSymptomRef
      ? `<span class="badge badge-collapse" style="flex-shrink:0">${t('badge_collapse')}</span>` : '';
    const deathBadge = sym?.riskOfDeathStartHours != null
      ? `<span class="badge badge-lethal" style="flex-shrink:0">${t('badge_fatal')}</span>` : '';

    const hazard = sym?.hazard || '';
    const hazardWeight = hazard === 'High' ? 3 : hazard === 'Medium' ? 2 : hazard === 'Low' ? 1 : 0;
    const examNames = (sym?.examinations || []).map(eid => data.examinations[eid]?.name || '').join(' ').toLowerCase();
    const trtNames  = (sym?.treatments   || []).map(tid => data.treatments[tid]?.name   || '').join(' ').toLowerCase();
    const searchText = `${name.toLowerCase()} ${examNames} ${trtNames}`;

    const examChips = (sym?.examinations || []).map(eid => {
      const ex = data.examinations[eid];
      if (!ex) return '';
      return `<a class="sym-inline-chip" href="#/examinations/${eid}">${iconHtml(ex, 'sm')}${esc(ex.name)}</a>`;
    }).join('');

    const trtChips = (sym?.treatments || []).map(tid => {
      const trt = data.treatments[tid];
      if (!trt) return '';
      return `<a class="sym-inline-chip" href="#/treatments/${tid}">${iconHtml(trt, 'sm')}${esc(trt.name)}</a>`;
    }).join('');

    return `
      <tr style="--i:${i}" data-name="${esc(name.toLowerCase())}" data-prob="${probPct}" data-hazard="${hazardWeight}" data-search="${esc(searchText)}">
        <td>
          <a ${link} style="display:flex;align-items:center;gap:8px;text-decoration:none;color:inherit;min-width:0;">
            <span style="display:inline-flex;align-items:center;gap:8px;min-width:0;flex:1;overflow:hidden;">
              ${iconHtml(sym, 'sm')}
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(name)}">${esc(name)}</span>
            </span>
            ${mainBadge}${collapseBadge}${deathBadge}
          </a>
        </td>
        <td>
          <div class="prob-bar">
            <div class="prob-track"><div class="prob-fill ${probCls}" style="width:${probPct}%"></div></div>
            <span class="prob-num">${probPct}%</span>
          </div>
        </td>
        <td>${hazBadge}</td>
        <td>${examChips ? `<div class="sym-inline-list">${examChips}</div>` : ''}</td>
        <td>${trtChips ? `<div class="sym-inline-list">${trtChips}</div>` : ''}</td>
      </tr>`;
  }).join('');

  const allExamItems = diag.examinations.map((eid, i) => {
    const ex = data.examinations[eid];
    return `
      <a class="linked-item" style="--i:${i}" data-name="${esc((ex?.name || eid).toLowerCase())}" href="#/examinations/${eid}">
        ${iconHtml(ex, 'sm')}
        <span class="linked-item-name">${esc(ex?.name || eid)}</span>
      </a>`;
  }).join('');

  const allTrtItems = diag.treatments.map((tid, i) => {
    const trt = data.treatments[tid];
    return `
      <a class="linked-item" style="--i:${i}" data-name="${esc((trt?.name || tid).toLowerCase())}" href="#/treatments/${tid}">
        ${iconHtml(trt, 'sm')}
        <span class="linked-item-name">${esc(trt?.name || tid)}</span>
        ${trt?.treatmentType ? `<span class="linked-item-meta">${t('trt_label_' + trt.treatmentType)}</span>` : ''}
      </a>`;
  }).join('');

  const TAG_TIPS = {
    disease: t('tag_tip_disease'),
    trauma:  t('tag_tip_trauma'),
  };
  const tagBadges = diag.tags
    .filter(tag => TAG_TIPS[tag])
    .map(tag => `<span class="badge badge-none" title="${TAG_TIPS[tag]}">${esc(tag)}</span>`)
    .join('');

  root.innerHTML = `
    <div class="page">
      <a class="back-link" href="#/diagnoses">${t('back_diagnoses')}</a>
      <div class="detail-header">
        <div class="detail-icon-wrap">${iconHtml(diag, 'lg')}</div>
        <div class="detail-title-block">
          <div class="detail-title">${esc(diag.name)}</div>
          <div class="detail-badges">
            ${occBadge(diag.occurrenceRate)}
            ${deptBadgeHtml}
            ${tagBadges}
            ${modBadge(diag)}
            ${diag.insurancePayment ? `<span class="qf-sep"></span><span class="detail-payout-label">${t('badge_insurance_payout_label')}</span><span class="badge badge-green">$${diag.insurancePayment}</span>` : ''}
          </div>
          ${diag.description ? `<div class="detail-description">${renderDesc(diag.description)}</div>` : ''}
        </div>
      </div>

      <div class="detail-section">
        <h3>${t('diag_symptoms_section', diag.symptoms.length)}</h3>
        ${diag.symptoms.length ? `
        <input class="detail-list-filter" id="sym-filter" type="search" placeholder="${t('filter_by_sym_exam_trt')}" autocomplete="off">
        <table class="sym-table" id="sym-table">
          <thead><tr><th class="sym-th-sortable" data-col="name">${t('col_symptom')} <span class="sort-icon">↕</span></th><th class="sym-th-sortable" data-col="prob">${t('col_probability')} <span class="sort-icon">↕</span></th><th class="sym-th-sortable" data-col="hazard">${t('col_hazard')} <span class="sort-icon">↕</span></th><th>${t('col_exams')}</th><th>${t('col_treatments')}</th></tr></thead>
          <tbody>${allSympRows}</tbody>
        </table>` : `<div class="empty-state">${t('diag_no_symptoms')}</div>`}
      </div>

      <div class="detail-section">
        <h3>${t('diag_examinations_section', diag.examinations.length)}</h3>
        ${diag.examinations.length ? `
        <input class="detail-list-filter" id="exam-filter" type="search" placeholder="${t('filter_examinations')}" autocomplete="off">
        <div class="linked-list" id="exam-list">${allExamItems}</div>` : `<div class="empty-state">${t('diag_no_examinations')}</div>`}
      </div>

      <div class="detail-section">
        <h3>${t('diag_treatments_section', diag.treatments.length)}</h3>
        ${diag.treatments.length ? `
        <input class="detail-list-filter" id="trt-filter" type="search" placeholder="${t('filter_treatments')}" autocomplete="off">
        <div class="linked-list" id="trt-list">${allTrtItems}</div>` : `<div class="empty-state">${t('diag_no_treatments')}</div>`}
      </div>
    </div>`;

  // Filter + sort for symptoms table
  const symFilterInput = root.querySelector('#sym-filter');
  const symTable       = root.querySelector('#sym-table');
  const symTbody       = symTable?.querySelector('tbody');
  if (symFilterInput && symTbody) {
    let sortCol = null;
    let sortDir = 'asc';

    function applyFilter() {
      const q = symFilterInput.value.toLowerCase();
      symTbody.querySelectorAll('tr').forEach(tr => {
        const search = tr.dataset.search || tr.dataset.name || '';
        tr.style.display = q && !search.includes(q) ? 'none' : '';
      });
    }

    function applySort() {
      const rows = [...symTbody.querySelectorAll('tr')];
      rows.sort((a, b) => {
        if (sortCol === 'name') {
          const av = a.dataset.name || '', bv = b.dataset.name || '';
          return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        const av = Number(a.dataset[sortCol]) || 0;
        const bv = Number(b.dataset[sortCol]) || 0;
        return sortDir === 'asc' ? av - bv : bv - av;
      });
      rows.forEach(r => symTbody.appendChild(r));
    }

    function updateHeaders() {
      symTable.querySelectorAll('.sym-th-sortable').forEach(th => {
        const icon = th.querySelector('.sort-icon');
        if (th.dataset.col === sortCol) {
          icon.textContent = sortDir === 'asc' ? ' ↑' : ' ↓';
          th.classList.add('active');
        } else {
          icon.textContent = ' ↕';
          th.classList.remove('active');
        }
      });
    }

    symFilterInput.addEventListener('input', applyFilter);

    symTable.querySelectorAll('.sym-th-sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        sortDir = sortCol === col && sortDir === 'asc' ? 'desc' : 'asc';
        sortCol = col;
        applySort();
        updateHeaders();
      });
    });
  }

  attachFilter(root, '#exam-filter', '#exam-list');
  attachFilter(root, '#trt-filter', '#trt-list');
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
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
