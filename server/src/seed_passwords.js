// Seed the `passwords` table with bcrypt HASHES of the demo passwords (from
// db.json). Passwords are never stored in plain text.
// Run after schema.sql + seed.sql:   npm run seed:passwords
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { query, pool } from './db.js';

const here = dirname(fileURLToPath(import.meta.url));
const db = JSON.parse(readFileSync(join(here, '../../my-app/db.json'), 'utf8'));

const run = async () => {
  for (const u of db.users) {
    const hash = await bcrypt.hash(u.password, 10);
    await query(
      `INSERT INTO passwords (user_id, password) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE password = VALUES(password)`,
      [u.id, hash]);
    console.log(`  hashed password for ${u.username}`);
  }
  console.log(`Done: ${db.users.length} passwords hashed & seeded.`);
  await pool.end();
};

run().catch((e) => { console.error(e); process.exit(1); });
