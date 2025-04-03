import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './App.css';
import { LoginForm } from './components/login-form';
import { RegisterForm } from './components/register-form';
import DashboardPage from './pages/dashboard';
import LandingPage from './pages/landing';
import MyMapsPage from './pages/my-maps';
import PublicMapsPage from './pages/public-maps';
import { AuthProvider, useAuth } from './contexts/auth-context';
import ProfilePage from './pages/profile';
import SettingsPage from './pages/settings';

// Protected route component that redirects to login if user is not authenticated
function ProtectedRoute() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      
      <Route path="/login" element={
        user ? <Navigate to="/dashboard" replace /> : (
          <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
              <LoginForm />
            </div>
          </div>
        )
      } />
      
      <Route path="/register" element={
        user ? <Navigate to="/dashboard" replace /> : (
          <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
              <RegisterForm />
            </div>
          </div>
        )
      } />
      
      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/maps" element={<MyMapsPage />} />
        <Route path="/library" element={<PublicMapsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {/* Add more protected routes here */}
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
