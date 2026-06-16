import { useState } from "react";

import {
  useNavigate,
  Link,
} from "react-router-dom";

import { apiPost }
from "../api/api";

export default function Login() {

  const [username,
    setUsername] =
    useState("");

  const [password,
    setPassword] =
    useState("");

  const [showPassword,
    setShowPassword] =
    useState(false);

  const [error,
    setError] =
    useState("");

  const navigate =
    useNavigate();

  async function handleLogin(e) {

    e.preventDefault();

    setError("");

    if (
      !username.trim() ||
      !password.trim()
    ) {

      setError(
        "Fill all fields"
      );

      return;
    }
    if (username.length > 30) {
      setError("Invalid login details");
      return;
    }

    if (password.length > 50) {
      setError("Invalid login details");
      return;
    }
    if (username.includes(" ")) {
      setError("Invalid login details");
      return;
    }

    try {

      // The SERVER validates the password (against the passwords table) and
      // whether the account is blocked, then returns a signed JWT + the user.
      const { token, user } = await apiPost(
        "/auth/login",
        { username, password }
      );

      localStorage.setItem("token", token);          // proves who we are
      localStorage.setItem(
        "currentUser",
        JSON.stringify(user)                          // for UI display only
      );

      navigate(`/users/${user.username}/todos`);

    } catch (err) {

      // Server message: "Invalid username or password" / "This account is blocked"
      setError(err.message);
    }
  }

  return (

    <div className="page">

      <div className="card">

        <h1>
          Login
        </h1>

        <form
          onSubmit={handleLogin}
        >

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) =>
              setUsername(
                e.target.value
              )
            }
          />

          <input
            type={
              showPassword
                ? "text"
                : "password"
            }
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                !showPassword
              )
            }
          >
            {showPassword
              ? "Hide"
              : "Show"}
          </button>

          <br />
          <br />

          <button
            type="submit"
          >
            Login
          </button>

        </form>

        {error && (

          <p className="error">
            {error}
          </p>
        )}

        <p>
          Don't have an account?
        </p>

        <Link to="/register">
          Register
        </Link>

      </div>

    </div>
  );
}