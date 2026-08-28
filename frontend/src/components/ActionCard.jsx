import { motion } from 'framer-motion';
import { 
  Calendar, 
  Check, 
  X, 
  Clock, 
  AlertTriangle,
  Sparkles,
  User
} from 'lucide-react';

const ActionCard = ({ 
  actionMetadata, 
  onConfirm, 
  onCancel, 
  onEdit,
  isLoading = false 
}) => {
  if (!actionMetadata) return null;

  const {
    actionId,
    actionType,
    title,
    date,
    time,
    hasConflicts,
    conflictDetails
  } = actionMetadata;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
  };

  const getActionIcon = () => {
    switch (actionType) {
      case 'calendar_create':
        return <Calendar size={20} />;
      case 'leave_request':
        return <Clock size={20} />;
      default:
        return <Sparkles size={20} />;
    }
  };

  const getActionTitle = () => {
    switch (actionType) {
      case 'calendar_create':
        return 'Schedule Meeting';
      case 'leave_request':
        return 'Submit Leave Request';
      default:
        return 'Confirm Action';
    }
  };

  const getConflictMessage = () => {
    if (!hasConflicts || !conflictDetails) return null;
    
    if (Array.isArray(conflictDetails) && conflictDetails.length > 0) {
      const conflict = conflictDetails[0];
      const start = new Date(conflict.start);
      const end = new Date(conflict.end);
      return `Conflict: ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`;
    }
    
    return 'You have calendar conflicts during this time.';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="my-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-white">
          {getActionIcon()}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">
            {getActionTitle()}
          </h4>
          <p className="text-xs text-gray-600">
            I'm ready to execute this action
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="mb-4 space-y-2 rounded-lg bg-white/50 p-3">
        {title && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-gray-500 w-20">Title:</span>
            <span className="text-sm text-gray-900 flex-1">{title}</span>
          </div>
        )}
        
        {date && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-gray-500 w-20">Date:</span>
            <span className="text-sm text-gray-900 flex-1">{formatDate(date)}</span>
          </div>
        )}
        
        {time && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-gray-500 w-20">Time:</span>
            <span className="text-sm text-gray-900 flex-1">{formatTime(time)}</span>
          </div>
        )}

        {hasConflicts && (
          <div className="flex items-start gap-2 mt-3 pt-3 border-t border-yellow-200">
            <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-yellow-700">
              {getConflictMessage()}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Processing...
            </>
          ) : (
            <>
              <Check size={16} />
              Confirm
            </>
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCancel}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={16} />
          Cancel
        </motion.button>

        {onEdit && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onEdit}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            title="Edit details"
          >
            <User size={16} />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default ActionCard;