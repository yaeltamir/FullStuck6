import { useState } from "react";

import {
  useNavigate,
  Link,
} from "react-router-dom";

import {
  apiGet,
  apiPost,
} from "../api/api";

export default function Register() {

  const [step, setStep] =
    useState(1);

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [verify, setVerify] =
    useState("");

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [error, setError] =
    useState("");

  const navigate =
    useNavigate();

  async function checkBasicDetails(e) {

    e.preventDefault();

    setError("");

    if (
      !username.trim() ||
      !password.trim() ||
      !verify.trim()
    ) {
      setError(
        "Fill all fields"
      );

      return;
    }

    if (password.length < 4) {

      setError(
        "Password too short"
      );

      return;
    }

    if (password !== verify) {

      setError(
        "Passwords do not match"
      );

      return;
    }

    // No need to download all users — the server checks for a duplicate
    // username when we submit (step 2). Here we only validate locally.
    const usernameRegex = /^[a-zA-Z0-9_]+$/;

    if (!usernameRegex.test(username)) {
      setError("Username may contain only letters, numbers and _");
      return;
    }
    const result =
      await apiGet(
        `/users/check-username/${username}`
      );

    if (result.exists) {

      setError(
        "Username already exists"
      );

      return;
    }
    setStep(2);
  }

  async function finishRegister(e) {

    e.preventDefault();

    setError("");

    if (
      !name.trim() ||
      !email.trim()
    ) {

      setError(
        "Name and email required"
      );

      return;
    }

    // if (
    //   !email.includes("@")
    // ) {

    //   setError(
    //     "Invalid email"
    //   );

    //   return;
    // }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setError("Invalid email");
      return;
    }
    if (name.length > 50) {
      setError("Name too long");
      return;
    }

    if (phone.length > 20) {
      setError("Phone too long");
      return;
    }

    try {

      // Server creates the user + password and checks for duplicates.
      // website is left empty so the password is never stored in a visible field.
      const savedUser = await apiPost("/register", {
        username,
        password,
        name,
        email,
        phone,
        website: "",
      });

      localStorage.setItem(
        "currentUser",
        JSON.stringify(savedUser)
      );

      navigate(`/users/${savedUser.username}/todos`);

    } catch (err) {
      // e.g. "Username already exists" — go back to step 1 to change it.
      setError(err.message);
      setStep(1);
    }
  }

  return (

    <div className="page">

      <div className="card">

        <h1>
          Register
        </h1>

        {step === 1 && (

          <form
            onSubmit={
              checkBasicDetails
            }
          >

            <input
              placeholder="Username"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value
                )
              }
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
            />

            <input
              type="password"
              placeholder="Verify Password"
              value={verify}
              onChange={(e) =>
                setVerify(
                  e.target.value
                )
              }
            />

            <button
              type="submit"
            >
              Continue
            </button>

          </form>
        )}

        {step === 2 && (

          <form
            onSubmit={
              finishRegister
            }
          >

            <h2>
              Complete Profile
            </h2>

            <input
              placeholder="Full Name"
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
            />

            <input
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
            />

            <input
              placeholder="Phone"
              value={phone}
              onChange={(e) =>
                setPhone(
                  e.target.value
                )
              }
            />

            <button
              type="submit"
            >
              Register
            </button>

          </form>
        )}

        {error && (

          <p
            style={{
              color: "red",
            }}
          >
            {error}
          </p>
        )}

        <br />

        <Link to="/login">
          Back to Login
        </Link>

      </div>

    </div>
  );
}