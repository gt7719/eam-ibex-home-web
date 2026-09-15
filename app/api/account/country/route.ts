import { NextResponse } from "next/server";
import { callingCodeForIso } from "../../../lib/calling-codes";

export async function GET(request: Request) {
  const detected = (request.headers.get("cf-ipcountry") || "MN").toUpperCase();
  const country = /^[A-Z]{2}$/.test(detected) ? detected : "MN";
  return NextResponse.json(
    { country, callingCode: callingCodeForIso(country) },
    { headers: { "Cache-Control": "private, max-age=3600" } },
  );
}
