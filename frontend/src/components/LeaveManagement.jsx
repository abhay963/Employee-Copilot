import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  History,
  AlertCircle,
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  User,
  Briefcase,
  Eye,
  MoreVertical,
  ChevronDown,
  Upload,
  Download,
  X
} from 'lucide-react';
import { leaveAPI } from '../services/api';

const LeaveManagement = ({ isHR, isAdmin }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [balance, setBalance] = useState(null);
  const [requests, setRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    loadData();
  }, [isHR, isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (isHR || isAdmin) {
        const [pendingData, allData] = await Promise.all([
          leaveAPI.getPendingRequests(),
          leaveAPI.getAllRequests()
        ]);
        
        if (pendingData.success) setPendingRequests(pendingData.leaveRequests);
        if (allData.success) setRequests(allData.leaveRequests);
      } else {
        const [balanceData, requestsData, historyData] = await Promise.all([
          leaveAPI.getBalance(),
          leaveAPI.getMyRequests(),
          leaveAPI.getHistory()
        ]);
        
        if (balanceData.success) setBalance(balanceData.balance);
        if (requestsData.success) setRequests(requestsData.leaveRequests);
        if (historyData.success) setHistory(historyData.history);
      }
    } catch (err) {
      console.error('Error loading leave data:', err);
      setError('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await leaveAPI.createRequest(formData);
      if (response.success) {
        if (response.calendarConflicts && response.calendarConflicts.length > 0) {
          const conflictDetails = response.calendarConflicts
            .map(c => `${new Date(c.start).toLocaleString()} - ${new Date(c.end).toLocaleString()}`)
            .join('\n');
          setError(`Leave request submitted, but you have calendar conflicts:\n${conflictDetails}\n\nPlease consider rescheduling or contact your manager.`);
        } else {
          setSuccess('Leave request submitted successfully');
        }
        setShowRequestForm(false);
        setFormData({ leave_type: 'annual', start_date: '', end_date: '', reason: '' });
        loadData();
      }
    } catch (err) {
      setError(err.error || 'Failed to create leave request');
    }
  };

  const handleApprove = async (id) => {
    try {
      const response = await leaveAPI.approveRequest(id, { review_comment: 'Approved' });
      if (response.success) {
        setSuccess('Leave request approved');
        setShowApproveModal(false);
        loadData();
      }
    } catch (err) {
      setError(err.error || 'Failed to approve leave request');
    }
  };

  const handleReject = async (id) => {
    try {
      const response = await leaveAPI.rejectRequest(id, { review_comment: 'Rejected' });
      if (response.success) {
        setSuccess('Leave request rejected');
        setShowRejectModal(false);
        loadData();
      }
    } catch (err) {
      setError(err.error || 'Failed to reject leave request');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
      rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
      cancelled: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
    };
    const icons = {
      pending: <Clock size={12} />,
      approved: <CheckCircle size={12} />,
      rejected: <XCircle size={12} />,
      cancelled: <XCircle size={12} />
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.pending}`}>
        {icons[status] || icons.pending}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getLeaveTypeLabel = (type) => {
    const labels = {
      annual: 'Annual Leave',
      sick: 'Sick Leave',
      personal: 'Personal Leave'
    };
    return labels[type] || type;
  };

  const getLeaveTypeColor = (type) => {
    const colors = {
      annual: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
      sick: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400',
      personal: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400'
    };
    return colors[type] || colors.annual;
  };

  const getStats = () => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      totalDays: requests.reduce((acc, r) => acc + (r.number_of_days || 0), 0)
    };
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user_employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesType = leaveTypeFilter === 'all' || request.leave_type === leaveTypeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }).sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = new Date(a.created_at) - new Date(b.created_at);
    } else if (sortBy === 'name') {
      comparison = (a.user_name || '').localeCompare(b.user_name || '');
    } else if (sortBy === 'days') {
      comparison = (a.number_of_days || 0) - (b.number_of_days || 0);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-surface rounded-2xl p-6 shadow-sm border border-default hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-secondary mb-1">{title}</p>
          <p className="text-3xl font-bold text-primary">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon size={24} className="text-inverse" />
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-light border-t-accent-primary rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-danger-light border border-danger rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger">{error}</p>
            <button
              onClick={() => setError('')}
              className="ml-auto text-danger/70 hover:text-danger"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-success-light border border-success rounded-xl flex items-start gap-3"
          >
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <p className="text-sm text-success">{success}</p>
            <button
              onClick={() => setSuccess('')}
              className="ml-auto text-success/70 hover:text-success"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Employee View */}
      {!isHR && !isAdmin && (
        <>
          {/* Leave Balance Cards */}
          {balance && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="Annual Leave"
                value={balance.annual_leave}
                icon={Calendar}
                color="bg-gradient-to-br from-blue-500 to-blue-600"
              />
              <StatCard
                title="Sick Leave"
                value={balance.sick_leave}
                icon={Clock}
                color="bg-gradient-to-br from-emerald-500 to-emerald-600"
              />
              <StatCard
                title="Personal Leave"
                value={balance.personal_leave}
                icon={History}
                color="bg-gradient-to-br from-purple-500 to-purple-600"
              />
            </div>
          )}

          {/* Leave Request Form */}
          <AnimatePresence>
            {showRequestForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-surface rounded-2xl shadow-sm border border-default overflow-hidden"
              >
                <div className="p-6 border-b border-light">
                  <h3 className="text-lg font-semibold text-primary">New Leave Request</h3>
                  <p className="text-sm text-secondary mt-1">Submit a new leave request for approval</p>
                </div>
                <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Leave Type</label>
                    <select
                      value={formData.leave_type}
                      onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                      className="w-full px-4 py-2.5 border border-default rounded-xl focus:ring-2 focus:ring-accent-primary focus:border-transparent outline-none transition-all bg-surface text-primary"
                    >
                      <option value="annual">Annual Leave</option>
                      <option value="sick">Sick Leave</option>
                      <option value="personal">Personal Leave</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Start Date</label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 border border-default rounded-xl focus:ring-2 focus:ring-accent-primary focus:border-transparent outline-none transition-all bg-input text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">End Date</label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 border border-default rounded-xl focus:ring-2 focus:ring-accent-primary focus:border-transparent outline-none transition-all bg-input text-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Reason (Optional)</label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-default rounded-xl focus:ring-2 focus:ring-accent-primary focus:border-transparent outline-none transition-all resize-none bg-input text-primary"
                      placeholder="Optional reason for leave request"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-inverse py-2.5 rounded-xl font-medium hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-200"
                    >
                      Submit Request
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRequestForm(false)}
                      className="px-6 py-2.5 border border-default rounded-xl hover:bg-hover transition-all font-medium text-primary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {!showRequestForm && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowRequestForm(true)}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-inverse py-3 rounded-xl font-medium hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              New Leave Request
            </motion.button>
          )}

          {/* My Leave Requests */}
          <div className="bg-surface rounded-2xl shadow-sm border border-default overflow-hidden">
            <div className="p-6 border-b border-light">
              <h3 className="text-lg font-semibold text-primary">My Leave Requests</h3>
              <p className="text-sm text-secondary mt-1">View and track your leave requests</p>
            </div>
            <div className="p-6">
              {requests.length > 0 ? (
                <div className="space-y-3">
                  {requests.map((request, index) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border border-light rounded-xl p-4 hover:bg-hover transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDetailModal(true);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getLeaveTypeColor(request.leave_type)}`}>
                              {getLeaveTypeLabel(request.leave_type)}
                            </span>
                            <span className="text-sm text-secondary">
                              {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-secondary">{request.number_of_days} day(s)</p>
                          {request.reason && (
                            <p className="text-sm text-tertiary mt-1 line-clamp-1">{request.reason}</p>
                          )}
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-secondary py-12">
                  <Calendar size={48} className="mx-auto mb-4 text-tertiary" />
                  <p className="text-sm">No leave requests found</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* HR/Admin View */}
      {(isHR || isAdmin) && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Requests"
              value={getStats().total}
              icon={FileText}
              color="bg-gradient-to-br from-violet-500 to-indigo-600"
            />
            <StatCard
              title="Pending"
              value={getStats().pending}
              icon={Clock}
              color="bg-gradient-to-br from-amber-500 to-orange-600"
            />
            <StatCard
              title="Approved"
              value={getStats().approved}
              icon={CheckCircle}
              color="bg-gradient-to-br from-emerald-500 to-green-600"
            />
            <StatCard
              title="Rejected"
              value={getStats().rejected}
              icon={XCircle}
              color="bg-gradient-to-br from-rose-500 to-red-600"
            />
          </div>

          {/* Filters and Search */}
          <div className="bg-surface rounded-2xl shadow-sm border border-default p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={18} />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-default rounded-xl focus:ring-2 focus:ring-accent-primary focus:border-transparent outline-none transition-all bg-input text-primary"
                />
              </div>
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 border border-default rounded-xl focus:ring-2 focus:ring-accent-primary focus:border-transparent outline-none transition-all bg-surface text-primary"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select
                  value={leaveTypeFilter}
                  onChange={(e) => setLeaveTypeFilter(e.target.value)}
                  className="px-4 py-2.5 border border-default rounded-xl focus:ring-2 focus:ring-accent-primary focus:border-transparent outline-none transition-all bg-surface text-primary"
                >
                  <option value="all">All Types</option>
                  <option value="annual">Annual</option>
                  <option value="sick">Sick</option>
                  <option value="personal">Personal</option>
                </select>
                <button
                  onClick={() => {
                    if (sortBy === 'date') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('date');
                      setSortOrder('desc');
                    }
                  }}
                  className="px-4 py-2.5 border border-default rounded-xl hover:bg-hover transition-all flex items-center gap-2"
                >
                  <ArrowUpDown size={16} />
                  <span className="hidden sm:inline">Sort</span>
                </button>
              </div>
            </div>
          </div>

          {/* Leave Requests Table */}
          <div className="bg-surface rounded-2xl shadow-sm border border-default overflow-hidden">
            <div className="p-6 border-b border-light">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-primary">Leave Management</h3>
                  <p className="text-sm text-secondary mt-1">Manage and review employee leave requests</p>
                </div>
                <span className="text-sm text-secondary">
                  {filteredRequests.length} of {requests.length} requests
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-tertiary uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-tertiary uppercase tracking-wider">Leave Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-tertiary uppercase tracking-wider">Dates</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-tertiary uppercase tracking-wider">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-tertiary uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-tertiary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light">
                  {filteredRequests.length > 0 ? (
                    filteredRequests.map((request, index) => (
                      <motion.tr
                        key={request.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="hover:bg-hover transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-inverse font-semibold text-sm">
                              {request.user_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-medium text-primary">{request.user_name}</p>
                              <p className="text-sm text-secondary">{request.user_email}</p>
                              <p className="text-xs text-tertiary">{request.user_employee_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getLeaveTypeColor(request.leave_type)}`}>
                            {getLeaveTypeLabel(request.leave_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-primary">
                            {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-primary">{request.number_of_days} day(s)</p>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(request.status)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {request.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowApproveModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-success-light text-success rounded-lg hover:bg-success transition-colors text-sm font-medium"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowRejectModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-danger-light text-danger rounded-lg hover:bg-danger transition-colors text-sm font-medium"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowDetailModal(true);
                              }}
                              className="p-2 hover:bg-hover rounded-lg transition-colors"
                            >
                              <Eye size={16} className="text-tertiary" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-secondary">
                        <div className="flex flex-col items-center">
                          <Calendar size={48} className="mb-4 text-tertiary" />
                          <p className="text-sm">No leave requests found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
            >
              <div className="p-6 border-b border-light">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-primary">Leave Request Details</h3>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 hover:bg-hover rounded-lg transition-colors"
                  >
                    <X size={20} className="text-tertiary" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-inverse font-bold text-xl">
                    {selectedRequest.user_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-primary">{selectedRequest.user_name}</h4>
                    <p className="text-sm text-secondary">{selectedRequest.user_email}</p>
                    <p className="text-xs text-tertiary">{selectedRequest.user_employee_id} • {selectedRequest.user_department}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-tertiary rounded-xl p-4">
                    <p className="text-xs text-tertiary mb-1">Leave Type</p>
                    <p className="font-medium text-primary">{getLeaveTypeLabel(selectedRequest.leave_type)}</p>
                  </div>
                  <div className="bg-surface-tertiary rounded-xl p-4">
                    <p className="text-xs text-tertiary mb-1">Number of Days</p>
                    <p className="font-medium text-primary">{selectedRequest.number_of_days} day(s)</p>
                  </div>
                  <div className="bg-surface-tertiary rounded-xl p-4">
                    <p className="text-xs text-tertiary mb-1">Start Date</p>
                    <p className="font-medium text-primary">{new Date(selectedRequest.start_date).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-surface-tertiary rounded-xl p-4">
                    <p className="text-xs text-tertiary mb-1">End Date</p>
                    <p className="font-medium text-primary">{new Date(selectedRequest.end_date).toLocaleDateString()}</p>
                  </div>
                </div>

                {selectedRequest.reason && (
                  <div className="bg-surface-tertiary rounded-xl p-4">
                    <p className="text-xs text-tertiary mb-1">Reason</p>
                    <p className="text-sm text-primary">{selectedRequest.reason}</p>
                  </div>
                )}

                <div className="bg-surface-tertiary rounded-xl p-4">
                  <p className="text-xs text-tertiary mb-1">Status</p>
                  {getStatusBadge(selectedRequest.status)}
                </div>

                {selectedRequest.reviewed_by && (
                  <div className="bg-surface-tertiary rounded-xl p-4">
                    <p className="text-xs text-tertiary mb-1">Reviewed By</p>
                    <p className="text-sm text-primary">{selectedRequest.approver_name} ({selectedRequest.approver_email})</p>
                    <p className="text-xs text-tertiary mt-1">
                      {selectedRequest.updated_at ? new Date(selectedRequest.updated_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                )}

                {selectedRequest.review_comment && (
                  <div className="bg-surface-tertiary rounded-xl p-4">
                    <p className="text-xs text-tertiary mb-1">Review Comment</p>
                    <p className="text-sm text-primary">{selectedRequest.review_comment}</p>
                  </div>
                )}

                <div className="bg-surface-tertiary rounded-xl p-4">
                  <p className="text-xs text-tertiary mb-1">Requested On</p>
                  <p className="text-sm text-primary">
                    {selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Approve Modal */}
      <AnimatePresence>
        {showApproveModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowApproveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface rounded-2xl max-w-md w-full shadow-xl"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-success-light flex items-center justify-center">
                    <CheckCircle size={24} className="text-success" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary">Approve Leave Request</h3>
                    <p className="text-sm text-secondary">Confirm approval for {selectedRequest.user_name}</p>
                  </div>
                </div>
                <div className="bg-surface-tertiary rounded-xl p-4 mb-6">
                  <p className="font-medium text-primary">{selectedRequest.user_name}</p>
                  <p className="text-sm text-secondary">{getLeaveTypeLabel(selectedRequest.leave_type)} • {selectedRequest.number_of_days} day(s)</p>
                  <p className="text-sm text-secondary">
                    {new Date(selectedRequest.start_date).toLocaleDateString()} - {new Date(selectedRequest.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowApproveModal(false)}
                    className="flex-1 px-4 py-2.5 border border-default rounded-xl hover:bg-hover transition-all font-medium text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleApprove(selectedRequest.id)}
                    className="flex-1 px-4 py-2.5 bg-success text-inverse rounded-xl hover:bg-success/90 transition-all font-medium"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface rounded-2xl max-w-md w-full shadow-xl"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-danger-light flex items-center justify-center">
                    <XCircle size={24} className="text-danger" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary">Reject Leave Request</h3>
                    <p className="text-sm text-secondary">Confirm rejection for {selectedRequest.user_name}</p>
                  </div>
                </div>
                <div className="bg-surface-tertiary rounded-xl p-4 mb-6">
                  <p className="font-medium text-primary">{selectedRequest.user_name}</p>
                  <p className="text-sm text-secondary">{getLeaveTypeLabel(selectedRequest.leave_type)} • {selectedRequest.number_of_days} day(s)</p>
                  <p className="text-sm text-secondary">
                    {new Date(selectedRequest.start_date).toLocaleDateString()} - {new Date(selectedRequest.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="flex-1 px-4 py-2.5 border border-default rounded-xl hover:bg-hover transition-all font-medium text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReject(selectedRequest.id)}
                    className="flex-1 px-4 py-2.5 bg-danger text-inverse rounded-xl hover:bg-danger/90 transition-all font-medium"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeaveManagement;