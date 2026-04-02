import { NextRequest } from "next/server";
import { spawnSync } from "node:child_process";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getParam(req: NextRequest, key: string): string | null {
  return req.nextUrl.searchParams.get(key);
}

export async function GET(req: NextRequest) {
  const date = getParam(req, "date"); // YYYY-MM-DD (local date in timezone)
  const lat = getParam(req, "lat");
  const lon = getParam(req, "lon");
  const tz = getParam(req, "tz");
  const ayanamsa = (getParam(req, "ayanamsa") ?? "lahiri").toLowerCase();

  if (!date || !lat || !lon || !tz) {
    return Response.json(
      { error: "Missing required params: date, lat, lon, tz" },
      { status: 400 },
    );
  }

  const scriptPath = path.join(process.cwd(), "server", "panchang_calc.py");
  const res = spawnSync(
    "python3",
    [
      scriptPath,
      "--date",
      date,
      "--lat",
      lat,
      "--lon",
      lon,
      "--tz",
      tz,
      "--ayanamsa",
      ayanamsa,
    ],
    {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  if (res.error) {
    return Response.json(
      { error: "Failed to run calculator", details: String(res.error) },
      { status: 500 },
    );
  }

  if (res.status !== 0) {
    return Response.json(
      {
        error: "Calculator failed",
        status: res.status,
        stderr: res.stderr?.toString?.() ?? String(res.stderr ?? ""),
      },
      { status: 500 },
    );
  }

  try {
    const json = JSON.parse(res.stdout);
    return Response.json(json);
  } catch {
    return Response.json(
      {
        error: "Calculator returned invalid JSON",
        stdout: res.stdout,
        stderr: res.stderr,
      },
      { status: 500 },
    );
  }
}

