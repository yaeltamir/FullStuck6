# Server — Express + MySQL (jsonplaceholder-style)

REST API for project 6. Replaces the stage-5 `json-server` with a real
Node + Express server backed by a MySQL database (`fullstack6`). The routes
and JSON shapes match `jsonplaceholder.typicode.com`, so the React client in
`../my-app` works against it unchanged.

## Setup

```bash
# 1) build the database (from ../my-app/db.json)
cd database
node generate_seed.js          # regenerates seed.sql from db.json
mysql -u root < schema.sql
mysql -u root < seed.sql
mysql -u root < restrict_access.sql   # optional: least-privilege DB user

# 2) run the server
cd ..
npm install
npm start                      # http://localhost:3000  (node --watch)
npm run test:db                # self-test the dedicated DB functions
```

DB connection can be overridden with env vars:
`DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME` (default db: `fullstack6`).

## Layout

```
database/
  schema.sql          tables (users, passwords, todos, posts, comments, albums, photos)
  generate_seed.js    reads ../my-app/db.json -> seed.sql (faithful, reproducible)
  seed.sql            the data
  restrict_access.sql least-privilege DB user; restricted grants on `passwords`
src/
  db.js          mysql2 pool + query()/nextId()/buildFilter() helpers
  queries.js     dedicated DB functions (one per operation, per resource)
  mappers.js     DB rows (snake_case) -> jsonplaceholder shapes (camelCase)
  index.js       Express app: routes identical to jsonplaceholder
  test_queries.js self-test for the DB functions
```

## Routes (each: GET / · GET /:id · POST / · PUT /:id · DELETE /:id)

`/users` `/posts` `/comments` `/todos` `/albums` `/photos`

Nested (like jsonplaceholder):
`/posts/:id/comments` · `/albums/:id/photos` ·
`/users/:id/todos` · `/users/:id/posts` · `/users/:id/albums`

Filters via query string: `/todos?userId=USR001&completed=true`,
`/comments?postId=POST001`, `/users?username=yael`, …

## Notes

- Passwords live in a separate `passwords` table and are **never** returned
  by any route. (Login currently still matches on the `website` field, as the
  original client did — we can move auth fully server-side in a later step.)
