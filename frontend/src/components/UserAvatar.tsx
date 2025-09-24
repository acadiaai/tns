import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserAvatar: React.FC = () => {
  const { user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    // Navigate to logout route which handles the signOut process
    navigate('/logout');
  };

  if (!user) return null;

  // Debug: Log user info to see what we're getting from Firebase
  console.log('User Avatar Debug:', {
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    uid: user.uid
  });

  // Get initials from email or display name
  const getInitials = (email: string, displayName?: string | null) => {
    // If we have a display name, use that
    if (displayName) {
      const parts = displayName.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return displayName.substring(0, 2).toUpperCase();
    }

    // Otherwise, extract from email
    const emailName = email.split('@')[0];

    // Check for dots (firstname.lastname format)
    if (emailName.includes('.')) {
      const parts = emailName.split('.');
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    // Check for underscores (firstname_lastname format)
    if (emailName.includes('_')) {
      const parts = emailName.split('_');
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    // Check for dashes (firstname-lastname format)
    if (emailName.includes('-')) {
      const parts = emailName.split('-');
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    // For single word emails, take first two characters
    return emailName.substring(0, 2).toUpperCase();
  };

  const initials = user.email ? getInitials(user.email, user.displayName) : 'U';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || user.email || 'User'}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              <span>{initials}</span>
            </div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || user.email || 'User'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    <span>{initials}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.displayName || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                navigate('/profile');
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>

            <button
              onClick={() => {
                setIsDropdownOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAvatar;