import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, Plus, History, AlertCircle } from 'lucide-react';
import { leaveAPI } from '../services/api';

const LeaveManagement = ({ isHR }) => {
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

  useEffect(() => {
    loadData();
  }, [isHR]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (isHR) {
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
        // Check for calendar conflicts
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
        loadData();
      }
    } catch (err) {
      setError(err.error || 'Failed to reject leave request');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || styles.pending}`}>
        {status}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Employee View */}
      {!isHR && (
        <>
          {/* Leave Balance Cards */}
          {balance && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Annual Leave</p>
                    <p className="text-2xl font-bold text-gray-900">{balance.annual_leave}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Sick Leave</p>
                    <p className="text-2xl font-bold text-gray-900">{balance.sick_leave}</p>
                  </div>
                  <Clock className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Personal Leave</p>
                    <p className="text-2xl font-bold text-gray-900">{balance.personal_leave}</p>
                  </div>
                  <History className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>
          )}

          {/* Leave Request Form */}
          {showRequestForm && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">New Leave Request</h3>
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                  <select
                    value={formData.leave_type}
                    onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="annual">Annual Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="personal">Personal Leave</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason (Optional)</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Optional reason for leave request"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    Submit Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {!showRequestForm && (
            <button
              onClick={() => setShowRequestForm(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              New Leave Request
            </button>
          )}

          {/* My Leave Requests */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">My Leave Requests</h3>
            </div>
            <div className="p-6">
              {requests.length > 0 ? (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{getLeaveTypeLabel(request.leave_type)}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">{request.number_of_days} day(s)</p>
                          {request.reason && (
                            <p className="text-sm text-gray-500 mt-1">{request.reason}</p>
                          )}
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      {request.review_comment && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">HR Comment:</span> {request.review_comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Calendar size={48} className="mx-auto mb-4" />
                  <p>No leave requests found</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* HR View */}
      {isHR && (
        <>
          {/* Pending Leave Requests */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Pending Leave Requests</h3>
              <p className="text-sm text-gray-600 mt-1">
                {pendingRequests.length} request(s) awaiting approval
              </p>
            </div>
            <div className="p-6">
              {pendingRequests.length > 0 ? (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{request.user_name}</h4>
                          <p className="text-sm text-gray-600">{request.user_email}</p>
                          <p className="text-sm text-gray-600">{request.department}</p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <p className="font-medium">{getLeaveTypeLabel(request.leave_type)}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">{request.number_of_days} day(s)</p>
                        {request.reason && (
                          <p className="text-sm text-gray-500 mt-1">{request.reason}</p>
                        )}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                          <XCircle size={16} />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <CheckCircle size={48} className="mx-auto mb-4" />
                  <p>No pending leave requests</p>
                </div>
              )}
            </div>
          </div>

          {/* All Leave Requests */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">All Leave Requests</h3>
            </div>
            <div className="p-6">
              {requests.length > 0 ? (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{request.user_name}</h4>
                          <p className="text-sm text-gray-600">{request.user_email}</p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="mt-2">
                        <p className="text-sm">
                          <span className="font-medium">{getLeaveTypeLabel(request.leave_type)}</span> - {request.number_of_days} day(s)
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Calendar size={48} className="mx-auto mb-4" />
                  <p>No leave requests found</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LeaveManagement;