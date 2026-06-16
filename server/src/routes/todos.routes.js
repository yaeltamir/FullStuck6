// Todos routes — mounted at /todos (private: a user sees only their own).
import * as q from '../queries.js';
import { resource } from './resource.js';

export default resource({
  list: q.getTodos, getById: q.getTodoById, create: q.createTodo,
  update: q.updateTodo, remove: q.deleteTodo, owns: q.ownsTodo, isPrivate: true,
});
