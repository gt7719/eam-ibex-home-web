"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import {
  cloneDefaultNavigation,
  NAVIGATION_LIMITS,
  NAVIGATION_ICON_OPTIONS,
  type NavigationConfig,
  type NavigationGroup,
  type NavigationItem,
  type NavigationMedia,
  type NavigationMenu,
} from "../../lib/navigation";
import { useSiteLanguage } from "../../lib/use-site-language";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function move<T>(rows: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= rows.length) return rows;
  const next = [...rows];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function newItem(menuId: string): NavigationItem {
  return {
    id: `${menuId}-item-${crypto.randomUUID()}`,
    titleMn: "Шинэ мэдээлэл",
    titleEn: "New item",
    descriptionMn: "",
    descriptionEn: "",
    icon: "content",
    href: "",
    openInNewTab: false,
    enabled: true,
    bodyMn: "",
    bodyEn: "",
    media: [],
  };
}

function newMenu(): NavigationMenu {
  const menuId = `menu-${crypto.randomUUID()}`;
  return {
    id: menuId,
    labelMn: "Шинэ цэс",
    labelEn: "New menu",
    enabled: true,
    archived: false,
    kickerMn: "",
    kickerEn: "",
    titleMn: "Шинэ цэс",
    titleEn: "New menu",
    introMn: "",
    introEn: "",
    footerMn: "",
    footerEn: "",
    feature: { eyebrowMn: "", eyebrowEn: "", titleMn: "", titleEn: "", descriptionMn: "", descriptionEn: "", statMn: "", statEn: "", ctaMn: "Бүгдийг харах →", ctaEn: "View all →" },
    groups: [newGroup(menuId)],
  };
}

function newGroup(menuId: string): NavigationGroup {
  return {
    id: `${menuId}-group-${crypto.randomUUID()}`,
    titleMn: "Шинэ бүлэг",
    titleEn: "New group",
    enabled: true,
    items: [newItem(menuId)],
  };
}

