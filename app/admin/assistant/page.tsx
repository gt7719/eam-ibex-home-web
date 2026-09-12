"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSiteLanguage } from "../../lib/use-site-language";

type KnowledgeEntry = {
  id: string; topic: string; titleMn: string; titleEn: string; contentMn: string; contentEn: string;
  keywords: string[]; sourceLabel: string; sourceUrl: string; version: string;
  status: "draft" | "approved" | "archived"; visibility: "public" | "internal" | "restricted";
  stage: "implemented" | "pilot" | "rnd" | "future" | "general"; enabled: boolean;
};

const emptyEntry = (): KnowledgeEntry => ({
  id: `kb-${Date.now()}`, topic: "general", titleMn: "", titleEn: "", contentMn: "", contentEn: "",
  keywords: [], sourceLabel: "iBeX Website · Imported source", sourceUrl: "", version: "1.0", status: "draft",
  visibility: "internal", stage: "general", enabled: true,
});

export default function AssistantKnowledgePage() {
  const { t } = useSiteLanguage();
  const [embedded, setEmbedded] = useState(false);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/assistant-knowledge", { cache: "no-store" }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      if (response?.status === 401) window.location.replace("/admin/login");
      else if (response?.status === 403) window.location.replace("/admin");
      setError(payload.error || "Мэдлэгийн санг уншиж чадсангүй."); setLoading(false); return;
    }
    const next = (payload.entries || []) as KnowledgeEntry[];
    setEntries(next); setRevision(payload.updatedAt || null); setSavedSnapshot(JSON.stringify(next)); setSelectedId((current) => current || next[0]?.id || ""); setLoading(false);
  }, []);
  useEffect(() => {
    const embeddedTimer = window.setTimeout(() => setEmbedded(new URLSearchParams(window.location.search).get("embedded") === "1"), 0);
    const timer = window.setTimeout(() => void load(), 0);
    return () => { window.clearTimeout(timer); window.clearTimeout(embeddedTimer); };
  }, [load]);
  const dirty = Boolean(savedSnapshot && JSON.stringify(entries) !== savedSnapshot);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    window.parent.postMessage({ type: "ibex-admin-dirty", dirty }, location.origin);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const selectedIndex = entries.findIndex((entry) => entry.id === selectedId);
  const selected = selectedIndex >= 0 ? entries[selectedIndex] : null;
  const visibleEntries = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase();
    return query ? entries.filter((entry) => `${entry.titleMn} ${entry.titleEn} ${entry.topic} ${entry.sourceLabel}`.toLocaleLowerCase().includes(query)) : entries;
  }, [entries, filter]);

  function update<K extends keyof KnowledgeEntry>(key: K, value: KnowledgeEntry[K]) {
    if (selectedIndex < 0) return;
    setEntries((current) => current.map((entry, index) => index === selectedIndex ? { ...entry, [key]: value } : entry));
  }
  function addEntry() { const entry = emptyEntry(); setEntries((current) => [...current, entry]); setSelectedId(entry.id); }
  function duplicateEntry() {
    if (!selected) return;
    const entry = { ...selected, id: `kb-${Date.now()}`, titleMn: `${selected.titleMn} — хуулбар`, status: "draft" as const };
    setEntries((current) => [...current, entry]); setSelectedId(entry.id);
  }
  function removeEntry() {
    if (!selected || entries.length <= 1) return;
    const next = entries.filter((entry) => entry.id !== selected.id);
    setEntries(next); setSelectedId(next[Math.max(0, selectedIndex - 1)]?.id || "");
  }
  async function importKnowledge(file: File | null) {
    if (!file) return;
    setError(""); setMessage("");
    if (!/\.(txt|md|json)$/i.test(file.name)) { setError("Одоогоор TXT, Markdown, JSON файлыг шууд импортлоно. PDF/DOCX-ийг текст эсвэл Markdown болгон экспортлоод оруулна уу."); return; }
    if (file.size > 500_000) { setError("Файлын хэмжээ 500 KB-аас их байна."); return; }
    try {
      const text = await file.text();
      if (/\.json$/i.test(file.name)) {
        const parsed = JSON.parse(text); const rows = Array.isArray(parsed) ? parsed : parsed.entries;
        if (!Array.isArray(rows)) throw new Error("JSON entries жагсаалт шаардлагатай.");
        const imported = rows.slice(0, 50).map((row: Partial<KnowledgeEntry>, index: number) => ({...emptyEntry(), ...row, id: `kb-import-${Date.now()}-${index}`, titleMn: row.titleMn || `${file.name} · ${index + 1}`, titleEn: row.titleEn || row.titleMn || `${file.name} · ${index + 1}`, contentMn: row.contentMn || "", contentEn: row.contentEn || row.contentMn || "", sourceLabel: row.sourceLabel || file.name, status: "draft" as const, visibility: "internal" as const})).filter((row: KnowledgeEntry) => row.contentMn);
        if (!imported.length) throw new Error("Импортлох агуулга олдсонгүй."); setEntries(current => [...current, ...imported]); setSelectedId(imported[0].id);
      } else { const entry = {...emptyEntry(), id:`kb-import-${Date.now()}`, titleMn:file.name.replace(/\.[^.]+$/,""), titleEn:file.name.replace(/\.[^.]+$/,""), contentMn:text.trim(), contentEn:text.trim(), sourceLabel:file.name}; if (!entry.contentMn) throw new Error("Файл хоосон байна."); setEntries(current=>[...current,entry]); setSelectedId(entry.id); }
      setMessage("Файлыг Draft + Internal төлөвөөр импортлолоо. Хянаж байж Approved + Public болгоно уу.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Файлыг импортлож чадсангүй."); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/assistant-knowledge", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entries, revision }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) setError(payload.error || t("Өөрчлөлтийг хадгалж чадсангүй.", "Could not save changes."));
    else { const next = payload.entries || entries; setEntries(next); setRevision(payload.revision || payload.updatedAt || null); setSavedSnapshot(JSON.stringify(next)); setMessage(t("Мэдлэгийн сангийн шинэ хувилбарыг хадгаллаа.", "A new knowledge-base version was saved.")); }
    setSaving(false);
  }
  async function resetDefaults() {
    setSaving(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/assistant-knowledge", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) setError(payload.error || t("Анхны санг сэргээж чадсангүй.", "Could not restore the approved default library."));
    else { const next = payload.entries || []; setEntries(next); setRevision(payload.revision || payload.updatedAt || null); setSavedSnapshot(JSON.stringify(next)); setSelectedId(next[0]?.id || ""); setMessage(t("Баталгаажсан анхны мэдлэгийн санг сэргээв.", "The approved default knowledge base was restored.")); }
    setSaving(false);
  }

  return (
    <main className={`knowledge-page${embedded ? " embedded-admin-page" : ""}`}>
      <header className="knowledge-header">
        <a href="/admin" className="admin-users-back">← {t("Сайтын админ", "Site administration")}</a>
        <div><span className="admin-auth-kicker">iBeX WEBSITE ASSISTANT</span><h1>{t("AI мэдлэгийн сан", "AI knowledge base")}</h1><p>{t("Нийтийн сайтын туслах зөвхөн Approved + Public эх сурвалжаас хариулна.", "The public website assistant answers only from Approved + Public sources.")}</p></div>
        <div className="knowledge-boundary"><strong>{t("Тусгаарлагдсан", "Isolated")}</strong><small>{t("iBeX System AI болон tenant өгөгдөлд хандахгүй", "No access to iBeX System AI or tenant data")}</small></div>
      </header>
      {error ? <div className="knowledge-alert error" role="alert">{error}</div> : null}
      {message ? <div className="knowledge-alert success" role="status">{message}</div> : null}
      <form className="knowledge-workspace" onSubmit={save}>
        <aside className="knowledge-sidebar">
          <div className="knowledge-sidebar-head"><div><strong>{t("Эх сурвалж", "Sources")}</strong><small>{entries.length} {t("материал", "items")}</small></div><button type="button" onClick={addEntry} aria-label={t("Эх сурвалж нэмэх", "Add source")}>＋</button></div>
          <label className="knowledge-reset">{t("TXT / MD / JSON импорт", "Import TXT / MD / JSON")}<input type="file" accept=".txt,.md,.json,text/plain,text/markdown,application/json" hidden onChange={(event) => void importKnowledge(event.target.files?.[0] || null)} /></label>
          <input className="knowledge-search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={t("Гарчиг, сэдвээр хайх…", "Search by title or topic…")} />
          <div className="knowledge-list">
            {loading ? <p>{t("Уншиж байна…", "Loading…")}</p> : null}
            {visibleEntries.map((entry) => <button type="button" key={entry.id} className={entry.id === selectedId ? "active" : ""} onClick={() => setSelectedId(entry.id)}><span>{(t(entry.titleMn, entry.titleEn)) || t("Нэргүй материал", "Untitled source")}</span><small><i className={`kb-dot ${entry.status}`} />{entry.status} · {entry.visibility}</small></button>)}
          </div>
          <button type="button" className="knowledge-reset" onClick={resetDefaults} disabled={saving}>{t("Анхны баталгаажсан сан сэргээх", "Restore approved defaults")}</button>
        </aside>
        <section className="knowledge-editor">
          {!selected ? <div className="knowledge-empty">{t("Засах эх сурвалжаа сонгоно уу.", "Select a source to edit.")}</div> : <>
            <div className="knowledge-editor-head"><div><span>{t("МАТЕРИАЛЫН ТОХИРГОО", "SOURCE SETTINGS")}</span><h2>{t(selected.titleMn, selected.titleEn) || t("Шинэ эх сурвалж", "New source")}</h2></div><div><button type="button" onClick={duplicateEntry}>{t("Хуулах", "Duplicate")}</button><button type="button" className="danger" onClick={removeEntry} disabled={entries.length <= 1}>{t("Устгах", "Delete")}</button></div></div>
            <div className="knowledge-grid">
              <label>{t("Сэдэв", "Topic")}<input value={selected.topic} onChange={(e) => update("topic", e.target.value)} required /></label>
              <label>{t("Хувилбар", "Version")}<input value={selected.version} onChange={(e) => update("version", e.target.value)} required /></label>
              <label>{t("Төлөв", "Status")}<select value={selected.status} onChange={(e) => update("status", e.target.value as KnowledgeEntry["status"])}><option value="draft">Draft</option><option value="approved">Approved</option><option value="archived">Archived</option></select></label>
              <label>{t("Нууцлал", "Visibility")}<select value={selected.visibility} onChange={(e) => update("visibility", e.target.value as KnowledgeEntry["visibility"])}><option value="public">Public</option><option value="internal">Internal</option><option value="restricted">Restricted</option></select></label>
              <label>{t("Хөгжүүлэлтийн төлөв", "Development stage")}<select value={selected.stage} onChange={(e) => update("stage", e.target.value as KnowledgeEntry["stage"])}><option value="general">General</option><option value="implemented">Implemented</option><option value="pilot">Pilot</option><option value="rnd">R&amp;D</option><option value="future">Future</option></select></label>
              <label className="knowledge-switch"><input type="checkbox" checked={selected.enabled} onChange={(e) => update("enabled", e.target.checked)} /><span>{t("Идэвхтэй", "Enabled")}</span></label>
              <label className="wide">{t("Гарчиг", "Title")} · MN<input value={selected.titleMn} onChange={(e) => update("titleMn", e.target.value)} required /></label>
              <label className="wide">Title · EN<input value={selected.titleEn} onChange={(e) => update("titleEn", e.target.value)} required /></label>
              <label className="wide">{t("Тайлбар", "Description")} · MN<textarea value={selected.contentMn} onChange={(e) => update("contentMn", e.target.value)} required /></label>
              <label className="wide">Description · EN<textarea value={selected.contentEn} onChange={(e) => update("contentEn", e.target.value)} required /></label>
              <label className="wide">{t("Түлхүүр үг", "Keywords")}<input value={selected.keywords.join(", ")} onChange={(e) => update("keywords", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} placeholder="asset, хөрөнгө, PM…" /></label>
              <label className="wide">{t("Эх сурвалжийн нэр", "Source name")}<input value={selected.sourceLabel} onChange={(e) => update("sourceLabel", e.target.value)} required /></label>
              <label className="wide">{t("Эх сурвалжийн холбоос", "Source URL")}<input type="url" value={selected.sourceUrl} onChange={(e) => update("sourceUrl", e.target.value)} placeholder={t("https://… (заавал биш)", "https://… (optional)")} /></label>
            </div>
            <div className="knowledge-governance"><strong>{t("Нийтлэх нөхцөл", "Publishing rule")}</strong><span>{t("Туслахад ашиглуулахын тулд төлөвийг Approved, нууцлалыг Public, идэвхийг асаалттай болгоно.", "To make a source available to the assistant, set it to Approved, Public and Enabled.")}</span></div>
          </>}
        </section>
        <footer className="knowledge-actions"><span>{t("Зөвхөн бодитоор оруулж, хянасан эх сурвалжийг Approved + Public болгоно.", "Only verified, reviewed sources should be marked Approved + Public.")}</span><button type="submit" disabled={saving || !entries.length}>{saving ? t("Хадгалж байна…", "Saving…") : t("Өөрчлөлт хадгалах", "Save changes")}</button></footer>
      </form>
    </main>
  );
}
