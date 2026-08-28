import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  FiActivity,
  FiArrowDown,
  FiArrowRight,
  FiArrowUpRight,
  FiCalendar,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiDatabase,
  FiFileText,
  FiGlobe,
  FiLayers,
  FiLock,
  FiMail,
  FiMenu,
  FiMessageSquare,
  FiMoreHorizontal,
  FiPlay,
  FiSearch,
  FiSend,
  FiShield,
  FiSliders,
  FiHeart,
  FiUsers,
  FiX,
  FiZap,
} from "react-icons/fi";
import {
  SiGmail,
  SiGooglecalendar,
  SiGoogle,
  SiPostgresql,
} from "react-icons/si";

const C = {
  bg: "#05070B",
  surface: "#080C13",
  surface2: "#0C111A",
  line: "rgba(255,255,255,.09)",
  text: "#F5F7FA",
  muted: "#8B93A3",
  blue: "#70BFFF",
  violet: "#A58BFF",
  cyan: "#9DEBFF",
};

const cn = (...x) => x.filter(Boolean).join(" ");

const ease = [0.16, 1, 0.3, 1];

const reveal = {
  hidden: { opacity: 0, y: 34 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
};

function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const visible = useInView(ref, { once: true, amount: 0.12 });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={visible ? "visible" : "hidden"}
      variants={reveal}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.24em] text-[#70BFFF]">
      <span className="h-px w-8 bg-[#70BFFF]/50" />
      {children}
    </div>
  );
}

function Grid({ className = "" }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 opacity-[.22]",
        className
      )}
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)",
        backgroundSize: "72px 72px",
        maskImage: "linear-gradient(to bottom,black,transparent 92%)",
      }}
    />
  );
}

function Glow({ className = "" }) {
  return (
    <motion.div
      className={cn("pointer-events-none absolute rounded-full blur-[120px]", className)}
      animate={{ x: [0, 30, -18, 0], y: [0, -22, 14, 0], scale: [1, 1.08, .96, 1] }}
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function FlowLines({ count = 8, className = "" }) {
  const paths = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const y = 100 + i * 44;
        return `M-80 ${y} C240 ${y - 100}, 300 ${y + 110}, 560 280 S960 ${y - 100}, 1540 ${y + 20}`;
      }),
    [count]
  );

  return (
    <svg
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      viewBox="0 0 1440 620"
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        <linearGradient id="flow" x1="0" x2="1">
          <stop offset="0" stopColor="#70BFFF" stopOpacity="0" />
          <stop offset=".45" stopColor="#70BFFF" stopOpacity=".35" />
          <stop offset=".7" stopColor="#A58BFF" stopOpacity=".65" />
          <stop offset="1" stopColor="#70BFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {paths.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          stroke="url(#flow)"
          strokeWidth={i % 3 === 0 ? 1.6 : 1}
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, delay: i * .06, ease: "easeOut" }}
        />
      ))}
    </svg>
  );
}

