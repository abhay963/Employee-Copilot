import { motion } from 'framer-motion';
import { 
  Calendar, 
  Check, 
  X, 
  Clock, 
  AlertTriangle,
  Sparkles,
  User,
  Info
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
    conflictDetails,
    calendarStatus
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

  const getCalendarStatusMessage = () => {
    if (calendarStatus === 'NOT_CONNECTED') {
      return {
        icon: <Info size={16} className="text-info flex-shrink-0 mt-0.5" />,
        message: 'Google Calendar isn\'t connected, so I couldn\'t check for schedule conflicts. Your leave request can still continue.',
        color: 'text-info',
        borderColor: 'border-info'
      };
    }
    
    if (calendarStatus === 'TEMPORARILY_UNAVAILABLE') {
      return {
        icon: <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />,
        message: 'Google Calendar is temporarily unavailable, so I couldn\'t check for schedule conflicts. Your leave request can still continue.',
        color: 'text-warning',
        borderColor: 'border-warning'
      };
    }
    
    return null;
  };

  const getConflictMessage = () => {
    if (!hasConflicts || !conflictDetails) return null;
    
    if (Array.isArray(conflictDetails) && conflictDetails.length > 0) {
      const conflicts = conflictDetails.slice(0, 3); // Show max 3 conflicts
      return conflicts.map((conflict, index) => {
        const start = new Date(conflict.start);
        const end = new Date(conflict.end);
        const timeStr = `${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        return `• ${conflict.summary || 'Event'} — ${timeStr}`;
      }).join('\n');
    }
    
    return 'You have calendar conflicts during this time.';
  };

  const calendarStatusMessage = getCalendarStatusMessage();
  const conflictMessage = getConflictMessage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="my-4 action-card p-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-primary text-inverse">
          {getActionIcon()}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-primary">
            {getActionTitle()}
          </h4>
          <p className="text-xs text-secondary">
            I'm ready to execute this action
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="mb-4 space-y-2 rounded-lg bg-surface-tertiary p-3">
        {title && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-tertiary w-20">Title:</span>
            <span className="text-sm text-primary flex-1">{title}</span>
          </div>
        )}
        
        {date && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-tertiary w-20">Date:</span>
            <span className="text-sm text-primary flex-1">{formatDate(date)}</span>
          </div>
        )}
        
        {time && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-tertiary w-20">Time:</span>
            <span className="text-sm text-primary flex-1">{formatTime(time)}</span>
          </div>
        )}

        {/* Calendar Status Warning */}
        {calendarStatusMessage && (
          <div className={`flex items-start gap-2 mt-3 pt-3 border-t ${calendarStatusMessage.borderColor}`}>
            {calendarStatusMessage.icon}
            <span className={`text-xs ${calendarStatusMessage.color} whitespace-pre-line`}>
              {calendarStatusMessage.message}
            </span>
          </div>
        )}

        {/* Calendar Conflicts */}
        {hasConflicts && conflictMessage && (
          <div className="flex items-start gap-2 mt-3 pt-3 border-t border-warning">
            <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
            <div className="text-xs text-warning">
              <div className="font-medium mb-1">⚠️ Calendar conflicts found</div>
              <div className="whitespace-pre-line">{conflictMessage}</div>
              <div className="mt-2 text-xs text-warning">
                Your leave request is still possible.
              </div>
            </div>
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
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-medium text-inverse shadow-sm transition-colors hover:bg-accent-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
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
          className="flex items-center justify-center gap-2 rounded-lg border border-default bg-surface px-4 py-2.5 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
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
            className="flex items-center justify-center gap-2 rounded-lg border border-default bg-surface px-4 py-2.5 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
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