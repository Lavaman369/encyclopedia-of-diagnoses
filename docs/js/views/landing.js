import { t } from '../i18n/index.js';

export function renderLanding(root) {
  const sections = [
    { href: '#/diagnoses',    labelKey: 'nav_diagnoses',    color: '43,143,255',  descKey: 'landing_diagnoses_desc' },
    { href: '#/symptoms',     labelKey: 'nav_symptoms',     color: '233,69,96',   descKey: 'landing_symptoms_desc' },
    { href: '#/examinations', labelKey: 'nav_examinations', color: '61,201,142',  descKey: 'landing_examinations_desc' },
    { href: '#/treatments',   labelKey: 'nav_treatments',   color: '240,180,41',  descKey: 'landing_treatments_desc' },
    { href: '#/diagnostic',   labelKey: 'nav_diagnostic',   color: '155,114,207', descKey: 'landing_diagnostic_desc' },
    { href: '#/statistics',   labelKey: 'nav_statistics',   color: '46,196,182',  descKey: 'landing_statistics_desc' },
    { href: '#/about',        labelKey: 'nav_about',        color: '255,140,70',  descKey: 'landing_about_desc' },
  ];

  const cards = sections.map((s, i) => `
    <a class="landing-nav-card" href="${s.href}" style="--i:${i};--card-rgb:${s.color}">
      <span class="landing-card-label">${t(s.labelKey)}</span>
      <span class="landing-card-desc">${t(s.descKey)}</span>
    </a>`).join('');

  root.innerHTML = `
    <div class="landing-page">
      <div class="landing-hero">
        <div class="landing-hero-icon">⚕</div>
        <h1 class="landing-title">${t('site_title')}</h1>
        <p class="landing-byline">${t('site_byline')}</p>
        <p class="landing-subtitle">${t('site_subtitle')}</p>
      </div>
      <div class="landing-nav-grid">${cards}</div>
    </div>`;
}
