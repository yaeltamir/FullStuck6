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

    const serverUsers =
      await apiGet("/users");

    const exists =
      serverUsers.some(
        (u) =>
          u.username
            .toLowerCase() ===
          username.toLowerCase()
      );

    if (exists) {

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

    if (
      !email.includes("@")
    ) {

      setError(
        "Invalid email"
      );

      return;
    }

    const newUser = {

      id: Date.now(),

      username,

      password,

      website: password,

      name,

      email,

      phone,

      address: {
        street: "",
        city: "",
      },

      company: {
        name: "",
      },
    };

    const savedUser =
      await apiPost(
        "/users",
        newUser
      );

    localStorage.setItem(
      "currentUser",
      JSON.stringify(savedUser)
    );

    navigate("/home");
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