/* public/src/home.js */

// ---- DEBUG: prove script runs ----
document.body.setAttribute('data-js', 'booted');
console.log('[Index] JS booted');

// Global error tap so we see silent errors
window.addEventListener('error', e => {
  console.error('[Index] Uncaught error:', e.message, e.error);
});

/* ---- Auth buttons ---- */
const navRight = document.getElementById('navRight');
try {
  const userId = localStorage.getItem('userId');
  const authButtons = userId
    ? `
        <a href="create.html" class="nav-btn add-recipe">➕ Create Recipe</a>
        <div class="avatar-wrap" id="accountMenu">
          <button id="avatarBtn" class="avatar-btn" aria-haspopup="true" aria-expanded="false" title="Account">
            <img id="avatarImg" alt="" />
            <span id="avatarInitial">🙂</span>
          </button>
          <div id="avatarMenu" class="menu" role="menu" aria-label="Account">
            <a href="settings.html" role="menuitem"><i class="fa-solid fa-user-gear"></i> Settings</a>
            <a href="my-recipes.html" role="menuitem"><i class="fa-solid fa-book"></i> My Recipes</a>
            <hr />
            <button id="logoutItem" role="menuitem"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
          </div>
        </div>
      `
    : `<a href="login.html" class="nav-btn">🔐 Login</a>`;
  if (navRight) navRight.insertAdjacentHTML("beforeend", authButtons);
} catch (e) {
  console.warn('LocalStorage not available:', e);
}

/* ---- Elements (guarded) ---- */
const grid       = document.getElementById('recipeGrid');
const qEl        = document.getElementById('searchInput');
const dropdown   = document.getElementById('categoryDropdown');
const toggleBtn  = dropdown ? dropdown.querySelector('.dropdown-toggle') : null;
const catLabel   = document.getElementById('catLabel');
const prevBtn    = document.getElementById('prevBtn');
const nextBtn    = document.getElementById('nextBtn');
const pageNum    = document.getElementById('pageNum');
const clearBtn   = document.getElementById('clearFilters');
const resultEl   = document.getElementById('resultCount');

const LIMIT = 12;
let currentPage = 1;
let currentCategory = '';
let currentQuery = '';
let totalResults = 0;

function updateClearVisibility() {
  if (clearBtn) clearBtn.hidden = !(currentQuery || currentCategory);
}

function readStateFromURL() {
  const u = new URL(location.href);
  currentQuery    = u.searchParams.get('q') || '';
  currentCategory = u.searchParams.get('category') || '';
  currentPage     = Math.max(1, parseInt(u.searchParams.get('page') || '1', 10));
  if (qEl) qEl.value = currentQuery;

  if (dropdown) {
    const items = dropdown.querySelectorAll('.dropdown-item');
    let activeBtn = null;
    items.forEach(btn => {
      const isActive = (btn.dataset.category || '') === currentCategory;
      btn.classList.toggle('is-active', isActive);
      if (isActive) { btn.setAttribute('aria-current', 'true'); activeBtn = btn; }
      else { btn.removeAttribute('aria-current'); }
    });
    if (!activeBtn) {
      const allBtn = dropdown.querySelector('.dropdown-item[data-category=""]');
      if (allBtn) { allBtn.classList.add('is-active'); allBtn.setAttribute('aria-current','true'); activeBtn = allBtn; }
    }
    if (catLabel) catLabel.textContent = activeBtn ? activeBtn.textContent.trim() : 'Categories';
  }

  updateClearVisibility();
}

function writeStateToURL() {
  const u = new URL(location.href);
  if (currentQuery) u.searchParams.set('q', currentQuery); else u.searchParams.delete('q');
  if (currentCategory) u.searchParams.set('category', currentCategory); else u.searchParams.delete('category');
  if (currentPage > 1) u.searchParams.set('page', String(currentPage)); else u.searchParams.delete('page');
  history.replaceState(null, '', u.toString());
  updateClearVisibility();
}

function updateResultCount(visibleCount) {
  if (!resultEl) return;
  if (!totalResults && !visibleCount) { resultEl.textContent = ''; return; }
  const start = (currentPage - 1) * LIMIT + (visibleCount ? 1 : 0);
  const end   = (currentPage - 1) * LIMIT + visibleCount;
  resultEl.innerHTML = totalResults
    ? `<span class="badge">${totalResults}</span> result${totalResults === 1 ? '' : 's'} · showing ${start}-${end}`
    : `<span class="badge">${visibleCount}</span> result${visibleCount === 1 ? '' : 's'}`;
}

