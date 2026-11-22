const STORAGE_KEY = 'fortniteSpriteTrackerStatus';
const USER_STORAGE_KEY = 'fortniteSpriteTrackerCurrentUser';
const USER_PASSWORD_KEY = 'fortniteSpriteTrackerUsers';
const grid = document.getElementById('spriteGrid');
const clearButton = document.getElementById('clearAll');
const template = document.getElementById('spriteCardTemplate');
const registerButton = document.getElementById('registerButton');
const logoutButton = document.getElementById('logoutButton');
const printButton = document.getElementById('printButton');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const authMessage = document.getElementById('authMessage');
const authPanel = document.getElementById('authPanel');
const userPanel = document.getElementById('userPanel');
const accountButton = document.getElementById('accountButton');
const accountMenu = document.getElementById('accountMenu');
const accountInitial = document.getElementById('accountInitial');
const trackerPanel = document.getElementById('trackerPanel');
const authForm = document.getElementById('authForm');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

const exportButton = document.getElementById('exportButton');
const compareButton = document.getElementById('compareButton');
const compareFile = document.getElementById('compareFile');
const compareBar = document.getElementById('compareBar');
const compareName = document.getElementById('compareName');
const theyHaveCount = document.getElementById('theyHaveCount');
const youHaveCount = document.getElementById('youHaveCount');
const closeCompare = document.getElementById('closeCompare');
const notice = document.getElementById('notice');
const compareScopeFilter = document.getElementById('compareScope');
const compareScopeDifferentCount = document.getElementById('compareScopeDifferentCount');
const compareScopeEverythingCount = document.getElementById('compareScopeEverythingCount');
const compareScopeMasteredCount = document.getElementById('compareScopeMasteredCount');
const summaryRow = document.querySelector('.toolbar .summary');
const compareLabel = document.getElementById('compareLabel');
// Friend's progress loaded from their CSV: { name, statuses: { cardId: 'found' | 'master' } }
let comparison = null;

function statusFilterValue() {
  const checked = statusFilter.querySelector('input:checked');
  return checked ? checked.value : 'all';
}
const seasonPicker = document.getElementById('seasonPicker');
const seasonButton = document.getElementById('seasonButton');
const seasonLabel = document.getElementById('seasonLabel');
const seasonMenu = document.getElementById('seasonMenu');
const seasonOptions = document.getElementById('seasonOptions');
// Stores the season the page opens on (set with the radio in the season menu).
const DEFAULT_SEASON_KEY = 'fortniteSpriteTrackerDefaultSeason';
const ALL_SEASONS = 'all';
let currentSeason = ALL_SEASONS;
const summary = document.getElementById('summary');
const emptyMessage = document.getElementById('emptyMessage');
const confirmDialog = document.getElementById('confirmDialog');
const confirmMessage = document.getElementById('confirmMessage');
const printMeta = document.getElementById('printMeta');
const progressBar = document.getElementById('progressBar');
let spriteGroups = [];

// Progress per card: { status: 'found' | 'master', level: 1-5 }. Status and level are
// independent (a sprite can be mastered at level 1); no entry = not found.
const STATUSES = ['found', 'master'];
const MAX_LEVEL = 5;

function toLevel(value) {
  const level = Number(value);
  return Number.isInteger(level) && level >= 1 && level <= MAX_LEVEL ? level : 0;
}

function toStatus(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (text === 'mastered') return 'master';
  return STATUSES.includes(text) ? text : '';
}

// Also reads older saves: plain 'found'/'master' strings (level 1) and plain level numbers.
function normalizeEntry(value) {
  if (value && typeof value === 'object') {
    const status = toStatus(value.status);
    return status ? { status, level: toLevel(value.level) || 1 } : null;
  }
  if (typeof value === 'number') {
    const level = toLevel(value);
    return level ? { status: level >= MAX_LEVEL ? 'master' : 'found', level } : null;
  }
  const status = toStatus(value);
  return status ? { status, level: 1 } : null;
}

function entryStatus(entry) {
  return entry ? entry.status : 'none';
}

function entryLevel(entry) {
  return entry ? entry.level : 0;
}

