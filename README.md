# Udemy Dual Subtitles

<img src="icons/icon128.png" width="64" align="right" alt="">

Watch Udemy with **two subtitle languages at once**: the main one, and a smaller translation
underneath. Made for learning a subject in a language you are still learning.

[![CI](https://github.com/MatteoEleouet/udemy-dual-subtitles/actions/workflows/ci.yml/badge.svg)](https://github.com/MatteoEleouet/udemy-dual-subtitles/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/v/release/MatteoEleouet/udemy-dual-subtitles)](https://github.com/MatteoEleouet/udemy-dual-subtitles/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> 🇫🇷 [En français plus bas](#en-français).

<img width="1247" height="700" alt="image" src="https://github.com/user-attachments/assets/08504edd-db01-4d5a-9623-0a7e1cdbde67" />



## Features

- **Two languages, in sync.** Any two of the lecture's subtitle tracks, drawn over the player and
  synchronised every frame. The second line is smaller, so the eye reads the main one first.
- **Best track first.** A track written by the instructor beats Udemy's automatic one; the
  automatic one is used when it is all there is.
- **Translation fallback.** When a course has no track in your second language, Chrome's built-in
  translator fills in — on your device, nothing sent anywhere (recent Chrome required).
- **Follows the player.** Sits just above Udemy's control bar while it shows, drops to the bottom of
  the picture when it hides, scales up in fullscreen, and keeps up when you move to the next lecture.
- **Yours to set.** Languages (30 to choose from), the size of each line, the bottom margin, hiding
  Udemy's own captions. Changes apply live on the video.
- **Interface in English or French**, following your browser or chosen in the popup.
- **Per user.** Everyone starts with English plus their browser's language; each person's settings
  stay in their own Chrome profile, synced to their devices by Chrome.

## Install

**From a release** (no build needed):

1. Download `udemy-dual-subtitles-v*.zip` from the
   [latest release](https://github.com/MatteoEleouet/udemy-dual-subtitles/releases/latest) and
   extract it to a folder you will keep.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. **Load unpacked** → choose the extracted folder (the one with `manifest.json`).
4. Reload any open Udemy tab, and start a lecture.

**From source:** clone the repository and load its folder the same way — there is no build step.

To update: replace the folder (or `git pull`), then press the reload icon on the extension's card.

## Using it

Click the extension's icon on a Udemy lecture. The bottom of the popup says which tracks are
loaded for this lecture, or why one is missing.

| Popup says | What to do |
| --- | --- |
| "Reload the Udemy tab" | The tab was open before installing: press F5 |
| "Open a lecture" | You are on the course's landing page, not in the player |
| "no … subtitles in this lecture" | The lecture lacks that language — turn on the translation fallback |
| "Udemy did not answer (401/403)" | Signed out, or not enrolled in that course |
| Subtitles appear twice | Turn off Udemy's own captions with the player's CC button |

## How it works

No build step and no dependencies: Chrome loads the files as they are.

| File | Role |
| --- | --- |
| `core.js` | Pure: WebVTT parsing, the line on screen at a time, track choice, default settings |
| `content.js` | On the page: Udemy's course API (with your session), the overlay, sync, control bar, translation |
| `background.js` | Downloads subtitle files from `udemycdn.com`, and nowhere else |
| `popup.*`, `i18n.js` | Settings, status, interface strings |
| `_locales/` | The extension's name and description, per language |

The track list comes from Udemy's course API — the one its own player's CC menu is built from —
read from the page with your session. That API is undocumented, so a change on Udemy's side can
break the extension; issues are welcome.

## Development

```bash
npm test          # unit tests (node --test, no dependencies)
npm run check     # syntax check of every script
npm run package   # dist/udemy-dual-subtitles-v<version>.zip
```

`tests/harness.html` shows the overlay without a Udemy account — a playing video, a fake API, CDN
and control bar:

```bash
python -m http.server 8765
# then open http://localhost:8765/tests/harness.html
```

**Adding an interface language:** copy the `en` block in `i18n.js`, translate it, and add a
`_locales/<code>/messages.json`. The tests check that no string is missing.

## Privacy

No account, no analytics, no server of ours. Requests go to Udemy only. Details in
[PRIVACY.md](PRIVACY.md).

## License

[MIT](LICENSE) © Matteo Eleouet. Not affiliated with Udemy.

---

## En français

Extension Chrome qui affiche **deux langues de sous-titres en même temps** sur Udemy : la langue
principale, et une traduction plus petite en dessous.

- Les deux pistes sont synchronisées avec la vidéo. La piste écrite par l'instructeur passe avant la
  piste automatique.
- S'il manque la seconde langue, le traducteur intégré à Chrome prend le relais, en local.
- Les sous-titres suivent la barre de lecture d'Udemy : juste au-dessus quand elle est affichée, en
  bas de l'image quand elle se rétracte.
- Réglages dans l'icône de l'extension : langues, taille de chaque ligne, marge du bas, langue de
  l'interface (anglais ou français). Chacun garde ses propres réglages dans son profil Chrome.

**Installer :** télécharge le zip de la
[dernière version](https://github.com/MatteoEleouet/udemy-dual-subtitles/releases/latest), décompresse-le,
puis dans `chrome://extensions` active le **Mode développeur** → **Charger l'extension non
empaquetée** → choisis le dossier décompressé. Recharge l'onglet Udemy.
