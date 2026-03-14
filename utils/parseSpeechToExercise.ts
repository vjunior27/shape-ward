import { Exercise } from "../types";

type ParsedExercise = Omit<Exercise, "id">;

/** Maps spoken Portuguese number words to digits */
const NUMBER_WORDS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, três: 3, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
  treze: 13, quatorze: 14, quinze: 15, dezesseis: 16, dezessete: 17,
  dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40,
  cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
  cem: 100, cento: 100, cento_e_vinte: 120, cento_e_cinquenta: 150,
  duzentos: 200, duzentas: 200,
};

/** Replaces spoken number words with digits in a string */
const replaceNumberWords = (text: string): string =>
  text.replace(/\b([a-záàâãéêíóôõúüç]+)\b/g, (word) => {
    const n = NUMBER_WORDS[word];
    return n !== undefined ? String(n) : word;
  });

/**
 * Parses a spoken phrase in Portuguese into exercise fields.
 *
 * Supports natural speech like:
 * "supino reto, oitenta quilos, doze repetições, quatro séries"
 * "leg press 120 kg 15 reps 3 series"
 * "rosca direta 30 quilos doze repetições três séries"
 */
export function parseSpeechToExercise(rawTranscript: string): Partial<ParsedExercise> {
  const transcript = replaceNumberWords(rawTranscript.toLowerCase());

  // ── Weight ──────────────────────────────────────────────────────────────────
  // Matches: "80 quilos", "80kg", "carga 80", "80 kilo"
  const weightMatch = transcript.match(/(\d+(?:[.,]\d+)?)\s*(?:quilos?|kg|kilo(?:gramas?)?)|(?:carga|peso)\s+(\d+)/);
  const weight = weightMatch?.[1] ?? weightMatch?.[2] ?? "";

  // ── Reps ────────────────────────────────────────────────────────────────────
  // Matches: "12 repetições", "12 reps", "12 rep"
  const repsMatch = transcript.match(/(\d+)\s*(?:repeti[cç][oõ]es?|reps?|rep\b)/);
  const reps = repsMatch?.[1] ?? "";

  // ── Sets ────────────────────────────────────────────────────────────────────
  // Matches: "4 séries", "4 series", "4 set"
  const setsMatch = transcript.match(/(\d+)\s*(?:s[eé]ries?|sets?)/);
  const sets = setsMatch?.[1] ?? "";

  // ── Exercise name ────────────────────────────────────────────────────────────
  // Everything before the first number or before weight/reps/sets keyword
  const nameRaw = transcript
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:quilos?|kg|kilos?|carga|peso|repeti[cç][oõ]es?|reps?|s[eé]ries?|sets?).*/g, "")
    .replace(/[,;.]/g, "")
    .trim();

  // Capitalize each word for display
  const name = nameRaw
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return { name, weight, reps, sets };
}

/**
 * Returns user-friendly feedback about what was understood.
 * Useful for showing a confirmation to the user after parsing.
 */
export function formatParsedFeedback(parsed: Partial<ParsedExercise>): string {
  const parts: string[] = [];
  if (parsed.name) parts.push(parsed.name);
  if (parsed.weight) parts.push(`${parsed.weight}kg`);
  if (parsed.sets && parsed.reps) parts.push(`${parsed.sets}x${parsed.reps}`);
  else if (parsed.reps) parts.push(`${parsed.reps} reps`);
  else if (parsed.sets) parts.push(`${parsed.sets} séries`);
  return parts.join(" · ") || "Nada reconhecido";
}
