// create page logic

const form   = document.getElementById('recipeForm');
const errEl  = document.getElementById('formErr');
const btn    = document.getElementById('submitBtn');
const imgInp = document.getElementById('image');
const preview= document.getElementById('preview');

function showError(msg){
  errEl.textContent = msg;
  errEl.style.display = 'block';
}
function clearError(){
  errEl.textContent = '';
  errEl.style.display = 'none';
}

// image preview + light client checks
imgInp?.addEventListener('change', (e) => {
  clearError();
  const f = e.target.files?.[0];
  if (!f){
    preview.removeAttribute('src');
    preview.style.display = 'none';
    return;
  }
  // mime/type check (server also checks)
  if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(f.type || '')){
    showError('Only PNG, JPG, WEBP or GIF images are allowed.');
    imgInp.value = '';
    return;
  }
  // ~3MB soft cap (server has limits too)
  if (f.size > 3 * 1024 * 1024){
    showError('Image too large (max ~3 MB).');
    imgInp.value = '';
    return;
  }
  preview.src = URL.createObjectURL(f);
  preview.style.display = 'block';
});

// submit handler
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const uid = localStorage.getItem('userId');
  if (!uid){
    showError('You must be logged in to submit a recipe.');
    return;
  }

  const title = String(document.getElementById('title').value || '').trim();
  const ingredients = String(document.getElementById('ingredients').value || '').trim();
  const instructions = String(document.getElementById('instructions').value || '').trim();

  if (title.length < 3){
    showError('Title must be at least 3 characters.');
    document.getElementById('title').focus();
    return;
  }
  if (!ingredients){
    showError('Please add at least one ingredient.');
    document.getElementById('ingredients').focus();
    return;
  }
  if (!instructions){
    showError('Please add instructions.');
    document.getElementById('instructions').focus();
    return;
  }

  const fd = new FormData(form);
  fd.append('user_id', uid); // server expects user_id

  btn.disabled = true;
  btn.textContent = 'Submitting…';

  try {
    const res = await fetch('/api/recipes', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));

    if (!res.ok){
      showError(data.error || 'Failed to submit recipe.');
      btn.disabled = false;
      btn.textContent = 'Create Recipe';
      return;
    }

    alert('Recipe submitted successfully!');
    // navigate to manage page
    location.href = 'my-recipes.html';
  } catch (err){
    showError('Network error while submitting the recipe.');
    btn.disabled = false;
    btn.textContent = 'Create Recipe';
  }
});
