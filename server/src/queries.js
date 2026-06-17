// ============================================================
//  Data layer — one file PER RESOURCE under ./queries/.
//  This file just re-exports them all, so anything can keep
//  doing `import * as q from './queries.js'` and get every
//  query function from one place.
//
//  Conventions across all resources:
//   * SOFT DELETE: reads ignore is_deleted=1; deleteX() sets the flag.
//   * Updates are PARTIAL (only the fields that were sent).
//   * Pagination via pageClause(); cascades via withTransaction().
// ============================================================
export * from './queries/users.js';
export * from './queries/posts.js';
export * from './queries/comments.js';
export * from './queries/todos.js';
export * from './queries/albums.js';
export * from './queries/photos.js';
