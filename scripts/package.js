#!/usr/bin/env node
/**
 * Zip the extension into `dist/udemy-dual-subtitles-v<version>.zip`, ready to
 * load unpacked or upload to the Chrome Web Store.
 *
 * Only what Chrome loads goes in — no tests, docs or tooling. `manifest.json`
 * sits at the root of the archive, which the store requires. Entries are
 * stored, not deflated: the package is a few kilobytes of text and PNGs, so
 * compression would save nothing worth a dependency.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (manifest.version !== pkg.version) {
  console.error(`Version mismatch: manifest ${manifest.version}, package.json ${pkg.version}.`);
  process.exit(1);
}

const INCLUDE = [
  'manifest.json',
  'background.js',
  'content.js',
  'content.css',
  'core.js',
  'i18n.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'icons',
  '_locales',
];

function walk(entry) {
  const full = path.join(root, entry);
  if (!fs.statSync(full).isDirectory()) return [entry];
  return fs.readdirSync(full).flatMap((name) => walk(`${entry}/${name}`));
}
const files = INCLUDE.flatMap(walk).sort();

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const now = new Date();
const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

const local = [];
const central = [];
let offset = 0;
for (const name of files) {
  const data = fs.readFileSync(path.join(root, name));
  const nameBytes = Buffer.from(name, 'utf8');
  const crc = crc32(data);

  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6); // UTF-8 names
  header.writeUInt16LE(0, 8); // stored
  header.writeUInt16LE(dosTime, 10);
  header.writeUInt16LE(dosDate, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(nameBytes.length, 26);
  local.push(header, nameBytes, data);

  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(20, 4);
  entry.writeUInt16LE(20, 6);
  entry.writeUInt16LE(0x0800, 8);
  entry.writeUInt16LE(0, 10);
  entry.writeUInt16LE(dosTime, 12);
  entry.writeUInt16LE(dosDate, 14);
  entry.writeUInt32LE(crc, 16);
  entry.writeUInt32LE(data.length, 20);
  entry.writeUInt32LE(data.length, 24);
  entry.writeUInt16LE(nameBytes.length, 28);
  entry.writeUInt32LE(offset, 42);
  central.push(entry, nameBytes);

  offset += 30 + nameBytes.length + data.length;
}

const centralBytes = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBytes.length, 12);
end.writeUInt32LE(offset, 16);

const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const output = path.join(outDir, `udemy-dual-subtitles-v${manifest.version}.zip`);
fs.writeFileSync(output, Buffer.concat([...local, centralBytes, end]));
console.log(`${path.relative(root, output)} — ${files.length} files, ${(fs.statSync(output).size / 1024).toFixed(1)} KB`);
