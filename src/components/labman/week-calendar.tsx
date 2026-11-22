"use client";

import { ChevronLeft, ChevronRight, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addDays, CLOSE_HOUR, formatDate, jakartaToday, OPEN_HOUR, toMinutes, weekDays, weekStart } from "@/lib/labman";
import { cn } from "@/lib/utils";

export type CalendarEntry = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  activity: string | null;
  is_locked: boolean;
  laboratories?: { name: string } | null;
};

const HOUR_PX = 52;

export function WeekNav({ start, onChange }: { start: string; onChange: (start: string) => void }) {
  const end = addDays(start, 6);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" aria-label="Minggu sebelumnya" onClick={() => onChange(addDays(start, -7))}>
        <ChevronLeft />
      </Button>
      <Button variant="outline" size="sm" onClick={() => onChange(weekStart(jakartaToday()))}>
        Minggu ini
      </Button>
      <Button variant="outline" size="icon" aria-label="Minggu berikutnya" onClick={() => onChange(addDays(start, 7))}>
        <ChevronRight />
      </Button>
      <span className="text-sm font-medium">
        {formatDate(start, { day: "numeric", month: "short" })} – {formatDate(end, { day: "numeric", month: "short", year: "numeric" })}
      </span>
    </div>
  );
}

/** Weekly calendar (Senin–Minggu) with entries placed by time. */
export function WeekCalendar({
  start,
  entries,
  showLab,
  onEntryClick,
  onEmptyClick,
}: {
  start: string;
  entries: CalendarEntry[];
  showLab?: boolean | undefined;
  onEntryClick?: ((entry: CalendarEntry) => void) | undefined;
  onEmptyClick?: ((date: string, hour: number) => void) | undefined;
}) {
  const days = weekDays(start);
  const today = jakartaToday();
  const firstHour = Math.min(OPEN_HOUR, ...entries.map((e) => Math.floor(toMinutes(e.start_time) / 60)));
  const lastHour = Math.max(CLOSE_HOUR, ...entries.map((e) => Math.ceil(toMinutes(e.end_time) / 60)));
  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
      <div className="grid min-w-[860px]" style={{ gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))" }}>
        <div className="border-b" />
        {days.map((d) => (
          <div key={d} className={cn("border-b border-l px-2 py-2 text-center", d === today && "bg-primary-soft")}>
            <p className="text-xs uppercase text-muted-foreground">{formatDate(d, { weekday: "short" })}</p>
            <p className={cn("text-sm font-semibold", d === today && "text-primary")}>{formatDate(d, { day: "numeric", month: "short" })}</p>
          </div>
        ))}
        <div className="relative">
          {hours.map((h) => (
            <div key={h} style={{ height: HOUR_PX }} className="border-b pr-2 pt-1 text-right text-xs text-muted-foreground">
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        {days.map((d) => (
          <div key={d} className="relative border-l">
            {hours.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_PX }}
                className={cn("border-b", onEmptyClick && d >= today && "cursor-pointer hover:bg-muted/60")}
                onClick={onEmptyClick && d >= today ? () => onEmptyClick(d, h) : undefined}
              />
            ))}
            {entries
              .filter((e) => e.date === d)
              .map((e) => {
                const top = ((toMinutes(e.start_time) - firstHour * 60) / 60) * HOUR_PX;
                const height = Math.max(22, ((toMinutes(e.end_time) - toMinutes(e.start_time)) / 60) * HOUR_PX - 2);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={onEntryClick ? () => onEntryClick(e) : undefined}
                    disabled={!onEntryClick}
                    style={{ top, height }}
                    className={cn(
                      "absolute inset-x-1 overflow-hidden rounded-md border px-2 py-1 text-left text-xs disabled:cursor-default",
                      e.is_locked ? "border-info/30 bg-info-soft text-info" : "border-primary/30 bg-primary-soft text-secondary",
                    )}
                  >
                    <span className="flex items-center gap-1 font-semibold">
                      {e.is_locked && <Lock className="size-3 shrink-0" aria-label="Terkunci" />}
                      {e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)}
                    </span>
                    <span className="line-clamp-2">{e.activity ?? "Kegiatan"}</span>
                    {showLab && e.laboratories && <span className="block truncate opacity-80">{e.laboratories.name}</span>}
                  </button>
                );
              })}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 border-t px-4 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-primary/30 bg-primary-soft" /> Jadwal laboratorium
        </span>
        <span className="flex items-center gap-1.5">
          <Lock className="size-3 text-info" /> Dari pengajuan disetujui (terkunci)
        </span>
      </div>
    </div>
  );
}
