"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

export default function AdminLoginPage() {
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
          setError(setup.error || `Админ тохиргоог шалгаж чадсангүй (HTTP ${setupResponse.status}).`);
          return;
        }
        setNeedsSetup(Boolean(setup.needsSetup));
        setSetupEligible(Boolean(setup.eligible));
        if (setup.identity) {
          setEmail(setup.identity.email || "");
          setName(setup.identity.name || "");
        }
      } catch {
        setError("Сервертэй холбогдож чадсангүй. Сүлжээгээ шалгаад дахин оролдоно уу.");
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
          ? `Сервер хүсэлтийг боловсруулж чадсангүй (HTTP ${response.status}).`
          : "Сервертэй холбогдож чадсангүй. Сүлжээгээ шалгаад дахин оролдоно уу."),
      );
      setLoading(false);
      return;
    }
    window.location.replace("/admin");
  }

  return (
    <main className="admin-auth-page">
      <Link className="admin-auth-brand" href="/" aria-label="iBeX нүүр">
        <img src="/ibex-main-logo.jpg" alt="iBeX" />
        <span>iBeX</span>
      </Link>
      <section className="admin-auth-card" aria-labelledby="admin-login-title">
        <span className="admin-auth-kicker">WEBSITE CONTENT ADMIN</span>
        <h1 id="admin-login-title">{needsSetup ? "Үндсэн админ үүсгэх" : "Админ нэвтрэлт"}</h1>
        <p>{needsSetup ? "Сайтын эзэмшигч үндсэн админы нууц үгээ нэг удаа тохируулна." : "Үнэ, медиа, хамтрагч байгууллага болон төслийн багийн мэдээллийг удирдана."}</p>
        <form onSubmit={submit}>
          {needsSetup ? <label>
            Нэр
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label> : null}
          <label>
            И-мэйл
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
            Нууц үг
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <div className="admin-auth-error" role="alert">{error}</div> : null}
          {needsSetup && !setupEligible ? <div className="admin-auth-error" role="alert">Үндсэн админыг сайтын баталгаажсан эзэмшигчийн нэвтрэлтээр үүсгэнэ.</div> : null}
          <button type="submit" disabled={checking || loading || (needsSetup && !setupEligible)}>
            {checking ? "Админ эрх шалгаж байна…" : loading ? "Шалгаж байна…" : needsSetup ? "Үндсэн админ үүсгэх" : "Нэвтрэх"}
          </button>
        </form>
        <div className="admin-auth-links">
          <a href="https://demo.ibex.mn">iBeX системд нэвтрэх ↗</a>
          <Link href="/">Нүүр хуудас руу буцах</Link>
        </div>
      </section>
    </main>
  );
}
