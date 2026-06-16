// Express REST API that behaves like jsonplaceholder, backed by MySQL.
// Same routes the client already used against json-server, so the React
// app keeps working unchanged.
import express from 'express';
import cors from 'cors';
import { Router } from 'express';
import * as q from './queries.js';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUsername(username) {
  return /^[a-zA-Z0-9_]+$/.test(username);
}

const app = express();
//app.use(cors());
app.use(cors({
  origin: 'http://localhost:5173'
}));
app.use(express.json());

// Generic REST router for a resource: GET / , GET /:id , POST / , PUT /:id , DELETE /:id
// If `owns` is provided, PUT and DELETE are allowed ONLY when the active user
// (sent in the x-user-id header) owns the item — otherwise 403.
function resource({ list, getById, create, update, remove, owns }) {
  const r = Router();

  // Ownership guard for PUT/DELETE. Returns true if the request may proceed.
  async function allowed(req, res) {
    if (!owns) return true;
    const actor = req.header('x-user-id');
    const result = await owns(req.params.id, actor);
    if (result === null) { res.status(404).json({}); return false; }
    if (!result) { res.status(403).json({ error: 'You can only modify your own items' }); return false; }
    return true;
  }

  r.get('/', async (req, res, next) => {
    try { res.json(await list(req.query)); } catch (e) { next(e); }
  });
  r.get('/:id', async (req, res, next) => {
    try { const x = await getById(req.params.id); x ? res.json(x) : res.status(404).json({}); }
    catch (e) { next(e); }
  });
  r.post('/', async (req, res, next) => {
    try {
      if (req.baseUrl === '/todos')
      {
        const { title } = req.body;

        if (
          typeof title !== 'string' ||
          !title.trim()
        ) {
          return res.status(400).json({
            error: 'title is required'
          });
        }
      }
      if (req.baseUrl === '/posts') 
      {
        const { title, body } = req.body;

        if (
          typeof title !== 'string' ||
          !title.trim()
        ) {
          return res.status(400).json({
            error: 'title is required'
          });
        }

        if (
          typeof body !== 'string' ||
          !body.trim()
        ) {
          return res.status(400).json({
            error: 'body is required'
          });
        }

      }
      if (req.baseUrl === '/comments') {
        const { body } = req.body;

        if (
          typeof body !== 'string' ||
          !body.trim()
        ) {
          return res.status(400).json({
            error: 'body is required'
          });
        }
      }
      res.status(201).json(await create(req.body)); } catch (e) { next(e); }
  });
  // PUT/DELETE return only a status – the change was made, no need to
  // echo the whole object back over the network ("don't expose more than needed").
  r.put('/:id', async (req, res, next) => {
    try {
      if (!(await allowed(req, res))) return;
      if (req.baseUrl === '/users')
      {
        const { name, email, phone } = req.body;
        if (
          email !== undefined &&
          !isValidEmail(email)
        ) {
          return res.status(400).json({
            error: 'invalid email'
          });
        }
        if (
          name !== undefined &&
          name.length > 50
        ) {
          return res.status(400).json({
            error: 'name too long'
          });
        }
        if (
          email !== undefined &&
          email.length > 100
        ) {
          return res.status(400).json({
            error: 'email too long'
          });
        }
        if (
          phone !== undefined &&
          phone.length > 20
        ) {
          return res.status(400).json({
            error: 'phone too long'
          });
        }
      }
      if (req.baseUrl === '/todos') 
      {
        const { title } = req.body;

        if (
          title !== undefined &&
          !title.trim()
        ) {
          return res.status(400).json({
            error: 'title is required'
          });
        }
      }
      if (req.baseUrl === '/posts') 
      {
        const { title, body } = req.body;

        if (
          title !== undefined &&
          !title.trim()
        ) {
          return res.status(400).json({
            error: 'title is required'
          });
        }

        if (
          body !== undefined &&
          !body.trim()
        ) {
          return res.status(400).json({
            error: 'body is required'
          });
        }
      }
      if (req.baseUrl === '/comments') 
      {
        const { body } = req.body;

        if (
          body !== undefined &&
          !body.trim()
        ) {
          return res.status(400).json({
            error: 'body is required'
          });
        }
      }
      const x = await update(req.params.id, req.body);
      x ? res.json({ success: true }) : res.status(404).json({ error: 'Not found' });
    } catch (e) { next(e); }
  });
  r.delete('/:id', async (req, res, next) => {
    try {
      if (!(await allowed(req, res))) return;
      const ok = await remove(req.params.id);
      ok ? res.json({ success: true }) : res.status(404).json({ error: 'Not found' });
    } catch (e) { next(e); }
  });
  return r;
}

// Health check
app.get('/', (_req, res) => res.json({ status: 'ok', api: 'fullstack6 (jsonplaceholder-style)' }));

// Server-side login: validates against the passwords table + blocked flag.
app.post('/login', async (req, res, next) => {
  try {

    const username = req.body.username?.trim();
    const password = req.body.password?.trim();

    if (!username || !password) {
      return res.status(400).json({
        error: 'username and password are required'
      });
    }

    if (username.includes(' ')) {
      return res.status(400).json({
        error: 'username cannot contain spaces'
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        error: 'username is too short'
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        error: 'password is too short'
      });
    }

    const r = await q.verifyLogin(username, password);
    if (r.status === 'blocked') return res.status(403).json({ error: 'This account is blocked' });
    if (r.status !== 'ok')      return res.status(401).json({ error: 'Invalid username or password' });
    res.json(r.user);
  } catch (e) { next(e); }
});

