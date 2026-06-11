import { getData, getDepts, getSessions, saveSession, deleteSession, newSession, isEntityVisible } from '../store.js';
import { iconHtml } from '../icons.js';
import { recommendExams } from '../diagnostic.js';
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

// ---- Global department state (persisted, independent of patients) ----
const DEPTS_KEY = 'ph_diag_depts';
let _activeDepts = null;

function loadActiveDepts(allDepts) {
  if (_activeDepts !== null) return _activeDepts;
  try {
    const saved = localStorage.getItem(DEPTS_KEY);
    if (saved) { _activeDepts = JSON.parse(saved); return _activeDepts; }
  } catch {}
  _activeDepts = allDepts.filter(d => !d.isDLC).map(d => d.id);
  return _activeDepts;
}

function storeActiveDepts(arr) {
  _activeDepts = arr;
  localStorage.setItem(DEPTS_KEY, JSON.stringify(arr));
}

// ---- Session migration: old { examId, found } → new { examId, foundSymptoms, noneFound } ----
function migrateSession(s, data) {
  s.confirmedSymptoms = s.confirmedSymptoms || [];
  s.negatedSymptoms = s.negatedSymptoms || [];
  s.completedExams = (s.completedExams || []).map(e => {
    if ('foundSymptoms' in e) return e;
    return { examId: e.examId, foundSymptoms: [], noneFound: e.found === false };
  });
  // Self-heal sessions saved by older versions where a "nothing found" exam
  // could wrongly negate a symptom that was confirmed by another exam.
  recomputeNegatedSymptoms(s, data);
}

// Exams where "nothing found" means the patient couldn't communicate, not that
// the symptom is absent — so they never negate symptoms.
const SOFT_EXAMS = new Set(['EXM_INTERVIEW', 'EXM_RECEPTION_FAST']);

// Negated symptoms = symptoms a "nothing found" exam could have revealed but
// didn't. Recomputed from scratch so toggling/removing one exam can't leave
// stale negations from another, and a positive finding (from any exam, or
// added manually) always overrides a blanket "nothing found" on that symptom.
function recomputeNegatedSymptoms(session, data) {
  const negated = new Set();
  for (const entry of session.completedExams) {
    if (!entry.noneFound || SOFT_EXAMS.has(entry.examId)) continue;
    for (const sid of (data.examToSymptoms[entry.examId] || [])) {
      if (!entry.foundSymptoms.includes(sid)) negated.add(sid);
    }
  }
  for (const sid of session.confirmedSymptoms) negated.delete(sid);
  session.negatedSymptoms = [...negated];
}

// ---- Exam effect helpers ----
function addFoundSymptom(session, data, examId, sid) {
  const entry = session.completedExams.find(e => e.examId === examId);
  if (!entry || entry.foundSymptoms.includes(sid)) return;
  entry.foundSymptoms.push(sid);
  if (!session.confirmedSymptoms.includes(sid)) session.confirmedSymptoms.push(sid);
  recomputeNegatedSymptoms(session, data);
}

function removeFoundSymptom(session, data, examId, sid) {
  const entry = session.completedExams.find(e => e.examId === examId);
  if (!entry) return;
  entry.foundSymptoms = entry.foundSymptoms.filter(s => s !== sid);
  session.confirmedSymptoms = session.confirmedSymptoms.filter(s => s !== sid);
  recomputeNegatedSymptoms(session, data);
}

function setNoneFound(session, data, examId, val) {
  const entry = session.completedExams.find(e => e.examId === examId);
  if (!entry) return;
  entry.noneFound = val;
  recomputeNegatedSymptoms(session, data);
}

function removeExam(session, data, examId) {
  const entry = session.completedExams.find(e => e.examId === examId);
  if (!entry) return;
  for (const sid of entry.foundSymptoms) {
    session.confirmedSymptoms = session.confirmedSymptoms.filter(s => s !== sid);
  }
  session.completedExams = session.completedExams.filter(e => e.examId !== examId);
  recomputeNegatedSymptoms(session, data);
}

let activeSessionId = null;

