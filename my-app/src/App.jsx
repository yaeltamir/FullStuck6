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
import Admin from "./pages/Admin";
import ProtectedRoute from "./pages/ProtectedRoute";

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

      {/* App pages – informative internal URLs: /users/:username/... */}
      <Route
        path="/users/:username"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="info" replace />} />
        <Route path="info" element={<></>} />
        <Route path="todos" element={<Todos />} />
        <Route path="posts" element={<Posts />} />
        <Route path="albums" element={<Albums />} />
        <Route path="admin" element={<Admin />} />
      </Route>

      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />

    </Routes>
  );
}
