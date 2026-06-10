import { useEffect, useState } from "react";
import { apiGet, apiPut } from "../api/api";

// Admin-only page: lists all users and lets the admin block / unblock them.
// A blocked user cannot log in (enforced by the server at login).
export default function Admin() {

  const currentUser = JSON.parse(
    localStorage.getItem("currentUser")
  );

  const [users, setUsers] = useState([]);

  async function loadUsers() {
    const data = await apiGet("/users");
    setUsers(data);
  }

  useEffect(() => {
    if (currentUser?.role === "admin") loadUsers();
  }, []);

  async function toggleBlock(u) {
    await apiPut(
      `/users/${u.id}/block`,
      { isBlocked: !u.isBlocked }
    );
    // update locally instead of re-fetching the whole user list
    setUsers((prev) =>
      prev.map((x) =>
        x.id === u.id ? { ...x, isBlocked: !u.isBlocked } : x
      )
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
        </tbody>
      </table>
    </div>
  );
}
