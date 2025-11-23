// App.jsx
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loadUser } from './redux/slices/authSlice';

import Login from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import UserDashboard from './pages/UserDashboard';
import NotAuthorized from './pages/NotAuthorized';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  
  // 🔥 FIX: Check authentication state properly
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

const App = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  return (
    <Router>
      <Routes>
        {/* 🔥 FIX: Redirect authenticated users away from login */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? 
              <Navigate to={`/${user?.role || 'login'}`} replace /> : 
              <Navigate to="/login" replace />
          } 
        />
        
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
              <Navigate to={`/${user?.role || 'login'}`} replace /> : 
              <Login />
          } 
        />

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/manager/*"
          element={
            <ProtectedRoute allowedRoles={['manager']}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/user/*"
          element={
            <ProtectedRoute allowedRoles={['user']}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/unauthorized" element={<NotAuthorized />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;