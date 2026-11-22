// Checks sprites.yml against the images/ folder.
//   node tools/check-sprites.mjs
// Reports variants whose image is missing, and images not used by any sprite
// (usually a new sprite or variant that still needs adding to sprites.yml).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import config from '../sprite-config.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imagesDir = join(root, 'images');
const IGNORED = new Set(['placeholder.svg']);

const groups = config.buildSpriteGroups(
  config.parseSpriteYAML(readFileSync(join(root, 'sprites.yml'), 'utf8')),
);
const files = new Set(readdirSync(imagesDir).filter((name) => !IGNORED.has(name)));

const used = new Set();
const missing = [];
const seenIds = new Set();
const duplicates = [];

for (const group of groups) {
  for (const card of group.variants) {
    if (seenIds.has(card.id)) duplicates.push(card.id);
    seenIds.add(card.id);
    if (/^(https?:|data:|\/\/)/.test(card.image)) continue;
    const name = card.image.replace(/^\.?\/?images\//, '');
    used.add(name);
    if (!files.has(name)) missing.push(`${group.name} - ${card.variant || '(default)'}: images/${name}`);
  }
}

const unused = [...files].filter((name) => !used.has(name)).sort();
const total = groups.reduce((sum, g) => sum + g.variants.length, 0);

console.log(`${groups.length} sprites, ${total} variants.`);
if (missing.length) console.log(`\nMissing images (${missing.length}):\n  ${missing.join('\n  ')}`);
if (unused.length) {
  console.log(`\nImages not in sprites.yml (${unused.length}) - new sprites or variants?\n  ${unused.join('\n  ')}`);
}
if (duplicates.length) console.log(`\nDuplicate ids:\n  ${duplicates.join('\n  ')}`);
if (!missing.length && !unused.length && !duplicates.length) console.log('Everything matches.');
process.exitCode = missing.length || duplicates.length ? 1 : 0;
