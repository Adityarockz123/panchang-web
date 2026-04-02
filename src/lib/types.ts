export type PanchangSegment = {
  index: number;
  name: string;
  start: string; // ISO with offset
  end: string; // ISO with offset
};

export type TimeBlock = {
  name: string;
  category: "auspicious" | "inauspicious" | "neutral";
  start: string;
  end: string;
  meta: Record<string, unknown>;
};

export type PanchangResponse = {
  date: string; // YYYY-MM-DD
  timezone: string;
  location: { lat: number; lon: number };
  ayanamsa: string;
  window: { start: string; end: string };
  events: {
    sunrise: string | null;
    sunset: string | null;
    moonrise: string | null;
    moonset: string | null;
    sunriseNext: string | null;
  };
  panchang: {
    vara: string;
    tithi: PanchangSegment[];
    nakshatra: PanchangSegment[];
    yoga: PanchangSegment[];
    karana: PanchangSegment[];
  };
  timings: {
    all: TimeBlock[];
    auspicious: TimeBlock[];
    inauspicious: TimeBlock[];
    hora: TimeBlock[];
    choghadiya: TimeBlock[];
  };
};

export type GeocodeResult = {
  name: string;
  lat: number;
  lon: number;
  tz: string | null;
  type: string | null;
};

