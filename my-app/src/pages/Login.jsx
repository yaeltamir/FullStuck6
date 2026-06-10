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

    try {

      // The SERVER validates the password (against the passwords table)
      // and whether the account is blocked. It never sends the password.
      const foundUser = await apiPost(
        "/login",
        { username, password }
      );

      localStorage.setItem(
        "currentUser",
        JSON.stringify(foundUser)
      );

      navigate(`/users/${foundUser.username}/todos`);

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