export function renderDiagnosticTool(root) {
  const data = getData();
  const depts = getDepts();

  function getActive() {
    const sessions = getSessions();
    if (!activeSessionId && sessions.length) activeSessionId = sessions[0].id;
    const s = sessions.find(s => s.id === activeSessionId) || null;
    if (s) migrateSession(s, data);
    return s;
  }

  function rebuild() {
    const sessions = getSessions();
    const active = getActive();
    const activeDepts = loadActiveDepts(depts);

    const deptToggles = depts.map(d => {
      const on = activeDepts.includes(d.id);
      const rgb = DEPT_RGB[d.colorKey] || '43,143,255';
      return `<button class="dept-toggle${on ? ' on' : ''}" style="--dept-rgb:${rgb}" data-dept="${d.id}">${esc(d.name)}</button>`;
    }).join('');

    const patientItems = sessions.map(s => `
      <li class="patient-item${s.id === activeSessionId ? ' active' : ''}" data-id="${s.id}">
        <input class="patient-name-inline" data-name-id="${s.id}"
               value="${esc(s.name)}" placeholder="${t('patient_name_placeholder')}" autocomplete="off"
               ${s.id !== activeSessionId ? 'readonly' : ''}>
        <button class="patient-delete" data-del="${s.id}" title="${t('delete_patient_title')}">✕</button>
      </li>`).join('');

    const hasActiveDepts = depts.some(d => activeDepts.includes(d.id));

    const recoResult = active
      ? recommendExams(active, data, activeDepts)
      : { candidates: [], recommendedExams: [] };

    const mainHtml = active
      ? buildMain(active, data, depts, activeDepts, recoResult)
      : `<div class="no-patient-placeholder">
           <div>${t('no_patient_selected')}</div>
           <div class="hint">${t('no_patient_hint')}</div>
         </div>`;

    const bodyHtml = !hasActiveDepts
      ? `<div class="diag-panel diag-no-depts">
           <div class="diag-no-depts-icon">⚠️</div>
           <div class="diag-no-depts-title">${t('no_depts_title')}</div>
           <div class="diag-no-depts-hint">${t('no_depts_hint')}</div>
         </div>`
      : `<div class="diag-layout">
          <aside class="patient-sidebar">
            <div class="patient-sidebar-header">
              <span>${t('patients_header')}</span>
              <span class="count-chip">${sessions.length}</span>
            </div>
            <ul class="patient-list">${patientItems}</ul>
            <button class="add-patient-btn" id="add-patient">${t('add_patient_btn')}</button>
          </aside>
          <div class="diag-main" id="diag-main">${mainHtml}</div>
        </div>`;

    root.innerHTML = `
      <div class="diag-tool-wrap">
        <div class="page-header">
          <h1>${t('diagnostic_title')}</h1>
          <p>${t('diagnostic_desc')}</p>
        </div>
        <div class="diag-panel diag-dept-bar">
          <div class="diag-panel-header">${t('dept_bar_header')}</div>
          <div class="diag-panel-body">
            <div class="dept-toggles">${deptToggles}</div>
          </div>
        </div>
        ${bodyHtml}
      </div>`;

    // Global department toggles
    root.querySelectorAll('.dept-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const deptId = btn.dataset.dept;
        const current = [...loadActiveDepts(depts)];
        const idx = current.indexOf(deptId);
        if (idx >= 0) current.splice(idx, 1); else current.push(deptId);
        storeActiveDepts(current);
        rebuild();
      });
    });

    if (!hasActiveDepts) return;

    // Patient selection
    root.querySelectorAll('.patient-item').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.dataset.del || e.target.classList.contains('patient-name-inline')) return;
        activeSessionId = el.dataset.id;
        rebuild();
      });
    });

    // Inline patient name editing
    root.querySelectorAll('.patient-name-inline').forEach(input => {
      input.addEventListener('click', e => {
        e.stopPropagation();
        const id = input.dataset.nameId;
        if (activeSessionId !== id) {
          activeSessionId = id;
          rebuild();
        }
      });
      input.addEventListener('input', () => {
        const id = input.dataset.nameId;
        const s = getSessions().find(s => s.id === id);
        if (s) { s.name = input.value; saveSession(s); }
      });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
    });
    root.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.del;
        deleteSession(id);
        if (activeSessionId === id) activeSessionId = null;
        rebuild();
      });
    });
    root.querySelector('#add-patient').addEventListener('click', () => {
      const s = newSession();
      saveSession(s);
      activeSessionId = s.id;
      rebuild();
    });

    if (active) wireMain(root, active, data, depts, activeDepts, rebuild, recoResult);
  }

  rebuild();
}

