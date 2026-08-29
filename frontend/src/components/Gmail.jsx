import { useEffect, useState } from 'react';
import { googleAPI } from '../services/api';

const Gmail = () => {
  // ============================================================
  // STATE
  // ============================================================

  const [connected, setConnected] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(false);

  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showCompose, setShowCompose] = useState(false);

  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    body: '',
  });

  const [sendingEmail, setSendingEmail] = useState(false);

  // ============================================================
  // CHECK GOOGLE CONNECTION
  // ============================================================

  const checkConnection = async () => {
    try {
      setLoadingStatus(true);
      setError('');

      const response = await googleAPI.getCalendarStatus();

      setConnected(Boolean(response?.connected));
    } catch (err) {
      console.error('Error checking Google connection:', err);

      setConnected(false);

      setError(
        err?.error ||
          'Unable to check Google connection.'
      );
    } finally {
      setLoadingStatus(false);
    }
  };

  // ============================================================
  // LOAD RECENT EMAILS
  // ============================================================

  const loadEmails = async () => {
    try {
      setLoadingEmails(true);
      setError('');

      const response = await googleAPI.getRecentEmails(10);

      setEmails(response?.emails || []);
    } catch (err) {
      console.error('Error loading recent emails:', err);

      if (
        err?.code === 'GOOGLE_NOT_CONNECTED' ||
        err?.error?.toLowerCase?.().includes('not connected')
      ) {
        setConnected(false);
      }

      setError(
        err?.error ||
          'Failed to load recent emails.'
      );
    } finally {
      setLoadingEmails(false);
    }
  };

  // ============================================================
  // CONNECT GOOGLE
  // ============================================================

  const connectGoogle = async () => {
    try {
      setError('');
      setSuccess('');

      const response = await googleAPI.getAuthUrl();

      if (!response?.authUrl) {
        throw new Error(
          'Google authorization URL was not returned.'
        );
      }

      window.location.href = response.authUrl;
    } catch (err) {
      console.error('Error connecting Google:', err);

      setError(
        err?.error ||
          err?.message ||
          'Failed to start Google authorization.'
      );
    }
  };

  // ============================================================
  // OPEN EMAIL
  // ============================================================

  const openEmail = async (messageId) => {
    try {
      setError('');

      const response = await googleAPI.getEmailById(messageId);

      setSelectedEmail(response?.email || null);
    } catch (err) {
      console.error('Error opening email:', err);

      setError(
        err?.error ||
          'Failed to open email.'
      );
    }
  };

  // ============================================================
  // SEND EMAIL
  // ============================================================

  const handleSendEmail = async (event) => {
    event.preventDefault();

    if (
      !emailForm.to.trim() ||
      !emailForm.subject.trim() ||
      !emailForm.body.trim()
    ) {
      setError(
        'Please fill in recipient, subject, and message.'
      );

      return;
    }

    try {
      setSendingEmail(true);
      setError('');
      setSuccess('');

      await googleAPI.sendEmail({
        to: emailForm.to.trim(),
        subject: emailForm.subject.trim(),
        body: emailForm.body,
        isHtml: false,
      });

      setEmailForm({
        to: '',
        subject: '',
        body: '',
      });

      setShowCompose(false);

      setSuccess('Email sent successfully.');
    } catch (err) {
      console.error('Error sending email:', err);

      setError(
        err?.error ||
          'Failed to send email.'
      );
    } finally {
      setSendingEmail(false);
    }
  };

  // ============================================================
  // FORMAT EMAIL DATE
  // ============================================================

  const formatDate = (dateString) => {
    if (!dateString) {
      return '';
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  // ============================================================
  // EXTRACT HEADER
  // ============================================================

  const getHeader = (email, headerName) => {
    const headers = email?.payload?.headers || [];

    const header = headers.find(
      (item) =>
        item.name?.toLowerCase() ===
        headerName.toLowerCase()
    );

    return header?.value || '';
  };

  // ============================================================
  // LOAD CONNECTION ON MOUNT
  // ============================================================

  useEffect(() => {
    checkConnection();
  }, []);

  // ============================================================
  // LOAD EMAILS WHEN CONNECTED
  // ============================================================

  useEffect(() => {
    if (connected) {
      loadEmails();
    }
  }, [connected]);

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loadingStatus) {
    return (
      <div style={styles.page}>
        <div style={styles.surface}>
          <div style={styles.loadingCard}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>
              Checking Google connection...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // NOT CONNECTED
  // ============================================================

  if (!connected) {
    return (
      <div style={styles.page}>
        <div style={styles.surface}>
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>Gmail</h1>
              <p style={styles.subtitle}>
                Connect your Google account to access your Gmail inbox.
              </p>
            </div>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.connectCard}>
            <div style={styles.gmailIcon}>
              <span style={styles.gmailIconLetter}>M</span>
            </div>

            <h2 style={styles.connectTitle}>Connect Gmail</h2>

            <p style={styles.connectDescription}>
              Employee Copilot needs permission to read and send emails
              through your Google account.
            </p>

            <button
              type="button"
              onClick={connectGoogle}
              style={styles.googleButton}
            >
              <span style={styles.googleLogo}>G</span>
              Connect Google
            </button>

            <p style={styles.permissionText}>
              You will be redirected to Google to authorize access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // CONNECTED GMAIL UI
  // ============================================================

  return (
    <div style={styles.page}>
      <div style={styles.surface}>
        {/* ======================================================
            HEADER
        ====================================================== */}
        <div style={styles.header}>
          <div>
            <div style={styles.titleRow}>
              <h1 style={styles.title}>Gmail</h1>
              <span style={styles.connectedBadge}>
                <span style={styles.connectedDot} />
                Connected
              </span>
            </div>
            <p style={styles.subtitle}>
              Manage your emails directly from Employee Copilot.
            </p>
          </div>

          <div style={styles.headerActions}>
            <button
              type="button"
              onClick={loadEmails}
              disabled={loadingEmails}
              style={{
                ...styles.secondaryButton,
                ...(loadingEmails ? styles.disabledButton : {}),
              }}
            >
              {loadingEmails ? 'Refreshing...' : '↻ Refresh'}
            </button>

            <button
              type="button"
              onClick={() => setShowCompose(true)}
              style={styles.primaryButton}
            >
              + Compose
            </button>
          </div>
        </div>

        {/* ======================================================
            MESSAGES
        ====================================================== */}
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {/* ======================================================
            EMAIL CONTENT
        ====================================================== */}
        <div style={styles.content}>
          <div style={styles.inboxCard}>
            <div style={styles.inboxHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Recent Emails</h2>
                <p style={styles.sectionSubtitle}>
                  Your latest inbox messages
                </p>
              </div>
              <span style={styles.emailCount}>
                {emails.length} emails
              </span>
            </div>

            {loadingEmails ? (
              <div style={styles.emptyState}>
                <div style={styles.spinner} />
                <p style={styles.emptyTitle}>Loading emails...</p>
              </div>
            ) : emails.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>✉</div>
                <p style={styles.emptyTitle}>No emails found</p>
                <p style={styles.emptyText}>
                  Your inbox does not contain any recent messages.
                </p>
              </div>
            ) : (
              <div>
                {emails.map((email) => {
                  const sender = getHeader(email, 'From');
                  const subject = getHeader(email, 'Subject');
                  const date = getHeader(email, 'Date');

                  return (
                    <button
                      type="button"
                      key={email.id}
                      onClick={() => openEmail(email.id)}
                      style={styles.emailRow}
                    >
                      <div style={styles.emailAvatar}>
                        {sender?.charAt(0)?.toUpperCase() || '?'}
                      </div>

                      <div style={styles.emailMain}>
                        <div style={styles.emailTop}>
                          <span style={styles.sender}>
                            {sender || 'Unknown sender'}
                          </span>
                          <span style={styles.emailDate}>
                            {formatDate(date)}
                          </span>
                        </div>
                        <div style={styles.subject}>
                          {subject || '(No subject)'}
                        </div>
                      </div>

                      <span style={styles.arrow}>→</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ====================================================
              SELECTED EMAIL
          ==================================================== */}
          {selectedEmail && (
            <div style={styles.emailDetailCard}>
              <div style={styles.emailDetailHeader}>
                <button
                  type="button"
                  onClick={() => setSelectedEmail(null)}
                  style={styles.backButton}
                >
                  ← Back
                </button>
                <span style={styles.detailLabel}>Email</span>
              </div>

              <h2 style={styles.detailSubject}>
                {getHeader(selectedEmail, 'Subject') || '(No subject)'}
              </h2>

              <div style={styles.detailMeta}>
                <strong>From:</strong>{' '}
                {getHeader(selectedEmail, 'From')}
                <br />
                <strong>Date:</strong>{' '}
                {formatDate(getHeader(selectedEmail, 'Date'))}
              </div>

              <div style={styles.emailBody}>
                {extractEmailBody(selectedEmail)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          COMPOSE MODAL
      ======================================================== */}
      {showCompose && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowCompose(false)}
        >
          <div
            style={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>New Email</h2>
                <p style={styles.modalSubtitle}>
                  Send an email through Gmail
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCompose(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSendEmail}>
              <input
                type="email"
                placeholder="Recipient email"
                value={emailForm.to}
                onChange={(event) =>
                  setEmailForm((previous) => ({
                    ...previous,
                    to: event.target.value,
                  }))
                }
                style={styles.input}
              />

              <input
                type="text"
                placeholder="Subject"
                value={emailForm.subject}
                onChange={(event) =>
                  setEmailForm((previous) => ({
                    ...previous,
                    subject: event.target.value,
                  }))
                }
                style={styles.input}
              />

              <textarea
                placeholder="Write your message..."
                value={emailForm.body}
                onChange={(event) =>
                  setEmailForm((previous) => ({
                    ...previous,
                    body: event.target.value,
                  }))
                }
                rows={10}
                style={styles.textarea}
              />

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={sendingEmail}
                  style={{
                    ...styles.primaryButton,
                    ...(sendingEmail ? styles.disabledButton : {}),
                  }}
                >
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// EXTRACT EMAIL BODY
// ============================================================

const extractEmailBody = (email) => {
  const payload = email?.payload;

  if (!payload) {
    return 'No email content available.';
  }

  const decodeBase64 = (data) => {
    if (!data) {
      return '';
    }

    try {
      const base64 = data
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const binary = window.atob(base64);

      const bytes = Uint8Array.from(
        binary,
        (character) => character.charCodeAt(0)
      );

      return new TextDecoder('utf-8').decode(bytes);
    } catch (error) {
      console.error('Error decoding email body:', error);
      return '';
    }
  };

  // Simple message
  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  // Multipart message
  const parts = payload.parts || [];

  // Prefer plain text
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return decodeBase64(part.body.data);
    }
  }

  // Fall back to HTML
  for (const part of parts) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      return decodeBase64(part.body.data);
    }
  }

  // Nested multipart
  for (const part of parts) {
    if (part.parts) {
      const nested = extractEmailBody({ payload: part });
      if (nested && nested !== 'No email content available.') {
        return nested;
      }
    }
  }

  return 'No readable email content available.';
};

// ============================================================
// STYLES — Employee Copilot (light, clean enterprise)
// ============================================================

const styles = {
  // ----------------------------------------------------------
  // PAGE
  // ----------------------------------------------------------
  page: {
    width: '100%',
    minHeight: '100%',
    padding: '24px',
    boxSizing: 'border-box',
    background: '#ffffff',
  },

  surface: {
    width: '100%',
    minHeight: 'calc(100vh - 48px)',
    boxSizing: 'border-box',
    padding: '28px 32px',
    borderRadius: '8px',
    background: '#ffffff',
    color: '#111827',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },

  // ----------------------------------------------------------
  // HEADER
  // ----------------------------------------------------------
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '24px',
    marginBottom: '24px',
  },

  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  title: {
    margin: 0,
    color: '#111827',
    fontSize: '24px',
    fontWeight: 600,
    lineHeight: 1.25,
    letterSpacing: '-0.025em',
  },

  subtitle: {
    margin: '6px 0 0',
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: 1.5,
  },

  connectedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    color: '#059669',
    background: '#ecfdf5',
    fontSize: '12px',
    fontWeight: 500,
  },

  connectedDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#10b981',
  },

  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  // ----------------------------------------------------------
  // BUTTONS
  // ----------------------------------------------------------
  primaryButton: {
    border: 'none',
    borderRadius: '6px',
    padding: '8px 14px',
    background: '#4f46e5',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },

  secondaryButton: {
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '8px 14px',
    background: '#ffffff',
    color: '#374151',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },

  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },

  // ----------------------------------------------------------
  // ALERTS
  // ----------------------------------------------------------
  error: {
    marginBottom: '16px',
    padding: '12px 14px',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    background: '#fef2f2',
    color: '#b91c1c',
    fontSize: '13px',
    lineHeight: 1.5,
  },

  success: {
    marginBottom: '16px',
    padding: '12px 14px',
    border: '1px solid #a7f3d0',
    borderRadius: '6px',
    background: '#ecfdf5',
    color: '#047857',
    fontSize: '13px',
    lineHeight: 1.5,
  },

  // ----------------------------------------------------------
  // CONTENT
  // ----------------------------------------------------------
  content: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: '16px',
    alignItems: 'start',
  },

  inboxCard: {
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    background: '#ffffff',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },

  inboxHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
  },

  sectionTitle: {
    margin: 0,
    color: '#111827',
    fontSize: '15px',
    fontWeight: 600,
  },

  sectionSubtitle: {
    margin: '4px 0 0',
    color: '#9ca3af',
    fontSize: '12px',
  },

  emailCount: {
    padding: '4px 8px',
    borderRadius: '6px',
    background: '#f9fafb',
    color: '#6b7280',
    fontSize: '12px',
    border: '1px solid #e5e7eb',
  },

  // ----------------------------------------------------------
  // EMAIL ROW
  // ----------------------------------------------------------
  emailRow: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    boxSizing: 'border-box',
    padding: '14px 18px',
    border: 'none',
    borderBottom: '1px solid #f3f4f6',
    background: 'transparent',
    color: '#111827',
    textAlign: 'left',
    cursor: 'pointer',
    gap: '12px',
  },

  emailAvatar: {
    flexShrink: 0,
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    background: '#f5f3ff',
    border: '1px solid #e5e7eb',
    color: '#4f46e5',
    fontSize: '13px',
    fontWeight: 600,
  },

  emailMain: {
    minWidth: 0,
    flex: 1,
  },

  emailTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '4px',
  },

  sender: {
    overflow: 'hidden',
    color: '#111827',
    fontSize: '13px',
    fontWeight: 500,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  emailDate: {
    flexShrink: 0,
    color: '#9ca3af',
    fontSize: '12px',
  },

  subject: {
    overflow: 'hidden',
    color: '#6b7280',
    fontSize: '13px',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  arrow: {
    flexShrink: 0,
    color: '#d1d5db',
    fontSize: '14px',
  },

  // ----------------------------------------------------------
  // EMAIL DETAIL
  // ----------------------------------------------------------
  emailDetailCard: {
    minWidth: 0,
    padding: '20px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    background: '#ffffff',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },

  emailDetailHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },

  backButton: {
    border: 'none',
    background: 'transparent',
    color: '#4f46e5',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    padding: 0,
  },

  detailLabel: {
    color: '#9ca3af',
    fontSize: '12px',
  },

  detailSubject: {
    margin: '0 0 12px',
    color: '#111827',
    fontSize: '18px',
    fontWeight: 600,
    lineHeight: 1.4,
  },

  detailMeta: {
    paddingBottom: '16px',
    borderBottom: '1px solid #e5e7eb',
    color: '#6b7280',
    fontSize: '13px',
    lineHeight: 1.7,
  },

  emailBody: {
    marginTop: '16px',
    color: '#374151',
    fontSize: '14px',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },

  // ----------------------------------------------------------
  // LOADING
  // ----------------------------------------------------------
  loadingCard: {
    minHeight: '360px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: '12px',
    color: '#6b7280',
    fontSize: '13px',
  },

  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #e5e7eb',
    borderTop: '2px solid #4f46e5',
    borderRadius: '50%',
    animation: 'gmail-spin 0.8s linear infinite',
  },

  // ----------------------------------------------------------
  // EMPTY STATE
  // ----------------------------------------------------------
  emptyState: {
    minHeight: '240px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
  },

  emptyIcon: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
    borderRadius: '8px',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    color: '#4f46e5',
    fontSize: '18px',
  },

  emptyTitle: {
    margin: 0,
    color: '#111827',
    fontSize: '14px',
    fontWeight: 500,
  },

  emptyText: {
    maxWidth: '280px',
    margin: '6px 0 0',
    color: '#9ca3af',
    fontSize: '13px',
    textAlign: 'center',
    lineHeight: 1.5,
  },

  // ----------------------------------------------------------
  // CONNECT GOOGLE
  // ----------------------------------------------------------
  connectCard: {
    width: '100%',
    maxWidth: '480px',
    margin: '48px auto 56px',
    padding: '36px 32px',
    boxSizing: 'border-box',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    background: '#ffffff',
    textAlign: 'center',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },

  gmailIcon: {
    width: '48px',
    height: '48px',
    margin: '0 auto 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    background: '#f5f3ff',
    border: '1px solid #e5e7eb',
  },

  gmailIconLetter: {
    color: '#4f46e5',
    fontSize: '20px',
    fontWeight: 600,
  },

  connectTitle: {
    margin: 0,
    color: '#111827',
    fontSize: '18px',
    fontWeight: 600,
  },

  connectDescription: {
    maxWidth: '360px',
    margin: '10px auto 24px',
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: 1.6,
  },

  googleButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minWidth: '180px',
    padding: '10px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    background: '#ffffff',
    color: '#111827',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },

  googleLogo: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#4285f4',
  },

  permissionText: {
    margin: '14px 0 0',
    color: '#9ca3af',
    fontSize: '12px',
  },

  // ----------------------------------------------------------
  // COMPOSE MODAL
  // ----------------------------------------------------------
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    boxSizing: 'border-box',
    background: 'rgba(17, 24, 39, 0.4)',
  },

  modal: {
    width: '100%',
    maxWidth: '560px',
    padding: '24px',
    boxSizing: 'border-box',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    background: '#ffffff',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  },

  modalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },

  modalTitle: {
    margin: 0,
    color: '#111827',
    fontSize: '18px',
    fontWeight: 600,
  },

  modalSubtitle: {
    margin: '4px 0 0',
    color: '#6b7280',
    fontSize: '13px',
  },

  closeButton: {
    border: 'none',
    background: 'transparent',
    color: '#9ca3af',
    fontSize: '22px',
    cursor: 'pointer',
    lineHeight: 1,
    padding: 0,
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: '12px',
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    outline: 'none',
    background: '#ffffff',
    color: '#111827',
    fontSize: '13px',
  },

  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: '16px',
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    outline: 'none',
    resize: 'vertical',
    background: '#ffffff',
    color: '#111827',
    fontFamily: 'inherit',
    fontSize: '13px',
    lineHeight: 1.5,
  },

  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },

  cancelButton: {
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '8px 14px',
    background: '#ffffff',
    color: '#374151',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

// ============================================================
// GLOBAL ANIMATION (minimal)
// ============================================================

if (
  typeof document !== 'undefined' &&
  !document.getElementById('gmail-animation-styles')
) {
  const style = document.createElement('style');
  style.id = 'gmail-animation-styles';
  style.innerHTML = `
    @keyframes gmail-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    input:focus,
    textarea:focus {
      border-color: #4f46e5 !important;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }

    button:hover:not(:disabled) {
      opacity: 0.9;
    }

    @media (max-width: 900px) {
      .gmail-responsive-content {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

export default Gmail;