import { getData, getDepts, isEntityVisible } from '../store.js';
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

// Excluded from "Most Frequent Exam" as they appear in nearly every diagnosis
const TRIVIAL_EXAM_NAMES = new Set([
  'interview',
  'patient interview',
  'physical examination',
  'triage in reception',
  'differential diagnosis',
]);

export function renderStats(root) {
  const data = getData();
  const allDepts = getDepts();
  let activeDeptId = null;

  const HOME_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="display:block"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`;

  function build() {
    const overviewTab = `<button class="dept-tab dept-tab--icon${!activeDeptId ? ' active' : ''}" style="--dept-rgb:43,143,255" data-overview title="${t('stats_overview_title')}">${HOME_ICON}</button>`;
    const deptTabs = allDepts.map(d => {
      const isActive = d.id === activeDeptId;
      const rgb = DEPT_RGB[d.colorKey] || '43,143,255';
      return `<button class="dept-tab${isActive ? ' active' : ''}" style="--dept-rgb:${rgb}" data-dept="${d.id}">${esc(d.name)}</button>`;
    }).join('');

    const contentHtml = activeDeptId
      ? renderDeptStats(activeDeptId, data)
      : renderPromptState(data, allDepts);

    root.innerHTML = `
      <div class="page">
        <div class="page-header">
          <h1>${t('statistics_title')}</h1>
          <p>${t('stats_desc')}</p>
        </div>
        <div class="dept-tabs">${overviewTab}${deptTabs}</div>
        ${contentHtml}
      </div>`;

    root.querySelectorAll('.dept-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        if ('overview' in btn.dataset) {
          activeDeptId = null;
        } else {
          const id = btn.dataset.dept;
          activeDeptId = activeDeptId === id ? null : id;
        }
        build();
      });
    });

    root.querySelectorAll('[data-select-dept]').forEach(el => {
      el.addEventListener('click', () => {
        activeDeptId = el.dataset.selectDept;
        build();
      });
    });

    attachTableSort(root, '#dept-comparison-table');
    attachTableSort(root, '#pharmacy-table');
    attachTableSort(root, '#alldiag-table');
    attachTableSort(root, '#deptdiag-table');
    attachTableSort(root, '#allexams-table');
    attachTableSort(root, '#alltrt-table');
    attachTableSort(root, '#main-exams-table');
    attachTableSort(root, '#collapse-exams-table');

    setupFilter(root, '#pharmacy-filter', '.pharmacy-row');
    setupFilter(root, '#alldiag-filter', '.alldiag-row');
    setupFilter(root, '#deptdiag-filter', '.deptdiag-row');
    setupFilter(root, '#main-exams-filter', '.main-exam-row');
    setupFilter(root, '#collapse-exams-filter', '.collapse-exam-row');
    setupFilter(root, '#allexams-filter', '.allexams-row');
    setupFilter(root, '#alltrt-filter', '.alltrt-row');

    root.querySelectorAll('.stats-overview-heading').forEach(btn => {
      btn.addEventListener('click', () => {
        const body = document.getElementById(btn.dataset.target);
        const chevron = btn.querySelector('.stats-overview-chevron');
        if (!body) return;
        const isOpen = body.classList.toggle('open');
        chevron.classList.toggle('open', isOpen);
      });
    });

    makeRowsClickable(root, '.stats-table-row');
  }

  build();
}

function setupFilter(root, inputSel, rowSel) {
  const input = root.querySelector(inputSel);
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    root.querySelectorAll(rowSel).forEach(row => {
      row.style.display = q && !row.dataset.name?.includes(q) ? 'none' : '';
    });
  });
}

function attachTableSort(root, tableId) {
  const table = root.querySelector(tableId);
  if (!table) return;
  const tbody = table.querySelector('tbody');

  table.querySelectorAll('th[data-sort]').forEach(th => {
    th.classList.add('stats-th-sortable');
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      const wasActive = th.classList.contains('sort-active');
      const dir = (wasActive && th.dataset.dir !== 'desc') ? 'desc' : 'asc';

      table.querySelectorAll('th[data-sort]').forEach(h => {
        h.classList.remove('sort-active');
        delete h.dataset.dir;
        const icon = h.querySelector('.sort-icon');
        if (icon) icon.textContent = '↕';
      });
      th.classList.add('sort-active');
      th.dataset.dir = dir;
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.textContent = dir === 'asc' ? '↑' : '↓';

      const rows = [...tbody.querySelectorAll('tr')];
      rows.sort((a, b) => {
        const av = a.dataset[col] || '';
        const bv = b.dataset[col] || '';
        const aNum = parseFloat(av);
        const bNum = parseFloat(bv);
        const cmp = (!isNaN(aNum) && !isNaN(bNum)) ? aNum - bNum : av.localeCompare(bv);
        return dir === 'asc' ? cmp : -cmp;
      });
      rows.forEach(r => { r.style.animation = 'none'; tbody.appendChild(r); });
    });
  });
}

function makeRowsClickable(root, rowSel) {
  root.querySelectorAll(rowSel).forEach(row => {
    const href = row.dataset.href;
    if (!href) return;
    row.addEventListener('click', e => {
      if (e.target.closest('a')) return;
      window.location.hash = href;
    });
  });
}

// ---- Helpers ----

function compThHtml(col, label, compSort, title = '') {
  const isActive = compSort.col === col;
  const icon = isActive ? (compSort.dir === 'asc' ? '↑' : '↓') : '↕';
  const titleAttr = title ? ` title="${title}"` : '';
  return `<th class="stats-comp-th${isActive ? ' sort-active' : ''}" data-sort="${col}"${titleAttr}>${label} <span class="sort-icon">${icon}</span></th>`;
}

function getDecidingExam(diag, data) {
  for (const sr of diag.symptoms) {
    const sym = data.symptoms[sr.symptomRef];
    if (sym?.isMainSymptom && sym.examinations?.length > 0) {
      return data.examinations[sym.examinations[0]] || null;
    }
  }
  return null;
}

function isDangerousDiag(diag, data) {
  return diag.symptoms.some(sr => data.symptoms[sr.symptomRef]?.collapseSymptomRef);
}

function isFatalDiag(diag, data) {
  return diag.symptoms.some(sr => data.symptoms[sr.symptomRef]?.riskOfDeathStartHours != null);
}

// ---- Prompt / overview state ----

function renderPromptState(data, allDepts) {
  const deptStats = allDepts.map(d => {
    const diagnoses = Object.values(data.diagnoses).filter(diag => diag.departmentRef === d.id && isEntityVisible(diag));
    const dangerousCount = diagnoses.filter(diag => isDangerousDiag(diag, data)).length;
    const fatalCount = diagnoses.filter(diag => isFatalDiag(diag, data)).length;

    const surgerySet = new Set();
    for (const diag of diagnoses) {
      for (const sr of diag.symptoms) {
        const sym = data.symptoms[sr.symptomRef];
        for (const tid of (sym?.treatments || [])) {
          if (data.treatments[tid]?.treatmentType === 'SURGERY') surgerySet.add(tid);
        }
      }
    }

    const highestPayout = [...diagnoses]
      .filter(d => d.insurancePayment > 0)
      .sort((a, b) => b.insurancePayment - a.insurancePayment)[0];

    const decidingFreq = new Map();
    for (const diag of diagnoses) {
      const ex = getDecidingExam(diag, data);
      if (ex) decidingFreq.set(ex.id, (decidingFreq.get(ex.id) || 0) + 1);
    }
    const topDecidingId = [...decidingFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const topExam = topDecidingId ? data.examinations[topDecidingId] : null;

    return { dept: d, diagnoses, dangerousCount, fatalCount, surgerySet, highestPayout, topExam };
  });

  const compRows = deptStats.map(({ dept: d, diagnoses, dangerousCount, fatalCount, surgerySet, highestPayout, topExam }, i) => {
    const rgb = DEPT_RGB[d.colorKey] || '43,143,255';
    return `
      <tr class="stats-comparison-row" data-select-dept="${d.id}"
          data-name="${esc(d.name.toLowerCase())}"
          data-diagnoses="${diagnoses.length}"
          data-dangerous="${dangerousCount}"
          data-fatal="${fatalCount}"
          data-payout="${highestPayout?.insurancePayment || 0}"
          data-deciding="${esc((topExam?.name || '').toLowerCase())}"
          data-surgeries="${surgerySet.size}"
          style="--dept-rgb:${rgb};--i:${i}">
        <td><span class="badge badge-dept-${d.colorKey}">${esc(d.name)}</span></td>
        <td class="stats-num">${diagnoses.length}</td>
        <td class="stats-num">${dangerousCount ? `<span class="stats-dangerous-count">${dangerousCount}</span>` : '<span class="stats-none">—</span>'}</td>
        <td class="stats-num">${fatalCount ? `<span class="stats-fatal-count">${fatalCount}</span>` : '<span class="stats-none">—</span>'}</td>
        <td>${highestPayout
          ? `<span class="stats-payout">$${highestPayout.insurancePayment}</span> <span class="stats-name-muted">${esc(highestPayout.name)}</span>`
          : '<span class="stats-none">—</span>'}</td>
        <td>${topExam ? `<span class="stats-exam-inline">${esc(topExam.name)}</span>` : '<span class="stats-none">—</span>'}</td>
        <td class="stats-num">${surgerySet.size || '<span class="stats-none">—</span>'}</td>
      </tr>`;
  }).join('');

  // Exams by frequency across all active diagnoses
  const examFreqAll = new Map();
  for (const diag of Object.values(data.diagnoses)) {
    if (!isEntityVisible(diag)) continue;
    for (const eid of (diag.examinations || [])) {
      examFreqAll.set(eid, (examFreqAll.get(eid) || 0) + 1);
    }
  }
  const allExamsSorted = [...examFreqAll.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([eid, count]) => ({ exam: data.examinations[eid], count }))
    .filter(x => x.exam);

  const allExamRows = allExamsSorted.map((x, i) => `
    <tr class="allexams-row stats-table-row" style="--i:${Math.min(i, 25)}"
        data-name="${esc(x.exam.name.toLowerCase())}" data-freq="${x.count}" data-href="#/examinations/${x.exam.id}">
      <td class="stats-icon-name-cell">
        ${iconHtml(x.exam, 'sm')}
        <span class="stats-row-name">${esc(x.exam.name)}</span>
      </td>
      <td class="stats-num"><span class="stats-freq">${x.count}</span></td>
    </tr>`).join('');

  // Treatments by frequency across all active diagnoses (via symptoms)
  const trtFreqAll = new Map();
  for (const diag of Object.values(data.diagnoses)) {
    if (!isEntityVisible(diag)) continue;
    const seen = new Set();
    for (const sr of diag.symptoms) {
      const sym = data.symptoms[sr.symptomRef];
      for (const tid of (sym?.treatments || [])) {
        if (!seen.has(tid)) { seen.add(tid); trtFreqAll.set(tid, (trtFreqAll.get(tid) || 0) + 1); }
      }
    }
  }
  const allTrtsSorted = [...trtFreqAll.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tid, count]) => ({ trt: data.treatments[tid], count }))
    .filter(x => x.trt);

  const allTrtRows = allTrtsSorted.map((x, i) => `
    <tr class="alltrt-row stats-table-row" style="--i:${Math.min(i, 25)}"
        data-name="${esc(x.trt.name.toLowerCase())}" data-freq="${x.count}" data-href="#/treatments/${x.trt.id}">
      <td class="stats-icon-name-cell">
        ${iconHtml(x.trt, 'sm')}
        <span class="stats-row-name">${esc(x.trt.name)}</span>
      </td>
      <td class="stats-num"><span class="stats-freq">${x.count}</span></td>
    </tr>`).join('');

  const pharmacyTrts = Object.values(data.treatments)
    .filter(trt => trt.pharmacyPickup && trt.cost > 0 && isEntityVisible(trt))
    .sort((a, b) => b.cost - a.cost);

  const pharmacyRows = pharmacyTrts.map((trt, i) => `
    <tr class="pharmacy-row stats-table-row" style="--i:${Math.min(i, 25)}"
        data-name="${esc(trt.name.toLowerCase())}" data-cost="${trt.cost}" data-href="#/treatments/${trt.id}">
      <td class="stats-icon-name-cell">
        ${iconHtml(trt, 'sm')}
        <span class="stats-row-name">${esc(trt.name)}</span>
      </td>
      <td class="stats-num"><span class="stats-payout">$${trt.cost}</span></td>
    </tr>`).join('');

  const allDiagsSorted = Object.values(data.diagnoses)
    .filter(d => d.insurancePayment > 0 && isEntityVisible(d))
    .sort((a, b) => b.insurancePayment - a.insurancePayment);

  const allDiagRows = allDiagsSorted.map((d, i) => {
    const dept = data.departments[d.departmentRef];
    return `
      <tr class="alldiag-row stats-table-row" style="--i:${Math.min(i, 25)}"
          data-name="${esc(d.name.toLowerCase())}" data-payout="${d.insurancePayment}"
          data-dept="${esc((dept?.name || '').toLowerCase())}" data-href="#/diagnoses/${d.id}">
        <td class="stats-icon-name-cell">
          ${iconHtml(d, 'sm')}
          <span class="stats-row-name">${esc(d.name)}</span>
        </td>
        <td>${dept ? `<span class="badge badge-dept-${dept.colorKey}">${esc(dept.name)}</span>` : ''}</td>
        <td class="stats-num"><span class="stats-payout">$${d.insurancePayment}</span></td>
      </tr>`;
  }).join('');

  return `
    <div class="stats-comparison-wrap">
      <table class="stats-comparison-table" id="dept-comparison-table">
        <thead>
          <tr>
            <th data-sort="name">${t('stats_col_dept')} <span class="sort-icon">↕</span></th>
            <th data-sort="diagnoses">${t('stats_col_diagnoses')} <span class="sort-icon">↕</span></th>
            <th data-sort="dangerous" title="${t('tip_dangerous_count')}">${t('stats_col_dangerous')} <span class="sort-icon">↕</span></th>
            <th data-sort="fatal" title="${t('tip_deadly_count')}">${t('stats_col_deadly')} <span class="sort-icon">↕</span></th>
            <th data-sort="payout" title="${t('tip_highest_payout')}">${t('stats_col_highest_payout')} <span class="sort-icon">↕</span></th>
            <th data-sort="deciding" title="${t('tip_top_deciding_exam')}">${t('stats_col_top_deciding_exam')} <span class="sort-icon">↕</span></th>
            <th data-sort="surgeries">${t('stats_col_surgeries')} <span class="sort-icon">↕</span></th>
          </tr>
        </thead>
        <tbody>${compRows}</tbody>
      </table>
    </div>

    <div class="stats-overview-section">
      <button class="stats-overview-heading" data-target="stats-freq-body">
        ${t('stats_exams_freq_section')}
        <span class="stats-overview-chevron open">▾</span>
      </button>
      <div id="stats-freq-body" class="stats-overview-body open">
        <div class="stats-two-col">
          <div class="detail-section">
            <h3>${t('stats_col_exam')} (${allExamsSorted.length})</h3>
            <p class="stats-section-desc">${t('stats_exams_desc')}</p>
            <div class="list-filter">
              <input class="list-filter-input" id="allexams-filter" type="search" placeholder="${t('filter_exams')}" autocomplete="off">
            </div>
            <div class="stats-table-wrap">
              <table class="stats-inline-table" id="allexams-table">
                <thead><tr>
                  <th data-sort="name">${t('stats_col_exam')} <span class="sort-icon">↕</span></th>
                  <th data-sort="freq">${t('stats_col_frequency')} <span class="sort-icon">↕</span></th>
                </tr></thead>
                <tbody>${allExamRows}</tbody>
              </table>
            </div>
          </div>
          <div class="detail-section">
            <h3>${t('stats_col_treatment')} (${allTrtsSorted.length})</h3>
            <p class="stats-section-desc">${t('stats_trts_desc')}</p>
            <div class="list-filter">
              <input class="list-filter-input" id="alltrt-filter" type="search" placeholder="${t('filter_treatments')}" autocomplete="off">
            </div>
            <div class="stats-table-wrap">
              <table class="stats-inline-table" id="alltrt-table">
                <thead><tr>
                  <th data-sort="name">${t('stats_col_treatment')} <span class="sort-icon">↕</span></th>
                  <th data-sort="freq">${t('stats_col_frequency')} <span class="sort-icon">↕</span></th>
                </tr></thead>
                <tbody>${allTrtRows}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="stats-overview-section">
      <button class="stats-overview-heading" data-target="stats-payout-body">
        ${t('stats_payout_section')}
        <span class="stats-overview-chevron open">▾</span>
      </button>
      <div id="stats-payout-body" class="stats-overview-body open">
        <div class="stats-two-col">
          <div class="detail-section">
            <h3>${t('stats_pharmacy_section')} (${pharmacyTrts.length})</h3>
            <p class="stats-section-desc">${t('stats_pharmacy_desc')}</p>
            <div class="list-filter">
              <input class="list-filter-input" id="pharmacy-filter" type="search" placeholder="${t('filter_treatments')}" autocomplete="off">
            </div>
            <div class="stats-table-wrap">
              <table class="stats-inline-table" id="pharmacy-table">
                <thead><tr>
                  <th data-sort="name">${t('stats_col_treatment')} <span class="sort-icon">↕</span></th>
                  <th data-sort="cost" title="${t('tip_base_payout')}">${t('stats_col_base_payout')} <span class="sort-icon">↕</span></th>
                </tr></thead>
                <tbody>${pharmacyRows}</tbody>
              </table>
            </div>
          </div>
          <div class="detail-section">
            <h3>${t('stats_alldiag_section')} (${allDiagsSorted.length})</h3>
            <p class="stats-section-desc">${t('stats_alldiag_desc')}</p>
            <div class="list-filter">
              <input class="list-filter-input" id="alldiag-filter" type="search" placeholder="${t('filter_diagnoses')}" autocomplete="off">
            </div>
            <div class="stats-table-wrap">
              <table class="stats-inline-table" id="alldiag-table">
                <thead><tr>
                  <th data-sort="name">${t('stats_col_diagnosis')} <span class="sort-icon">↕</span></th>
                  <th data-sort="dept">${t('stats_col_department')} <span class="sort-icon">↕</span></th>
                  <th data-sort="payout" title="${t('tip_insurance_payout')}">${t('stats_col_insurance_payout')} <span class="sort-icon">↕</span></th>
                </tr></thead>
                <tbody>${allDiagRows}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// ---- Per-department state ----

function renderDeptStats(deptId, data) {
  const dept = data.departments[deptId];
  const rgb = DEPT_RGB[dept.colorKey] || '43,143,255';
  const diagnoses = Object.values(data.diagnoses).filter(d => d.departmentRef === deptId && isEntityVisible(d));

  const dangerousCount = diagnoses.filter(d => isDangerousDiag(d, data)).length;
  const fatalCount = diagnoses.filter(d => isFatalDiag(d, data)).length;

  const mainExamCounts    = new Map();
  const collapseExamCounts = new Map();
  const surgeryIsMain = new Map();

  for (const diag of diagnoses) {
    for (const sr of diag.symptoms) {
      const sym = data.symptoms[sr.symptomRef];
      if (!sym) continue;

      const isFatalCollapse = sym.collapseSymptomRef &&
        data.symptoms[sym.collapseSymptomRef]?.riskOfDeathStartHours != null;

      if (sym.isMainSymptom) {
        for (const eid of (sym.examinations || [])) {
          mainExamCounts.set(eid, (mainExamCounts.get(eid) || 0) + 1);
        }
      }
      if (isFatalCollapse) {
        for (const eid of (sym.examinations || [])) {
          collapseExamCounts.set(eid, (collapseExamCounts.get(eid) || 0) + 1);
        }
      }
      for (const tid of (sym.treatments || [])) {
        const trt = data.treatments[tid];
        if (trt?.treatmentType !== 'SURGERY') continue;
        if (!surgeryIsMain.has(tid)) surgeryIsMain.set(tid, !!sym.isMainSymptom);
        else if (sym.isMainSymptom) surgeryIsMain.set(tid, true);
      }
    }
  }

  const mainSurgeries = [];
  const otherSurgeries = [];
  for (const [tid, isMain] of surgeryIsMain) {
    const trt = data.treatments[tid];
    if (!trt) continue;
    if (isMain) mainSurgeries.push(trt);
    else otherSurgeries.push(trt);
  }
  mainSurgeries.sort((a, b) => a.name.localeCompare(b.name));
  otherSurgeries.sort((a, b) => a.name.localeCompare(b.name));

  const mainExamsSorted     = [...mainExamCounts.entries()].sort((a, b) => b[1] - a[1]);
  const collapseExamsSorted = [...collapseExamCounts.entries()].sort((a, b) => b[1] - a[1]);
  const maxMain     = mainExamsSorted[0]?.[1] || 1;
  const maxCollapse = collapseExamsSorted[0]?.[1] || 1;

  function examRow(eid, count, max, fillColor, idx, rowClass) {
    const ex = data.examinations[eid];
    const pct = Math.round(count / max * 100);
    return `
      <tr class="${rowClass} stats-table-row" style="--i:${Math.min(idx, 25)}"
          data-name="${esc((ex?.name || '').toLowerCase())}" data-count="${count}" data-href="#/examinations/${eid}">
        <td class="stats-icon-name-cell">
          ${iconHtml(ex, 'sm')}
          <span class="stats-row-name">${esc(ex?.name || eid)}</span>
        </td>
        <td class="stats-num">${count}</td>
        <td class="stats-bar-cell"><div class="stats-bar-track"><div class="stats-bar-fill" style="width:${pct}%;background:${fillColor}"></div></div></td>
      </tr>`;
  }

  function surgeryList(surgs) {
    return surgs.map((trt, i) => `
      <a class="linked-item" style="--i:${i}" href="#/treatments/${trt.id}">
        ${iconHtml(trt, 'sm')}
        <span class="linked-item-name">${esc(trt.name)}</span>
      </a>`).join('');
  }

  const mainExamsHtml     = mainExamsSorted.map(([eid, c], i) => examRow(eid, c, maxMain, `rgb(${rgb})`, i, 'main-exam-row')).join('');
  const collapseExamsHtml = collapseExamsSorted.map(([eid, c], i) => examRow(eid, c, maxCollapse, `rgb(${rgb})`, i, 'collapse-exam-row')).join('');
  const mainSurgHtml  = surgeryList(mainSurgeries);
  const otherSurgHtml = surgeryList(otherSurgeries);

  const diagsByPayout = [...diagnoses].sort((a, b) => (b.insurancePayment || 0) - (a.insurancePayment || 0));
  const diagRows = diagsByPayout.map((d, i) => {
    const collapseCount = d.symptoms.filter(sr => data.symptoms[sr.symptomRef]?.collapseSymptomRef).length;
    const fatalSymCount = d.symptoms.filter(sr => data.symptoms[sr.symptomRef]?.riskOfDeathStartHours != null).length;
    const decidingExam  = getDecidingExam(d, data);
    return `
      <tr class="deptdiag-row stats-table-row" style="--i:${Math.min(i, 25)}"
          data-name="${esc(d.name.toLowerCase())}" data-payout="${d.insurancePayment || 0}"
          data-symptoms="${d.symptoms.length}" data-collapse="${collapseCount}"
          data-fatal="${fatalSymCount}" data-exams="${d.examinations.length}"
          data-deciding="${esc((decidingExam?.name || '').toLowerCase())}"
          data-href="#/diagnoses/${d.id}">
        <td class="stats-icon-name-cell">
          ${iconHtml(d, 'sm')}
          <span class="stats-row-name">${esc(d.name)}</span>
        </td>
        <td class="stats-num">${d.insurancePayment ? `<span class="stats-payout">$${d.insurancePayment}</span>` : '<span class="stats-none">—</span>'}</td>
        <td class="stats-num">${d.symptoms.length}</td>
        <td class="stats-num">${collapseCount ? `<span class="stats-collapse-count">${collapseCount}</span>` : '<span class="stats-none">0</span>'}</td>
        <td class="stats-num">${fatalSymCount ? `<span class="stats-fatal-count">${fatalSymCount}</span>` : '<span class="stats-none">0</span>'}</td>
        <td class="stats-num">${d.examinations.length}</td>
        <td>${decidingExam
          ? `<a class="stats-link" href="#/examinations/${decidingExam.id}">${esc(decidingExam.name)}</a>`
          : '<span class="stats-none">—</span>'}</td>
      </tr>`;
  }).join('');

  return `
    <div class="stats-dept-header" style="--dept-rgb:${rgb}">
      <h2 class="stats-dept-name">${esc(dept.name)}</h2>
      <div class="stats-dept-meta">
        <span class="badge badge-dept-${dept.colorKey}">${t('stats_dept_diagnoses', diagnoses.length)}</span>
        ${dangerousCount ? `<span class="badge badge-yellow">${t('stats_dept_dangerous', dangerousCount)}</span>` : ''}
        ${fatalCount ? `<span class="badge badge-lethal">${t('stats_dept_deadly', fatalCount)}</span>` : ''}
      </div>
    </div>

    <div class="stats-two-col">
      <div class="detail-section">
        <h3>${t('stats_main_detection')} (${mainExamsSorted.length})</h3>
        <p class="stats-section-desc">${t('stats_main_detection_desc')}</p>
        ${mainExamsHtml ? `
          <div class="list-filter">
            <input class="list-filter-input" id="main-exams-filter" type="search" placeholder="${t('filter_exams')}" autocomplete="off">
          </div>
          <div class="stats-table-wrap">
            <table class="stats-inline-table" id="main-exams-table">
              <thead><tr>
                <th data-sort="name">${t('stats_col_exam')} <span class="sort-icon">↕</span></th>
                <th data-sort="count">${t('stats_col_frequency')} <span class="sort-icon">↕</span></th>
                <th></th>
              </tr></thead>
              <tbody>${mainExamsHtml}</tbody>
            </table>
          </div>`
          : `<div class="empty-state">${t('stats_empty_main_exams')}</div>`}
      </div>
      <div class="detail-section">
        <h3>${t('stats_collapse_detection')} (${collapseExamsSorted.length})</h3>
        <p class="stats-section-desc">${t('stats_collapse_detection_desc')}</p>
        ${collapseExamsHtml ? `
          <div class="list-filter">
            <input class="list-filter-input" id="collapse-exams-filter" type="search" placeholder="${t('filter_exams')}" autocomplete="off">
          </div>
          <div class="stats-table-wrap">
            <table class="stats-inline-table" id="collapse-exams-table">
              <thead><tr>
                <th data-sort="name">${t('stats_col_exam')} <span class="sort-icon">↕</span></th>
                <th data-sort="count">${t('stats_col_frequency')} <span class="sort-icon">↕</span></th>
                <th></th>
              </tr></thead>
              <tbody>${collapseExamsHtml}</tbody>
            </table>
          </div>`
          : `<div class="empty-state">${t('stats_empty_collapse')}</div>`}
      </div>
    </div>

    <div class="stats-two-col">
      <div class="detail-section">
        <h3>${t('stats_surgeries_main')} (${mainSurgeries.length})</h3>
        ${mainSurgHtml
          ? `<div class="stats-linked-wrap"><div class="linked-list">${mainSurgHtml}</div></div>`
          : `<div class="empty-state">${t('stats_empty_main_surg')}</div>`}
      </div>
      <div class="detail-section">
        <h3>${t('stats_surgeries_other')} (${otherSurgeries.length})</h3>
        ${otherSurgHtml
          ? `<div class="stats-linked-wrap"><div class="linked-list">${otherSurgHtml}</div></div>`
          : `<div class="empty-state">${t('stats_empty_other_surg')}</div>`}
      </div>
    </div>

    <div class="detail-section">
      <h3>${t('stats_all_diagnoses', diagnoses.length)}</h3>
      <div class="list-filter">
        <input class="list-filter-input" id="deptdiag-filter" type="search" placeholder="${t('filter_diagnoses')}" autocomplete="off">
      </div>
      <div class="stats-table-wrap">
        <table class="stats-inline-table" id="deptdiag-table">
          <thead><tr>
            <th data-sort="name">${t('stats_col_diagnosis')} <span class="sort-icon">↕</span></th>
            <th data-sort="payout" title="${t('tip_insurance_payout')}">${t('stats_col_insurance_payout')} <span class="sort-icon">↕</span></th>
            <th data-sort="symptoms">${t('stats_col_symptoms')} <span class="sort-icon">↕</span></th>
            <th data-sort="collapse" title="${t('tip_collapse_symptoms')}">${t('stats_col_collapse_symptoms')} <span class="sort-icon">↕</span></th>
            <th data-sort="fatal" title="${t('tip_fatal_symptoms')}">${t('stats_col_fatal_symptoms')} <span class="sort-icon">↕</span></th>
            <th data-sort="exams">${t('stats_col_exams')} <span class="sort-icon">↕</span></th>
            <th data-sort="deciding" title="${t('tip_deciding_exam')}">${t('stats_col_deciding_exam')} <span class="sort-icon">↕</span></th>
          </tr></thead>
          <tbody>${diagRows}</tbody>
        </table>
      </div>
    </div>`;
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
