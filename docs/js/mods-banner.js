import { getAvailableMods, getEnabledMods, setModEnabled, setModEnabledSync, getLang } from './store.js';
import { LANGUAGES } from './lang-picker.js';
import { t } from './i18n/index.js';

const STEAM_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="display:block;flex-shrink:0"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.497 1.009 2.455-.397.957-1.494 1.409-2.455 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.662 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z"/></svg>`;

// Build a Map<modId, modId[]> from the pre-computed conflictsWith fields in the manifest.
function buildConflictMap(mods) {
  const map = new Map();
  for (const mod of mods) {
    if (mod.conflictsWith?.length) map.set(mod.id, mod.conflictsWith);
  }
  return map;
}

const BANNER_KEY = 'ph_diag_mods_banner_open';
const HIDDEN_KEY = 'ph_diag_mods_banner_hidden';

let _rerouteCallback = null;

export function initModsBanner(rerouteCallback) {
  _rerouteCallback = rerouteCallback;
  document.addEventListener('langchange', render);
  render();
}

function syncPuzzleBtn(justHid) {
  const btn = document.getElementById('mods-puzzle-btn');
  if (!btn) return;
  const mods = getAvailableMods();
  if (mods.length === 0) {
    btn.hidden = true;
    btn.onclick = null;
    return;
  }
  btn.hidden = false;
  const bannerHidden = localStorage.getItem(HIDDEN_KEY) === 'true';
  const enabled = getEnabledMods();
  const enabledCount = mods.filter(m => enabled.has(m.id)).length;
  btn.classList.toggle('active', bannerHidden);
  btn.title = bannerHidden ? 'Community Mods — click to show' : 'Community Mods — click to hide';
  const countLabel = (bannerHidden && enabledCount > 0)
    ? `<span class="mods-puzzle-count">${esc(t('mods_enabled_count', enabledCount))}</span>`
    : '';
  btn.innerHTML = `🧩${countLabel}`;

  if (justHid) {
    btn.classList.remove('animate');
    void btn.offsetWidth;
    btn.classList.add('animate');
    btn.addEventListener('animationend', () => btn.classList.remove('animate'), { once: true });
  }

  btn.onclick = () => {
    const hiding = localStorage.getItem(HIDDEN_KEY) !== 'true';
    if (hiding) {
      // Slide banner up, then hide it and pop the puzzle button in
      const banner = document.getElementById('mods-banner');
      if (banner && !banner.hidden) {
        banner.classList.remove('banner-entering');
        banner.classList.add('banner-leaving');
        banner.addEventListener('animationend', () => {
          banner.classList.remove('banner-leaving');
          localStorage.setItem(HIDDEN_KEY, 'true');
          render(true);
        }, { once: true });
      } else {
        localStorage.setItem(HIDDEN_KEY, 'true');
        render(true);
      }
    } else {
      // Shrink puzzle button, then slide banner down
      btn.classList.remove('animate');
      btn.classList.add('shrink');
      btn.addEventListener('animationend', () => {
        btn.classList.remove('shrink');
        localStorage.removeItem(HIDDEN_KEY);
        render(false);
      }, { once: true });
    }
  };
}

