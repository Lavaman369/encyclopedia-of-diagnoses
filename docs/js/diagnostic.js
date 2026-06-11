import { t } from './i18n/index.js';
import { isEntityVisible } from './store.js';

export function recommendExams(session, data, activeDepts) {
  const depts = activeDepts || session.activeDepts || [];
  const { confirmedSymptoms = [], negatedSymptoms = [], completedExams = [] } = session;

  const confirmedSet = new Set(confirmedSymptoms);
  const negatedSet   = new Set(negatedSymptoms);
  const doneExams    = new Set(completedExams.map(e => e.examId));

  // ---- Phase 1: Bayesian posterior scoring ----
  const rawScores = [];

  for (const diag of Object.values(data.diagnoses)) {
    if (!depts.includes(diag.departmentRef)) continue;
    if (!isEntityVisible(diag)) continue;

    const prior   = diag.occurrenceRate || 50;
    const symProb = new Map(diag.symptoms.map(sr => [sr.symptomRef, sr.probability / 100]));

    let likelihood = 1.0;
    for (const sid of confirmedSet) {
      const p = symProb.get(sid);
      if (p !== undefined) {
        likelihood *= p;
      } else {
        likelihood = 0; // symptom not possible for this diagnosis → hard elimination
        break;
      }
    }
    for (const sid of negatedSet) {
      likelihood *= 1 - (symProb.get(sid) ?? 0);
    }

    const raw = prior * likelihood;
    if (raw > 0) rawScores.push({ diag, raw, symProb });
  }

  const total = rawScores.reduce((s, v) => s + v.raw, 0);
  if (total === 0) return { candidates: [], recommendedExams: [] };

  const MIN_POSTERIOR = 0.001;
  const allCandidates = rawScores
    .map(({ diag, raw, symProb }) => ({ diag, symProb, posterior: raw / total }))
    .filter(c => c.posterior >= MIN_POSTERIOR)
    .sort((a, b) => b.posterior - a.posterior);

  if (allCandidates.length === 0) return { candidates: [], recommendedExams: [] };

  // ---- Phase 2: Exam recommendations via expected information gain ----
  const currentH  = entropy(allCandidates.map(c => c.posterior));
  const examScores = [];

  for (const [examId, revealableSymIds] of Object.entries(data.examToSymptoms)) {
    if (doneExams.has(examId)) continue;

    const unchecked = revealableSymIds.filter(
      sid => !confirmedSet.has(sid) && !negatedSet.has(sid)
    );
    if (unchecked.length === 0) continue;

    let totalInfoGain = 0;
    const reveals = [];

    for (const sid of unchecked) {
      const sym = data.symptoms[sid];
      if (!sym) continue;

      const pPresent = allCandidates.reduce(
        (sum, c) => sum + c.posterior * (c.symProb.get(sid) ?? 0),
        0
      );
      if (pPresent <= 0 || pPresent >= 1) continue;
      const pAbsent = 1 - pPresent;

      const postIfFound    = allCandidates.map(c =>
        c.posterior * (c.symProb.get(sid) ?? 0) / pPresent
      );
      const postIfNotFound = allCandidates.map(c =>
        c.posterior * (1 - (c.symProb.get(sid) ?? 0)) / pAbsent
      );

      const infoGain = currentH
        - pPresent * entropy(postIfFound)
        - pAbsent  * entropy(postIfNotFound);

      if (infoGain <= 0) continue;

      const isMainOfTop = !!sym.isMainSymptom &&
        allCandidates.slice(0, 5).some(c => c.symProb.has(sid) && c.posterior > 0.1);

      const topCand = allCandidates[0];
      const topPostIfFound = topCand.posterior * (topCand.symProb.get(sid) ?? 0) / pPresent;
      const isDecisive = topPostIfFound >= 0.95;

      totalInfoGain += infoGain * (isDecisive ? 2.0 : isMainOfTop ? 1.5 : 1.0);
      reveals.push({ symptomId: sid, symptomName: sym.name || sid, isMain: !!sym.isMainSymptom, infoGain, isDecisive });
    }

    if (totalInfoGain <= 0) continue;

    reveals.sort((a, b) => b.infoGain - a.infoGain);

    const affectedCount = allCandidates.filter(c =>
      reveals.some(r => c.symProb.has(r.symptomId))
    ).length;

    examScores.push({
      examId,
      score: totalInfoGain,
      reveals,
      affectedCount,
      totalCount: allCandidates.length,
    });
  }

  examScores.sort((a, b) => b.score - a.score);

  // If a single diagnosis is confirmed, find unexamined collapse-risk symptoms
  const collapseExams = [];
  if (allCandidates[0].posterior >= 0.99) {
    const confirmedDiag = allCandidates[0].diag;
    const collapseByExam = new Map();
    for (const sr of confirmedDiag.symptoms) {
      const sym = data.symptoms[sr.symptomRef];
      if (!sym?.collapseSymptomRef || confirmedSet.has(sr.symptomRef)) continue;
      for (const examId of (sym.examinations || [])) {
        if (doneExams.has(examId)) continue;
        if (!collapseByExam.has(examId)) collapseByExam.set(examId, []);
        const names = collapseByExam.get(examId);
        if (!names.includes(sym.name || sr.symptomRef)) names.push(sym.name || sr.symptomRef);
      }
    }
    for (const [examId, symNames] of collapseByExam) {
      collapseExams.push({
        examId,
        score: Infinity,
        reveals: [],
        reasoning: t('collapse_risk_check', symNames.map(escHtml).join(', ')),
        isCollapse: true,
      });
    }
  }

  return {
    candidates: allCandidates.map(c => ({
      id:            c.diag.id,
      name:          c.diag.name,
      departmentRef: c.diag.departmentRef,
      iconIndex:     c.diag.iconIndex,
      modIcon:       c.diag.modIcon,
      occurrenceRate: c.diag.occurrenceRate,
      hasCollapse:   c.diag.symptoms.some(sr => data.symptoms[sr.symptomRef]?.collapseSymptomRef),
      matchPercent:  Math.round(c.posterior * 100),
      score:         Math.round(c.posterior * 100),
      confirmed:     c.posterior >= 0.99,
    })),
    recommendedExams: [...collapseExams, ...examScores],
  };
}

function entropy(probs) {
  let h = 0;
  for (const p of probs) {
    if (p > 0) h -= p * Math.log2(p);
  }
  return h;
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildReasoning(reveals, affectedCount, totalCount) {
  const topSyms = reveals.slice(0, 3);
  const extra   = reveals.length - topSyms.length;

  const symParts = topSyms.map(r => {
    let s = `<strong>${escHtml(r.symptomName)}</strong>`;
    if (r.isDecisive) s += ` <span class="reco-tag reco-tag-decisive">${t('reco_confirms_top')}</span>`;
    else if (r.isMain) s += ` <span class="reco-tag reco-tag-main">${t('reco_main_symptom')}</span>`;
    return s;
  });

  const symHtml  = symParts.join(', ') + (extra > 0 ? `, <span class="reco-more">${t('reco_more', extra)}</span>` : '');
  const coverage = t('reco_coverage', affectedCount, totalCount);

  return `${t('reco_reveals_prefix')}${symHtml}<span class="reco-sep"> · </span><span class="reco-coverage">${coverage}</span>`;
}
