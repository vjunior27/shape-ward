import { WeekSummary } from "../types";

const COLORS = {
  background: "#121212",
  surface: "#1E1E1E",
  primary: "#00FF94",
  primaryDark: "#00cc76",
  white: "#FFFFFF",
  gray: "#888888",
  lightGray: "#CCCCCC",
};

/** Draws a rounded rectangle on the canvas context */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  width: number, height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Generates a 1080×1920 Instagram Stories share card using the Canvas API.
 * Returns a Blob ready for download or Web Share API.
 *
 * Zero external dependencies — uses only browser Canvas API.
 */
export async function generateShareImage(
  summary: WeekSummary,
  userName: string
): Promise<Blob> {
  const W = 1080;
  const H = 1920;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial gradient at top
  const grad = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, H * 0.6);
  grad.addColorStop(0, "rgba(0,255,148,0.08)");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // ── App brand ───────────────────────────────────────────────────────────────
  ctx.fillStyle = COLORS.primary;
  ctx.font = "bold 56px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TRAINOVA", W / 2, 140);

  ctx.fillStyle = COLORS.gray;
  ctx.font = "36px sans-serif";
  ctx.fillText("Resumo Semanal", W / 2, 200);

  // ── User name ───────────────────────────────────────────────────────────────
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 72px sans-serif";
  ctx.fillText(userName, W / 2, 340);

  // ── Week info ───────────────────────────────────────────────────────────────
  ctx.fillStyle = COLORS.gray;
  ctx.font = "38px sans-serif";
  ctx.fillText(`Semana ${summary.weekNumber} · ${summary.year}`, W / 2, 410);

  // ── Crown + goal badge ──────────────────────────────────────────────────────
  if (summary.goalReached) {
    ctx.font = "120px sans-serif";
    ctx.fillText("👑", W / 2, 560);

    ctx.fillStyle = COLORS.primary;
    ctx.font = "bold 48px sans-serif";
    ctx.fillText("META SEMANAL ATINGIDA!", W / 2, 630);
  } else {
    ctx.fillStyle = COLORS.gray;
    ctx.font = "48px sans-serif";
    ctx.fillText(`${summary.trainedDays.length} dias treinados`, W / 2, 580);
  }

  // ── Trained days grid ───────────────────────────────────────────────────────
  const ALL_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const CARD_W = 120;
  const CARD_H = 140;
  const GAP = 20;
  const totalW = ALL_DAYS.length * CARD_W + (ALL_DAYS.length - 1) * GAP;
  const startX = (W - totalW) / 2;
  const startY = 720;

  ALL_DAYS.forEach((day, i) => {
    // Check if full day name exists in trained days
    const trained = summary.trainedDays.some((d) =>
      d.toLowerCase().startsWith(day.toLowerCase().replace("sáb", "sáb").replace("dom", "dom"))
    );
    const x = startX + i * (CARD_W + GAP);
    const y = startY;

    // Card background
    ctx.fillStyle = trained ? COLORS.primary : COLORS.surface;
    roundRect(ctx, x, y, CARD_W, CARD_H, 20);
    ctx.fill();

    // Day abbreviation
    ctx.fillStyle = trained ? "#000000" : COLORS.gray;
    ctx.font = `bold ${trained ? 36 : 32}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(day, x + CARD_W / 2, y + CARD_H / 2 - 10);

    // Checkmark or dot
    ctx.font = "32px sans-serif";
    ctx.fillText(trained ? "✓" : "·", x + CARD_W / 2, y + CARD_H / 2 + 34);
  });

  // ── Bottom watermark ────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = "32px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("trainova.app", W / 2, H - 80);

  // ── Export as PNG Blob ──────────────────────────────────────────────────────
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Falha ao gerar imagem"));
      },
      "image/png"
    );
  });
}

/**
 * Downloads the share image or opens the native share sheet (mobile).
 */
export async function shareWeekSummary(summary: WeekSummary, userName: string): Promise<void> {
  const blob = await generateShareImage(summary, userName);
  const file = new File([blob], "trainova-semana.png", { type: "image/png" });

  // Use Web Share API if available (opens Instagram/WhatsApp share sheet on mobile)
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: `Trainova — Semana ${summary.weekNumber}`,
    });
    return;
  }

  // Fallback: direct download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trainova-semana-${summary.weekNumber}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
