import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path
        d="M10.5 22.5V9.5M10.5 16l7.2-6.5M10.5 16l7.4 6.5"
        stroke="var(--primary-contrast)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23.2" cy="9.2" r="2.1" fill="var(--accent)" />
    </svg>
  );
}

export function Brand({
  compact = false,
  className,
  href = "/dashboard",
}: {
  compact?: boolean;
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5", className)}>
      <BrandMark size={compact ? 28 : 32} className="transition-transform duration-300 group-hover:-rotate-6" />
      {!compact ? (
        <span className="text-[17px] font-extrabold tracking-[-0.03em]">
          kairos
        </span>
      ) : null}
    </Link>
  );
}
