import { getData, getAvailableMods } from '../store.js';
import { t } from '../i18n/index.js';

function fmtDate(iso) {
  if (!iso) return `<span style="color:var(--text-faint)">${t('about_date_unknown')}</span>`;
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function buildDataUpdatedSection(data) {
  const depts       = data?.departments || {};
  const mods        = getAvailableMods();
  const dataUpdated = data?.dataUpdated || {};

  const rows = [];
  let rowIndex = 0;

  const baseDepts = Object.values(depts)
    .filter(d => !d.isDLC && !d.isMod)
    .sort((a, b) => a.order - b.order);
  for (const dept of baseDepts) {
    rows.push(`
      <li class="data-updated-row" style="--i:${rowIndex++}" data-search="base game ${dept.name.toLowerCase()} ${dept.abbreviation.toLowerCase()}">
        <span class="dur-name">${dept.name}</span>
        <span class="dur-type dur-type--base">${t('about_type_base')}</span>
        <span class="dur-date">${fmtDate(dataUpdated.baseGame)}</span>
      </li>`);
  }

  const dlcDepts = Object.values(depts)
    .filter(d => d.isDLC)
    .sort((a, b) => a.order - b.order);
  for (const dept of dlcDepts) {
    const dateKey = dept.id === 'DPT_INFECTIOUS_DISEASES_DEPARTMENT'
      ? 'dlcInfectiousDiseases'
      : 'dlcTraumatology';
    rows.push(`
      <li class="data-updated-row" style="--i:${rowIndex++}" data-search="dlc ${dept.name.toLowerCase()} ${dept.abbreviation.toLowerCase()}">
        <span class="dur-name">${dept.name}</span>
        <span class="dur-type dur-type--dlc">${t('about_type_dlc')}</span>
        <span class="dur-date">${fmtDate(dataUpdated[dateKey])}</span>
      </li>`);
  }

  for (const mod of mods) {
    rows.push(`
      <li class="data-updated-row" style="--i:${rowIndex++}" data-search="mod ${mod.name.toLowerCase()}">
        <span class="dur-name">${mod.name}</span>
        <span class="dur-type dur-type--mod">${t('about_type_mod')}</span>
        <span class="dur-date">${fmtDate(mod.lastUpdated)}</span>
      </li>`);
  }

  return `
    <section class="about-section" style="--i:2">
      <h2 class="about-section-heading about-collapsible-heading open" data-target="data-updated-body">
        ${t('about_data_heading')}
        <span class="about-collapse-icon">&#9658;</span>
      </h2>
      <div id="data-updated-body" class="data-updated-body open">
        <p class="about-body">${t('about_data_desc')}</p>
        <ul class="data-updated-list">
          ${rows.join('')}
        </ul>
      </div>
    </section>`;
}

export function renderAbout(root) {
  const data = getData();

  root.innerHTML = `
    <div class="page about-page">
      <h1 class="about-title">${t('about_title')}</h1>

      <section class="about-section" style="--i:0">
        <h2 class="about-section-heading">${t('about_site_heading')}</h2>
        <p class="about-body">${t('about_site_p1')}</p>
        <p class="about-body">${t('about_site_p2')}</p>
        <p class="about-body">${t('about_site_p3')}</p>
      </section>

      <section class="about-section" style="--i:1">
        <h2 class="about-section-heading">${t('about_ack_heading')}</h2>
        <p class="about-body">${t('about_ack_desc')}</p>
        <ul class="about-ack-list">
          <li>${t('about_ack_breachandclear')}</li>
          <li>${t('about_ack_floppydisk')}</li>
          <li>${t('about_ack_proholmes')}</li>
        </ul>
      </section>

      ${buildDataUpdatedSection(data)}

      <section class="about-section" style="--i:3">
        <h2 class="about-section-heading">${t('about_faq_heading')}</h2>
        <dl class="faq-list">

          <dt class="faq-q">${t('about_q_diag_tool')}</dt>
          <dd class="faq-a">${t('about_a_diag_tool')}</dd>

          <dt class="faq-q">${t('about_q_mods')}</dt>
          <dd class="faq-a">${t('about_a_mods')}</dd>

          <dt class="faq-q">${t('about_q_corrections')}</dt>
          <dd class="faq-a">${t('about_a_corrections')}</dd>

          <dt class="faq-q">${t('about_q_version3')}</dt>
          <dd class="faq-a">
            <p>${t('about_a_version3_p1')}</p>
            <p>${t('about_a_version3_p2')}</p>
            <p>${t('about_a_version3_p3')}</p>
            <p>${t('about_a_version3_p4')}</p>
          </dd>

          <dt class="faq-q">${t('about_q_ph_encyclopedia')}</dt>
          <dd class="faq-a">${t('about_a_ph_encyclopedia')}</dd>

          <dt class="faq-q">${t('about_q_translation')}</dt>
          <dd class="faq-a">
            <p>${t('about_a_translation_p1')}</p>
            <p>${t('about_a_translation_p2')}</p>
          </dd>

        </dl>
      </section>
    </div>`;

  const heading = root.querySelector('.about-collapsible-heading');
  if (heading) {
    heading.addEventListener('click', () => {
      const body = document.getElementById(heading.dataset.target);
      if (!body) return;
      const isOpen = body.classList.toggle('open');
      heading.classList.toggle('open', isOpen);
    });
  }
}
