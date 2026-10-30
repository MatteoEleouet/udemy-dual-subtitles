// Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultSettings } = require('../core.js');
const { STRINGS, resolveUiLanguage, translate, languageName } = require('../i18n.js');

test('defaults put English on top and the browser language underneath', () => {
  assert.equal(defaultSettings('es-419').secondary, 'es');
  assert.equal(defaultSettings('fr').secondary, 'fr');
  assert.equal(defaultSettings('pt_BR').primary, 'en');
});

test('an English browser gets French underneath, not English twice', () => {
  assert.equal(defaultSettings('en-US').secondary, 'fr');
  assert.equal(defaultSettings(undefined).secondary, 'fr');
});

test('the interface follows the browser unless a language is chosen', () => {
  assert.equal(resolveUiLanguage('auto', 'fr-CA'), 'fr');
  assert.equal(resolveUiLanguage('auto', 'de-DE'), 'en'); // no German strings: English
  assert.equal(resolveUiLanguage('en', 'fr-FR'), 'en');
  assert.equal(resolveUiLanguage('xx', 'fr'), 'fr'); // unknown choice: back to the browser
});

test('every language has every string', () => {
  const keys = Object.keys(STRINGS.en).sort();
  for (const [lang, strings] of Object.entries(STRINGS)) {
    assert.deepEqual(Object.keys(strings).sort(), keys, `${lang} is missing or has extra keys`);
  }
});

test('translate fills placeholders and falls back to English', () => {
  assert.equal(translate('fr', 'cues', { n: 12 }), '12 répliques');
  assert.equal(translate('en', 'noTrack', { lang: 'French' }), 'no French subtitles in this lecture');
  assert.equal(translate('zz', 'size'), 'Size');
});

test('language names are written in the interface language', () => {
  assert.equal(languageName('fr', 'en'), 'French');
  assert.equal(languageName('de', 'fr'), 'Allemand');
  assert.equal(languageName('pt_BR', 'en'), 'Brazilian Portuguese');
});
