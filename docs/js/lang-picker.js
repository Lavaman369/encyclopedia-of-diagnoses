import { getLang, setLang } from './store.js';
import { setUiLocale, LOCALES } from './i18n/index.js';

// partial: true means DLC content is only partially translated — note shown in picker
export const LANGUAGES = [
  { code: 'en',    short: 'EN',  flag: '🇬🇧', label: 'English'                   },
  { code: 'fr',    short: 'FR',  flag: '🇫🇷', label: 'Français'                  },
  { code: 'de',    short: 'DE',  flag: '🇩🇪', label: 'Deutsch'                   },
  { code: 'es',    short: 'ES',  flag: '🇪🇸', label: 'Español'                   },
  { code: 'es-la', short: 'LA',  flag: '🇲🇽', label: 'Español (Latinoamérica)'   },
  { code: 'it',    short: 'IT',  flag: '🇮🇹', label: 'Italiano'                  },
  { code: 'pt-br', short: 'BR',  flag: '🇧🇷', label: 'Português (Brasil)'        },
  { code: 'nl',    short: 'NL',  flag: '🇳🇱', label: 'Nederlands'                },
  { code: 'pl',    short: 'PL',  flag: '🇵🇱', label: 'Polski'                    },
  { code: 'cz',    short: 'CZ',  flag: '🇨🇿', label: 'Čeština'                  },
  { code: 'hu',    short: 'HU',  flag: '🇭🇺', label: 'Magyar'                   },
  { code: 'ru',    short: 'RU',  flag: '🇷🇺', label: 'Русский'                  },
  { code: 'uk',    short: 'UK',  flag: '🇺🇦', label: 'Українська'              },
  { code: 'tr',    short: 'TR',  flag: '🇹🇷', label: 'Türkçe'                   },
  { code: 'swe',   short: 'SE',  flag: '🇸🇪', label: 'Svenska',  partial: 'ofullständig'  },
  { code: 'da',    short: 'DA',  flag: '🇩🇰', label: 'Dansk',    partial: 'ufuldstændig'  },
  { code: 'jp',    short: 'JP',  flag: '🇯🇵', label: '日本語'                   },
  { code: 'kr',    short: 'KR',  flag: '🇰🇷', label: '한국어'                   },
  { code: 'zh-cn', short: '简',  flag: '🇨🇳', label: '中文（简体）'            },
  { code: 'zh-tw', short: '繁',  flag: '🇹🇼', label: '中文（繁體）'            },
];

export function initLangPicker() {
  const wrap = document.getElementById('lang-picker');
  if (!wrap) return;

  // Apply any UI locale that was saved from a previous session.
  setUiLocale(LOCALES[getLang()]?.module ?? null);

  let open = false;
  let loading = false;

  function current() {
    return LANGUAGES.find(l => l.code === getLang()) || LANGUAGES[0];
  }

  function render() {
    const cur = current();
    wrap.innerHTML = `
      <button class="lang-picker-btn${open ? ' open' : ''}" id="lang-picker-btn"
              aria-label="Select language" aria-expanded="${open}" aria-haspopup="listbox"
              ${loading ? 'disabled' : ''}>
        <span class="lang-picker-flag">${cur.flag}</span>
        <span class="lang-picker-caret" aria-hidden="true">${loading ? '…' : '▼'}</span>
      </button>
      <div class="lang-picker-dropdown${open ? ' open' : ''}" role="listbox" aria-label="Select language">
        ${LANGUAGES.map(l => `
          <button class="lang-option${l.code === getLang() ? ' active' : ''}"
                  data-code="${l.code}" role="option" aria-selected="${l.code === getLang()}">
            <span class="lang-flag" aria-hidden="true">${l.flag}</span>
            <span class="lang-label">${l.label}${l.partial ? ` <span class="lang-partial">(${l.partial})</span>` : ''}</span>
          </button>`).join('')}
      </div>`;

    wrap.querySelector('#lang-picker-btn').addEventListener('click', e => {
      e.stopPropagation();
      if (loading) return;
      open = !open;
      render();
    });

    wrap.querySelectorAll('.lang-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.dataset.code;
        if (code === getLang() || loading) { open = false; render(); return; }
        open = false;
        loading = true;
        render();
        await setLang(code);
        setUiLocale(LOCALES[code]?.module ?? null);
        loading = false;
        render();
        document.dispatchEvent(new CustomEvent('langchange'));
      });
    });
  }

  document.addEventListener('click', () => {
    if (open) { open = false; render(); }
  });

  render();
}
