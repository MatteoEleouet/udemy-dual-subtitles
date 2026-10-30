# Changelog

## [1.2.0] — 2026-10-30

### Added

- **Width of each line**, next to its size: how wide the main and the second line may grow, as a
  share of the player's width, before wrapping. Defaults keep the previous look (94 % and 88 %).

## [1.1.0] — 2026-10-30

### Added

- **Interface in English and French**, following the browser's language or chosen in the popup.
  Language names are shown in the interface language, for every subtitle language.
- **Defaults for each user**: English on top and the browser's own language underneath (French for
  an English browser). Each person's settings are kept in their own Chrome profile and synced to
  their devices by Chrome.
- 30 subtitle languages to choose from, a **Reset** button, a privacy note in the popup.
- Localised name and description in `chrome://extensions`.
- `npm run package` builds the installable zip; CI checks, tests and packages every push.
- `PRIVACY.md`, `LICENSE` (MIT).

### Changed

- The subtitles follow Udemy's control bar: just above it while it shows, at the bottom of the
  picture when it slides away.
- Line breaks inside a cue are joined, so long translations use the player's width instead of a
  narrow column.

## [1.0.0] — 2026-10-30

- First version: two subtitle languages over the Udemy player, synchronised every frame, with
  Chrome's on-device translator as a fallback and a popup for languages, sizes and position.
