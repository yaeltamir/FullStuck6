// Posts routes — mounted at /posts (public). Includes nested comments.
import * as q from '../queries.js';
import { resource } from './resource.js';

const posts = resource({
  list: q.getPosts, getById: q.getPostById, create: q.createPost,
  update: q.updatePost, remove: q.deletePost, owns: q.ownsPost,
});

// GET /posts/:id/comments
posts.get('/:id/comments', async (req, res, next) => {
  try { res.json(await q.getPostComments(req.params.id)); } catch (e) { next(e); }
});

export default posts;
