"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Uses the browser's IANA timezone (from the OS), not GPS. This needs no
 * permission prompt and reflects where the user is currently working.
 */
export function TimezoneSync({ week, timezone }: { week: string; timezone: string }) {
  const router = useRouter();

  React.useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!detected || detected === timezone) return;
      const params = new URLSearchParams({ week, tz: detected });
      router.replace(`/timer?${params.toString()}`);
    } catch {
      // Keep the saved timezone if detection is unavailable.
    }
  }, [week, timezone, router]);

  return null;
}