function loadStatus() {
  const user = loadCurrentUser();
  if (!user) return {};
  try {
    const saved = JSON.parse(localStorage.getItem(`${STORAGE_KEY}:${user}`) || '{}');
    // Unknown values (e.g. the old "lost" status) are dropped.
    return Object.fromEntries(Object.entries(saved)
      .map(([id, value]) => [id, normalizeEntry(value)])
      .filter(([, entry]) => entry));
  } catch (error) {
    return {};
  }
}

function saveStatus(status) {
  const user = loadCurrentUser();
  if (!user) return;
  localStorage.setItem(`${STORAGE_KEY}:${user}`, JSON.stringify(status));
}

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USER_PASSWORD_KEY) || '{}');
  } catch (error) {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USER_PASSWORD_KEY, JSON.stringify(users));
}

function loadCurrentUser() {
  return localStorage.getItem(USER_STORAGE_KEY);
}

function saveCurrentUser(user) {
  localStorage.setItem(USER_STORAGE_KEY, user);
}

function clearCurrentUser() {
  localStorage.removeItem(USER_STORAGE_KEY);
}

function setAuthMessage(text, isError = false) {
  authMessage.textContent = text;
  authMessage.classList.toggle('error', isError);
}

function resolveImagePath(image) {
  if (!image) return 'images/placeholder.svg';
  if (/^(https?:)?\/\//.test(image) || image.startsWith('data:')) {
    return image;
  }
  if (image.startsWith('images/') || image.startsWith('./images/') || image.startsWith('/images/')) {
    return image;
  }
  return `images/${image}`;
}

// Wide screens show a comparison as two halves: friend ahead | you ahead.
const splitQuery = window.matchMedia('(min-width: 1100px)');

// "All" shows every sprite once (with the friend's badge), so it never splits.
function isSplitCompare() {
  return Boolean(comparison) && splitQuery.matches && compareScopeValue() !== 'everything';
}

function renderCards() {
  const status = loadStatus();
  const split = isSplitCompare();
  grid.innerHTML = '';
  grid.classList.toggle('split', split);
  // The side toggle is only needed when one side is shown at a time.
  compareBar.classList.toggle('split', split || (Boolean(comparison) && compareScopeValue() === 'everything'));

  if (!split) {
    spriteGroups.forEach((group) => grid.appendChild(buildRow(group, status)));
  } else {
    [['theyHave', `${comparison.name} has`], ['youHave', 'You have']].forEach(([side, label]) => {
      const pane = document.createElement('section');
      pane.className = 'compare-pane';
      pane.dataset.side = side;

      const header = document.createElement('div');
      header.className = 'pane-header';
      const title = document.createElement('h2');
      title.className = 'pane-title';
      title.textContent = label;
      const count = document.createElement('span');
      count.className = 'pane-count';
      header.append(title, count);

      const empty = document.createElement('p');
      empty.className = 'pane-empty hidden';
      empty.textContent = 'Nothing here.';

      const rows = document.createElement('div');
      rows.className = 'pane-rows';
      spriteGroups.forEach((group) => rows.appendChild(buildRow(group, status)));

      pane.append(header, empty, rows);
      grid.appendChild(pane);
    });
  }

  refreshView(status);
}

function buildRow(group, status) {
  const row = document.createElement('section');
  row.className = 'sprite-row';
  row.dataset.season = group.season;

  const header = document.createElement('div');
  header.className = 'row-header';

  const title = document.createElement('h2');
  title.className = 'row-title';
  title.textContent = group.name;

  const count = document.createElement('span');
  count.className = 'row-count';

  header.append(title, count);
  row.appendChild(header);

  const variantGrid = document.createElement('div');
  variantGrid.className = 'variant-grid';

  group.variants.forEach((sprite) => {
    const card = template.content.cloneNode(true);
    const image = card.querySelector('.card-image');
    const title = card.querySelector('.sprite-name');
    const variantLabel = card.querySelector('.sprite-variant');
    const article = card.querySelector('.card');
    article.dataset.spriteId = sprite.id;
    article.dataset.search = `${sprite.name} ${sprite.variant}`.toLowerCase();

    image.src = resolveImagePath(sprite.image);
    image.alt = `${sprite.name} - ${sprite.variant}`;
    image.onerror = () => {
      image.src = 'images/placeholder.svg';
    };
    title.textContent = sprite.name;
    variantLabel.textContent = sprite.variant || '';

    card.querySelectorAll('.status-group input').forEach((input) => { input.dataset.spriteId = sprite.id; });
    card.querySelectorAll('.level-pip').forEach((pip) => {
      pip.setAttribute('aria-label', `${sprite.name} ${sprite.variant}: level ${pip.dataset.level}`);
    });
    syncCardInputs(article, status[sprite.id]);

    variantGrid.appendChild(card);
  });

  row.appendChild(variantGrid);
  return row;
}

