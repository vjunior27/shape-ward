import { WeekSummary } from "../types";

// ─── Internal helpers ─────────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const DAY_LETTERS  = ["S", "T", "Q", "Q", "S", "S", "D"];
const DAY_PREFIXES = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const PRIMARY = "#00FF94";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/**
 * Generates a transparent PNG sticker badge ready for Instagram Stories overlay.
 *
 * Export resolution: 520×520 logical → 1560×1560 px (scale ×3).
 * The area OUTSIDE the rounded-rect shape is fully transparent.
 */
export async function generateWorkoutBadge(summary: WeekSummary): Promise<Blob> {
  const SCALE = 3;
  const S = 520;

  const canvas = document.createElement("canvas");
  canvas.width  = S * SCALE;
  canvas.height = S * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);

  // Canvas default = transparent — we intentionally leave outside badge area untouched.

  const PAD = 18;
  const BX = PAD, BY = PAD;
  const BW = S - PAD * 2, BH = S - PAD * 2;
  const BR = 64;
  const CX = S / 2;

  // ── Clipped interior (background + gradients) ────────────────────────────────
  ctx.save();
  roundRect(ctx, BX, BY, BW, BH, BR);
  ctx.clip();

  // Dark glass base — high opacity so the badge is readable when overlaid on photos
  ctx.fillStyle = "rgba(5, 5, 13, 0.91)";
  ctx.fillRect(BX, BY, BW, BH);

  // Radial green glow from the top
  const topGlow = ctx.createRadialGradient(CX, BY, 0, CX, BY, 210);
  topGlow.addColorStop(0, "rgba(0,255,148,0.20)");
  topGlow.addColorStop(1, "transparent");
  ctx.fillStyle = topGlow;
  ctx.fillRect(BX, BY, BW, BH);

  // Subtle center accent
  const midGlow = ctx.createRadialGradient(CX, BY + BH * 0.42, 0, CX, BY + BH * 0.42, 100);
  midGlow.addColorStop(0, "rgba(0,255,148,0.05)");
  midGlow.addColorStop(1, "transparent");
  ctx.fillStyle = midGlow;
  ctx.fillRect(BX, BY, BW, BH);

  ctx.restore();

  // ── Badge border ──────────────────────────────────────────────────────────────
  roundRect(ctx, BX + 0.75, BY + 0.75, BW - 1.5, BH - 1.5, BR);
  ctx.strokeStyle = "rgba(0,255,148,0.30)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner inset highlight (top-left) — glass feel
  roundRect(ctx, BX + 1.5, BY + 1.5, BW - 3, BH - 3, BR - 1.5);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── Brand header ──────────────────────────────────────────────────────────────
  ctx.textAlign = "center";
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = PRIMARY;
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillText("◆  TRAINOVA  ◆", CX, BY + 32);
  ctx.globalAlpha = 1;

  // Separator
  ctx.strokeStyle = "rgba(0,255,148,0.11)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(BX + 52, BY + 45);
  ctx.lineTo(BX + BW - 52, BY + 45);
  ctx.stroke();

  // ── 🔥 Fire emoji ─────────────────────────────────────────────────────────────
  ctx.font = "80px serif";
  ctx.textAlign = "center";
  ctx.fillText("🔥", CX, BY + 148);

  // ── Streak number ─────────────────────────────────────────────────────────────
  const streakStr = summary.streakWeeks.toString();
  const numSize = streakStr.length > 2 ? 72 : 98;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${numSize}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(streakStr, CX, BY + 272);

  // ── "SEMANAS SEGUIDAS" label ───────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.40)";
  ctx.font = `bold 10px ${FONT}`;
  ctx.textAlign = "center";
  // Spaced text simulating letter-spacing
  ctx.fillText("S E M A N A S   S E G U I D A S", CX, BY + 298);

  // Separator
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(BX + 68, BY + 316);
  ctx.lineTo(BX + BW - 68, BY + 316);
  ctx.stroke();

  // ── Day dot row ───────────────────────────────────────────────────────────────
  const DOT_R = 17;
  const DOT_GAP = 11;
  const totalDW = DAY_LETTERS.length * DOT_R * 2 + (DAY_LETTERS.length - 1) * DOT_GAP;
  const dotX0 = CX - totalDW / 2 + DOT_R;
  const dotCY = BY + 362;

  DAY_LETTERS.forEach((letter, i) => {
    const dcx = dotX0 + i * (DOT_R * 2 + DOT_GAP);
    const trained = summary.trainedDays.some(d => d.toLowerCase().startsWith(DAY_PREFIXES[i]));

    ctx.beginPath();
    ctx.arc(dcx, dotCY, DOT_R, 0, Math.PI * 2);

    if (trained) {
      ctx.fillStyle = PRIMARY;
      ctx.fill();
      // Radial highlight inside the dot
      const dotHL = ctx.createRadialGradient(dcx, dotCY - 5, 0, dcx, dotCY, DOT_R);
      dotHL.addColorStop(0, "rgba(255,255,255,0.28)");
      dotHL.addColorStop(1, "transparent");
      ctx.fillStyle = dotHL;
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.13)";
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    ctx.fillStyle = trained ? "#000000" : "rgba(255,255,255,0.22)";
    ctx.font = `bold 10px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(letter, dcx, dotCY + 3.5);
  });

  // ── Week info ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.24)";
  ctx.font = `10px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`Semana ${summary.weekNumber}  ·  ${summary.year}`, CX, BY + 410);

  // ── Watermark ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(0,255,148,0.20)";
  ctx.font = `9px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("trainova.app", CX, BY + BH - 14);

  // ── Export ────────────────────────────────────────────────────────────────────
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar sticker"))),
      "image/png",
    );
  });
}

/** Triggers a browser download of the badge PNG. */
export function downloadBadge(blob: Blob, weekNumber: number): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trainova-sticker-semana-${weekNumber}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