function render(justHid = false) {
  const banner = document.getElementById('mods-banner');
  if (!banner) return;

  const mods = getAvailableMods();
  if (mods.length === 0) {
    banner.hidden = true;
    syncPuzzleBtn(false);
    return;
  }

  syncPuzzleBtn(justHid);

  if (localStorage.getItem(HIDDEN_KEY) === 'true') {
    banner.hidden = true;
    return;
  }

  const enabled = getEnabledMods();
  const isOpen = localStorage.getItem(BANNER_KEY) === 'open';
  const enabledCount = mods.filter(m => enabled.has(m.id)).length;
  const anyEnabled = enabledCount > 0;

  const summary = enabledCount === 0
    ? t('mods_summary_available', mods.length)
    : t('mods_summary_enabled', enabledCount, mods.length);

  const lang = getLang();
  const langInfo = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  const conflictMap = buildConflictMap(mods);

  const modToggles = mods.map(mod => {
    const on = enabled.has(mod.id);
    const steamUrl = mod.steamUrl || '';
    const steamDisabled = !steamUrl;
    const localizedLangs = mod.localizedLanguages || [];
    const notLocalized = localizedLangs.length > 0 && !localizedLangs.includes(lang);
    const warnTitle = notLocalized
      ? esc(t('mod_not_localized'))
      : '';

    // Conflict: only shown when this mod is NOT enabled and a conflicting mod IS enabled.
    const conflictingIds = conflictMap.get(mod.id) || [];
    const activeConflicts = !on ? conflictingIds.filter(cId => enabled.has(cId)) : [];
    const hasConflict = activeConflicts.length > 0;
    const conflictTooltip = hasConflict
      ? `Incompatible with: ${activeConflicts.map(cId => {
          const m = mods.find(m => m.id === cId);
          return m ? m.name : cId;
        }).join(', ')} — both add the same department. Disable it first.`
      : '';

    const toggleHtml = hasConflict
      ? `<span class="mod-conflict-icon" title="${esc(conflictTooltip)}" aria-label="${esc(conflictTooltip)}">⛔</span>`
      : `<button class="mods-toggle${on ? ' on' : ''}" data-mod="${esc(mod.id)}" aria-pressed="${on}">
            <span class="mods-toggle-track"><span class="mods-toggle-thumb"></span></span>
            <span class="mods-toggle-label">${on ? t('mods_toggle_enabled') : t('mods_toggle_disabled')}</span>
          </button>`;

    return `
      <div class="mod-card${notLocalized ? ' mod-card--unlocalised' : ''}${hasConflict ? ' mod-card--conflicted' : ''}">
        <div class="mod-card-info">
          <span class="mod-card-name">${esc(mod.name)}</span>
          <span class="mod-card-author">by ${esc(mod.author)}</span>
        </div>
        <div class="mod-card-actions">
          ${notLocalized ? `<span class="mod-lang-warn" title="${warnTitle}" aria-label="${esc(langInfo.flag + ' ' + t('mod_not_localized'))}">⚠ ${langInfo.flag}</span>` : ''}
          <a class="mod-steam-btn${steamDisabled ? ' mod-steam-btn--disabled' : ''}"
            href="${steamDisabled ? '#' : esc(steamUrl)}"
            ${steamDisabled ? 'aria-disabled="true" tabindex="-1"' : 'target="_blank" rel="noopener noreferrer"'}
            title="${steamDisabled ? 'Steam Workshop page not yet available' : 'View on Steam Workshop'}">
            ${STEAM_ICON}Steam
          </a>
          ${toggleHtml}
        </div>
      </div>`;
  }).join('');

  const wasHidden = banner.hidden;
  banner.hidden = false;
  banner.innerHTML = `
    <div class="mods-banner-inner">
      <div class="mods-banner-header" id="mods-banner-toggle" role="button" tabindex="0" aria-expanded="${isOpen}">
        <span class="mods-banner-icon">🧩</span>
        <span class="mods-banner-title">${t('mods_banner_title')}</span>
        <span class="mods-banner-summary">${esc(summary)}</span>
        <button class="mods-all-btn mods-all-btn--disable" id="mods-toggle-all">
          ${t('mods_disable_all')}
        </button>
        <span class="mods-banner-chevron${isOpen ? ' open' : ''}">▾</span>
      </div>
      <div class="mods-banner-body${isOpen ? ' open' : ''}" id="mods-banner-body">
        <div class="mods-banner-mods">${modToggles}</div>
      </div>
    </div>`;

  const headerEl = banner.querySelector('#mods-banner-toggle');
  function toggleCollapse() {
    const body = banner.querySelector('#mods-banner-body');
    const chevron = banner.querySelector('.mods-banner-chevron');
    const opening = !body.classList.contains('open');
    body.classList.toggle('open', opening);
    chevron.classList.toggle('open', opening);
    headerEl.setAttribute('aria-expanded', String(opening));
    localStorage.setItem(BANNER_KEY, opening ? 'open' : 'closed');
  }
  headerEl.addEventListener('click', toggleCollapse);
  headerEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCollapse(); } });

  banner.querySelector('#mods-toggle-all').addEventListener('click', async e => {
    e.stopPropagation();
    mods.forEach(mod => setModEnabledSync(mod.id, false));
    render();
    // Rebuild active dataset with empty mod set (disable all = any mod triggers rebuild)
    if (mods.length > 0) await setModEnabled(mods[0].id, false);
    if (_rerouteCallback) _rerouteCallback();
  });

  banner.querySelectorAll('.mods-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const modId = btn.dataset.mod;
      const nowEnabled = !btn.classList.contains('on');
      // Optimistically update localStorage and re-render the banner immediately
      setModEnabledSync(modId, nowEnabled);
      render();
      // Fetch mod data (if enabling) and rebuild active dataset
      await setModEnabled(modId, nowEnabled);
      if (_rerouteCallback) _rerouteCallback();
    });
  });

  if (wasHidden) {
    banner.classList.remove('banner-leaving');
    requestAnimationFrame(() => {
      banner.classList.add('banner-entering');
      banner.addEventListener('animationend', () => banner.classList.remove('banner-entering'), { once: true });
    });
  }
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
