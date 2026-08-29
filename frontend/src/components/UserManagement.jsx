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
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const UserManagement = ({ users, onUserAction, onRefresh, currentUserId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Admin' },
      hr: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'HR' },
      employee: { bg: 'bg-green-100', text: 'text-green-700', label: 'Employee' },
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
        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle size={12} />
          Blocked
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle size={12} />
        Active
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-5 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search users by name, email, or employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Employee ID
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!users || users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                  No users match your search
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                        {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-700">{user.employee_id || '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-5 py-4">
                    {getStatusBadge(user.is_blocked)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-700">{user.department || '—'}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="relative">
                      <button
                        onClick={() => setShowActionMenu(showActionMenu === user.id ? null : user.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical size={18} className="text-gray-500" />
                      </button>

                      {showActionMenu === user.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          {user.is_blocked ? (
                            <button
                              onClick={() => handleUnblockUser(user.id)}
                              disabled={user.id === currentUserId}
                              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                user.id === currentUserId
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-green-600 hover:bg-green-50'
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
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-red-600 hover:bg-red-50'
                              }`}
                              title={user.id === currentUserId ? 'You cannot block yourself' : ''}
                            >
                              <Ban size={16} />
                              Block User
                            </button>
                          )}
                          <div className="border-t border-gray-200 my-1" />
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteModal(true);
                            }}
                            disabled={user.id === currentUserId}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                              user.id === currentUserId
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-red-600 hover:bg-red-50'
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete User</h3>
            </div>
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="font-medium text-gray-900">{selectedUser.name}</p>
              <p className="text-sm text-gray-500">{selectedUser.email}</p>
              {selectedUser.employee_id && (
                <p className="text-sm text-gray-500">Employee ID: {selectedUser.employee_id}</p>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;