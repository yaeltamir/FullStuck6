// TODOS — DB functions.
import { query, nextId, buildFilter, pageClause } from '../db.js';
import { toTodo } from '../mappers.js';

export async function getTodos(filters = {}) {
  const { where, values } = buildFilter(filters, { userId: 'user_id', completed: 'completed', id: 'id' });
  const rows = await query(`SELECT * FROM todos ${where} ORDER BY id` + pageClause(filters), values);
  return rows.map(toTodo);
}

export async function getTodoById(id) {
  const rows = await query('SELECT * FROM todos WHERE id = ? AND is_deleted = 0', [id]);
  return rows.length ? toTodo(rows[0]) : null;
}

export async function createTodo(d) {
  const id = await nextId('todos', 'TD');
  await query('INSERT INTO todos (id, user_id, title, completed) VALUES (?,?,?,?)',
    [id, d.userId, d.title, d.completed ? 1 : 0]);
  return getTodoById(id);
}

// Partial update — only the changed fields.
export async function updateTodo(id, d) {
  const exists = await getTodoById(id);
  if (!exists) return null;
  const fields = [], values = [];
  if (d.userId !== undefined)    { fields.push('user_id = ?');   values.push(d.userId); }
  if (d.title !== undefined)     { fields.push('title = ?');     values.push(d.title); }
  if (d.completed !== undefined) { fields.push('completed = ?'); values.push(d.completed ? 1 : 0); }
  if (!fields.length) return getTodoById(id);
  values.push(id);
  await query(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`, values);
  return getTodoById(id);
}

export async function deleteTodo(id) {
  const r = await query('UPDATE todos SET is_deleted = 1 WHERE id = ? AND is_deleted = 0', [id]);
  return r.affectedRows > 0;
}

export async function ownsTodo(id, userId) {
  const rows = await query('SELECT user_id FROM todos WHERE id = ? AND is_deleted = 0', [id]);
  if (!rows.length) return null;
  return rows[0].user_id === userId;
}
