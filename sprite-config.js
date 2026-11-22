// Parses sprites.yml and works out each variant's image file.
// Shared by the browser (script.js) and the checker (tools/check-sprites.mjs).
(function (root) {
  function slugify(text) {
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function cleanValue(value) {
    let text = value.trim();
    // Drop trailing comments that aren't inside quotes.
    if (!/^["']/.test(text)) text = text.replace(/\s+#.*$/, '');
    return text.replace(/^(["'])(.*)\1$/, '$2').trim();
  }

  function parseInlineList(value) {
    const inner = value.trim().replace(/^\[|\]$/g, '');
    return inner.split(',').map(cleanValue).filter(Boolean);
  }

  // Small parser for the subset of YAML used in sprites.yml.
  function parseSpriteYAML(text) {
    const sprites = [];
    let current = null;
    let listKey = null;

    text.split(/\r?\n/).forEach((rawLine) => {
      const line = rawLine.replace(/\t/g, '  ');
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || /^sprites:\s*$/.test(trimmed)) return;

      const start = line.match(/^\s*-\s*id:\s*(.+)$/);
      if (start) {
        current = { id: cleanValue(start[1]), variants: [], images: [] };
        sprites.push(current);
        listKey = null;
        return;
      }
      if (!current) return;

      const keyValue = line.match(/^\s*([a-zA-Z_]+):\s*(.*)$/);
      if (keyValue) {
        const [, key, value] = keyValue;
        listKey = null;
        if (key === 'variants' || key === 'images') {
          if (value.trim()) current[key] = parseInlineList(value);
          else listKey = key;
        } else if (value.trim()) {
          current[key] = cleanValue(value);
        }
        return;
      }

      const item = line.match(/^\s*-\s*(.+)$/);
      if (item && listKey) current[listKey].push(cleanValue(item[1]));
    });

    return sprites;
  }

  // Classic -> <file>.png, anything else -> <variant>_<file>.png, where the
  // variant is lower-case with spaces/hyphens removed ("Cheat Master" -> cheatmaster).
  function conventionalImage(file, variantName) {
    const prefix = slugify(variantName).replace(/-/g, '');
    return !prefix || prefix === 'classic' ? `${file}.png` : `${prefix}_${file}.png`;
  }

  // Turns parsed YAML into groups of cards. Card ids must stay stable:
  // saved progress is keyed on them.
  function buildSpriteGroups(parsed) {
    return parsed.map((sprite) => {
      const file = sprite.file || sprite.id;
      const variants = sprite.variants.length ? sprite.variants : [''];
      return {
        id: sprite.id,
        name: sprite.name || sprite.id,
        season: sprite.season || 'Other',
        variants: variants.map((variantName, index) => ({
          id: variantName ? `${sprite.id}:${slugify(variantName)}` : sprite.id,
          name: sprite.name || sprite.id,
          variant: variantName,
          image: sprite.images[index] || sprite.image || conventionalImage(file, variantName),
        })),
      };
    });
  }

  // Seasons in the order sprites.yml first mentions them, newest (last) first.
  function listSeasons(groups) {
    return [...new Set(groups.map((group) => group.season))].reverse();
  }

  const api = { slugify, parseSpriteYAML, buildSpriteGroups, conventionalImage, listSeasons };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SpriteConfig = api;
})(this);
