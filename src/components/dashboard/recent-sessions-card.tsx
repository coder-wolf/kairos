"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { SessionTable } from "@/components/sessions/session-table";
import { useStoredState } from "@/components/dashboard/use-stored-state";
import type { SessionRow } from "@/lib/types";
import { pluralize } from "@/lib/utils";

const INITIAL_VISIBLE = 6;

export function RecentSessionsCard({
  sessions,
  timezone,
}: {
  sessions: SessionRow[];
  timezone: string;
}) {
  const [expanded, setExpanded] = useStoredState("kairos:dashboard:recent-expanded", false);
  const visible = expanded ? sessions : sessions.slice(0, INITIAL_VISIBLE);

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-bold tracking-tight">Recent sessions</h2>
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-muted hover:text-primary"
        >
          All history <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <SessionTable
        sessions={visible}
        timezone={timezone}
        compact
        emptyState={
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-semibold">Your history starts with one session</p>
            <p className="mt-1 text-xs text-muted">Start a timer from the header, or add time retrospectively.</p>
          </div>
        }
      />
      {sessions.length > INITIAL_VISIBLE ? (
        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-[10px] font-bold text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Show fewer sessions
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Show all {sessions.length}{" "}
                {pluralize(sessions.length, "session")}
              </>
            )}
          </button>
        </div>
      ) : null}
    </section>
  );
}
