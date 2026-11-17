"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { syncTimezone } from "@/app/actions/settings";

/**
 * Uses the browser's IANA timezone (from the OS), not GPS. This needs no
 * permission prompt and reflects where the user is currently working. The
 * detected timezone is also saved, so time entries created from the calendar
 * are interpreted in the same timezone the calendar renders in.
 */
export function TimezoneSync({ week, timezone }: { week: string; timezone: string }) {
  const router = useRouter();

  React.useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!detected || detected === timezone) return;
      void syncTimezone(detected).catch(() => {});
      const params = new URLSearchParams({ week, tz: detected });
      router.replace(`/calendar?${params.toString()}`);
    } catch {
      // Keep the saved timezone if detection is unavailable.
    }
  }, [week, timezone, router]);

  return null;
}
