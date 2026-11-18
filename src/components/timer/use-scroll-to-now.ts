"use client";

import * as React from "react";
import { formatInTimeZone } from "date-fns-tz";

/**
 * Keeps the calendar scrolled so the current time is visible on first paint.
 *
 * The scroll container can mount before its parent has a height (fixed-height
 * layouts, hidden mobile tabs, hydration), in which case setting scrollTop is
 * clamped to 0. A ResizeObserver waits until the container is actually tall
 * enough, positions once, then stops so it never fights the user's scrolling.
 */
export function useScrollToNow(
  ref: React.RefObject<HTMLDivElement | null>,
  timezone: string,
  rowHeight: number,
) {
  React.useEffect(() => {
    let done = false;

    const position = () => {
      if (done) return;
      const node = ref.current;
      if (!node || node.clientHeight < 80) return;
      const hour = Number(formatInTimeZone(new Date(), timezone, "H"));
      const minute = Number(formatInTimeZone(new Date(), timezone, "m"));
      const top = ((hour * 60 + minute) / 60) * rowHeight - node.clientHeight * 0.35;
      node.scrollTop = Math.max(0, top);
      done = true;
      observer.disconnect();
    };

    const observer = new ResizeObserver(position);
    if (ref.current) observer.observe(ref.current);
    const frame = window.requestAnimationFrame(position);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [ref, timezone, rowHeight]);
}

/** Scroll container offset that places the given minute about a third from the top. */
export function nowScrollTop(node: HTMLDivElement, minutes: number, rowHeight: number) {
  return Math.max(0, (minutes / 60) * rowHeight - node.clientHeight * 0.35);
}
