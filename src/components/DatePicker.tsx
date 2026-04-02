"use client";

import { DayPicker } from "react-day-picker";
import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";

type Props = {
  value: Date;
  onChange: (d: Date) => void;
};

export function DatePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/15"
      >
        <CalendarDays className="h-4 w-4" />
        {value.toDateString()}
      </button>

      {open && (
        <div className="absolute z-20 mt-2 rounded-2xl border border-white/10 bg-zinc-950/95 p-3 shadow-xl backdrop-blur">
          <DayPicker
            mode="single"
            selected={value}
            onSelect={(d) => {
              if (!d) return;
              onChange(d);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
