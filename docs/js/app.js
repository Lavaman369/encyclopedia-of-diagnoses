import { loadData } from './store.js';
import { renderDiagnoses } from './views/diagnoses.js';
import { renderSymptoms } from './views/symptoms.js';
import { renderExaminations } from './views/examinations.js';
import { renderTreatments } from './views/treatments.js';
import { renderDiagnosticTool } from './views/diagnostic-tool.js';
import { renderStats } from './views/stats.js';
import { renderLanding } from './views/landing.js';
import { renderAbout } from './views/about.js';
import { initGlobalSearch } from './global-search.js';
import { initLangPicker } from './lang-picker.js';
import { t, applyI18nDOM } from './i18n/index.js';
import { initModsBanner } from './mods-banner.js';

const root = document.getElementById('app-root');

// ---- Global search (wired once; reads data lazily via getData()) ----
initGlobalSearch();
initLangPicker();
applyI18nDOM();

// ---- Router ----
function parseHash() {
  const hash = window.location.hash.slice(1) || '/home';
  const [pathStr, queryStr] = hash.split('?');
  const parts = pathStr.split('/').filter(Boolean);
  const params = {};
  if (queryStr) for (const [k, v] of new URLSearchParams(queryStr)) params[k] = v;
  return { tab: parts[0] || 'diagnoses', id: parts[1] || null, params };
}

function setActiveTab(tab) {
  document.querySelectorAll('.nav-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
}

async function route() {
  const { tab, id, params } = parseHash();
  setActiveTab(tab);
  window.scrollTo({ top: 0, behavior: 'instant' });

  root.innerHTML = `<div class="loading-screen"><div class="loading-spinner"></div><p>${t('loading')}</p></div>`;
  try {
    await loadData();
  } catch (e) {
    root.innerHTML = `<div class="page"><p class="text-red">${t('load_error')}</p></div>`;
    return;
  }

  initModsBanner(route);

  switch (tab) {
    case 'diagnoses':    renderDiagnoses(root, id, params);    break;
    case 'symptoms':     renderSymptoms(root, id, params);     break;
    case 'examinations': renderExaminations(root, id, params); break;
    case 'treatments':   renderTreatments(root, id, params);   break;
    case 'diagnostic':   renderDiagnosticTool(root);           break;
    case 'statistics':   renderStats(root);                    break;
    case 'home':         renderLanding(root);                  break;
    case 'about':        renderAbout(root);                    break;
    default:             renderLanding(root);                  break;
  }
}

window.addEventListener('hashchange', route);
document.addEventListener('DOMContentLoaded', route);
document.addEventListener('langchange', () => { applyI18nDOM(); route(); });