export default function NavigationAdminPage() {
  const { t, lang } = useSiteLanguage();
  const [draft, setDraft] = useState<NavigationConfig | null>(null);
  const [published, setPublished] = useState<NavigationConfig | null>(null);
  const [revision, setRevision] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [activeId, setActiveId] = useState("product");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [canUploadMedia, setCanUploadMedia] = useState(false);
  const [uploading, setUploading] = useState("");

  useEffect(() => {
    fetch("/api/admin/navigation", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          window.parent.location.replace("/admin/login");
          return;
        }
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        setDraft(payload.draft);
        setPublished(payload.published);
        setRevision(payload.draftUpdatedAt || null);
        setSavedSnapshot(JSON.stringify(payload.draft));
        setCanUploadMedia(payload.canUploadMedia === true);
        setLoading(false);
      })
      .catch((reason) => {
        setError(reason?.message || "Цэсийн мэдээллийг уншиж чадсангүй. / Could not load the menu content.");
        setLoading(false);
      });
  }, []);

  const dirty = Boolean(draft && savedSnapshot && JSON.stringify(draft) !== savedSnapshot);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    window.parent.postMessage({ type: "ibex-admin-dirty", dirty }, location.origin);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const activeMenus = useMemo(() => draft?.menus.filter((menu) => !menu.archived) || [], [draft]);
  const archivedMenus = useMemo(() => draft?.menus.filter((menu) => menu.archived) || [], [draft]);
  const activeMenu = useMemo(
    () => activeMenus.find((menu) => menu.id === activeId) || activeMenus[0],
    [activeId, activeMenus],
  );

  function updateConfig(update: (config: NavigationConfig) => NavigationConfig) {
    setDraft((current) => current ? update(current) : current);
  }

  function updateMenu(update: (menu: NavigationMenu) => NavigationMenu) {
    setDraft((current) => current ? { menus: current.menus.map((menu) => menu.id === activeId ? update(menu) : menu) } : current);
  }

  function field<K extends keyof NavigationMenu>(key: K, value: NavigationMenu[K]) {
    updateMenu((menu) => ({ ...menu, [key]: value }));
  }

  function featureField(key: keyof NavigationMenu["feature"], value: string) {
    updateMenu((menu) => ({ ...menu, feature: { ...menu.feature, [key]: value } }));
  }

  function updateGroup(groupId: string, update: (group: NavigationGroup) => NavigationGroup) {
    updateMenu((menu) => ({ ...menu, groups: menu.groups.map((group) => group.id === groupId ? update(group) : group) }));
  }

  function updateItem(groupId: string, itemId: string, update: (item: NavigationItem) => NavigationItem) {
    updateGroup(groupId, (group) => ({ ...group, items: group.items.map((item) => item.id === itemId ? update(item) : item) }));
  }

  function addMenu() {
    if (!draft || draft.menus.length >= NAVIGATION_LIMITS.menus) {
      setError(t(`Үндсэн цэсийн дээд хязгаар ${NAVIGATION_LIMITS.menus}.`, `The top-level menu limit is ${NAVIGATION_LIMITS.menus}.`));
      return;
    }
    const menu = newMenu();
    updateConfig((current) => ({ menus: [...current.menus.filter((row) => !row.archived), menu, ...current.menus.filter((row) => row.archived)] }));
    setActiveId(menu.id);
    setError("");
  }

  function moveMenu(menuId: string, direction: -1 | 1) {
    updateConfig((current) => {
      const active = current.menus.filter((menu) => !menu.archived);
      const index = active.findIndex((menu) => menu.id === menuId);
      return { menus: [...move(active, index, direction), ...current.menus.filter((menu) => menu.archived)] };
    });
  }

  function archiveMenu(menuId: string) {
    if (activeMenus.length <= 1) {
      setError(t("Хамгийн багадаа нэг удирдлагатай үндсэн цэс үлдэх ёстой.", "At least one managed top-level menu must remain."));
      return;
    }
    if (!confirm(t("Энэ цэсийг бүх дэд мэдээлэл, галерейтай нь архивлах уу?", "Archive this menu with all sub-items and galleries?"))) return;
    if (menuId === activeId) setActiveId(activeMenus.find((menu) => menu.id !== menuId)?.id || activeId);
    updateConfig((current) => ({ menus: current.menus.map((menu) => menu.id === menuId ? { ...menu, archived: true, enabled: false } : menu) }));
  }

  function restoreMenu(menuId: string) {
    updateConfig((current) => ({ menus: current.menus.map((menu) => menu.id === menuId ? { ...menu, archived: false, enabled: true } : menu) }));
    setActiveId(menuId);
  }

  function deleteArchivedMenu(menuId: string) {
    if (!confirm(t("Архивласан цэсийг бүр мөсөн устгах уу?", "Permanently delete this archived menu?"))) return;
    if (!confirm(t("Энэ үйлдлийг буцаах боломжгүй. Үргэлжлүүлэх үү?", "This cannot be undone. Continue?"))) return;
    updateConfig((current) => ({ menus: current.menus.filter((menu) => menu.id !== menuId) }));
  }

  async function save(action: "draft" | "publish") {
    if (!draft) return;
    setWorking(true);
    setMessage("");
    setError("");
    const response = await fetch("/api/admin/navigation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, navigation: draft, revision }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setError(payload.error || t("Өөрчлөлтийг хадгалж чадсангүй.", "Could not save the changes."));
      setWorking(false);
      return;
    }
    setDraft(payload.navigation);
    setRevision(payload.revision || payload.updatedAt || null);
    setSavedSnapshot(JSON.stringify(payload.navigation));
    if (action === "publish") setPublished(clone(payload.navigation));
    setMessage(action === "publish"
      ? t("Цэсийн мэдээллийг сайтад нийтэллээ.", "The menu content was published to the site.")
      : t("Нооргийг хадгаллаа. Сайтын харагдах мэдээлэл өөрчлөгдөөгүй.", "Draft saved. The public site is unchanged."));
    setWorking(false);
  }

  async function uploadAsset(file: File) {
    const form = new FormData(); form.append("file", file);
    const response = await fetch("/api/admin/media", { method: "POST", body: form });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || t("Файлыг байршуулж чадсангүй.", "Could not upload the file."));
    return payload as { id: string; url: string };
  }

  async function uploadMedia(groupId: string, item: NavigationItem, type: NavigationMedia["type"], files: File[]) {
    const allowed = type === "image" ? ["image/jpeg", "image/png", "image/webp", "image/gif"]
      : type === "video" ? ["video/mp4", "video/webm"] : ["application/pdf"];
    const invalid = files.find((file) => !allowed.includes(file.type));
    if (invalid) { setError(t("Сонгосон хэсэгтэй тохирох файл оруулна уу.", "Choose files that match this media section.")); return; }
    const currentCount = (item.media || []).filter((entry) => entry.type === type).length;
    const available = NAVIGATION_LIMITS[type] - currentCount;
    if (files.length > available) {
      setError(t(`${type === "image" ? "Зураг" : type === "video" ? "Видео" : "PDF"}-ийн үлдсэн багтаамж ${available}.`, `${available} ${type} slot(s) remain.`));
      return;
    }
    setUploading(`${item.id}-${type}`); setError("");
    const uploaded: NavigationMedia[] = [];
    try {
      for (const file of files) {
        const asset = await uploadAsset(file);
        uploaded.push({ id: asset.id || crypto.randomUUID(), type, url: asset.url, altMn: "", altEn: "", captionMn: file.name, captionEn: file.name, posterUrl: "", posterAltMn: "", posterAltEn: "" });
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("Файлыг байршуулж чадсангүй.", "Could not upload the file.")); }
    finally { if (uploaded.length) updateItem(groupId, item.id, (row) => ({ ...row, media: [...(row.media || []), ...uploaded] })); setUploading(""); }
  }

  function updateMedia(groupId: string, itemId: string, mediaId: string, update: (media: NavigationMedia) => NavigationMedia) {
    updateItem(groupId, itemId, (item) => ({ ...item, media: (item.media || []).map((media) => media.id === mediaId ? update(media) : media) }));
  }

  function removeMedia(groupId: string, itemId: string, mediaId: string) {
    updateItem(groupId, itemId, (item) => ({ ...item, media: (item.media || []).filter((media) => media.id !== mediaId) }));
  }

  function moveMedia(groupId: string, itemId: string, mediaId: string, direction: -1 | 1) {
    updateItem(groupId, itemId, (item) => {
      const media = [...(item.media || [])], current = media.find((entry) => entry.id === mediaId);
      if (!current) return item;
      const typedIndexes = media.map((entry, index) => entry.type === current.type ? index : -1).filter((index) => index >= 0);
      const typedIndex = typedIndexes.indexOf(media.findIndex((entry) => entry.id === mediaId));
      const target = typedIndexes[typedIndex + direction];
      if (target === undefined) return item;
      const source = typedIndexes[typedIndex];
      [media[source], media[target]] = [media[target], media[source]];
      return { ...item, media };
    });
  }

  async function uploadPoster(groupId: string, itemId: string, mediaId: string, file: File) {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) { setError(t("Poster зураг зөв форматтай байх ёстой.", "The poster must be a supported image.")); return; }
    setUploading(`${mediaId}-poster`); setError("");
    try {
      const asset = await uploadAsset(file);
      updateMedia(groupId, itemId, mediaId, (media) => ({ ...media, posterUrl: asset.url }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("Poster байршуулж чадсангүй.", "Could not upload the poster.")); }
    finally { setUploading(""); }
  }

  function renderMediaSection(groupId: string, item: NavigationItem, type: NavigationMedia["type"]) {
    const rows = (item.media || []).filter((entry) => entry.type === type);
    const label = type === "image" ? t("Зураг", "Images") : type === "video" ? t("Видео", "Videos") : "PDF";
    const accept = type === "image" ? "image/png,image/jpeg,image/webp,image/gif" : type === "video" ? "video/mp4,video/webm" : "application/pdf";
    return <section className={`navigation-media-section ${type}`}>
      <header><div><h4>{label}</h4><span>{rows.length}/{NAVIGATION_LIMITS[type]}</span></div>{canUploadMedia ? <label className="navigation-media-upload">＋ {t(`${label} нэмэх`, `Add ${label.toLowerCase()}`)}<input type="file" multiple disabled={rows.length >= NAVIGATION_LIMITS[type] || uploading === `${item.id}-${type}`} accept={accept} onChange={(event) => { const files = [...(event.target.files || [])]; if (files.length) void uploadMedia(groupId, item, type, files); event.target.value = ""; }} /></label> : <span>{t("Байршуулах эрхгүй", "No upload permission")}</span>}</header>
      {rows.length ? <div className="navigation-media-list">{rows.map((media, index) => <article key={media.id}>
        <div className="navigation-media-preview">{type === "image" ? <img src={media.url} alt={localized(media.altMn, media.altEn)} /> : type === "video" ? <video src={media.url} poster={media.posterUrl || undefined} controls preload="metadata" /> : <span aria-hidden="true">PDF</span>}</div>
        <div className="navigation-media-fields">
          <label>{type === "pdf" ? t("Баримтын нэр • MN", "Document name • MN") : "Alt text • MN"}<input value={type === "pdf" ? media.captionMn : media.altMn} onChange={(event) => updateMedia(groupId, item.id, media.id, (row) => type === "pdf" ? { ...row, captionMn: event.target.value } : { ...row, altMn: event.target.value })} /></label>
          <label>{type === "pdf" ? t("Баримтын нэр • EN", "Document name • EN") : "Alt text • EN"}<input value={type === "pdf" ? media.captionEn : media.altEn} onChange={(event) => updateMedia(groupId, item.id, media.id, (row) => type === "pdf" ? { ...row, captionEn: event.target.value } : { ...row, altEn: event.target.value })} /></label>
          {type !== "pdf" ? <><label>{t("Тайлбар • MN", "Caption • MN")}<input value={media.captionMn} onChange={(event) => updateMedia(groupId, item.id, media.id, (row) => ({ ...row, captionMn: event.target.value }))} /></label><label>{t("Тайлбар • EN", "Caption • EN")}<input value={media.captionEn} onChange={(event) => updateMedia(groupId, item.id, media.id, (row) => ({ ...row, captionEn: event.target.value }))} /></label></> : null}
          {type === "video" ? <div className="navigation-poster-fields"><strong>{t("Видео poster зураг", "Video poster image")}</strong>{media.posterUrl ? <img src={media.posterUrl} alt={localized(media.posterAltMn, media.posterAltEn)} /> : null}{canUploadMedia ? <label className="navigation-media-upload">{media.posterUrl ? t("Poster солих", "Replace poster") : t("Poster нэмэх", "Add poster")}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={uploading === `${media.id}-poster`} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPoster(groupId, item.id, media.id, file); event.target.value = ""; }} /></label> : null}{media.posterUrl ? <button type="button" className="danger" onClick={() => updateMedia(groupId, item.id, media.id, (row) => ({ ...row, posterUrl: "", posterAltMn: "", posterAltEn: "" }))}>{t("Poster авах", "Remove poster")}</button> : null}<label>Poster alt • MN<input value={media.posterAltMn} onChange={(event) => updateMedia(groupId, item.id, media.id, (row) => ({ ...row, posterAltMn: event.target.value }))} /></label><label>Poster alt • EN<input value={media.posterAltEn} onChange={(event) => updateMedia(groupId, item.id, media.id, (row) => ({ ...row, posterAltEn: event.target.value }))} /></label></div> : null}
        </div>
        <footer><button type="button" aria-label={t("Дээш зөөх", "Move up")} disabled={index === 0} onClick={() => moveMedia(groupId, item.id, media.id, -1)}>↑</button><button type="button" aria-label={t("Доош зөөх", "Move down")} disabled={index === rows.length - 1} onClick={() => moveMedia(groupId, item.id, media.id, 1)}>↓</button><button type="button" className="danger" onClick={() => { if (confirm(t("Энэ файлыг жагсаалтаас хасах уу?", "Remove this file from the gallery?"))) removeMedia(groupId, item.id, media.id); }}>{t("Хасах", "Remove")}</button></footer>
      </article>)}</div> : <p className="navigation-media-empty">{t(`${label} оруулаагүй байна.`, `No ${label.toLowerCase()} added.`)}</p>}
    </section>;
  }

  if (loading) return <main className="navigation-admin-state">{t("Цэсийн мэдээллийг ачаалж байна…", "Loading menu content…")}</main>;
  if (!draft || !activeMenu) return <main className="navigation-admin-state error">{error || t("Мэдээлэл олдсонгүй.", "No content found.")}</main>;

  const localized = (mn: string, en: string) => lang === "en" ? en : mn;

  return (
    <main className="navigation-admin-page">
      <header className="navigation-admin-header">
        <div>
          <span>HEADER CONTENT</span>
          <h1>{t("Толгой цэсний мэдээлэл", "Header menu content")}</h1>
          <p>{t("Таван цэсийг нэг дор удирдана. Үнэ, iBeX орчин болон бусад админ тохиргоонд нөлөөлөхгүй.", "Manage five menus in one place. Pricing, the iBeX environment and other administration areas are unaffected.")}</p>
        </div>
        <div className="navigation-admin-actions">
          <button type="button" onClick={() => setPreview((value) => !value)}>{preview ? t("Урьдчилан харахыг хаах", "Close preview") : t("Урьдчилан харах", "Preview")}</button>
          <button type="button" onClick={() => save("draft")} disabled={working}>{t("Ноорог хадгалах", "Save draft")}</button>
          <button type="button" className="primary" onClick={() => save("publish")} disabled={working}>{working ? t("Хадгалж байна…", "Saving…") : t("Нийтлэх", "Publish")}</button>
        </div>
      </header>

      {error ? <div className="navigation-admin-alert error" role="alert">{error}</div> : null}
      {message ? <div className="navigation-admin-alert success" role="status">{message}</div> : null}

      <nav className="navigation-menu-tabs" role="tablist" aria-label={t("Удирдах толгой цэс", "Header menu to manage")}>
        {activeMenus.map((menu) => (
          <button key={menu.id} type="button" role="tab" aria-selected={menu.id === activeMenu.id} className={menu.id === activeMenu.id ? "active" : ""} onClick={() => setActiveId(menu.id)}>
            {localized(menu.labelMn, menu.labelEn)}
          </button>
        ))}
        <button type="button" className="navigation-add-menu" onClick={addMenu} disabled={draft.menus.length >= NAVIGATION_LIMITS.menus}>＋ {t("Үндсэн цэс", "Top-level menu")}</button>
      </nav>

      <details className="navigation-menu-manager">
        <summary>{t("Үндсэн цэсний дараалал ба архив", "Top-level order and archive")} · {activeMenus.length}/{NAVIGATION_LIMITS.menus}</summary>
        <div className="navigation-menu-manager-list">
          {activeMenus.map((menu, index) => <article key={menu.id}>
            <span>{String(index + 1).padStart(2, "0")}</span><strong>{localized(menu.labelMn, menu.labelEn)}</strong>
            <em>{index < 4 || index === 4 ? t("Толгой цэсэнд", "In header") : t("Бусад дотор", "Under More")}</em>
            <button type="button" aria-label={t("Цэсийг зүүн тийш зөөх", "Move menu left")} disabled={index === 0} onClick={() => moveMenu(menu.id, -1)}>←</button>
            <button type="button" aria-label={t("Цэсийг баруун тийш зөөх", "Move menu right")} disabled={index === activeMenus.length - 1} onClick={() => moveMenu(menu.id, 1)}>→</button>
            <button type="button" className="danger" onClick={() => archiveMenu(menu.id)}>{t("Архивлах", "Archive")}</button>
          </article>)}
        </div>
        {archivedMenus.length ? <div className="navigation-archive"><h3>{t("Архивласан цэс", "Archived menus")}</h3>{archivedMenus.map((menu) => <article key={menu.id}><strong>{localized(menu.labelMn, menu.labelEn)}</strong><button type="button" onClick={() => restoreMenu(menu.id)}>{t("Сэргээх", "Restore")}</button><button type="button" className="danger" onClick={() => deleteArchivedMenu(menu.id)}>{t("Бүр мөсөн устгах", "Delete permanently")}</button></article>)}</div> : null}
      </details>

      <div className={`navigation-admin-layout ${preview ? "with-preview" : ""}`}>
        <section className="navigation-editor">
          <div className="navigation-section-head">
            <div><small>{activeMenu.id.toUpperCase()}</small><h2>{localized(activeMenu.labelMn, activeMenu.labelEn)}</h2></div>
            <div className="navigation-current-actions"><label className="navigation-switch"><input type="checkbox" checked={activeMenu.enabled} onChange={(event) => field("enabled", event.target.checked)} />{t("Харагдана", "Visible")}</label><button type="button" className="danger" onClick={() => archiveMenu(activeMenu.id)}>{t("Цэс архивлах", "Archive menu")}</button></div>
          </div>

          <section className="navigation-fields-card">
            <h3>{t("Үндсэн мэдээлэл", "Main information")}</h3>
            <div className="navigation-field-grid">
              <label>{t("Цэсийн нэр • MN", "Menu label • MN")}<input value={activeMenu.labelMn} onChange={(event) => field("labelMn", event.target.value)} /></label>
              <label>{t("Цэсийн нэр • EN", "Menu label • EN")}<input value={activeMenu.labelEn} onChange={(event) => field("labelEn", event.target.value)} /></label>
              <label>{t("Дээд мөр • MN", "Kicker • MN")}<input value={activeMenu.kickerMn} onChange={(event) => field("kickerMn", event.target.value)} /></label>
              <label>{t("Дээд мөр • EN", "Kicker • EN")}<input value={activeMenu.kickerEn} onChange={(event) => field("kickerEn", event.target.value)} /></label>
              <label>{t("Гарчиг • MN", "Title • MN")}<input value={activeMenu.titleMn} onChange={(event) => field("titleMn", event.target.value)} /></label>
              <label>{t("Гарчиг • EN", "Title • EN")}<input value={activeMenu.titleEn} onChange={(event) => field("titleEn", event.target.value)} /></label>
              <label className="wide">{t("Тайлбар • MN", "Introduction • MN")}<textarea value={activeMenu.introMn} onChange={(event) => field("introMn", event.target.value)} /></label>
              <label className="wide">{t("Тайлбар • EN", "Introduction • EN")}<textarea value={activeMenu.introEn} onChange={(event) => field("introEn", event.target.value)} /></label>
            </div>
          </section>

          <details className="navigation-advanced">
            <summary>{t("Нэмэлт харагдах мэдээлэл", "Additional display content")}</summary>
            <div className="navigation-field-grid">
              {(["eyebrowMn", "eyebrowEn", "titleMn", "titleEn", "descriptionMn", "descriptionEn", "statMn", "statEn", "ctaMn", "ctaEn"] as const).map((key) => (
                <label key={key}>{({eyebrowMn:"Дээд тэмдэглэгээ • MN",eyebrowEn:"Eyebrow • EN",titleMn:"Онцлох гарчиг • MN",titleEn:"Feature title • EN",descriptionMn:"Онцлох тайлбар • MN",descriptionEn:"Feature description • EN",statMn:"Тоо/үзүүлэлт • MN",statEn:"Statistic • EN",ctaMn:"Дэлгэрүүлэх товч • MN",ctaEn:"Detail button • EN"} as const)[key]}<input value={activeMenu.feature[key]} onChange={(event) => featureField(key, event.target.value)} /></label>
              ))}
              <label className="wide">Footer • MN<textarea value={activeMenu.footerMn} onChange={(event) => field("footerMn", event.target.value)} /></label>
              <label className="wide">Footer • EN<textarea value={activeMenu.footerEn} onChange={(event) => field("footerEn", event.target.value)} /></label>
            </div>
          </details>

          <section className="navigation-groups">
            <div className="navigation-groups-head"><div><h3>{t("Бүлэг ба дэд мэдээлэл", "Groups and menu items")}</h3><p>{t(`Нэг цэсэнд ${NAVIGATION_LIMITS.groups} бүлэг, бүлэг бүрд ${NAVIGATION_LIMITS.items} мэдээлэл хүртэл.`, `Up to ${NAVIGATION_LIMITS.groups} groups and ${NAVIGATION_LIMITS.items} items per group.`)}</p></div><button type="button" disabled={activeMenu.groups.length >= NAVIGATION_LIMITS.groups} onClick={() => updateMenu((menu) => ({ ...menu, groups: [...menu.groups, newGroup(menu.id)] }))}>＋ {t("Бүлэг нэмэх", "Add group")}</button></div>
            {activeMenu.groups.map((group, groupIndex) => (
              <details className="navigation-group-card" key={group.id} open={groupIndex === 0}>
                <summary>
                  <span>{String(groupIndex + 1).padStart(2, "0")}</span>
                  <strong>{localized(group.titleMn, group.titleEn)}</strong>
                  <em>{group.items.length} {t("мэдээлэл", "items")}</em>
                </summary>
                <div className="navigation-group-body">
                  <div className="navigation-row-actions">
                    <button type="button" aria-label={t("Бүлгийг дээш зөөх", "Move group up")} onClick={() => updateMenu((menu) => ({ ...menu, groups: move(menu.groups, groupIndex, -1) }))} disabled={groupIndex === 0}>↑</button>
                    <button type="button" aria-label={t("Бүлгийг доош зөөх", "Move group down")} onClick={() => updateMenu((menu) => ({ ...menu, groups: move(menu.groups, groupIndex, 1) }))} disabled={groupIndex === activeMenu.groups.length - 1}>↓</button>
                    <label className="navigation-switch"><input type="checkbox" checked={group.enabled} onChange={(event) => updateGroup(group.id, (row) => ({ ...row, enabled: event.target.checked }))} />{t("Харагдана", "Visible")}</label>
                    <button type="button" className="danger" disabled={activeMenu.groups.length <= 1} onClick={() => { if (confirm(t("Энэ бүлгийг устгах уу?", "Delete this group?"))) updateMenu((menu) => ({ ...menu, groups: menu.groups.filter((row) => row.id !== group.id) })); }}>{t("Бүлэг устгах", "Delete group")}</button>
                  </div>
                  <div className="navigation-field-grid compact">
                    <label>{t("Бүлгийн нэр • MN", "Group title • MN")}<input value={group.titleMn} onChange={(event) => updateGroup(group.id, (row) => ({ ...row, titleMn: event.target.value }))} /></label>
                    <label>{t("Бүлгийн нэр • EN", "Group title • EN")}<input value={group.titleEn} onChange={(event) => updateGroup(group.id, (row) => ({ ...row, titleEn: event.target.value }))} /></label>
                  </div>
                  <div className="navigation-items">
                    {group.items.map((item, itemIndex) => (
                      <article className="navigation-item-card" key={item.id}>
                        <header><span>{itemIndex + 1}</span><strong>{localized(item.titleMn, item.titleEn)}</strong><div><button type="button" aria-label={t("Мэдээллийг дээш зөөх", "Move item up")} onClick={() => updateGroup(group.id, (row) => ({ ...row, items: move(row.items, itemIndex, -1) }))} disabled={itemIndex === 0}>↑</button><button type="button" aria-label={t("Мэдээллийг доош зөөх", "Move item down")} onClick={() => updateGroup(group.id, (row) => ({ ...row, items: move(row.items, itemIndex, 1) }))} disabled={itemIndex === group.items.length - 1}>↓</button><button type="button" aria-label={t("Мэдээлэл устгах", "Delete item")} className="danger" disabled={group.items.length <= 1} onClick={() => { if (confirm(t("Энэ мэдээллийг устгах уу?", "Delete this item?"))) updateGroup(group.id, (row) => ({ ...row, items: row.items.filter((entry) => entry.id !== item.id) })); }}>×</button></div></header>
                        <div className="navigation-field-grid compact">
                          <label>{t("Нэр • MN", "Title • MN")}<input value={item.titleMn} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, titleMn: event.target.value }))} /></label>
                          <label>{t("Нэр • EN", "Title • EN")}<input value={item.titleEn} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, titleEn: event.target.value }))} /></label>
                          <label>{t("Тайлбар • MN", "Description • MN")}<textarea value={item.descriptionMn} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, descriptionMn: event.target.value }))} /></label>
                          <label>{t("Тайлбар • EN", "Description • EN")}<textarea value={item.descriptionEn} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, descriptionEn: event.target.value }))} /></label>
                          <label className="wide">{t("Дэлгэрэнгүй агуулга • MN", "Detailed content • MN")}<textarea className="navigation-body-field" value={item.bodyMn || ""} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, bodyMn: event.target.value }))} /></label>
                          <label className="wide">{t("Дэлгэрэнгүй агуулга • EN", "Detailed content • EN")}<textarea className="navigation-body-field" value={item.bodyEn || ""} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, bodyEn: event.target.value }))} /></label>
                          <label>Icon<select value={item.icon} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, icon: event.target.value }))}>{NAVIGATION_ICON_OPTIONS.map((icon) => <option key={icon}>{icon}</option>)}</select></label>
                          <label>{t("Холбоос", "Link")}<input value={item.href} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, href: event.target.value }))} placeholder="/page or https://…" /></label>
                          <label className="navigation-switch"><input type="checkbox" checked={item.enabled} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, enabled: event.target.checked }))} />{t("Харагдана", "Visible")}</label>
                          <label className="navigation-switch"><input type="checkbox" checked={item.openInNewTab} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, openInNewTab: event.target.checked }))} />{t("Шинэ tab-д нээх", "Open in new tab")}</label>
                        </div>
                        <details className="navigation-item-media">
                          <summary>{t("Медиа галерей", "Media gallery")} · {(item.media || []).filter((entry) => entry.type === "image").length} {t("зураг", "images")} · {(item.media || []).filter((entry) => entry.type === "video").length} {t("видео", "videos")} · {(item.media || []).filter((entry) => entry.type === "pdf").length} PDF</summary>
                          <div className="navigation-media-sections">{renderMediaSection(group.id, item, "image")}{renderMediaSection(group.id, item, "video")}{renderMediaSection(group.id, item, "pdf")}</div>
                        </details>
                      </article>
                    ))}
                    <button type="button" className="navigation-add-item" disabled={group.items.length >= NAVIGATION_LIMITS.items} onClick={() => updateGroup(group.id, (row) => ({ ...row, items: [...row.items, newItem(activeMenu.id)] }))}>＋ {t("Мэдээлэл нэмэх", "Add item")}</button>
                  </div>
                </div>
              </details>
            ))}
          </section>

          <div className="navigation-reset-actions">
            <button type="button" onClick={() => { if (published) { setDraft(clone(published)); setActiveId(published.menus.find((menu) => !menu.archived)?.id || "product"); } }}>{t("Нийтлэгдсэн хувилбарыг буцаах", "Restore published version")}</button>
            <button type="button" onClick={() => { if (confirm(t("Анхны мэдээллийг сэргээх үү?", "Restore the original content?"))) { setDraft(cloneDefaultNavigation()); setActiveId("product"); } }}>{t("Анхны мэдээлэл сэргээх", "Restore original content")}</button>
          </div>
        </section>

        {preview ? (
          <aside className="navigation-preview" aria-label={t("Цэсийн урьдчилсан харагдац", "Menu preview")}>
            <small>{localized(activeMenu.kickerMn, activeMenu.kickerEn)}</small>
            <h2>{localized(activeMenu.titleMn, activeMenu.titleEn)}</h2>
            <p>{localized(activeMenu.introMn, activeMenu.introEn)}</p>
            <div>{activeMenu.groups.filter((group) => group.enabled).map((group) => <section key={group.id}><h3>{localized(group.titleMn, group.titleEn)}</h3>{group.items.filter((item) => item.enabled).map((item) => { const media = item.media || [], images = media.filter((row) => row.type === "image").length, videos = media.filter((row) => row.type === "video").length, pdfs = media.filter((row) => row.type === "pdf").length; return <article key={item.id}><strong>{localized(item.titleMn, item.titleEn)}</strong><span>{localized(item.descriptionMn, item.descriptionEn)}</span>{media.length ? <small>{images ? `▧ ${images} ${t("зураг", "images")}` : ""}{videos ? ` ▶ ${videos} ${t("видео", "videos")}` : ""}{pdfs ? ` ▤ ${pdfs} PDF` : ""}</small> : null}</article>; })}</section>)}</div>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
