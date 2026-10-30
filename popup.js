const DEFAULTS = {
  enabled: true,
  primary: 'en',
  secondary: 'fr',
  primarySize: 100,
  secondarySize: 70,
  margin: 3,
  hideNative: true,
  translateFallback: true,
};

// Base codes match any regional variant (en matches en_US, en_GB…).
const LANGUAGES = [
  ['en', 'Anglais'],
  ['fr', 'Français'],
  ['es', 'Espagnol'],
  ['de', 'Allemand'],
  ['it', 'Italien'],
  ['pt', 'Portugais'],
  ['nl', 'Néerlandais'],
  ['pl', 'Polonais'],
  ['tr', 'Turc'],
  ['ru', 'Russe'],
  ['ar', 'Arabe'],
  ['hi', 'Hindi'],
  ['ja', 'Japonais'],
  ['ko', 'Coréen'],
  ['zh', 'Chinois'],
];

const $ = (id) => document.getElementById(id);

for (const id of ['primary', 'secondary']) {
  for (const [code, name] of LANGUAGES) $(id).add(new Option(name, code));
}

function showOutputs() {
  $('primarySizeOut').value = `${$('primarySize').value}%`;
  $('secondarySizeOut').value = `${$('secondarySize').value}%`;
  $('marginOut').value = `${$('margin').value}%`;
}

chrome.storage.sync.get(DEFAULTS, (settings) => {
  for (const [key, value] of Object.entries(settings)) {
    const input = $(key);
    if (!input) continue;
    if (input.type === 'checkbox') input.checked = value;
    else input.value = value;
  }
  showOutputs();
});

for (const key of Object.keys(DEFAULTS)) {
  const input = $(key);
  const save = () => {
    const value =
      input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value;
    chrome.storage.sync.set({ [key]: value });
    showOutputs();
  };
  // Sliders apply live while dragged, so the size can be judged on the video.
  input.addEventListener(input.type === 'range' ? 'input' : 'change', save);
}

/** What the lecture tab has loaded, refreshed while the popup is open. */
async function refreshStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes('udemy.com/course/')) {
    $('status').textContent = 'Ouvre une leçon Udemy pour voir les sous-titres.';
    return;
  }
  try {
    const status = await chrome.tabs.sendMessage(tab.id, { type: 'DUALSUBS_STATUS' });
    if (!status?.lectureId) {
      $('status').textContent = 'Ouvre une leçon (pas la page de présentation du cours).';
      return;
    }
    const line = (name, slot) =>
      slot.error
        ? `${name} : ${slot.error}`
        : slot.cues > 0
          ? `${name} : ${slot.label} (${slot.cues} répliques)`
          : `${name} : chargement…`;
    $('status').textContent = `${line('Principale', status.primary)}\n${line('Seconde', status.secondary)}`;
  } catch {
    $('status').textContent = "Recharge l'onglet Udemy (F5) pour activer l'extension.";
  }
}

refreshStatus();
setInterval(refreshStatus, 1500);
