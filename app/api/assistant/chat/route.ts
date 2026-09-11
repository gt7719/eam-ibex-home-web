import { NextResponse } from "next/server";
import { readKnowledge, type KnowledgeEntry } from "../../../lib/assistant-knowledge";
import bookKnowledge from "../../../lib/ibex-book-knowledge.json";

const stopWords = new Set([
  "нь", "ба", "бөгөөд", "энэ", "тэр", "юу", "ямар", "яаж", "хэрхэн", "тухай", "the", "and", "is", "are", "what", "how", "about",
]);

function tokens(value: string) {
  return [...new Set(value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(/\s+/).filter((x) => x.length > 1 && !stopWords.has(x)))];
}

function score(entry: KnowledgeEntry, query: string[]) {
  const haystack = tokens(`${entry.titleMn} ${entry.titleEn} ${entry.contentMn} ${entry.contentEn} ${entry.keywords.join(" ")} ${entry.topic}`);
  const set = new Set(haystack);
  let total = 0;
  for (const word of query) {
    if (set.has(word)) total += entry.keywords.some((keyword) => keyword.toLocaleLowerCase() === word) ? 5 : 2;
    else if (haystack.some((candidate) => candidate.includes(word) || word.includes(candidate))) total += 1;
  }
  return total;
}

export async function POST(request: Request) {
  let body: { message?: unknown; lang?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 600) : "";
  const lang = body.lang === "en" ? "en" : "mn";
  if (message.length < 2) {
    return NextResponse.json({ error: lang === "en" ? "Please enter a question." : "Асуултаа оруулна уу." }, { status: 400 });
  }
  const { entries: managedEntries } = await readKnowledge();
  const entries = [...managedEntries, ...(bookKnowledge as KnowledgeEntry[])];
  const query = tokens(message);
  const matches = entries
    .filter((entry) => entry.enabled && entry.status === "approved" && entry.visibility === "public")
    .map((entry) => ({ entry, score: score(entry, query) }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  if (!matches.length) {
    return NextResponse.json({
      answer: lang === "en"
        ? "I could not find this in the approved public iBeX materials. Try asking about Asset Core, workflows, PM/PdM, plans or the AI roadmap."
        : "Энэ асуултын хариулт баталгаажсан, нийтэд нээлттэй iBeX материалд олдсонгүй. Asset Core, ажлын урсгал, PM/PdM, багц эсвэл AI roadmap-ийн талаар асуугаарай.",
      sources: [],
      grounded: false,
    });
  }

  const primary = matches[0].entry;
  return NextResponse.json({
    answer: lang === "en" ? primary.contentEn : primary.contentMn,
    sources: matches.map(({ entry }) => ({
      title: lang === "en" ? entry.titleEn : entry.titleMn,
      label: entry.sourceLabel,
      url: entry.sourceUrl,
      version: entry.version,
      stage: entry.stage,
    })),
    grounded: true,
  });
}
