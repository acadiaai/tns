import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

interface AllowedUser {
  email: string;
  role: 'admin' | 'therapist' | 'client' | 'viewer';
  permissions: string[];
  createdAt: Date;
  createdBy?: string;
  isActive: boolean;
}

export const Admin: React.FC = () => {
  const { user, checkAccess } = useAuth();
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<AllowedUser['role']>('viewer');
  const [addingUser, setAddingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if user has admin access
  const isAdmin = checkAccess('admin') || checkAccess('manage_users');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!db) return;

    setLoading(true);
    try {
      const q = query(collection(db, 'allowed_users'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const usersList: AllowedUser[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersList.push({
          email: doc.id,
          role: data.role || 'viewer',
          permissions: data.permissions || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          isActive: data.isActive !== false
        });
      });

      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const addUser = async () => {
    if (!db || !newEmail) return;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setAddingUser(true);
    setError(null);
    setSuccess(null);

    try {
      // Define permissions based on role
      const rolePermissions = {
        admin: ['admin', 'manage_users', 'view', 'create', 'edit', 'delete'],
        therapist: ['view', 'create', 'edit'],
        client: ['view', 'create'],
        viewer: ['view']
      };

      await setDoc(doc(db, 'allowed_users', newEmail), {
        email: newEmail,
        role: newRole,
        permissions: rolePermissions[newRole],
        createdAt: Timestamp.now(),
        createdBy: user?.email,
        isActive: true
      });

      setSuccess(`Successfully added ${newEmail} as ${newRole}`);
      setNewEmail('');
      setNewRole('viewer');
      await loadUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      setError('Failed to add user');
    } finally {
      setAddingUser(false);
    }
  };

  const toggleUserStatus = async (email: string, currentStatus: boolean) => {
    if (!db) return;

    try {
      await setDoc(doc(db, 'allowed_users', email), {
        isActive: !currentStatus
      }, { merge: true });

      setSuccess(`User ${email} ${!currentStatus ? 'activated' : 'deactivated'}`);
      await loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      setError('Failed to update user status');
    }
  };

  const deleteUser = async (email: string) => {
    if (!db) return;

    if (!confirm(`Are you sure you want to remove ${email}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'allowed_users', email));
      setSuccess(`Successfully removed ${email}`);
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Admin Access Required</h2>
          <p className="text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            User Management
          </h1>
          <p className="text-gray-400">Manage authorized users and their permissions</p>
        </div>

        {/* Alerts */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3"
          >
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-green-400">{success}</p>
          </motion.div>
        )}

        {/* Add User Form */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add New User
          </h2>

          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              placeholder="user@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />

            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as AllowedUser['role'])}
              className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="viewer">Viewer</option>
              <option value="client">Client</option>
              <option value="therapist">Therapist</option>
              <option value="admin">Admin</option>
            </select>

            <button
              onClick={addUser}
              disabled={addingUser || !newEmail}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {addingUser ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Add User
                </>
              )}
            </button>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Authorized Users</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No users added yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Added
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {users.map((allowedUser) => (
                    <tr key={allowedUser.email} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-white">{allowedUser.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          allowedUser.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                          allowedUser.role === 'therapist' ? 'bg-blue-500/20 text-blue-400' :
                          allowedUser.role === 'client' ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {allowedUser.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {allowedUser.isActive ? (
                          <span className="flex items-center gap-1 text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400">
                            <XCircle className="w-4 h-4" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <Calendar className="w-4 h-4" />
                          {allowedUser.createdAt.toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleUserStatus(allowedUser.email, allowedUser.isActive)}
                            className="p-1 text-yellow-400 hover:bg-yellow-400/10 rounded"
                            title={allowedUser.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {allowedUser.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => deleteUser(allowedUser.email)}
                            className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;