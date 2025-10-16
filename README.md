ChefChecker — Recipe Finder (COM-710 Coursework)

A small full-stack web app for discovering and managing recipes. Built with Node.js + Express + SQLite on the backend and vanilla HTML/CSS/JS on the frontend. Features include search, category filters, dark/light mode, login/register, create/edit recipes with image upload, favorites, comments (with author edit/delete), and a simple profile (bio/avatar/password).

Features

Recipe grid with search & category filters

Recipe details page (ingredients, steps, favorites count, comments)

Login / Register (bcrypt hashing)

Create / Edit / Delete recipes (owner only)

Upload images for recipes (and avatar)

Comment on recipes (authors can edit/delete their comments)

“My Recipes” page to manage personal content

Account menu + profile (bio, avatar, password)

Dark / Light mode toggle with persistence

Accessible UI: keyboardable menus, focus states, ARIA labels

Basic tests (Jest + Supertest) covering the main flows

Tech Stack

Backend: Node.js, Express, sqlite3, multer, bcrypt, (optional) helmet

Frontend: HTML5, CSS, minimal JS (per-page inline scripts), Font Awesome

Tests: Jest + Supertest

DB: SQLite (single file database.db)

Quick Start

1) Install
npm install

2) (Optional) Install helmet for extra security headers
npm i helmet

3) Run
npm start
or, if you added a dev script using nodemon: npm run dev

4) Open in your browser
http://localhost:3000

Notes

The database is created automatically as database.db.

Uploaded images are saved to public/uploads/ (auto-created, gitignored).

Environment (optional)

Create a .env at the project root (or rely on defaults):

PORT=3000

Running Tests

npm test

Tests spin up the Express app without binding a port. Coverage includes: register/login, create/get/update/delete recipe, favorites, comments, and a simple profile update.

If you hit unique-constraint errors in tests, delete database.db to start fresh.

Project Structure
backend/
  controllers/
    authController.js
    recipeController.js
  routes/
    auth.js
    recipeRoutes.js
  server.js
config/
  db.js
public/
  index.html
  recipe.html
  create.html
  edit.html
  my-recipes.html
  login.html
  register.html
  images/
  uploads/            # (gitignored)
src/
  styles.css
  script.js           # (only used if you add shared code)
tests/
  app.test.js
database.db           # (gitignored)
README.md
package.json

API Quick Reference
Auth

POST /api/auth/register
Body:

{ "username": "user_123", "email": "u@example.com", "password": "Passw0rd!" }


Validation:

username: ^[A-Za-z0-9_]{3,30}$

email format

password length: 8–72
→ 201 { "message": "...", "id": <number> }

POST /api/auth/login
Body:

{ "email": "u@example.com", "password": "Passw0rd!" }


→ 200 { "userId": 1, "username": "user_123", "email": "u@example.com", "avatar": null }

GET /api/auth/me/:id
→ 200 { "id": 1, "username": "...", "email": "...", "bio": "...?", "avatar": "...?" }

POST /api/auth/me/:id (multipart)
Fields: username?, bio?, password?
File: avatar?
→ 200 { "message": "Profile updated" }

Recipes

GET /api/recipes
Query: q, category, page, limit, meta=1?
→ 200 array, or { items, total } if meta=1.

GET /api/recipes/mine?user_id=...
Your own recipes; supports q, page, limit, meta.

GET /api/recipes/:id
→ 200 Recipe | 404 Not found

POST /api/recipes (multipart)
Fields: user_id, title*, ingredients*, instructions*, category?, visibility? (public|private), description?
File: image?

Server clamps/validates:

title ≤ 100, description ≤ 400, category ≤ 40

ingredients ≤ 4000, instructions ≤ 8000

visibility whitelist: public | private

→ 201 { "message": "Recipe added", "recipeId": <number> }

PUT /api/recipes/:id (multipart; owner-only)
Same fields (send what you want to change).
→ 200 { "message": "Recipe updated" }

DELETE /api/recipes/:id?user_id=... (owner-only)
→ 200 { "message": "Recipe deleted" } | 403 | 404

Favorites

POST /api/recipes/:id/favorite
Body:

{ "userId": 1 }


→ 200 { "message": "Recipe favorited" }

GET /api/recipes/:id/favorites
→ 200 { "count": 3 }

Comments

POST /api/recipes/:id/comments
Body:

{ "content": "Looks good!", "userId": 1 }


→ 200 { "message": "Comment added", "id": <number> }

GET /api/recipes/:id/comments
→ 200 [ { "id": 1, "user_id": 1, "content": "...", "created_at": "...", "username": "..." } ]

PUT /api/recipes/comments/:commentId (author-only)
Body:

{ "content": "Edited text", "userId": 1 }


→ 200 { "message": "Comment updated" }

DELETE /api/recipes/comments/:commentId (author-only)
Body:

{ "userId": 1 }


→ 200 { "message": "Comment deleted" }

Front-End Pages

index.html — recipe grid, search, category filter, result counts, dark/light, account menu

recipe.html — single recipe view, favorites count, comments (author edit/delete), owner edit/delete buttons

create.html — new recipe form with live image preview & validation

edit.html — edit existing recipe (pre-filled)

my-recipes.html — manage personal recipes (edit/delete)

login.html / register.html — auth forms with client-side validation

(optional) settings.html — profile updates (bio, avatar, password)

Validation & Security

Client-side checks for required fields, email format, and minimum lengths

Server-side validation:

Username regex, email regex, password length

Length caps for title/description/category/ingredients/instructions

Visibility whitelist (public | private)

File uploads: multer to public/uploads/, MIME & size checks (PNG/JPG/WEBP/GIF up to ~3 MB)

Owner-only guards on recipe and comment updates/deletes

(Optional) helmet for common HTTP security headers

Accessibility

Semantic headings and labels

Keyboard-accessible dropdowns/menus

Visible focus outlines

ARIA attributes on interactive elements

High-contrast dark mode and legible light mode

.gitignore

Create a .gitignore in the project root (if not already):

node_modules/
public/uploads/
database.db
.env
coverage/


Keeps large/binary/private files out of the repo.

Known Limitations / Future Work

No real email delivery / password reset

No JWT/session tokens (client stores userId locally for demo)

No moderation/rate-limiting

SQLite single-file DB isn’t suited for heavy concurrency (fine for coursework)

Screenshots (optional)

Include a few images or GIFs of:

Home (light & dark)

Recipe detail (comments/favorites)

Create/Edit forms

My Recipes

Profile (avatar/bio)

License

Academic coursework project — for demo/reference use.