import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/Layout";
import AdminDashboard from "./pages/AdminDashboard";
import Dashboard from "./pages/Dashboard";
import Evaluations from "./pages/Evaluations";
import Login from "./pages/Login";
import Nutrition from "./pages/Nutrition";
import Onboarding from "./pages/Onboarding";
import Progress from "./pages/Progress";
import Products from "./pages/Products";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import Training from "./pages/Training";
import WorkoutHistory from "./pages/WorkoutHistory";
import { applyStoredTheme, getStoredUser } from "./services/api";

function ProtectedRoute({ children }) {
  const user = getStoredUser();
  return user && ["admin", "trainee"].includes(user.userRole)
    ? children
    : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const user = getStoredUser();
  return user?.userRole === "admin" ? children : <Navigate to="/dashboard" replace />;
}

function App() {
  useEffect(() => {
    applyStoredTheme();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="nutrition" element={<Nutrition />} />
        <Route path="products" element={<Products />} />
        <Route path="progress" element={<Progress />} />
        <Route path="training" element={<Training />} />
        <Route path="workout-history" element={<WorkoutHistory />} />
        <Route path="evaluations" element={<Evaluations />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
