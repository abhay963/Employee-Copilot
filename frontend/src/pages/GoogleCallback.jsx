import { useEffect, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Loader2,
  CalendarDays,
} from 'lucide-react';

import { toast } from 'react-hot-toast';
import { googleAPI } from '../services/api';

const GoogleCallback = () => {
  const [status, setStatus] = useState('loading');

  const [message, setMessage] = useState(
    'Connecting your Google account...'
  );

  useEffect(() => {
    let mounted = true;

    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(
          window.location.search
        );

        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        // ======================================================
        // GOOGLE DENIED ACCESS
        // ======================================================

        if (error) {
          if (!mounted) return;

          setStatus('error');
          setMessage(
            'Google Calendar connection was cancelled.'
          );

          toast.error(
            'Google Calendar connection was cancelled.'
          );

          return;
        }

        // ======================================================
        // VALIDATE OAUTH RESPONSE
        // ======================================================

        if (!code || !state) {
          if (!mounted) return;

          setStatus('error');
          setMessage(
            'Invalid Google OAuth response. Missing authorization code or state.'
          );

          toast.error(
            'Invalid Google OAuth response. Missing authorization code or state.'
          );

          return;
        }

        // ======================================================
        // SEND CALLBACK DATA TO BACKEND
        // ======================================================

        await googleAPI.handleCallback({
          code,
          state,
        });

        if (!mounted) return;

        // ======================================================
        // SUCCESS
        // ======================================================

        setStatus('success');

        setMessage(
          'Google Calendar connected successfully!'
        );

        toast.success(
          'Google Calendar connected successfully!'
        );

        // ======================================================
        // CLEAN OAUTH PARAMETERS FROM URL
        // ======================================================

        window.history.replaceState(
          {},
          document.title,
          '/auth/google/callback'
        );

        // ======================================================
        // REDIRECT TO EMPLOYEE CALENDAR
        // ======================================================

        setTimeout(() => {
          if (!mounted) return;

          window.location.href =
            '/employee-dashboard?tab=calendar';
        }, 1200);
      } catch (error) {
        console.error(
          'Google callback error:',
          error
        );

        if (!mounted) return;

        setStatus('error');

        const errorMessage =
          error?.error ||
            error?.message ||
            'Failed to connect Google Calendar. Please try again.';

        setMessage(errorMessage);

        toast.error(errorMessage);
      }
    };

    handleCallback();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 text-center">

          {/* ==================================================
              STATUS ICON
          ================================================== */}

          <div className="flex justify-center mb-6">

            {status === 'loading' && (
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Loader2
                  size={32}
                  className="text-blue-600 animate-spin"
                />
              </div>
            )}

            {status === 'success' && (
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
                <CheckCircle
                  size={34}
                  className="text-green-600"
                />
              </div>
            )}

            {status === 'error' && (
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
                <XCircle
                  size={34}
                  className="text-red-600"
                />
              </div>
            )}

          </div>

          {/* ==================================================
              TITLE
          ================================================== */}

          <div className="flex items-center justify-center gap-2 mb-3">
            <CalendarDays
              size={20}
              className="text-blue-600"
            />

            <h1 className="text-xl font-bold text-gray-900">
              Google Calendar
            </h1>
          </div>

          {/* ==================================================
              MESSAGE
          ================================================== */}

          <p className="text-gray-600">
            {message}
          </p>

          {/* ==================================================
              LOADING MESSAGE
          ================================================== */}

          {status === 'loading' && (
            <p className="text-sm text-gray-400 mt-5">
              Please wait while we securely connect your
              Google account...
            </p>
          )}

          {/* ==================================================
              SUCCESS MESSAGE
          ================================================== */}

          {status === 'success' && (
            <p className="text-sm text-gray-500 mt-5">
              Redirecting you to your calendar...
            </p>
          )}

          {/* ==================================================
              ERROR ACTION
          ================================================== */}

          {status === 'error' && (
            <div className="mt-6 space-y-3">

              <button
                type="button"
                onClick={() => {
                  window.location.href =
                    '/employee-dashboard?tab=calendar';
                }}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
              >
                Return to Calendar
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href =
                    '/employee-dashboard?tab=calendar';
                }}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                Try Again
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default GoogleCallback;