// ---- Build right-panel HTML ----
function buildMain(session, data, depts, activeDepts, { candidates, recommendedExams }) {
  // Standalone symptoms = confirmed symptoms not linked to any completed exam
  const examFoundSet = new Set(session.completedExams.flatMap(e => e.foundSymptoms));
  const standaloneSyms = session.confirmedSymptoms.filter(sid => !examFoundSet.has(sid));

  const examRows = session.completedExams.map((e, i) => buildExamRow(e, data, i)).join('');
  const symRows  = standaloneSyms.map((sid, i) => {
    const sym = data.symptoms[sid];
    const examIdsForSym = sym?.examinations || [];
    const hasAvailExam = examIdsForSym.some(eid => !session.completedExams.find(e => e.examId === eid));
    return `<div class="unified-row" style="--i:${session.completedExams.length + i}">
      <div class="unified-cell">
        ${hasAvailExam ? `<div class="symptom-picker exam-sym-picker">
          <button class="add-sym-btn" data-add-exam-for-sym="${sid}">${t('add_exam_btn')}</button>
          <div class="symptom-dropdown" data-exam-for-sym="${sid}" style="display:none"></div>
        </div>` : ''}
      </div>
      <div class="unified-cell">
        ${iconHtml(sym, 'sm')}
        <span class="sym-row-name">${esc(sym?.name || sid)}</span>
        <button class="remove-symptom" data-rm-sym="${sid}" title="${t('remove_title')}">✕</button>
      </div>
    </div>`;
  }).join('');

  const totalCount = session.completedExams.length + standaloneSyms.length;

  return `
    <div class="diag-panel">
      <div class="diag-panel-header">
        <span>${t('exams_symptoms_header')}</span>
        <span class="count-chip">${totalCount}</span>
      </div>
      <div class="diag-panel-body" style="padding:0">
        <div class="unified-list">
          <div class="unified-list-header">
            <div class="unified-col-header">
              <div class="unified-col-label">${t('col_completed_exam')}</div>
              <div class="symptom-picker">
                <input class="symptom-search" id="exam-search" type="search"
                       placeholder="${t('search_add_exam')}" autocomplete="off">
                <div class="symptom-dropdown" id="exam-dropdown" style="display:none"></div>
              </div>
            </div>
            <div class="unified-col-header">
              <div class="unified-col-label">${t('col_uncovered_symptom')}</div>
              <div class="symptom-picker">
                <input class="symptom-search" id="sym-search" type="search"
                       placeholder="${t('search_add_symptom')}" autocomplete="off">
                <div class="symptom-dropdown" id="sym-dropdown" style="display:none"></div>
              </div>
            </div>
          </div>
          ${totalCount
            ? `<div class="unified-list-body">${examRows}${symRows}</div>`
            : `<div class="empty-state" style="padding:16px;border:none;text-align:left">${t('no_exams_yet')}</div>`
          }
        </div>
      </div>
    </div>

    <div class="diag-panel">
      <div class="diag-panel-header">${t('recommendations_header')}</div>
      <div class="diag-panel-body">
        <div class="reco-section">
          <div>
            <h3 class="reco-section-title">${t('candidate_diagnoses')}</h3>
            ${buildCandidateHtml(candidates, session, data)}
          </div>
          <div>
            <h3 class="reco-section-title">${t('next_recommended_exams')}</h3>
            ${buildRecoHtml(recommendedExams, candidates, session, data)}
          </div>
        </div>
      </div>
    </div>`;
}

