"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-danger-soft text-danger">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h1 className="mt-5 text-xl font-extrabold tracking-[-0.03em]">Something didn&apos;t load</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Your data is safe. Try this view again — if it keeps failing, reload the page.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    </div>
  );
}
