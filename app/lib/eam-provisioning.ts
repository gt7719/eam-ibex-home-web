import type { ProvisioningPayload } from "./home-subscriptions";

type ProvisioningRuntime = {
  IBEX_EAM_PROVISIONING_URL?: string;
  IBEX_EAM_PROVISIONING_TOKEN?: string;
};

export type ProvisioningDispatch = {
  status: "accepted" | "pending_connection" | "failed";
  response: Record<string, unknown>;
};

function endpoint(runtime: ProvisioningRuntime) {
  const raw = runtime.IBEX_EAM_PROVISIONING_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url : null;
  } catch { return null; }
}

// The core eAM endpoint is configured as a runtime secret. Home Web never
// sends passwords, payment information, or marketing/AI data to eAM.
export async function dispatchProvisioning(runtime: ProvisioningRuntime, payload: ProvisioningPayload): Promise<ProvisioningDispatch> {
  const url = endpoint(runtime), token = runtime.IBEX_EAM_PROVISIONING_TOKEN?.trim();
  if (!url || !token) return {
    status: "pending_connection",
    response: { code: "EAM_CONNECTION_NOT_CONFIGURED", message: "Core eAM provisioning connection is not configured." },
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "Idempotency-Key": payload.requestId },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(15_000),
    });
    const raw = await response.text();
    let body: Record<string, unknown> = {};
    try { body = raw ? JSON.parse(raw) as Record<string, unknown> : {}; } catch { body = { code: "EAM_INVALID_RESPONSE" }; }
    if (!response.ok) return { status: "failed", response: { code: `EAM_${response.status}`, ...body } };
    const accepted = body.accepted === true || body.status === "accepted" || body.status === "active" || body.status === "provisioned";
    return accepted ? { status: "accepted", response: body } : { status: "failed", response: { code: "EAM_NOT_ACCEPTED", ...body } };
  } catch {
    return { status: "failed", response: { code: "EAM_NETWORK_ERROR", message: "Core eAM provisioning request could not be delivered." } };
  }
}
