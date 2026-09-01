"use client";

import { useEffect, useState } from "react";

export type SiteLanguage = "mn" | "en";

function readLanguage(): SiteLanguage {
  try {
    return localStorage.getItem("ibex-lang") === "en" ? "en" : "mn";
  } catch {
    return "mn";
  }
}

export function useSiteLanguage() {
  const [lang, setLang] = useState<SiteLanguage>("mn");

  useEffect(() => {
    const sync = () => setLang(readLanguage());
    const receive = (event: MessageEvent) => {
      if (event.origin === location.origin && event.data?.type === "ibex-global-appearance") sync();
    };
    const timer = window.setTimeout(sync, 0);
    window.addEventListener("storage", sync);
    window.addEventListener("message", receive);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", sync);
      window.removeEventListener("message", receive);
    };
  }, []);

  return {
    lang,
    t: (mn: string, en: string) => lang === "en" ? en : mn,
  };
}
