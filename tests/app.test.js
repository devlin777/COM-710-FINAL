// tests/app.test.js

const request = require('supertest');
const app = require('../backend/server');

// simple unique helpers (valid username/email)
function uniqStamp() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}
function uniqUsername() {
  return `user_${uniqStamp()}`; // letters/numbers/_ only
}
function uniqEmail() {
  return `u${uniqStamp()}@example.com`; // valid email
}

jest.setTimeout(20000); // headroom for CI

describe('ChefChecker API smoke tests', () => {
  let userId;
  let recipeId;

  // --- public list ---
  test('GET /api/recipes returns 200 and an array', async () => {
    const res = await request(app).get('/api/recipes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // --- auth flow ---
  test('Register -> Login works', async () => {
    const username = uniqUsername();
    const email = uniqEmail();
    const password = 'Passw0rd!';

    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username, email, password });
    expect([200, 201]).toContain(reg.status);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.userId).toBeDefined();
    expect(login.body.username).toBeDefined();
    userId = login.body.userId;
  });

  // --- create/get recipe ---
  test('Create a recipe (no image) returns 201', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .field('user_id', String(userId))
      .field('title', 'Test Recipe')
      .field('ingredients', 'Flour\nWater')
      .field('instructions', 'Mix and bake.')
      .field('category', 'dinner')
      .field('visibility', 'public');

    expect(res.status).toBe(201);
    expect(res.body.recipeId).toBeDefined();
    recipeId = res.body.recipeId;
  });

  test('GET /api/recipes/:id returns the new recipe', async () => {
    const res = await request(app).get(`/api/recipes/${recipeId}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Test Recipe');
    expect(res.body.user_id).toBe(userId);
  });

  // --- favorites ---
  test('POST favorite then count increases (>=1)', async () => {
    const fav = await request(app)
      .post(`/api/recipes/${recipeId}/favorite`)
      .send({ userId });
    expect(fav.status).toBe(200);

    const cnt = await request(app).get(`/api/recipes/${recipeId}/favorites`);
    expect(cnt.status).toBe(200);
    expect(typeof cnt.body.count).toBe('number');
    expect(cnt.body.count).toBeGreaterThanOrEqual(1);
  });

  // --- comments basic ---
  test('POST comment then appears in list', async () => {
    const add = await request(app)
      .post(`/api/recipes/${recipeId}/comments`)
      .send({ content: 'Looks good!', userId });
    expect(add.status).toBe(200);

    const list = await request(app).get(`/api/recipes/${recipeId}/comments`);
    expect(list.status).toBe(200);
    const found = list.body.some(c => c.content === 'Looks good!');
    expect(found).toBe(true);
  });

  // ===== extra coverage =====
  let commentId;

  test('Update recipe title (owner) succeeds', async () => {
    const res = await request(app)
      .put(`/api/recipes/${recipeId}`)
      .field('user_id', String(userId))
      .field('title', 'Test Recipe Updated');
    expect(res.status).toBe(200);

    const get = await request(app).get(`/api/recipes/${recipeId}`);
    expect(get.status).toBe(200);
    expect(get.body.title).toBe('Test Recipe Updated');
  });

  test('Add comment -> edit -> delete (author only)', async () => {
    const add = await request(app)
      .post(`/api/recipes/${recipeId}/comments`)
      .send({ content: 'Edit me', userId });
    expect(add.status).toBe(200);
    expect(add.body.id).toBeDefined();
    commentId = add.body.id;

    const upd = await request(app)
      .put(`/api/recipes/comments/${commentId}`)
      .send({ content: 'Edited text', userId });
    expect(upd.status).toBe(200);

    const list = await request(app).get(`/api/recipes/${recipeId}/comments`);
    expect(list.status).toBe(200);
    const edited = list.body.find(c => c.id === commentId);
    expect(edited).toBeTruthy();
    expect(edited.content).toBe('Edited text');

    const del = await request(app)
      .delete(`/api/recipes/comments/${commentId}`)
      .send({ userId });
    expect(del.status).toBe(200);
  });

  test('Profile update: set bio and verify', async () => {
    const up = await request(app)
      .post(`/api/auth/me/${userId}`)
      .field('bio', 'Hello from tests');
    expect(up.status).toBe(200);

    const me = await request(app).get(`/api/auth/me/${userId}`);
    expect(me.status).toBe(200);
    if (typeof me.body.bio !== 'undefined') {
      expect(me.body.bio).toBe('Hello from tests');
    }
  });

  test('Delete recipe (owner) -> GET returns 404', async () => {
    const del = await request(app).delete(`/api/recipes/${recipeId}?user_id=${userId}`);
    expect(del.status).toBe(200);

    const get = await request(app).get(`/api/recipes/${recipeId}`);
    expect(get.status).toBe(404);
  });
});

// tests/app.test.js
afterAll(async () => {
  const db = require('../config/db');
  // tiny delay to let last queries finish
  await new Promise(r => setTimeout(r, 50));
  await new Promise((resolve) => {
    db.close(() => resolve());
  });
});