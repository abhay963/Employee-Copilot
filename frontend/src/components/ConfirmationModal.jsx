import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, X, Unlink } from 'lucide-react';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete conversation?',
  description = 'Are you sure you want to delete this conversation? This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  icon: Icon = Trash2,
  variant = 'danger',
  disabled = false,
  error = ''
}) => {
  // Map variant to default icons
  const getDefaultIcon = () => {
    if (variant === 'danger') return Trash2;
    return Trash2;
  };

  const IconComponent = Icon || getDefaultIcon();
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
            onKeyDown={handleKeyDown}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(4px)'
            }}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirmation-modal-title"
              className="bg-surface rounded-2xl shadow-2xl max-w-[440px] w-full overflow-hidden"
              style={{
                border: '1px solid var(--border-default)',
                boxShadow: '0 25px 50px -12px var(--shadow-xl)'
              }}
            >
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start gap-4">
                  {/* Icon Container */}
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: variant === 'danger'
                        ? 'var(--danger-light)'
                        : 'var(--accent-primary-light)'
                    }}
                  >
                    <Icon
                      size={24}
                      className={variant === 'danger' ? 'text-danger' : 'text-accent-primary'}
                    />
                  </div>

                  {/* Title and Description */}
                  <div className="flex-1 min-w-0">
                    <h3
                      id="confirmation-modal-title"
                      className="text-lg font-semibold text-primary mb-2"
                      style={{ fontSize: '18px', fontWeight: 600 }}
                    >
                      {title}
                    </h3>
                    <p
                      className="text-sm text-secondary leading-relaxed"
                      style={{ fontSize: '14px', lineHeight: 1.6 }}
                    >
                      {description}
                    </p>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={onClose}
                    disabled={disabled}
                    className="flex-shrink-0 p-1 rounded-lg hover:bg-hover transition-colors text-tertiary hover:text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ padding: '4px' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mt-4 p-3 rounded-lg bg-danger-light border border-danger text-danger text-sm">
                    {error}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-6 pt-4 flex gap-3">
                <button
                  onClick={onClose}
                  disabled={disabled}
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-all hover:bg-hover border border-default text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    minHeight: '44px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={disabled}
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-all text-inverse shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    minHeight: '44px',
                    fontSize: '14px',
                    fontWeight: 500,
                    backgroundColor: variant === 'danger' ? 'var(--danger)' : 'var(--accent-primary)',
                    boxShadow: variant === 'danger'
                      ? '0 4px 12px rgba(239, 68, 68, 0.3)'
                      : '0 4px 12px rgba(139, 92, 246, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled) {
                      e.target.style.opacity = '0.9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!disabled) {
                      e.target.style.opacity = '1';
                    }
                  }}
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;