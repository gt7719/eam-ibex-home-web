import { NextResponse } from "next/server";
import { readLaunchOffer } from "../../lib/launch-offer";
import { publicLaunchOffer } from "../../lib/launch-offer-model";

export async function GET() {
  try {
    const { offer } = await readLaunchOffer(), serverNow = Date.now();
    return NextResponse.json({ offer: publicLaunchOffer(offer, serverNow), serverNow }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ offer: { schema: 2, plans: [] }, error: "Offer unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