// Mastered sprites count as found too: "found" is everything you own.
function countStatuses(ids, status) {
  const counts = { found: 0, mastered: 0, total: ids.length };
  ids.forEach((id) => {
    const value = entryStatus(status[id]);
    if (value !== 'none') counts.found += 1;
    if (value === 'master') counts.mastered += 1;
  });
  return counts;
}

function formatCounts(counts) {
  return `${counts.found} / ${counts.total} found · ${counts.mastered} mastered`;
}

function matchesFilter(value, filter) {
  if (filter === 'all') return true;
  if (filter === 'found') return value === 'found' || value === 'master';
  return value === filter;
}

// Updates counters and applies the search/status filter without re-rendering,
// so it is cheap to call after every change.
function refreshView(status = loadStatus()) {
  const query = searchInput.value.trim().toLowerCase();
  const filter = statusFilterValue();
  const optionCounts = { all: 0, none: 0, found: 0, master: 0 };
  const season = currentSeason;
  const allIds = [];
  const compareCounts = { theyHave: 0, youHave: 0, different: 0, mastered: 0, everything: 0 };
  const compareMode = comparison ? compareFilterValue() : null;
  const compareScope = comparison ? compareScopeValue() : null;
  let visibleCards = 0;

  const split = grid.classList.contains('split');
  const paneVisible = { theyHave: 0, youHave: 0 };

  grid.querySelectorAll('.sprite-row').forEach((row) => {
    const cards = [...row.querySelectorAll('.card')];
    const ids = cards.map((card) => card.dataset.spriteId);
    const inSeason = season === 'all' || row.dataset.season === season;
    const pane = row.closest('.compare-pane');
    // In split view every card exists twice; only count the left-hand copy.
    const primary = !pane || pane.dataset.side === 'theyHave';
    const side = pane ? pane.dataset.side : compareMode;
    // Totals follow the season picker, not the search/status filters.
    if (inSeason && primary) allIds.push(...ids);

    const counts = countStatuses(ids, status);
    row.querySelector('.row-count').textContent =
      `${counts.found}/${counts.total} found` + (counts.mastered ? ` · ${counts.mastered} mastered` : '');
    row.classList.toggle('complete', counts.total > 0 && counts.found === counts.total);

    let visibleInRow = 0;
    cards.forEach((card) => {
      const entry = status[card.dataset.spriteId];
      const value = entryStatus(entry);
      syncCardInputs(card, entry);
      // Counts on the status buttons follow the season and search, not the status itself.
      if (primary && inSeason && (!query || card.dataset.search.includes(query))) {
        optionCounts.all += 1;
        if (value === 'none') optionCounts.none += 1;
        if (matchesFilter(value, 'found')) optionCounts.found += 1;
        if (value === 'master') optionCounts.master += 1;
      }
      let shown = matchesFilter(value, filter);
      if (comparison) {
        const friendValue = comparison.statuses[card.dataset.spriteId];
        if (primary && inSeason && (!query || card.dataset.search.includes(query))) {
          // Side buttons count within the chosen scope; scope buttons count within the
          // chosen side (or both sides when they are shown side by side).
          if (compareMatch('theyHave', compareScope, entry, friendValue)) compareCounts.theyHave += 1;
          if (compareMatch('youHave', compareScope, entry, friendValue)) compareCounts.youHave += 1;
          const scopeSides = split || compareScope === 'everything' ? ['theyHave', 'youHave'] : [compareMode];
          scopeSides.forEach((scopeSide) => {
            if (compareMatch(scopeSide, 'different', entry, friendValue)) compareCounts.different += 1;
            if (compareMatch(scopeSide, 'mastered', entry, friendValue)) compareCounts.mastered += 1;
          });
          compareCounts.everything += 1;
        }
        shown = compareMatch(side, compareScope, entry, friendValue);
        setCompareTags(card, entry, friendValue);
      }
      const matches = inSeason && (!query || card.dataset.search.includes(query)) && shown;
      card.classList.toggle('hidden', !matches);
      if (matches) visibleInRow += 1;
    });
    row.classList.toggle('hidden', visibleInRow === 0);
    visibleCards += visibleInRow;
    if (pane) paneVisible[pane.dataset.side] += visibleInRow;
  });

  grid.querySelectorAll('.compare-pane').forEach((pane) => {
    pane.querySelector('.pane-count').textContent = compareCounts[pane.dataset.side];
    pane.querySelector('.pane-empty').classList.toggle('hidden', paneVisible[pane.dataset.side] > 0);
  });

  const totals = countStatuses(allIds, status);
  summary.textContent = formatCounts(totals);
  statusFilter.querySelectorAll('[data-count]').forEach((badge) => {
    badge.textContent = optionCounts[badge.dataset.count];
  });
  progressBar.style.width = `${totals.total ? (totals.found / totals.total) * 100 : 0}%`;
  if (comparison) {
    theyHaveCount.textContent = compareCounts.theyHave;
    youHaveCount.textContent = compareCounts.youHave;
    compareScopeDifferentCount.textContent = compareCounts.different;
    compareScopeEverythingCount.textContent = compareCounts.everything;
    compareScopeMasteredCount.textContent = compareCounts.mastered;
  }
  if (allIds.length) emptyMessage.classList.toggle('hidden', visibleCards > 0 || split);
}

