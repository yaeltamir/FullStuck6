import { useEffect, useState } from "react";
import { apiGet, apiPut } from "../api/api";

const PAGE_SIZE = 5;   // load users a small page at a time — never "all million" at once

// Admin-only page: search + paginated user list, with block / unblock.
// A blocked user cannot log in (enforced by the server at login).
export default function Admin() {

  const currentUser = JSON.parse(
    localStorage.getItem("currentUser")
  );

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Fetch ONE page from the server (filtered by search). reset=true starts over.
  async function loadUsers(reset) {
    const off = reset ? 0 : offset;
    const data = await apiGet(
      `/users?search=${encodeURIComponent(search)}&limit=${PAGE_SIZE}&offset=${off}`
    );
    setUsers((prev) => (reset ? data : [...prev, ...data]));
    setOffset(off + data.length);
    setHasMore(data.length === PAGE_SIZE);   // a full page probably means there's more
  }

  useEffect(() => {
    if (currentUser?.role === "admin") loadUsers(true);
  }, []);   // eslint-disable-line

  function handleSearch(e) {
    e.preventDefault();
    loadUsers(true);
  }

  async function toggleBlock(u) {
    await apiPut(`/users/${u.id}/block`, { isBlocked: !u.isBlocked });
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, isBlocked: !u.isBlocked } : x))
    );
  }

  // Guard: only an admin may see this page.
  if (currentUser?.role !== "admin") {
    return <h2>Access denied — admins only.</h2>;
  }

  return (
    <div>
      <h2>Admin — User Management</h2>
      <hr />

      {/* Search: the server filters, so we never download the whole table */}
      <form className="row" onSubmit={handleSearch}>
        <input
          placeholder="Search by username or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.name}</td>
              <td>{u.role}</td>
              <td>{u.isBlocked ? "🚫 Blocked" : "✅ Active"}</td>
              <td>
                {/* an admin cannot block themselves or another admin */}
                {u.id !== currentUser.id && u.role !== "admin" ? (
                  <button
                    className={u.isBlocked ? "btn-secondary" : "btn-danger"}
                    onClick={() => toggleBlock(u)}
                  >
                    {u.isBlocked ? "Unblock" : "Block"}
                  </button>
                ) : (
                  <span>—</span>
                )}
              </td>
            </tr>
          ))}
          {!users.length && (
            <tr><td colSpan="5">No users found.</td></tr>
          )}
        </tbody>
      </table>

      {hasMore && (
        <button onClick={() => loadUsers(false)} style={{ marginTop: 16 }}>
          Load More
        </button>
      )}
    </div>
  );
}
