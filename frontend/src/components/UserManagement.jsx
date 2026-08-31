import { useState } from 'react';
import {
  Search,
  MoreVertical,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Briefcase,
  Shield,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const UserManagement = ({ users, onUserAction, onRefresh, currentUserId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.employee_id?.toLowerCase().includes(searchLower)
    );
  });

  const handleBlockUser = async (userId) => {
    try {
      const response = await onUserAction('block', userId);
      if (response?.success) {
        toast.success('User blocked successfully');
        setShowActionMenu(null);
        onRefresh();
      } else {
        toast.error(response?.error || 'Failed to block user');
      }
    } catch (error) {
      toast.error('Failed to block user');
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      const response = await onUserAction('unblock', userId);
      if (response?.success) {
        toast.success('User unblocked successfully');
        setShowActionMenu(null);
        onRefresh();
      } else {
        toast.error(response?.error || 'Failed to unblock user');
      }
    } catch (error) {
      toast.error('Failed to unblock user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await onUserAction('delete', selectedUser.id);
      if (response?.success) {
        toast.success('User deleted successfully');
        setShowDeleteModal(false);
        setSelectedUser(null);
        setShowActionMenu(null);
        onRefresh();
      } else {
        toast.error(response?.error || 'Failed to delete user');
      }
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      const response = await onUserAction('changeRole', selectedUser.id, { role: selectedRole });
      if (response?.success) {
        toast.success('User role changed successfully');
        setShowRoleModal(false);
        setSelectedUser(null);
        setSelectedRole('');
        setShowActionMenu(null);
        onRefresh();
      } else {
        toast.error(response?.error || 'Failed to change user role');
      }
    } catch (error) {
      toast.error('Failed to change user role');
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { bg: 'bg-purple-100 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-400', label: 'Admin' },
      hr: { bg: 'bg-blue-100 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', label: 'HR' },
      employee: { bg: 'bg-green-100 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400', label: 'Employee' },
    };

    const config = roleConfig[role] || roleConfig.employee;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (isBlocked) => {
    if (isBlocked) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-danger-light text-danger">
          <XCircle size={12} />
          Blocked
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-success-light text-success">
        <CheckCircle size={12} />
        Active
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-5 border-b border-default">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={18} />
          <input
            type="text"
            placeholder="Search users by name, email, or employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent bg-input text-primary"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-surface-secondary sticky top-0">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-tertiary uppercase tracking-wider">
                User
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-tertiary uppercase tracking-wider">
                Employee ID
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-tertiary uppercase tracking-wider">
                Role
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-tertiary uppercase tracking-wider">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-tertiary uppercase tracking-wider">
                Department
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-tertiary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-light">
            {!users || users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-secondary">
                  No users found
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-secondary">
                  No users match your search
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-hover">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-inverse font-semibold">
                        {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-primary">{user.name}</p>
                        <p className="text-sm text-secondary">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className="text-tertiary" />
                      <span className="text-sm text-primary">{user.employee_id || '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-5 py-4">
                    {getStatusBadge(user.is_blocked)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-primary">{user.department || '—'}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="relative">
                      <button
                        onClick={() => setShowActionMenu(showActionMenu === user.id ? null : user.id)}
                        className="p-2 hover:bg-hover rounded-lg transition-colors"
                      >
                        <MoreVertical size={18} className="text-tertiary" />
                      </button>

                      {showActionMenu === user.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-surface rounded-lg shadow-lg border border-default py-1 z-10">
                          {user.is_blocked ? (
                            <button
                              onClick={() => handleUnblockUser(user.id)}
                              disabled={user.id === currentUserId}
                              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                user.id === currentUserId
                                  ? 'text-muted cursor-not-allowed'
                                  : 'text-success hover:bg-success-light'
                              }`}
                              title={user.id === currentUserId ? 'You cannot unblock yourself' : ''}
                            >
                              <CheckCircle size={16} />
                              Unblock User
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBlockUser(user.id)}
                              disabled={user.id === currentUserId}
                              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                user.id === currentUserId
                                  ? 'text-muted cursor-not-allowed'
                                  : 'text-danger hover:bg-danger-light'
                              }`}
                              title={user.id === currentUserId ? 'You cannot block yourself' : ''}
                            >
                              <Ban size={16} />
                              Block User
                            </button>
                          )}
                          <div className="border-t border-light my-1" />
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setSelectedRole(user.role);
                              setShowRoleModal(true);
                            }}
                            disabled={user.id === currentUserId}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                              user.id === currentUserId
                                ? 'text-muted cursor-not-allowed'
                                : 'text-info hover:bg-info-light'
                            }`}
                            title={user.id === currentUserId ? 'You cannot change your own role' : ''}
                          >
                            <Shield size={16} />
                            Change Role
                          </button>
                          <div className="border-t border-light my-1" />
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteModal(true);
                            }}
                            disabled={user.id === currentUserId}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                              user.id === currentUserId
                                ? 'text-muted cursor-not-allowed'
                                : 'text-danger hover:bg-danger-light'
                            }`}
                            title={user.id === currentUserId ? 'You cannot delete yourself' : ''}
                          >
                            <Trash2 size={16} />
                            Delete User
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-danger-light flex items-center justify-center">
                <AlertTriangle size={20} className="text-danger" />
              </div>
              <h3 className="text-lg font-semibold text-primary">Delete User</h3>
            </div>
            <p className="text-secondary mb-2">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="bg-surface-tertiary rounded-lg p-4 mb-6">
              <p className="font-medium text-primary">{selectedUser.name}</p>
              <p className="text-sm text-secondary">{selectedUser.email}</p>
              {selectedUser.employee_id && (
                <p className="text-sm text-secondary">Employee ID: {selectedUser.employee_id}</p>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 text-primary hover:bg-hover rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-danger text-inverse hover:bg-danger/90 rounded-lg transition-colors"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-info-light flex items-center justify-center">
                <Shield size={20} className="text-info" />
              </div>
              <h3 className="text-lg font-semibold text-primary">Change User Role</h3>
            </div>
            <p className="text-secondary mb-4">
              Select the new role for this user:
            </p>
            <div className="bg-surface-tertiary rounded-lg p-4 mb-6">
              <p className="font-medium text-primary">{selectedUser.name}</p>
              <p className="text-sm text-secondary">{selectedUser.email}</p>
              {selectedUser.employee_id && (
                <p className="text-sm text-secondary">Employee ID: {selectedUser.employee_id}</p>
              )}
            </div>
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-3 border border-default rounded-lg cursor-pointer hover:bg-hover transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="employee"
                  checked={selectedRole === 'employee'}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-4 h-4 text-accent-primary"
                />
                <div>
                  <p className="font-medium text-primary">Employee</p>
                  <p className="text-xs text-tertiary">Standard employee access</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-default rounded-lg cursor-pointer hover:bg-hover transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="hr"
                  checked={selectedRole === 'hr'}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-4 h-4 text-accent-primary"
                />
                <div>
                  <p className="font-medium text-primary">HR</p>
                  <p className="text-xs text-tertiary">HR management access</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-default rounded-lg cursor-pointer hover:bg-hover transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={selectedRole === 'admin'}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-4 h-4 text-accent-primary"
                />
                <div>
                  <p className="font-medium text-primary">Admin</p>
                  <p className="text-xs text-tertiary">Full administrative access</p>
                </div>
              </label>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                  setSelectedRole('');
                }}
                className="px-4 py-2 text-primary hover:bg-hover rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeRole}
                className="px-4 py-2 bg-accent-primary text-inverse hover:bg-accent-primary-hover rounded-lg transition-colors"
              >
                Change Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;