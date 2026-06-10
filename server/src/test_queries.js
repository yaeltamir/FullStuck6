// Quick self-test of the dedicated DB functions (run: npm run test:db).
// Exercises GET/POST/PUT/DELETE-style functions against the real DB and
// cleans up after itself.
import * as q from './queries.js';
import { pool } from './db.js';

const log = (label, val) => console.log(`\n• ${label}\n`, JSON.stringify(val, null, 0));

const run = async () => {
  log('getUsers()', await q.getUsers());
  log('getUserById(USR002)', await q.getUserById('USR002'));
  log('getTodos({userId: USR001})', await q.getTodos({ userId: 'USR001' }));
  log('getPosts({userId: USR002})', await q.getPosts({ userId: 'USR002' }));
  log('getPostComments(POST001)', await q.getPostComments('POST001'));

  console.log('\n--- write cycle (create -> update -> delete) ---');
  const created = await q.createTodo({ userId: 'USR001', title: 'TEST todo', completed: false });
  log('createTodo()', created);
  const updated = await q.updateTodo(created.id, { completed: true, title: 'TEST todo (done)' });
  log('updateTodo()', updated);
  const removed = await q.deleteTodo(created.id);
  log('deleteTodo() -> success?', removed);
  log('getTodoById() after delete (should be null)', await q.getTodoById(created.id));

  console.log('\n✅ All dedicated DB functions ran successfully.');
  await pool.end();
};

run().catch((e) => { console.error(e); process.exit(1); });
