const STORAGE_KEY = 'fortniteSpriteTrackerStatus';
const USER_STORAGE_KEY = 'fortniteSpriteTrackerCurrentUser';
const USER_PASSWORD_KEY = 'fortniteSpriteTrackerUsers';
const grid = document.getElementById('spriteGrid');
const clearButton = document.getElementById('clearAll');
const template = document.getElementById('spriteCardTemplate');
const loginButton = document.getElementById('loginButton');
const registerButton = document.getElementById('registerButton');
const logoutButton = document.getElementById('logoutButton');
const printButton = document.getElementById('printButton');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const authMessage = document.getElementById('authMessage');
const authPanel = document.getElementById('authPanel');
const userPanel = document.getElementById('userPanel');
const trackerPanel = document.getElementById('trackerPanel');
let spriteGroups = [];

function loadStatus() {
  const user = loadCurrentUser();
  if (!user) return {};
  try {
    return JSON.parse(localStorage.getItem(`${STORAGE_KEY}:${user}`) || '{}');
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

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

function renderCards() {
  const status = loadStatus();
  grid.innerHTML = '';

  spriteGroups.forEach((group) => {
    const row = document.createElement('section');
    row.className = 'sprite-row';

    const header = document.createElement('div');
    header.className = 'row-header';

    const title = document.createElement('h2');
    title.className = 'row-title';
    title.textContent = group.name;

    const count = document.createElement('span');
    count.className = 'row-count';
    count.textContent = `${group.variants.length} variant${group.variants.length === 1 ? '' : 's'}`;

    header.append(title, count);
    row.appendChild(header);

    const variantGrid = document.createElement('div');
    variantGrid.className = 'variant-grid';

    group.variants.forEach((sprite) => {
      const card = template.content.cloneNode(true);
      const image = card.querySelector('.card-image');
      const title = card.querySelector('.sprite-name');
      const variantLabel = card.querySelector('.sprite-variant');
      const labels = [...card.querySelectorAll('.status-group label')];
      const savedValue = status[sprite.id] || '';

      image.src = resolveImagePath(sprite.image);
      image.alt = `${sprite.name} - ${sprite.variant}`;
      image.onerror = () => {
        image.src = 'images/placeholder.svg';
      };
      title.textContent = sprite.name;
      variantLabel.textContent = sprite.variant || '';

      labels.forEach((label) => {
        const input = label.querySelector('input');
        input.dataset.spriteId = sprite.id;
        input.checked = input.value === savedValue;
        label.classList.toggle('checked', input.checked);
      });

      variantGrid.appendChild(card);
    });

    row.appendChild(variantGrid);
    grid.appendChild(row);
  });
}

function updateLabelStyles(target) {
  const labels = target.closest('.status-group').querySelectorAll('label');
  labels.forEach((label) => {
    label.classList.toggle('checked', label.querySelector('input').checked);
  });
}

function handleStatusChange(event) {
  const input = event.target;
  if (input.tagName !== 'INPUT') return;

  const cardStatus = loadStatus();
  const cardId = input.dataset.spriteId;
  const statusGroup = input.closest('.status-group');

  if (!cardId || !statusGroup) return;

  const allInputs = Array.from(statusGroup.querySelectorAll('input'));

  if (input.checked) {
    allInputs.forEach((item) => {
      if (item !== input) item.checked = false;
    });
    cardStatus[cardId] = input.value;
  } else {
    delete cardStatus[cardId];
  }

  saveStatus(cardStatus);
  updateLabelStyles(input);
}

function clearAllStatuses() {
  const user = loadCurrentUser();
  if (!user) return;
  localStorage.removeItem(`${STORAGE_KEY}:${user}`);
  renderCards();
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

function logoutUser() {
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

  if (isLoggedIn) {
    currentUserName.textContent = user;
    clearButton.disabled = false;
    renderCards();
  } else {
    currentUserName.textContent = '';
    clearButton.disabled = true;
    grid.innerHTML = '';
  }
}

function parseSpriteYAML(text) {
  const lines = text.split(/\r?\n/);
  const parsedSprites = [];
  let currentSprite = null;
  let inVariants = false;
  let inImages = false;

  function closeCurrentSprite() {
    if (!currentSprite) return;
    if (!Array.isArray(currentSprite.variants)) currentSprite.variants = [];
    if (!Array.isArray(currentSprite.images)) currentSprite.images = [];
    parsedSprites.push(currentSprite);
    currentSprite = null;
  }

  lines.forEach((rawLine) => {
    const line = rawLine.replace(/\t/g, '  ');
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    if (/^sprites:\s*$/.test(trimmed)) {
      return;
    }

    const spriteStart = line.match(/^\s*-\s*id:\s*(.+)$/);
    if (spriteStart) {
      closeCurrentSprite();
      currentSprite = { id: spriteStart[1].trim(), variants: [], images: [] };
      inVariants = false;
      inImages = false;
      return;
    }

    if (!currentSprite) return;

    const nameMatch = line.match(/^\s*name:\s*(.+)$/);
    if (nameMatch) {
      currentSprite.name = nameMatch[1].trim();
      inVariants = false;
      inImages = false;
      return;
    }

    const imageMatch = line.match(/^\s*image:\s*(.+)$/);
    if (imageMatch) {
      currentSprite.image = imageMatch[1].trim();
      inVariants = false;
      inImages = false;
      return;
    }

    if (/^\s*images:\s*$/.test(line)) {
      inImages = true;
      inVariants = false;
      return;
    }

    if (/^\s*variants:\s*$/.test(line)) {
      inVariants = true;
      inImages = false;
      return;
    }

    if (inImages) {
      const imageItem = line.match(/^\s*-\s*(.+)$/);
      if (imageItem) {
        currentSprite.images.push(imageItem[1].trim());
      }
      return;
    }

    if (inVariants) {
      const variantItem = line.match(/^\s*-\s*(.+)$/);
      if (variantItem) {
        currentSprite.variants.push(variantItem[1].trim());
      }
      return;
    }
  });

  closeCurrentSprite();
  return parsedSprites;
}

async function loadSpriteConfig() {
  try {
    const response = await fetch('sprites.yml');
    if (!response.ok) throw new Error('Unable to load sprites.yml');
    const text = await response.text();
    const parsed = parseSpriteYAML(text);
    return parsed.map((sprite) => ({
      id: sprite.id,
      name: sprite.name,
      variants: Array.isArray(sprite.variants) && sprite.variants.length
        ? sprite.variants.map((variantName, index) => ({
            id: `${sprite.id}:${slugify(variantName)}`,
            name: sprite.name,
            variant: variantName,
            image: (Array.isArray(sprite.images) && sprite.images[index])
              ? sprite.images[index]
              : (sprite.image || `${sprite.id}-${slugify(variantName)}.svg`),
          }))
        : [{
            id: sprite.id,
            name: sprite.name,
            variant: '',
            image: sprite.image || 'placeholder.svg',
          }],
    }));
  } catch (error) {
    console.warn('Unable to load sprites.yml:', error);
    return [];
  }
}

grid.addEventListener('change', handleStatusChange);
clearButton.addEventListener('click', clearAllStatuses);
loginButton.addEventListener('click', () => {
  loginUser(usernameInput.value, passwordInput.value);
});
registerButton.addEventListener('click', () => {
  registerUser(usernameInput.value, passwordInput.value);
});
logoutButton.addEventListener('click', logoutUser);
printButton.addEventListener('click', () => {
  window.print();
});

loadSpriteConfig().then((loadedSprites) => {
  spriteGroups = loadedSprites;
  updateAuthUI();
});