function buildExamRow(entry, data, i = 0) {
  const { examId, foundSymptoms, noneFound } = entry;
  const ex = data.examinations[examId];
  const revealableSymIds = data.examToSymptoms[examId] || [];
  const isOpenExam = examId === 'EXM_RECEPTION_FAST';

  const foundSymsHtml = foundSymptoms.map(sid => {
    const sym = data.symptoms[sid];
    return `<span class="found-sym-tag">
      ${iconHtml(sym, 'sm')}
      ${esc(sym?.name || sid)}
      <button class="found-sym-remove" data-rm-found-exam="${examId}" data-rm-found-sym="${sid}" title="${t('remove_title')}">✕</button>
    </span>`;
  }).join('');

  const noneFoundHtml = noneFound ? `
    <span class="found-sym-tag none-found-tag">
      ${t('no_symptom_uncovered')}
      <button class="found-sym-remove" data-unset-none-found="${examId}" title="${t('remove_title')}">✕</button>
    </span>` : '';

  const symPickerHtml = (revealableSymIds.length || isOpenExam) ? `
    <div class="symptom-picker exam-sym-picker">
      <button class="add-sym-btn" data-add-sym-exam="${examId}">${t('add_symptom_btn')}</button>
      <div class="symptom-dropdown exam-sym-dropdown" data-exam-dropdown="${examId}" style="display:none"></div>
    </div>` : '';

  return `<div class="unified-row" style="--i:${i}">
    <div class="unified-cell">
      ${iconHtml(ex, 'sm')}
      <span class="exam-row-name">${esc(ex?.name || examId)}</span>
      <button class="patient-delete" data-rm-exam="${examId}" title="${t('remove_title')}">✕</button>
    </div>
    <div class="unified-cell sym-cell">
      ${foundSymsHtml}${noneFoundHtml}
      ${symPickerHtml}
    </div>
  </div>`;
}

function buildCandidateHtml(candidates, session, data) {
  if (!candidates.length) {
    const hasEvidence = session.confirmedSymptoms.length > 0 || session.negatedSymptoms.length > 0;
    if (hasEvidence) {
      return `<div class="candidate-list"><div class="candidate-item candidate-impossible">
        <span class="candidate-name">${t('candidates_no_match')}</span>
      </div></div>`;
    }
    return `<div style="flex:1;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px 16px;color:var(--text-faint);font-size:16px">${t('candidates_add_symptoms')}</div>`;
  }
  return `<div class="candidate-list">${candidates.slice(0, 10).map((c, i) => {
    const dept = data.departments[c.departmentRef];
    const deptBadge = dept ? `<span class="badge badge-dept-${dept.colorKey}">${esc(dept.name)}</span>` : '';
    const rarityBadge = c.occurrenceRate >= 100
      ? `<span class="badge badge-common">${t('badge_common')}</span>`
      : c.occurrenceRate >= 75
        ? `<span class="badge badge-uncommon">${t('badge_uncommon')}</span>`
        : `<span class="badge badge-rare">${t('badge_rare')}</span>`;
    const deadlyBadge = c.hasCollapse ? `<span class="badge badge-lethal">${t('badge_deadly')}</span>` : '';
    const confirmedBadge = c.confirmed ? `<span class="badge badge-confirmed">${t('badge_confirmed')}</span>` : '';
    return `<div class="candidate-item${c.confirmed ? ' candidate-confirmed' : ''}" style="--i:${i}">
      <div class="candidate-bar" style="width:${c.matchPercent}%"></div>
      <span class="candidate-rank">${i + 1}</span>
      ${iconHtml(c, 'sm')}
      <a class="candidate-name" href="#/diagnoses/${c.id}">${esc(c.name)}</a>
      <div class="candidate-badges">${confirmedBadge}${deptBadge}${rarityBadge}${deadlyBadge}</div>
      <span class="candidate-score">${c.matchPercent}%</span>
    </div>`;
  }).join('')}</div>`;
}

