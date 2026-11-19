/**
 * Imports subtitle files from a course folder into chrome.storage.local.
 *
 * The folder holds a course.json (lecture ids and file names) and subtitle
 * files named `<number> - <title>.<language>[.auto].srt|vtt`. A file is tied
 * to its lecture by the leading number, as course.json lists it, and stored as
 * `local:<lectureId>:<language>` for the content script.
 */
const { resolveUiLanguage, translate } = globalThis.DualSubsI18n;

const $ = (id) => document.getElementById(id);
const browserLanguage = chrome.i18n.getUILanguage();
let ui = resolveUiLanguage('auto', browserLanguage);
const t = (key, params) => translate(ui, key, params);

chrome.storage.sync.get({ uiLanguage: 'auto' }, ({ uiLanguage }) => {
  ui = resolveUiLanguage(uiLanguage, browserLanguage);
  document.documentElement.lang = ui;
  for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
});

const FILE = /^(\d+)\s*-\s.*?\.([a-z]{2,3})(?:[_-][A-Za-z0-9]+)?(?:\.auto)?\.(?:srt|vtt)$/i;

/** Lecture number (as in file names) → lecture id, from course.json. */
function lectureIds(course) {
  const ids = new Map();
  for (const section of course.sections ?? []) {
    for (const lecture of section.lectures ?? []) {
      for (const file of lecture.files ?? []) {
        const number = String(file.path ?? '').match(/^(\d+)\s*-/)?.[1];
        if (number && lecture.id) ids.set(Number(number), lecture.id);
      }
    }
  }
  return ids;
}

$('pick').addEventListener('click', () => $('folder').click());

$('folder').addEventListener('change', async () => {
  const files = [...$('folder').files];
  const courseFile = files.find((f) => f.name === 'course.json');
  if (!courseFile) {
    $('result').textContent = t('importNoCourse');
    return;
  }
  const ids = lectureIds(JSON.parse(await courseFile.text()));
  const items = {};
  const languages = new Set();
  for (const file of files) {
    const match = file.name.match(FILE);
    const id = match && ids.get(Number(match[1]));
    if (!id) continue;
    const language = match[2].toLowerCase();
    items[`local:${id}:${language}`] = await file.text();
    languages.add(language);
  }
  const n = Object.keys(items).length;
  if (!n) {
    $('result').textContent = t('importNone');
    return;
  }
  await chrome.storage.local.set(items);
  $('result').textContent = t('importDone', { n, langs: [...languages].join(', ') });
});

$('clear').addEventListener('click', async () => {
  const all = await chrome.storage.local.get(null);
  await chrome.storage.local.remove(Object.keys(all).filter((key) => key.startsWith('local:')));
  $('result').textContent = t('importCleared');
});
