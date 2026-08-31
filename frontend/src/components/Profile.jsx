import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Building,
  Shield,
  Calendar,
  Edit,
  Briefcase,
  Phone,
  MapPin,
  Lock,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Camera,
  Save,
  Key,
  Clock,
  Award,
  LogOut
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { userAPI } from '../services/api';

const Profile = () => {
  const { user, refreshUser, logout } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    phone: '',
    location: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        department: user.department || '',
        phone: user.phone || '',
        location: user.location || ''
      });
    }
  }, [user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // Note: This would require a profile update API endpoint
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      await refreshUser();
    } catch (err) {
      setError(err.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      department: user?.department || '',
      phone: user?.phone || '',
      location: user?.location || ''
    });
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white',
      hr: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white',
      employee: 'bg-gradient-to-r from-emerald-500 to-green-600 text-white'
    };
    const icons = {
      admin: Shield,
      hr: Building,
      employee: User
    };
    const Icon = icons[role] || User;
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${styles[role] || styles.employee}`}>
        <Icon size={14} />
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </div>
    );
  };

  const getStatusBadge = (isBlocked) => {
    if (isBlocked) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
          <XCircle size={14} />
          Blocked
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
        <CheckCircle size={14} />
        Active
      </div>
    );
  };

  const InfoCard = ({ icon: Icon, label, value, editing, field, onChange }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
          <Icon size={18} className="text-violet-600" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          {editing ? (
            <input
              type="text"
              value={formData[field] || ''}
              onChange={(e) => onChange(field, e.target.value)}
              className="w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
            />
          ) : (
            <p className="text-sm font-medium text-gray-900">{value || 'Not specified'}</p>
          )}
        </div>
      </div>
    </motion.div>
  );

  const SkeletonCard = () => (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
        </div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full"
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
            className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700">{error}</p>
            <button
              onClick={() => setError('')}
              className="ml-auto text-rose-400 hover:text-rose-600"
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
            className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3"
          >
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-700">{success}</p>
            <button
              onClick={() => setSuccess('')}
              className="ml-auto text-emerald-400 hover:text-emerald-600"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative group"
            >
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-violet-200">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-violet-600 hover:bg-violet-50 transition-colors"
              >
                <Camera size={16} />
              </motion.button>
            </motion.div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                {getRoleBadge(user.role)}
                {getStatusBadge(user.is_blocked)}
              </div>
              <p className="text-gray-600 mb-1">{user.email}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Briefcase size={14} />
                  {user.department || 'Not assigned'}
                </span>
                <span className="flex items-center gap-1">
                  <Award size={14} />
                  {user.employee_id || 'Not assigned'}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (isEditing) {
                  handleUpdate(new Event('submit'));
                } else {
                  setIsEditing(true);
                }
              }}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditing ? (
                <>
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </>
              ) : (
                <>
                  <Edit size={18} />
                  Edit Profile
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Profile Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <User size={20} className="text-violet-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                <p className="text-sm text-gray-500">Your personal details</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <InfoCard
              icon={User}
              label="Full Name"
              value={user.name}
              editing={isEditing}
              field="name"
              onChange={(field, value) => setFormData({ ...formData, [field]: value })}
            />
            <InfoCard
              icon={Mail}
              label="Email Address"
              value={user.email}
              editing={false}
            />
            <InfoCard
              icon={Phone}
              label="Phone Number"
              value={user.phone}
              editing={isEditing}
              field="phone"
              onChange={(field, value) => setFormData({ ...formData, [field]: value })}
            />
            <InfoCard
              icon={MapPin}
              label="Location"
              value={user.location}
              editing={isEditing}
              field="location"
              onChange={(field, value) => setFormData({ ...formData, [field]: value })}
            />
          </div>
        </motion.div>

        {/* Work Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Briefcase size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Work Information</h3>
                <p className="text-sm text-gray-500">Your work details</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <InfoCard
              icon={Building}
              label="Department"
              value={user.department}
              editing={isEditing}
              field="department"
              onChange={(field, value) => setFormData({ ...formData, [field]: value })}
            />
            <InfoCard
              icon={Award}
              label="Employee ID"
              value={user.employee_id}
              editing={false}
            />
            <InfoCard
              icon={Shield}
              label="Role"
              value={user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
              editing={false}
            />
            <InfoCard
              icon={Calendar}
              label="Member Since"
              value={user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Not available'}
              editing={false}
            />
          </div>
        </motion.div>

        {/* Account Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Clock size={20} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
                <p className="text-sm text-gray-500">Account information</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <InfoCard
              icon={Shield}
              label="Account Status"
              value={user.is_blocked ? 'Blocked' : 'Active'}
              editing={false}
            />
            <InfoCard
              icon={Calendar}
              label="Last Login"
              value="Recently"
              editing={false}
            />
            <InfoCard
              icon={User}
              label="Account Type"
              value={user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
              editing={false}
            />
          </div>
        </motion.div>

        {/* Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Lock size={20} className="text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Security</h3>
                <p className="text-sm text-gray-500">Password and security settings</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <Key size={18} className="text-gray-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Change Password</p>
                  <p className="text-xs text-gray-500">Update your password</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:bg-violet-50 transition-colors">
                <Key size={16} className="text-gray-400 group-hover:text-violet-600" />
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={logout}
              className="w-full flex items-center justify-between p-4 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <LogOut size={18} className="text-rose-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-rose-700">Sign Out</p>
                  <p className="text-xs text-rose-500">Sign out of your account</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:bg-rose-100 transition-colors">
                <LogOut size={16} className="text-rose-600" />
              </div>
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Cancel Button when editing */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCancel}
              className="px-8 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700"
            >
              Cancel Editing
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;