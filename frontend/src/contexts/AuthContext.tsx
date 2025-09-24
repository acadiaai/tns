import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { initializeApiClient } from '../api/client';

interface UserPermissions {
  email: string;
  role: 'admin' | 'therapist' | 'client' | 'viewer';
  permissions: string[];
  createdAt: Date;
  createdBy?: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  userPermissions: UserPermissions | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkAccess: (permission?: string) => boolean;
  isAuthenticated: boolean;
  isAuthorized: boolean;
  idToken: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userPermissions: null,
  loading: true,
  error: null,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signOut: async () => {},
  checkAccess: () => false,
  isAuthenticated: false,
  isAuthorized: false,
  idToken: null
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// WHITELIST: Only these emails can access the system
const ALLOWED_EMAILS = [
  'qshi@bangor-bsp.com', // Primary user
  'root@acadia.sh',
  'demo@acadia.sh',
  'test@acadia.sh',
  // Add more authorized emails here as needed
];

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

  // Check if user is in the allowed users list
  const checkUserAccess = async (user: User): Promise<UserPermissions | null> => {
    // GATED ACCESS: Only whitelisted emails can access the system
    if (!user.email) {
      console.warn('No email found for user');
      return null;
    }

    // Check if email is in whitelist
    if (!ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
      console.warn(`Access denied for email: ${user.email}`);
      return null;
    }

    // Grant access to whitelisted users
    console.log(`Access granted for whitelisted email: ${user.email}`);
    return {
      email: user.email,
      role: 'therapist',
      permissions: ['view', 'edit', 'create'],
      createdAt: new Date(),
      isActive: true
    };
  };

  // Get ID token for backend authentication
  const refreshIdToken = async (user: User) => {
    try {
      const token = await user.getIdToken();
      setIdToken(token);

      // Store token in sessionStorage for API calls
      sessionStorage.setItem('firebase_token', token);

      // Initialize API client with the token
      initializeApiClient(token);

      // Refresh token before it expires (tokens expire after 1 hour)
      setTimeout(() => {
        if (auth?.currentUser) {
          refreshIdToken(auth.currentUser);
        }
      }, 55 * 60 * 1000); // Refresh after 55 minutes
    } catch (error) {
      console.error('Error getting ID token:', error);
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      setError('Authentication service not available');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError(null);

      if (firebaseUser) {
        setUser(firebaseUser);

        // Get fresh ID token
        await refreshIdToken(firebaseUser);

        // Check if user has access
        const permissions = await checkUserAccess(firebaseUser);

        if (permissions) {
          setUserPermissions(permissions);

          // Skip auth logging for POC to avoid Firestore costs
          console.log('User authenticated:', firebaseUser.email);
        } else {
          setError('Access denied. Your account is not authorized to use this application.');
          setUserPermissions(null);

          // Sign out unauthorized user
          if (auth) {
            await firebaseSignOut(auth);
          }
        }
      } else {
        setUser(null);
        setUserPermissions(null);
        setIdToken(null);
        sessionStorage.removeItem('firebase_token');
        // Clear API client token
        initializeApiClient(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) {
      throw new Error('Authentication service not available');
    }

    setError(null);
    setLoading(true);

    try {
      await signInWithPopup(auth, googleProvider);
      // Auth state listener will handle the rest
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      setError(error.message || 'Failed to sign in with Google');
      setLoading(false);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Authentication service not available');
    }

    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auth state listener will handle the rest
    } catch (error: any) {
      console.error('Email sign-in error:', error);
      setError(error.message || 'Failed to sign in');
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    if (!auth) return;

    setLoading(true);

    try {
      // Skip logout logging for POC
      console.log('User signing out:', user?.email);

      await firebaseSignOut(auth);
      setUser(null);
      setUserPermissions(null);
      setIdToken(null);
      sessionStorage.removeItem('firebase_token');
      // Clear API client token
      initializeApiClient(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(error.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = (permission?: string): boolean => {
    if (!userPermissions) return false;
    if (!permission) return true; // Just checking if user is authorized

    // Admins have all permissions
    if (userPermissions.role === 'admin') return true;

    // Check specific permission
    return userPermissions.permissions.includes(permission);
  };

  const value: AuthContextType = {
    user,
    userPermissions,
    loading,
    error,
    signInWithGoogle,
    signInWithEmail,
    signOut,
    checkAccess,
    isAuthenticated: !!user,
    isAuthorized: !!userPermissions,
    idToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;