// Cards can appear twice in split view, so tick boxes are re-synced from saved progress.
// The level picker only shows once the card is found or mastered.
function syncCardInputs(card, entry) {
  const value = entryStatus(entry);
  const level = entryLevel(entry);
  card.querySelectorAll('.status-group input').forEach((input) => {
    input.checked = input.value === value;
    input.closest('label').classList.toggle('checked', input.checked);
  });
  card.classList.toggle('is-found', value !== 'none');
  card.classList.toggle('is-mastered', value === 'master');
  card.querySelectorAll('.level-pip').forEach((pip) => {
    const pipLevel = Number(pip.dataset.level);
    pip.classList.toggle('filled', pipLevel <= level);
    pip.setAttribute('aria-pressed', String(pipLevel === level));
  });
}

// ---- Export / compare -------------------------------------------------------

const STATUS_LABELS = { found: 'found', master: 'mastered' };

function compareFilterValue() {
  const checked = compareBar.querySelector('input:checked');
  return checked ? checked.value : 'theyHave';
}

function compareScopeValue() {
  const checked = compareScopeFilter.querySelector('input:checked');
  return checked ? checked.value : 'different';
}

// Status first (missing < found < mastered), then level breaks ties.
function progressRank(entry) {
  const rank = { none: 0, found: 1, master: 2 }[entryStatus(entry)];
  return rank * 10 + entryLevel(entry);
}

// Mastered at the top level: what "Mastered only (level 5)" looks for.
function isMaxedMaster(entry) {
  return entryStatus(entry) === 'master' && entryLevel(entry) >= MAX_LEVEL;
}

// mine/theirs are progress entries (undefined = missing).
// side: 'theyHave' (friend is ahead) or 'youHave' (you are ahead).
// scope: 'different' (better status, or same status and higher level),
// 'mastered' (mastered at level 5 vs. not) or 'everything' (every sprite).
function compareMatch(side, scope, mine, theirs) {
  if (scope === 'everything') return true;
  const [ahead, behind] = side === 'theyHave' ? [theirs, mine] : [mine, theirs];
  if (scope === 'mastered') return isMaxedMaster(ahead) && !isMaxedMaster(behind);
  return progressRank(ahead) > progressRank(behind);
}

const TAG_ICONS = { master: '★', found: '✓', none: '✕' };
const TAG_WORDS = { master: 'Mastered', found: 'Found', none: 'Missing' };

// The tag shows icon + level ("★ Lv 3"); the colour says found vs. mastered.
function fillCompareTag(tag, name, entry) {
  const value = entryStatus(entry);
  const level = entryLevel(entry);
  tag.dataset.status = value;
  tag.querySelector('.tag-name').textContent = name;
  tag.querySelector('.tag-icon').textContent = TAG_ICONS[value];
  tag.querySelector('.tag-word').textContent = level ? `Lv ${level}` : 'Missing';
  tag.title = `${name}: ${TAG_WORDS[value]}${level ? `, level ${level}` : ''}`;
}

