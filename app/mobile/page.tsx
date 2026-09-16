"use client";

import Link from "next/link";
import { useSiteLanguage } from "../lib/use-site-language";

export default function MobileEnvironmentPage() {
  const { t } = useSiteLanguage();

  return (
    <main className="mobile-preview-page">
      <header className="mobile-preview-header">
        <div className="mobile-preview-heading">
          <strong>iBeX Mobile</strong>
          <span>{t("Туршилтын орчин", "Interactive preview")}</span>
        </div>
        <Link
          className="mobile-preview-close"
          href="/"
          aria-label={t("Нүүр хуудас руу буцах", "Return to home")}
          title={t("Хаах", "Close")}
        >
          <span aria-hidden="true">×</span>
        </Link>
      </header>

      <iframe
        className="mobile-preview-frame"
        src="/mobile-preview/index.html"
        title={t("iBeX мобайл орчны туршилтын хувилбар", "iBeX Mobile interactive preview")}
        loading="eager"
        referrerPolicy="same-origin"
      />
    </main>
  );
}
