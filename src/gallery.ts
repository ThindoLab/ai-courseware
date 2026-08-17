import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SAMPLES_DIR = path.join(ROOT, "samples");
const MADE_DIR = path.join(SAMPLES_DIR, "made");
const FEATURED_MANIFEST = path.join(SAMPLES_DIR, "manifest.json");
const MADE_MANIFEST = path.join(MADE_DIR, "manifest.json");

export type GalleryItem = {
  slug: string;
  topic: string;
  scene?: string;
  age?: string;
  type: string;
  category: string;
  tier: "featured" | "created";
  ok: boolean;
};

function readManifest(p: string): GalleryItem[] {
  if (!fs.existsSync(p)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    return Array.isArray(raw) ? (raw as GalleryItem[]) : [];
  } catch {
    return [];
  }
}

function slugStamp(): string {
  const iso = new Date().toISOString().replace(/[-:.]/g, "").replace("Z", "");
  return `made-${iso}`;
}

function inferCategory(topic: string, scenes: string[] = []): string {
  if (/安全|着火|台风|过马路|陌生人|防火|求救|敲门/.test(topic)) return "safety";
  if (/英语|there|sentence/i.test(topic)) return "english";
  if (/古诗|语文|反义|汉字|拼音|成语/.test(topic)) return "chinese";
  if (/鸡兔|分数|平均|周长|植树|相遇|数轴|和倍|平移|旋转|投票|钟|时间|天平|测量|应用题|线段/.test(topic)) return "math";
  if (/颜色|凑十|方位|配对|奇偶|比长|认数|形状/.test(topic) || scenes.some((s) => /学前|幼儿/.test(s))) return "preschool";
  return "life";
}

export function listGallery(): GalleryItem[] {
  const featured = readManifest(FEATURED_MANIFEST).map((s) => ({
    ...s,
    tier: s.tier === "created" ? "created" : "featured",
  }));
  const made = readManifest(MADE_MANIFEST).map((s) => ({ ...s, tier: "created" as const }));
  return [...made, ...featured];
}

export function resolveSampleFile(file: string): string | null {
  const name = file.endsWith(".html") ? file : `${file}.html`;
  if (!/^[\w.-]+\.html$/.test(name)) return null;
  const curated = path.join(SAMPLES_DIR, name);
  if (fs.existsSync(curated)) return curated;
  const made = path.join(MADE_DIR, name);
  if (fs.existsSync(made)) return made;
  return null;
}

export function publishCreatedAid(opts: {
  html: string;
  topic: string;
  type: string;
  audience?: { ageLabel?: string; ageBand?: string; scenes?: string[] };
}): GalleryItem {
  fs.mkdirSync(MADE_DIR, { recursive: true });
  const slug = slugStamp();
  const htmlPath = path.join(MADE_DIR, `${slug}.html`);
  fs.writeFileSync(htmlPath, opts.html, "utf8");
  const scenes = opts.audience?.scenes || [];
  const age = (opts.audience?.ageBand || opts.audience?.ageLabel || "")
    .replace(/\s*岁/g, "")
    .trim();
  const item: GalleryItem = {
    slug,
    topic: opts.topic.trim() || slug,
    scene: scenes.length ? scenes.join("+") : "创作",
    age: age || undefined,
    type: opts.type,
    category: inferCategory(opts.topic, scenes),
    tier: "created",
    ok: true,
  };
  const list = [item, ...readManifest(MADE_MANIFEST).filter((x) => x.slug !== slug)];
  fs.writeFileSync(MADE_MANIFEST, JSON.stringify(list, null, 2) + "\n", "utf8");
  return item;
}
