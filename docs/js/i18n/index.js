import en     from './en.js';
import fr     from './fr.js';
import de     from './de.js';
import es     from './es.js';
import es419  from './es-419.js';
import it     from './it.js';
import ptBr   from './pt-br.js';
import nl     from './nl.js';
import pl     from './pl.js';
import cz     from './cz.js';
import hu     from './hu.js';
import ru     from './ru.js';
import uk     from './uk.js';
import tr     from './tr.js';
import swe    from './swe.js';
import da     from './da.js';
import jp     from './jp.js';
import kr     from './kr.js';
import zhCn   from './zh-cn.js';
import zhTw   from './zh-tw.js';

export const LOCALES = {
  en:     { label: 'English',                module: en    },
  fr:     { label: 'Français',               module: fr    },
  de:     { label: 'Deutsch',                module: de    },
  es:     { label: 'Español',                module: es    },
  'es-la':  { label: 'Español (Latinoamérica)', module: es419 },
  it:     { label: 'Italiano',               module: it    },
  'pt-br':  { label: 'Português (Brasil)',     module: ptBr  },
  nl:     { label: 'Nederlands',             module: nl    },
  pl:     { label: 'Polski',                 module: pl    },
  cz:     { label: 'Čeština',               module: cz    },
  hu:     { label: 'Magyar',                 module: hu    },
  ru:     { label: 'Русский',               module: ru    },
  uk:     { label: 'Українська',           module: uk    },
  tr:     { label: 'Türkçe',               module: tr    },
  swe:    { label: 'Svenska',              module: swe   },
  da:     { label: 'Dansk',               module: da    },
  jp:     { label: '日本語',              module: jp    },
  kr:     { label: '한국어',              module: kr    },
  'zh-cn':  { label: '中文（简体）',      module: zhCn  },
  'zh-tw':  { label: '中文（繁體）',      module: zhTw  },
};

let _locale = en;

/**
 * Load a UI locale overlay. Pass null or omit to reset to English.
 * When other languages are added, call this with the imported locale module.
 */
export function setUiLocale(override) {
  _locale = override ? { ...en, ...override } : en;
}

/**
 * Translate a UI string by key.
 * If the value is a function, calls it with the provided args.
 * Falls back to the English locale if the key is missing in the current locale.
 */
export function t(key, ...args) {
  const val = _locale[key] ?? en[key];
  if (val === undefined) return key;
  if (typeof val === 'function') return val(...args);
  return val;
}

/**
 * Apply i18n to static DOM elements using data-i18n and data-i18n-placeholder attributes.
 * Call this on init and whenever the UI locale changes.
 */
export function applyI18nDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  const titleKey = document.querySelector('title')?.dataset?.i18n;
  if (titleKey) document.title = t(titleKey);
}
