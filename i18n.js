/**
 * The popup's words, in English and French.
 *
 * Not chrome.i18n: that follows the browser's language with no way to pick
 * another, and people learning with this often want the interface in a
 * language other than their browser's. The manifest's name and description
 * still use _locales, the only way Chrome reads them.
 *
 * Adding a language: copy the `en` block, translate the values, and add the
 * code to UI_LANGUAGES.
 */
(function (root) {
  'use strict';

  const STRINGS = {
    en: {
      title: 'Dual subtitles',
      toggle: 'Turn on / off',
      primary: 'Main language',
      secondary: 'Second language',
      size: 'Size',
      width: 'Width',
      margin: 'Bottom margin',
      hideNative: "Hide Udemy's own subtitles",
      translateFallback: 'Translate with Chrome when the language is missing',
      uiLanguage: 'Interface',
      uiAuto: 'Browser language',
      reset: 'Reset',
      statusOpen: 'Open a Udemy lecture to see its subtitles.',
      statusLecture: "Open a lecture (not the course's landing page).",
      statusReload: 'Reload the Udemy tab (F5) to start the extension.',
      main: 'Main',
      line: '{name}: {text}',
      second: 'Second',
      loading: 'loading…',
      cues: '{n} lines',
      auto: 'automatic',
      translated: 'translated by Chrome',
      noTrack: 'no {lang} subtitles in this lecture',
      noTranslator: 'no {lang} subtitles, and no built-in translator in this Chrome',
      api: 'Udemy did not answer ({detail}) — signed in and enrolled?',
      file: 'subtitle file unavailable ({detail})',
      privacy: 'Settings stay in your Chrome profile. Nothing is sent anywhere but Udemy.',
    },
    fr: {
      title: 'Double sous-titres',
      toggle: 'Activer / désactiver',
      primary: 'Langue principale',
      secondary: 'Seconde langue',
      size: 'Taille',
      width: 'Largeur',
      margin: 'Marge du bas',
      hideNative: "Masquer les sous-titres d'Udemy",
      translateFallback: 'Traduire avec Chrome si la langue manque',
      uiLanguage: 'Interface',
      uiAuto: 'Langue du navigateur',
      reset: 'Réinitialiser',
      statusOpen: 'Ouvre une leçon Udemy pour voir ses sous-titres.',
      statusLecture: 'Ouvre une leçon (pas la page de présentation du cours).',
      statusReload: "Recharge l'onglet Udemy (F5) pour activer l'extension.",
      main: 'Principale',
      line: '{name} : {text}',
      second: 'Seconde',
      loading: 'chargement…',
      cues: '{n} répliques',
      auto: 'automatique',
      translated: 'traduite par Chrome',
      noTrack: 'pas de sous-titres en {lang} pour cette leçon',
      noTranslator: 'pas de sous-titres en {lang}, et pas de traducteur intégré dans ce Chrome',
      api: "Udemy n'a pas répondu ({detail}) — connecté et inscrit au cours ?",
      file: 'fichier de sous-titres indisponible ({detail})',
      privacy: "Les réglages restent dans ton profil Chrome. Rien n'est envoyé ailleurs qu'à Udemy.",
    },
  };

  const UI_LANGUAGES = Object.keys(STRINGS);

  /** The interface language actually used, from the setting and the browser. */
  function resolveUiLanguage(setting, browserLanguage) {
    if (setting && setting !== 'auto' && STRINGS[setting]) return setting;
    const base = String(browserLanguage || 'en').toLowerCase().split(/[-_]/)[0];
    return STRINGS[base] ? base : 'en';
  }

  /** A string in `lang`, with `{name}` placeholders filled; English as fallback. */
  function translate(lang, key, params = {}) {
    const template = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_, name) => (name in params ? String(params[name]) : `{${name}}`));
  }

  /** "French", "français", "Französisch"… — a language's name in the interface language. */
  function languageName(code, uiLang) {
    try {
      const name = new Intl.DisplayNames([uiLang], { type: 'language' }).of(code.replace('_', '-'));
      return name ? name.charAt(0).toLocaleUpperCase(uiLang) + name.slice(1) : code;
    } catch {
      return code;
    }
  }

  const api = { STRINGS, UI_LANGUAGES, resolveUiLanguage, translate, languageName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DualSubsI18n = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
