"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSiteLanguage } from "../../lib/use-site-language";

export default function AdminLoginPage() {
  const { t } = useSiteLanguage();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupEligible, setSetupEligible] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        if (response.ok) {
          window.location.replace("/admin");
          return;
        }
        const setupResponse = await fetch("/api/admin/setup", { cache: "no-store" });
        const setup = await setupResponse.json().catch(() => ({}));
        if (!setupResponse.ok) {
          setError(setup.error || `Админ тохиргоог шалгаж чадсангүй / Could not check administrator setup (HTTP ${setupResponse.status}).`);
          return;
        }
        setNeedsSetup(Boolean(setup.needsSetup));
        setSetupEligible(Boolean(setup.eligible));
        if (setup.identity) {
          setEmail(setup.identity.email || "");
          setName(setup.identity.name || "");
        }
      } catch {
        setError("Сервертэй холбогдож чадсангүй. / Could not connect to the server.");
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch(needsSetup ? "/api/admin/setup" : "/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    }).catch(() => null);

    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setError(
        payload.error ||
        (response
          ? t(`Сервер хүсэлтийг боловсруулж чадсангүй (HTTP ${response.status}).`, `The server could not process the request (HTTP ${response.status}).`)
          : t("Сервертэй холбогдож чадсангүй. Сүлжээгээ шалгаад дахин оролдоно уу.", "Could not connect to the server. Check your network and try again.")),
      );
      setLoading(false);
      return;
    }
    window.location.replace("/admin");
  }

  return (
    <main className="admin-auth-page">
      <Link className="admin-auth-brand" href="/" aria-label={t("iBeX нүүр", "iBeX home")}>
        <Image src="/ibex-main-logo.jpg" alt="iBeX" width={40} height={40} priority />
        <span>iBeX</span>
      </Link>
      <section className="admin-auth-card" aria-labelledby="admin-login-title">
        <span className="admin-auth-kicker">WEBSITE CONTENT ADMIN</span>
        <h1 id="admin-login-title">{needsSetup ? t("Үндсэн админ үүсгэх", "Create owner administrator") : t("Админ нэвтрэлт", "Administrator sign in")}</h1>
        <p>{needsSetup ? t("Сайтын эзэмшигч үндсэн админы нууц үгээ нэг удаа тохируулна.", "The site owner sets the owner administrator password once.") : t("Үнэ, медиа, хамтрагч байгууллага болон төслийн багийн мэдээллийг удирдана.", "Manage pricing, media, partner organizations and project team information.")}</p>
        <form onSubmit={submit}>
          {needsSetup ? <label>
            {t("Нэр", "Name")}
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label> : null}
          <label>
            {t("И-мэйл", "Email")}
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              readOnly={needsSetup}
              required
            />
          </label>
          <label>
            {t("Нууц үг", "Password")}
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <div className="admin-auth-error" role="alert">{error}</div> : null}
          {needsSetup && !setupEligible ? <div className="admin-auth-error" role="alert">{t("Үндсэн админыг сайтын баталгаажсан эзэмшигчийн нэвтрэлтээр үүсгэнэ.", "The owner administrator must be created through the verified site owner session.")}</div> : null}
          <button type="submit" disabled={checking || loading || (needsSetup && !setupEligible)}>
            {checking ? t("Админ эрх шалгаж байна…", "Checking administrator access…") : loading ? t("Шалгаж байна…", "Checking…") : needsSetup ? t("Үндсэн админ үүсгэх", "Create owner administrator") : t("Нэвтрэх", "Sign in")}
          </button>
        </form>
        <div className="admin-auth-links">
          <a href="https://demo.ibex.mn">{t("iBeX системд нэвтрэх", "Sign in to iBeX System")} ↗</a>
          <Link href="/">{t("Нүүр хуудас руу буцах", "Return home")}</Link>
        </div>
      </section>
    </main>
  );
}
