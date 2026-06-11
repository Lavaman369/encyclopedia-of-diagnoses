import { getData } from '../store.js';
import { iconHtml } from '../icons.js';

export function renderSearch(root, params) {
  const data = getData();
  const depts = data.departments;

  let query = params.q || '';
  let type = params.type || 'all';

  function build() {
    root.innerHTML = `
      <div class="search-page">
        <div class="page-header" style="text-align:center">
          <h1>Search</h1>
          <p>Search across diagnoses, symptoms, examinations, and treatments</p>
        </div>
        <div class="search-bar-wrap">
          <div class="search-input-row">
            <input class="search-input" id="search-input" type="search" placeholder="Search…" value="${esc(query)}" autocomplete="off" autofocus>
          </div>
          <div class="search-type-row">
            ${['all','diagnoses','symptoms','examinations','treatments'].map(t =>
              `<button class="type-btn${type === t ? ' active' : ''}" data-type="${t}">${cap(t)}</button>`
            ).join('')}
          </div>
        </div>
        <div class="search-results" id="search-results"></div>
      </div>`;

    const input = root.querySelector('#search-input');
    const resultsEl = root.querySelector('#search-results');

    root.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        type = btn.dataset.type;
        root.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type));
        updateHash();
        doSearch(resultsEl, data, depts, query, type);
      });
    });

    input.addEventListener('input', () => {
      query = input.value;
      updateHash();
      doSearch(resultsEl, data, depts, query, type);
    });

    if (query) doSearch(resultsEl, data, depts, query, type);
    else resultsEl.innerHTML = '<div class="search-empty">Type to search across all game data.</div>';
  }

  function updateHash() {
    const q = query ? `q=${encodeURIComponent(query)}&` : '';
    history.replaceState(null, '', `#/search?${q}type=${type}`);
  }

  build();
}

function doSearch(resultsEl, data, depts, query, type) {
  if (!query.trim()) {
    resultsEl.innerHTML = '<div class="search-empty">Type to search across all game data.</div>';
    return;
  }

  const q = query.toLowerCase();
  let html = '';

  if (type === 'all' || type === 'diagnoses') {
    const hits = Object.values(data.diagnoses)
      .filter(d => matches(q, d.name, d.description))
      .slice(0, 30);
    if (hits.length) html += renderSection('Diagnoses', hits, d => {
      const dept = depts[d.departmentRef];
      return `
        <a class="entity-row" href="#/diagnoses/${d.id}">
          ${iconHtml(d, 'sm')}
          <span class="entity-row-name">${highlight(esc(d.name), q)}</span>
          <span class="entity-row-meta">
            ${dept ? `<span class="badge ${dept.isDLC ? 'badge-dlc' : 'badge-blue'}">${esc(dept.name)}</span>` : ''}
          </span>
        </a>`;
    });
  }

  if (type === 'all' || type === 'symptoms') {
    const hits = Object.values(data.symptoms)
      .filter(s => !s.isStub && matches(q, s.name, s.description))
      .slice(0, 30);
    if (hits.length) html += renderSection('Symptoms', hits, s =>
      `<a class="entity-row" href="#/symptoms/${s.id}">
        ${iconHtml(s, 'sm')}
        <span class="entity-row-name">${highlight(esc(s.name), q)}</span>
        <span class="entity-row-meta">
          <span class="badge badge-${(s.hazard||'low').toLowerCase()}">${s.hazard||'Low'}</span>
        </span>
      </a>`
    );
  }

  if (type === 'all' || type === 'examinations') {
    const hits = Object.values(data.examinations)
      .filter(e => matches(q, e.name, e.description))
      .slice(0, 30);
    if (hits.length) html += renderSection('Examinations', hits, e =>
      `<a class="entity-row" href="#/examinations/${e.id}">
        ${iconHtml(e, 'sm')}
        <span class="entity-row-name">${highlight(esc(e.name), q)}</span>
        <span class="entity-row-meta">
          <span class="badge badge-blue">${e.examinationType}</span>
          ${e.cost ? `<span class="count-chip">$${e.cost}</span>` : ''}
        </span>
      </a>`
    );
  }

  if (type === 'all' || type === 'treatments') {
    const hits = Object.values(data.treatments)
      .filter(t => matches(q, t.name, t.description))
      .slice(0, 30);
    if (hits.length) html += renderSection('Treatments', hits, t =>
      `<a class="entity-row" href="#/treatments/${t.id}">
        ${iconHtml(t, 'sm')}
        <span class="entity-row-name">${highlight(esc(t.name), q)}</span>
        <span class="entity-row-meta">
          <span class="badge badge-blue">${t.treatmentType}</span>
        </span>
      </a>`
    );
  }

  resultsEl.innerHTML = html || '<div class="search-empty">No results found.</div>';
}

function renderSection(title, items, rowFn) {
  return `
    <div class="search-section">
      <div class="search-section-title">${title} <span class="count-chip">${items.length}</span></div>
      <div class="entity-list">${items.map(rowFn).join('')}</div>
    </div>`;
}

function matches(q, ...fields) {
  return fields.some(f => f && f.toLowerCase().includes(q));
}

function highlight(html, q) {
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(safe, 'gi'), m => `<mark style="background:rgba(74,158,255,0.25);color:inherit;border-radius:2px">${m}</mark>`);
}

function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
