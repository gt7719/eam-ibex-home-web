"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSiteLanguage } from "../../lib/use-site-language";

type Entry = {
  id: string;
  sourceUrl: string;
  type: string;
  title: string;
  text: string;
  imageUrl: string;
  publishedAt: string;
  status: string;
  enabled: boolean;
  importStatus?: string;
};

export default function SocialContentPage() {
  const { t } = useSiteLanguage();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (new URLSearchParams(location.search).get("embedded") === "1") {
      document.body.classList.add("embedded-child-admin");
    }
    fetch("/api/admin/social-content", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) { location.replace("/admin/login"); return; }
        if (response.status === 403) { location.replace("/admin"); return; }
        const payload = await response.json();
        setEntries(payload.entries || []);
      })
      .catch(() => setError("Контентын мэдээллийг уншиж чадсангүй. / Could not load content."));
    return () => document.body.classList.remove("embedded-child-admin");
  }, []);

  function update<K extends keyof Entry>(id: string, key: K, value: Entry[K]) {
    setEntries((rows) => rows.map((row) => row.id === id ? { ...row, [key]: value } : row));
  }

  async function importLink(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/social-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error || t("Холбоосыг оруулж чадсангүй.", "Could not import the link."));
    else {
      setEntries((rows) => [payload.entry, ...rows]);
      setUrl("");
      setMessage(payload.entry.importStatus === "metadata_loaded"
        ? t("Мэдээллийг татлаа. Хянаад нийтэлнэ үү.", "Metadata loaded. Review it before publishing.")
        : t("Холбоосыг ноорог болголоо. Мэдээллийг хянаж нөхнө үү.", "The link was saved as a draft. Review and complete its content."));
    }
    setBusy(false);
  }

  async function save() {
    setBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/social-content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error || t("Хадгалж чадсангүй.", "Could not save changes."));
    else {
      setEntries(payload.entries);
      setMessage(t("Мэдээ ба контентын өөрчлөлтийг хадгаллаа.", "News and content changes were saved."));
    }
    setBusy(false);
  }

  return (
    <main className="knowledge-page social-content-page">
      <header className="knowledge-header">
        <a href="/admin" className="admin-users-back">← {t("Сайтын админ", "Site administration")}</a>
        <div>
          <span className="admin-auth-kicker">iBeX PROJECT MONGOLIA</span>
          <h1>{t("Мэдээ ба контент", "News and content")}</h1>
          <p>{t("Facebook пост, Reel-ийн холбоосоор ноорог үүсгэж, хянасны дараа нийтэлнэ.", "Create a draft from a Facebook post or Reel link and publish it after review.")}</p>
        </div>
        <div className="knowledge-boundary">
          <strong>{t("Эрхээр хамгаалагдсан", "Permission protected")}</strong>
          <small>{t("Зөвхөн үндсэн админаас эрх авсан админ удирдана.", "Only an administrator authorized by the owner can manage this content.")}</small>
        </div>
      </header>
      {error ? <div className="knowledge-alert error">{error}</div> : null}
      {message ? <div className="knowledge-alert success">{message}</div> : null}
      <form className="admin-invite-card social-import-card" onSubmit={importLink}>
        <div>
          <span className="admin-step">01</span>
          <h2>{t("Facebook холбоос оруулах", "Import a Facebook link")}</h2>
          <p>{t("Нээлттэй metadata ирвэл автоматаар бөглөнө. Ирэхгүй бол холбоосыг хадгалж гараар хянана.", "Public metadata is filled automatically when available; otherwise the link is saved for manual review.")}</p>
        </div>
        <div className="social-import-fields">
          <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.facebook.com/..." required />
          <button className="admin-invite-submit" disabled={busy}>{t("Холбоосоос ноорог үүсгэх", "Create draft from link")}</button>
        </div>
      </form>
      <section className="admin-users-list social-content-list">
        <div className="admin-users-list-head">
          <div>
            <span className="admin-step">02</span>
            <h2>{t("Контентын жагсаалт", "Content list")}</h2>
            <p>{t("Зөвхөн Published + Идэвхтэй контент нийтийн Танилцуулга хэсэгт харагдана.", "Only Published + Enabled content appears in the public Resources section.")}</p>
          </div>
          <button onClick={save} disabled={busy}>{t("Бүгдийг хадгалах", "Save all")}</button>
        </div>
        {!entries.length ? <p className="admin-users-empty">{t("Одоогоор контент бүртгэгдээгүй байна.", "No content has been registered yet.")}</p> : entries.map((row) => (
          <article className="social-content-card" key={row.id}>
            <aside className="social-content-media">
              {row.imageUrl
                ? <span className="social-content-image" role="img" aria-label={row.title || t("Контентын зураг", "Content image")} style={{ backgroundImage: `url(${row.imageUrl})` }} />
                : <span>{t("Зураг хараахан байхгүй", "No image yet")}</span>}
              <a href={row.sourceUrl} target="_blank" rel="noreferrer">{t("Эх холбоос", "Source link")} ↗</a>
            </aside>
            <div className="knowledge-grid social-content-fields">
              <label>{t("Төрөл", "Type")}<select value={row.type} onChange={(event) => update(row.id, "type", event.target.value)}><option value="post">Post</option><option value="reel">Reel</option><option value="update">{t("Системийн шинэчлэл", "System update")}</option><option value="event">{t("Олон нийтийн арга хэмжээ", "Public event")}</option><option value="research">{t("Судалгаа, хөгжүүлэлт", "Research and development")}</option></select></label>
              <label>{t("Төлөв", "Status")}<select value={row.status} onChange={(event) => update(row.id, "status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
              <label className="wide">{t("Гарчиг", "Title")}<input value={row.title} onChange={(event) => update(row.id, "title", event.target.value)} /></label>
              <label className="wide">{t("Агуулга", "Content")}<textarea value={row.text} onChange={(event) => update(row.id, "text", event.target.value)} /></label>
              <label className="wide">{t("Зургийн холбоос", "Image URL")}<input value={row.imageUrl} onChange={(event) => update(row.id, "imageUrl", event.target.value)} /></label>
              <label className="knowledge-switch"><input type="checkbox" checked={row.enabled} onChange={(event) => update(row.id, "enabled", event.target.checked)} /><span>{t("Идэвхтэй", "Enabled")}</span></label>
              <button type="button" className="social-delete" onClick={() => setEntries((rows) => rows.filter((entry) => entry.id !== row.id))}>{t("Устгах", "Delete")}</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
