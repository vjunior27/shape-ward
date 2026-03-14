export interface ShareCardData {
  type: 'streak' | 'workout' | 'weekly' | 'pr' | 'level_up';
  userName: string;
  // streak
  streakDays?: number;
  // workout
  durationMinutes?: number;
  totalVolume?: number;
  exerciseCount?: number;
  newPR?: string;
  // weekly
  trainedDays?: string[]; // ['Seg','Qua','Sex']
  weekLabel?: string;
  weeklyVolume?: number;
  // level
  level?: number;
  levelName?: string;
  levelIcon?: string;
}

export interface ShareCardTheme {
  id: string;
  name: string;
  gradientStart: string;
  gradientEnd: string;
  accentColor: string;
}

export const SHARE_THEMES: ShareCardTheme[] = [
  { id: 'dark',   name: 'Escuro',  gradientStart: '#0F0F1A', gradientEnd: '#1A1A2E',   accentColor: '#E94560' },
  { id: 'fire',   name: 'Fogo',    gradientStart: '#1A0000', gradientEnd: '#4A0800',   accentColor: '#FF4500' },
  { id: 'ocean',  name: 'Oceano',  gradientStart: '#001A2E', gradientEnd: '#003366',   accentColor: '#00C2FF' },
  { id: 'forest', name: 'Floresta',gradientStart: '#001A0A', gradientEnd: '#003319',   accentColor: '#00E676' },
];

// ─── Canvas helpers ───────────────────────────────────────────────────────────

function createCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function drawGradientBg(ctx: CanvasRenderingContext2D, w: number, h: number, theme: ShareCardTheme) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, theme.gradientStart);
  grad.addColorStop(1, theme.gradientEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawBrand(ctx: CanvasRenderingContext2D, w: number, y: number, accent: string) {
  ctx.fillStyle = accent;
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('◆ SHAPE WARD ◆', w / 2, y);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  color: string, font: string,
  align: CanvasTextAlign = 'center'
) {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

// ─── Card generators ──────────────────────────────────────────────────────────

function drawStreakCard(ctx: CanvasRenderingContext2D, data: ShareCardData, theme: ShareCardTheme) {
  const W = 1080, H = 1920;
  drawGradientBg(ctx, W, H, theme);

  // Brand
  drawBrand(ctx, W, 140, theme.accentColor);

  // Fire emoji ring
  ctx.font = '120px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('🔥', W / 2, H / 2 - 120);

  // Streak number
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold 280px "SF Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(String(data.streakDays ?? 0), W / 2, H / 2 + 120);

  // Label
  drawText(ctx, 'dias de streak', W / 2, H / 2 + 200, '#AAAAAA', '52px system-ui');

  // User
  drawText(ctx, data.userName, W / 2, H - 180, '#FFFFFF', 'bold 48px system-ui');
  drawText(ctx, 'shape-ward.app', W / 2, H - 100, theme.accentColor, '32px system-ui');
}

function drawWorkoutCard(ctx: CanvasRenderingContext2D, data: ShareCardData, theme: ShareCardTheme) {
  const W = 1080, H = 1920;
  drawGradientBg(ctx, W, H, theme);
  drawBrand(ctx, W, 140, theme.accentColor);

  drawText(ctx, '✅ Treino Completo', W / 2, 280, '#FFFFFF', 'bold 72px system-ui');
  drawText(ctx, data.userName, W / 2, 360, theme.accentColor, '40px system-ui');

  // Stats grid
  const stats = [
    { label: 'Duração', value: `${data.durationMinutes ?? 0}min` },
    { label: 'Volume',  value: `${(data.totalVolume ?? 0).toLocaleString('pt-BR')}kg` },
    { label: 'Exercícios', value: String(data.exerciseCount ?? 0) },
  ];

  stats.forEach((s, i) => {
    const x = 180 + i * 360;
    const y = 560;
    // Box
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(ctx, x - 120, y - 80, 240, 160, 20);
    ctx.fill();

    drawText(ctx, s.value, x, y, '#FFFFFF', 'bold 60px monospace');
    drawText(ctx, s.label, x, y + 60, '#999999', '30px system-ui');
  });

  // PR badge
  if (data.newPR) {
    ctx.fillStyle = 'rgba(255, 200, 0, 0.1)';
    roundRect(ctx, 140, 760, 800, 120, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 200, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawText(ctx, `🏆 Novo PR: ${data.newPR}`, W / 2, 840, '#FFD700', 'bold 44px system-ui');
  }

  drawText(ctx, 'shape-ward.app', W / 2, H - 100, theme.accentColor, '32px system-ui');
}

function drawWeeklyCard(ctx: CanvasRenderingContext2D, data: ShareCardData, theme: ShareCardTheme) {
  const W = 1080, H = 1080;
  drawGradientBg(ctx, W, H, theme);
  drawBrand(ctx, W, 100, theme.accentColor);

  drawText(ctx, data.weekLabel ?? 'Resumo Semanal', W / 2, 180, '#FFFFFF', 'bold 56px system-ui');
  drawText(ctx, data.userName, W / 2, 250, theme.accentColor, '36px system-ui');

  // Day tracker
  const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const trained = new Set(data.trainedDays ?? []);
  const cellW = 120, gap = 20;
  const totalW = DAYS.length * cellW + (DAYS.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const cellY = 380;

  DAYS.forEach((d, i) => {
    const x = startX + i * (cellW + gap);
    const active = trained.has(d);
    ctx.fillStyle = active ? theme.accentColor : 'rgba(255,255,255,0.08)';
    roundRect(ctx, x, cellY, cellW, cellW + 20, 16);
    ctx.fill();
    drawText(ctx, d, x + cellW / 2, cellY + 58, active ? '#000000' : '#555555', 'bold 30px system-ui');
    if (active) drawText(ctx, '✓', x + cellW / 2, cellY + 100, '#000000', 'bold 32px system-ui');
  });

  const trainedCount = trained.size;
  drawText(ctx, `${trainedCount} dias treinados`, W / 2, 580, '#FFFFFF', 'bold 52px system-ui');

  if (data.weeklyVolume) {
    drawText(ctx, `Volume total: ${data.weeklyVolume.toLocaleString('pt-BR')}kg`, W / 2, 660, '#AAAAAA', '36px system-ui');
  }

  drawText(ctx, 'shape-ward.app', W / 2, H - 60, theme.accentColor, '28px system-ui');
}

function drawPRCard(ctx: CanvasRenderingContext2D, data: ShareCardData, theme: ShareCardTheme) {
  const W = 1080, H = 1920;
  drawGradientBg(ctx, W, H, theme);

  // Gold overlay
  const gold = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 600);
  gold.addColorStop(0, 'rgba(255, 200, 0, 0.15)');
  gold.addColorStop(1, 'rgba(255, 200, 0, 0)');
  ctx.fillStyle = gold;
  ctx.fillRect(0, 0, W, H);

  drawBrand(ctx, W, 140, theme.accentColor);
  ctx.font = '150px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('🏆', W / 2, H / 2 - 200);
  drawText(ctx, 'NOVO RECORDE', W / 2, H / 2, '#FFD700', 'black 80px system-ui');
  drawText(ctx, data.newPR ?? '', W / 2, H / 2 + 100, '#FFFFFF', 'bold 56px system-ui');
  drawText(ctx, data.userName, W / 2, H - 180, '#FFFFFF', 'bold 48px system-ui');
  drawText(ctx, 'shape-ward.app', W / 2, H - 100, theme.accentColor, '32px system-ui');
}

function drawLevelUpCard(ctx: CanvasRenderingContext2D, data: ShareCardData, theme: ShareCardTheme) {
  const W = 1080, H = 1920;
  drawGradientBg(ctx, W, H, theme);

  // Glow
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 400);
  glow.addColorStop(0, `${theme.accentColor}30`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  drawBrand(ctx, W, 140, theme.accentColor);
  ctx.font = '160px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(data.levelIcon ?? '⚡', W / 2, H / 2 - 100);
  drawText(ctx, `NÍVEL ${data.level ?? 1}`, W / 2, H / 2 + 60, theme.accentColor, 'black 80px system-ui');
  drawText(ctx, data.levelName ?? '', W / 2, H / 2 + 160, '#FFFFFF', 'bold 56px system-ui');
  drawText(ctx, data.userName, W / 2, H - 180, '#FFFFFF', 'bold 48px system-ui');
  drawText(ctx, 'shape-ward.app', W / 2, H - 100, theme.accentColor, '32px system-ui');
}

// Polyfill roundRect for older browsers
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateShareCard(
  data: ShareCardData,
  themeId: string = 'dark'
): Promise<Blob> {
  const theme = SHARE_THEMES.find((t) => t.id === themeId) ?? SHARE_THEMES[0];

  const isSquare = data.type === 'weekly';
  const W = 1080;
  const H = isSquare ? 1080 : 1920;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d')!;

  switch (data.type) {
    case 'streak':   drawStreakCard(ctx, data, theme);  break;
    case 'workout':  drawWorkoutCard(ctx, data, theme); break;
    case 'weekly':   drawWeeklyCard(ctx, data, theme);  break;
    case 'pr':       drawPRCard(ctx, data, theme);      break;
    case 'level_up': drawLevelUpCard(ctx, data, theme); break;
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))), 'image/png')
  );
}

export async function shareCard(data: ShareCardData, themeId = 'dark'): Promise<void> {
  const blob = await generateShareCard(data, themeId);
  const file = new File([blob], 'shape-ward-share.png', { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Shape Ward', text: 'Meu progresso no Shape Ward 💪' });
  } else {
    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shape-ward-share.png';
    a.click();
    URL.revokeObjectURL(url);
  }
}