// Two tags on the image: the friend's status on top, yours underneath.
function setCompareTags(card, myValue, friendValue) {
  fillCompareTag(card.querySelector('.compare-tag.friend'), comparison.name, friendValue);
  fillCompareTag(card.querySelector('.compare-tag.mine'), 'You', myValue);
}

function showNotice(text, isError = false) {
  notice.textContent = text;
  notice.classList.toggle('error', isError);
  notice.classList.toggle('hidden', !text);
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Minimal CSV parser: handles quoted fields, escaped quotes and CRLF.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((cells) => cells.some((cell) => cell.trim()));
}

function exportCSV() {
  const user = loadCurrentUser();
  if (!user) return;
  const status = loadStatus();
  const lines = [['player', 'season', 'sprite', 'variant', 'status', 'level', 'id']];
  spriteGroups.forEach((group) => {
    group.variants.forEach((card) => {
      const entry = status[card.id];
      lines.push([user, group.season, group.name, card.variant,
        STATUS_LABELS[entryStatus(entry)] || '', entryLevel(entry) || '', card.id]);
    });
  });
  const csv = lines.map((cells) => cells.map(csvEscape).join(',')).join('\r\n');
  // The BOM makes Excel read the file as UTF-8.
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `sprites-${SpriteConfig.slugify(user) || 'player'}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function readComparisonCSV(text, fileName) {
  const rows = parseCSV(text.replace(/^\ufeff/, ''));
  if (!rows.length) throw new Error('The file is empty.');
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const idColumn = header.indexOf('id');
  const statusColumn = header.indexOf('status');
  const playerColumn = header.indexOf('player');
  // Older exports have no level column: those sprites count as level 1.
  const levelColumn = header.indexOf('level');
  if (idColumn === -1 || statusColumn === -1) {
    throw new Error('This is not a sprite tracker export (missing "id" or "status" column).');
  }

  const knownIds = new Set(spriteGroups.flatMap((group) => group.variants.map((card) => card.id)));
  const statuses = {};
  let unknown = 0;
  rows.slice(1).forEach((cells) => {
    const id = (cells[idColumn] || '').trim();
    const value = (cells[statusColumn] || '').trim().toLowerCase();
    if (!id) return;
    if (!knownIds.has(id)) { unknown += 1; return; }
    const status = toStatus(value);
    if (status) statuses[id] = { status, level: (levelColumn !== -1 && toLevel((cells[levelColumn] || '').trim())) || 1 };
  });

  const fromFile = playerColumn !== -1 && rows[1] ? (rows[1][playerColumn] || '').trim() : '';
  const name = fromFile || fileName.replace(/\.csv$/i, '') || 'Friend';
  return { name, statuses, unknown };
}

function skippedMessage(count) {
  return count === 1
    ? "1 sprite in their file isn't in this tracker and was skipped."
    : `${count} sprites in their file aren't in this tracker and were skipped.`;
}

function startComparison(result) {
  comparison = { name: result.name, statuses: result.statuses };
  compareName.textContent = result.name;
  compareBar.querySelector('input[value="theyHave"]').checked = true;
  compareScopeFilter.querySelector('input[value="different"]').checked = true;
  compareBar.classList.remove('hidden');
  compareScopeFilter.classList.remove('hidden');
  summaryRow.classList.add('hidden');
  statusFilter.classList.add('hidden');
  grid.classList.add('comparing');
  compareLabel.textContent = `Comparing with ${result.name}`;
  showNotice(result.unknown
    ? `Comparing with ${result.name}. ${skippedMessage(result.unknown)}`
    : '');
  renderCards();
}

function stopComparison() {
  comparison = null;
  compareBar.classList.add('hidden');
  compareScopeFilter.classList.add('hidden');
  summaryRow.classList.remove('hidden');
  statusFilter.classList.remove('hidden');
  grid.classList.remove('comparing');
  showNotice('');
  renderCards();
}

function updateEntry(cardId, change) {
  const cardStatus = loadStatus();
  const entry = change(cardStatus[cardId]);
  if (entry) cardStatus[cardId] = entry;
  else delete cardStatus[cardId];
  saveStatus(cardStatus);
  refreshView(cardStatus);
}