function IntelligenceCore({ small = false }) {
  const rings = small ? 3 : 5;
  return (
    <div className={cn("relative aspect-square", small ? "w-40" : "w-[min(68vw,520px)]")}>
      <Glow className="inset-[22%] bg-[#70BFFF]/20" />
      {Array.from({ length: rings }, (_, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full border border-[#70BFFF]/20"
          style={{
            width: `${55 + i * 10}%`,
            height: `${55 + i * 10}%`,
            transform: "translate(-50%,-50%)",
          }}
          animate={{ rotate: i % 2 ? -360 : 360, scale: [1, 1.025, 1] }}
          transition={{
            rotate: { duration: 18 + i * 5, repeat: Infinity, ease: "linear" },
            scale: { duration: 5 + i, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      ))}
      <motion.div
        className="absolute left-1/2 top-1/2 h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,.8),rgba(112,191,255,.32)_15%,rgba(25,48,78,.7)_45%,rgba(5,7,11,.95)_75%)] shadow-[0_0_100px_rgba(112,191,255,.2)]"
        animate={{ y: [0, -10, 5, 0], rotate: [0, 2, -2, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute inset-[22%] rounded-full border border-white/20 bg-[radial-gradient(circle,rgba(165,139,255,.55),transparent_62%)]" />
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_28px_8px_rgba(157,235,255,.55)]" />
      </motion.div>
      {!small && (
        <>
          {[
            ["KNOWLEDGE", "left-[2%] top-[22%]"],
            ["CONTEXT", "right-[1%] top-[34%]"],
            ["MEMORY", "left-[8%] bottom-[18%]"],
            ["ACTIONS", "right-[8%] bottom-[13%]"],
          ].map(([label, pos], i) => (
            <motion.div
              key={label}
              className={cn(
                "absolute rounded-full border border-white/10 bg-[#080C13]/85 px-3 py-1.5 text-[8px] font-semibold tracking-[.18em] text-white/45 backdrop-blur-xl",
                pos
              )}
              animate={{ y: [0, i % 2 ? 5 : -5, 0] }}
              transition={{ duration: 3 + i * .5, repeat: Infinity }}
            >
              {label}
            </motion.div>
          ))}
        </>
      )}
    </div>
  );
}

function MagneticButton({ children, onClick, secondary = false, className = "" }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 20 });
  const sy = useSpring(y, { stiffness: 260, damping: 20 });

  return (
    <motion.button
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * .08);
        y.set((e.clientY - (r.top + r.height / 2)) * .08);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileTap={{ scale: .97 }}
      onClick={onClick}
      className={cn(
        "group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full px-6 py-3.5 text-sm font-semibold transition",
        secondary
          ? "border border-white/12 bg-white/[.035] text-white hover:bg-white/[.07]"
          : "bg-[#F5F7FA] text-[#05070B] shadow-[0_16px_50px_rgba(112,191,255,.15)]",
        className
      )}
    >
      {!secondary && (
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#70BFFF]/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      )}
      <span className="relative">{children}</span>
      <FiArrowRight className="relative transition-transform group-hover:translate-x-1" />
    </motion.button>
  );
}

function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const links = [
    ["Product", "product"],
    ["Capabilities", "capabilities"],
    ["How it works", "how"],
    ["Integrations", "integrations"],
    ["Security", "security"],
  ];

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const go = (id) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.header
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-white/10 bg-[#05070B]/80 shadow-[0_15px_60px_rgba(0,0,0,.35)] backdrop-blur-2xl"
          : "bg-transparent"
      )}
    >
      <div className={cn("mx-auto flex max-w-7xl items-center justify-between px-5 transition-all", scrolled ? "h-16" : "h-20")}>
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center border border-white/15 bg-white/[.04] text-[#70BFFF]">
            <FiLayers />
            <span className="absolute -right-1 -top-1 h-1.5 w-1.5 bg-[#70BFFF]" />
          </span>
          <span className="text-[15px] font-semibold tracking-[-.02em]">
            Employee <span className="text-[#70BFFF]">Copilot</span>
          </span>
        </button>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map(([label, id]) => (
            <button key={id} onClick={() => go(id)} className="px-4 py-2 text-sm text-white/50 transition hover:text-white">
              {label}
            </button>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          <button onClick={() => navigate("/login")} className="text-sm font-medium text-white/55 hover:text-white">
            Sign in
          </button>
          <MagneticButton onClick={() => navigate("/register")}>Get started</MagneticButton>
        </div>

        <button onClick={() => setOpen(!open)} className="lg:hidden flex h-10 w-10 items-center justify-center border border-white/10 bg-white/[.04]">
          {open ? <FiX /> : <FiMenu />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10 bg-[#05070B]/95 backdrop-blur-2xl lg:hidden"
          >
            <div className="flex flex-col p-5">
              {links.map(([label, id]) => (
                <button key={id} onClick={() => go(id)} className="flex items-center justify-between border-b border-white/5 py-4 text-left text-sm text-white/65">
                  {label}<FiChevronRight />
                </button>
              ))}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button onClick={() => navigate("/login")} className="border border-white/10 py-3 text-sm">Sign in</button>
                <button onClick={() => navigate("/register")} className="bg-white py-3 text-sm font-semibold text-black">Get started</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

function Hero() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -110]);
  const opacity = useTransform(scrollYProgress, [0, .85], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen overflow-hidden border-b border-white/10 bg-[#05070B] pt-28 text-white">
      <Grid />
      <Glow className="left-[8%] top-[20%] h-80 w-80 bg-[#70BFFF]/10" />
      <Glow className="right-[8%] top-[30%] h-96 w-96 bg-[#A58BFF]/10" />

      <motion.div style={{ y, opacity }} className="relative z-10 mx-auto max-w-7xl px-5">
        <div className="grid min-h-[calc(100vh-7rem)] items-center gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <div className="pb-16 pt-10 lg:pb-24">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}>
              <SectionLabel>The AI operating layer for work</SectionLabel>
              <h1 className="max-w-4xl text-[clamp(3.5rem,7vw,6.8rem)] font-semibold leading-[.88] tracking-[-.07em]">
                Your entire
                <br />
                workday.
                <br />
                <span className="bg-gradient-to-r from-white via-[#9DDCFF] to-[#A58BFF] bg-clip-text text-transparent">Understood.</span>
              </h1>
              <p className="mt-8 max-w-xl text-base leading-8 text-white/45 sm:text-lg">
                Employee Copilot understands your company knowledge, conversations, workflows and schedule — then helps you find answers and get work done.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <MagneticButton onClick={() => navigate("/register")}>Try Employee Copilot</MagneticButton>
                <MagneticButton secondary onClick={() => document.getElementById("product")?.scrollIntoView({ behavior: "smooth" })}>
                  <FiPlay /> Explore the Copilot
                </MagneticButton>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[9px] font-semibold uppercase tracking-[.16em] text-white/30">
                <span>Permission-aware</span><span>Grounded knowledge</span><span>Action capable</span>
              </div>
            </motion.div>
          </div>

          <div className="relative flex min-h-[520px] items-center justify-center lg:min-h-[650px]">
            <FlowLines className="opacity-60" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <IntelligenceCore />
            </div>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap border border-white/10 bg-[#080C13]/80 px-4 py-2 text-[9px] font-semibold uppercase tracking-[.2em] text-white/35 backdrop-blur-xl">
              Knowledge → Context → Action
            </div>
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-white/25">
        <motion.div animate={{ y: [0, 7, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <FiArrowDown />
        </motion.div>
      </div>
    </section>
  );
}

function Fragmentation() {
  const sources = [
    [FiMail, "Gmail", "184 unread"],
    [FiCalendar, "Calendar", "12 events"],
    [FiFileText, "Documents", "1,248 files"],
    [FiUsers, "HR systems", "Employee data"],
    [FiDatabase, "Knowledge", "34 collections"],
    [FiMessageSquare, "Communication", "126 threads"],
  ];

  return (
    <section id="product" className="relative overflow-hidden bg-[#070A10] py-28 text-white sm:py-40">
      <Grid />
      <div className="relative mx-auto max-w-7xl px-5">
        <div className="grid gap-16 lg:grid-cols-[.8fr_1.2fr]">
          <Reveal>
            <SectionLabel>The old interface</SectionLabel>
            <h2 className="max-w-xl text-5xl font-semibold leading-[.94] tracking-[-.06em] sm:text-7xl">
              Work is
              <br />
              <span className="text-white/35">fragmented.</span>
            </h2>
            <p className="mt-7 max-w-md text-base leading-8 text-white/40">
              Answers live in one place. Context lives somewhere else. Actions are scattered across tools. Employees become the integration layer.
            </p>
          </Reveal>

          <div className="relative min-h-[560px]">
            <div className="absolute left-1/2 top-1/2 h-px w-[75%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="absolute left-1/2 top-1/2 h-[75%] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            {sources.map(([Icon, name, meta], i) => {
              const positions = [
                "left-0 top-4", "right-0 top-16", "left-12 bottom-20",
                "right-8 bottom-8", "left-[38%] top-[20%]", "right-[30%] bottom-[30%]"
              ];
              return (
                <motion.div
                  key={name}
                  className={cn("absolute w-44 border border-white/10 bg-[#080C13]/90 p-4 backdrop-blur-xl sm:w-52", positions[i])}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * .08 }}
                  animate={{ x: [0, i % 2 ? 7 : -7, 0] }}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="text-[#70BFFF]" />
                    <div><div className="text-xs font-semibold">{name}</div><div className="mt-1 text-[9px] text-white/25">{meta}</div></div>
                  </div>
                </motion.div>
              );
            })}
            <motion.div
              className="absolute left-1/2 top-1/2 z-10 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-white/15 bg-[#05070B] text-center shadow-[0_0_80px_rgba(0,0,0,.8)]"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <div><FiMoreHorizontal className="mx-auto mb-2 text-[#70BFFF]" /><span className="text-[9px] uppercase tracking-[.16em] text-white/30">Too much context</span></div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IntelligenceNetwork() {
  const nodes = [
    ["Knowledge", FiDatabase, "Policies, docs, processes"],
    ["Memory", FiClock, "What happened before"],
    ["Context", FiActivity, "What matters now"],
    ["Gmail", SiGmail, "Conversations"],
    ["Calendar", SiGooglecalendar, "Availability"],
    ["Automation", FiZap, "Actions"],
    ["Search", FiSearch, "Company answers"],
    ["HR", FiUsers, "Employee workflows"],
  ];

  return (
    <section id="capabilities" className="relative overflow-hidden border-y border-white/10 bg-[#05070B] py-28 text-white sm:py-40">
      <Glow className="left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 bg-[#70BFFF]/10" />
      <div className="relative mx-auto max-w-7xl px-5">
        <Reveal className="mx-auto max-w-3xl text-center">
          <SectionLabel>One intelligence layer</SectionLabel>
          <h2 className="text-5xl font-semibold leading-[.94] tracking-[-.06em] sm:text-7xl">
            Everything connected.
            <br /><span className="text-white/35">Nothing lost.</span>
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-white/40">
            Employee Copilot sits between the employee and the systems that make work happen.
          </p>
        </Reveal>

        <div className="relative mx-auto mt-20 h-[680px] max-w-5xl overflow-hidden border border-white/10 bg-[#070A10]">
          <Grid />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 680" fill="none">
            {nodes.map((_, i) => {
              const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
              const x = 500 + Math.cos(angle) * 330;
              const y = 340 + Math.sin(angle) * 250;
              return <line key={i} x1="500" y1="340" x2={x} y2={y} stroke="rgba(112,191,255,.16)" strokeWidth="1" />;
            })}
          </svg>
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <IntelligenceCore small />
          </div>
          {nodes.map(([label, Icon, desc], i) => {
            const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + Math.cos(angle) * 39;
            const y = 50 + Math.sin(angle) * 36;
            return (
              <motion.div
                key={label}
                className="absolute w-40 -translate-x-1/2 -translate-y-1/2 border border-white/10 bg-[#080C13]/90 p-3 backdrop-blur-xl sm:w-48"
                style={{ left: `${x}%`, top: `${y}%` }}
                whileHover={{ scale: 1.04, borderColor: "rgba(112,191,255,.4)" }}
              >
                <div className="flex items-center gap-2"><Icon className="text-[#70BFFF]" /><span className="text-xs font-semibold">{label}</span></div>
                <p className="mt-2 text-[9px] leading-4 text-white/25">{desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Thinking() {
  const steps = [
    ["CONTEXT", FiActivity, "Understands the employee, intent and situation."],
    ["MEMORY", FiClock, "Connects previous conversations and decisions."],
    ["KNOWLEDGE", FiDatabase, "Retrieves trusted company information."],
    ["TOOLS", FiSliders, "Checks systems such as Gmail and Calendar."],
    ["ACTION", FiZap, "Turns understanding into useful work."],
  ];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActive((x) => (x + 1) % steps.length), 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="how" className="relative overflow-hidden bg-[#070A10] py-28 text-white sm:py-40">
      <FlowLines count={11} className="opacity-25" />
      <div className="relative mx-auto max-w-7xl px-5">
        <div className="grid items-center gap-16 lg:grid-cols-[.8fr_1.2fr]">
          <Reveal>
            <SectionLabel>The Copilot thinking</SectionLabel>
            <h2 className="text-5xl font-semibold leading-[.95] tracking-[-.06em] sm:text-7xl">
              It doesn't just
              <br /><span className="text-white/35">generate.</span>
              <br />It understands.
            </h2>
            <div className="mt-9 border-l border-white/10 pl-5">
              <div className="text-sm text-white/70">“What's happening with my meetings this week?”</div>
              <div className="mt-3 text-xs leading-6 text-white/30">Copilot maps the request to context, memory, knowledge, tools and action.</div>
            </div>
          </Reveal>

          <div className="relative border border-white/10 bg-[#080C13]/80 p-5 sm:p-8">
            <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-5">
              <div><div className="text-[9px] uppercase tracking-[.2em] text-[#70BFFF]">Reasoning trace</div><div className="mt-1 text-sm font-semibold">Meeting intelligence</div></div>
              <div className="flex items-center gap-2 text-[9px] text-white/25"><span className="h-1.5 w-1.5 rounded-full bg-[#70BFFF] animate-pulse" /> LIVE</div>
            </div>
            <div className="space-y-3">
              {steps.map(([label, Icon, desc], i) => (
                <motion.button
                  key={label}
                  onClick={() => setActive(i)}
                  animate={{ opacity: active === i ? 1 : .45, x: active === i ? 8 : 0 }}
                  className="flex w-full items-center gap-4 border border-white/10 bg-white/[.025] p-4 text-left"
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center border", active === i ? "border-[#70BFFF]/40 bg-[#70BFFF]/10 text-[#70BFFF]" : "border-white/10 text-white/30")}><Icon /></div>
                  <div className="min-w-0 flex-1"><div className="text-[9px] font-bold tracking-[.18em] text-white/35">{label}</div><div className="mt-1 text-xs text-white/60">{desc}</div></div>
                  {active === i && <motion.div layoutId="active-dot" className="h-1.5 w-1.5 bg-[#70BFFF]" />}
                </motion.button>
              ))}
            </div>
            <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
              <span className="text-[9px] uppercase tracking-[.16em] text-white/25">Result</span>
              <span className="flex items-center gap-2 text-[10px] font-semibold text-[#70BFFF]"><FiCheck /> Context assembled</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AskUnderstandAct() {
  const [stage, setStage] = useState(0);
  const stages = [
    { label: "ASK", icon: FiMessageSquare, title: "Schedule a meeting with the design team.", body: "A simple employee request." },
    { label: "UNDERSTAND", icon: FiActivity, title: "Checking availability, context and preferences.", body: "Copilot connects Calendar, recent conversations and team context." },
    { label: "ACT", icon: FiCheck, title: "Meeting scheduled.", body: "The event is created and the relevant people are notified." },
  ];

  useEffect(() => {
    const t = setInterval(() => setStage((x) => (x + 1) % 3), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#05070B] py-28 text-white sm:py-40">
      <div className="mx-auto max-w-7xl px-5">
        <Reveal className="mb-20">
          <SectionLabel>A simpler interface</SectionLabel>
          <h2 className="max-w-5xl text-5xl font-semibold leading-[.9] tracking-[-.07em] sm:text-[7rem]">
            Ask.
            <span className="text-white/20"> Understand.</span>
            <br />
            <span className="bg-gradient-to-r from-[#70BFFF] to-[#A58BFF] bg-clip-text text-transparent">Act.</span>
          </h2>
        </Reveal>

        <div className="grid gap-4 lg:grid-cols-3">
          {stages.map(({ label, icon: Icon, title, body }, i) => (
            <motion.button
              key={label}
              onClick={() => setStage(i)}
              animate={{ opacity: stage === i ? 1 : .48, y: stage === i ? -8 : 0 }}
              className="relative overflow-hidden border border-white/10 bg-[#080C13] p-6 text-left sm:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-[.22em] text-[#70BFFF]">0{i + 1} / {label}</span>
                <Icon className="text-white/30" />
              </div>
              <div className="mt-20 min-h-28">
                <h3 className="text-2xl font-semibold tracking-[-.04em]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/30">{body}</p>
              </div>
              <div className="mt-8 h-px bg-white/10">
                <motion.div animate={{ width: stage === i ? "100%" : "0%" }} transition={{ duration: 2.3 }} className="h-full bg-[#70BFFF]" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Knowledge() {
  const nodes = [
    ["Company Handbook", 18, 26], ["Leave Policy", 36, 42], ["Benefits", 63, 24],
    ["Project Apollo", 75, 53], ["Engineering", 26, 68], ["Finance", 54, 73],
    ["Leadership", 81, 78], ["Processes", 45, 17], ["Team Knowledge", 10, 52],
  ];
  return (
    <section className="relative overflow-hidden bg-[#070A10] py-28 text-white sm:py-40">
      <Grid />
      <div className="relative mx-auto max-w-7xl px-5">
        <div className="grid items-center gap-14 lg:grid-cols-[.75fr_1.25fr]">
          <Reveal>
            <SectionLabel>Company knowledge</SectionLabel>
            <h2 className="text-5xl font-semibold leading-[.93] tracking-[-.06em] sm:text-7xl">
              Your company
              <br /><span className="text-white/35">already knows</span>
              <br />the answer.
            </h2>
            <p className="mt-7 max-w-md text-base leading-8 text-white/40">
              Employee Copilot brings institutional knowledge into the flow of work, with answers grounded in the sources that matter.
            </p>
          </Reveal>
          <div className="relative h-[560px] overflow-hidden border border-white/10 bg-[#05070B]">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle,rgba(112,191,255,.25) 1px,transparent 1px)", backgroundSize: "26px 26px" }} />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {nodes.slice(1).map((n, i) => <line key={i} x1={nodes[0][1]} y1={nodes[0][2]} x2={n[1]} y2={n[2]} stroke="rgba(112,191,255,.13)" strokeWidth=".16" />)}
              {nodes.slice(1, -1).map((n, i) => <line key={`b${i}`} x1={n[1]} y1={n[2]} x2={nodes[i + 2][1]} y2={nodes[i + 2][2]} stroke="rgba(165,139,255,.1)" strokeWidth=".12" />)}
            </svg>
            {nodes.map(([name, x, y], i) => (
              <motion.div
                key={name}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
                animate={{ y: [0, i % 2 ? 5 : -5, 0] }}
                transition={{ duration: 4 + i * .15, repeat: Infinity }}
              >
                <div className="h-2.5 w-2.5 rounded-full border border-[#70BFFF]/70 bg-[#70BFFF]/20 shadow-[0_0_16px_rgba(112,191,255,.4)]" />
                <div className="absolute left-4 top-0 whitespace-nowrap text-[8px] uppercase tracking-[.1em] text-white/35">{name}</div>
              </motion.div>
            ))}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/15 bg-[#080C13]/90 px-5 py-4 backdrop-blur-xl">
              <div className="text-[9px] uppercase tracking-[.2em] text-[#70BFFF]">Knowledge graph</div>
              <div className="mt-1 text-xs text-white/55">248 connected sources</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Memory() {
  const events = [
    ["MON", "Project Apollo", "Budget discussion"],
    ["TUE", "Finance sync", "Follow-up requested"],
    ["WED", "Leadership update", "Deadline Friday"],
    ["THU", "Apollo launch", "Prepare status summary"],
  ];
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#05070B] py-28 text-white sm:py-40">
      <div className="relative mx-auto max-w-7xl px-5">
        <div className="grid gap-16 lg:grid-cols-[1fr_1fr]">
          <Reveal>
            <SectionLabel>Continuity</SectionLabel>
            <h2 className="text-5xl font-semibold leading-[.93] tracking-[-.06em] sm:text-7xl">
              Memory makes
              <br /><span className="text-white/35">context useful.</span>
            </h2>
            <p className="mt-7 max-w-md text-base leading-8 text-white/40">
              Instead of treating every request like a blank page, Copilot can connect what happened before with what needs to happen next.
            </p>
          </Reveal>
          <div className="relative">
            <div className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-transparent via-[#70BFFF]/30 to-transparent" />
            <div className="space-y-4">
              {events.map(([day, title, text], i) => (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * .12 }}
                  className="relative ml-10 border border-white/10 bg-[#080C13] p-5"
                >
                  <span className="absolute -left-[43px] top-6 h-2 w-2 bg-[#70BFFF] shadow-[0_0_16px_rgba(112,191,255,.5)]" />
                  <div className="flex items-center gap-4">
                    <span className="text-[9px] font-bold tracking-[.2em] text-[#70BFFF]">{day}</span>
                    <div><div className="text-sm font-semibold">{title}</div><div className="mt-1 text-xs text-white/30">{text}</div></div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-8 border border-[#70BFFF]/15 bg-[#70BFFF]/[.035] p-5">
              <div className="text-[9px] uppercase tracking-[.18em] text-[#70BFFF]">Context assembled</div>
              <p className="mt-2 text-sm leading-6 text-white/55">“Prepare the Apollo leadership update” can now reference the previous budget discussion, finance follow-up and Friday deadline.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowNode({ icon: Icon, label, title, active }) {
  return (
    <motion.div
      whileHover={{ x: 4 }}
      className={cn(
        "relative border p-4",
        active ? "border-[#70BFFF]/35 bg-[#70BFFF]/[.06]" : "border-white/10 bg-white/[.025]"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center", active ? "bg-[#70BFFF] text-black" : "bg-white/[.05] text-white/35")}><Icon /></div>
        <div><div className="text-[9px] font-semibold uppercase tracking-[.18em] text-white/25">{label}</div><div className="mt-1 text-xs font-semibold text-white/75">{title}</div></div>
      </div>
    </motion.div>
  );
}

function Automation() {
  const [active, setActive] = useState(0);
  const steps = [
    [FiMessageSquare, "INPUT", "Employee request"],
    [FiHeart, "REASON", "AI understands intent"],
    [FiCalendar, "TOOL", "Check Calendar"],
    [FiSearch, "TOOL", "Search knowledge"],
    [FiMail, "ACTION", "Send Gmail"],
    [FiCalendar, "ACTION", "Create event"],
    [FiCheck, "OUTPUT", "Employee notified"],
  ];

  useEffect(() => {
    const t = setInterval(() => setActive((x) => (x + 1) % steps.length), 1100);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="automations" className="relative overflow-hidden bg-[#070A10] py-28 text-white sm:py-40">
      <FlowLines count={7} className="opacity-20" />
      <div className="relative mx-auto max-w-7xl px-5">
        <Reveal className="max-w-3xl">
          <SectionLabel>Automation engine</SectionLabel>
          <h2 className="text-5xl font-semibold leading-[.93] tracking-[-.06em] sm:text-7xl">
            From request
            <br /><span className="text-white/35">to resolution.</span>
          </h2>
          <p className="mt-7 max-w-xl text-base leading-8 text-white/40">The interface is conversational. The work underneath can be a multi-step workflow.</p>
        </Reveal>

        <Reveal className="mt-16" delay=".1">
          <div className="border border-white/10 bg-[#05070B] p-4 sm:p-8">
            <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-5">
              <div><div className="text-[9px] uppercase tracking-[.2em] text-[#70BFFF]">Automation canvas</div><div className="mt-1 text-sm font-semibold">Schedule design review</div></div>
              <div className="flex items-center gap-2 text-[9px] text-white/25"><FiActivity /> RUNNING</div>
            </div>
            <div className="relative">
              <div className="absolute left-6 right-6 top-1/2 hidden h-px bg-gradient-to-r from-[#70BFFF]/30 via-[#A58BFF]/30 to-[#70BFFF]/10 lg:block" />
              <div className="grid gap-3 lg:grid-cols-7">
                {steps.map(([Icon, label, title], i) => (
                  <div key={`${label}-${title}`} className="relative">
                    <WorkflowNode icon={Icon} label={label} title={title} active={active === i} />
                    {i < steps.length - 1 && (
                      <motion.div
                        className="mx-auto my-2 h-4 w-px bg-white/10 lg:hidden"
                        animate={{ opacity: active === i ? 1 : .3 }}
                      />
                    )}
                    {active === i && (
                      <motion.div layoutId="workflow-pulse" className="absolute -right-1 top-1/2 hidden h-2 w-2 rounded-full bg-[#70BFFF] shadow-[0_0_15px_#70BFFF] lg:block" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Integrations() {
  const items = [
    [SiGmail, "Gmail", "Read, draft and act"],
    [SiGooglecalendar, "Google Calendar", "Understand availability"],
    [FiFileText, "Company Docs", "Ground answers"],
    [FiUsers, "HR Systems", "Employee workflows"],
    [SiPostgresql, "Data Layer", "Structured context"],
    [SiGoogle, "Gemini", "AI reasoning"],
  ];

  return (
    <section id="integrations" className="relative overflow-hidden border-y border-white/10 bg-[#05070B] py-28 text-white sm:py-40">
      <div className="relative mx-auto max-w-7xl px-5">
        <Reveal className="mx-auto max-w-3xl text-center">
          <SectionLabel>Connected by design</SectionLabel>
          <h2 className="text-5xl font-semibold tracking-[-.06em] sm:text-7xl">Your stack. One layer.</h2>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-white/40">Employee Copilot works across the systems where employees already spend their day.</p>
        </Reveal>

        <div className="relative mx-auto mt-20 h-[600px] max-w-4xl">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 35, repeat: Infinity, ease: "linear" }} className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }} className="absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#70BFFF]/15 border-dashed" />
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"><IntelligenceCore small /></div>
          {items.map(([Icon, name, desc], i) => {
            const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + Math.cos(angle) * 43;
            const y = 50 + Math.sin(angle) * 42;
            return (
              <motion.div
                key={name}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute z-20 w-36 -translate-x-1/2 -translate-y-1/2 border border-white/10 bg-[#080C13]/90 p-4 backdrop-blur-xl sm:w-44"
                whileHover={{ scale: 1.06, borderColor: "rgba(112,191,255,.4)" }}
              >
                <Icon className="text-lg text-[#70BFFF]" />
                <div className="mt-3 text-xs font-semibold">{name}</div>
                <div className="mt-1 text-[9px] text-white/25">{desc}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Scenarios() {
  const scenarios = [
    ["Prepare me for my next meeting.", "Copilot pulls the agenda, recent email context, related documents and attendee details into one briefing.", FiCalendar],
    ["Find the leave policy.", "Copilot searches company knowledge, identifies the relevant policy and shows the source used.", FiSearch],
    ["Summarize my unread work email.", "Copilot groups important messages, extracts decisions and highlights what needs a response.", FiMail],
    ["What changed while I was away?", "Copilot reconstructs relevant project context from conversations, documents and recent activity.", FiActivity],
  ];
  const [active, setActive] = useState(0);

  return (
    <section className="relative overflow-hidden bg-[#070A10] py-28 text-white sm:py-40">
      <div className="relative mx-auto max-w-7xl px-5">
        <div className="grid gap-14 lg:grid-cols-[.75fr_1.25fr]">
          <Reveal>
            <SectionLabel>Real employee moments</SectionLabel>
            <h2 className="text-5xl font-semibold leading-[.94] tracking-[-.06em] sm:text-7xl">Less searching.<br /><span className="text-white/35">More doing.</span></h2>
            <div className="mt-9 space-y-1">
              {scenarios.map(([q], i) => (
                <button key={q} onClick={() => setActive(i)} className={cn("flex w-full items-center gap-3 border-b border-white/10 py-4 text-left text-sm transition", active === i ? "text-white" : "text-white/30")}>
                  <span className="text-[9px] text-[#70BFFF]">0{i + 1}</span>{q}<FiArrowUpRight className="ml-auto" />
                </button>
              ))}
            </div>
          </Reveal>
          <div className="relative min-h-[480px]">
            <AnimatePresence mode="wait">
              {scenarios.map(([q, answer, Icon], i) => i === active && (
                <motion.div key={q} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 border border-white/10 bg-[#05070B] p-6 sm:p-10">
                  <div className="flex items-center justify-between border-b border-white/10 pb-6">
                    <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center border border-[#70BFFF]/20 bg-[#70BFFF]/[.06] text-[#70BFFF]"><Icon /></div><span className="text-xs font-semibold">Employee Copilot</span></div>
                    <span className="text-[9px] uppercase tracking-[.16em] text-white/20">Contextual response</span>
                  </div>
                  <div className="mt-10 ml-auto max-w-[85%] border border-white/10 bg-white/[.035] p-4 text-sm text-white/65">{q}</div>
                  <div className="mt-5 flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#70BFFF] text-black"><FiLayers /></div>
                    <div className="border border-white/10 bg-white/[.025] p-5">
                      <div className="mb-3 text-[9px] uppercase tracking-[.18em] text-[#70BFFF]">Understood</div>
                      <p className="text-sm leading-7 text-white/55">{answer}</p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {["Context", "Knowledge", "Action"].map((x) => <span key={x} className="border border-white/10 px-3 py-1.5 text-[9px] text-white/30">{x}</span>)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductShowcase() {
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#05070B] py-28 text-white sm:py-40">
      <Glow className="left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 bg-[#70BFFF]/10" />
      <div className="relative mx-auto max-w-7xl px-5">
        <Reveal className="mx-auto max-w-3xl text-center">
          <SectionLabel>Inside the product</SectionLabel>
          <h2 className="text-5xl font-semibold tracking-[-.06em] sm:text-7xl">A workspace built around context.</h2>
          <p className="mx-auto mt-7 max-w-xl text-base leading-8 text-white/40">A real employee experience, not a chatbot window with a new coat of paint.</p>
        </Reveal>

        <Reveal className="mt-16" delay=".1">
          <div className="overflow-hidden border border-white/10 bg-[#080C13] shadow-[0_40px_120px_rgba(0,0,0,.5)]">
            <div className="flex h-12 items-center justify-between border-b border-white/10 px-4 sm:px-6">
              <div className="flex items-center gap-3"><div className="h-2 w-2 bg-[#70BFFF]" /><span className="text-xs font-semibold">Employee Copilot</span></div>
              <div className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-white/10" /><span className="h-2 w-2 rounded-full bg-white/10" /><span className="h-2 w-2 rounded-full bg-white/10" /></div>
            </div>
            <div className="grid min-h-[620px] lg:grid-cols-[180px_1fr_240px]">
              <aside className="hidden border-r border-white/10 p-4 lg:block">
                <div className="mb-5 text-[8px] uppercase tracking-[.2em] text-white/20">Workspace</div>
                {[[FiMessageSquare, "Copilot"], [FiDatabase, "Knowledge"], [FiCalendar, "Calendar"], [FiMail, "Gmail"], [FiZap, "Automations"]].map(([Icon, label], i) => (
                  <div key={label} className={cn("mb-1 flex items-center gap-3 px-3 py-2.5 text-[10px]", i === 0 ? "bg-[#70BFFF]/[.06] text-[#70BFFF]" : "text-white/30")}><Icon />{label}</div>
                ))}
                <div className="my-6 h-px bg-white/10" />
                <div className="text-[8px] uppercase tracking-[.2em] text-white/20">Recent</div>
                <div className="mt-4 space-y-3">{["Leave policy", "Apollo update", "Finance sync"].map((x) => <div key={x} className="text-[9px] text-white/25">{x}</div>)}</div>
              </aside>

              <main className="p-5 sm:p-8">
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                  <div><div className="text-[9px] uppercase tracking-[.18em] text-white/20">Today</div><h3 className="mt-2 text-xl font-semibold">Good morning</h3></div>
                  <div className="hidden items-center gap-2 border border-white/10 px-3 py-2 text-[9px] text-white/30 sm:flex"><FiSearch /> Ask Copilot anything</div>
                </div>
                <div className="mt-8 space-y-5">
                  <div className="ml-auto max-w-[78%] border border-white/10 bg-white/[.04] p-4 text-xs leading-6 text-white/60">Prepare me for my next meeting with the design team.</div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#70BFFF] text-black"><FiLayers /></div>
                    <div className="max-w-xl border border-white/10 bg-white/[.025] p-5">
                      <div className="text-[9px] uppercase tracking-[.18em] text-[#70BFFF]">Meeting brief</div>
                      <p className="mt-3 text-xs leading-6 text-white/55">You have a design review at 2:00 PM. The latest project update mentions the navigation flow and onboarding work. There are two open decisions from the last discussion.</p>
                      <div className="mt-5 grid gap-2 sm:grid-cols-2">
                        {[
                          [FiCalendar, "2:00 PM", "Design review"],
                          [FiMail, "3 threads", "Recent context"],
                          [FiFileText, "4 docs", "Related sources"],
                          [FiCheck, "2 decisions", "Open items"],
                        ].map(([Icon, a, b]) => <div key={a} className="border border-white/10 p-3"><Icon className="text-[#70BFFF]" /><div className="mt-2 text-[10px] font-semibold text-white/60">{a}</div><div className="mt-1 text-[9px] text-white/25">{b}</div></div>)}
                      </div>
                      <div className="mt-5 flex gap-2"><button className="bg-white px-3 py-2 text-[9px] font-semibold text-black">Open brief</button><button className="border border-white/10 px-3 py-2 text-[9px] text-white/45">Draft follow-up</button></div>
                    </div>
                  </div>
                </div>
              </main>

              <aside className="hidden border-l border-white/10 p-5 lg:block">
                <div className="text-[8px] uppercase tracking-[.2em] text-white/20">Context</div>
                <div className="mt-5 space-y-3">
                  {["Calendar", "Gmail", "Project Apollo", "Design team"].map((x, i) => <div key={x} className="border border-white/10 p-3"><div className="text-[9px] text-white/45">{x}</div><div className="mt-1 text-[8px] text-white/20">{i + 2} sources connected</div></div>)}
                </div>
                <div className="mt-8 border border-[#70BFFF]/15 bg-[#70BFFF]/[.035] p-4"><div className="text-[8px] uppercase tracking-[.18em] text-[#70BFFF]">Suggested</div><div className="mt-2 text-[10px] leading-5 text-white/45">Draft a concise agenda from the open decisions.</div></div>
              </aside>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Security() {
  const items = [
    ["Access control", FiUsers], ["Permissions", FiShield], ["Authentication", FiLock],
    ["Data boundaries", FiDatabase], ["Auditability", FiActivity], ["Privacy", FiGlobe],
  ];
  return (
    <section id="security" className="relative overflow-hidden bg-[#070A10] py-28 text-white sm:py-40">
      <Grid />
      <div className="relative mx-auto max-w-7xl px-5">
        <div className="grid items-center gap-16 lg:grid-cols-[.85fr_1.15fr]">
          <Reveal>
            <SectionLabel>Security & control</SectionLabel>
            <h2 className="text-5xl font-semibold leading-[.93] tracking-[-.06em] sm:text-7xl">Intelligence without losing control.</h2>
            <p className="mt-7 max-w-xl text-base leading-8 text-white/40">A workplace AI layer should respect the boundaries already present in your organization.</p>
            <div className="mt-9 grid grid-cols-2 gap-2">
              {items.map(([label, Icon]) => <motion.div key={label} whileHover={{ x: 4 }} className="flex items-center gap-3 border border-white/10 bg-white/[.025] p-3 text-[10px] text-white/45"><Icon className="text-[#70BFFF]" />{label}</motion.div>)}
            </div>
          </Reveal>

          <Reveal delay=".1">
            <div className="relative flex min-h-[560px] items-center justify-center overflow-hidden border border-white/10 bg-[#05070B]">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute h-[420px] w-[420px] rounded-full border border-white/10" />
              <motion.div animate={{ rotate: -360 }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }} className="absolute h-[300px] w-[300px] rounded-full border border-[#70BFFF]/20 border-dashed" />
              <div className="relative z-10 flex h-28 w-28 items-center justify-center border border-[#70BFFF]/30 bg-[#70BFFF]/[.06] text-4xl text-[#70BFFF]"><FiShield /></div>
              {["RBAC", "PRIVATE", "VERIFIED", "AUDIT"].map((x, i) => {
                const p = ["left-[13%] top-[20%]", "right-[12%] top-[26%]", "left-[18%] bottom-[22%]", "right-[15%] bottom-[18%]"][i];
                return <motion.div key={x} className={cn("absolute border border-white/10 bg-[#080C13]/90 px-3 py-2 text-[8px] font-semibold tracking-[.16em] text-white/35", p)} animate={{ y: [0, i % 2 ? 5 : -5, 0] }} transition={{ duration: 4 + i, repeat: Infinity }}>{x}</motion.div>;
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Future() {
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#05070B] py-32 text-white sm:py-52">
      <div className="mx-auto max-w-7xl px-5">
        <Reveal className="text-center">
          <SectionLabel>The interface is changing</SectionLabel>
          <h2 className="text-[clamp(3.2rem,9vw,8.5rem)] font-semibold leading-[.82] tracking-[-.075em]">
            Search
            <br /><span className="text-white/20">becomes</span>
            <br />Understand.
            <br /><span className="text-white/20">Understand becomes</span>
            <br /><span className="bg-gradient-to-r from-[#70BFFF] to-[#A58BFF] bg-clip-text text-transparent">Act.</span>
          </h2>
        </Reveal>
      </div>
    </section>
  );
}

function FinalCTA() {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden bg-[#05070B] py-32 text-white sm:py-48">
      <Grid />
      <Glow className="left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 bg-[#70BFFF]/12" />
      <div className="relative mx-auto max-w-5xl px-5 text-center">
        <IntelligenceCore small />
        <div className="mx-auto mt-10">
          <SectionLabel>Employee Copilot</SectionLabel>
          <h2 className="text-5xl font-semibold tracking-[-.065em] sm:text-7xl">Let work become intelligent.</h2>
          <p className="mx-auto mt-7 max-w-xl text-base leading-8 text-white/40">One layer for company knowledge, context, workflows and action.</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <MagneticButton onClick={() => navigate("/register")}>Start using Employee Copilot</MagneticButton>
            <MagneticButton secondary onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>See how it works</MagneticButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <footer className="border-t border-white/10 bg-[#030509] text-white">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center border border-white/10 text-[#70BFFF]"><FiLayers /></span><span className="font-semibold">Employee <span className="text-[#70BFFF]">Copilot</span></span></div>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/25">The AI operating layer for the employee experience.</p>
          </div>
          {[
            ["Product", [["Capabilities", "capabilities"], ["How it works", "how"], ["Automations", "automations"]]],
            ["Platform", [["Integrations", "integrations"], ["Security", "security"], ["Product", "product"]]],
          ].map(([title, links]) => (
            <div key={title}><div className="mb-5 text-[9px] font-bold uppercase tracking-[.2em] text-white/20">{title}</div>{links.map(([x, id]) => <button key={x} onClick={() => go(id)} className="mb-3 block text-sm text-white/30 hover:text-white">{x}</button>)}</div>
          ))}
          <div><div className="mb-5 text-[9px] font-bold uppercase tracking-[.2em] text-white/20">Technology</div><div className="space-y-3 text-sm text-white/30"><div className="flex items-center gap-2"><SiGoogle /> Gemini</div><div className="flex items-center gap-2"><SiPostgresql /> PostgreSQL</div><div className="flex items-center gap-2"><FiShield /> Permission-aware</div></div></div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-[10px] text-white/20 sm:flex-row sm:justify-between"><span>© 2026 Employee Copilot</span><span>AI + Knowledge + Context + Action</span></div>
      </div>
    </footer>
  );
}

export default function Landing() {
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      html { scroll-behavior: smooth; background: #05070B; }
      body { margin: 0; background: #05070B; }
      ::selection { background: rgba(112,191,255,.25); color: white; }
      button { -webkit-tap-highlight-color: transparent; }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: .01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: .01ms !important;
          scroll-behavior: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#05070B] font-sans text-white">
      <Navbar />
      <main>
        <Hero />
        <Fragmentation />
        <IntelligenceNetwork />
        <Thinking />
        <AskUnderstandAct />
        <Knowledge />
        <Memory />
        <Automation />
        <Integrations />
        <Scenarios />
        <ProductShowcase />
        <Security />
        <Future />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
