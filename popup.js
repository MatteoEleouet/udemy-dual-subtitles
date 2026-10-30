const { defaultSettings } = globalThis.DualSubs;
const { UI_LANGUAGES, resolveUiLanguage, translate, languageName } = globalThis.DualSubsI18n;

const browserLanguage = chrome.i18n.getUILanguage();
const DEFAULTS = defaultSettings(browserLanguage);

// Languages Udemy courses commonly carry subtitles in. A base code matches
// every regional variant: `en` picks en_US, en_GB…
const SUBTITLE_LANGUAGES = [
  'en', 'fr', 'es', 'de', 'it', 'pt', 'nl', 'pl', 'ro', 'cs', 'hu', 'el', 'sv', 'da', 'fi', 'no',
  'tr', 'ru', 'uk', 'ar', 'he', 'hi', 'bn', 'id', 'ms', 'th', 'vi', 'ja', 'ko', 'zh',
];

const $ = (id) => document.getElementById(id);
let settings = { ...DEFAULTS };
let ui = resolveUiLanguage(settings.uiLanguage, browserLanguage);
const t = (key, params) => translate(ui, key, params);

/** Fill a <select> with options, keeping the current value. */
function fill(select, entries) {
  const value = select.value;
  select.replaceChildren(...entries.map(([code, name]) => new Option(name, code)));
  if (value) select.value = value;
}

/** Every visible word, in the interface language. */
function applyInterfaceLanguage() {
  ui = resolveUiLanguage(settings.uiLanguage, browserLanguage);
  document.documentElement.lang = ui;
  for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
  for (const element of document.querySelectorAll('[data-i18n-title]')) element.title = t(element.dataset.i18nTitle);

  const languages = SUBTITLE_LANGUAGES.map((code) => [code, languageName(code, ui)]).sort((a, b) =>
    a[1].localeCompare(b[1], ui),
  );
  fill($('primary'), languages);
  fill($('secondary'), languages);
  fill($('uiLanguage'), [
    ['auto', t('uiAuto')],
    ...UI_LANGUAGES.map((code) => [code, languageName(code, code)]),
  ]);
}

function showValues() {
  for (const [key, value] of Object.entries(settings)) {
    const input = $(key);
    if (!input) continue;
    if (input.type === 'checkbox') input.checked = value;
    else input.value = value;
  }
  $('primarySizeOut').value = `${settings.primarySize}%`;
  $('secondarySizeOut').value = `${settings.secondarySize}%`;
  $('marginOut').value = `${settings.margin}%`;
  $('primaryWidthOut').value = `${settings.primaryWidth}%`;
  $('secondaryWidthOut').value = `${settings.secondaryWidth}%`;
}

function render() {
  applyInterfaceLanguage();
  showValues();
  refreshStatus();
}

chrome.storage.sync.get(DEFAULTS, (stored) => {
  settings = { ...DEFAULTS, ...stored };
  render();
});

for (const key of Object.keys(DEFAULTS)) {
  const input = $(key);
  if (!input) continue;
  const save = () => {
    const value =
      input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value;
    settings[key] = value;
    chrome.storage.sync.set({ [key]: value });
    if (key === 'uiLanguage') render();
    else showValues();
  };
  // Sliders apply live while dragged, so the size can be judged on the video.
  input.addEventListener(input.type === 'range' ? 'input' : 'change', save);
}

$('reset').addEventListener('click', () => {
  chrome.storage.sync.clear(() => {
    settings = { ...DEFAULTS };
    render();
  });
});

/** One status line: what a track is, or why it is missing. */
function describe(name, slot) {
  if (slot.error) {
    const lang = slot.error.lang ? languageName(slot.error.lang, ui) : '';
    return t('line', { name, text: t(slot.error.code, { lang, detail: slot.error.detail ?? '' }) });
  }
  if (slot.cues === 0) return t('line', { name, text: t('loading') });
  const kind = slot.translated ? t('translated') : slot.auto ? t('auto') : '';
  const label = slot.label ?? '';
  return t('line', { name, text: `${[label, kind].filter(Boolean).join(', ')} — ${t('cues', { n: slot.cues })}` });
}

/** What the lecture tab has loaded, refreshed while the popup is open. */
async function refreshStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https:\/\/[^/]*udemy\.com\/course\//.test(tab.url)) {
    $('status').textContent = t('statusOpen');
    return;
  }
  try {
    const status = await chrome.tabs.sendMessage(tab.id, { type: 'DUALSUBS_STATUS' });
    if (!status?.lectureId) {
      $('status').textContent = t('statusLecture');
      return;
    }
    $('status').textContent = `${describe(t('main'), status.primary)}\n${describe(t('second'), status.secondary)}`;
  } catch {
    $('status').textContent = t('statusReload');
  }
}

setInterval(refreshStatus, 1500);