// Found and Master are either/or. Ticking one starts the sprite at level 1 (or keeps
// its level when switching between them); unticking clears it.
function handleStatusChange(event) {
  const input = event.target;
  if (input.tagName !== 'INPUT' || !input.closest('.status-group')) return;
  const cardId = input.dataset.spriteId;
  if (!cardId) return;
  updateEntry(cardId, (entry) => (input.checked
    ? { status: input.value, level: entryLevel(entry) || 1 }
    : null));
}

function handleLevelClick(event) {
  const pip = event.target.closest('.level-pip');
  if (!pip) return false;
  const level = Number(pip.dataset.level);
  updateEntry(pip.closest('.card').dataset.spriteId, (entry) => (entry ? { ...entry, level } : entry));
  return true;
}

function clearAllStatuses() {
  const user = loadCurrentUser();
  if (!user) return;
  localStorage.removeItem(`${STORAGE_KEY}:${user}`);
  renderCards();
}

function confirmClearAll() {
  const user = loadCurrentUser();
  if (!user) return;
  const counts = countStatuses(Object.keys(loadStatus()), loadStatus());
  const tracked = counts.found;
  confirmMessage.textContent =
    `This clears ${tracked} tracked sprite${tracked === 1 ? '' : 's'} for ${user}. This cannot be undone.`;
  confirmDialog.returnValue = '';
  confirmDialog.showModal();
}

// Images are lazy-loaded, so load the rest before printing or they come out blank.
async function printTracker() {
  const images = [...grid.querySelectorAll('.card:not(.hidden) .card-image')];
  images.forEach((image) => { image.loading = 'eager'; });
  await Promise.all(images.map((image) => (image.complete
    ? Promise.resolve()
    : new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      }))));
  window.print();
}

function preparePrint() {
  const user = loadCurrentUser() || '';
  const date = new Date().toLocaleDateString();
  const filters = [];
  if (currentSeason !== ALL_SEASONS) filters.push(currentSeason);
  if (comparison) {
    const verb = compareScopeValue() === 'mastered' ? 'mastered' : 'has';
    if (compareScopeValue() === 'everything') {
      filters.push(`compared with ${comparison.name} (all sprites)`);
    } else if (grid.classList.contains('split')) {
      filters.push(`compared with ${comparison.name}${verb === 'mastered' ? ' (mastered at level 5 only)' : ''}`);
    } else filters.push(compareFilterValue() === 'theyHave'
      ? `${comparison.name} ${verb}, you don't`
      : `you ${verb === 'has' ? 'have' : verb}, ${comparison.name} ${verb === 'has' ? "doesn't" : "didn't"}`);
  }
  if (searchInput.value.trim()) filters.push(`search "${searchInput.value.trim()}"`);
  if (!comparison && statusFilterValue() !== 'all') {
    filters.push(statusFilter.querySelector('input:checked + .status-option-name').textContent);
  }
  printMeta.textContent = [user, date, summary.textContent, filters.length ? `Showing: ${filters.join(', ')}` : '']
    .filter(Boolean)
    .join(' · ');
  // The browser uses the page title as the default PDF file name.
  document.title = `Sprite Tracker - ${user} - ${date.replace(/\//g, '-')}`;
}

function loginUser(username, password) {
  const cleanName = username.trim();
  if (!cleanName || !password) {
    setAuthMessage('Username and password are required.', true);
    return false;
  }

  const users = loadUsers();
  if (!users[cleanName]) {
    setAuthMessage('User not found. Please register first.', true);
    return false;
  }

  if (users[cleanName] !== password) {
    setAuthMessage('Incorrect password.', true);
    return false;
  }

  setAuthMessage(`Welcome back, ${cleanName}.`);
  saveCurrentUser(cleanName);
  usernameInput.value = '';
  passwordInput.value = '';
  authPanel.classList.add('hidden');
  userPanel.classList.remove('hidden');
  trackerPanel.classList.remove('hidden');
  updateAuthUI();
  return true;
}

function registerUser(username, password) {
  const cleanName = username.trim();
  if (!cleanName || !password) {
    setAuthMessage('Username and password are required.', true);
    return false;
  }

  const users = loadUsers();
  if (users[cleanName]) {
    setAuthMessage('Username already exists. Please login instead.', true);
    return false;
  }

  users[cleanName] = password;
  saveUsers(users);
  setAuthMessage(`Registered ${cleanName}. You are now logged in.`);
  saveCurrentUser(cleanName);
  usernameInput.value = '';
  passwordInput.value = '';
  authPanel.classList.add('hidden');
  userPanel.classList.remove('hidden');
  trackerPanel.classList.remove('hidden');
  updateAuthUI();
  return true;
}

