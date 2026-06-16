// Comments routes — mounted at /comments (public).
import * as q from '../queries.js';
import { resource } from './resource.js';

export default resource({
  list: q.getComments, getById: q.getCommentById, create: q.createComment,
  update: q.updateComment, remove: q.deleteComment, owns: q.ownsComment,
});
