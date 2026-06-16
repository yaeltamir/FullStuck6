-- ============================================================
--  Project 6 – MySQL database
--  Resources: users, todos, posts, comments
--  IDs keep the same string format used by the client (USR001…),
--  so the React app keeps working when the server is added.
--  Passwords live in a SEPARATE, access-restricted table.
--
--  DELETION POLICY = SOFT DELETE: every resource table has an
--  `is_deleted` flag. A DELETE request sets is_deleted = 1 instead
--  of removing the row; all reads ignore flagged rows, so data is
--  preserved and recoverable. (Answers the spec's "what is deletion?")
-- ============================================================

DROP DATABASE IF EXISTS fullstack6;
CREATE DATABASE fullstack6
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE fullstack6;

-- ------------------------------------------------------------
--  users – a reasonable subset of fields (no password here!).
-- ------------------------------------------------------------
CREATE TABLE users (
  id          VARCHAR(20)  PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(120) NOT NULL,
  phone       VARCHAR(40),
  website     VARCHAR(120),
  role            ENUM('user','admin') NOT NULL DEFAULT 'user',  -- admin manages the system
  is_blocked      TINYINT(1)   NOT NULL DEFAULT 0,               -- a blocked user cannot log in
  failed_attempts TINYINT      NOT NULL DEFAULT 0,               -- wrong-password counter (lock at 5)
  is_deleted      TINYINT(1)   NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
--  passwords – the "users + passwords" table, kept on its own.
--  * 1:1 with users.
--  * Read/written ONLY by the auth code, never joined into normal
--    user reads, never returned to the client.
--  * Access is further restricted by a dedicated DB user – see
--    restrict_access.sql.
-- ------------------------------------------------------------
CREATE TABLE passwords (
  user_id   VARCHAR(20) PRIMARY KEY,
  password  VARCHAR(255) NOT NULL,
  CONSTRAINT fk_pwd_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
--  todos – each todo belongs to one user.
-- ------------------------------------------------------------
CREATE TABLE todos (
  id          VARCHAR(20) PRIMARY KEY,
  user_id     VARCHAR(20) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  completed   TINYINT(1) NOT NULL DEFAULT 0,
  is_deleted  TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_todo_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_todo_user (user_id)
);

-- ------------------------------------------------------------
--  posts – each post belongs to one user.
-- ------------------------------------------------------------
CREATE TABLE posts (
  id          VARCHAR(20) PRIMARY KEY,
  user_id     VARCHAR(20) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  is_deleted  TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_post_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_post_user (user_id)
);

-- ------------------------------------------------------------
--  comments – each comment belongs to one post (and an author).
-- ------------------------------------------------------------
CREATE TABLE comments (
  id          VARCHAR(20) PRIMARY KEY,
  post_id     VARCHAR(20) NOT NULL,
  user_id     VARCHAR(20) NOT NULL,
  name        VARCHAR(120),
  email       VARCHAR(120),
  body        TEXT NOT NULL,
  is_deleted  TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_comment_post FOREIGN KEY (post_id)
    REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_comment_post (post_id)
);

-- ------------------------------------------------------------
--  albums + photos (advanced stage)
-- ------------------------------------------------------------
CREATE TABLE albums (
  id          VARCHAR(20) PRIMARY KEY,
  user_id     VARCHAR(20) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  is_deleted  TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_album_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_album_user (user_id)
);

CREATE TABLE photos (
  id             VARCHAR(20) PRIMARY KEY,
  album_id       VARCHAR(20) NOT NULL,
  title          VARCHAR(255) NOT NULL,
  url            VARCHAR(500),
  thumbnail_url  VARCHAR(500),
  is_deleted     TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_photo_album FOREIGN KEY (album_id)
    REFERENCES albums(id) ON DELETE CASCADE,
  INDEX idx_photo_album (album_id)
);