function setAccountMenuOpen(open) {
  accountMenu.classList.toggle('hidden', !open);
  accountButton.setAttribute('aria-expanded', String(open));
}

function logoutUser() {
  if (comparison) stopComparison();
  clearCurrentUser();
  updateAuthUI();
}

function updateAuthUI() {
  const user = loadCurrentUser();
  const currentUserName = document.getElementById('currentUserName');
  const isLoggedIn = Boolean(user);

  authPanel.classList.toggle('hidden', isLoggedIn);
  userPanel.classList.toggle('hidden', !isLoggedIn);
  trackerPanel.classList.toggle('hidden', !isLoggedIn);

  authPanel.hidden = isLoggedIn;
  userPanel.hidden = !isLoggedIn;
  trackerPanel.hidden = !isLoggedIn;
  document.querySelectorAll('.logged-in-only').forEach((element) => {
    element.classList.toggle('hidden', !isLoggedIn);
  });

  if (isLoggedIn) {
    currentUserName.textContent = user;
    accountInitial.textContent = user.charAt(0).toUpperCase();
    renderCards();
  } else {
    currentUserName.textContent = '';
    accountInitial.textContent = '';
    setAccountMenuOpen(false);
    grid.innerHTML = '';
  }
}

async function loadSpriteConfig() {
  try {
    const response = await fetch('sprites.yml', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return SpriteConfig.buildSpriteGroups(SpriteConfig.parseSpriteYAML(await response.text()));
  } catch (error) {
    console.warn('Unable to load sprites.yml:', error);
    // Opened as a downloaded file: browsers block fetch() there, so say how to fix it.
    // Otherwise show the real reason (network, stale cache...) and offer a reload.
    emptyMessage.textContent = location.protocol === 'file:'
      ? 'This page was opened as a file. Open it from its web address instead (or a local web server).'
      : `Couldn't load the sprite list (${error.message}). Check your connection and reload the page.`;
    emptyMessage.classList.remove('hidden');
    return [];
  }
}

grid.addEventListener('change', handleStatusChange);
// Touch screens can't hover: tapping a card's image shows whose tag is whose.
grid.addEventListener('click', (event) => {
  if (handleLevelClick(event) || !comparison) return;
  const imageWrap = event.target.closest('.card-image-wrap');
  if (imageWrap) imageWrap.closest('.card').classList.toggle('show-tags');
});
exportButton.addEventListener('click', exportCSV);
compareButton.addEventListener('click', () => {
  compareFile.value = '';
  compareFile.click();
});
compareFile.addEventListener('change', async () => {
  const file = compareFile.files[0];
  if (!file) return;
  try {
    startComparison(readComparisonCSV(await file.text(), file.name));
  } catch (error) {
    showNotice(`Couldn't compare: ${error.message}`, true);
  }
});
compareBar.addEventListener('change', () => refreshView());
// Switching to or from "All" changes the layout (split halves vs one grid).
compareScopeFilter.addEventListener('change', () => renderCards());
splitQuery.addEventListener('change', () => {
  if (comparison) renderCards();
});
closeCompare.addEventListener('click', stopComparison);
clearButton.addEventListener('click', () => {
  setAccountMenuOpen(false);
  confirmClearAll();
});
confirmDialog.addEventListener('close', () => {
  if (confirmDialog.returnValue === 'confirm') clearAllStatuses();
});
// Clicking the dimmed backdrop cancels.
confirmDialog.addEventListener('click', (event) => {
  if (event.target === confirmDialog) confirmDialog.close('cancel');
});
accountButton.addEventListener('click', (event) => {
  event.stopPropagation();
  setAccountMenuOpen(accountMenu.classList.contains('hidden'));
});
document.addEventListener('click', (event) => {
  if (!userPanel.contains(event.target)) setAccountMenuOpen(false);
  if (!seasonPicker.contains(event.target)) setSeasonMenuOpen(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!accountMenu.classList.contains('hidden')) {
    setAccountMenuOpen(false);
    accountButton.focus();
  }
  if (!seasonMenu.classList.contains('hidden')) {
    setSeasonMenuOpen(false);
    seasonButton.focus();
  }
});
authForm.addEventListener('submit', (event) => {
  event.preventDefault();
  loginUser(usernameInput.value, passwordInput.value);
});
searchInput.addEventListener('input', () => refreshView());
statusFilter.addEventListener('change', () => refreshView());
function seasonName(season) {
  return season === ALL_SEASONS ? 'All seasons' : season;
}

function loadDefaultSeason() {
  try { return localStorage.getItem(DEFAULT_SEASON_KEY) || ALL_SEASONS; } catch (error) { return ALL_SEASONS; }
}

function saveDefaultSeason(season) {
  try { localStorage.setItem(DEFAULT_SEASON_KEY, season); } catch (error) { /* not saved */ }
}

function setSeasonMenuOpen(open, focusSelected = false) {
  seasonMenu.classList.toggle('hidden', !open);
  seasonButton.setAttribute('aria-expanded', String(open));
  if (open && focusSelected) {
    const selected = seasonOptions.querySelector('.season-choose[aria-pressed="true"]');
    if (selected) selected.focus();
  }
}

function selectSeason(season) {
  currentSeason = season;
  // "C7 S4 · Override" -> short part + name, so phones can hide the name.
  const [short, ...rest] = seasonName(season).split(' · ');
  const shortPart = document.createElement('span');
  shortPart.textContent = short;
  seasonLabel.replaceChildren(shortPart);
  if (rest.length) {
    const namePart = document.createElement('span');
    namePart.className = 'season-label-name';
    namePart.textContent = ` · ${rest.join(' · ')}`;
    seasonLabel.append(namePart);
  }
  seasonButton.setAttribute('aria-label', `Season: ${seasonName(season)}`);
  seasonOptions.querySelectorAll('.season-choose').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.season === season));
  });
  refreshView();
}

