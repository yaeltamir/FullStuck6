import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Todos from "./pages/Todos";
import Posts from "./pages/Posts";
import Albums from "./pages/Albums";
import ProtectedRoute from "./pages/ProtectedRoute";
// import Info from "./pages/Info";

export default function App() {

  return (
    <Routes>

      <Route
        path="/"
        element={<Navigate to="/login" />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      >
{/* 
        <Route
          index
          element={
            <h2>
              Welcome to your dashboard
            </h2>
          }
        /> */}

      </Route>

      <Route
        path="/todos"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      >
        <Route index element={<Todos />} />
      </Route>

      <Route
        path="/posts"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      >
        <Route index element={<Posts />} />
      </Route>

      <Route
        path="/albums"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      >
        <Route index element={<Albums />} />
      </Route>

    </Routes>
  );
}