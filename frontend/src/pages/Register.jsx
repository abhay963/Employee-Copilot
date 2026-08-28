import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Mail,
  User,
  Building,
  AlertCircle,
  Shield,
  Briefcase,
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
            onClick={() => navigate("/login")}
            className="rounded-xl bg-[#EDF7FF] px-5 py-2.5 text-[13px] font-semibold text-[#07101A] transition-all duration-300 hover:bg-white hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(121,197,255,0.25)]"
          >
            Sign in <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" />
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
              navigate("/login");
              setOpen(false);
            }}
            className="flex w-full items-center justify-between px-3 py-4 text-left text-sm text-white/70"
          >
            Sign in
            <ArrowRight className="h-4 w-4 text-white/30" />
          </button>
        </div>
      )}
    </header>
  );
}

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "employee",
    department: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const { register } = useUser();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleChange = (role) => {
    setFormData((prev) => ({
      ...prev,
      role,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    if (!formData.department.trim()) {
      toast.error("Please enter your department.");
      return;
    }

    if (!formData.password) {
      toast.error("Please enter a password.");
      return;
    }

    if (!formData.confirmPassword) {
      toast.error("Please confirm your password.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Z]/.test(formData.password)) {
      toast.error("Password must contain at least one uppercase letter.");
      return;
    }

    if (!/[a-z]/.test(formData.password)) {
      toast.error("Password must contain at least one lowercase letter.");
      return;
    }

    if (!/[0-9]/.test(formData.password)) {
      toast.error("Password must contain at least one number.");
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      toast.error("Password must contain at least one special character.");
      return;
    }

    if (!["employee", "hr"].includes(formData.role)) {
      toast.error("Please select a valid role.");
      return;
    }

    setLoading(true);

    try {
      const response = await register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role.toLowerCase(),
        department: formData.department.trim(),
      });

      console.log("Registration response:", response);

      if (
        !response ||
        !response.success ||
        !response.token ||
        !response.user
      ) {
        throw new Error(
          response?.error || "Registration failed. Please try again."
        );
      }

      const role = response.user.role?.toLowerCase();

      console.log("Registered user:", response.user);
      console.log("Registered user role:", role);

      if (role === "hr") {
        toast.success(
          "Account created successfully! Welcome to Employee Copilot."
        );
        navigate("/hr-dashboard", { replace: true });
        return;
      }

      if (role === "employee") {
        toast.success(
          "Account created successfully! Welcome to Employee Copilot."
        );
        navigate("/employee-dashboard", { replace: true });
        return;
      }

      toast.error("Your account has an invalid role. Please contact HR.");
    } catch (err) {
      console.error("Registration error:", err);

      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.error ||
        err?.message ||
        "Registration failed. Please try again.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap');
      
      html { scroll-behavior: smooth; background: #02060C; }
      body {
        margin: 0;
        background: #02060C;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }
      button { -webkit-tap-highlight-color: transparent; }
      ::selection { background: rgba(121,197,255,.22); color: white; }

      @keyframes fade-in {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes fade-up {
        from { opacity: 0; transform: translateY(24px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes slide-down {
        from { opacity: 0; transform: translateY(-20px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 40px rgba(99,180,255,.12); }
        50%      { box-shadow: 0 0 70px rgba(99,180,255,.22); }
      }

      .animate-fade-in    { animation: fade-in 0.7s ease-out both; }
      .animate-fade-up    { animation: fade-up 0.85s cubic-bezier(0.16,1,0.3,1) both; }
      .animate-slide-down { animation: slide-down 0.65s cubic-bezier(0.16,1,0.3,1) both; }
      .animate-card       { animation: fade-up 0.9s 0.15s cubic-bezier(0.16,1,0.3,1) both; }
      .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#02060C] text-white">
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_15%,rgba(91,164,255,.07),transparent_28%),radial-gradient(circle_at_20%_85%,rgba(116,91,255,.04),transparent_25%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#07101A]/50 to-transparent" />

      <Navbar />

      {/* Main */}
      <div className="relative flex min-h-screen items-center justify-center px-4 pb-16 pt-28 sm:px-6">
        <div className="w-full max-w-[480px] animate-card">
          {/* Card */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.10] bg-[#07101A]/90 p-7 shadow-[0_25px_80px_rgba(0,0,0,.45)] backdrop-blur-xl sm:p-9 animate-pulse-glow">
            {/* Soft glow blobs */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#65BFFF]/[0.06] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-[#A98BFF]/[0.05] blur-3xl" />

            {/* Header */}
            <div className="relative mb-8 text-center">
              <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-[#7FCBFF]/15 bg-[#7FCBFF]/[0.06] text-[#8DD2FF]">
                <User className="h-6 w-6" />
              </div>

              <h1 className="text-[28px] font-medium tracking-[-0.04em] text-white">
                Create account
              </h1>
              <p className="mt-2 text-[14px] leading-6 text-white/40">
                Join Employee Copilot today
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="relative space-y-4">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-white/35"
                >
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/25" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="John Doe"
                    className="w-full rounded-xl border border-white/[0.10] bg-white/[0.03] py-3.5 pl-11 pr-4 text-[14px] text-white outline-none transition-all duration-300 placeholder:text-white/25 focus:border-[#7FCBFF]/35 focus:bg-white/[0.05] focus:ring-2 focus:ring-[#7FCBFF]/15 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

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

              {/* Role */}
              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleRoleChange("employee")}
                    disabled={loading}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border-2 py-3.5 text-[13px] font-medium transition-all duration-300 disabled:cursor-not-allowed",
                      formData.role === "employee"
                        ? "border-[#7FCBFF]/50 bg-[#7FCBFF]/[0.08] text-[#A5DFFF]"
                        : "border-white/[0.10] bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white/70"
                    )}
                  >
                    <Briefcase className="h-4 w-4" />
                    Employee
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange("hr")}
                    disabled={loading}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border-2 py-3.5 text-[13px] font-medium transition-all duration-300 disabled:cursor-not-allowed",
                      formData.role === "hr"
                        ? "border-[#A98BFF]/50 bg-[#A98BFF]/[0.08] text-[#C4B0FF]"
                        : "border-white/[0.10] bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white/70"
                    )}
                  >
                    <Shield className="h-4 w-4" />
                    HR
                  </button>
                </div>
              </div>

              {/* Department */}
              <div>
                <label
                  htmlFor="department"
                  className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-white/35"
                >
                  Department
                </label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/25" />
                  <input
                    id="department"
                    name="department"
                    type="text"
                    required
                    value={formData.department}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Engineering"
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
                    autoComplete="new-password"
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
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60 disabled:cursor-not-allowed"
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] leading-4 text-white/25">
                  8+ chars · uppercase · lowercase · number · special character
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-white/35"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/25" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/[0.10] bg-white/[0.03] py-3.5 pl-11 pr-12 text-[14px] text-white outline-none transition-all duration-300 placeholder:text-white/25 focus:border-[#7FCBFF]/35 focus:bg-white/[0.05] focus:ring-2 focus:ring-[#7FCBFF]/15 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    disabled={loading}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60 disabled:cursor-not-allowed"
                  >
                    {showConfirmPassword ? (
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
                className="group mt-2 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#EAF6FF] py-3.5 text-[15px] font-semibold text-[#06101A] shadow-[0_12px_40px_rgba(110,190,255,.12)] transition-all duration-300 hover:bg-white hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(121,197,255,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#06101A]/30 border-t-[#06101A]" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Login link */}
            <div className="relative mt-7 text-center">
              <p className="text-[14px] text-white/40">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  disabled={loading}
                  className="font-medium text-[#7FCBFF] transition-colors hover:text-[#A5DFFF] disabled:opacity-50"
                >
                  Sign in
                </button>
              </p>
            </div>

            {/* Security note */}
            <div className="relative mt-7 flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#7FCBFF]/50" />
              <p className="text-[11px] leading-5 text-white/30">
                Your selected role determines which Employee Copilot features and data you can access.
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

export default Register;