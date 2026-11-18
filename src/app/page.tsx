import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarRange,
  Check,
  ChevronDown,
  Flame,
  LineChart,
  Lock,
  MousePointerClick,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Zap,
} from "lucide-react";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://kairos-app.live";
const monthlyPrice = process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE || "$6/mo";
const yearlyPrice = process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE || "$60/yr";

export const metadata: Metadata = {
  title: "Kairos — Time tracking that respects your focus",
  description:
    "Kairos is a calm, dark-mode-first time tracker with one-click timers, a drag-and-drop week calendar, time-based goals, a built-in Pomodoro, and honest analytics. Free to start, no credit card required.",
  keywords: [
    "time tracker",
    "time tracking app",
    "pomodoro timer",
    "time blocking calendar",
    "productivity app",
    "goal tracking",
    "freelance time tracking",
    "personal time management",
  ],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Kairos",
    title: "Kairos — Time tracking that respects your focus",
    description:
      "One-click timers, a drag-and-drop week calendar, goals that roll up across projects, and Pomodoro focus blocks. Free to start.",
    images: [
      {
        url: "/og-kairos.png",
        width: 1200,
        height: 630,
        alt: "Kairos dashboard showing time tracked, goals, and projects",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kairos — Time tracking that respects your focus",
    description:
      "One-click timers, a drag-and-drop week calendar, goals that roll up across projects, and Pomodoro focus blocks. Free to start.",
    images: ["/og-kairos.png"],
  },
};

const features = [
  {
    icon: Timer,
    title: "One-click timers",
    body: "Start tracking in a second. Pause, resume, or switch projects mid-session without losing a second of the clock.",
  },
  {
    icon: CalendarRange,
    title: "Drag-and-drop calendar",
    body: "Draw a block to add time, drag it to move it, right-click to edit. Fixing your week takes seconds, not spreadsheets.",
  },
  {
    icon: Target,
    title: "Goals that roll up",
    body: "Set daily, weekly, or monthly targets across several projects. Progress, pace, and streaks update automatically.",
  },
  {
    icon: Flame,
    title: "Pomodoro built in",
    body: "Run focus and break cycles beside your normal timer, then see every completed block in your history.",
  },
  {
    icon: BarChart3,
    title: "Analytics with context",
    body: "Compare periods, spot your strongest days, and see where hours actually went — down to the minute.",
  },
  {
    icon: ShieldCheck,
    title: "Calm and private",
    body: "Dark mode by default, no gamified noise, and your data stays inside your own workspace.",
  },
];

const steps = [
  {
    icon: Sparkles,
    title: "Set up your workspace",
    body: "Create areas and projects as deep as you need. Kairos keeps every hour attributable to the right place.",
  },
  {
    icon: Play,
    title: "Start a timer",
    body: "Pick a project or choose No project. Add details when you stop — the clock never makes you fill a form first.",
  },
  {
    icon: LineChart,
    title: "Review and adjust",
    body: "Move blocks on the calendar, check analytics, and let goals tell you whether the week matched your intent.",
  },
];

const faqs = [
  {
    question: "Is Kairos free?",
    answer:
      "Yes. The free plan includes core time tracking, a full calendar and history, up to 5 active projects, and 3 active goals. Pro removes those limits and adds Pomodoro and advanced analytics.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "No. Kairos runs entirely in your browser on desktop, tablet, and phone. Open the site, create an account, and start a timer.",
  },
  {
    question: "How is Kairos different from other time trackers?",
    answer:
      "Kairos is built around calm precision: one-click timers that never block you on a project choice, a drag-and-drop week calendar for fixing entries after the fact, and goals that roll up across nested projects automatically.",
  },
  {
    question: "Does Kairos include a Pomodoro timer?",
    answer:
      "Yes. Pro includes focus and break cycles with custom durations, presets, and automatic history. If a Pomodoro is running, the timer page opens straight into it.",
  },
  {
    question: "Can I edit time entries after tracking them?",
    answer:
      "Every entry can be edited, moved, or deleted. Drag blocks on the week calendar, right-click for actions, or open an entry to change its project, start time, duration, or notes.",
  },
  {
    question: "Is my data private?",
    answer:
      "Your sessions, projects, and goals belong to your workspace. Kairos does not sell your data, and exports are available whenever you want a copy.",
  },
];

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Kairos",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Time Tracking",
  operatingSystem: "Web",
  url: appUrl,
  image: `${appUrl}/og-kairos.png`,
  description:
    "A calm, dark-mode-first time tracker with one-click timers, a drag-and-drop week calendar, time-based goals, Pomodoro focus blocks, and honest analytics.",
  featureList: features.map((feature) => feature.title),
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      description: "Core time tracking with up to 5 active projects and 3 active goals.",
      url: `${appUrl}/signup`,
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: monthlyPrice.replace(/[^0-9.]/g, "") || "6",
      priceCurrency: "USD",
      description: "Unlimited projects and goals, Pomodoro, and advanced analytics.",
      url: `${appUrl}/billing`,
    },
  ],
  publisher: {
    "@type": "Organization",
    name: "Kairos",
    url: appUrl,
    logo: `${appUrl}/brand/kairos-mark.png`,
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Kairos",
  url: appUrl,
  description: "Time tracking that respects your focus.",
  inLanguage: "en",
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">{children}</p>
  );
}

