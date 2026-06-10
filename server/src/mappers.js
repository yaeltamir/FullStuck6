// Convert DB rows (snake_case columns, TINYINT booleans) into the exact
// jsonplaceholder-style shapes the client expects (camelCase, same fields
// as db.json). Passwords are never mapped, so they can never reach the client.

// PUBLIC view — safe to show to anyone (listings, post owners, admin table).
// No contact details, and NO website (in this data website == the password!).
export const toUser = (r) => ({
  id: r.id,
  username: r.username,
  name: r.name,
  role: r.role,
  isBlocked: !!r.is_blocked,
});

// PRIVATE view — returned only to the user about THEMSELVES (login / register),
// so their own profile page can show contact details.
export const toUserPrivate = (r) => ({
  ...toUser(r),
  email: r.email,
  phone: r.phone,
});

export const toPost = (r) => ({
  userId: r.user_id,
  id: r.id,
  title: r.title,
  body: r.body,
});

// A comment exposes only who wrote it (name + userId) and the text.
// The commenter's email is NOT returned — it isn't needed to display a comment.
export const toComment = (r) => ({
  postId: r.post_id,
  userId: r.user_id,
  id: r.id,
  name: r.name,
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
