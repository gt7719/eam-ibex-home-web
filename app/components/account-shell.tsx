"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useSiteLanguage } from "../lib/use-site-language";

export function AccountShell({ kicker, titleMn, titleEn, introMn, introEn, children }: {
  kicker: string;
  titleMn: string;
  titleEn: string;
  introMn: string;
  introEn: string;
  children: ReactNode;
}) {
  const { t } = useSiteLanguage();
  return (
    <main className="account-page">
      <div className="account-orbit account-orbit-one" aria-hidden="true" />
      <div className="account-orbit account-orbit-two" aria-hidden="true" />
      <Link className="account-brand" href="/" aria-label={t("iBeX нүүр", "iBeX home")}>
        <Image src="/ibex-main-logo.jpg" alt="iBeX" width={48} height={48} priority />
        <span><strong>iBeX</strong><small>Enterprise Asset Management</small></span>
      </Link>
      <section className="account-card">
        <span className="account-kicker">{kicker}</span>
        <h1>{t(titleMn, titleEn)}</h1>
        <p className="account-intro">{t(introMn, introEn)}</p>
        {children}
      </section>
      <p className="account-security-note">{t("Хамгаалалттай бүртгэл • И-мэйл баталгаажуулалт • SMS-д бэлэн", "Secure account • Email verification • SMS-ready")}</p>
    </main>
  );
}

export function AccountAlert({ type, children }: { type: "error" | "success" | "notice"; children: ReactNode }) {
  return <div className={`account-alert ${type}`} role={type === "error" ? "alert" : "status"}>{children}</div>;
}
