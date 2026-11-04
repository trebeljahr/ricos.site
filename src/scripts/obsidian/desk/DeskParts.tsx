import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { type CalendarDay, DAILY_GOAL, progressColor } from "src/lib/computerSeries";
import type { StreakWarning } from "./deskStore";

// The small pieces every Desk tab shares, ported from /dev/writing and /dev/diary.

export const fmt = (n: number) => n.toLocaleString("en-US");
export const dayCount = (n: number) => `${fmt(n)} ${n === 1 ? "day" : "days"}`;
export const percent = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 100) : 0;
export const longDate = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export function Problem({ text }: { text: string }) {
  return <p className="desk-warning is-urgent">Could not load or save: {text}</p>;
}

export function Warning({ warning }: { warning: StreakWarning | null }) {
  if (!warning) return null;
  return <p className={`desk-warning${warning.urgent ? " is-urgent" : ""}`}>{warning.text}</p>;
}

export function Bar({ value, max, thick }: { value: number; max: number; thick?: boolean }) {
  // A drafted section can lock in at a target of zero, which is met.
  const fraction = max ? Math.min(value, max) / max : 1;
  return (
    <div className={`desk-bar${thick ? " is-thick" : ""}`}>
      <div style={{ width: `${fraction * 100}%`, backgroundColor: progressColor(fraction) }} />
    </div>
  );
}

export function Stat({
  label,
  value,
  note,
  children,
}: {
  label: string;
  value: string;
  note: string;
  children?: ReactNode;
}) {
  return (
    <div className="desk-card">
      <p className="desk-label">{label}</p>
      <p className="desk-big">{value}</p>
      <p className="desk-muted">{note}</p>
      {children}
    </div>
  );
}

const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

/** GitHub-style grid: one square per day, greener the more of the daily goal was written. */
export function DayGrid({
  label,
  summary,
  days,
  todayKey,
  deadline,
}: {
  label: string;
  summary?: string;
  days: CalendarDay[];
  todayKey: string;
  deadline?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const color = (d: CalendarDay) =>
    d.words && d.words > 0
      ? progressColor(Math.min(d.words / DAILY_GOAL, 1) * 0.75 + 0.25)
      : undefined;

  // On a phone a long grid overflows: start at the recent end, not the oldest week.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  return (
    <div className="desk-grid-block">
      <div className="desk-grid-head">
        <p className="desk-label">{label}</p>
        {summary && <p className="desk-muted">{summary}</p>}
      </div>
      <div className="desk-grid-scroll" ref={scroller}>
        <div className="desk-grid">
          <div />
          <div className="desk-months">
            {weeks.map((week) => {
              const first = week.find((d) => d.day.endsWith("-01"));
              const named = first ?? (week === weeks[0] ? week[0] : undefined);
              return (
                <span key={week[0].day}>
                  {named
                    ? new Date(`${named.day}T12:00:00Z`).toLocaleString("en-US", {
                        month: "short",
                        timeZone: "UTC",
                      })
                    : ""}
                </span>
              );
            })}
          </div>
          <div className="desk-weekdays">
            {WEEKDAYS.map((name, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed list of seven rows
              <span key={i}>{name}</span>
            ))}
          </div>
          <div className="desk-weeks">
            {weeks.map((week) => (
              <div key={week[0].day} className="desk-week">
                {week.map((d) => (
                  <div
                    key={d.day}
                    title={
                      d.inRange
                        ? `${d.day}: ${d.words === null ? "to come" : `${fmt(d.words)} words`}${d.day === deadline ? " · deadline" : ""}`
                        : d.day
                    }
                    className={[
                      "desk-day",
                      !d.inRange && "is-outside",
                      d.future && "is-future",
                      d.day === deadline && "is-deadline",
                      d.day === todayKey && "is-today",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ backgroundColor: color(d) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
