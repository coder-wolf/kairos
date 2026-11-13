import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, History, Timer, TrendingUp } from "lucide-react";
import { HistoryControls } from "@/components/history/history-controls";
import { SessionTable } from "@/components/sessions/session-table";
import { Badge } from "@/components/ui/badge";
import { totalSeconds } from "@/lib/analytics";
import { getAppContext, toItemOptions, toSessionRows } from "@/lib/dal";
import { getSubtreeIds } from "@/lib/items";
import { getSessionsWindow } from "@/lib/queries";
import {
  addMonthsToKey,
  dayLabel,
  getDateRange,
  splitSessionByLocalDay,
  toDateKey,
  weekdayOfKey,
} from "@/lib/time";
import { formatDuration, pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Time History" };

const PAGE_SIZE = 25;

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(`${month}-01T12:00:00Z`),
  );
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    view?: string;
    item?: string;
    source?: string;
    q?: string;
    day?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const { user, items } = await getAppContext();
  const tz = user.timezone;
  const now = new Date();
  const todayKey = toDateKey(now, tz);

  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : todayKey.slice(0, 7);
  const view = params.view === "calendar" ? "calendar" : "list";
  const itemId = params.item;
  const source = params.source;
  const query = params.q?.trim().toLowerCase();
  const day = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const monthStartKey = `${month}-01`;
  const nextMonthKey = addMonthsToKey(month, 1);
  const monthStart = getDateRange("custom", tz, user.weekStartsOn, { from: monthStartKey, to: monthStartKey, now }).start;
  const nextMonthStart = getDateRange("custom", tz, user.weekStartsOn, {
    from: `${nextMonthKey}-01`,
    to: `${nextMonthKey}-01`,
    now,
  }).start;
  const monthEnd = nextMonthStart;

  const selectedItem = itemId ? items.find((item) => item.id === itemId) : null;
  const subtree = selectedItem ? getSubtreeIds(items, selectedItem.id) : null;

  const rawSessions = await getSessionsWindow(user.workspace.id, monthStart, monthEnd);
  const filtered = rawSessions.filter((session) => {
    if (subtree && !subtree.has(session.itemId)) return false;
    if (source && session.source !== source) return false;
    if (query) {
      const haystack = `${session.description ?? ""} ${session.item.name}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const dayTotals = new Map<string, number>();
  const daySessions = new Map<string, Array<(typeof filtered)[number]>>();
  for (const session of filtered) {
    let touchesSelectedDay = false;
    for (const segment of splitSessionByLocalDay(session.startTime, session.endTime, tz)) {
      if (segment.start < monthStart || segment.start >= monthEnd) continue;
      dayTotals.set(segment.dayKey, (dayTotals.get(segment.dayKey) ?? 0) + segment.seconds);
      if (day && segment.dayKey === day) touchesSelectedDay = true;
    }
    if (day && touchesSelectedDay) {
      const list = daySessions.get(day) ?? [];
      list.push(session);
      daySessions.set(day, list);
    }
  }

  const monthTotal = totalSeconds(filtered, monthStart, monthEnd);
  const activeDays = Array.from(dayTotals.values()).filter((seconds) => seconds > 0).length;
  const averagePerDay = activeDays > 0 ? monthTotal / activeDays : 0;

  const listSessions = day ? (daySessions.get(day) ?? []) : filtered;
  const totalPages = Math.max(1, Math.ceil(listSessions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSessions = listSessions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const dayRange = day
    ? getDateRange("custom", tz, user.weekStartsOn, { from: day, to: day, now })
    : null;
  const dayTotal = day && dayRange ? totalSeconds(filtered, dayRange.start, dayRange.end) : 0;

  const [monthYear, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(monthYear, monthNumber, 0)).getUTCDate();
  const firstWeekday = weekdayOfKey(monthStartKey);
  const leading = (firstWeekday - user.weekStartsOn + 7) % 7;
  const maxDaySeconds = Math.max(1, ...dayTotals.values());

  const weekdayHeaders = Array.from({ length: 7 }, (_, index) => {
    const dayIndex = (user.weekStartsOn + index) % 7;
    return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(
      new Date(Date.UTC(2024, 0, 7 + dayIndex, 12)),
    );
  });

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    const values: Record<string, string | undefined> = {
      month,
      view,
      item: itemId,
      source,
      q: params.q,
      day,
      page: undefined,
      ...overrides,
    };
    for (const [key, value] of Object.entries(values)) {
      if (value) search.set(key, value);
    }
    return `/history?${search.toString()}`;
  };

  const recentRows = toSessionRows(pageSessions, items);
  const itemOptions = toItemOptions(items);

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-2">The record</p>
        <h1 className="mt-1.5 text-[30px] font-extrabold leading-tight tracking-[-0.04em] md:text-[38px]">
          Time History<span className="text-primary">.</span>
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">
          Every session, exactly where it happened. Edit or delete anything — parent totals and goals recompute
          immediately.
        </p>
      </header>

      <HistoryControls
        month={month}
        view={view}
        itemId={itemId}
        source={source}
        query={params.q}
        day={day}
        items={itemOptions}
        todayKey={todayKey}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Month total", value: formatDuration(monthTotal, { zero: "0m" }), icon: Timer, color: "var(--primary)" },
          {
            label: "Sessions",
            value: String(filtered.length),
            icon: History,
            color: "var(--info)",
          },
          {
            label: "Active days",
            value: String(activeDays),
            icon: CalendarDays,
            color: "var(--success)",
          },
          {
            label: "Per active day",
            value: formatDuration(averagePerDay, { zero: "0m" }),
            icon: TrendingUp,
            color: "var(--accent)",
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-2">{stat.label}</p>
              <span
                className="grid h-7 w-7 place-items-center rounded-lg"
                style={{ background: `${stat.color}14`, color: stat.color }}
              >
                <stat.icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="mt-1.5 text-[22px] font-extrabold tracking-[-0.03em]">{stat.value}</p>
            <p className="text-[10px] font-medium text-muted-2">{monthLabel(month)}</p>
          </div>
        ))}
      </div>

      {view === "calendar" ? (
        <>
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-bold tracking-tight">{monthLabel(month)}</h2>
                <p className="text-[11px] text-muted">Intensity shows total tracked time per day.</p>
              </div>
              {day ? (
                <div className="flex items-center gap-2">
                  <Badge tone="primary">{dayLabel(day, tz)}</Badge>
                  <Link
                    href={buildUrl({ day: undefined, page: undefined })}
                    className="text-[11px] font-semibold text-muted hover:text-primary"
                  >
                    Clear day
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="p-3 sm:p-5">
              <div className="grid grid-cols-7 gap-1 pb-2">
                {weekdayHeaders.map((label, index) => (
                  <div key={`${label}-${index}`} className="py-1 text-center text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: leading }).map((_, index) => (
                  <div key={`blank-${index}`} className="h-[62px] rounded-lg sm:h-[88px] lg:h-[96px]" />
                ))}
                {Array.from({ length: daysInMonth }, (_, index) => {
                  const dayNumber = index + 1;
                  const key = `${month}-${String(dayNumber).padStart(2, "0")}`;
                  const seconds = dayTotals.get(key) ?? 0;
                  const ratio = seconds / maxDaySeconds;
                  const isToday = key === todayKey;
                  const isSelected = key === day;
                  return (
                    <Link
                      key={key}
                      href={buildUrl({ day: key, page: undefined })}
                      className={`group relative flex h-[62px] flex-col justify-between rounded-lg border p-1.5 transition-all hover:ring-2 hover:ring-primary/40 sm:h-[88px] sm:p-2 lg:h-[96px] ${
                        isSelected ? "border-primary ring-2 ring-primary/30" : "border-border/60"
                      }`}
                      style={{
                        background:
                          seconds > 0
                            ? `color-mix(in srgb, var(--primary) ${Math.round(5 + ratio * 24)}%, var(--surface))`
                            : "var(--surface-2)",
                      }}
                      title={`${key} · ${formatDuration(seconds)}`}
                    >
                      <span
                        className={`text-[10px] font-bold ${
                          isToday ? "text-primary" : seconds > 0 ? "text-text" : "text-muted-2"
                        }`}
                      >
                        {dayNumber}
                        {isToday ? <span className="ml-1 inline-block h-1 w-1 rounded-full bg-primary align-middle" /> : null}
                      </span>
                      <span className="text-[8px] font-semibold leading-tight text-muted sm:text-[9px]">
                        {seconds > 0 ? formatDuration(seconds) : ""}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          {day ? (
            <section className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-bold tracking-tight">{dayLabel(day, tz)}</h2>
                  <p className="text-[11px] text-muted">
                    {formatDuration(dayTotal)} across {(daySessions.get(day) ?? []).length}{" "}
                    {pluralize((daySessions.get(day) ?? []).length, "session")}
                  </p>
                </div>
                <Link
                  href={buildUrl({ view: "list", day, page: undefined })}
                  className="text-[11px] font-bold text-muted hover:text-primary"
                >
                  Open in list
                </Link>
              </div>
              <SessionTable
                sessions={toSessionRows(daySessions.get(day) ?? [], items)}
                timezone={tz}
                emptyState={<p className="px-5 py-10 text-center text-xs text-muted">No sessions on this day.</p>}
              />
            </section>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-3 text-[11px] text-muted">
              <CalendarDays className="h-4 w-4 text-primary" />
              Select a day above to see the sessions behind its total.
            </div>
          )}
        </>
      ) : (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {day ? dayLabel(day, tz) : monthLabel(month)}
              </h2>
              <p className="text-[11px] text-muted">
                {listSessions.length} {pluralize(listSessions.length, "session")} ·{" "}
                {formatDuration(day ? dayTotal : monthTotal)}
              </p>
            </div>
            {day ? (
              <Link
                href={buildUrl({ day: undefined, page: undefined })}
                className="text-[11px] font-bold text-muted hover:text-primary"
              >
                Clear day filter
              </Link>
            ) : (
              <Link href={buildUrl({ view: "calendar", page: undefined })} className="inline-flex items-center gap-1 text-[11px] font-bold text-muted hover:text-primary">
                <CalendarDays className="h-3 w-3" /> Calendar view
              </Link>
            )}
          </div>

          {recentRows.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <Clock3 className="mx-auto h-6 w-6 text-muted-2" />
              <p className="mt-2 text-sm font-semibold">No sessions match this view</p>
              <p className="mt-1 text-xs text-muted">Try another month, item, or search term.</p>
            </div>
          ) : (
            <SessionTable sessions={recentRows} timezone={tz} />
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <p className="text-[11px] text-muted">
                Page {safePage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Link
                  href={buildUrl({ page: String(Math.max(1, safePage - 1)) })}
                  className={`inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-[11px] font-semibold ${
                    safePage === 1 ? "pointer-events-none opacity-40" : "hover:bg-surface-2"
                  }`}
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </Link>
                <Link
                  href={buildUrl({ page: String(Math.min(totalPages, safePage + 1)) })}
                  className={`inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-[11px] font-semibold ${
                    safePage === totalPages ? "pointer-events-none opacity-40" : "hover:bg-surface-2"
                  }`}
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
