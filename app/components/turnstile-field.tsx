"use client";

import { useEffect, useState } from "react";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function TurnstileField({
  onToken,
  onReadyChange,
}: {
  onToken: (token: string) => void;
  onReadyChange: (ready: boolean) => void;
}) {
  const [siteKey, setSiteKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/account/security-config", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { enabled?: boolean; siteKey?: string | null }) => {
        if (!active) return;
        if (result.enabled && result.siteKey) {
          setSiteKey(result.siteKey);
          onReadyChange(false);
        } else {
          onReadyChange(true);
        }
      })
      .catch(() => {
        if (active) onReadyChange(true);
      });
    return () => { active = false; };
  }, [onReadyChange]);

  useEffect(() => {
    if (!siteKey) return;
    let widgetId: string | null = null;
    let active = true;
    const container = document.getElementById("ibex-turnstile");
    if (!container) return;

    const renderWidget = () => {
      if (!active || !window.turnstile || widgetId) return;
      widgetId = window.turnstile.render(container, {
        sitekey: siteKey,
        theme: document.documentElement.dataset.ibexTheme === "day" ? "light" : "dark",
        callback: (token: string) => { onToken(token); onReadyChange(true); },
        "expired-callback": () => { onToken(""); onReadyChange(false); },
        "error-callback": () => { onToken(""); onReadyChange(false); },
      });
    };

    let script = document.getElementById("cloudflare-turnstile-script") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "cloudflare-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    if (window.turnstile) renderWidget();
    else script.addEventListener("load", renderWidget);

    return () => {
      active = false;
      script?.removeEventListener("load", renderWidget);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onReadyChange, onToken, siteKey]);

  return siteKey ? <div className="account-turnstile" id="ibex-turnstile" aria-label="Security check" /> : null;
}
