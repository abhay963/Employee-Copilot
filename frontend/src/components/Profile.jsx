import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Building2,
  ShieldCheck,
  BriefcaseBusiness,
  Award,
  LogOut,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Sparkles,
  ChevronRight,
  Clock3,
} from 'lucide-react';

import { useUser } from '../context/UserContext';


// ============================================================
// PROFILE
// ============================================================

const Profile = () => {
  const { user, logout } = useUser();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarLoadError, setAvatarLoadError] = useState(false);


  // ==========================================================
  // AVATAR
  // ==========================================================

  const avatarSeed =
    user?.uid ||
    user?.email ||
    user?.id ||
    'employee-copilot';

  const avatarUrl =
    `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(
      avatarSeed
    )}&backgroundColor=09090b,18181b,1e1b4b,312e81&radius=22`;


  // ==========================================================
  // DISPLAY NAME
  // ==========================================================

  const displayName = useMemo(() => {
    return (
      user?.name ||
      user?.firstName ||
      user?.email?.split('@')[0] ||
      'User'
    );
  }, [user]);


  // ==========================================================
  // ROLE
  // ==========================================================

  const role = useMemo(() => {
    const value = user?.role || 'employee';

    return (
      value.charAt(0).toUpperCase() +
      value.slice(1)
    );
  }, [user]);


  // ==========================================================
  // STATUS
  // ==========================================================

  const accountStatus = user?.is_blocked
    ? 'Blocked'
    : 'Active';


  // ==========================================================
  // CLEAR ERROR
  // ==========================================================

  useEffect(() => {
    if (user) {
      setError('');
    }
  }, [user]);


  // ==========================================================
  // ROLE CONFIG
  // ==========================================================

  const getRoleConfig = value => {
    const configs = {
      admin: {
        label: 'Admin',
        icon: ShieldCheck,
        className:
          'border-violet-400/20 bg-violet-500/10 text-violet-300',
      },

      hr: {
        label: 'HR',
        icon: Building2,
        className:
          'border-blue-400/20 bg-blue-500/10 text-blue-300',
      },

      employee: {
        label: 'Employee',
        icon: User,
        className:
          'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
      },
    };

    return (
      configs[String(value).toLowerCase()] || {
        label: 'User',
        icon: User,
        className:
          'border-white/[0.08] bg-white/[0.03] text-white/45',
      }
    );
  };


  // ==========================================================
  // STATUS CONFIG
  // ==========================================================

  const getStatusConfig = blocked => {
    if (blocked) {
      return {
        label: 'Blocked',
        icon: XCircle,
        className:
          'border-red-400/20 bg-red-500/10 text-red-300',
      };
    }

    return {
      label: 'Active',
      icon: CheckCircle2,
      className:
        'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
    };
  };


  // ==========================================================
  // LOADING
  // ==========================================================

  if (!user) {
    return (
      <div className="flex min-h-[520px] items-center justify-center bg-[#050505]">

        <div className="flex items-center gap-2.5 text-xs text-white/35">

          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />

          Loading profile...

        </div>

      </div>
    );
  }


  const roleConfig = getRoleConfig(user.role);
  const RoleIcon = roleConfig.icon;

  const statusConfig =
    getStatusConfig(user.is_blocked);

  const StatusIcon = statusConfig.icon;


  // ==========================================================
  // MAIN
  // ==========================================================

  return (
    <div className="min-h-full bg-[#050505]">

      <div className="mx-auto w-full max-w-6xl px-5 py-6 lg:px-8 lg:py-8">


        {/* ====================================================
            ALERTS
        ==================================================== */}

        <AnimatePresence>

          {error && (
            <motion.div
              initial={{
                opacity: 0,
                y: -8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -8,
              }}
              className="mb-4 flex items-center gap-3 rounded-xl border border-red-400/10 bg-red-500/[0.05] px-4 py-3"
            >

              <AlertCircle
                size={15}
                className="flex-shrink-0 text-red-400"
              />

              <p className="flex-1 text-xs text-red-300/80">
                {error}
              </p>

              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-300/40 hover:text-red-300"
              >
                <X size={14} />
              </button>

            </motion.div>
          )}


          {success && (
            <motion.div
              initial={{
                opacity: 0,
                y: -8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -8,
              }}
              className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-400/10 bg-emerald-500/[0.05] px-4 py-3"
            >

              <CheckCircle2
                size={15}
                className="flex-shrink-0 text-emerald-400"
              />

              <p className="flex-1 text-xs text-emerald-300/80">
                {success}
              </p>

              <button
                type="button"
                onClick={() => setSuccess('')}
                className="text-emerald-300/40 hover:text-emerald-300"
              >
                <X size={14} />
              </button>

            </motion.div>
          )}

        </AnimatePresence>


        {/* ====================================================
            PAGE HEADER
        ==================================================== */}

        <motion.header
          initial={{
            opacity: 0,
            y: 8,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mb-6"
        >

          <div className="flex items-center gap-2">

            <Sparkles
              size={14}
              className="text-violet-400"
            />

            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300/70">
              Account
            </span>

          </div>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Profile
          </h1>

          <p className="mt-1 text-xs text-white/30">
            Your account information and workspace identity.
          </p>

        </motion.header>


        {/* ====================================================
            PROFILE HERO
        ==================================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.3,
          }}
          className="relative mb-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#090909]"
        >

          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-600/[0.08] blur-3xl" />

          <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">


            {/* AVATAR */}

            <div className="relative flex-shrink-0">

              {avatarLoadError ? (

                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500 to-indigo-600 text-2xl font-bold text-white shadow-xl shadow-violet-950/30">
                  {displayName
                    .charAt(0)
                    .toUpperCase()}
                </div>

              ) : (

                <img
                  src={avatarUrl}
                  alt={`${displayName} avatar`}
                  className="h-20 w-20 rounded-2xl border border-white/[0.08] object-cover shadow-xl shadow-violet-950/20"
                  onError={() =>
                    setAvatarLoadError(true)
                  }
                />

              )}

              <span
                className={`absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full border-2 border-[#090909] ${
                  user.is_blocked
                    ? 'bg-red-400'
                    : 'bg-emerald-400'
                }`}
              />

            </div>


            {/* USER IDENTITY */}

            <div className="min-w-0 flex-1">

              <div className="flex flex-wrap items-center gap-2.5">

                <h2 className="text-xl font-semibold tracking-tight text-white">
                  {displayName}
                </h2>


                <span
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${roleConfig.className}`}
                >
                  <RoleIcon size={11} />
                  {roleConfig.label}
                </span>


                <span
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${statusConfig.className}`}
                >
                  <StatusIcon size={11} />
                  {statusConfig.label}
                </span>

              </div>


              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/35">

                <span className="flex items-center gap-1.5">
                  <Mail size={12} />
                  {user.email}
                </span>


                {user.department && (
                  <span className="flex items-center gap-1.5">
                    <BriefcaseBusiness size={12} />
                    {user.department}
                  </span>
                )}


                {user.employee_id && (
                  <span className="flex items-center gap-1.5">
                    <Award size={12} />
                    {user.employee_id}
                  </span>
                )}

              </div>

            </div>

          </div>

        </motion.section>


        {/* ====================================================
            INFORMATION GRID
        ==================================================== */}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">


          {/* ==================================================
              PERSONAL INFORMATION
          ================================================== */}

          <ProfileCard
            icon={
              <User size={15} />
            }
            iconClass="text-violet-400"
            title="Personal Information"
            subtitle="Basic account details"
            delay={0.05}
          >

            <div className="divide-y divide-white/[0.05]">

              <ProfileRow
                icon={
                  <User size={14} />
                }
                label="Full Name"
                value={displayName}
              />


              <ProfileRow
                icon={
                  <Mail size={14} />
                }
                label="Email Address"
                value={user.email}
              />


              <ProfileRow
                icon={
                  <BriefcaseBusiness size={14} />
                }
                label="Department"
                value={
                  user.department ||
                  'Not specified'
                }
              />


              <ProfileRow
                icon={
                  <Award size={14} />
                }
                label="Employee ID"
                value={
                  user.employee_id ||
                  'Not specified'
                }
              />

            </div>

          </ProfileCard>


          {/* ==================================================
              ACCOUNT DETAILS
          ================================================== */}

          <ProfileCard
            icon={
              <ShieldCheck size={15} />
            }
            iconClass="text-emerald-400"
            title="Account Details"
            subtitle="Account information"
            delay={0.1}
          >

            <div className="divide-y divide-white/[0.05]">

              <ProfileRow
                icon={
                  <ShieldCheck size={14} />
                }
                label="Account Status"
                value={accountStatus}
                valueClass={
                  user.is_blocked
                    ? 'text-red-300'
                    : 'text-emerald-300'
                }
                badge={
                  user.is_blocked
                    ? 'BLOCKED'
                    : 'ACTIVE'
                }
              />


              <ProfileRow
                icon={
                  <Clock3 size={14} />
                }
                label="Last Login"
                value="Recently"
              />


              <ProfileRow
                icon={
                  <User size={14} />
                }
                label="Account Type"
                value={role}
              />

            </div>

          </ProfileCard>


          {/* ==================================================
              SESSION
          ================================================== */}

          <ProfileCard
            icon={
              <LogOut size={15} />
            }
            iconClass="text-red-400"
            title="Session"
            subtitle="Manage your current session"
            delay={0.15}
          >

            <button
              type="button"
              onClick={logout}
              className="group flex w-full items-center gap-3 rounded-xl border border-red-400/10 bg-red-500/[0.035] p-3.5 text-left transition-all hover:border-red-400/20 hover:bg-red-500/[0.07]"
            >

              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <LogOut
                  size={15}
                  className="text-red-300"
                />
              </div>


              <div className="min-w-0 flex-1">

                <p className="text-xs font-medium text-red-300/90">
                  Sign Out
                </p>

                <p className="mt-0.5 text-[10px] text-red-300/35">
                  End your current session
                </p>

              </div>


              <ChevronRight
                size={14}
                className="text-red-300/25 transition-transform group-hover:translate-x-0.5 group-hover:text-red-300"
              />

            </button>

          </ProfileCard>

        </div>


        {/* ====================================================
            FOOTER
        ==================================================== */}

        <div className="mt-5 flex items-center justify-between border-t border-white/[0.05] pt-4">

          <div className="flex items-center gap-2 text-[9px] text-white/20">

            <CheckCircle2 size={11} />

            Account secured

          </div>


          <span className="text-[9px] text-white/15">
            Employee Copilot
          </span>

        </div>

      </div>

    </div>
  );
};


