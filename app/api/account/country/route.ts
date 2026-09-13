import { NextResponse } from "next/server";

const callingCodes: Record<string, string> = {
  MN: "+976", CN: "+86", RU: "+7", KR: "+82", JP: "+81", US: "+1", CA: "+1",
  AU: "+61", NZ: "+64", GB: "+44", DE: "+49", FR: "+33", IT: "+39", ES: "+34",
  SG: "+65", AE: "+971", KZ: "+7", KG: "+996", TR: "+90", IN: "+91", VN: "+84",
  TH: "+66", MY: "+60", ID: "+62", PH: "+63", HK: "+852", TW: "+886", QA: "+974",
  SA: "+966", CH: "+41", SE: "+46", NO: "+47", FI: "+358", DK: "+45", NL: "+31",
  BE: "+32", AT: "+43", PL: "+48", CZ: "+420", UA: "+380", BR: "+55", MX: "+52",
};

export async function GET(request: Request) {
  const detected = (request.headers.get("cf-ipcountry") || "MN").toUpperCase();
  const country = /^[A-Z]{2}$/.test(detected) ? detected : "MN";
  return NextResponse.json(
    { country, callingCode: callingCodes[country] || "" },
    { headers: { "Cache-Control": "private, max-age=3600" } },
  );
}
