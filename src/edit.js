// edit page logic

const params = new URLSearchParams(location.search);
const recipeId = params.get('id');

const form   = document.getElementById('editForm');
const errEl  = document.getElementById('formErr');
const saveBtn= document.getElementById('saveBtn');
const cancel = document.getElementById('cancelBtn');

const titleEl = document.getElementById('title');
const ingEl   = document.getElementById('ingredients');
const insEl   = document.getElementById('instructions');
const descEl  = document.getElementById('description');
const catEl   = document.getElementById('category');
const visEl   = document.getElementById('visibility');

const currentImg = document.getElementById('currentImg');
const imgInp = document.getElementById('image');
const preview= document.getElementById('preview');

function showError(msg){ errEl.textContent = msg; errEl.style.display = 'block'; }
function clearError(){ errEl.textContent = ''; errEl.style.display = 'none'; }

// guard: must have id
if (!recipeId) {
  document.body.innerHTML = '<p style="padding:2rem">No recipe id provided.</p>';
  throw new Error('Missing id');
}

// load existing recipe
(async function loadRecipe(){
  try {
    const res = await fetch(`/api/recipes/${recipeId}`);
    const r = await res.json();
    if (!res.ok) throw new Error(r.error || 'Failed to load recipe');

    // owner check
    const me = localStorage.getItem('userId');
    if (!me || (+me !== +r.user_id)) {
      alert('You are not allowed to edit this recipe.');
      location.href = `recipe.html?id=${recipeId}`;
      return;
    }

    // populate fields
    titleEl.value = r.title || '';
    ingEl.value   = r.ingredients || '';
    insEl.value   = r.instructions || '';
    descEl.value  = r.description || '';
    catEl.value   = r.category || '';
    visEl.value   = r.visibility || 'public';

    // current image
    const src = r.image || '';
    if (src) {
      currentImg.src = src;
      currentImg.style.display = 'block';
    } else {
      currentImg.removeAttribute('src');
      currentImg.style.display = 'none';
    }

  } catch (e) {
    showError(e.message || 'Failed to load recipe.');
  }
})();

// preview replacement image
imgInp?.addEventListener('change', (e) => {
  clearError();
  const f = e.target.files?.[0];
  if (!f){
    preview.removeAttribute('src');
    preview.style.display = 'none';
    return;
  }
  if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(f.type || '')){
    showError('Only PNG, JPG, WEBP or GIF images are allowed.');
    imgInp.value = '';
    return;
  }
  if (f.size > 3 * 1024 * 1024){
    showError('Image too large (max ~3 MB).');
    imgInp.value = '';
    return;
  }
  preview.src = URL.createObjectURL(f);
  preview.style.display = 'block';
});

// cancel -> back to details
cancel?.addEventListener('click', () => {
  location.href = `recipe.html?id=${recipeId}`;
});

// submit edits
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const me = localStorage.getItem('userId');
  if (!me) {
    showError('You must be logged in to edit.');
    return;
  }

  const title = String(titleEl.value || '').trim();
  const ingredients = String(ingEl.value || '').trim();
  const instructions = String(insEl.value || '').trim();

  if (title.length < 3){
    showError('Title must be at least 3 characters.');
    titleEl.focus(); return;
  }
  if (!ingredients){
    showError('Please add at least one ingredient.');
    ingEl.focus(); return;
  }
  if (!instructions){
    showError('Please add instructions.');
    insEl.focus(); return;
  }

  const fd = new FormData(form); // includes new image if chosen

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    // PUT with multipart; include user_id to satisfy server check
    const res = await fetch(`/api/recipes/${recipeId}?user_id=${encodeURIComponent(me)}`, {
      method: 'PUT',
      body: fd
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok){
      showError(data.error || 'Failed to save changes.');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
      return;
    }

    // go back to details
    location.href = `recipe.html?id=${recipeId}`;
  } catch (err){
    showError('Network error while saving.');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
  }
});