function buildRecoHtml(recommendedExams, candidates, session, data) {
  if (!recommendedExams.length) {
    const isConfirmed = candidates.length === 1 && candidates[0].confirmed;
    const msg = isConfirmed
      ? t('diagnosis_confirmed_msg')
      : t('exams_add_symptoms');
    return `<div style="flex:1;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px 16px;color:var(--text-faint);font-size:16px">${msg}</div>`;
  }
  const doneSet = new Set(session.completedExams.map(e => e.examId));
  return `<div class="exam-reco-list">${recommendedExams.slice(0, 10).map((r, i) => {
    const ex = data.examinations[r.examId];
    const alreadyDone = doneSet.has(r.examId);
    const collapseBadge = r.isCollapse ? `<span class="badge badge-lethal" style="font-size:11px">${t('badge_collapse_risk')}</span>` : '';

    let bodyHtml;
    if (r.isCollapse) {
      bodyHtml = `<div class="exam-reco-reason">${r.reasoning}</div>`;
    } else {
      const hasDecisive = r.reveals?.some(rev => rev.isDecisive);
      const hasMain     = r.reveals?.some(rev => rev.isMain);
      const tags = [
        hasDecisive ? `<span class="reco-tag reco-tag-confirms">${t('reco_confirms_diag')}</span>` : '',
        hasMain     ? `<span class="reco-tag reco-tag-unique">${t('reco_unique_symptom')}</span>` : '',
        r.affectedCount != null ? `<span class="reco-tag reco-tag-count">${t('reco_affects', r.affectedCount, r.totalCount)}</span>` : '',
      ].filter(Boolean).join('');
      bodyHtml = tags ? `<div class="exam-reco-tags">${tags}</div>` : '';
    }

    return `<div class="exam-reco${alreadyDone ? ' exam-reco-done' : ''}" style="--i:${i}">
      <div class="exam-reco-header">
        ${iconHtml(ex, 'sm')}
        <span class="exam-reco-name">${esc(ex?.name || r.examId)}</span>
        ${collapseBadge}
        ${i === 0 && !alreadyDone && !r.isCollapse ? `<span class="exam-reco-top-badge">${t('badge_top_pick')}</span>` : ''}
        ${alreadyDone ? `<span class="badge badge-none" style="font-size:11px">${t('badge_done')}</span>` : ''}
      </div>
      ${bodyHtml}
      ${!alreadyDone ? `
      <div class="exam-reco-actions">
        <button class="reco-found-btn" data-reco-found="${r.examId}">${t('found_symptom_btn')}</button>
        <button class="reco-none-btn" data-reco-none="${r.examId}">${t('nothing_found_btn')}</button>
      </div>` : ''}
    </div>`;
  }).join('')}</div>`;
}