async function load(page = 1) {
  currentPage = page;
  currentQuery = (qEl?.value || '').trim();

  try {
    const url = new URL('/api/recipes', location.origin);
    if (currentQuery)    url.searchParams.set('q', currentQuery);
    if (currentCategory) url.searchParams.set('category', currentCategory);
    url.searchParams.set('page', currentPage);
    url.searchParams.set('limit', LIMIT);
    url.searchParams.set('meta', '1');

    console.log('[Index] Fetching:', url.toString());

    const res = await fetch(url);
    if (!res.ok) throw new Error(`API ${res.status}`);

    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.items || []);
    totalResults = Array.isArray(data) ? 0 : (data.total ?? 0);

    grid.innerHTML = list.length
      ? list.map(r => `
          <article class="recipe-card" tabindex="0" role="button" aria-label="Open ${r.title}">
            <img src="${r.image || 'images/placeholder.jpg'}" alt="${r.title}" />
            <h3>${r.title}</h3>
          </article>
        `).join('')
      : '<p style="opacity:.7">No recipes found.</p>';

    if (list.length) {
      Array.from(grid.children).forEach((card, i) => {
        const id = list[i].id;
        card.addEventListener('click', () => location.href = `recipe.html?id=${id}`);
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter') location.href = `recipe.html?id=${id}`; });
      });
    }

    if (totalResults) {
      const maxPage = Math.max(1, Math.ceil(totalResults / LIMIT));
      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= maxPage;
    } else {
      if (prevBtn) prevBtn.disabled = currentPage === 1;
      if (nextBtn) nextBtn.disabled = list.length < LIMIT;
    }
    if (pageNum) pageNum.textContent = currentPage;

    updateResultCount(list.length);
    writeStateToURL();
  } catch (err) {
    console.error('[Index] Load error:', err);
    if (grid) grid.innerHTML = `<p style="opacity:.7">Failed to load recipes.</p>`;
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    if (resultEl) resultEl.textContent = '';
  }
}

/* Events (guarded) */
qEl?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); load(1); }
});

toggleBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  if (!dropdown) return;
  const isOpen = dropdown.classList.toggle('open');
  toggleBtn.setAttribute('aria-expanded', String(isOpen));
});

document.addEventListener('click', (e) => {
  if (!dropdown || !toggleBtn) return;
  if (!dropdown.contains(e.target)) {
    dropdown.classList.remove('open');
    toggleBtn.setAttribute('aria-expanded', 'false');
  }
});

dropdown?.querySelectorAll('.dropdown-item').forEach(btn => {
  btn.addEventListener('click', () => {
    dropdown.querySelectorAll('.dropdown-item').forEach(x => {
      x.classList.remove('is-active'); x.removeAttribute('aria-current');
    });
    btn.classList.add('is-active'); btn.setAttribute('aria-current','true');
    currentCategory = btn.dataset.category || '';
    if (catLabel) catLabel.textContent = btn.textContent.trim() || 'Categories';
    load(1);
    dropdown.classList.remove('open');
    toggleBtn?.setAttribute('aria-expanded','false');
  });
});

prevBtn?.addEventListener('click', () => { if (currentPage > 1) load(currentPage - 1); });
nextBtn?.addEventListener('click', () => { load(currentPage + 1); });

clearBtn?.addEventListener('click', () => {
  if (qEl) qEl.value = '';
  currentQuery = '';
  currentCategory = '';
  currentPage = 1; 
  if (dropdown) {
    const allBtn = dropdown.querySelector('.dropdown-item[data-category=""]');
    dropdown.querySelectorAll('.dropdown-item').forEach(x => {
      x.classList.remove('is-active'); x.removeAttribute('aria-current');
    });
    if (allBtn) {
      allBtn.classList.add('is-active'); allBtn.setAttribute('aria-current','true');
      if (catLabel) catLabel.textContent = allBtn.textContent.trim() || 'Categories';
    } else if (catLabel) {
      catLabel.textContent = 'Categories';
    }
  }
  load(1);
});

// ---- run search as you type (debounced) ----
function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), ms);
  };
}

// trigger a new search 300ms after the user stops typing
qEl?.addEventListener('input', debounce(() => {
  // reset to page 1 when query changes
  currentPage = 1;
  currentQuery = (qEl.value || '').trim();
  writeStateToURL();
  load(1);
}, 300));

/* Initial boot */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Index] DOMContentLoaded');
  try { readStateFromURL(); } catch (e) { console.warn('[Index] state read error', e); }
  load(currentPage);
});

/* Avatar menu */
(function () {
  const btn   = document.getElementById('avatarBtn');
  const img   = document.getElementById('avatarImg');
  const init  = document.getElementById('avatarInitial');
  const menu  = document.getElementById('avatarMenu');
  const wrap  = document.getElementById('accountMenu');
  if (!btn || !menu || !wrap || !img || !init) return;
  try {
    const name = (localStorage.getItem('username') || localStorage.getItem('email') || 'User').trim();
    const avatar = localStorage.getItem('avatar') || '';
    if (avatar) { img.src = avatar; btn.classList.add('has-photo'); }
    else { init.textContent = (name[0] || 'U').toUpperCase(); btn.classList.remove('has-photo'); img.removeAttribute('src'); }
  } catch { init.textContent = 'U'; }
  function openMenu(open) { menu.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); }
  btn.addEventListener('click', (e) => { e.stopPropagation(); openMenu(!menu.classList.contains('open')); });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) openMenu(false); });
  btn.addEventListener('keydown', (e) => { if (e.key === 'Escape') openMenu(false); });
  document.getElementById('logoutItem')?.addEventListener('click', () => {
    try { ['userId','username','email','avatar'].forEach(k => localStorage.removeItem(k)); } catch {}
    location.href = 'index.html';
  });
})();

/* Dark mode */
(function () {
  const btn = document.getElementById('darkToggle');
  if (!btn) return;
  const KEY = 'theme';
  let theme = null;
  try { theme = localStorage.getItem(KEY); } catch {}
  if (!theme) theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  function apply(t) {
    document.body.classList.toggle('dark', t === 'dark');
    const isDark = t === 'dark';
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  }
  apply(theme);
  btn.addEventListener('click', () => {
    const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    apply(newTheme);
    try { localStorage.setItem(KEY, newTheme); } catch {}
  });
})();
