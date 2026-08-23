"use client";

import { FormEvent, useEffect, useState } from "react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" }).then((response) => {
      if (response.ok) window.location.replace("/admin");
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).catch(() => null);

    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setError(payload.error || "Нэвтрэх үед алдаа гарлаа.");
      setLoading(false);
      return;
    }
    window.location.replace("/admin");
  }

  return (
    <main className="admin-auth-page">
      <a className="admin-auth-brand" href="/" aria-label="iBeX нүүр">
        <img src="/ibex-main-logo.jpg" alt="iBeX" />
        <span>iBeX</span>
      </a>
      <section className="admin-auth-card" aria-labelledby="admin-login-title">
        <span className="admin-auth-kicker">WEBSITE CONTENT ADMIN</span>
        <h1 id="admin-login-title">Админ нэвтрэлт</h1>
        <p>Үнэ, хамтрагч байгууллага болон төслийн багийн мэдээллийг удирдана.</p>
        <form onSubmit={submit}>
          <label>
            И-мэйл
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
          <button type="submit" disabled={loading}>
            {loading ? "Шалгаж байна…" : "Нэвтрэх"}
          </button>
        </form>
        <div className="admin-auth-links">
          <a href="https://demo.ibex.mn">iBeX системд нэвтрэх ↗</a>
          <a href="/">Нүүр хуудас руу буцах</a>
        </div>
      </section>
    </main>
  );
}
