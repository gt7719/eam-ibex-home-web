"use client";

import { useEffect, useMemo, useState } from "react";
import {
  cloneDefaultNavigation,
  NAVIGATION_ICON_OPTIONS,
  type NavigationConfig,
  type NavigationGroup,
  type NavigationItem,
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
  const [activeId, setActiveId] = useState("product");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
        setLoading(false);
      })
      .catch((reason) => {
        setError(reason?.message || "Цэсийн мэдээллийг уншиж чадсангүй. / Could not load the menu content.");
        setLoading(false);
      });
  }, []);

  const activeMenu = useMemo(
    () => draft?.menus.find((menu) => menu.id === activeId) || draft?.menus[0],
    [activeId, draft],
  );

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

  async function save(action: "draft" | "publish") {
    if (!draft) return;
    setWorking(true);
    setMessage("");
    setError("");
    const response = await fetch("/api/admin/navigation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, navigation: draft }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setError(payload.error || t("Өөрчлөлтийг хадгалж чадсангүй.", "Could not save the changes."));
      setWorking(false);
      return;
    }
    setDraft(payload.navigation);
    if (action === "publish") setPublished(clone(payload.navigation));
    setMessage(action === "publish"
      ? t("Цэсийн мэдээллийг сайтад нийтэллээ.", "The menu content was published to the site.")
      : t("Нооргийг хадгаллаа. Сайтын харагдах мэдээлэл өөрчлөгдөөгүй.", "Draft saved. The public site is unchanged."));
    setWorking(false);
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

      <nav className="navigation-menu-tabs" aria-label={t("Удирдах толгой цэс", "Header menu to manage")}>
        {draft.menus.map((menu) => (
          <button key={menu.id} type="button" className={menu.id === activeMenu.id ? "active" : ""} onClick={() => setActiveId(menu.id)}>
            {localized(menu.labelMn, menu.labelEn)}
          </button>
        ))}
      </nav>

      <div className={`navigation-admin-layout ${preview ? "with-preview" : ""}`}>
        <section className="navigation-editor">
          <div className="navigation-section-head">
            <div><small>{activeMenu.id.toUpperCase()}</small><h2>{localized(activeMenu.labelMn, activeMenu.labelEn)}</h2></div>
            <label className="navigation-switch"><input type="checkbox" checked={activeMenu.enabled} onChange={(event) => field("enabled", event.target.checked)} />{t("Харагдана", "Visible")}</label>
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
                <label key={key}>{key}<input value={activeMenu.feature[key]} onChange={(event) => featureField(key, event.target.value)} /></label>
              ))}
              <label className="wide">Footer • MN<textarea value={activeMenu.footerMn} onChange={(event) => field("footerMn", event.target.value)} /></label>
              <label className="wide">Footer • EN<textarea value={activeMenu.footerEn} onChange={(event) => field("footerEn", event.target.value)} /></label>
            </div>
          </details>

          <section className="navigation-groups">
            <div className="navigation-groups-head"><div><h3>{t("Бүлэг ба дэд мэдээлэл", "Groups and menu items")}</h3><p>{t("Дарааллыг суман товчоор өөрчилнө.", "Use the arrow buttons to change order.")}</p></div><button type="button" onClick={() => updateMenu((menu) => ({ ...menu, groups: [...menu.groups, newGroup(menu.id)] }))}>＋ {t("Бүлэг нэмэх", "Add group")}</button></div>
            {activeMenu.groups.map((group, groupIndex) => (
              <details className="navigation-group-card" key={group.id} open={groupIndex === 0}>
                <summary>
                  <span>{String(groupIndex + 1).padStart(2, "0")}</span>
                  <strong>{localized(group.titleMn, group.titleEn)}</strong>
                  <em>{group.items.length} {t("мэдээлэл", "items")}</em>
                </summary>
                <div className="navigation-group-body">
                  <div className="navigation-row-actions">
                    <button type="button" onClick={() => updateMenu((menu) => ({ ...menu, groups: move(menu.groups, groupIndex, -1) }))} disabled={groupIndex === 0}>↑</button>
                    <button type="button" onClick={() => updateMenu((menu) => ({ ...menu, groups: move(menu.groups, groupIndex, 1) }))} disabled={groupIndex === activeMenu.groups.length - 1}>↓</button>
                    <label className="navigation-switch"><input type="checkbox" checked={group.enabled} onChange={(event) => updateGroup(group.id, (row) => ({ ...row, enabled: event.target.checked }))} />{t("Харагдана", "Visible")}</label>
                    <button type="button" className="danger" onClick={() => { if (activeMenu.groups.length > 1 && confirm(t("Энэ бүлгийг устгах уу?", "Delete this group?"))) updateMenu((menu) => ({ ...menu, groups: menu.groups.filter((row) => row.id !== group.id) })); }}>{t("Бүлэг устгах", "Delete group")}</button>
                  </div>
                  <div className="navigation-field-grid compact">
                    <label>{t("Бүлгийн нэр • MN", "Group title • MN")}<input value={group.titleMn} onChange={(event) => updateGroup(group.id, (row) => ({ ...row, titleMn: event.target.value }))} /></label>
                    <label>{t("Бүлгийн нэр • EN", "Group title • EN")}<input value={group.titleEn} onChange={(event) => updateGroup(group.id, (row) => ({ ...row, titleEn: event.target.value }))} /></label>
                  </div>
                  <div className="navigation-items">
                    {group.items.map((item, itemIndex) => (
                      <article className="navigation-item-card" key={item.id}>
                        <header><span>{itemIndex + 1}</span><strong>{localized(item.titleMn, item.titleEn)}</strong><div><button type="button" onClick={() => updateGroup(group.id, (row) => ({ ...row, items: move(row.items, itemIndex, -1) }))} disabled={itemIndex === 0}>↑</button><button type="button" onClick={() => updateGroup(group.id, (row) => ({ ...row, items: move(row.items, itemIndex, 1) }))} disabled={itemIndex === group.items.length - 1}>↓</button><button type="button" className="danger" onClick={() => { if (group.items.length > 1 && confirm(t("Энэ мэдээллийг устгах уу?", "Delete this item?"))) updateGroup(group.id, (row) => ({ ...row, items: row.items.filter((entry) => entry.id !== item.id) })); }}>×</button></div></header>
                        <div className="navigation-field-grid compact">
                          <label>{t("Нэр • MN", "Title • MN")}<input value={item.titleMn} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, titleMn: event.target.value }))} /></label>
                          <label>{t("Нэр • EN", "Title • EN")}<input value={item.titleEn} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, titleEn: event.target.value }))} /></label>
                          <label>{t("Тайлбар • MN", "Description • MN")}<textarea value={item.descriptionMn} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, descriptionMn: event.target.value }))} /></label>
                          <label>{t("Тайлбар • EN", "Description • EN")}<textarea value={item.descriptionEn} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, descriptionEn: event.target.value }))} /></label>
                          <label>Icon<select value={item.icon} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, icon: event.target.value }))}>{NAVIGATION_ICON_OPTIONS.map((icon) => <option key={icon}>{icon}</option>)}</select></label>
                          <label>{t("Холбоос", "Link")}<input value={item.href} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, href: event.target.value }))} placeholder="/page or https://…" /></label>
                          <label className="navigation-switch"><input type="checkbox" checked={item.enabled} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, enabled: event.target.checked }))} />{t("Харагдана", "Visible")}</label>
                          <label className="navigation-switch"><input type="checkbox" checked={item.openInNewTab} onChange={(event) => updateItem(group.id, item.id, (row) => ({ ...row, openInNewTab: event.target.checked }))} />{t("Шинэ tab-д нээх", "Open in new tab")}</label>
                        </div>
                      </article>
                    ))}
                    <button type="button" className="navigation-add-item" onClick={() => updateGroup(group.id, (row) => ({ ...row, items: [...row.items, newItem(activeMenu.id)] }))}>＋ {t("Мэдээлэл нэмэх", "Add item")}</button>
                  </div>
                </div>
              </details>
            ))}
          </section>

          <div className="navigation-reset-actions">
            <button type="button" onClick={() => published && setDraft(clone(published))}>{t("Нийтлэгдсэн хувилбарыг буцаах", "Restore published version")}</button>
            <button type="button" onClick={() => { if (confirm(t("Анхны мэдээллийг сэргээх үү?", "Restore the original content?"))) setDraft(cloneDefaultNavigation()); }}>{t("Анхны мэдээлэл сэргээх", "Restore original content")}</button>
          </div>
        </section>

        {preview ? (
          <aside className="navigation-preview" aria-label={t("Цэсийн урьдчилсан харагдац", "Menu preview")}>
            <small>{localized(activeMenu.kickerMn, activeMenu.kickerEn)}</small>
            <h2>{localized(activeMenu.titleMn, activeMenu.titleEn)}</h2>
            <p>{localized(activeMenu.introMn, activeMenu.introEn)}</p>
            <div>{activeMenu.groups.filter((group) => group.enabled).map((group) => <section key={group.id}><h3>{localized(group.titleMn, group.titleEn)}</h3>{group.items.filter((item) => item.enabled).map((item) => <article key={item.id}><strong>{localized(item.titleMn, item.titleEn)}</strong><span>{localized(item.descriptionMn, item.descriptionEn)}</span></article>)}</section>)}</div>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
