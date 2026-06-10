// Convert DB rows (snake_case columns, TINYINT booleans) into the exact
// jsonplaceholder-style shapes the client expects (camelCase, same fields
// as db.json). Passwords are never mapped, so they can never reach the client.

export const toUser = (r) => ({
  id: r.id,
  username: r.username,
  name: r.name,
  email: r.email,
  phone: r.phone,
  website: r.website,
  role: r.role,
  isBlocked: !!r.is_blocked,
});

export const toPost = (r) => ({
  userId: r.user_id,
  id: r.id,
  title: r.title,
  body: r.body,
});

export const toComment = (r) => ({
  postId: r.post_id,
  userId: r.user_id,
  id: r.id,
  name: r.name,
  email: r.email,
  body: r.body,
});

export const toTodo = (r) => ({
  userId: r.user_id,
  id: r.id,
  title: r.title,
  completed: !!r.completed,
});

export const toAlbum = (r) => ({
  userId: r.user_id,
  id: r.id,
  title: r.title,
});

export const toPhoto = (r) => ({
  albumId: r.album_id,
  id: r.id,
  title: r.title,
  url: r.url,
  thumbnailUrl: r.thumbnail_url,
});
