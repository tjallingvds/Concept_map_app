import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './App.css';
import { RegisterForm } from './components/register-form';
import { LoginForm } from './components/login-form';
import DashboardPage from './pages/dashboard';
import LandingPage from './pages/landing';
import MyMapsPage from './pages/my-maps';
import PublicMapsPage from './pages/public-maps';
import ProfilePage from './pages/profile';
import SettingsPage from './pages/settings';
import EditorPage from './pages/editor';
import SharedMapPage from './pages/shared-map';
import EditorNotesPage from './pages/editor-notes';
import NotesPage from './pages/notes';


import { useAuth } from './contexts/auth-context';


function ProtectedRoute() {
    const { user, loading, login } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user) {
        login();
        return null;
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
        <Route path="/editor/:id" element={<EditorPage />} />
        <Route path="/shared/:shareId" element={<SharedMapPage />} />
        
        {/* Notes routes */}
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/notes/edit" element={<EditorNotesPage />} />
        <Route path="/notes/edit/:id" element={<EditorNotesPage />} />
        
        {/* Keep for backward compatibility but redirect to the new paths */}
        <Route path="/editor-notes" element={<Navigate to="/notes/edit" replace />} />
        <Route path="/editor-notes/:id" element={<Navigate to="/notes/edit/:id" replace />} />
        
        {/* Add more protected routes here */}
      </Route>
    </Routes>
  );

}

function App() {

    return (
        <Router>
            <AppRoutes />
        </Router>
    );
}

export default App;
