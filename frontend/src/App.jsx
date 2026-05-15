import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Verify from './pages/Verify';
import AdminDashboard from './pages/AdminDashboard';
import MemberDashboard from './pages/MemberDashboard';

function PrivateRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'Admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/member" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<Verify />} />
      <Route
        path="/admin/*"
        element={
          <PrivateRoute role="Admin">
            <AdminDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/member"
        element={
          <PrivateRoute role="Member">
            <MemberDashboard />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
