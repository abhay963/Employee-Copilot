
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { useUser } from './context/UserContext';

import Landing from './pages/Landing';
import EmployeeDashboard from './pages/EmployeeDashboard';
import HRDashboard from './pages/HRDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import GoogleCallback from './pages/GoogleCallback';

function App() {
  const {
    user,
    loading,
    isEmployee,
    isHR
  } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">

          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />

          <p className="mt-4 text-gray-600">
            Loading...
          </p>

        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>

        {/* =====================================================
            PUBLIC ROUTES
        ====================================================== */}

        <Route
          path="/"
          element={
            !user ? (
              <Landing />
            ) : (
              <Navigate
                to={
                  isHR
                    ? '/hr-dashboard'
                    : '/employee-dashboard'
                }
              />
            )
          }
        />

        <Route
          path="/login"
          element={
            !user ? (
              <Login />
            ) : (
              <Navigate
                to={
                  isHR
                    ? '/hr-dashboard'
                    : '/employee-dashboard'
                }
              />
            )
          }
        />

        <Route
          path="/register"
          element={
            !user ? (
              <Register />
            ) : (
              <Navigate
                to={
                  isHR
                    ? '/hr-dashboard'
                    : '/employee-dashboard'
                }
              />
            )
          }
        />

        {/* =====================================================
            GOOGLE AUTH CALLBACK
        ====================================================== */}

        <Route
          path="/auth/google/callback"
          element={<GoogleCallback />}
        />

        {/* =====================================================
            PROTECTED EMPLOYEE ROUTE
        ====================================================== */}

        <Route
          path="/employee-dashboard"
          element={
            isEmployee ? (
              <EmployeeDashboard />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* =====================================================
            PROTECTED HR ROUTE
        ====================================================== */}

        <Route
          path="/hr-dashboard"
          element={
            isHR ? (
              <HRDashboard />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* =====================================================
            CATCH ALL
        ====================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to={
                user
                  ? isHR
                    ? '/hr-dashboard'
                    : '/employee-dashboard'
                  : '/'
              }
            />
          }
        />

      </Routes>
    </Router>
  );
}

export default App;