// ---- Keyboard navigation for dropdowns ----
function wireDropdownKeys(input, getDropdown) {
  let focusedIdx = -1;

  function getOptions() {
    return [...(getDropdown()?.querySelectorAll('.symptom-option') || [])];
  }

  function setFocus(idx) {
    const opts = getOptions();
    opts.forEach(o => o.classList.remove('focused'));
    focusedIdx = idx < 0 ? -1 : Math.min(idx, opts.length - 1);
    if (focusedIdx >= 0) {
      opts[focusedIdx].classList.add('focused');
      opts[focusedIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  input.addEventListener('focus', () => { focusedIdx = -1; });
  input.addEventListener('input', () => { focusedIdx = -1; });
  input.addEventListener('keydown', e => {
    const dropdown = getDropdown();
    if (!dropdown || dropdown.style.display === 'none') return;
    const opts = getOptions();
    if (!opts.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocus(focusedIdx < opts.length - 1 ? focusedIdx + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocus(focusedIdx > 0 ? focusedIdx - 1 : opts.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = focusedIdx >= 0 ? opts[focusedIdx] : opts[0];
      target?.click();
      focusedIdx = -1;
    } else if (e.key === 'Escape') {
      e.preventDefault();
      dropdown.style.display = 'none';
      focusedIdx = -1;
      input.blur();
    }
  });
}

// ---- Wire up interactivity ----
function wireMain(root, session, data, depts, activeDepts, rebuild, { candidates }) {
  // Rule (b): symptoms and exams that appear in at least one diagnosis in an active department
  const activeDeptSet = new Set(activeDepts);
  const deptDiags = Object.values(data.diagnoses)
    .filter(d => isEntityVisible(d) && activeDeptSet.has(d.departmentRef));
  const deptSymIds  = new Set(deptDiags.flatMap(d => d.symptoms.map(sr => sr.symptomRef)));
  const deptExamIds = new Set(deptDiags.flatMap(d => d.examinations));

  // Rule (a): narrow further to symptoms/exams relevant to current candidate diagnoses
  const candidateSymIds = candidates.length > 0
    ? new Set(candidates.flatMap(c => (data.diagnoses[c.id]?.symptoms || []).map(sr => sr.symptomRef)))
    : null;
  const candidateExamIds = candidates.length > 0
    ? new Set(candidates.flatMap(c => data.diagnoses[c.id]?.examinations || []))
    : null;

  function save() {
    const nameInput = root.querySelector(`.patient-name-inline[data-name-id="${session.id}"]`);
    if (nameInput) session.name = nameInput.value;
    saveSession(session);
    rebuild();
  }

  // Remove confirmed symptom
  root.querySelectorAll('[data-rm-sym]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sid = btn.dataset.rmSym;
      session.confirmedSymptoms = session.confirmedSymptoms.filter(s => s !== sid);
      recomputeNegatedSymptoms(session, data);
      save();
    });
  });

  // Symptom search dropdown
  const symInput    = root.querySelector('#sym-search');
  const symDropdown = root.querySelector('#sym-dropdown');
  const allSymptoms = Object.values(data.symptoms)
    .filter(s => !s.isStub && isEntityVisible(s))
    .sort((a, b) => a.name.localeCompare(b.name));
  const openExamSymPool = allSymptoms.map(s => s.id);

  function showSymDropdown(q = '') {
    const ql = q.toLowerCase().trim();
    const hits = allSymptoms
      .filter(s => !session.confirmedSymptoms.includes(s.id))
      .filter(s => deptSymIds.has(s.id))
      .filter(s => !candidateSymIds || candidateSymIds.has(s.id))
      .filter(s => !ql || s.name.toLowerCase().includes(ql))
      .sort((a, b) => {
        if (!ql) return 0;
        const an = a.name.toLowerCase(), bn = b.name.toLowerCase();
        const aExact = an === ql, bExact = bn === ql;
        if (aExact !== bExact) return aExact ? -1 : 1;
        const aStart = an.startsWith(ql), bStart = bn.startsWith(ql);
        if (aStart !== bStart) return aStart ? -1 : 1;
        return 0;
      })
      .slice(0, 12);
    if (!hits.length) { symDropdown.style.display = 'none'; return; }
    symDropdown.innerHTML = hits.map(s => `
      <div class="symptom-option" data-sid="${s.id}">
        ${iconHtml(s, 'sm')}
        <span>${esc(s.name)}</span>
        ${s.isMainSymptom ? `<span class="badge badge-blue" style="flex-shrink:0;font-size:11px">${t('badge_main')}</span>` : ''}
      </div>`).join('');
    symDropdown.style.display = 'block';
    symDropdown.querySelectorAll('.symptom-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const sid = opt.dataset.sid;
        if (!session.confirmedSymptoms.includes(sid)) {
          session.confirmedSymptoms.push(sid);
          const sym = data.symptoms[sid];
          const availExams = (sym?.examinations || [])
            .filter(eid => !session.completedExams.find(e => e.examId === eid));
          if (availExams.length === 1) {
            session.completedExams.push({ examId: availExams[0], foundSymptoms: [sid], noneFound: false });
          }
          recomputeNegatedSymptoms(session, data);
        }
        symInput.value = '';
        symDropdown.style.display = 'none';
        save();
      });
    });
  }

  symDropdown?.addEventListener('mousedown', e => e.preventDefault());
  symInput?.addEventListener('focus', () => showSymDropdown(symInput.value));
  symInput?.addEventListener('input', () => showSymDropdown(symInput.value));
  symInput?.addEventListener('blur', () => setTimeout(() => { symDropdown.style.display = 'none'; }, 180));
  if (symInput) wireDropdownKeys(symInput, () => symDropdown);

  // Exam search dropdown
  const examInput    = root.querySelector('#exam-search');
  const examDropdown = root.querySelector('#exam-dropdown');
  const doneSet      = new Set(session.completedExams.map(e => e.examId));
  const allExams     = Object.values(data.examinations)
    .filter(ex => ex.id !== 'EXM_OBSERVATION' && isEntityVisible(ex))
    .sort((a, b) => a.name.localeCompare(b.name));

  const PRIORITY_EXAMS = ['interview', 'physical'];

  function showExamDropdown(q = '') {
    const ql = q.toLowerCase().trim();
    const hits = allExams
      .filter(ex => !doneSet.has(ex.id))
      .filter(ex => ex.id === 'EXM_RECEPTION_FAST' || deptExamIds.has(ex.id))
      .filter(ex => ex.id === 'EXM_RECEPTION_FAST' || !candidateExamIds || candidateExamIds.has(ex.id))
      .filter(ex => !ql || ex.name.toLowerCase().includes(ql))
      .sort((a, b) => {
        if (a.id === 'EXM_RECEPTION_FAST') return -1;
        if (b.id === 'EXM_RECEPTION_FAST') return 1;
        const an = a.name.toLowerCase(), bn = b.name.toLowerCase();
        const ai = PRIORITY_EXAMS.findIndex(p => an.includes(p));
        const bi = PRIORITY_EXAMS.findIndex(p => bn.includes(p));
        if (ai >= 0 && bi < 0) return -1;
        if (bi >= 0 && ai < 0) return 1;
        if (ai >= 0 && bi >= 0) return ai - bi;
        return 0;
      })
      .slice(0, 12);
    if (!hits.length) { examDropdown.style.display = 'none'; return; }
    examDropdown.innerHTML = hits.map(ex => `
      <div class="symptom-option" data-exam-id="${ex.id}">
        ${iconHtml(ex, 'sm')}
        <span>${esc(ex.name)}</span>
      </div>`).join('');
    examDropdown.style.display = 'block';
    examDropdown.querySelectorAll('.symptom-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const eid = opt.dataset.examId;
        if (!session.completedExams.find(e => e.examId === eid)) {
          const revealableSymIds = data.examToSymptoms[eid] || [];
          const foundSymptoms = revealableSymIds.length === 1 ? [revealableSymIds[0]] : [];
          session.completedExams.push({ examId: eid, foundSymptoms, noneFound: false });
          if (foundSymptoms.length) {
            const sid = foundSymptoms[0];
            if (!session.confirmedSymptoms.includes(sid)) session.confirmedSymptoms.push(sid);
          }
          recomputeNegatedSymptoms(session, data);
        }
        examInput.value = '';
        examDropdown.style.display = 'none';
        save();
      });
    });
  }

  examDropdown?.addEventListener('mousedown', e => e.preventDefault());
  examInput?.addEventListener('focus', () => showExamDropdown(examInput.value));
  examInput?.addEventListener('input', () => showExamDropdown(examInput.value));
  examInput?.addEventListener('blur', () => setTimeout(() => { examDropdown.style.display = 'none'; }, 180));
  if (examInput) wireDropdownKeys(examInput, () => examDropdown);

  // Remove completed exam
  root.querySelectorAll('[data-rm-exam]').forEach(btn => {
    btn.addEventListener('click', () => {
      removeExam(session, data, btn.dataset.rmExam);
      save();
    });
  });

  // Per-exam symptom pickers
  session.completedExams.forEach(entry => {
    const { examId } = entry;
    const revealableSymIds = data.examToSymptoms[examId] || [];
    const isOpenExam = examId === 'EXM_RECEPTION_FAST';

    root.querySelectorAll(`[data-rm-found-exam="${examId}"]`).forEach(btn => {
      btn.addEventListener('click', () => {
        removeFoundSymptom(session, data, examId, btn.dataset.rmFoundSym);
        save();
      });
    });

    root.querySelector(`[data-unset-none-found="${examId}"]`)?.addEventListener('click', () => {
      setNoneFound(session, data, examId, false);
      save();
    });

    if (!revealableSymIds.length && !isOpenExam) return;

    const addBtn   = root.querySelector(`[data-add-sym-exam="${examId}"]`);
    const dropdown = root.querySelector(`[data-exam-dropdown="${examId}"]`);
    if (!addBtn || !dropdown) return;

    const symPool = isOpenExam ? openExamSymPool : revealableSymIds;

    dropdown.addEventListener('click', e => e.stopPropagation());

    function renderSymOpts(q = '') {
      const foundSet = new Set(entry.foundSymptoms);
      const ql = q.toLowerCase();
      const avail = symPool
        .filter(sid => !foundSet.has(sid))
        .filter(sid => deptSymIds.has(sid))
        .filter(sid => !candidateSymIds || candidateSymIds.has(sid))
        .map(sid => data.symptoms[sid])
        .filter(s => s && (!ql || s.name.toLowerCase().includes(ql)));
      const noSymOpt = `<div class="symptom-option no-sym-option" data-no-sym="${examId}">
        <span class="no-sym-label">${t('no_symptom_uncovered')}</span>
      </div>`;
      const symOpts = avail.map(s => `
        <div class="symptom-option" data-sid="${s.id}">
          ${iconHtml(s, 'sm')}
          <span>${esc(s.name)}</span>
        </div>`).join('');
      dropdown.querySelector('.sym-opts').innerHTML = noSymOpt + symOpts;
      dropdown.querySelectorAll('.symptom-option').forEach(opt => {
        opt.addEventListener('click', () => {
          if (opt.dataset.noSym) {
            setNoneFound(session, data, examId, true);
          } else {
            addFoundSymptom(session, data, examId, opt.dataset.sid);
          }
          dropdown.style.display = 'none';
          save();
        });
      });
    }

    addBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (dropdown.style.display !== 'none') { dropdown.style.display = 'none'; return; }
      dropdown.innerHTML = `
        <div class="sym-dropdown-search">
          <input class="sym-dropdown-filter" type="search" placeholder="${t('filter_symptoms_short')}" autocomplete="off">
        </div>
        <div class="sym-opts"></div>`;
      renderSymOpts();
      const filterInput = dropdown.querySelector('.sym-dropdown-filter');
      filterInput.addEventListener('input', () => renderSymOpts(filterInput.value));
      wireDropdownKeys(filterInput, () => dropdown.querySelector('.sym-opts'));
      dropdown.style.display = 'block';
      requestAnimationFrame(() => filterInput?.focus());
      const closeHandler = () => { dropdown.style.display = 'none'; document.removeEventListener('click', closeHandler); };
      document.addEventListener('click', closeHandler);
    });
  });

  // Recommended exam action buttons
  root.querySelectorAll('[data-reco-found]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const examId = btn.dataset.recoFound;
      if (!session.completedExams.find(e => e.examId === examId)) {
        const revealableSymIds = data.examToSymptoms[examId] || [];
        const foundSymptoms = revealableSymIds.length === 1 ? [revealableSymIds[0]] : [];
        session.completedExams.push({ examId, foundSymptoms, noneFound: false });
        if (foundSymptoms.length) {
          const sid = foundSymptoms[0];
          if (!session.confirmedSymptoms.includes(sid)) session.confirmedSymptoms.push(sid);
        }
        recomputeNegatedSymptoms(session, data);
        save();
      }
    });
  });

  root.querySelectorAll('[data-reco-none]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const examId = btn.dataset.recoNone;
      if (!session.completedExams.find(e => e.examId === examId)) {
        session.completedExams.push({ examId, foundSymptoms: [], noneFound: false });
        setNoneFound(session, data, examId, true);
        save();
      }
    });
  });

  // Add-exam pickers for standalone symptoms
  const examFoundSet2 = new Set(session.completedExams.flatMap(e => e.foundSymptoms));
  const standaloneSymIds = session.confirmedSymptoms.filter(sid => !examFoundSet2.has(sid));

  standaloneSymIds.forEach(sid => {
    const addBtn   = root.querySelector(`[data-add-exam-for-sym="${sid}"]`);
    const dropdown = root.querySelector(`[data-exam-for-sym="${sid}"]`);
    if (!addBtn || !dropdown) return;

    const sym = data.symptoms[sid];
    const availableExams = (sym?.examinations || [])
      .map(eid => data.examinations[eid])
      .filter(ex => ex && !session.completedExams.find(e => e.examId === ex.id));

    dropdown.addEventListener('click', e => e.stopPropagation());

    addBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (dropdown.style.display !== 'none') { dropdown.style.display = 'none'; return; }
      dropdown.innerHTML = availableExams.map(ex => `
        <div class="symptom-option" data-exam-id="${ex.id}">
          ${iconHtml(ex, 'sm')}
          <span>${esc(ex.name)}</span>
        </div>`).join('') || `<div class="symptom-option" style="color:var(--text-muted);font-style:italic;cursor:default">${t('no_exams_available')}</div>`;
      dropdown.style.display = 'block';
      dropdown.querySelectorAll('.symptom-option[data-exam-id]').forEach(opt => {
        opt.addEventListener('click', () => {
          const eid = opt.dataset.examId;
          if (!session.completedExams.find(e => e.examId === eid)) {
            session.completedExams.push({ examId: eid, foundSymptoms: [sid], noneFound: false });
          }
          dropdown.style.display = 'none';
          save();
        });
      });
      const closeHandler = () => { dropdown.style.display = 'none'; document.removeEventListener('click', closeHandler); };
      document.addEventListener('click', closeHandler);
    });
  });
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
