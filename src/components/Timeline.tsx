"use client";

import type { PanchangSegment, TimeBlock } from "@/lib/types";
import { parseISO } from "date-fns";

type Row = {
  label: string;
  color: string; // tailwind-ish hex used in SVG
  segments: Array<{ name: string; start: string; end: string }>;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toMs(iso: string) {
  return parseISO(iso).getTime();
}

export function Timeline({
  windowStart,
  windowEnd,
  tithi,
  nakshatra,
  yoga,
  karana,
  auspicious,
  inauspicious,
  events,
}: {
  windowStart: string;
  windowEnd: string;
  tithi: PanchangSegment[];
  nakshatra: PanchangSegment[];
  yoga: PanchangSegment[];
  karana: PanchangSegment[];
  auspicious: TimeBlock[];
  inauspicious: TimeBlock[];
  events: { sunrise: string | null; sunset: string | null; moonrise: string | null; moonset: string | null };
}) {
  const ws = toMs(windowStart);
  const we = toMs(windowEnd);
  const dur = we - ws;

  const rows: Row[] = [
    { label: "Tithi", color: "#6366f1", segments: tithi },
    { label: "Nakshatra", color: "#14b8a6", segments: nakshatra },
    { label: "Yoga", color: "#f59e0b", segments: yoga },
    { label: "Karana", color: "#fb7185", segments: karana },
    {
      label: "Auspicious",
      color: "#22c55e",
      segments: auspicious.map((x) => ({ name: x.name, start: x.start, end: x.end })),
    },
    {
      label: "Inauspicious",
      color: "#ef4444",
      segments: inauspicious.map((x) => ({ name: x.name, start: x.start, end: x.end })),
    },
  ];

  const hourTicks = Array.from({ length: 13 }, (_, i) => i * 2); // 0..24 step 2

  const height = 42 + rows.length * 26 + 12;
  const rowTop0 = 34;

  const eventMarkers = [
    { key: "Sunrise", iso: events.sunrise, color: "#fde047" },
    { key: "Sunset", iso: events.sunset, color: "#fb923c" },
    { key: "Moonrise", iso: events.moonrise, color: "#a78bfa" },
    { key: "Moonset", iso: events.moonset, color: "#93c5fd" },
  ].filter((x) => x.iso);

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
      <div className="min-w-[900px]">
        <svg width="100%" height={height} viewBox={`0 0 1000 ${height}`} role="img">
          {/* Background */}
          <rect x="0" y="0" width="1000" height={height} rx="16" fill="rgba(0,0,0,0.15)" />

          {/* Axis */}
          <g transform="translate(110, 18)">
            <text x={0} y={0} fontSize="11" fill="rgba(255,255,255,0.75)">
              00:00
            </text>
            <text x={880} y={0} fontSize="11" fill="rgba(255,255,255,0.75)" textAnchor="end">
              24:00
            </text>
          </g>

          <g transform="translate(110, 24)">
            {hourTicks.map((h) => {
              const x = (h / 24) * 880;
              return (
                <g key={h}>
                  <line x1={x} y1={0} x2={x} y2={rows.length * 26 + 14} stroke="rgba(255,255,255,0.06)" />
                  <text x={x} y={-4} fontSize="10" fill="rgba(255,255,255,0.35)" textAnchor="middle">
                    {h}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Event markers */}
          <g transform="translate(110, 24)">
            {eventMarkers.map((m) => {
              const t = toMs(m.iso!);
              const p = clamp((t - ws) / dur, 0, 1);
              const x = p * 880;
              return (
                <g key={m.key}>
                  <line x1={x} y1={0} x2={x} y2={rows.length * 26 + 14} stroke={m.color} opacity={0.35} />
                  <text x={x + 4} y={rows.length * 26 + 26} fontSize="10" fill={m.color} opacity={0.85}>
                    {m.key}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Rows */}
          {rows.map((row, rIdx) => {
            const y = rowTop0 + rIdx * 26;
            return (
              <g key={row.label}>
                <text x={16} y={y + 16} fontSize="12" fill="rgba(255,255,255,0.8)">
                  {row.label}
                </text>
                <g transform={`translate(110, ${y})`}>
                  <rect x={0} y={4} width={880} height={18} rx={9} fill="rgba(255,255,255,0.04)" />
                  {row.segments.map((s, i) => {
                    const st = toMs(s.start);
                    const en = toMs(s.end);
                    const a = clamp((st - ws) / dur, 0, 1);
                    const b = clamp((en - ws) / dur, 0, 1);
                    const x = a * 880;
                    const w = Math.max(1, (b - a) * 880);
                    return (
                      <g key={i}>
                        <rect x={x} y={4} width={w} height={18} rx={9} fill={row.color} opacity={0.55} />
                        <title>{`${s.name}\n${s.start} → ${s.end}`}</title>
                      </g>
                    );
                  })}
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

