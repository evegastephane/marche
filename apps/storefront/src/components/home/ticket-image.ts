/**
 * Le ticket de caisse d'exemple en image PNG (largeur d'un rouleau de 80 mm), dessiné ligne à ligne dans un canevas
 * avec la police du ticket affiché, puis téléchargé.
 */

export interface TicketData {
  store: string;
  city: string;
  number: number;
  at: string;
  lines: { label: string; amount: string }[];
  total: string;
  method: string;
  received: string;
  change: string | null;
}

type Row =
  | { kind: 'center'; text: string; size?: number; weight?: number }
  | {
      kind: 'pair';
      left: string;
      right: string;
      size?: number;
      weight?: number;
    }
  | { kind: 'rule' }
  | { kind: 'space'; height: number };

const WIDTH = 320;
const PAD = 22;
const SCALE = 3;
const INK = '#1b1a17';
const PAPER = '#fbfaf6';
const TOOTH = 8;
const BARCODE = 40;

function rowHeight(row: Row): number {
  if (row.kind === 'rule') return 16;
  if (row.kind === 'space') return row.height;
  return Math.round((row.size ?? 12) * 1.55);
}

/** Coupe un libellé avec « … » pour qu'il tienne dans la largeur donnée. */
function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
): string {
  if (ctx.measureText(text).width <= width) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width)
    cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

export async function downloadTicket(
  data: TicketData,
  fontFamily: string,
): Promise<void> {
  await document.fonts.ready;
  const rows: Row[] = [
    { kind: 'center', text: data.store, size: 16, weight: 800 },
    { kind: 'center', text: data.city },
    { kind: 'center', text: `Ticket n° ${data.number}` },
    { kind: 'center', text: data.at },
    { kind: 'rule' },
    ...data.lines.map((line): Row => ({
      kind: 'pair',
      left: line.label,
      right: line.amount,
    })),
    { kind: 'rule' },
    { kind: 'pair', left: 'TOTAL', right: data.total, size: 14, weight: 800 },
    { kind: 'pair', left: data.method, right: data.received },
    ...(data.change
      ? [{ kind: 'pair', left: 'Monnaie rendue', right: data.change } as Row]
      : []),
    { kind: 'rule' },
    { kind: 'center', text: 'Merci de votre visite' },
    { kind: 'space', height: 10 },
  ];
  const height =
    PAD +
    rows.reduce((sum, row) => sum + rowHeight(row), 0) +
    BARCODE +
    PAD +
    TOOTH;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(SCALE, SCALE);

  // Papier, bord bas déchiré en dents de scie.
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(WIDTH, 0);
  ctx.lineTo(WIDTH, height - TOOTH);
  for (let x = WIDTH; x > 0; x -= 12) {
    ctx.lineTo(x - 6, height);
    ctx.lineTo(Math.max(0, x - 12), height - TOOTH);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.textBaseline = 'middle';
  let y = PAD;
  for (const row of rows) {
    const h = rowHeight(row);
    const mid = y + h / 2;
    if (row.kind === 'rule') {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, mid);
      ctx.lineTo(WIDTH - PAD, mid);
      ctx.stroke();
      ctx.restore();
    } else if (row.kind === 'center') {
      ctx.font = `${row.weight ?? 400} ${row.size ?? 12}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.fillText(fit(ctx, row.text, WIDTH - PAD * 2), WIDTH / 2, mid);
    } else if (row.kind === 'pair') {
      ctx.font = `${row.weight ?? 400} ${row.size ?? 12}px ${fontFamily}`;
      ctx.textAlign = 'right';
      ctx.fillText(row.right, WIDTH - PAD, mid);
      const room = WIDTH - PAD * 2 - ctx.measureText(row.right).width - 12;
      ctx.textAlign = 'left';
      ctx.fillText(fit(ctx, row.left, room), PAD, mid);
    }
    y += h;
  }

  // Code-barres du numéro de ticket : des barres de largeur variable, tirées des chiffres.
  const digits = String(data.number).padStart(6, '0').repeat(4);
  let x = PAD;
  let i = 0;
  while (x < WIDTH - PAD) {
    const d = Number(digits[i % digits.length]);
    const bar = 1 + (d % 3);
    if (i % 2 === 0)
      ctx.fillRect(x, y, Math.min(bar, WIDTH - PAD - x), BARCODE);
    x += bar + (i % 2 === 0 ? 0 : 1 + (d % 2));
    i++;
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ticket-${data.number}.png`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