// Server-side register: the SERVER checks for a duplicate username, so the
// client never has to download the whole user list to check it.
app.post('/register', async (req, res, next) => {
  try {
    const username = req.body.username?.trim();
    const password = req.body.password?.trim();
    const name = req.body.name?.trim();
    const email = req.body.email?.trim();
    const phone = req.body.phone?.trim();

    if (!username || !password || !name || !email)
      return res.status(400).json({ error: 'username, password, name and email are required' });
    if (!isValidUsername(username)) {
      return res.status(400).json({
        error: 'invalid username'
      });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'invalid email'
      });
    }
    if (password.length < 4) {
      return res.status(400).json({
        error: 'password must be at least 4 characters'
      });
    }
    if (name.length > 50) {
      return res.status(400).json({
        error: 'name too long'
      });
    }
    if (phone && phone.length > 20) {
      return res.status(400).json({
        error: 'phone too long'
      });
    }
    const existing = await q.getUsers({ username });
    if (existing.length)
      return res.status(409).json({ error: 'Username already exists' });
    //const user = await q.createUser(req.body);   // returns the new user, never the password
    const user = await q.createUser({
      ...req.body,
      username,
      password,
      name,
      email,
      phone
    });
    res.status(201).json(user);
  } catch (e) { next(e); }
});

app.get(
  '/users/check-username/:username',
  async (req, res, next) => {

    try {

      const users =
        await q.getUsers({
          username:
            req.params.username
        });

      res.json({
        exists:
          users.length > 0
      });

    } catch (e) {

      next(e);

    }
  }
);

// ---- USERS (+ nested todos / posts) ----
const users = resource({
  list: q.getUsers, getById: q.getUserById, create: q.createUser,
  update: q.updateUser, remove: q.deleteUser, owns: q.ownsUserAccount,
});
users.get('/:id/todos',  async (req, res, next) => { try { res.json(await q.getTodos({ userId: req.params.id })); } catch (e) { next(e); } });
users.get('/:id/posts',  async (req, res, next) => { try { res.json(await q.getPosts({ userId: req.params.id })); } catch (e) { next(e); } });
users.get('/:id/albums', async (req, res, next) => { try { res.json(await q.getAlbums({ userId: req.params.id })); } catch (e) { next(e); } });

// Change own password – only the user themselves may do it.
users.put('/:id/password', async (req, res, next) => {
  try {
    if (req.header('x-user-id') !== req.params.id)
      return res.status(403).json({ error: 'You can only change your own password' });
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    if (newPassword.trim().length < 4) {
      return res.status(400).json({
        error: 'new password is too short'
      });
    }
    const ok = await q.changePassword(req.params.id, currentPassword, newPassword);
    return ok ? res.json({ success: true })
              : res.status(401).json({ error: 'Current password is incorrect' });
  } catch (e) { next(e); }
});

// Block / unblock a user – admin only.
users.put('/:id/block', async (req, res, next) => {
  try {
    if (!(await q.isAdmin(req.header('x-user-id'))))
      return res.status(403).json({ error: 'Admin only' });
    const ok = await q.setBlocked(req.params.id, !!req.body.isBlocked);
    return ok ? res.json({ success: true, isBlocked: !!req.body.isBlocked })
              : res.status(404).json({});
  } catch (e) { next(e); }
});

app.use('/users', users);

// ---- POSTS (+ nested comments) ----
const posts = resource({
  list: q.getPosts, getById: q.getPostById, create: q.createPost,
  update: q.updatePost, remove: q.deletePost, owns: q.ownsPost,
});
posts.get('/:id/comments', async (req, res, next) => { try { res.json(await q.getPostComments(req.params.id)); } catch (e) { next(e); } });
app.use('/posts', posts);

// ---- COMMENTS ----
app.use('/comments', resource({
  list: q.getComments, getById: q.getCommentById, create: q.createComment,
  update: q.updateComment, remove: q.deleteComment, owns: q.ownsComment,
}));

// ---- TODOS ----
app.use('/todos', resource({
  list: q.getTodos, getById: q.getTodoById, create: q.createTodo,
  update: q.updateTodo, remove: q.deleteTodo, owns: q.ownsTodo,
}));

// ---- ALBUMS (+ nested photos) ----
const albums = resource({
  list: q.getAlbums, getById: q.getAlbumById, create: q.createAlbum,
  update: q.updateAlbum, remove: q.deleteAlbum, owns: q.ownsAlbum,
});
albums.get('/:id/photos', async (req, res, next) => { try { res.json(await q.getAlbumPhotos(req.params.id)); } catch (e) { next(e); } });
app.use('/albums', albums);

// ---- PHOTOS ----
app.use('/photos', resource({
  list: q.getPhotos, getById: q.getPhotoById, create: q.createPhoto,
  update: q.updatePhoto, remove: q.deletePhoto, owns: q.ownsPhoto,
}));

// 404 + error handler
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Server error' }); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
