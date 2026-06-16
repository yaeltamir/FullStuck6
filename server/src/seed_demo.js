// Optional: add 20 extra demo users (each with 2 posts + 1 album) so the admin
// page's search + "Load More" pagination is easy to see. Idempotent (fixed ids).
// Run:  npm run seed:demo
import bcrypt from 'bcryptjs';
import { query, pool } from './db.js';

const NAMES = [
  'Noa', 'Tamar', 'Rivka', 'Sarah', 'Leah', 'Miriam', 'Esther', 'Ruth',
  'Dina', 'Avigail', 'Shira', 'Maya', 'Talia', 'Hila', 'Naomi', 'Adi',
  'Roni', 'Gali', 'Lior', 'Shani',
];

const run = async () => {
  for (let i = 0; i < NAMES.length; i++) {
    const n = i + 4;                              // USR004 … USR023
    const id = 'USR' + String(n).padStart(3, '0');
    const username = NAMES[i].toLowerCase() + n;
    const name = `${NAMES[i]} Demo`;
    const hash = await bcrypt.hash(username + '123', 10);

    await query(
      `INSERT INTO users (id, username, name, email, phone, website, role)
       VALUES (?,?,?,?,?,?, 'user')
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [id, username, name, `${username}@example.com`, '050-0000000', '']);

    await query(
      `INSERT INTO passwords (user_id, password) VALUES (?,?)
       ON DUPLICATE KEY UPDATE password = VALUES(password)`, [id, hash]);

    await query(
      `INSERT INTO posts (id, user_id, title, body) VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE title = VALUES(title)`,
      [`POSTU${n}A`, id, `${name}'s first post`, `Hello, I'm ${name}.`]);
    await query(
      `INSERT INTO posts (id, user_id, title, body) VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE title = VALUES(title)`,
      [`POSTU${n}B`, id, `${name}'s second post`, `Another post by ${name}.`]);

    await query(
      `INSERT INTO albums (id, user_id, title) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE title = VALUES(title)`,
      [`ALBU${n}`, id, `${name}'s album`]);
  }
  console.log(`Done: ${NAMES.length} demo users (each with 2 posts + 1 album).`);
  await pool.end();
};

run().catch((e) => { console.error(e); process.exit(1); });
