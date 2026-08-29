import { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../services/api';

const ValidEmployeeIds = () => {
  const [validIds, setValidIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newEmployeeId, setNewEmployeeId] = useState('');

  // Load valid employee IDs
  useEffect(() => {
    loadValidIds();
  }, []);

  const loadValidIds = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getValidEmployeeIds();
      if (response?.success) {
        setValidIds(Array.isArray(response.valid_employee_ids) ? response.valid_employee_ids : []);
      }
    } catch (error) {
      console.error('Error loading valid employee IDs:', error);
      toast.error('Failed to load valid employee IDs');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployeeId = async (e) => {
    e.preventDefault();

    const trimmedId = newEmployeeId.trim().toUpperCase();

    if (!trimmedId) {
      toast.error('Employee ID cannot be empty');
      return;
    }

    if (trimmedId.length > 50) {
      toast.error('Employee ID must be 50 characters or less');
      return;
    }

    // Check for duplicates in current list
    if (validIds.some(id => id.employee_id === trimmedId)) {
      toast.error('Employee ID already exists');
      return;
    }

    setAdding(true);

    try {
      const response = await adminAPI.addValidEmployeeId(trimmedId);
      if (response?.success) {
        toast.success('Employee ID added successfully');
        setNewEmployeeId('');
        loadValidIds();
      } else {
        toast.error(response?.error || 'Failed to add employee ID');
      }
    } catch (error) {
      console.error('Error adding employee ID:', error);
      toast.error(error?.error || 'Failed to add employee ID');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteTarget(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setDeleting(deleteTarget);

    try {
      const response = await adminAPI.deleteValidEmployeeId(deleteTarget);
      if (response?.success) {
        toast.success('Employee ID deleted successfully');
        setShowDeleteModal(false);
        setDeleteTarget(null);
        loadValidIds();
      } else {
        toast.error(response?.error || 'Failed to delete employee ID');
      }
    } catch (error) {
      console.error('Error deleting employee ID:', error);
      toast.error('Failed to delete employee ID');
    } finally {
      setDeleting(null);
    }
  };

  const targetId = validIds.find(id => id.id === deleteTarget);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Valid Employee IDs
          </h2>
          <p className="text-sm text-gray-500">
            Manage which Employee IDs are allowed to register
          </p>
        </div>

        {/* Add Employee ID Form */}
        <form onSubmit={handleAddEmployeeId} className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newEmployeeId}
              onChange={(e) => setNewEmployeeId(e.target.value.toUpperCase())}
              placeholder="Enter Employee ID (e.g., EMP001)"
              disabled={adding}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !newEmployeeId.trim()}
            className="px-4 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {adding ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus size={16} />
                Add Employee ID
              </>
            )}
          </button>
        </form>
      </div>

      {/* Employee IDs List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : validIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <AlertTriangle size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No valid Employee IDs
            </h3>
            <p className="text-sm text-gray-500 max-w-md">
              Add Employee IDs above to control who can register for an account.
            </p>
          </div>
        ) : (
          <div className="p-6">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Added Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {validIds.map((validId) => (
                    <tr key={validId.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                            <CheckCircle size={16} className="text-violet-600" />
                          </div>
                          <span className="font-mono text-sm font-medium text-gray-900">
                            {validId.employee_id}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">
                          {new Date(validId.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteClick(validId.id)}
                          disabled={deleting === validId.id}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete Employee ID"
                        >
                          {deleting === validId.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              {validIds.length} valid Employee ID{validIds.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && targetId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Employee ID
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{targetId.employee_id}</strong> from valid Employee IDs?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting === deleteTarget}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleting === deleteTarget ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidEmployeeIds;