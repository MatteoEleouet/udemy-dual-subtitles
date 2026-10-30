/**
 * Pure helpers: parse WebVTT, find what is on screen at a time, pick a track.
 *
 * No DOM and no `chrome`, so the same file runs as a content script (it sets
 * `globalThis.DualSubs`) and under `node --test` (it sets `module.exports`).
 */
(function (root) {
  'use strict';

  // HH:MM:SS.mmm or MM:SS.mmm; SubRip's comma tolerated.
  const TIME = /(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/;
  const RANGE = new RegExp(`${TIME.source}\\s*-->\\s*${TIME.source}`);

  function seconds(h, m, s, ms) {
    return Number(h || 0) * 3600 + Number(m) * 60 + Number(s) + Number(ms.padEnd(3, '0')) / 1000;
  }

  const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

  /**
   * Cue markup (<v>, <c.x>, <b>, karaoke timestamps) down to plain text.
   *
   * Line breaks inside a cue are joined with a space. They were placed for
   * the file author's player width — Udemy's translated tracks break every
   * few words — and keeping them squeezes a sentence into a narrow column.
   * The overlay wraps to the real player width instead.
   */
  function cleanText(raw) {
    return raw
      .replace(/<[^>]+>/g, '')
      .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (match) => ENTITIES[match])
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join(' ');
  }

  /** WebVTT source → cues sorted by start, each `{ start, end, text }`. */
  function parseVtt(source) {
    const cues = [];
    const blocks = String(source).replace(/\r\n?/g, '\n').split(/\n{2,}/);
    for (const block of blocks) {
      const lines = block.split('\n');
      const timing = lines.findIndex((line) => RANGE.test(line));
      if (timing === -1) continue;
      const m = RANGE.exec(lines[timing]);
      const text = cleanText(lines.slice(timing + 1).join('\n'));
      if (!text) continue;
      cues.push({
        start: seconds(m[1], m[2], m[3], m[4]),
        end: seconds(m[5], m[6], m[7], m[8]),
        text,
      });
    }
    return cues.sort((a, b) => a.start - b.start);
  }

  /**
   * Text on screen at `time`: every cue covering it, in order.
   *
   * Binary search for the last cue starting at or before `time`, then walk
   * back over the few that may still overlap — captions rarely stack more
   * than two deep, so this stays cheap at 60 calls a second.
   */
  function textAt(cues, time) {
    let lo = 0;
    let hi = cues.length - 1;
    let last = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (cues[mid].start <= time) {
        last = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    const active = [];
    for (let i = last; i >= 0 && i > last - 4; i -= 1) {
      if (cues[i].end > time) active.unshift(cues[i].text);
    }
    return active.join('\n');
  }

  /**
   * The best track for a language among a lecture's captions.
   *
   * `lang` is `en` (any English) or an exact locale such as `en_US`. A track
   * written by the instructor beats an automatic one; an exact locale beats a
   * regional variant.
   */
  function pickTrack(captions, lang) {
    if (!Array.isArray(captions) || !lang) return null;
    const want = lang.toLowerCase().replace('-', '_');
    const base = want.split('_')[0];
    const isAuto = (c) => c.source === 'auto' || /\[auto\]/i.test(c.video_label || c.title || '');
    const score = (c) => {
      const locale = String(c.locale_id || '').toLowerCase();
      if (!c.url || locale.split('_')[0] !== base) return -1;
      return (locale === want ? 2 : 0) + (isAuto(c) ? 0 : 4);
    };
    let best = null;
    let bestScore = -1;
    for (const caption of captions) {
      const s = score(caption);
      if (s > bestScore) {
        best = caption;
        bestScore = s;
      }
    }
    return best ? { url: best.url, locale: best.locale_id, label: best.video_label || best.title || best.locale_id, auto: isAuto(best) } : null;
  }

  const api = { parseVtt, textAt, pickTrack, cleanText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DualSubs = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
