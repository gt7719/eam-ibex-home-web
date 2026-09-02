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
  titleMn?: string;
  titleEn?: string;
  summaryMn?: string;
  summaryEn?: string;
  descriptionMn?: string;
  descriptionEn?: string;
  eventTypeMn?: string;
  eventTypeEn?: string;
  startAt?: string;
  endAt?: string;
  locationMn?: string;
  locationEn?: string;
  organizerMn?: string;
  organizerEn?: string;
  videoUrl?: string;
  galleryUrls?: string[];
  sortOrder?: number;
};

function createManualEntry(type: "event" | "research"): Entry {
  return {
    id: crypto.randomUUID(), sourceUrl: "", videoUrl: "", type,
    title: "", text: "", titleMn: "", titleEn: "", summaryMn: "", summaryEn: "",
    descriptionMn: "", descriptionEn: "", eventTypeMn: "", eventTypeEn: "",
    startAt: "", endAt: "", locationMn: "", locationEn: "",
    organizerMn: "", organizerEn: "", imageUrl: "", galleryUrls: [],
    publishedAt: "", sortOrder: 0, status: "draft", enabled: true,
  };
}

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

  function addManualEntry(type: "event" | "research") {
    setEntries((rows) => [createManualEntry(type), ...rows]);
    setMessage(type === "event"
      ? t("Олон нийтийн арга хэмжээний ноорог нэмлээ.", "A public-event draft was added.")
      : t("Судалгаа ба хөгжүүлэлтийн ноорог нэмлээ.", "A research and development draft was added."));
    setError("");
  }

  function updateGallery(id: string, value: string) {
    update(id, "galleryUrls", value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean));
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
        <div className="social-manual-actions">
          <button type="button" onClick={() => addManualEntry("event")} disabled={busy}>{t("＋ Олон нийтийн арга хэмжээ", "＋ Public event")}</button>
          <button type="button" onClick={() => addManualEntry("research")} disabled={busy}>{t("＋ Судалгаа ба хөгжүүлэлт", "＋ Research & development")}</button>
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
          <article className={`social-content-card ${row.type === "event" ? "event-content-card" : ""}`} key={row.id}>
            <aside className="social-content-media">
              {row.imageUrl
                ? <span className="social-content-image" role="img" aria-label={row.titleMn || row.titleEn || row.title || t("Контентын зураг", "Content image")} style={{ backgroundImage: `url(${row.imageUrl})` }} />
                : <span>{t("Зураг хараахан байхгүй", "No image yet")}</span>}
              {row.sourceUrl ? <a href={row.sourceUrl} target="_blank" rel="noreferrer">{t("Эх холбоос", "Source link")} ↗</a> : null}
              {row.galleryUrls?.length ? <small>{t(`${row.galleryUrls.length} цомгийн зураг`, `${row.galleryUrls.length} gallery images`)}</small> : null}
            </aside>
            <div className="knowledge-grid social-content-fields">
              <label>{t("Төрөл", "Type")}<select value={row.type} onChange={(event) => update(row.id, "type", event.target.value)}><option value="post">Post</option><option value="reel">Reel</option><option value="event">{t("Олон нийтийн арга хэмжээ", "Public event")}</option><option value="research">{t("Судалгаа, хөгжүүлэлт", "Research and development")}</option></select></label>
              <label>{t("Төлөв", "Status")}<select value={row.status} onChange={(event) => update(row.id, "status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
              <label>{t("Дараалал", "Order")}<input type="number" min="0" max="9999" value={row.sortOrder ?? 0} onChange={(event) => update(row.id, "sortOrder", Number(event.target.value))} /></label>
              {row.type === "event" ? <>
                <label>{t("Арга хэмжээний төрөл · MN", "Event type · MN")}<input value={row.eventTypeMn || ""} onChange={(event) => update(row.id, "eventTypeMn", event.target.value)} /></label>
                <label>{t("Арга хэмжээний төрөл · EN", "Event type · EN")}<input value={row.eventTypeEn || ""} onChange={(event) => update(row.id, "eventTypeEn", event.target.value)} /></label>
                <label className="wide">{t("Гарчиг · MN", "Title · MN")}<input value={row.titleMn || ""} onChange={(event) => update(row.id, "titleMn", event.target.value)} /></label>
                <label className="wide">Title · EN<input value={row.titleEn || ""} onChange={(event) => update(row.id, "titleEn", event.target.value)} /></label>
                <label className="wide">{t("Товч тайлбар · MN", "Summary · MN")}<textarea className="event-summary" value={row.summaryMn || ""} onChange={(event) => update(row.id, "summaryMn", event.target.value)} /></label>
                <label className="wide">Summary · EN<textarea className="event-summary" value={row.summaryEn || ""} onChange={(event) => update(row.id, "summaryEn", event.target.value)} /></label>
                <label className="wide">{t("Дэлгэрэнгүй тайлбар · MN", "Full description · MN")}<textarea value={row.descriptionMn || ""} onChange={(event) => update(row.id, "descriptionMn", event.target.value)} /></label>
                <label className="wide">Full description · EN<textarea value={row.descriptionEn || ""} onChange={(event) => update(row.id, "descriptionEn", event.target.value)} /></label>
                <label>{t("Эхлэх огноо", "Start date")}<input type="datetime-local" value={row.startAt || ""} onChange={(event) => update(row.id, "startAt", event.target.value)} /></label>
                <label>{t("Дуусах огноо", "End date")}<input type="datetime-local" value={row.endAt || ""} onChange={(event) => update(row.id, "endAt", event.target.value)} /></label>
                <label>{t("Байршил · MN", "Location · MN")}<input value={row.locationMn || ""} onChange={(event) => update(row.id, "locationMn", event.target.value)} /></label>
                <label>Location · EN<input value={row.locationEn || ""} onChange={(event) => update(row.id, "locationEn", event.target.value)} /></label>
                <label>{t("Зохион байгуулагч · MN", "Organizer · MN")}<input value={row.organizerMn || ""} onChange={(event) => update(row.id, "organizerMn", event.target.value)} /></label>
                <label>Organizer · EN<input value={row.organizerEn || ""} onChange={(event) => update(row.id, "organizerEn", event.target.value)} /></label>
                <label className="wide">{t("Нүүр зургийн HTTPS холбоос", "Cover-image HTTPS URL")}<input type="url" value={row.imageUrl} onChange={(event) => update(row.id, "imageUrl", event.target.value)} /></label>
                <label className="wide">{t("Зургийн цомог · мөр бүрт нэг HTTPS холбоос", "Gallery · one HTTPS URL per line")}<textarea value={(row.galleryUrls || []).join("\n")} onChange={(event) => updateGallery(row.id, event.target.value)} /></label>
                <label className="wide">{t("Видео холбоос", "Video URL")}<input type="url" value={row.videoUrl || ""} onChange={(event) => update(row.id, "videoUrl", event.target.value)} /></label>
                <label className="wide">{t("Эх сурвалжийн холбоос", "Source URL")}<input type="url" value={row.sourceUrl} onChange={(event) => update(row.id, "sourceUrl", event.target.value)} /></label>
              </> : <>
                <label className="wide">{t("Гарчиг", "Title")}<input value={row.title} onChange={(event) => update(row.id, "title", event.target.value)} /></label>
                <label className="wide">{t("Агуулга", "Content")}<textarea value={row.text} onChange={(event) => update(row.id, "text", event.target.value)} /></label>
                <label className="wide">{t("Зургийн холбоос", "Image URL")}<input value={row.imageUrl} onChange={(event) => update(row.id, "imageUrl", event.target.value)} /></label>
                <label className="wide">{t("Эх сурвалжийн холбоос", "Source URL")}<input value={row.sourceUrl} onChange={(event) => update(row.id, "sourceUrl", event.target.value)} /></label>
              </>}
              <label className="knowledge-switch"><input type="checkbox" checked={row.enabled} onChange={(event) => update(row.id, "enabled", event.target.checked)} /><span>{t("Идэвхтэй", "Enabled")}</span></label>
              <button type="button" className="social-delete" onClick={() => setEntries((rows) => rows.filter((entry) => entry.id !== row.id))}>{t("Устгах", "Delete")}</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
