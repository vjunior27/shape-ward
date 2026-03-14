/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Shape Ward — GIF Upload Script
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * What it does:
 *   1. Reads exercises.json from the Kaggle dataset
 *   2. Uploads every GIF (gifs_360x360) to Firebase Storage
 *   3. Generates public/exercise-gifs.json with BOTH English and Portuguese
 *      aliases pointing to the same Firebase Storage URL
 *
 * Run ONCE before deploying:
 *   cd scripts
 *   npm install
 *   node uploadGifs.cjs
 *
 * Requirements:
 *   - serviceAccountKey.json in this folder (see README below)
 *   - Firebase Storage rules must allow public reads for exercise-gifs/
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * HOW TO GET serviceAccountKey.json:
 *   1. Go to https://console.firebase.google.com/project/shape-ward/settings/serviceaccounts/adminsdk
 *   2. Click "Gerar nova chave privada"
 *   3. Save the downloaded JSON as scripts/serviceAccountKey.json
 * ─────────────────────────────────────────────────────────────────────────────
 */

const admin   = require('firebase-admin');
const fs      = require('fs');
const path    = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const DATASET_ROOT  = 'C:/Users/Vilson/Downloads/GymGifs/exercisedb_v1_sample';
const GIFS_DIR      = path.join(DATASET_ROOT, 'gifs_360x360');
const EXERCISES_JSON = path.join(DATASET_ROOT, 'exercises.json');
const OUTPUT_JSON   = path.join(__dirname, '../public/exercise-gifs.json');
const STORAGE_BUCKET = 'shape-ward.firebasestorage.app';
const STORAGE_PREFIX = 'exercise-gifs';

// ─── Firebase init ───────────────────────────────────────────────────────────

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('\n❌  serviceAccountKey.json not found in scripts/');
  console.error('   Download it from:');
  console.error('   https://console.firebase.google.com/project/shape-ward/settings/serviceaccounts/adminsdk\n');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
  storageBucket: STORAGE_BUCKET,
});

const bucket = admin.storage().bucket();

// ─── Portuguese keyword translations ─────────────────────────────────────────
// Maps English exercise keywords → Portuguese aliases added to the JSON map
// The gifService uses partial/fuzzy matching, so aliases help bridge the gap.

const EN_PT_KEYWORDS = [
  // chest
  { en: ['bench press', 'chest press'],         pt: ['supino', 'press de peito'] },
  { en: ['incline bench'],                       pt: ['supino inclinado'] },
  { en: ['decline bench'],                       pt: ['supino declinado'] },
  { en: ['chest fly', 'pec fly', 'cable fly'],  pt: ['crucifixo', 'voador'] },
  { en: ['push up', 'pushup'],                  pt: ['flexão', 'flexao'] },
  { en: ['dip'],                                pt: ['mergulho', 'paralelas'] },
  // back
  { en: ['pull up', 'pullup', 'chin up'],       pt: ['barra fixa', 'pullup'] },
  { en: ['pulldown', 'pull down', 'lat pull'],  pt: ['puxada', 'puxada frontal'] },
  { en: ['row', 'rowing'],                      pt: ['remada'] },
  { en: ['deadlift'],                           pt: ['levantamento terra', 'terra'] },
  { en: ['hyperextension'],                     pt: ['hiperextensão', 'hiperextensao', 'lombar'] },
  // shoulders
  { en: ['shoulder press', 'overhead press'],  pt: ['desenvolvimento', 'press ombro'] },
  { en: ['lateral raise', 'side raise'],        pt: ['elevação lateral', 'elevacao lateral'] },
  { en: ['front raise'],                        pt: ['elevação frontal', 'elevacao frontal'] },
  { en: ['upright row'],                        pt: ['remada alta'] },
  { en: ['shrug'],                              pt: ['encolhimento'] },
  // arms - biceps
  { en: ['curl', 'bicep curl', 'biceps curl'],  pt: ['rosca', 'rosca direta', 'rosca biceps'] },
  { en: ['hammer curl'],                        pt: ['rosca martelo'] },
  { en: ['preacher curl'],                      pt: ['rosca scott'] },
  { en: ['concentration curl'],                 pt: ['rosca concentrada'] },
  // arms - triceps
  { en: ['tricep', 'triceps', 'extension'],     pt: ['tríceps', 'triceps', 'extensão tríceps'] },
  { en: ['skull crusher'],                      pt: ['testa'] },
  { en: ['overhead tricep'],                    pt: ['tríceps testa', 'francês'] },
  { en: ['pushdown', 'push down'],              pt: ['tríceps pulley', 'triceps pulley'] },
  // legs
  { en: ['squat'],                              pt: ['agachamento', 'agacho'] },
  { en: ['leg press'],                          pt: ['leg press', 'prensa'] },
  { en: ['lunge'],                              pt: ['avanço', 'avanco', 'passada'] },
  { en: ['leg extension'],                      pt: ['cadeira extensora', 'extensora'] },
  { en: ['leg curl', 'hamstring curl'],         pt: ['mesa flexora', 'flexora', 'rosca femoral'] },
  { en: ['calf raise'],                         pt: ['panturrilha', 'elevação de panturrilha'] },
  { en: ['glute bridge', 'hip thrust'],         pt: ['elevação de quadril', 'gluteo'] },
  { en: ['deadlift'],                           pt: ['terra', 'levantamento terra'] },
  { en: ['hack squat'],                         pt: ['hack squat', 'agachamento hack'] },
  { en: ['pistol squat'],                       pt: ['agachamento unilateral', 'pistol'] },
  // abs / core
  { en: ['crunch', 'sit up', 'situp'],          pt: ['abdominal', 'crunch'] },
  { en: ['plank'],                              pt: ['prancha', 'isometria'] },
  { en: ['side bend'],                          pt: ['oblíquo', 'obliquo', 'lateral'] },
  { en: ['leg raise', 'knee raise'],            pt: ['elevação de pernas', 'abdominal suspenso'] },
  { en: ['twist'],                              pt: ['rotação', 'rotacao', 'oblíquo rotacional'] },
  { en: ['cable crunch'],                       pt: ['abdominal polia', 'crunch polia'] },
];

