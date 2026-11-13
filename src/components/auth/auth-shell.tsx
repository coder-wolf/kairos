import Link from "next/link";
import { ArrowUpRight, BarChart3, CheckCircle2, Timer, Target } from "lucide-react";
import { Brand } from "@/components/brand";

const features = [
  {
    icon: Timer,
    title: "Frictionless time tracking",
    body: "Start a timer from anywhere. It keeps running while you move around the app.",
  },
  {
    icon: Target,
    title: "Goals at every level",
    body: "Daily, weekly, or custom targets on any item — parents and children stay independent.",
  },
  {
    icon: BarChart3,
    title: "Analytics that explain",
    body: "See where your time really goes, how your habits hold up, and what to protect.",
  },
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[1.08fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-border bg-surface p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="pointer-events-none absolute inset-0 grid-pattern opacity-70" />
        <div className="pointer-events-none absolute -left-32 top-1/4 h-[420px] w-[420px] rounded-full bg-primary-soft blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[360px] w-[360px] rounded-full bg-[#7dd3fc]/20 blur-3xl" />

        <div className="relative">
          <Brand href="/" />
          <div className="mt-20 max-w-lg">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Time is the unit of progress</p>
            <h1 className="mt-4 text-[52px] leading-[1.02] tracking-[-0.04em] xl:text-[60px]">
              Make room for
              <br />
              what actually
              <br />
              <span className="text-display italic text-primary">matters.</span>
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-7 text-muted">
              Organize your life into any structure you like, attach real time targets to it, and watch your consistency
              add up. No rigid templates. No enterprise time sheets.
            </p>
          </div>

          <div className="mt-12 max-w-md space-y-5">
            {features.map((feature) => (
              <div key={feature.title} className="flex gap-3.5">
                <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface-2">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold">{feature.title}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-muted">{feature.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-12 max-w-md rounded-2xl border border-border bg-surface/90 p-5 shadow-(--shadow-card) backdrop-blur">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">This week</p>
              <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">
                18h 40m <span className="text-sm font-semibold text-muted">tracked</span>
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-[11px] font-bold text-success">
              <ArrowUpRight className="h-3 w-3" /> 12%
            </span>
          </div>
          <div className="mt-5 flex h-16 items-end gap-2">
            {[42, 66, 38, 82, 58, 92, 47].map((height, index) => (
              <div
                key={index}
                className="flex-1 rounded-md bg-primary/75 transition-colors hover:bg-primary"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-muted">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
          <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-[12px] text-muted">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>
              <strong className="font-semibold text-text">Reading</strong> is on a 12-day streak
            </span>
          </div>
        </div>
      </aside>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
        <div className="pointer-events-none absolute inset-0 grid-pattern opacity-40 lg:hidden" />
        <div className="relative w-full max-w-[420px]">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <Brand href="/" />
            <Link href="/" className="text-xs font-semibold text-muted hover:text-text">
              Back home
            </Link>
          </div>
          {children}
          <p className="mt-8 text-center text-[11px] leading-5 text-muted-2">
            Built for people who care where their hours go. Your data stays private to your workspace.
          </p>
        </div>
      </main>
    </div>
  );
}
