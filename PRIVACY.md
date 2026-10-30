# Privacy policy — Udemy Dual Subtitles

_Last updated: 2026-10-30_

**Udemy Dual Subtitles collects no personal data.** There is no account, no analytics, no
telemetry and no server of ours.

## What the extension reads

On Udemy course pages only, it reads:

- the list of subtitle tracks of the lecture you are watching, from Udemy's own course API, using
  the Udemy session already open in your browser;
- the subtitle files of the two languages you chose, from Udemy's CDN (`udemycdn.com`).

These requests go to Udemy alone. The extension never reads, stores or transmits your Udemy
password or token, and never sends anything to any other server.

## What the extension stores

Your settings (languages, sizes, margin, options) are kept in `chrome.storage.sync`, in your own
Chrome profile. If Chrome sync is on, Chrome copies them to your other devices; nobody else can
read them. **Reset** in the popup, or removing the extension, deletes them.

## Translation

When a course has no track in your second language, the extension can use Chrome's built-in
translator. It runs on your device; Chrome downloads the language model itself the first time.
Subtitle text is not sent to any translation service.

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | Remember your settings |
| `https://*.udemy.com/*` | Show subtitles on Udemy lectures and read their track list |
| `https://*.udemycdn.com/*` | Download the subtitle files of the chosen languages |

## Contact

Questions or concerns: [open an issue](https://github.com/MatteoEleouet/udemy-dual-subtitles/issues).
