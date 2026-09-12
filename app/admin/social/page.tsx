"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useState } from "react";
import { useSiteLanguage } from "../../lib/use-site-language";

type GalleryImage = {
  id: string;
  url: string;
  captionMn: string;
  captionEn: string;
};

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
  galleryImages?: GalleryImage[];
  imageCaptionMn?: string;
  imageCaptionEn?: string;
  sortOrder?: number;
};

function createManualEntry(type: "event" | "research"): Entry {
  return {
    id: crypto.randomUUID(), sourceUrl: "", videoUrl: "", type,
    title: "", text: "", titleMn: "", titleEn: "", summaryMn: "", summaryEn: "",
    descriptionMn: "", descriptionEn: "", eventTypeMn: "", eventTypeEn: "",
    startAt: "", endAt: "", locationMn: "", locationEn: "",
    organizerMn: "", organizerEn: "", imageUrl: "", imageCaptionMn: "", imageCaptionEn: "",
    galleryUrls: [], galleryImages: [],
    publishedAt: "", sortOrder: 0, status: "draft", enabled: true,
  };
}

export default function SocialContentPage() {
  const { t } = useSiteLanguage();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");

  useEffect(() => {
    if (new URLSearchParams(location.search).get("embedded") === "1") {
      document.body.classList.add("embedded-child-admin");
    }
    fetch("/api/admin/social-content", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) { location.replace("/admin/login"); return; }
        if (response.status === 403) { location.replace("/admin"); return; }
        const payload = await response.json();
        const next = payload.entries || []; setEntries(next); setRevision(payload.revision || null); setSavedSnapshot(JSON.stringify(next));
      })
      .catch(() => setError("Контентын мэдээллийг уншиж чадсангүй. / Could not load content."));
    return () => document.body.classList.remove("embedded-child-admin");
  }, []);
  const dirty = Boolean(savedSnapshot && JSON.stringify(entries) !== savedSnapshot);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    window.parent.postMessage({ type: "ibex-admin-dirty", dirty }, location.origin);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

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

  async function uploadImage(file: File) {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 25 * 1024 * 1024) {
      throw new Error(t("PNG, JPG, WebP эсвэл GIF зураг 25 MB-аас бага байна.", "Choose a PNG, JPG, WebP or GIF image smaller than 25 MB."));
    }
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/admin/media", { method: "POST", body: form });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || t("Зургийг байршуулж чадсангүй.", "Could not upload the image."));
    return String(payload.url || "");
  }

  async function chooseCover(row: Entry, files: FileList | File[]) {
    const file = Array.from(files)[0];
    if (!file) return;
    setUploading(`${row.id}:cover`); setError(""); setMessage("");
    try {
      const imageUrl = await uploadImage(file);
      update(row.id, "imageUrl", imageUrl);
      setMessage(t("Нүүр зураг орлоо. Өөрчлөлтийг хадгална уу.", "Cover image uploaded. Save the changes to publish it."));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("Зургийг байршуулж чадсангүй.", "Could not upload the image."));
    } finally {
      setUploading("");
    }
  }

  async function chooseGallery(row: Entry, files: FileList | File[]) {
    const selected = Array.from(files).slice(0, Math.max(0, 20 - (row.galleryImages?.length || 0)));
    if (!selected.length) return;
    setUploading(`${row.id}:gallery`); setError(""); setMessage("");
    try {
      const urls = await Promise.all(selected.map(uploadImage));
      const galleryImages = [
        ...(row.galleryImages || []),
        ...urls.map((imageUrl) => ({ id: crypto.randomUUID(), url: imageUrl, captionMn: "", captionEn: "" })),
      ].slice(0, 20);
      update(row.id, "galleryImages", galleryImages);
      update(row.id, "galleryUrls", galleryImages.map((image) => image.url));
      setMessage(t(`${urls.length} зураг цомогт орлоо. Өөрчлөлтийг хадгална уу.`, `${urls.length} image(s) added to the gallery. Save the changes to publish them.`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("Зургуудыг байршуулж чадсангүй.", "Could not upload the images."));
    } finally {
      setUploading("");
    }
  }

  function updateGalleryImage(row: Entry, imageId: string, changes: Partial<GalleryImage>) {
    const galleryImages = (row.galleryImages || []).map((image) => image.id === imageId ? { ...image, ...changes } : image);
    update(row.id, "galleryImages", galleryImages);
    update(row.id, "galleryUrls", galleryImages.map((image) => image.url));
  }

  function removeGalleryImage(row: Entry, imageId: string) {
    const galleryImages = (row.galleryImages || []).filter((image) => image.id !== imageId);
    update(row.id, "galleryImages", galleryImages);
    update(row.id, "galleryUrls", galleryImages.map((image) => image.url));
  }

  function moveGalleryImage(row: Entry, imageId: string, direction: -1 | 1) {
    const galleryImages = [...(row.galleryImages || [])];
    const index = galleryImages.findIndex((image) => image.id === imageId);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= galleryImages.length) return;
    [galleryImages[index], galleryImages[destination]] = [galleryImages[destination], galleryImages[index]];
    update(row.id, "galleryImages", galleryImages);
    update(row.id, "galleryUrls", galleryImages.map((image) => image.url));
  }

  function imageDrop(handler: (files: File[]) => void) {
    return (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      handler(Array.from(event.dataTransfer.files));
    };
  }

  function imageInput(handler: (files: FileList) => void) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) handler(event.target.files);
      event.target.value = "";
    };
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
      body: JSON.stringify({ entries, revision }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error || t("Хадгалж чадсангүй.", "Could not save changes."));
    else {
      setEntries(payload.entries); setRevision(payload.revision || null); setSavedSnapshot(JSON.stringify(payload.entries));
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
              {row.galleryImages?.length ? <small>{t(`${row.galleryImages.length} цомгийн зураг`, `${row.galleryImages.length} gallery images`)}</small> : null}
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
                <label className="wide">{t("Видео холбоос", "Video URL")}<input type="url" value={row.videoUrl || ""} onChange={(event) => update(row.id, "videoUrl", event.target.value)} /></label>
                <label className="wide">{t("Эх сурвалжийн холбоос", "Source URL")}<input type="url" value={row.sourceUrl} onChange={(event) => update(row.id, "sourceUrl", event.target.value)} /></label>
              </> : <>
                <label className="wide">{t("Гарчиг", "Title")}<input value={row.title} onChange={(event) => update(row.id, "title", event.target.value)} /></label>
                <label className="wide">{t("Агуулга", "Content")}<textarea value={row.text} onChange={(event) => update(row.id, "text", event.target.value)} /></label>
                <label className="wide">{t("Эх сурвалжийн холбоос", "Source URL")}<input value={row.sourceUrl} onChange={(event) => update(row.id, "sourceUrl", event.target.value)} /></label>
              </>}
              <section
                className="social-media-editor"
                onDragOver={(event) => event.preventDefault()}
                onDrop={imageDrop((files) => chooseCover(row, files))}
              >
                <div className="social-media-editor-head">
                  <div>
                    <strong>{row.type === "event" ? t("Нүүр зураг", "Cover image") : t("Контентын зураг", "Content image")}</strong>
                    <small>{t("Зургийг энд чирэх эсвэл төхөөрөмжөөс сонгоно.", "Drag an image here or choose one from your device.")}</small>
                  </div>
                  <div className="social-media-actions">
                    <label className="social-upload-button">
                      {row.imageUrl ? t("Зураг солих", "Replace image") : t("Зураг сонгох", "Choose image")}
                      <input type="file" accept="image/*" onChange={imageInput((files) => chooseCover(row, files))} disabled={Boolean(uploading)} />
                    </label>
                    {row.imageUrl ? <button type="button" onClick={() => update(row.id, "imageUrl", "")}>{t("Устгах", "Remove")}</button> : null}
                  </div>
                </div>
                <div className="social-cover-editor">
                  {row.imageUrl
                    ? <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={row.imageUrl} alt={row.imageCaptionMn || row.imageCaptionEn || row.titleMn || row.title || ""} />
                    </>
                    : <div className="social-image-empty">{uploading === `${row.id}:cover` ? t("Зургийг байршуулж байна…", "Uploading image…") : t("Зураг сонгоогүй", "No image selected")}</div>}
                  <div className="social-caption-fields">
                    <label>{t("Зургийн тайлбар · MN", "Image caption · MN")}<input value={row.imageCaptionMn || ""} onChange={(event) => update(row.id, "imageCaptionMn", event.target.value)} /></label>
                    <label>Image caption · EN<input value={row.imageCaptionEn || ""} onChange={(event) => update(row.id, "imageCaptionEn", event.target.value)} /></label>
                  </div>
                </div>
              </section>
              {row.type === "event" ? <section
                className="social-media-editor social-gallery-editor"
                onDragOver={(event) => event.preventDefault()}
                onDrop={imageDrop((files) => chooseGallery(row, files))}
              >
                <div className="social-media-editor-head">
                  <div>
                    <strong>{t("Зургийн цомог", "Image gallery")}</strong>
                    <small>{t("Нэг эсвэл олон зургийг зэрэг сонгоно. Нийт 20 хүртэл зураг.", "Choose one or several images at once, up to 20 in total.")}</small>
                  </div>
                  <label className="social-upload-button">
                    {uploading === `${row.id}:gallery` ? t("Байршуулж байна…", "Uploading…") : t("Олон зураг сонгох", "Choose images")}
                    <input type="file" accept="image/*" multiple onChange={imageInput((files) => chooseGallery(row, files))} disabled={Boolean(uploading)} />
                  </label>
                </div>
                {(row.galleryImages || []).length ? <div className="social-gallery-list">
                  {(row.galleryImages || []).map((image, index) => <article className="social-gallery-item" key={image.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={image.captionMn || image.captionEn || `${row.titleMn || row.title || "Gallery"} ${index + 1}`} />
                    <div className="social-caption-fields">
                      <label>{t("Жижиг тайлбар · MN", "Short caption · MN")}<input value={image.captionMn} onChange={(event) => updateGalleryImage(row, image.id, { captionMn: event.target.value })} /></label>
                      <label>Short caption · EN<input value={image.captionEn} onChange={(event) => updateGalleryImage(row, image.id, { captionEn: event.target.value })} /></label>
                    </div>
                    <div className="social-gallery-actions">
                      <button type="button" onClick={() => moveGalleryImage(row, image.id, -1)} disabled={index === 0} aria-label={t("Зургийг урагшлуулах", "Move image earlier")}>↑</button>
                      <button type="button" onClick={() => moveGalleryImage(row, image.id, 1)} disabled={index === (row.galleryImages || []).length - 1} aria-label={t("Зургийг хойшлуулах", "Move image later")}>↓</button>
                      <button type="button" onClick={() => removeGalleryImage(row, image.id)}>{t("Устгах", "Remove")}</button>
                    </div>
                  </article>)}
                </div> : <div className="social-gallery-empty">{t("Цомгийн зураг сонгоогүй байна.", "No gallery images selected.")}</div>}
              </section> : null}
              <label className="knowledge-switch"><input type="checkbox" checked={row.enabled} onChange={(event) => update(row.id, "enabled", event.target.checked)} /><span>{t("Идэвхтэй", "Enabled")}</span></label>
              <button type="button" className="social-delete" onClick={() => setEntries((rows) => rows.filter((entry) => entry.id !== row.id))}>{t("Устгах", "Delete")}</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