function Screenshot({
  src,
  alt,
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_30px_80px_-40px_rgba(10,10,30,0.6)] ${className ?? ""}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <Image
        src={src}
        alt={alt}
        width={1270}
        height={760}
        priority={priority}
        sizes="(min-width: 1024px) 900px, 100vw"
        className="h-auto w-full"
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-bg text-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([websiteJsonLd, softwareJsonLd, faqJsonLd]) }}
      />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-contrast"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Kairos home">
            <Image src="/brand/kairos-mark.png" alt="" width={32} height={32} className="h-8 w-8 rounded-[9px]" />
            <span className="text-[17px] font-extrabold tracking-[-0.03em]">kairos</span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-7 text-[12px] font-semibold text-muted md:flex">
            <a href="#features" className="transition-colors hover:text-text">Features</a>
            <a href="#how-it-works" className="transition-colors hover:text-text">How it works</a>
            <a href="#pricing" className="transition-colors hover:text-text">Pricing</a>
            <a href="#faq" className="transition-colors hover:text-text">FAQ</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-full px-3.5 text-[12px] font-bold text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[12px] font-bold text-primary-contrast shadow-[0_10px_30px_-12px_var(--primary)] transition-transform hover:-translate-y-px"
            >
              Start free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="relative overflow-hidden" aria-labelledby="hero-heading">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 60% 50% at 50% -10%, color-mix(in srgb, var(--primary) 24%, transparent), transparent 70%), radial-gradient(ellipse 40% 40% at 85% 10%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 65%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.25]"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent 75%)",
            }}
          />

          <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-16 md:px-8 md:pb-24 md:pt-24">
            <div className="mx-auto max-w-3xl text-center">
              <p className="motion-safe:animate-rise inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Free to start · no credit card
              </p>
              <h1
                id="hero-heading"
                className="motion-safe:animate-rise mt-6 text-[40px] font-extrabold leading-[1.02] tracking-[-0.05em] md:text-[68px]"
                style={{ animationDelay: "40ms" }}
              >
                Know where your hours
                <br className="hidden sm:block" />{" "}
                <span className="font-serif italic font-normal tracking-[-0.02em] text-primary">actually</span> go.
              </h1>
              <p
                className="motion-safe:animate-rise mx-auto mt-6 max-w-xl text-[15px] leading-7 text-muted md:text-[17px]"
                style={{ animationDelay: "90ms" }}
              >
                Kairos is a calm, dark-mode-first time tracker. Start a timer in one click, fix your week on a
                drag-and-drop calendar, and let goals roll up across projects — without turning tracking into a
                second job.
              </p>
              <div
                className="motion-safe:animate-rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
                style={{ animationDelay: "140ms" }}
              >
                <Link
                  href="/signup"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-7 text-[14px] font-bold text-primary-contrast shadow-[0_18px_50px_-18px_var(--primary)] transition-transform hover:-translate-y-0.5 sm:w-auto"
                >
                  <Play className="h-4 w-4 fill-current" /> Start tracking free
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-border-strong bg-surface/70 px-7 text-[14px] font-bold text-text transition-colors hover:bg-surface-2 sm:w-auto"
                >
                  Log in to your workspace
                </Link>
              </div>
              <p className="mt-4 text-[11px] font-medium text-muted-2">
                30-second setup · Works in your browser · Cancel Pro anytime
              </p>
            </div>

            <div className="motion-safe:animate-rise relative mt-14 md:mt-20" style={{ animationDelay: "200ms" }}>
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-x-10 -top-10 bottom-10 rounded-[40px] opacity-60 blur-3xl"
                style={{ background: "radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--primary) 28%, transparent), transparent 65%)" }}
              />
              <Screenshot
                src="/press/dashboard.png"
                alt="Kairos home dashboard showing projects, weekly time tracked, and a greeting"
                priority
                className="relative mx-auto max-w-5xl"
              />
            </div>

            <dl className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { value: "1 click", label: "to start a timer" },
                { value: "15 min", label: "snap precision on the calendar" },
                { value: "$0", label: "to track your first week" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border bg-surface/60 px-5 py-4 text-center">
                  <dt className="text-[20px] font-extrabold tracking-[-0.03em]">{stat.value}</dt>
                  <dd className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-2">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 border-t border-border/60 bg-surface/30 py-20 md:py-28" aria-labelledby="features-heading">
          <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
            <div className="max-w-2xl">
              <Eyebrow>Everything you need, nothing you don&apos;t</Eyebrow>
              <h2 id="features-heading" className="mt-3 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[42px]">
                Tracking that stays out of your way
              </h2>
              <p className="mt-4 text-[14px] leading-7 text-muted">
                Six deliberate choices that make Kairos feel lighter than the spreadsheet you left behind.
              </p>
            </div>

            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <li key={feature.title} className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-border-strong">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <h3 className="mt-4 text-[14px] font-bold tracking-tight">{feature.title}</h3>
                    <p className="mt-1.5 text-[12.5px] leading-6 text-muted">{feature.body}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="py-20 md:py-28" aria-labelledby="timer-heading">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 md:px-8 lg:grid-cols-2 lg:gap-16">
            <div>
              <Eyebrow>Timer</Eyebrow>
              <h2 id="timer-heading" className="mt-3 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[40px]">
                One clock. Zero friction.
              </h2>
              <p className="mt-4 text-[14px] leading-7 text-muted">
                Pick a project or don&apos;t. Kairos starts the clock first and asks questions later. Pause, resume,
                or switch projects mid-session from the same dial — or from the floating window while you work.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Assign a project later without losing time",
                  "Floating timer that follows you across the app",
                  "Every session saved with second-level precision",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-7 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary hover:underline">
                Start your first timer <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <Screenshot src="/press/timer.png" alt="Kairos timer with a running session, project selector, and session details" />
          </div>
        </section>

        <section className="border-y border-border/60 bg-surface/30 py-20 md:py-28" aria-labelledby="calendar-heading">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 md:px-8 lg:grid-cols-2 lg:gap-16">
            <Screenshot
              src="/press/calendar.png"
              alt="Kairos week calendar with color-coded time blocks across Monday to Sunday"
              className="order-2 lg:order-1"
            />
            <div className="order-1 lg:order-2">
              <Eyebrow>Calendar</Eyebrow>
              <h2 id="calendar-heading" className="mt-3 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[40px]">
                Fix your week in seconds.
              </h2>
              <p className="mt-4 text-[14px] leading-7 text-muted">
                Drag empty space to create an entry. Drag a block to move it. Right-click for edit, delete, or add
                time. Your whole week stays readable at a glance, with second-level detail when you need it.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Drag to create and drag to move time blocks",
                  "Right-click menus for quick edits and deletes",
                  "Day totals, session counts, and a live now line",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] text-muted">
                    <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28" aria-labelledby="goals-heading">
          <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <Eyebrow>Goals &amp; insight</Eyebrow>
              <h2 id="goals-heading" className="mt-3 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[40px]">
                Intent, measured honestly
              </h2>
              <p className="mt-4 text-[14px] leading-7 text-muted">
                Goals can span several projects and roll up automatically. Analytics show the shape of your week —
                strong days, quiet days, and whether the hours matched what you meant to do.
              </p>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              <Screenshot src="/press/analytics.png" alt="Kairos analytics with tracked hours, daily average, active days, and a time trend chart" />
              <Screenshot src="/press/goals.png" alt="Kairos goals spreadsheet with daily targets, streaks, and progress" />
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 border-y border-border/60 bg-surface/30 py-20 md:py-28" aria-labelledby="how-heading">
          <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
            <div className="max-w-2xl">
              <Eyebrow>How it works</Eyebrow>
              <h2 id="how-heading" className="mt-3 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[42px]">
                Three steps, then just live your week
              </h2>
            </div>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li key={step.title} className="relative rounded-2xl border border-border bg-surface p-6">
                    <span className="absolute right-5 top-5 font-mono text-[28px] font-extrabold leading-none text-surface-3">
                      0{index + 1}
                    </span>
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <h3 className="mt-4 text-[14px] font-bold tracking-tight">{step.title}</h3>
                    <p className="mt-1.5 text-[12.5px] leading-6 text-muted">{step.body}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 py-20 md:py-28" aria-labelledby="pricing-heading">
          <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <Eyebrow>Pricing</Eyebrow>
              <h2 id="pricing-heading" className="mt-3 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[42px]">
                Free for the core. Pro when you outgrow it.
              </h2>
              <p className="mt-4 text-[14px] leading-7 text-muted">
                No trial countdown, no credit card to start. Upgrade only when unlimited projects or focus blocks
                start to matter.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-border bg-surface p-7">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-2">Free</p>
                <p className="mt-3 text-[36px] font-extrabold tracking-[-0.04em]">$0</p>
                <p className="mt-1 text-[12px] text-muted">Forever. No card, no expiry.</p>
                <ul className="mt-6 space-y-2.5 border-t border-border pt-6 text-[12.5px] text-muted">
                  {["Unlimited time tracking", "Full week calendar and history", "Up to 5 active projects", "Up to 3 active goals", "Core analytics"].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-full border border-border-strong bg-surface-2 text-[13px] font-bold transition-colors hover:bg-surface-3"
                >
                  Start free
                </Link>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-surface p-7">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl"
                  style={{ background: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
                />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">Kairos Pro</p>
                    <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
                      Most popular
                    </span>
                  </div>
                  <p className="mt-3 text-[36px] font-extrabold tracking-[-0.04em]">{monthlyPrice}</p>
                  <p className="mt-1 text-[12px] text-muted">or {yearlyPrice} billed yearly — cancel anytime.</p>
                  <ul className="mt-6 space-y-2.5 border-t border-border pt-6 text-[12.5px] text-muted">
                    {["Everything in Free", "Unlimited projects and goals", "Pomodoro focus and break cycles", "Advanced analytics and comparisons", "All future Pro features"].map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /> {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className="mt-7 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-primary text-[13px] font-bold text-primary-contrast shadow-[0_16px_40px_-18px_var(--primary)] transition-transform hover:-translate-y-px"
                  >
                    <Zap className="h-3.5 w-3.5" /> Start free, upgrade later
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 border-t border-border/60 bg-surface/30 py-20 md:py-28" aria-labelledby="faq-heading">
          <div className="mx-auto w-full max-w-3xl px-5 md:px-8">
            <div className="text-center">
              <Eyebrow>FAQ</Eyebrow>
              <h2 id="faq-heading" className="mt-3 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[40px]">
                Questions, answered
              </h2>
            </div>
            <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-surface">
              {faqs.map((faq) => (
                <details key={faq.question} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13.5px] font-bold">
                    <h3 className="text-[13.5px] font-bold">{faq.question}</h3>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-2 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-3 pr-8 text-[12.5px] leading-6 text-muted">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-20 md:py-28" aria-labelledby="cta-heading">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 55% 70% at 50% 110%, color-mix(in srgb, var(--primary) 26%, transparent), transparent 70%)",
            }}
          />
          <div className="relative mx-auto w-full max-w-3xl px-5 text-center md:px-8">
            <Pause className="mx-auto h-8 w-8 text-primary" aria-hidden />
            <h2 id="cta-heading" className="mt-5 text-[32px] font-extrabold leading-tight tracking-[-0.04em] md:text-[46px]">
              Your week is already happening.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[14px] leading-7 text-muted">
              Start a timer in the next thirty seconds and see what the week actually looks like.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-7 text-[14px] font-bold text-primary-contrast shadow-[0_18px_50px_-18px_var(--primary)] transition-transform hover:-translate-y-0.5 sm:w-auto"
              >
                Create your free workspace <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 w-full items-center justify-center rounded-full border border-border-strong bg-surface/70 px-7 text-[14px] font-bold transition-colors hover:bg-surface-2 sm:w-auto"
              >
                Log in
              </Link>
            </div>
            <p className="mt-4 text-[11px] font-medium text-muted-2">
              <Lock className="mr-1 inline h-3 w-3" aria-hidden /> Private by default · No credit card · Cancel anytime
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-surface/40">
        <div className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" className="flex items-center gap-2.5" aria-label="Kairos home">
                <Image src="/brand/kairos-mark.png" alt="" width={30} height={30} className="h-[30px] w-[30px] rounded-lg" />
                <span className="text-[16px] font-extrabold tracking-[-0.03em]">kairos</span>
              </Link>
              <p className="mt-3 max-w-xs text-[12px] leading-6 text-muted">
                A calm time tracker for people who care where their hours go. Built dark-first, made to stay out of
                the way.
              </p>
            </div>

            <nav aria-label="Product">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-2">Product</p>
              <ul className="mt-3 space-y-2 text-[12px] font-semibold text-muted">
                <li><a href="#features" className="hover:text-text">Features</a></li>
                <li><a href="#pricing" className="hover:text-text">Pricing</a></li>
                <li><a href="#faq" className="hover:text-text">FAQ</a></li>
                <li><Link href="/calendar" className="hover:text-text">Calendar</Link></li>
              </ul>
            </nav>

            <nav aria-label="Account">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-2">Account</p>
              <ul className="mt-3 space-y-2 text-[12px] font-semibold text-muted">
                <li><Link href="/login" className="hover:text-text">Log in</Link></li>
                <li><Link href="/signup" className="hover:text-text">Create account</Link></li>
                <li><Link href="/forgot-password" className="hover:text-text">Reset password</Link></li>
                <li><Link href="/billing" className="hover:text-text">Billing</Link></li>
              </ul>
            </nav>

            <nav aria-label="Elsewhere">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-2">Elsewhere</p>
              <ul className="mt-3 space-y-2 text-[12px] font-semibold text-muted">
                <li>
                  <a href="https://github.com/coder-wolf/kairos" className="hover:text-text" rel="noreferrer" target="_blank">
                    GitHub
                  </a>
                </li>
                <li><a href="https://www.producthunt.com/posts/kairos-21" className="hover:text-text" rel="noreferrer" target="_blank">Product Hunt</a></li>
                <li><a href={`${appUrl}/sitemap.xml`} className="hover:text-text">Sitemap</a></li>
              </ul>
            </nav>
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-[11px] text-muted-2 sm:flex-row sm:items-center">
            <p>© {new Date().getFullYear()} Kairos. Time well spent.</p>
            <p className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-success" aria-hidden /> Free forever plan · Pro from {monthlyPrice}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
