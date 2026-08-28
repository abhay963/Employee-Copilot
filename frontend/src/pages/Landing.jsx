import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiActivity,
  FiArrowRight,
  FiArrowUpRight,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiDatabase,
  FiFileText,
  FiLayers,
  FiLock,
  FiMail,
  FiMenu,
  FiMessageSquare,
  FiSearch,
  FiShield,
  FiSliders,
  FiUsers,
  FiX,
  FiZap,
} from "react-icons/fi";
import {
  SiGmail,
  SiGoogle,
  SiGooglecalendar,
  SiPostgresql,
} from "react-icons/si";
import { useState } from "react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

/* -------------------------------------------------------------------------- */
/* Static wire field                                                         */
/* -------------------------------------------------------------------------- */
function WireField({ className = "", variant = "hero" }) {
  const paths =
    variant === "hero"
      ? [
          "M -80 305 C 170 305 270 305 455 305 C 560 305 610 305 690 305 C 810 305 930 305 1100 90 C 1260 -110 1460 -20 1650 45",
          "M -80 295 C 175 295 280 294 455 300 C 565 302 610 303 690 305 C 820 307 950 320 1100 115 C 1270 -80 1480 5 1650 72",
          "M -80 285 C 170 285 290 282 460 296 C 570 305 620 305 690 305 C 830 305 960 350 1110 140 C 1280 -55 1490 35 1650 100",
          "M -80 275 C 170 275 300 270 465 292 C 575 306 625 305 690 305 C 840 305 975 380 1120 165 C 1290 -30 1500 65 1650 130",
          "M -80 335 C 170 335 270 335 455 310 C 560 296 610 305 690 305 C 810 305 930 290 1100 520 C 1260 720 1460 620 1650 555",
          "M -80 345 C 175 345 280 346 455 315 C 565 295 610 305 690 305 C 820 305 950 290 1100 495 C 1270 700 1480 605 1650 528",
          "M -80 355 C 170 355 290 360 460 320 C 570 294 620 305 690 305 C 830 305 960 275 1110 470 C 1280 675 1490 575 1650 500",
          "M -80 365 C 170 365 300 372 465 326 C 575 295 625 305 690 305 C 840 305 975 260 1120 445 C 1290 650 1500 545 1650 472",
          "M -80 315 C 200 315 330 315 470 305 C 570 298 625 305 690 305 C 835 305 980 305 1115 305 C 1300 305 1480 305 1650 305",
          "M -80 265 C 160 265 290 258 460 288 C 575 307 625 305 690 305 C 850 305 1010 410 1160 190 C 1320 -10 1500 95 1650 155",
          "M -80 385 C 160 385 290 392 460 322 C 575 294 625 305 690 305 C 850 305 1010 200 1160 420 C 1320 620 1500 510 1650 440",
        ]
      : [
          "M -50 50 C 230 50 320 250 500 250 S 760 80 1100 80",
          "M -50 80 C 230 80 330 255 500 255 S 780 110 1100 110",
          "M -50 110 C 230 110 340 260 500 260 S 800 140 1100 140",
          "M -50 140 C 230 140 350 265 500 265 S 820 170 1100 170",
          "M -50 170 C 230 170 360 270 500 270 S 840 200 1100 200",
          "M -50 200 C 230 200 370 275 500 275 S 860 230 1100 230",
          "M -50 230 C 230 230 380 280 500 280 S 880 260 1100 260",
          "M -50 260 C 230 260 390 285 500 285 S 900 290 1100 290",
        ];

  const gradientId = `wire-${variant}`;

  /*
   * Every path gets its own seamless dash stream.
   * The path itself never moves; the complete wire pattern is continuously
   * revealed from left -> right. A second dash cycle is already present
   * before the first one finishes, so there is no visible reset/break.
   */
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className
      )}
      viewBox={variant === "hero" ? "0 0 1600 610" : "0 0 1100 320"}
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#72BFFF" stopOpacity="0.02" />
          <stop offset="0.25" stopColor="#72BFFF" stopOpacity="0.22" />
          <stop offset="0.52" stopColor="#72BFFF" stopOpacity="0.72" />
          <stop offset="0.7" stopColor="#A98BFF" stopOpacity="0.78" />
          <stop offset="1" stopColor="#72BFFF" stopOpacity="0.3" />
        </linearGradient>

        <filter id={`wire-glow-${variant}`} x="-20%" y="-100%" width="140%" height="300%">
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
            strokeWidth={i === 8 && variant === "hero" ? 1.35 : 0.9}
            opacity={variant === "hero" ? (i % 3 === 0 ? 0.28 : 0.16) : 0.12}
          />

          {/* Each individual wire has its own infinite moving section */}
          <path
            d={d}
            stroke={`url(#${gradientId})`}
            strokeWidth={i === 8 && variant === "hero" ? 2 : 1.35}
            strokeLinecap="round"
            pathLength="1000"
            strokeDasharray="150 850"
            strokeDashoffset="0"
            opacity={variant === "hero" ? 0.8 : 0.55}
            filter={`url(#wire-glow-${variant})`}
            className={`wire-stream wire-stream-${i}`}
          />

          {/* Second overlapping stream removes any visible gap at reset */}
          <path
            d={d}
            stroke={`url(#${gradientId})`}
            strokeWidth={i === 8 && variant === "hero" ? 1.1 : 0.8}
            strokeLinecap="round"
            pathLength="1000"
            strokeDasharray="150 850"
            strokeDashoffset="-500"
            opacity={variant === "hero" ? 0.38 : 0.22}
            className={`wire-stream wire-stream-secondary-${i}`}
          />
        </g>
      ))}
    </svg>
  );
}