/**
 * Given an English exercise name, returns a list of likely Portuguese aliases.
 * Used to enrich the JSON map so Portuguese app names get matched.
 */
function getPtAliases(enName) {
  const lower = enName.toLowerCase();
  const aliases = [];
  for (const mapping of EN_PT_KEYWORDS) {
    const matched = mapping.en.some((kw) => lower.includes(kw));
    if (matched) {
      aliases.push(...mapping.pt);
    }
  }
  return aliases;
}

/**
 * Builds the public download URL for a Firebase Storage file.
 * Format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded_path}?alt=media
 */
function buildPublicUrl(storagePath) {
  const encoded = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encoded}?alt=media`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const exercises = JSON.parse(fs.readFileSync(EXERCISES_JSON, 'utf-8'));
  const gifMap    = {};
  let   uploaded  = 0;
  let   skipped   = 0;
  let   failed    = 0;

  console.log(`\n🚀  Starting upload of ${exercises.length} exercises...\n`);

  for (const ex of exercises) {
    const gifFileName = ex.gifUrl;                            // e.g. "2ORFMoR.gif"
    const localPath   = path.join(GIFS_DIR, gifFileName);
    const storagePath = `${STORAGE_PREFIX}/${gifFileName}`;

    if (!fs.existsSync(localPath)) {
      console.warn(`  ⚠  GIF missing: ${gifFileName}`);
      skipped++;
      continue;
    }

    try {
      // Upload with long cache TTL since GIFs are static
      await bucket.upload(localPath, {
        destination: storagePath,
        metadata: {
          contentType: 'image/gif',
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });

      // Make publicly readable
      await bucket.file(storagePath).makePublic();

      const publicUrl = buildPublicUrl(storagePath);

      // Add English name
      gifMap[ex.name] = publicUrl;

      // Add Portuguese aliases
      const ptAliases = getPtAliases(ex.name);
      for (const alias of ptAliases) {
        // Don't overwrite if a more specific alias is already set
        if (!gifMap[alias]) {
          gifMap[alias] = publicUrl;
        }
      }

      console.log(`  ✓  [${++uploaded}/${exercises.length}] ${ex.name}`);
    } catch (err) {
      console.error(`  ✗  ${ex.name}: ${err.message}`);
      failed++;
    }
  }

  // Write output JSON
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(gifMap, null, 2), 'utf-8');

  console.log('\n────────────────────────────────────────');
  console.log(`✅  Done!`);
  console.log(`   Uploaded : ${uploaded}`);
  console.log(`   Skipped  : ${skipped}`);
  console.log(`   Failed   : ${failed}`);
  console.log(`   Map size : ${Object.keys(gifMap).length} entries`);
  console.log(`   Output   : ${OUTPUT_JSON}`);
  console.log('\n📦  Next step: npm run build && firebase deploy --only hosting\n');
}

main().catch((err) => {
  console.error('\n❌  Fatal error:', err.message);
  process.exit(1);
});
