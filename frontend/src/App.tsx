import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TherapyNavigationSystem } from './components/TherapyNavigationSystem';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Logout } from './pages/Logout';
import { Admin } from './pages/Admin';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/logout" element={<Logout />} />

              {/* Admin route - requires admin permission */}
              <Route path="/admin" element={
                <ProtectedRoute requirePermission="admin">
                  <Admin />
                </ProtectedRoute>
              } />

              {/* Main app - all authenticated users */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <TherapyNavigationSystem />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;