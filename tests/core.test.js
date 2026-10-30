// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseVtt, textAt, pickTrack } = require('../core.js');

const VTT = `WEBVTT

1
00:00:01.000 --> 00:00:03.500
<v Instructor>Hello &amp; welcome.</v>

2
00:00:04.000 --> 00:00:06.000
Today: prime
factorization.

00:01:02.5 --> 00:01:04.000
Short form, no hours.
`;

test('parseVtt reads timings, strips markup and keeps line breaks', () => {
  const cues = parseVtt(VTT);
  assert.equal(cues.length, 3);
  assert.deepEqual(cues[0], { start: 1, end: 3.5, text: 'Hello & welcome.' });
  assert.equal(cues[1].text, 'Today: prime\nfactorization.');
  assert.equal(cues[2].start, 62.5);
});

test('parseVtt tolerates Windows line endings', () => {
  assert.equal(parseVtt(VTT.replace(/\n/g, '\r\n')).length, 3);
});

test('textAt finds the cue on screen, and nothing between cues', () => {
  const cues = parseVtt(VTT);
  assert.equal(textAt(cues, 2), 'Hello & welcome.');
  assert.equal(textAt(cues, 3.7), '');
  assert.equal(textAt(cues, 5), 'Today: prime\nfactorization.');
  assert.equal(textAt(cues, 0), '');
  assert.equal(textAt([], 5), '');
});

test('textAt stacks overlapping cues in order', () => {
  const cues = [
    { start: 0, end: 10, text: 'first' },
    { start: 2, end: 4, text: 'second' },
  ];
  assert.equal(textAt(cues, 3), 'first\nsecond');
  assert.equal(textAt(cues, 5), 'first');
});

const CAPTIONS = [
  { locale_id: 'en_US', video_label: 'English [Auto]', source: 'auto', url: 'https://x/en-auto.vtt' },
  { locale_id: 'en_GB', video_label: 'English', source: 'manual', url: 'https://x/en-gb.vtt' },
  { locale_id: 'fr_FR', video_label: 'French [Auto]', source: 'auto', url: 'https://x/fr.vtt' },
  { locale_id: 'es_ES', video_label: 'Spanish', url: '' },
];

test('pickTrack prefers a written track over an automatic one', () => {
  assert.equal(pickTrack(CAPTIONS, 'en').url, 'https://x/en-gb.vtt');
});

test('pickTrack takes an automatic track when that is all there is', () => {
  const fr = pickTrack(CAPTIONS, 'fr');
  assert.equal(fr.url, 'https://x/fr.vtt');
  assert.equal(fr.auto, true);
});

test('pickTrack ignores tracks without a file, and missing languages', () => {
  assert.equal(pickTrack(CAPTIONS, 'es'), null);
  assert.equal(pickTrack(CAPTIONS, 'de'), null);
  assert.equal(pickTrack(null, 'en'), null);
});

test('pickTrack honours an exact locale among written tracks', () => {
  const both = [
    { locale_id: 'pt_PT', source: 'manual', url: 'https://x/pt.vtt' },
    { locale_id: 'pt_BR', source: 'manual', url: 'https://x/br.vtt' },
  ];
  assert.equal(pickTrack(both, 'pt_BR').url, 'https://x/br.vtt');
});
