import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Brain, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export const Login: React.FC = () => {
  const { signInWithGoogle, isAuthenticated, isAuthorized, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Get the redirect path from location state or default to dashboard
  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    // If already authenticated and authorized, redirect
    if (isAuthenticated && isAuthorized) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isAuthorized, navigate, from]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      // AuthContext will handle the redirect
    } catch (error) {
      console.error('Sign in error:', error);
      // Error is handled by AuthContext
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-md rounded-full mb-4">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Therapy Navigation System
            </h1>
            <p className="text-white/80 text-sm">
              AI-Powered Brainspotting Platform
            </p>
          </div>

          {/* Login Form */}
          <div className="p-8">
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-400">{error}</p>
                  {error.includes('not authorized') && (
                    <p className="text-xs text-gray-400 mt-2">
                      Please contact your administrator to request access.
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn || loading}
              className={`
                w-full flex items-center justify-center gap-3 px-6 py-3
                bg-white text-gray-900 rounded-lg font-medium
                hover:bg-gray-100 active:bg-gray-200
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200 transform hover:scale-[1.02]
              `}
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>

            {/* Info Text */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-400">
                Secure authentication powered by Firebase
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Only authorized accounts can access this system
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-white/5 backdrop-blur-sm border-t border-white/10">
            <p className="text-xs text-center text-gray-500">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            Need access? Contact your administrator
          </p>
          <a
            href="mailto:support@therapy-nav.com"
            className="text-sm text-blue-400 hover:text-blue-300 mt-2 inline-block"
          >
            support@therapy-nav.com
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;