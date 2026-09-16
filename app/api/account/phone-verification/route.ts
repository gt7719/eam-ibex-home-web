import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import { getSiteUserSession } from "../../../lib/site-user-auth";
import {
  issuePhoneVerification,
  verifyPhoneVerification,
} from "../../../lib/site-user-phone-verification";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const user = await getSiteUserSession();
  if (!user)
    return NextResponse.json(
      { error: "Нэвтрэх шаардлагатай." },
      { status: 401 },
    );
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    code?: unknown;
  };
  try {
    if (body.action === "send") {
      const result = await issuePhoneVerification(user.id);
      return NextResponse.json(
        {
          ...result,
          message: result.sent
            ? "SMS код илгээгдлээ."
            : "SMS илгээх тохиргоо бэлэн биш байна.",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (body.action === "verify") {
      const result = await verifyPhoneVerification(user.id, body.code);
      return NextResponse.json(
        { ...result, message: "Утасны дугаар баталгаажлаа." },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json({ error: "Үйлдэл буруу байна." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Утасны баталгаажуулалтыг хийж чадсангүй.",
      },
      { status: 400 },
    );
  }
}
