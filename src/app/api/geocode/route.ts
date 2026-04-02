import { NextRequest } from "next/server";
import tzLookup from "tz-lookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return Response.json({ results: [] });
  }

  // OpenStreetMap Nominatim (city suggestions)
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "8");

  const r = await fetch(url.toString(), {
    headers: {
      // Nominatim requires a UA that identifies the app
      "User-Agent": "PanchangWeb/0.1 (local demo)",
    },
    cache: "no-store",
  });

  if (!r.ok) {
    return Response.json(
      { error: "Geocoding failed", status: r.status },
      { status: 502 },
    );
  }

  const data = (await r.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
    type?: string;
  }>;

  const results = data.map((x) => {
    const lat = Number(x.lat);
    const lon = Number(x.lon);
    let tz: string | null = null;
    try {
      tz = tzLookup(lat, lon);
    } catch {
      tz = null;
    }
    return {
      name: x.display_name,
      lat,
      lon,
      tz,
      type: x.type ?? null,
    };
  });

  return Response.json({ results });
}

