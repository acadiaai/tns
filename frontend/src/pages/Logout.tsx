import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Logout = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await signOut();
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        navigate('/login');
      }
    };

    handleLogout();
  }, [signOut, navigate]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white/60">Signing out...</p>
      </div>
    </div>
  );
};