import { FILING_CORPUS, type FilingDoc } from "@/lib/rag/corpus";
import { bareTicker } from "@/lib/utils";

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "are", "was", "were",
  "have", "has", "had", "not", "but", "its", "into", "over", "under", "than",
  "of", "in", "to", "on", "a", "an", "by", "as", "at", "or", "be", "is",
]);

function tokenize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

type Vec = Map<string, number>;

function tfidf(tokens: string[], idf: Map<string, number>): Vec {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  const vec: Vec = new Map();
  const n = tokens.length || 1;
  for (const [t, c] of tf) vec.set(t, (c / n) * (idf.get(t) ?? 0));
  return vec;
}

function cosine(a: Vec, b: Vec) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [k, v] of a) {
    na += v * v;
    const o = b.get(k);
    if (o) dot += v * o;
  }
  for (const v of b.values()) nb += v * v;
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

let cache: {
  idf: Map<string, number>;
  docs: { doc: FilingDoc; vec: Vec; tokens: string[] }[];
} | null = null;

function index() {
  if (cache) return cache;
  const docsTok = FILING_CORPUS.map((doc) => ({
    doc,
    tokens: tokenize(`${doc.title} ${doc.ticker} ${doc.type} ${doc.content}`),
  }));
  const df = new Map<string, number>();
  for (const d of docsTok) {
    const seen = new Set(d.tokens);
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const N = docsTok.length;
  const idf = new Map<string, number>();
  for (const [t, c] of df) idf.set(t, Math.log((N + 1) / (c + 1)) + 1);
  cache = {
    idf,
    docs: docsTok.map((d) => ({ ...d, vec: tfidf(d.tokens, idf) })),
  };
  return cache;
}

export type SearchHit = {
  id: string;
  ticker: string;
  type: string;
  date: string;
  title: string;
  snippet: string;
  fullContent: string;
  score: number;
};

function snippetAround(content: string, queryTokens: string[]) {
  const lower = content.toLowerCase();
  let idx = 0;
  for (const t of queryTokens) {
    const i = lower.indexOf(t);
    if (i >= 0) {
      idx = i;
      break;
    }
  }
  const start = Math.max(0, idx - 90);
  const end = Math.min(content.length, idx + 220);
  let snip = content.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snip = "…" + snip;
  if (end < content.length) snip = snip + "…";
  return snip;
}

export function searchFilings(
  query: string,
  opts: { topK?: number; tickerFilter?: string } = {},
): SearchHit[] {
  const { idf, docs } = index();
  const qTokens = tokenize(query);
  const qVec = tfidf(qTokens, idf);
  const filter = opts.tickerFilter?.toUpperCase();
  const scored = docs
    .filter((d) => {
      if (!filter) return true;
      if (filter === "MACRO") return d.doc.ticker === "MACRO";
      return d.doc.ticker === filter || d.doc.ticker === "MACRO";
    })
    .map((d) => {
      let score = cosine(qVec, d.vec);
      if (filter && d.doc.ticker === filter) score += 0.08;
      const overlap = qTokens.filter((t) => d.tokens.includes(t)).length;
      score += overlap * 0.01;
      return { d, score };
    })
    .filter((x) => x.score > 0.02)
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.topK ?? 3);

  return scored.map(({ d, score }) => ({
    id: d.doc.id,
    ticker: d.doc.ticker,
    type: d.doc.type,
    date: d.doc.date,
    title: d.doc.title,
    snippet: snippetAround(d.doc.content, qTokens),
    fullContent: d.doc.content,
    score: Math.round(score * 1000) / 1000,
  }));
}

export function tickerFilterFromSnapshot(ticker: string) {
  return bareTicker(ticker);
}
