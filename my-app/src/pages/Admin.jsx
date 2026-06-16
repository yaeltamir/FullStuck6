import { useEffect, useState } from "react";
import { apiGet, apiPut } from "../api/api";

// Admin-only page: search + paginated user list, with block / unblock.
// A blocked user cannot log in (enforced by the server at login).
export default function Admin() {

  const currentUser = JSON.parse(
    localStorage.getItem("currentUser")
  );

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(8);   // admin chooses; the server caps it at 100
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Fetch ONE page from the server (filtered by search). reset=true starts over.
  async function loadUsers(reset, pp = perPage) {
    const off = reset ? 0 : offset;
    const data = await apiGet(
      `/users?search=${encodeURIComponent(search)}&_per_page=${pp}&offset=${off}`
    );
    setUsers((prev) => (reset ? data : [...prev, ...data]));
    setOffset(off + data.length);
    setHasMore(data.length === pp);   // a full page probably means there's more
  }

  useEffect(() => {
    if (currentUser?.role === "admin") loadUsers(true);
  }, []);   // eslint-disable-line

  function handleSearch(e) {
    e.preventDefault();
    loadUsers(true);
  }

  function changePerPage(e) {
    const pp = Number(e.target.value);
    setPerPage(pp);
    loadUsers(true, pp);
  }

  async function toggleBlock(u) {
    await apiPut(`/users/${u.id}/block`, { isBlocked: !u.isBlocked });
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, isBlocked: !u.isBlocked } : x))
    );
  }

  // Promote a user to admin / demote an admin to user.
  async function toggleRole(u) {
    const newRole = u.role === "admin" ? "user" : "admin";
    await apiPut(`/users/${u.id}/role`, { role: newRole });
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, role: newRole } : x))
    );
  }

  // Guard: only an admin may see this page. (The real gate is the server — even
  // if someone fakes role in localStorage, every admin action is checked there.)
  if (currentUser?.role !== "admin") {
    return <h2>Access denied — admins only.</h2>;
  }

  return (
    <div>
      <h2>Admin — User Management</h2>
      <hr />

      {/* Search + page size: the server filters/limits, so we never download all */}
      <form className="row" onSubmit={handleSearch}>
        <input
          placeholder="Search by username or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">Search</button>
        <select value={perPage} onChange={changePerPage}>
          {[8, 25, 50, 100].map((n) => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
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
                {u.id === currentUser.id ? (
                  <span>—</span>
                ) : (
                  <>
                    {/* promote / demote */}
                    <button
                      className="btn-secondary"
                      onClick={() => toggleRole(u)}
                    >
                      {u.role === "admin" ? "Remove Admin" : "Make Admin"}
                    </button>
                    {/* an admin cannot be blocked */}
                    {u.role === "user" && (
                      <button
                        className={u.isBlocked ? "btn-secondary" : "btn-danger"}
                        onClick={() => toggleBlock(u)}
                      >
                        {u.isBlocked ? "Unblock" : "Block"}
                      </button>
                    )}
                  </>
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
