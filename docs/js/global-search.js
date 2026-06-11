import { getData } from './store.js';
import { iconHtml } from './icons.js';
import { t } from './i18n/index.js';

export function initGlobalSearch() {
  const input = document.getElementById('global-search-input');
  const dropdown = document.getElementById('global-search-dropdown');
  if (!input || !dropdown) return;

  let current = [];
  let focusedIdx = -1;

  function getResultEls() {
    return [...dropdown.querySelectorAll('.gs-result')];
  }

  function setFocus(idx) {
    const els = getResultEls();
    els.forEach(el => el.classList.remove('focused'));
    focusedIdx = idx < 0 ? -1 : Math.min(idx, els.length - 1);
    if (focusedIdx >= 0) {
      els[focusedIdx].classList.add('focused');
      els[focusedIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  dropdown.addEventListener('mousedown', e => e.preventDefault());

  dropdown.addEventListener('click', e => {
    const result = e.target.closest('[data-href]');
    if (!result) return;
    e.preventDefault();
    window.location.hash = result.dataset.href;
    input.value = '';
    hide();
  });

  let _searchTimer = null;

  function runSearch() {
    focusedIdx = -1;
    const q = input.value.trim().toLowerCase();
    if (!q || q.length < 2) { hide(); return; }
    const data = getData();
    if (!data) { hide(); return; }

    const results = [];

    for (const d of Object.values(data.diagnoses)) {
      if (d.name.toLowerCase().includes(q))
        results.push({ type: t('search_type_diagnosis'), name: d.name, iconIndex: d.iconIndex, modIcon: d.modIcon, href: `/diagnoses/${d.id}` });
    }
    for (const s of Object.values(data.symptoms)) {
      if (!s.isStub && s.name.toLowerCase().includes(q))
        results.push({ type: t('search_type_symptom'), name: s.name, iconIndex: s.iconIndex, modIcon: s.modIcon, href: `/symptoms/${s.id}` });
    }
    for (const ex of Object.values(data.examinations)) {
      if (ex.name.toLowerCase().includes(q))
        results.push({ type: t('search_type_exam'), name: ex.name, iconIndex: ex.iconIndex, modIcon: ex.modIcon, href: `/examinations/${ex.id}` });
    }
    for (const trt of Object.values(data.treatments)) {
      if (!trt.isStub && trt.name.toLowerCase().includes(q))
        results.push({ type: t('search_type_treatment'), name: trt.name, iconIndex: trt.iconIndex, modIcon: trt.modIcon, href: `/treatments/${trt.id}` });
    }

    current = results.slice(0, 10);

    if (!current.length) {
      dropdown.innerHTML = `<div class="gs-empty">${t('search_no_results', esc(q))}</div>`;
    } else {
      dropdown.innerHTML = current.map(r => `
        <div class="gs-result" data-href="${r.href}">
          ${iconHtml(r, 'sm')}
          <span class="gs-result-name">${esc(r.name)}</span>
          <span class="gs-result-type">${r.type}</span>
        </div>`).join('');
    }
    dropdown.removeAttribute('aria-hidden');
    dropdown.style.display = 'block';
  }

  input.addEventListener('input', () => {
    if (!input.value.trim()) { hide(); return; }
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(runSearch, 150);
  });

  input.addEventListener('keydown', e => {
    const els = getResultEls();
    const isOpen = dropdown.style.display !== 'none' && els.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (isOpen) setFocus(focusedIdx < els.length - 1 ? focusedIdx + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) setFocus(focusedIdx > 0 ? focusedIdx - 1 : els.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const href = focusedIdx >= 0 ? els[focusedIdx]?.dataset.href : current[0]?.href;
      if (href) { window.location.hash = href; input.value = ''; hide(); }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      input.value = '';
      hide();
      input.blur();
    }
  });

  input.addEventListener('blur', () => setTimeout(hide, 180));

  function hide() {
    dropdown.style.display = 'none';
    dropdown.setAttribute('aria-hidden', 'true');
    current = [];
    focusedIdx = -1;
  }
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
