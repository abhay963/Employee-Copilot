
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  Menu,
  X,
  ArrowRight,
  ArrowUpRight,
  Layers,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useUser } from "../context/UserContext";

const cn = (...classes) => classes.filter(Boolean).join(" ");

/* -------------------------------------------------------------------------- */
/* Animated wire background                                                   */
/* Same visual language as the Register page                                  */
/* -------------------------------------------------------------------------- */

function WireField({ className = "", variant = "login" }) {
  const paths = [
    "M -80 120 C 170 120 300 120 470 165 C 610 202 720 235 850 205 C 1020 165 1120 65 1320 55 C 1480 45 1580 100 1700 135",
    "M -80 145 C 170 145 300 140 465 180 C 610 215 725 250 855 220 C 1020 180 1130 90 1320 80 C 1480 70 1590 125 1700 160",
    "M -80 170 C 170 170 305 160 460 195 C 605 228 730 265 860 235 C 1030 195 1140 115 1325 105 C 1490 95 1590 150 1700 185",
    "M -80 195 C 170 195 310 180 455 210 C 600 240 735 280 865 250 C 1040 210 1150 140 1330 130 C 1495 120 1600 175 1700 210",

    "M -80 355 C 170 355 300 350 470 310 C 610 278 725 250 850 280 C 1020 320 1130 420 1320 430 C 1480 440 1590 385 1700 350",
    "M -80 380 C 170 380 300 375 465 335 C 610 300 725 275 855 305 C 1020 345 1140 445 1320 455 C 1480 465 1590 410 1700 375",
    "M -80 405 C 170 405 305 400 460 360 C 605 325 730 300 860 330 C 1030 370 1150 470 1325 480 C 1490 490 1590 435 1700 400",

    "M -80 255 C 190 255 320 250 480 250 C 620 250 730 250 870 255 C 1040 260 1180 255 1350 255 C 1500 255 1600 255 1700 255",

    "M -80 90 C 170 90 290 100 450 145 C 600 187 720 220 860 190 C 1030 150 1150 40 1340 35 C 1500 30 1600 80 1700 115",
    "M -80 430 C 170 430 290 420 450 375 C 600 333 720 300 860 330 C 1030 370 1150 480 1340 485 C 1500 490 1600 440 1700 405",
  ];

  const gradientId = `login-wire-${variant}`;

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className
      )}
      viewBox="0 0 1600 520"
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="1"
          y2="0"
        >
          <stop offset="0" stopColor="#72BFFF" stopOpacity="0.01" />
          <stop offset="0.25" stopColor="#72BFFF" stopOpacity="0.16" />
          <stop offset="0.52" stopColor="#72BFFF" stopOpacity="0.58" />
          <stop offset="0.70" stopColor="#A98BFF" stopOpacity="0.65" />
          <stop offset="1" stopColor="#72BFFF" stopOpacity="0.20" />
        </linearGradient>

        <filter
          id={`login-wire-glow-${variant}`}
          x="-20%"
          y="-100%"
          width="140%"
          height="300%"
        >
          <feGaussianBlur stdDeviation="2.2" result="blur" />

          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {paths.map((d, i) => (
        <g key={i}>
          {/* Permanent faint wire */}
          <path
            d={d}
            stroke={`url(#${gradientId})`}
            strokeWidth={i === 7 ? 1.15 : 0.8}
            opacity={i % 3 === 0 ? 0.22 : 0.12}
          />

          {/* Animated glowing section */}
          <path
            d={d}
            stroke={`url(#${gradientId})`}
            strokeWidth={i === 7 ? 1.65 : 1.15}
            strokeLinecap="round"
            pathLength="1000"
            strokeDasharray="150 850"
            strokeDashoffset="0"
            opacity="0.62"
            filter={`url(#login-wire-glow-${variant})`}
            className={`wire-stream wire-stream-${i}`}
          />

          {/* Secondary overlapping stream */}
          <path
            d={d}
            stroke={`url(#${gradientId})`}
            strokeWidth="0.75"
            strokeLinecap="round"
            pathLength="1000"
            strokeDasharray="150 850"
            strokeDashoffset="-500"
            opacity="0.20"
            className={`wire-stream wire-stream-secondary-${i}`}
          />
        </g>
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Logo                                                                       */
/* -------------------------------------------------------------------------- */

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/[0.05] text-[#8BD1FF] transition-transform duration-500 hover:scale-105 hover:border-[#7FCBFF]/30">
        <Layers className="h-[18px] w-[18px]" />
      </div>

      <div className="text-[15px] font-semibold tracking-[-0.02em] text-white">
        Employee <span className="text-[#78C5FF]">Copilot</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Navbar                                                                     */
/* -------------------------------------------------------------------------- */

function Navbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <div className="mx-auto flex h-[62px] max-w-[1400px] items-center justify-between rounded-2xl border border-white/[0.10] bg-[#03070D]/90 px-4 shadow-[0_15px_60px_rgba(0,0,0,.35)] backdrop-blur-xl sm:px-6 animate-slide-down">
        <button type="button" onClick={() => navigate("/")}>
          <Logo />
        </button>

        <nav className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-lg px-4 py-2.5 text-[13px] font-medium text-white/55 transition-all duration-300 hover:bg-white/[0.05] hover:text-white"
          >
            Home
          </button>

          <button
            type="button"
            onClick={() => navigate("/register")}
            className="rounded-xl bg-[#EDF7FF] px-5 py-2.5 text-[13px] font-semibold text-[#07101A] transition-all duration-300 hover:scale-[1.02] hover:bg-white hover:shadow-[0_0_30px_rgba(121,197,255,0.25)]"
          >
            Get started
            <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" />
          </button>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 lg:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="mx-auto mt-2 max-w-[1400px] rounded-2xl border border-white/10 bg-[#03070D]/95 p-3 backdrop-blur-xl lg:hidden animate-fade-in">
          <button
            type="button"
            onClick={() => {
              navigate("/");
              setOpen(false);
            }}
            className="flex w-full items-center justify-between border-b border-white/[0.06] px-3 py-4 text-left text-sm text-white/70"
          >
            Home
            <ArrowRight className="h-4 w-4 text-white/30" />
          </button>

          <button
            type="button"
            onClick={() => {
              navigate("/register");
              setOpen(false);
            }}
            className="flex w-full items-center justify-between px-3 py-4 text-left text-sm text-white/70"
          >
            Sign up
            <ArrowRight className="h-4 w-4 text-white/30" />
          </button>
        </div>
      )}
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Login                                                                      */
/* -------------------------------------------------------------------------- */

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { login } = useUser();

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    if (!formData.password) {
      toast.error("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const response = await login(
        formData.email.trim().toLowerCase(),
        formData.password
      );

      console.log("Login response:", response);

      if (
        !response ||
        !response.success ||
        !response.user ||
        !response.token
      ) {
        throw new Error(
          response?.error ||
            "Login failed. Please check your credentials."
        );
      }

      const role = response.user.role?.toLowerCase();

      console.log("Authenticated user:", response.user);
      console.log("User role:", role);

      if (role === "hr") {
        toast.success("Welcome back, HR!");
        navigate("/hr-dashboard", { replace: true });
        return;
      }

      if (role === "employee") {
        toast.success("Welcome back!");
        navigate("/employee-dashboard", { replace: true });
        return;
      }

      toast.error(
        "Your account has an invalid role. Please contact HR."
      );
    } catch (err) {
      console.error("Login error:", err);

      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.error ||
        err?.message ||
        "Login failed. Please check your credentials and try again.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Page styles                                                              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const style = document.createElement("style");

    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap');

      html {
        scroll-behavior: smooth;
        background: #02060C;
      }

      body {
        margin: 0;
        background: #02060C;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }

      button {
        -webkit-tap-highlight-color: transparent;
      }

      ::selection {
        background: rgba(121,197,255,.22);
        color: white;
      }

      /* -------------------------------------------------------------------- */
      /* Register-compatible wire animation                                   */
      /* -------------------------------------------------------------------- */

      .wire-stream {
        animation: wire-stream-forward 3.8s linear infinite;
        will-change: stroke-dashoffset;
      }

      .wire-stream-secondary-0 {
        animation-duration: 4.25s;
      }

      .wire-stream-secondary-1 {
        animation-duration: 4.05s;
      }

      .wire-stream-secondary-2 {
        animation-duration: 3.9s;
      }

      .wire-stream-secondary-3 {
        animation-duration: 4.4s;
      }

      .wire-stream-secondary-4 {
        animation-duration: 4.15s;
      }

      .wire-stream-secondary-5 {
        animation-duration: 3.7s;
      }

      .wire-stream-secondary-6 {
        animation-duration: 4.3s;
      }

      .wire-stream-secondary-7 {
        animation-duration: 3.95s;
      }

      .wire-stream-secondary-8 {
        animation-duration: 4.2s;
      }

      .wire-stream-secondary-9 {
        animation-duration: 3.85s;
      }

      .wire-stream-0 {
        animation-duration: 3.8s;
      }

      .wire-stream-1 {
        animation-duration: 4.15s;
      }

      .wire-stream-2 {
        animation-duration: 3.95s;
      }

      .wire-stream-3 {
        animation-duration: 4.35s;
      }

      .wire-stream-4 {
        animation-duration: 4.05s;
      }

      .wire-stream-5 {
        animation-duration: 3.75s;
      }

      .wire-stream-6 {
        animation-duration: 4.25s;
      }

      .wire-stream-7 {
        animation-duration: 3.9s;
      }

      .wire-stream-8 {
        animation-duration: 4.1s;
      }

      .wire-stream-9 {
        animation-duration: 3.7s;
      }

      @keyframes wire-stream-forward {
        from {
          stroke-dashoffset: 1000;
        }

        to {
          stroke-dashoffset: 0;
        }
      }

      /* -------------------------------------------------------------------- */
      /* Page animations                                                       */
      /* -------------------------------------------------------------------- */

      @keyframes fade-in {
        from {
          opacity: 0;
        }

        to {
          opacity: 1;
        }
      }

      @keyframes fade-up {
        from {
          opacity: 0;
          transform: translateY(24px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slide-down {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes pulse-glow {
        0%,
        100% {
          box-shadow: 0 0 40px rgba(99,180,255,.12);
        }

        50% {
          box-shadow: 0 0 70px rgba(99,180,255,.22);
        }
      }

      .animate-fade-in {
        animation: fade-in 0.7s ease-out both;
      }

      .animate-fade-up {
        animation: fade-up 0.85s cubic-bezier(0.16,1,0.3,1) both;
      }

      .animate-slide-down {
        animation: slide-down 0.65s cubic-bezier(0.16,1,0.3,1) both;
      }

      .animate-card {
        animation: fade-up 0.9s 0.15s cubic-bezier(0.16,1,0.3,1) both;
      }

      .animate-pulse-glow {
        animation: pulse-glow 4s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .wire-stream,
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          scroll-behavior: auto !important;
        }
      }
    `;

    document.head.appendChild(style);

    return () => document.head.removeChild(style);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#02060C] text-white">

      {/* ------------------------------------------------------------------ */}
      {/* Background                                                          */}
      {/* ------------------------------------------------------------------ */}

      <div className="pointer-events-none absolute inset-0 z-0">

        {/* Main radial atmosphere */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(91,164,255,.075),transparent_34%),radial-gradient(circle_at_15%_80%,rgba(116,91,255,.045),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(121,197,255,.045),transparent_26%)]" />

        {/* Same wire field as Register */}
        <div className="absolute inset-x-0 top-[15%] h-[520px] opacity-80">
          <WireField />
        </div>

        {/* Soft central glow */}
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#79C5FF]/[0.025] blur-[110px]" />

        {/* Bottom atmosphere */}
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-[#02060C] via-[#02060C]/70 to-transparent" />

        {/* Top atmosphere */}
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#07101A]/60 to-transparent" />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Navbar                                                              */}
      {/* ------------------------------------------------------------------ */}

      <Navbar />

      {/* ------------------------------------------------------------------ */}
      {/* Main                                                                */}
      {/* ------------------------------------------------------------------ */}

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-16 pt-28 sm:px-6">
        <div className="w-full max-w-[440px] animate-card">

          {/* Card */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.10] bg-[#07101A]/90 p-7 shadow-[0_25px_80px_rgba(0,0,0,.45)] backdrop-blur-xl sm:p-9 animate-pulse-glow">

            {/* Card glow blobs */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#65BFFF]/[0.06] blur-3xl" />

            <div className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-[#A98BFF]/[0.05] blur-3xl" />

            {/* Header */}
            <div className="relative mb-8 text-center">

              <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-[#7FCBFF]/15 bg-[#7FCBFF]/[0.06] text-[#8DD2FF]">
                <Lock className="h-6 w-6" />
              </div>

              <h1 className="text-[28px] font-medium tracking-[-0.04em] text-white">
                Welcome back
              </h1>

              <p className="mt-2 text-[14px] leading-6 text-white/40">
                Sign in to your Employee Copilot account
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="relative space-y-4">

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-white/35"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/25" />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-white/[0.10] bg-white/[0.03] py-3.5 pl-11 pr-4 text-[14px] text-white outline-none transition-all duration-300 placeholder:text-white/25 focus:border-[#7FCBFF]/35 focus:bg-white/[0.05] focus:ring-2 focus:ring-[#7FCBFF]/15 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-white/35"
                >
                  Password
                </label>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/25" />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/[0.10] bg-white/[0.03] py-3.5 pl-11 pr-12 text-[14px] text-white outline-none transition-all duration-300 placeholder:text-white/25 focus:border-[#7FCBFF]/35 focus:bg-white/[0.05] focus:ring-2 focus:ring-[#7FCBFF]/15 disabled:cursor-not-allowed disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60 disabled:cursor-not-allowed"
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group mt-2 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#EAF6FF] py-3.5 text-[15px] font-semibold text-[#06101A] shadow-[0_12px_40px_rgba(110,190,255,.12)] transition-all duration-300 hover:scale-[1.02] hover:bg-white hover:shadow-[0_0_40px_rgba(121,197,255,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#06101A]/30 border-t-[#06101A]" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Register link */}
            <div className="relative mt-7 text-center">
              <p className="text-[14px] text-white/40">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  disabled={loading}
                  className="font-medium text-[#7FCBFF] transition-colors hover:text-[#A5DFFF] disabled:opacity-50"
                >
                  Sign up
                </button>
              </p>
            </div>

            {/* Security note */}
            <div className="relative mt-7 flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#7FCBFF]/50" />

              <p className="text-[11px] leading-5 text-white/30">
                Your account role determines which Employee Copilot
                features you can access.
              </p>
            </div>
          </div>

          {/* Bottom mono tags */}
          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1 font-mono text-[9px] uppercase tracking-[0.16em] text-white/20">
            <span>Permission aware</span>
            <span>Grounded answers</span>
            <span>Secure access</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
