import Link from "next/link";
import { Check, Crown, Sparkles } from "lucide-react";

export function ProGate({
  title,
  description,
  features = [],
}: {
  title: string;
  description: string;
  features?: string[];
}) {
  return (
    <section className="card relative overflow-hidden p-6 md:p-10">
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-40" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary-soft blur-3xl" />
      <div className="relative max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
          <Crown className="h-3 w-3" /> Kairos Pro
        </span>
        <h2 className="mt-4 text-[28px] font-extrabold leading-tight tracking-[-0.035em] md:text-[36px]">
          {title}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">{description}</p>

        {features.length > 0 ? (
          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-[12px] text-muted">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                {feature}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-7 flex flex-wrap items-center gap-2">
          <Link
            href="/billing"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            <Sparkles className="h-4 w-4" /> Upgrade to Pro
          </Link>
          <span className="text-[11px] text-muted-2">Monthly and yearly plans available.</span>
        </div>
      </div>
    </section>
  );
}