// Each row: the season name (click to view it) and a radio to make it the default.
function populateSeasons(groups) {
  const seasons = [ALL_SEASONS, ...SpriteConfig.listSeasons(groups)];
  let defaultSeason = loadDefaultSeason();
  if (!seasons.includes(defaultSeason)) defaultSeason = ALL_SEASONS;

  seasonOptions.innerHTML = '';
  seasons.forEach((season) => {
    const row = document.createElement('div');
    row.className = 'season-option';

    const choose = document.createElement('button');
    choose.type = 'button';
    choose.className = 'season-choose';
    choose.dataset.season = season;
    choose.textContent = seasonName(season);
    choose.addEventListener('click', () => {
      selectSeason(season);
      setSeasonMenuOpen(false);
      seasonButton.focus();
    });

    const radioLabel = document.createElement('label');
    radioLabel.className = 'season-default';
    radioLabel.title = 'Open on this season by default';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'defaultSeason';
    radio.value = season;
    radio.checked = season === defaultSeason;
    radio.setAttribute('aria-label', `Make ${seasonName(season)} the default season`);
    // Making a season the default also switches to it.
    radio.addEventListener('change', () => {
      saveDefaultSeason(season);
      selectSeason(season);
      setSeasonMenuOpen(false);
      seasonButton.focus();
    });
    radioLabel.appendChild(radio);

    row.append(choose, radioLabel);
    seasonOptions.appendChild(row);
  });

  selectSeason(defaultSeason);
}

seasonButton.addEventListener('click', (event) => {
  event.stopPropagation();
  // event.detail is 0 when opened with Enter/Space, so move focus into the menu.
  setSeasonMenuOpen(seasonMenu.classList.contains('hidden'), event.detail === 0);
});
seasonMenu.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const buttons = [...seasonOptions.querySelectorAll('.season-choose')];
  const index = buttons.indexOf(document.activeElement);
  if (index === -1) return;
  event.preventDefault();
  const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
  buttons[next].focus();
});
registerButton.addEventListener('click', () => {
  registerUser(usernameInput.value, passwordInput.value);
});
logoutButton.addEventListener('click', logoutUser);
printButton.addEventListener('click', printTracker);
const pageTitle = document.title;
window.addEventListener('beforeprint', preparePrint);
window.addEventListener('afterprint', () => { document.title = pageTitle; });

loadSpriteConfig().then((loadedSprites) => {
  spriteGroups = loadedSprites;
  populateSeasons(loadedSprites);
  updateAuthUI();
});
