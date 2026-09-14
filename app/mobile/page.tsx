"use client";

import Image from "next/image";
import Link from "next/link";
import { useSiteLanguage } from "../lib/use-site-language";

const capabilities = [
  {
    icon: "+",
    titleMn: "Хүсэлт үүсгэх",
    titleEn: "Create requests",
    bodyMn: "Талбайгаас хүсэлт үүсгэж, тайлбар болон зургийн мэдээлэл хавсаргах суурь.",
    bodyEn: "Foundation for creating field requests with descriptions and image evidence.",
  },
  {
    icon: "✓",
    titleMn: "Оноосон ажил гүйцэтгэх",
    titleEn: "Execute assigned work",
    bodyMn: "Хэрэглэгчид оноосон ажлыг харж, гүйцэтгэлийн мэдээлэл оруулах суурь.",
    bodyEn: "Foundation for viewing assigned work and recording execution details.",
  },
  {
    icon: "↻",
    titleMn: "Хүсэлтийн явц хянах",
    titleEn: "Track request progress",
    bodyMn: "Илгээсэн хүсэлтийн төлөв, дараагийн алхмыг нэг дор хянах суурь.",
    bodyEn: "Foundation for tracking submitted request status and next steps.",
  },
];

export default function MobileEnvironmentPage() {
  const { t } = useSiteLanguage();
  return (
    <main className="mobile-environment-page">
      <header className="mobile-environment-header">
        <Link className="mobile-environment-brand" href="/" aria-label={t("iBeX нүүр", "iBeX home")}>
          <Image src="/ibex-main-logo.jpg" alt="iBeX" width={48} height={48} priority />
          <span><strong>iBeX</strong><small>Enterprise Asset Management</small></span>
        </Link>
        <Link className="mobile-environment-close" href="/" aria-label={t("Нүүр хуудас руу буцах", "Return to home")} title={t("Хаах", "Close")}>×</Link>
      </header>

      <section className="mobile-environment-hero">
        <span className="mobile-environment-status">{t("ХӨГЖҮҮЛЭЛТИЙН СУУРЬ", "DEVELOPMENT FOUNDATION")}</span>
        <p className="mobile-environment-kicker">iBeX MOBILE ENVIRONMENT</p>
        <h1>{t("iBeX мобайл орчин", "iBeX Mobile Environment")}</h1>
        <p>{t("Талбайн ажлыг гар утаснаас удирдах тусдаа орчны үндэс суурийг Version 52-т бэлтгэлээ.", "Version 52 establishes a separate foundation for managing field work from mobile devices.")}</p>
      </section>

      <section className="mobile-capability-grid" aria-label={t("Төлөвлөсөн боломжууд", "Planned capabilities")}>
        {capabilities.map((capability) => (
          <article key={capability.titleEn}>
            <span className="mobile-capability-icon" aria-hidden="true">{capability.icon}</span>
            <small>{t("ТӨЛӨВЛӨСӨН", "PLANNED")}</small>
            <h2>{t(capability.titleMn, capability.titleEn)}</h2>
            <p>{t(capability.bodyMn, capability.bodyEn)}</p>
          </article>
        ))}
      </section>

      <aside className="mobile-environment-boundary">
        <strong>{t("Version 52-ын хязгаар", "Version 52 boundary")}</strong>
        <p>{t("Энэ хувилбарт мобайл үйлдлүүд идэвхжээгүй. Тусдаа зам, цэс, хөгжүүлэлтийн хүрээг бий болгосон бөгөөд одоогийн iBeX веб орчны ажиллагаанд өөрчлөлт оруулаагүй.", "Mobile actions are not active in this release. It creates the separate route, navigation and development scope without changing the current iBeX web environment.")}</p>
      </aside>

      <nav className="mobile-environment-actions" aria-label={t("Орчны холбоос", "Environment links")}>
        <Link className="mobile-environment-primary" href="/organization">{t("iBeX веб орчин руу", "Open iBeX Web Environment")}</Link>
        <Link href="/">{t("Нүүр хуудас", "Home")}</Link>
      </nav>
    </main>
  );
}
