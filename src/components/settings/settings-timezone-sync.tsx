"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updatePreferences } from "@/app/actions/settings";
import type { UserSummary } from "@/lib/types";

/**
 * Uses the browser's IANA timezone (from the OS), not GPS. This is the same
 * detection used by the calendar and needs no location permission.
 */
export function SettingsTimezoneSync({ user }: { user: UserSummary }) {
  const router = useRouter();
  const attempted = React.useRef(false);

  React.useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!detected || detected === user.timezone) return;
      new Intl.DateTimeFormat("en-US", { timeZone: detected });

      void updatePreferences({
        timezone: detected,
        weekStartsOn: user.weekStartsOn,
        theme: user.theme as "light" | "dark" | "system",
      }).then((result) => {
        if (result.ok) router.refresh();
      });
    } catch {
      // Keep the saved timezone if detection is unavailable.
    }
  }, [user.timezone, user.weekStartsOn, user.theme, router]);

  return null;
}
