import Link from "next/link";
import { BrandMark } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6">
      <div className="max-w-md text-center">
        <BrandMark size={40} className="mx-auto" />
        <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-2">404 · Off the map</p>
        <h1 className="mt-3 text-[36px] font-extrabold leading-tight tracking-[-0.04em]">
          This page isn&apos;t here
          <span className="text-primary">.</span>
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The item may have been moved, archived, or deleted — or the link was never quite right.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            Back to Home
          </Link>
          <Link
            href="/workspace"
            className="inline-flex h-10 items-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold transition-colors hover:bg-surface-2"
          >
            Open projects
          </Link>
        </div>
      </div>
    </div>
  );
}
