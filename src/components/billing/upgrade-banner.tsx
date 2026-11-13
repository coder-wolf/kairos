import Link from "next/link";
import { ArrowRight, Crown } from "lucide-react";

export function UpgradeBanner({ message }: { message: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary-soft/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Crown className="h-3.5 w-3.5" />
        </span>
        <p className="text-[12px] font-medium leading-5 text-muted">{message}</p>
      </div>
      <Link
        href="/billing"
        className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-primary hover:underline"
      >
        Upgrade to Pro <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
