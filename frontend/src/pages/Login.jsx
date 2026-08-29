
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
/* Wire Frame Background                                                      */
/* -------------------------------------------------------------------------- */

function WireframeBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Main ambient gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(91,164,255,.08),transparent_28%),radial-gradient(circle_at_20%_80%,rgba(116,91,255,.055),transparent_30%)]" />

      {/* Top atmospheric glow */}
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-[#07101A]/70 via-[#07101A]/20 to-transparent" />

      {/* Wireframe SVG */}
      <svg
        className="absolute left-1/2 top-1/2 h-[125%] w-[145%] min-w-[1100px] -translate-x-1/2 -translate-y-1/2 opacity-60"
        viewBox="0 0 1600 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Blue wire gradient */}
          <linearGradient
            id="wireBlue"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor="#7FCBFF" stopOpacity="0" />
            <stop offset="45%" stopColor="#7FCBFF" stopOpacity=".55" />
            <stop offset="100%" stopColor="#A98BFF" stopOpacity="0" />
          </linearGradient>

          {/* Violet wire gradient */}
          <linearGradient
            id="wireViolet"
            x1="0"
            y1="1"
            x2="1"
            y2="0"
          >
            <stop offset="0%" stopColor="#A98BFF" stopOpacity="0" />
            <stop offset="50%" stopColor="#A98BFF" stopOpacity=".42" />
            <stop offset="100%" stopColor="#7FCBFF" stopOpacity="0" />
          </linearGradient>

          {/* Wire glow */}
          <filter
            id="wireGlow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Moving light gradient */}
          <linearGradient id="movingLight">
            <stop offset="0%" stopColor="#7FCBFF" stopOpacity="0" />
            <stop offset="45%" stopColor="#AEE2FF" stopOpacity=".95" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity=".9" />
            <stop offset="100%" stopColor="#7FCBFF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ---------------------------------------------------------------- */}
        {/* Base wireframe network                                           */}
        {/* ---------------------------------------------------------------- */}

        <g stroke="url(#wireBlue)" strokeWidth="1">
          {/* Horizontal perspective wires */}
          <path d="M0 160 L1600 100" />
          <path d="M0 230 L1600 180" />
          <path d="M0 300 L1600 260" />
          <path d="M0 370 L1600 340" />
          <path d="M0 440 L1600 420" />
          <path d="M0 510 L1600 500" />
          <path d="M0 580 L1600 580" />
          <path d="M0 650 L1600 660" />
          <path d="M0 720 L1600 740" />
          <path d="M0 790 L1600 820" />
          <path d="M0 860 L1600 900" />

          {/* Vertical perspective wires */}
          <path d="M80 0 L260 1000" />
          <path d="M220 0 L380 1000" />
          <path d="M360 0 L500 1000" />
          <path d="M500 0 L620 1000" />
          <path d="M640 0 L740 1000" />
          <path d="M780 0 L840 1000" />
          <path d="M920 0 L940 1000" />
          <path d="M1060 0 L1040 1000" />
          <path d="M1200 0 L1140 1000" />
          <path d="M1340 0 L1240 1000" />
          <path d="M1480 0 L1340 1000" />
        </g>

        {/* Secondary wire layer */}
        <g
          stroke="url(#wireViolet)"
          strokeWidth=".7"
          opacity=".7"
        >
          <path d="M0 195 L1600 140" />
          <path d="M0 265 L1600 220" />
          <path d="M0 335 L1600 300" />
          <path d="M0 405 L1600 380" />
          <path d="M0 475 L1600 460" />
          <path d="M0 545 L1600 540" />
          <path d="M0 615 L1600 620" />
          <path d="M0 685 L1600 700" />
          <path d="M0 755 L1600 780" />
          <path d="M0 825 L1600 860" />

          <path d="M150 0 L320 1000" />
          <path d="M290 0 L440 1000" />
          <path d="M430 0 L560 1000" />
          <path d="M570 0 L680 1000" />
          <path d="M710 0 L800 1000" />
          <path d="M850 0 L900 1000" />
          <path d="M990 0 L1000 1000" />
          <path d="M1130 0 L1100 1000" />
          <path d="M1270 0 L1200 1000" />
          <path d="M1410 0 L1300 1000" />
        </g>

        {/* ---------------------------------------------------------------- */}
        {/* Highlighted wire paths                                            */}
        {/* ---------------------------------------------------------------- */}

        <g
          filter="url(#wireGlow)"
          stroke="url(#movingLight)"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path
            d="M0 300 L1600 260"
            strokeDasharray="90 700"
            className="wire-flow wire-flow-one"
          />

          <path
            d="M360 0 L500 1000"
            strokeDasharray="75 850"
            className="wire-flow wire-flow-two"
          />

          <path
            d="M0 650 L1600 660"
            strokeDasharray="110 900"
            className="wire-flow wire-flow-three"
          />

          <path
            d="M1200 0 L1140 1000"
            strokeDasharray="80 800"
            className="wire-flow wire-flow-four"
          />
        </g>

        {/* ---------------------------------------------------------------- */}
        {/* Connection nodes                                                  */}
        {/* ---------------------------------------------------------------- */}

        <g fill="#8BD1FF">
          <circle cx="360" cy="300" r="2" opacity=".55" />
          <circle cx="640" cy="420" r="2" opacity=".4" />
          <circle cx="920" cy="500" r="2.5" opacity=".6" />
          <circle cx="1200" cy="580" r="2" opacity=".45" />
          <circle cx="500" cy="650" r="2" opacity=".4" />
          <circle cx="1040" cy="660" r="2.5" opacity=".5" />
        </g>

        <g fill="#A98BFF">
          <circle cx="780" cy="340" r="1.8" opacity=".4" />
          <circle cx="1140" cy="420" r="2" opacity=".45" />
          <circle cx="620" cy="580" r="1.8" opacity=".35" />
          <circle cx="840" cy="740" r="2" opacity=".4" />
        </g>
      </svg>

      {/* Center soft illumination behind card */}
      <div className="absolute left-1/2 top-1/2 h-[520px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4EA8FF]/[0.035] blur-[100px]" />

      {/* Edge vignette keeps the wireframe subtle */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_15%,rgba(2,6,12,.25)_55%,rgba(2,6,12,.85)_100%)]" />

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#02060C] via-[#02060C]/70 to-transparent" />
    </div>
  );
}

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

      @keyframes wire-flow {
        0% {
          stroke-dashoffset: 1000;
          opacity: 0;
        }

        15% {
          opacity: .2;
        }

        50% {
          opacity: .8;
        }

        85% {
          opacity: .2;
        }

        100% {
          stroke-dashoffset: -1000;
          opacity: 0;
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

      .wire-flow {
        animation: wire-flow 7s linear infinite;
      }

      .wire-flow-two {
        animation-delay: -2s;
      }

      .wire-flow-three {
        animation-delay: -4s;
      }

      .wire-flow-four {
        animation-delay: -5.5s;
      }

      @media (prefers-reduced-motion: reduce) {
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
      {/* ================================================================ */}
      {/* WIREFRAME BACKGROUND                                             */}
      {/* ================================================================ */}

      <WireframeBackground />

      {/* Navbar stays above background */}
      <Navbar />

      {/* ================================================================ */}
      {/* MAIN                                                             */}
      {/* ================================================================ */}

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-16 pt-28 sm:px-6">
        <div className="w-full max-w-[440px] animate-card">
          {/* Card */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.10] bg-[#07101A]/90 p-7 shadow-[0_25px_80px_rgba(0,0,0,.45)] backdrop-blur-xl sm:p-9 animate-pulse-glow">
            {/* Soft glow blobs */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#65BFFF]/[0.06] blur-3xl" />

            <div className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-[#A98BFF]/[0.05] blur-3xl" />

            {/* Header */}
            <div className="relative mb-9 text-center">
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
            <form onSubmit={handleSubmit} className="relative space-y-5">
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
