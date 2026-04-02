"use client";

import { MapPin, Navigation } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useDebounce } from "@/lib/useDebounce";
import type { GeocodeResult } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export type LocationState = {
  name: string;
  lat: number | null;
  lon: number | null;
  tz: string;
};

type Props = {
  value: LocationState;
  onChange: (v: LocationState) => void;
};

export function LocationPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [showManual, setShowManual] = useState(false);
  const debounced = useDebounce(query, 300);

  const { data } = useSWR<{ results: GeocodeResult[] }>(
    debounced.length >= 2 ? `/api/geocode?q=${encodeURIComponent(debounced)}` : null,
    fetcher,
  );

  const results = useMemo(() => data?.results ?? [], [data]);

  useEffect(() => {
    // If we already have a location name, keep the search box in sync.
    if (value.name && !query) setQuery(value.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.name]);

  async function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        // Keep tz as current browser tz (fallback) – user can search a city if needed.
        onChange({
          name: "My Location",
          lat,
          lon,
          tz: value.tz,
        });
      },
      () => setShowManual(true),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <MapPin className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-white/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city (e.g., Hyderabad, India)…"
            className="w-full rounded-xl border border-white/15 bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/25"
          />

          {results.length > 0 && debounced.length >= 2 && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 shadow-xl backdrop-blur">
              {results.map((r) => (
                <button
                  type="button"
                  key={`${r.lat},${r.lon}`}
                  onClick={() => {
                    onChange({
                      name: r.name,
                      lat: r.lat,
                      lon: r.lon,
                      tz: r.tz ?? value.tz,
                    });
                    setQuery(r.name);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                >
                  <div className="line-clamp-1">{r.name}</div>
                  <div className="text-xs text-white/50">
                    {r.lat.toFixed(4)}, {r.lon.toFixed(4)} {r.tz ? `• ${r.tz}` : ""}
                  </div>
                </button>
              ))}
              <div className="border-t border-white/10 px-3 py-2">
                <button
                  type="button"
                  className="text-xs text-white/70 hover:text-white"
                  onClick={() => setShowManual(true)}
                >
                  Can’t find it? Enter lat/long manually →
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={useMyLocation}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
          title="Use device location"
        >
          <Navigation className="h-4 w-4" />
          Use my location
        </button>

        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
        >
          {showManual ? "Hide manual" : "Manual lat/long"}
        </button>
      </div>

      {showManual && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="space-y-1">
            <div className="text-xs font-medium text-white/70">Latitude</div>
            <input
              value={value.lat ?? ""}
              onChange={(e) =>
                onChange({ ...value, lat: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
              placeholder="e.g., 17.3850"
            />
          </label>
          <label className="space-y-1">
            <div className="text-xs font-medium text-white/70">Longitude</div>
            <input
              value={value.lon ?? ""}
              onChange={(e) =>
                onChange({ ...value, lon: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
              placeholder="e.g., 78.4867"
            />
          </label>
          <label className="space-y-1">
            <div className="text-xs font-medium text-white/70">Timezone</div>
            <input
              value={value.tz}
              onChange={(e) => onChange({ ...value, tz: e.target.value })}
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
              placeholder="e.g., Asia/Kolkata"
            />
          </label>
        </div>
      )}
    </div>
  );
}

