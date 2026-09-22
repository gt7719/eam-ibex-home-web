"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSiteLanguage } from "../lib/use-site-language";
import type { EnvironmentConfig } from "../lib/navigation";

export default function OrganizationPage() {
  const { t, lang } = useSiteLanguage();
  const [adminPreview] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("adminPreview") === "1");
  const [environment, setEnvironment] = useState<EnvironmentConfig | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(adminPreview ? "/api/admin/navigation" : "/api/content", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("environment_unavailable")))
      .then((payload) => {
        const navigation = adminPreview ? payload?.published : payload?.content?.navigation;
        setEnvironment(navigation?.environments?.find((row: EnvironmentConfig) => row.id === "web") || null);
      })
      .catch(() => setEnvironment(null))
      .finally(() => setLoaded(true));
  }, [adminPreview]);

  const available = Boolean(environment && (environment.visible || adminPreview));
  const name = environment ? (lang === "en" ? environment.nameEn : environment.nameMn) : "iBeX";
  return <main className="mobile-preview-page">
    <header className="mobile-preview-header">
      <div className="mobile-preview-heading"><strong>{name}</strong><span>{environment?.status === "preview" ? t("Туршилтын орчин", "Preview environment") : t("Одоо ажиллаж байна", "Active now")}</span></div>
      <Link className="mobile-preview-close" href="/" aria-label={t("Нүүр хуудас руу буцах", "Return to home")} title={t("Хаах", "Close")}><span aria-hidden="true">×</span></Link>
    </header>
    {!loaded ? <div className="environment-unavailable">{t("Орчны мэдээллийг ачаалж байна…", "Loading environment…")}</div> : available ? <iframe className="mobile-preview-frame" src={`/organization-preview.html${adminPreview ? "?adminPreview=1" : ""}`} title={name} /> : <div className="environment-unavailable"><strong>{t("Энэ орчин одоогоор нийтэд харагдахгүй байна", "This environment is not currently available")}</strong><Link href="/">{t("Нүүр хуудас руу буцах", "Return to home")}</Link></div>}
  </main>;
}