function SectionEyebrow({ children }) {
  return (
    <div className="mb-5 flex items-center gap-3 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[#7FCBFF]">
      <span className="h-px w-8 bg-[#7FCBFF]/50" />
      {children}
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/[0.05] text-[#8BD1FF]">
        <FiLayers className="text-lg" />
      </div>
      <div className="text-[15px] font-semibold tracking-[-0.02em]">
        Employee <span className="text-[#78C5FF]">Copilot</span>
      </div>
    </div>
  );
}

function Navbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = [
    ["Product", "product"],
    ["Capabilities", "capabilities"],
    ["How it works", "how"],
    ["Integrations", "integrations"],
  ];

  const go = (id) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <div className="mx-auto flex h-[62px] max-w-[1400px] items-center justify-between rounded-2xl border border-white/[0.10] bg-[#03070D]/90 px-4 shadow-[0_15px_60px_rgba(0,0,0,.35)] backdrop-blur-xl sm:px-6">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <Logo />
        </button>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map(([label, id]) => (
            <button
              key={id}
              onClick={() => go(id)}
              className="flex items-center gap-1 rounded-lg px-4 py-2.5 text-[13px] font-medium text-white/55 transition hover:bg-white/[0.05] hover:text-white"
            >
              {label}
              {label !== "How it works" && <FiChevronDown className="text-[11px] text-white/30" />}
            </button>
          ))}
          <button
            onClick={() => go("security")}
            className="rounded-lg px-4 py-2.5 text-[13px] font-medium text-white/55 transition hover:bg-white/[0.05] hover:text-white"
          >
            Security
          </button>
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          <button
            onClick={() => navigate("/login")}
            className="rounded-xl px-4 py-2.5 text-[13px] font-medium text-white/65 hover:text-white"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate("/register")}
            className="rounded-xl bg-[#EDF7FF] px-5 py-2.5 text-[13px] font-semibold text-[#07101A] transition hover:bg-white"
          >
            Get started <FiArrowUpRight className="ml-1 inline" />
          </button>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] lg:hidden"
        >
          {open ? <FiX /> : <FiMenu />}
        </button>
      </div>

      {open && (
        <div className="mx-auto mt-2 max-w-[1400px] rounded-2xl border border-white/10 bg-[#03070D]/95 p-3 backdrop-blur-xl lg:hidden">
          {links.map(([label, id]) => (
            <button
              key={id}
              onClick={() => go(id)}
              className="flex w-full items-center justify-between border-b border-white/[0.06] px-3 py-4 text-left text-sm text-white/70"
            >
              {label}
              <FiArrowRight className="text-white/30" />
            </button>
          ))}
          <button
            onClick={() => go("security")}
            className="flex w-full items-center justify-between px-3 py-4 text-left text-sm text-white/70"
          >
            Security
            <FiArrowRight className="text-white/30" />
          </button>
          <div className="grid grid-cols-2 gap-2 p-2 pt-3">
            <button onClick={() => navigate("/login")} className="rounded-xl border border-white/10 py-3 text-sm">
              Sign in
            </button>
            <button onClick={() => navigate("/register")} className="rounded-xl bg-white py-3 text-sm font-semibold text-black">
              Get started
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[850px] overflow-hidden border-b border-white/[0.07] bg-[#02060C] pt-28 text-white lg:min-h-screen">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_48%,rgba(91,164,255,.08),transparent_24%),radial-gradient(circle_at_25%_70%,rgba(116,91,255,.045),transparent_25%)]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#07101A]/60 to-transparent" />

      <div className="absolute right-[-6%] top-[110px] h-[620px] w-[76%] opacity-90 lg:right-[-4%] lg:w-[72%]">
        <WireField />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-7rem)] max-w-[1400px] items-center px-5 pb-20 lg:grid-cols-[0.88fr_1.12fr] lg:px-10">
        <div className="relative z-10 max-w-[720px] pt-10 lg:pt-0">
        

          <h1 className="max-w-[780px] text-[clamp(3.8rem,7.7vw,7.9rem)] font-medium leading-[0.86] tracking-[-0.065em]">
            Your entire
            <br />
            workday,
            <br />
            <span className="text-[#79C5FF]">understood.</span>
          </h1>

          <p className="mt-9 max-w-[610px] text-[17px] leading-7 text-[#B9C9D9]/60 sm:text-[19px] sm:leading-8">
            Employee Copilot brings company knowledge, conversations, schedules and workflows into one intelligent workspace — so employees can ask, understand and act without switching tools.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => navigate("/register")}
              className="group inline-flex items-center justify-center gap-3 rounded-xl bg-[#EAF6FF] px-6 py-3.5 text-[15px] font-semibold text-[#06101A] shadow-[0_12px_45px_rgba(110,190,255,.12)] transition hover:bg-white"
            >
              Start building
              <FiArrowRight className="transition group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => document.getElementById("product")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center justify-center gap-3 rounded-xl border border-white/12 bg-white/[0.025] px-6 py-3.5 text-[15px] font-medium text-white/75 transition hover:bg-white/[0.06] hover:text-white"
            >
              Explore the product
              <FiArrowUpRight />
            </button>
          </div>

          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[9px] uppercase tracking-[0.16em] text-white/25">
            <span>Permission aware</span>
            <span>Grounded answers</span>
            <span>Action capable</span>
          </div>
        </div>

        <div className="relative hidden min-h-[580px] lg:block" aria-hidden="true">
          <div className="absolute right-[5%] top-1/2 h-[440px] w-[440px] -translate-y-1/2 rounded-full border border-[#7FCBFF]/10" />
          <div className="absolute right-[10%] top-1/2 h-[330px] w-[330px] -translate-y-1/2 rounded-full border border-[#A98BFF]/10" />
          <div className="absolute right-[18%] top-1/2 grid h-[205px] w-[205px] -translate-y-1/2 place-items-center rounded-full border border-white/12 bg-[#07101A]/80 shadow-[0_0_90px_rgba(99,180,255,.12)] backdrop-blur-xl">
            <div className="grid h-[130px] w-[130px] place-items-center rounded-full border border-[#7FCBFF]/15 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,.5),rgba(115,194,255,.18),rgba(4,8,14,.9)_70%)]">
              <FiActivity className="text-3xl text-[#A5DFFF]" />
            </div>
          </div>
          <div className="absolute right-[9%] top-[28%] rounded-xl border border-white/10 bg-[#07101A]/80 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-white/35 backdrop-blur-xl">
            Context assembled
          </div>
          <div className="absolute right-[30%] bottom-[20%] rounded-xl border border-white/10 bg-[#07101A]/80 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#86CEFF]/50 backdrop-blur-xl">
            Knowledge → Action
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.06] bg-[#030810]/70">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 divide-x divide-white/[0.06] sm:grid-cols-4">
          {[
            [FiMessageSquare, "One interface", "Ask naturally"],
            [FiDatabase, "Grounded", "Use trusted knowledge"],
            [FiZap, "Actionable", "Complete real work"],
            [FiLock, "Permission-aware", "Respect access"],
          ].map(([Icon, title, sub]) => (
            <div key={title} className="flex items-center gap-3 px-4 py-4 sm:px-6">
              <Icon className="shrink-0 text-[#7FCBFF]/70" />
              <div>
                <div className="text-[11px] font-semibold text-white/65">{title}</div>
                <div className="mt-0.5 text-[10px] text-white/25">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



function Capabilities() {
  const agents = [
    [SiGmail, "Gmail AI", "Understands conversations", "cyan"],
    [SiGooglecalendar, "Calendar AI", "Finds time and conflicts", "violet"],
    [FiDatabase, "Knowledge AI", "Retrieves trusted answers", "cyan"],
    [FiZap, "Workflow AI", "Executes multi-step work", "violet"],
    [FiUsers, "HR AI", "Handles employee context", "cyan"],
    [FiSearch, "Search AI", "Finds company information", "violet"],
  ];

  return (
    <section id="capabilities" className="relative overflow-hidden border-b border-white/[0.07] bg-[#02060C] py-28 text-white sm:py-36">
      <WireField variant="network" className="opacity-30" />
      <div className="relative mx-auto max-w-[1400px] px-5 lg:px-10">
        <div className="max-w-3xl">
          <SectionEyebrow>Intelligence layer</SectionEyebrow>
          <h2 className="text-[clamp(2.8rem,6vw,5.6rem)] font-medium leading-[0.88] tracking-[-0.065em]">
            One brain.
            <br />
            <span className="text-[#79C5FF]">Many capabilities.</span>
          </h2>
          <p className="mt-7 max-w-xl text-[17px] leading-8 text-white/38">
            Specialized intelligence works behind one simple interface. Each capability contributes context while the employee experiences one coherent Copilot.
          </p>
        </div>

        <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map(([Icon, title, body, color]) => (
            <div key={title} className="relative rounded-2xl border border-white/[0.08] bg-[#07101A]/90 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className={cn("grid h-10 w-10 place-items-center rounded-xl border", color === "cyan" ? "border-[#7FCBFF]/15 bg-[#7FCBFF]/[0.05] text-[#8BD3FF]" : "border-[#A98BFF]/15 bg-[#A98BFF]/[0.05] text-[#B8A5FF]") }>
                  <Icon />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/80">{title}</h3>
                  <p className="mt-1 text-[11px] text-white/25">{body}</p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.16em] text-white/20">
                <span className="h-1.5 w-1.5 rounded-full bg-[#79C5FF]/70" />
                Connected
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    ["01", "ASK", FiMessageSquare, "Describe what you need in plain language."],
    ["02", "UNDERSTAND", FiActivity, "Copilot gathers intent, history and relevant context."],
    ["03", "GROUND", FiDatabase, "Trusted company sources keep the answer relevant."],
    ["04", "ACT", FiZap, "Connected tools turn the result into real work."],
  ];

  const nodes = [
    { name: "Gmail", icon: SiGmail, position: "left-[4%] top-[12%]" },
    { name: "Calendar", icon: SiGooglecalendar, position: "right-[4%] top-[12%]" },
    { name: "Company Docs", icon: FiFileText, position: "left-[0%] top-[44%]" },
    { name: "HR Data", icon: FiUsers, position: "right-[0%] top-[44%]" },
    { name: "Search", icon: FiSearch, position: "left-[8%] bottom-[8%]" },
    { name: "Workflow", icon: FiZap, position: "right-[8%] bottom-[8%]" },
  ];

  return (
    <section
      id="how"
      className="relative overflow-hidden border-b border-white/[0.07] bg-[#02060C] py-28 text-white sm:py-36"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[650px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#79C5FF]/[0.035] blur-[150px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage:
              "radial-gradient(circle at center, black 0%, transparent 72%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-5 lg:px-10">

        {/* HEADER */}
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <SectionEyebrow>How it works</SectionEyebrow>

            <h2 className="mt-5 text-[clamp(3.5rem,7vw,7rem)] font-medium leading-[0.82] tracking-[-0.075em]">
              Ask.
              <br />
              <span className="text-white/[0.18]">Understand.</span>
              <br />
              <span className="bg-gradient-to-r from-[#79C5FF] via-[#B8E2FF] to-[#79C5FF] bg-clip-text text-transparent">
                Act.
              </span>
            </h2>
          </div>

          <div className="max-w-2xl lg:justify-self-end">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-14 bg-[#79C5FF]/50" />

              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#79C5FF]/55">
                Intelligence orchestration
              </span>
            </div>

            <p className="text-[19px] leading-8 text-white/40 sm:text-[21px] sm:leading-9">
              One intelligent layer connects conversations, company knowledge,
              employee context and tools — turning a simple request into
              grounded action.
            </p>
          </div>
        </div>

        {/* NETWORK */}
        <div className="relative mt-20 h-[620px] overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#03080F] sm:h-[700px]">

          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#79C5FF]/[0.035] blur-[100px]" />
          </div>

          {/* CONNECTIONS */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 1200 700"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id="lineGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#79C5FF" stopOpacity="0" />
                <stop offset="50%" stopColor="#79C5FF" stopOpacity=".4" />
                <stop offset="100%" stopColor="#79C5FF" stopOpacity="0" />
              </linearGradient>

              <filter id="particleGlow">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path d="M105 120 C300 150 390 260 600 350" fill="none" stroke="url(#lineGradient)" strokeWidth="1.2" />
            <path d="M1095 120 C900 150 810 260 600 350" fill="none" stroke="url(#lineGradient)" strokeWidth="1.2" />
            <path d="M65 350 C270 350 370 350 600 350" fill="none" stroke="url(#lineGradient)" strokeWidth="1.2" />
            <path d="M1135 350 C930 350 830 350 600 350" fill="none" stroke="url(#lineGradient)" strokeWidth="1.2" />
            <path d="M150 600 C310 540 420 430 600 350" fill="none" stroke="url(#lineGradient)" strokeWidth="1.2" />
            <path d="M1050 600 C890 540 780 430 600 350" fill="none" stroke="url(#lineGradient)" strokeWidth="1.2" />

            <circle r="3" fill="#A8DFFF" filter="url(#particleGlow)">
              <animateMotion dur="3.5s" repeatCount="indefinite" path="M105 120 C300 150 390 260 600 350" />
            </circle>

            <circle r="3" fill="#79C5FF" filter="url(#particleGlow)">
              <animateMotion dur="4s" begin="1s" repeatCount="indefinite" path="M1095 120 C900 150 810 260 600 350" />
            </circle>

            <circle r="2.5" fill="#B8A5FF" filter="url(#particleGlow)">
              <animateMotion dur="3.8s" begin=".5s" repeatCount="indefinite" path="M65 350 C270 350 370 350 600 350" />
            </circle>

            <circle r="3" fill="#79C5FF" filter="url(#particleGlow)">
              <animateMotion dur="4.2s" begin="1.7s" repeatCount="indefinite" path="M1135 350 C930 350 830 350 600 350" />
            </circle>

            <circle r="2.5" fill="#A8DFFF" filter="url(#particleGlow)">
              <animateMotion dur="4.5s" begin="1.2s" repeatCount="indefinite" path="M150 600 C310 540 420 430 600 350" />
            </circle>

            <circle r="3" fill="#B8A5FF" filter="url(#particleGlow)">
              <animateMotion dur="4.5s" begin="2.4s" repeatCount="indefinite" path="M1050 600 C890 540 780 430 600 350" />
            </circle>
          </svg>

          {/* RANDOM PARTICLES */}
          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: 35 }).map((_, i) => (
              <span
                key={i}
                className="absolute h-[2px] w-[2px] rounded-full bg-[#79C5FF]/40 animate-[floatParticle_5s_ease-in-out_infinite]"
                style={{
                  left: `${6 + ((i * 31) % 88)}%`,
                  top: `${6 + ((i * 47) % 88)}%`,
                  animationDelay: `${(i % 9) * 0.55}s`,
                  opacity: 0.2 + (i % 4) * 0.12,
                }}
              />
            ))}
          </div>

          {/* CENTER LLM */}
          <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">

            <div className="absolute -inset-28 rounded-full border border-white/[0.035] animate-[pulseRing_4s_ease-in-out_infinite]" />
            <div className="absolute -inset-20 rounded-full border border-[#79C5FF]/[0.06] animate-[pulseRing_4s_ease-in-out_infinite_1s]" />
            <div className="absolute -inset-10 rounded-full border border-[#79C5FF]/[0.1]" />
            <div className="absolute -inset-14 animate-[spin_16s_linear_infinite] rounded-full border border-dashed border-[#79C5FF]/[0.12]" />

            <div className="relative grid h-44 w-44 place-items-center rounded-full border border-[#79C5FF]/20 bg-[#07111B]/95 shadow-[0_0_100px_rgba(121,197,255,0.12)] backdrop-blur-xl sm:h-52 sm:w-52">

              <div className="absolute inset-3 rounded-full border border-white/[0.04]" />

              <div className="absolute inset-8 rounded-full bg-[#79C5FF]/[0.035] shadow-[inset_0_0_50px_rgba(121,197,255,0.08)]" />

              <div className="relative text-center">
                <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border border-[#79C5FF]/20 bg-[#79C5FF]/[0.07] shadow-[0_0_35px_rgba(121,197,255,0.14)]">
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#79C5FF] shadow-[0_0_18px_#79C5FF]" />
                </div>

                <div className="font-mono text-[12px] uppercase tracking-[0.24em] text-white/45">
                  LLM
                </div>

                <div className="mt-2 text-[13px] text-white/25">
                  Intelligence Core
                </div>
              </div>
            </div>
          </div>

          {/* NODES */}
          {nodes.map(({ name, icon: Icon, position }) => (
            <div
              key={name}
              className={`absolute ${position} z-30`}
            >
              <div className="group flex flex-col items-center gap-3">

                <div className="relative">
                  <div className="absolute -inset-4 rounded-2xl bg-[#79C5FF]/[0.03] opacity-0 blur-xl transition-all duration-500 group-hover:opacity-100" />

                  <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.1] bg-[#07101A]/95 text-white/45 shadow-[0_15px_40px_rgba(0,0,0,.3)] backdrop-blur-md transition-all duration-500 group-hover:-translate-y-1 group-hover:border-[#79C5FF]/30 group-hover:text-[#79C5FF] sm:h-16 sm:w-16">
                    <Icon className="text-lg sm:text-xl" />
                  </div>

                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#03080F] bg-[#79C5FF]/80" />
                </div>

                <div className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.16em] text-white/30 transition-colors group-hover:text-white/60">
                  {name}
                </div>
              </div>
            </div>
          ))}

          {/* STATUS */}
          <div className="absolute left-7 top-7 z-30 flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.025] px-4 py-2 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#79C5FF]/50" />
              <span className="relative h-2 w-2 rounded-full bg-[#79C5FF]" />
            </span>

            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
              Copilot online
            </span>
          </div>

          {/* BOTTOM LABEL */}
          <div className="absolute bottom-7 left-1/2 z-30 w-[calc(100%-48px)] -translate-x-1/2 text-center">
            <div className="mx-auto max-w-md rounded-2xl border border-white/[0.07] bg-[#050B12]/85 px-6 py-4 backdrop-blur-xl">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#79C5FF]/55">
                Context → Intelligence → Action
              </div>
            </div>
          </div>
        </div>

        {/* STEPS */}
        <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">

          {steps.map(([num, label, Icon, body]) => (
            <div
              key={label}
              className="group relative bg-[#050A11] p-7 transition-all duration-500 hover:bg-[#07111A]"
            >
              <div className="mb-9 flex items-center justify-between">
                <span className="font-mono text-[11px] tracking-[0.18em] text-[#79C5FF]/40">
                  {num}
                </span>

                <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/[0.07] bg-white/[0.02] text-[#79C5FF]/55 transition-all duration-500 group-hover:border-[#79C5FF]/20 group-hover:bg-[#79C5FF]/[0.05] group-hover:text-[#79C5FF]">
                  <Icon className="text-sm" />
                </div>
              </div>

              <div className="font-mono text-[11px] font-medium tracking-[0.2em] text-white/50 transition-colors group-hover:text-white/75">
                {label}
              </div>

              <p className="mt-4 text-[14px] leading-6 text-white/30">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulseRing {
          0%, 100% {
            transform: scale(0.96);
            opacity: 0.3;
          }

          50% {
            transform: scale(1.04);
            opacity: 0.8;
          }
        }

        @keyframes floatParticle {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }

          25% {
            transform: translate3d(12px, -18px, 0);
          }

          50% {
            transform: translate3d(-8px, -30px, 0);
          }

          75% {
            transform: translate3d(18px, -10px, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .network-line,
          .particle,
          [class*="animate-"] {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}



function Automation() {
  const steps = [
    [FiMessageSquare, "INPUT", "Employee request"],
    [FiActivity, "REASON", "Understand intent"],
    [FiCalendar, "TOOL", "Check Calendar"],
    [FiSearch, "TOOL", "Search knowledge"],
    [FiMail, "ACTION", "Send Gmail"],
    [FiCalendar, "ACTION", "Create event"],
    [FiCheck, "OUTPUT", "Employee notified"],
  ];

  return (
    <section id="automations" className="relative overflow-hidden border-b border-white/[0.07] bg-[#040911] py-28 text-white sm:py-36">
      <WireField className="top-10 h-[420px] opacity-35" />
      <div className="relative mx-auto max-w-[1400px] px-5 lg:px-10">
        <div className="max-w-3xl">
          <SectionEyebrow>Automation engine</SectionEyebrow>
          <h2 className="text-[clamp(2.8rem,5.7vw,5.4rem)] font-medium leading-[0.9] tracking-[-0.06em]">
            From request
            <br />
            <span className="text-white/25">to resolution.</span>
          </h2>
          <p className="mt-7 max-w-xl text-[17px] leading-8 text-white/35">
            The interface is conversational. The work underneath can be a multi-step workflow that gathers context, calls tools and produces a useful result.
          </p>
        </div>

        <div className="relative mt-14 overflow-hidden rounded-2xl border border-white/[0.09] bg-[#02060C] p-4 sm:p-7">
          <div className="mb-7 flex items-center justify-between border-b border-white/[0.08] pb-5">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#7FCBFF]">Automation canvas</div>
              <div className="mt-1 text-sm font-semibold text-white/75">Schedule design review</div>
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-white/25">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7FCBFF]/70" />
              Workflow ready
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-7 right-7 top-[52px] hidden h-px bg-gradient-to-r from-[#7FCBFF]/10 via-[#7FCBFF]/40 to-[#A98BFF]/20 lg:block" />
            <div className="grid gap-3 lg:grid-cols-7">
              {steps.map(([Icon, label, title], i) => (
                <div key={`${label}-${title}`} className="relative rounded-xl border border-white/[0.07] bg-[#07101A] p-4">
                  <div className="relative z-10 grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-[#0A141F] text-[#85D0FF]">
                    <Icon className="text-sm" />
                  </div>
                  <div className="mt-6 font-mono text-[8px] uppercase tracking-[0.15em] text-white/20">{label}</div>
                  <div className="mt-1 text-[12px] font-medium leading-5 text-white/65">{title}</div>
                  <div className="mt-5 h-1 rounded-full bg-white/[0.05]">
                    <div className={cn("h-full rounded-full", i % 2 ? "w-2/3 bg-[#A98BFF]/35" : "w-full bg-[#7FCBFF]/35")} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}



function Scenarios() {
  const scenarios = [
    [
      "Prepare me for my next meeting.",
      "Calendar, recent email, documents and attendee context become one concise briefing.",
      FiCalendar,
    ],
    [
      "Find the leave policy.",
      "Search company knowledge and surface the relevant policy with grounded context.",
      FiSearch,
    ],
    [
      "Summarize my unread work email.",
      "Group important conversations, identify actions and highlight what needs attention.",
      FiMail,
    ],
    [
      "Schedule a review with the design team.",
      "Check availability, use team context and create the meeting when the right time is found.",
      FiClock,
    ],
  ];

  return (
    <section
      className="relative overflow-hidden border-b border-white/[0.07] bg-[#03070D] py-28 text-white sm:py-36"
    >
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[15%] top-[20%] h-[450px] w-[450px] rounded-full bg-[#79C5FF]/[0.025] blur-[130px] animate-[ambientMove_12s_ease-in-out_infinite]" />
        <div className="absolute bottom-[10%] right-[10%] h-[400px] w-[400px] rounded-full bg-[#9B8CFF]/[0.02] blur-[130px] animate-[ambientMove_15s_ease-in-out_infinite_reverse]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            maskImage:
              "radial-gradient(circle at center, black, transparent 75%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-5 lg:px-10">

        {/* HEADER */}
        <div className="max-w-4xl">
          <div className="animate-[fadeUp_.8s_ease-out_both]">
            <SectionEyebrow>Built for everyday work</SectionEyebrow>
          </div>

          <h2 className="mt-5 text-[clamp(3.2rem,6vw,6.2rem)] font-medium leading-[0.84] tracking-[-0.07em] animate-[fadeUp_.9s_.1s_ease-out_both]">
            Useful from the
            <br />
            <span className="bg-gradient-to-r from-[#79C5FF] via-[#B8E2FF] to-[#79C5FF] bg-clip-text text-transparent">
              first question.
            </span>
          </h2>

          <p className="mt-7 max-w-2xl text-[17px] leading-8 text-white/30 animate-[fadeUp_.9s_.2s_ease-out_both]">
            From finding information to completing real work, Copilot turns
            everyday requests into intelligent workflows.
          </p>
        </div>

        {/* SCENARIO GRID */}
        <div className="mt-16 grid gap-4 lg:grid-cols-2">
          {scenarios.map(([title, body, Icon], i) => (
            <div
              key={title}
              className="group relative min-h-[340px] overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#07101A]/90 p-7 opacity-0 backdrop-blur-xl transition-all duration-700 hover:-translate-y-2 hover:border-[#79C5FF]/20 hover:bg-[#08131E] sm:p-8"
              style={{
                animation: "scenarioIn .8s cubic-bezier(.16,1,.3,1) forwards",
                animationDelay: `${250 + i * 120}ms`,
              }}
            >
              {/* Card hover light */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#79C5FF]/[0.035] blur-[80px] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

              {/* Animated border */}
              <div className="pointer-events-none absolute inset-0 rounded-[26px] opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <div className="absolute left-0 top-0 h-px w-1/2 bg-gradient-to-r from-transparent via-[#79C5FF]/50 to-transparent animate-[scan_2.5s_linear_infinite]" />
              </div>

              {/* Header */}
              <div className="relative flex items-start justify-between">
                <div className="relative">
                  <div className="absolute -inset-3 rounded-2xl bg-[#79C5FF]/[0.04] blur-xl opacity-0 transition-all duration-500 group-hover:opacity-100" />

                  <div className="relative grid h-12 w-12 place-items-center rounded-xl border border-white/[0.09] bg-white/[0.025] text-[#82CFFF]/70 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:border-[#79C5FF]/25 group-hover:bg-[#79C5FF]/[0.06] group-hover:text-[#79C5FF] group-hover:shadow-[0_0_30px_rgba(121,197,255,.12)]">
                    <Icon className="text-[18px]" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] tracking-[0.18em] text-white/15 transition-colors group-hover:text-[#79C5FF]/40">
                    0{i + 1}
                  </span>

                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#79C5FF]/30" />
                    <span className="relative h-2 w-2 rounded-full bg-[#79C5FF]/40 transition-colors group-hover:bg-[#79C5FF]" />
                  </span>
                </div>
              </div>

              {/* Question */}
              <div className="relative mt-12">
                <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-[#79C5FF]/35">
                  Employee request
                </div>

                <h3 className="max-w-xl text-[24px] font-medium leading-[1.25] tracking-[-0.035em] text-white/75 transition-all duration-500 group-hover:translate-x-1 group-hover:text-white sm:text-[27px]">
                  “{title}”
                </h3>
              </div>

              {/* Description */}
              <p className="relative mt-5 max-w-xl text-[15px] leading-7 text-white/28 transition-colors duration-500 group-hover:text-white/40">
                {body}
              </p>

              {/* Bottom workflow */}
              <div className="absolute bottom-7 left-7 right-7 sm:left-8 sm:right-8">
                <div className="mb-4 h-px w-full bg-white/[0.06]">
                  <div className="h-full w-0 bg-gradient-to-r from-[#79C5FF]/60 to-transparent transition-all duration-1000 group-hover:w-full" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-[#7FCBFF]/40 transition-all duration-500 group-hover:text-[#7FCBFF]/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#79C5FF]/50 group-hover:animate-pulse" />
                    Intelligent workflow
                  </div>

                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.07] text-white/20 transition-all duration-500 group-hover:translate-x-1 group-hover:border-[#79C5FF]/20 group-hover:text-[#79C5FF]">
                    <FiArrowRight className="text-xs" />
                  </div>
                </div>
              </div>

              {/* Floating particles */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-0 transition-opacity duration-700 group-hover:opacity-100">
                <span className="absolute left-[25%] top-[30%] h-1 w-1 rounded-full bg-[#79C5FF]/50 animate-[particle_3s_ease-in-out_infinite]" />
                <span className="absolute left-[65%] top-[45%] h-1 w-1 rounded-full bg-[#79C5FF]/30 animate-[particle_4s_.5s_ease-in-out_infinite]" />
                <span className="absolute left-[80%] top-[25%] h-1 w-1 rounded-full bg-[#A98BFF]/40 animate-[particle_3.5s_1s_ease-in-out_infinite]" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom signal */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-white/[0.08]" />

          <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-2 backdrop-blur-md">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#79C5FF]" />
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/25">
              Every request becomes context
            </span>
          </div>

          <span className="h-px w-16 bg-gradient-to-l from-transparent to-white/[0.08]" />
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(28px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scenarioIn {
          from {
            opacity: 0;
            transform: translateY(35px) scale(.97);
            filter: blur(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes scan {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(250%);
          }
        }

        @keyframes particle {
          0%, 100% {
            transform: translate(0, 0);
            opacity: .2;
          }
          50% {
            transform: translate(25px, -30px);
            opacity: .8;
          }
        }

        @keyframes ambientMove {
          0%, 100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(60px, -40px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
}



function FinalCTA() {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden bg-[#03070D] py-32 text-white sm:py-44">
      <WireField className="opacity-25" />
      <div className="relative mx-auto max-w-[1000px] px-5 text-center">
        <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7FCBFF]" />
          Employee Copilot
        </div>
        <h2 className="text-[clamp(3rem,7vw,7rem)] font-medium leading-[0.84] tracking-[-0.07em]">
          Work should feel
          <br />
          <span className="text-[#79C5FF]">connected.</span>
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-[17px] leading-8 text-white/35">
          Give employees one intelligent layer for company knowledge, communication, planning and action.
        </p>
        <button
          onClick={() => navigate("/register")}
          className="mt-9 inline-flex items-center gap-3 rounded-xl bg-[#EDF7FF] px-7 py-4 text-[15px] font-semibold text-[#06101A] transition hover:bg-white"
        >
          Get started
          <FiArrowRight />
        </button>
      </div>
    </section>
  );
}

function Footer() {
  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <footer className="border-t border-white/[0.07] bg-[#02050A] text-white">
      <div className="mx-auto max-w-[1400px] px-5 py-12 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/25">
              An intelligent operating layer for everyday employee work.
            </p>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/20">Product</div>
            <div className="mt-4 space-y-3 text-sm text-white/35">
              <button className="block hover:text-white" onClick={() => go("product")}>Overview</button>
              <button className="block hover:text-white" onClick={() => go("capabilities")}>Capabilities</button>
              <button className="block hover:text-white" onClick={() => go("integrations")}>Integrations</button>
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/20">Platform</div>
            <div className="mt-4 space-y-3 text-sm text-white/35">
              <button className="block hover:text-white" onClick={() => go("how")}>How it works</button>
              <button className="block hover:text-white" onClick={() => go("automations")}>Automations</button>
              <button className="block hover:text-white" onClick={() => go("security")}>Security</button>
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/20">Get started</div>
            <div className="mt-4 space-y-3 text-sm text-white/35">
              <button className="block hover:text-white" onClick={() => window.location.href = "/login"}>Sign in</button>
              <button className="block hover:text-white" onClick={() => window.location.href = "/register"}>Create account</button>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col justify-between gap-3 border-t border-white/[0.06] pt-6 text-[10px] text-white/20 sm:flex-row">
          <span>© {new Date().getFullYear()} Employee Copilot</span>
          <span>Knowledge · Context · Reasoning · Action</span>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
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
      .wire-stream {
        animation: wire-stream-forward 3.8s linear infinite;
        will-change: stroke-dashoffset;
      }

      .wire-stream-secondary-0 { animation-duration: 4.25s; }
      .wire-stream-secondary-1 { animation-duration: 4.05s; }
      .wire-stream-secondary-2 { animation-duration: 3.9s; }
      .wire-stream-secondary-3 { animation-duration: 4.4s; }
      .wire-stream-secondary-4 { animation-duration: 4.15s; }
      .wire-stream-secondary-5 { animation-duration: 3.7s; }
      .wire-stream-secondary-6 { animation-duration: 4.3s; }
      .wire-stream-secondary-7 { animation-duration: 3.95s; }
      .wire-stream-secondary-8 { animation-duration: 4.2s; }
      .wire-stream-secondary-9 { animation-duration: 3.85s; }
      .wire-stream-secondary-10 { animation-duration: 4.35s; }

      .wire-stream-0 { animation-duration: 3.8s; }
      .wire-stream-1 { animation-duration: 4.15s; }
      .wire-stream-2 { animation-duration: 3.95s; }
      .wire-stream-3 { animation-duration: 4.35s; }
      .wire-stream-4 { animation-duration: 4.05s; }
      .wire-stream-5 { animation-duration: 3.75s; }
      .wire-stream-6 { animation-duration: 4.25s; }
      .wire-stream-7 { animation-duration: 3.9s; }
      .wire-stream-8 { animation-duration: 4.1s; }
      .wire-stream-9 { animation-duration: 3.7s; }
      .wire-stream-10 { animation-duration: 4.3s; }

      @keyframes wire-stream-forward {
        from {
          stroke-dashoffset: 1000;
        }
        to {
          stroke-dashoffset: 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .wire-stream {
          animation: none;
        }
      }


      /* The entire wire field travels as one continuous strip. Two copies are
         joined edge-to-edge, so the loop never exposes an empty frame. */
      .wire-marquee {
        animation: wire-infinite 18s linear infinite;
        will-change: transform;
      }

      @keyframes wire-infinite {
        from { transform: translate3d(0, 0, 0); }
        to { transform: translate3d(calc(var(--wire-width) * -1), 0, 0); }
      }

      @media (prefers-reduced-motion: reduce) {
        .wire-marquee { animation: none; }
      }

      ::selection { background: rgba(121,197,255,.22); color: white; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#02060C] font-sans text-white">
      <Navbar />
      <main>
        <Hero />
       
        <Capabilities />
        <HowItWorks />
   
        <Automation />
       
        <Scenarios />
      
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
