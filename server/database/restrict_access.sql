-- ============================================================
--  Access restriction for the passwords table (Stage A requirement).
--
--  The app should NOT connect to MySQL as root. We create a
--  dedicated least-privilege user for the server. It has normal
--  DML on the resource tables, but on `passwords` it may only
--  read the two columns auth needs and insert/update – it can
--  never browse or delete the whole password table.
--
--  Run once as root:   mysql -u root < restrict_access.sql
--  Then start the server with:  DB_USER=app_user DB_PASSWORD=app_pass
-- ============================================================

CREATE USER IF NOT EXISTS 'app_user'@'localhost' IDENTIFIED BY 'app_pass';

GRANT SELECT, INSERT, UPDATE, DELETE ON fullstack6.users    TO 'app_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON fullstack6.todos    TO 'app_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON fullstack6.posts    TO 'app_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON fullstack6.comments TO 'app_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON fullstack6.albums   TO 'app_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON fullstack6.photos   TO 'app_user'@'localhost';

-- Restricted: verify one user's password + set/update it, nothing more.
GRANT SELECT (user_id, password), INSERT, UPDATE
  ON fullstack6.passwords TO 'app_user'@'localhost';

FLUSH PRIVILEGES;
