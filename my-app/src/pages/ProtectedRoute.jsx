import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {

  const user =
    localStorage.getItem(
      "currentUser"
    );

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  try {
    JSON.parse(user);
  }
  catch {

    localStorage.removeItem(
      "currentUser"
    );

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
}