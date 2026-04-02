"use client";

import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import type { PanchangResponse } from "@/lib/types";
import { formatDateTime, formatTime, shiftDateString, todayInTimeZone } from "@/lib/time";
import { DatePicker } from "@/components/DatePicker";
import { LocationPicker, type LocationState } from "@/components/LocationPicker";
import { Timeline } from "@/components/Timeline";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const AYANAMSA_OPTIONS = [
  { id: "lahiri", label: "Lahiri (Chitrapaksha)" },
  { id: "kp", label: "KP (Krishnamurti)" },
  { id: "raman", label: "Raman" },
  { id: "yukteshwar", label: "Yukteshwar" },
] as const;

export function PanchangApp() {
  const browserTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
    [],
  );

  const [location, setLocation] = useState<LocationState>({
    name: "",
    lat: null,
    lon: null,
    tz: browserTz,
  });
  const [ayanamsa, setAyanamsa] = useState<string>("lahiri");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [dateStr, setDateStr] = useState(() => todayInTimeZone(browserTz));
  const selectedDateForPicker = useMemo(() => new Date(`${dateStr}T12:00:00Z`), [dateStr]);

  // If the user picks a location that includes a timezone, adjust the default date to that TZ.
  useEffect(() => {
    setDateStr((prev) => prev || todayInTimeZone(location.tz));
  }, [location.tz]);

  const canFetch = location.lat != null && location.lon != null && !!location.tz && !!dateStr;
  const apiUrl = canFetch
    ? `/api/panchang?date=${encodeURIComponent(dateStr)}&lat=${location.lat}&lon=${location.lon}&tz=${encodeURIComponent(
        location.tz,
      )}&ayanamsa=${encodeURIComponent(ayanamsa)}`
    : null;

  const { data, error, isLoading } = useSWR<PanchangResponse>(apiUrl, fetcher);

  const auspicious = data?.timings.auspicious ?? [];
  const inauspicious = data?.timings.inauspicious ?? [];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Top gradient header */}
      <header className="border-b border-white/10 bg-gradient-to-br from-indigo-600/25 via-fuchsia-500/10 to-emerald-500/10">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Panchang</h1>
              <p className="mt-1 text-sm text-white/65">
                Drik Panchang • 5 elements + sunrise/sunset + muhurta timings • 24h timeline
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              <Settings2 className="h-4 w-4" />
              Settings
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold">Date</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-white/15 bg-white/10 p-2 hover:bg-white/15"
                    onClick={() => setDateStr((d) => shiftDateString(d, -1))}
                    title="Previous day"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <DatePicker
                    value={selectedDateForPicker}
                    onChange={(d) => {
                      // Use UTC date portion of the chosen Date for consistency.
                      const iso = d.toISOString().slice(0, 10);
                      setDateStr(iso);
                    }}
                  />
                  <button
                    type="button"
                    className="rounded-xl border border-white/15 bg-white/10 p-2 hover:bg-white/15"
                    onClick={() => setDateStr((d) => shiftDateString(d, 1))}
                    title="Next day"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs text-white/55">
                Showing elements that overlap the 24h window: <span className="font-mono">{dateStr}</span>{" "}
                (<span className="font-mono">{location.tz}</span>)
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur lg:col-span-2">
              <div className="text-sm font-semibold">Location</div>
              <div className="mt-2">
                <LocationPicker value={location} onChange={setLocation} />
              </div>
              <div className="mt-2 text-xs text-white/55">
                {location.lat != null && location.lon != null ? (
                  <span className="font-mono">
                    {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                  </span>
                ) : (
                  "Select a city or use geolocation to start."
                )}
              </div>
            </div>
          </div>

          {settingsOpen && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="text-sm font-semibold">Ayanamsa</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {AYANAMSA_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setAyanamsa(o.id)}
                    className={[
                      "rounded-xl border px-3 py-2 text-sm font-medium transition",
                      ayanamsa === o.id
                        ? "border-white/30 bg-white/15 text-white"
                        : "border-white/15 bg-white/10 text-white/80 hover:bg-white/15",
                    ].join(" ")}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-xs text-white/55">
                Default: <span className="font-mono">Lahiri</span>. You can switch to KP/Raman/Yukteshwar.
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {!canFetch && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            Select a city or use “Use my location” to calculate Panchang.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            Failed to load Panchang. Try a different location/date.
          </div>
        )}

        {isLoading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            Calculating…
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="text-sm font-semibold">Sun & Moon</div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <InfoPair label="Sunrise" value={data.events.sunrise ? formatTime(data.events.sunrise, data.timezone) : "—"} />
                  <InfoPair label="Sunset" value={data.events.sunset ? formatTime(data.events.sunset, data.timezone) : "—"} />
                  <InfoPair label="Moonrise" value={data.events.moonrise ? formatTime(data.events.moonrise, data.timezone) : "—"} />
                  <InfoPair label="Moonset" value={data.events.moonset ? formatTime(data.events.moonset, data.timezone) : "—"} />
                </div>
                <div className="mt-3 text-xs text-white/55">
                  Vara: <span className="font-medium text-white/90">{data.panchang.vara}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur lg:col-span-2">
                <div className="text-sm font-semibold">24h Timeline (00:00 → 24:00)</div>
                <div className="mt-3">
                  <Timeline
                    windowStart={data.window.start}
                    windowEnd={data.window.end}
                    tithi={data.panchang.tithi}
                    nakshatra={data.panchang.nakshatra}
                    yoga={data.panchang.yoga}
                    karana={data.panchang.karana}
                    auspicious={auspicious}
                    inauspicious={inauspicious}
                    events={{
                      sunrise: data.events.sunrise,
                      sunset: data.events.sunset,
                      moonrise: data.events.moonrise,
                      moonset: data.events.moonset,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DataTable title="Tithi" items={data.panchang.tithi} tz={data.timezone} />
              <DataTable title="Nakshatra" items={data.panchang.nakshatra} tz={data.timezone} />
              <DataTable title="Yoga" items={data.panchang.yoga} tz={data.timezone} />
              <DataTable title="Karana" items={data.panchang.karana} tz={data.timezone} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TimingList title="Auspicious Timings" tint="from-emerald-500/25 to-emerald-500/0" items={auspicious} tz={data.timezone} />
              <TimingList title="Inauspicious Timings" tint="from-rose-500/25 to-rose-500/0" items={inauspicious} tz={data.timezone} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
              Note: This demo calculates Panchang using Swiss Ephemeris (sidereal longitudes; Drik). Muhurta traditions can vary by school/region.
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 font-semibold text-white/90">{value}</div>
    </div>
  );
}

function DataTable({
  title,
  items,
  tz,
}: {
  title: string;
  items: Array<{ index: number; name: string; start: string; end: string }>;
  tz: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <div className="text-xs text-white/55">{items.length} segment(s)</div>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-xs text-white/60">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Start</th>
              <th className="px-3 py-2 text-left">End</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={`${it.index}-${it.start}`} className="border-t border-white/10">
                <td className="px-3 py-2">
                  <div className="font-medium text-white/90">{it.name}</div>
                  <div className="text-xs text-white/50">#{it.index}</div>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-white/75">{formatDateTime(it.start, tz)}</td>
                <td className="px-3 py-2 font-mono text-xs text-white/75">{formatDateTime(it.end, tz)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TimingList({
  title,
  tint,
  items,
  tz,
}: {
  title: string;
  tint: string;
  items: Array<{ name: string; start: string; end: string }>;
  tz: string;
}) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.start.localeCompare(b.start)),
    [items],
  );

  return (
    <section
      className={[
        "rounded-2xl border border-white/10 bg-gradient-to-b p-4 backdrop-blur",
        tint,
      ].join(" ")}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <div className="text-xs text-white/55">{sorted.length} item(s)</div>
      </div>
      <div className="mt-3 space-y-2">
        {sorted.map((it) => (
          <div
            key={`${it.name}-${it.start}`}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
          >
            <div className="text-sm font-medium text-white/90">{it.name}</div>
            <div className="mt-1 font-mono text-xs text-white/70">
              {formatDateTime(it.start, tz)} → {formatDateTime(it.end, tz)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

