// App entry point: set up Express, the middleware, and mount the route modules.
// The actual logic lives in: routes/ (HTTP) · queries.js (DB) · mappers.js · middleware/
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { authMiddleware } from './middleware/auth.js';
import uploadRoutes from './routes/upload.routes.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import postsRoutes from './routes/posts.routes.js';
import commentsRoutes from './routes/comments.routes.js';
import todosRoutes from './routes/todos.routes.js';
import albumsRoutes from './routes/albums.routes.js';
import photosRoutes from './routes/photos.routes.js';

const app = express();

// ---- global middleware ----
app.use(cors({ origin: 'http://localhost:5173' }));   // only our client may call the API
app.use(express.json());
app.use((req, res, next) => {                         // request logger
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode}`));
  next();
});
app.use(authMiddleware);                              // sets req.userId / req.userRole from the JWT

// ---- routes ----
app.get('/', (_req, res) => res.json({ status: 'ok', api: 'fullstack6 (jsonplaceholder-style)' }));
app.use(uploadRoutes);            // /upload + /uploads
app.use('/auth', authRoutes);     // /auth/login, /auth/register
app.use('/users', usersRoutes);
app.use('/posts', postsRoutes);
app.use('/comments', commentsRoutes);
app.use('/todos', todosRoutes);
app.use('/albums', albumsRoutes);
app.use('/photos', photosRoutes);

// ---- 404 + error handler ----
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Server error' }); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
