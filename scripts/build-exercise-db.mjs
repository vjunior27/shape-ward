/**
 * Converts exercises.csv (Kaggle omarxadel/fitness-exercises-dataset)
 * into public/exercise-db.json used by gifService.ts
 *
 * Run: node scripts/build-exercise-db.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ─── CSV parser (handles quoted fields with commas inside) ────────────────────
function parseCSVLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

// ─── Read & parse ─────────────────────────────────────────────────────────────
const raw = readFileSync(join(root, "exercises.csv"), "utf-8");
const lines = raw.split("\n").filter(Boolean);
const headers = parseCSVLine(lines[0]);

const exercises = [];

for (let i = 1; i < lines.length; i++) {
  const vals = parseCSVLine(lines[i]);
  const row = {};
  headers.forEach((h, idx) => { row[h] = (vals[idx] ?? "").trim(); });

  // Collect secondaryMuscles (columns secondaryMuscles/0 … /5)
  const secondaryMuscles = [];
  for (let n = 0; n <= 5; n++) {
    const v = row[`secondaryMuscles/${n}`];
    if (v) secondaryMuscles.push(v);
  }

  // Collect instructions (columns instructions/0 … /10)
  const instructions = [];
  for (let n = 0; n <= 10; n++) {
    const v = row[`instructions/${n}`];
    if (v) instructions.push(v);
  }

  if (!row.name || !row.gifUrl) continue;

  exercises.push({
    id: row.id,
    name: row.name,
    gifUrl: row.gifUrl,
    bodyPart: row.bodyPart,
    equipment: row.equipment,
    target: row.target,
    secondaryMuscles,
    instructions,
  });
}

// ─── Write output ─────────────────────────────────────────────────────────────
const outPath = join(root, "public", "exercise-db.json");
writeFileSync(outPath, JSON.stringify(exercises, null, 2), "utf-8");

console.log(`✅  Wrote ${exercises.length} exercises → public/exercise-db.json`);
console.log(`    Sample: "${exercises[0].name}" → ${exercises[0].gifUrl}`);
