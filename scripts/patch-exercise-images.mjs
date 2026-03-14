/**
 * Patches exercise-db.json with working image URLs from wger.de public API.
 * Run: node scripts/patch-exercise-images.mjs
 *
 * Strategy:
 * 1. Fetch English exercise names from /exercisetranslation/?language=2
 *    → { exercise: baseId, name: "..." }
 * 2. Fetch exercise images from /exerciseimage/
 *    → { exercise: baseId, image: "https://wger.de/media/..." }
 * 3. Join on baseId → build [{ name, imageUrl }]
 * 4. For each entry in exercise-db.json, find best wger match by name similarity
 * 5. Write imageUrl field (separate from broken gifUrl)
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const DB_PATH = join(root, "public", "exercise-db.json");

const WGER = "https://wger.de/api/v2";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchAll(url) {
  const results = [];
  let next = url;
  while (next) {
    process.stdout.write(".");
    const res = await fetch(next, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      console.error(`\nHTTP ${res.status} for ${next}`);
      break;
    }
    const json = await res.json();
    results.push(...(json.results ?? []));
    next = json.next;
    await new Promise((r) => setTimeout(r, 150));
  }
  return results;
}

const normalize = (s = "") =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();

function similarity(a, b) {
  const wordsA = new Set(normalize(a).split(/\s+/).filter(Boolean));
  const wordsB = new Set(normalize(b).split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let shared = 0;
  for (const w of wordsA) if (wordsB.has(w)) shared++;
  return shared / Math.max(wordsA.size, wordsB.size);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// exercise-translation: { exercise: baseId, name: "Bench Press", language: 2, ... }
console.log("Fetching wger exercise translations (English, language=2)...");
const translations = await fetchAll(`${WGER}/exercise-translation/?format=json&language=2&limit=100`);
console.log(`\n  → ${translations.length} translations`);

// exerciseimage: { exercise: baseId, image: "https://wger.de/media/...", is_main: true, ... }
console.log("Fetching wger exercise images...");
const images = await fetchAll(`${WGER}/exerciseimage/?format=json&limit=100`);
console.log(`\n  → ${images.length} images`);

// Map: baseId → first image URL
const imageByBase = new Map();
for (const img of images) {
  const baseId = img.exercise; // exerciseimage.exercise = base ID
  if (!imageByBase.has(baseId) && img.image) {
    imageByBase.set(baseId, img.image);
  }
}

// Build lookup: [{ name, imageUrl }]
const wgerMap = [];
for (const tr of translations) {
  const baseId = tr.exercise; // exercisetranslation.exercise = base ID
  const imageUrl = imageByBase.get(baseId);
  if (imageUrl && tr.name) {
    wgerMap.push({ name: tr.name, imageUrl, baseId });
  }
}
console.log(`  → ${wgerMap.length} wger exercises have both name + image`);

if (wgerMap.length === 0) {
  console.error("ERROR: No matches found. Check API responses above.");
  process.exit(1);
}

// ─── Read & patch ─────────────────────────────────────────────────────────────

const exercises = JSON.parse(readFileSync(DB_PATH, "utf-8"));
let matched = 0;

for (const ex of exercises) {
  let best = null;
  let bestScore = 0;

  for (const w of wgerMap) {
    const score = similarity(ex.name, w.name);
    if (score > bestScore) {
      bestScore = score;
      best = w;
    }
  }

  if (best && bestScore >= 0.4) {
    ex.imageUrl = best.imageUrl;
    matched++;
  } else {
    ex.imageUrl = null;
  }
}

writeFileSync(DB_PATH, JSON.stringify(exercises, null, 2), "utf-8");

const sample = exercises.find((e) => e.imageUrl);
console.log(`\n✅  Patched ${matched}/${exercises.length} exercises with wger images`);
console.log(`   Written → public/exercise-db.json`);
if (sample) console.log(`   Sample: "${sample.name}" → ${sample.imageUrl}`);