// ============================================================
// PROFILE CARD
// ============================================================

const ProfileCard = ({
  icon,
  iconClass = 'text-violet-400',
  title,
  subtitle,
  children,
  delay = 0,
}) => {
  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.3,
        delay,
      }}
      className="rounded-xl border border-white/[0.07] bg-[#090909] p-4"
    >

      <div className="mb-4 flex items-center gap-3">

        <div
          className={`
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-lg
            border
            border-white/[0.06]
            bg-white/[0.025]
            ${iconClass}
          `}
        >
          {icon}
        </div>


        <div>

          <h3 className="text-xs font-semibold text-white/75">
            {title}
          </h3>

          <p className="mt-0.5 text-[10px] text-white/25">
            {subtitle}
          </p>

        </div>

      </div>

      {children}

    </motion.section>
  );
};


// ============================================================
// PROFILE ROW
// ============================================================

const ProfileRow = ({
  icon,
  label,
  value,
  valueClass = 'text-white/65',
  badge,
}) => {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">

      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.025] text-white/25">
        {icon}
      </div>


      <div className="min-w-0 flex-1">

        <p className="text-[9px] uppercase tracking-wider text-white/20">
          {label}
        </p>

        <p
          className={`mt-0.5 truncate text-xs font-medium ${valueClass}`}
        >
          {value}
        </p>

      </div>


      {badge && (
        <span
          className={`
            rounded-md
            border
            px-1.5
            py-0.5
            text-[8px]
            font-semibold
            tracking-wider
            ${
              badge === 'BLOCKED'
                ? 'border-red-400/10 bg-red-400/[0.06] text-red-300/70'
                : 'border-emerald-400/10 bg-emerald-400/[0.06] text-emerald-300/70'
            }
          `}
        >
          {badge}
        </span>
      )}

    </div>
  );
};


export default Profile;