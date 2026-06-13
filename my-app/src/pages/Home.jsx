import {
  Outlet,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  useEffect,
  useState,
} from "react";

import Modal from "../pages/Modal";

import {
  apiGet,
  apiPut,
} from "../api/api";

export default function Home() {

  const [user, setUser] =
    useState(null);

  const navigate =
    useNavigate();

  const location =
    useLocation();

  // ======================
  // PROFILE MODAL
  // ======================

  const [showProfileModal,
    setShowProfileModal] =
    useState(false);

  const [name,
    setName] =
    useState("");

  const [email,
    setEmail] =
    useState("");

  const [phone,
    setPhone] =
    useState("");

  // ======================
  // CHANGE PASSWORD MODAL
  // ======================

  const [showPasswordModal,
    setShowPasswordModal] =
    useState(false);

  const [currentPassword,
    setCurrentPassword] =
    useState("");

  const [newPassword,
    setNewPassword] =
    useState("");

  const [passwordMsg,
    setPasswordMsg] =
    useState("");

  useEffect(() => {

    const savedUser =
      localStorage.getItem(
        "currentUser"
      );

    if (!savedUser) {

      navigate("/login", {
        replace: true,
      });

      return;
    }

    setUser(
      JSON.parse(savedUser)
    );

  }, [navigate]);

  // ======================
  // LOGOUT
  // ======================

  function logout() {

    localStorage.removeItem(
      "currentUser"
    );

    navigate("/login", {
      replace: true,
    });
  }

  // ======================
  // OPEN EDIT MODAL
  // ======================

  function editUser() {

    setName(user.name);

    setEmail(user.email);

    setPhone(user.phone);

    setShowProfileModal(true);
  }

  // ======================
  // SAVE PROFILE
  // ======================

async function saveProfile() {

  if (
    !name.trim() ||
    !email.trim()
  ) {
    return;
  }

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    !emailRegex.test(email)
  ) {
    alert("Invalid details");
    return;
  }

  if (
    name.length > 50 ||
    email.length > 100 ||
    phone.length > 20
  ) {
    alert("Invalid details");
    return;
  }

  const updatedFields = {};

  if (name.trim() !== user.name) {
    updatedFields.name = name.trim();
  }

  if (email.trim() !== user.email) {
    updatedFields.email = email.trim();
  }

  if (phone.trim() !== user.phone) {
    updatedFields.phone = phone.trim();
  }

  if (Object.keys(updatedFields).length === 0) {
    setShowProfileModal(false);
    return;
  }

  await apiPut(
    `/users/${user.id}`,
    updatedFields
  );

  const updatedUser = {
    ...user,
    ...updatedFields,
  };

  setUser(updatedUser);

  localStorage.setItem(
    "currentUser",
    JSON.stringify(updatedUser)
  );

  setShowProfileModal(false);
}

  // ======================
  // CHANGE PASSWORD
  // ======================

  async function changePassword() {

    setPasswordMsg("");

    if (
      !currentPassword.trim() ||
      !newPassword.trim()
    ) {
      setPasswordMsg("Fill both fields");
      return;
    }
    if (newPassword.length < 4) {
      setPasswordMsg(
        "Password must contain at least 4 characters"
      );
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordMsg(
        "New password must be different"
      );
      return;
    }

    try {

      await apiPut(
        `/users/${user.id}/password`,
        { currentPassword, newPassword }
      );

      setPasswordMsg("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");

    } catch (err) {
      // server message, e.g. "Current password is incorrect"
      setPasswordMsg(err.message);
    }
  }

  if (!user) return null;

  return (

    <div className="layout">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <h2>
          Dashboard
        </h2>

        <Link
          to={`/users/${user.username}/info`}
          className={
            location.pathname.endsWith("/info")
              ? "active-link"
              : ""
          }
        >
          Info
        </Link>

        <Link
          to={`/users/${user.username}/todos`}
          className={
            location.pathname.endsWith("/todos")
              ? "active-link"
              : ""
          }
        >
          Todos
        </Link>

        <Link
          to={`/users/${user.username}/posts`}
          className={
            location.pathname.endsWith("/posts")
              ? "active-link"
              : ""
          }
        >
          Posts
        </Link>

        {user.role === "admin" && (
          <Link
            to={`/users/${user.username}/admin`}
            className={
              location.pathname.endsWith("/admin")
                ? "active-link"
                : ""
            }
          >
            Admin
          </Link>
        )}

       <button
          className="btn-danger logout-btn"
          onClick={logout}
        >
          Logout
       </button>

      </aside>

      {/* MAIN */}

      <main className="content">

        <h1>
          Welcome {user.name}
        </h1>

        {location.pathname.endsWith(
          "/info") && (

          <>

            <h2>
              Welcome to your dashboard
            </h2>

            <div className="card">


              <h2>
                User Info
              </h2>

              <p>
                <b>Name:</b>
                {" "}
                {user.name}
              </p>

              <p>
                <b>Email:</b>
                {" "}
                {user.email}
              </p>

              <p>
                <b>Phone:</b>
                {" "}
                {user.phone}
              </p>

              <p>
                <b>Username:</b>
                {" "}
                {user.username}
              </p>

              <button
                onClick={editUser}
              >
                Edit Profile
              </button>

              <button
                onClick={() => {
                  setPasswordMsg("");
                  setCurrentPassword("");
                  setNewPassword("");
                  setShowPasswordModal(true);
                }}
              >
                Change Password
              </button>

            </div>
          </>
        )}

        <Outlet />

      </main>

      {/* ====================== */}
      {/* PROFILE MODAL */}
      {/* ====================== */}

      <Modal
        isOpen={
          showProfileModal
        }
        onClose={() =>
          setShowProfileModal(
            false
          )
        }
      >

        <h2>
          Edit Profile
        </h2>

        <input
          value={name}
          onChange={(e) =>
            setName(
              e.target.value
            )
          }
          placeholder="Name"
        />

        <br />
        <br />

        <input
          value={email}
          onChange={(e) =>
            setEmail(
              e.target.value
            )
          }
          placeholder="Email"
        />

        <br />
        <br />

        <input
          value={phone}
          onChange={(e) =>
            setPhone(
              e.target.value
            )
          }
          placeholder="Phone"
        />

        <br />
        <br />

        <button
          onClick={saveProfile}
        >
          Save
        </button>

      </Modal>

      {/* ====================== */}
      {/* CHANGE PASSWORD MODAL */}
      {/* ====================== */}

      <Modal
        isOpen={showPasswordModal}
        onClose={() =>
          setShowPasswordModal(false)
        }
      >

        <h2>
          Change Password
        </h2>

        <input
          type="password"
          value={currentPassword}
          onChange={(e) =>
            setCurrentPassword(e.target.value)
          }
          placeholder="Current password"
        />

        <br />
        <br />

        <input
          type="password"
          value={newPassword}
          onChange={(e) =>
            setNewPassword(e.target.value)
          }
          placeholder="New password"
        />

        <br />
        <br />

        {passwordMsg && (
          <p>{passwordMsg}</p>
        )}

        <button
          onClick={changePassword}
        >
          Save
        </button>

      </Modal>

    </div>
  );
}