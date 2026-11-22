import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

/**
 * Minimal HTML → PDF renderer for letters and reports. Supports the subset our
 * templates use: h1–h3, p, div (text-align), b/strong, br, hr, table rows,
 * ol/ul/li and `<img data-signature>`. Pure JS, so it runs in the browser and on the server.
 */
type Align = "left" | "center" | "right";
type Run = { text: string; bold: boolean };
type TextBlock = { kind: "text"; runs: Run[]; align: Align; size: number; bold: boolean; bullet?: string | undefined; space: number };
type Block =
  | TextBlock
  | { kind: "row"; cells: Run[][]; header: boolean; equal: boolean }
  | { kind: "hr" }
  | { kind: "signature"; align: Align; who: "kalab" | "dean" };

const BLOCK_STYLE: Record<string, { size: number; bold: boolean; space: number }> = {
  h1: { size: 17, bold: true, space: 10 },
  h2: { size: 14, bold: true, space: 6 },
  h3: { size: 12.5, bold: true, space: 10 },
  p: { size: 11, bold: false, space: 7 },
  li: { size: 11, bold: false, space: 3 },
};

const WIN_ANSI_EXTRA = new Set([8211, 8212, 8216, 8217, 8220, 8221, 8226, 8230, 8364, 8482]);

function sanitize(s: string): string {
  return s
    .replace(/→/g, "->")
    .replace(/\u00a0/g, " ")
    .replace(/[^\n\x20-\xff]/g, (c) => (WIN_ANSI_EXTRA.has(c.charCodeAt(0)) ? c : ""));
}

function decode(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

function alignOf(attrs: string): Align | null {
  const m = /text-align\s*:\s*(left|center|right)/i.exec(attrs);
  return m ? (m[1]!.toLowerCase() as Align) : null;
}

export function parseHtml(input: string): Block[] {
  // The doctype is not content; drop it so it is not printed.
  const html = input.replace(/<!doctype[^>]*>/gi, "");
  const blocks: Block[] = [];
  const alignStack: Align[] = ["left"];
  const lists: { ordered: boolean; n: number }[] = [];
  let bold = 0;
  let current: TextBlock | null = null;
  let row: { cells: Run[][]; header: boolean; equal: boolean } | null = null;
  let cell: Run[] | null = null;

  const align = () => alignStack[alignStack.length - 1]!;
  const flush = () => {
    if (current && current.runs.some((r) => r.text.trim())) blocks.push(current);
    current = null;
  };
  const start = (tag: string, attrs: string) => {
    flush();
    const st = BLOCK_STYLE[tag] ?? BLOCK_STYLE["p"]!;
    let bullet: string | undefined;
    if (tag === "li") {
      const l = lists[lists.length - 1];
      if (l) bullet = l.ordered ? `${++l.n}.` : "•";
      else bullet = "•";
    }
    current = { kind: "text", runs: [], align: alignOf(attrs) ?? align(), size: st.size, bold: st.bold, bullet, space: st.space };
  };

  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const [, closing, rawTag, attrs = "", text] = m;
    if (text !== undefined) {
      const t = decode(text).replace(/\s+/g, " ");
      if (!t.trim() && !current && !cell) continue;
      const run = { text: t, bold: bold > 0 };
      if (cell) cell.push(run);
      else {
        if (!current) start("p", "");
        current!.runs.push(run);
      }
      continue;
    }
    if (!rawTag) continue;
    const tag = rawTag.toLowerCase();
    if (!closing) {
      if (tag in BLOCK_STYLE) start(tag, attrs);
      else if (tag === "div") {
        flush();
        alignStack.push(alignOf(attrs) ?? align());
      } else if (tag === "b" || tag === "strong" || tag === "th") {
        bold++;
        if (tag === "th") {
          if (row) row.header = true;
          cell = [];
        }
      } else if (tag === "br") {
        (cell ?? (current as TextBlock | null)?.runs)?.push({ text: "\n", bold: false });
      } else if (tag === "hr") {
        flush();
        blocks.push({ kind: "hr" });
      } else if (tag === "ol" || tag === "ul") {
        flush();
        lists.push({ ordered: tag === "ol", n: 0 });
      } else if (tag === "tr") {
        flush();
        // data-equal: equal-width columns without the label layout (used for the signature block).
        row = { cells: [], header: false, equal: /data-equal/.test(attrs) };
      } else if (tag === "td") {
        cell = [];
      } else if (tag === "img" && /data-signature/.test(attrs)) {
        flush();
        blocks.push({ kind: "signature", align: align(), who: /data-signature="dean"/.test(attrs) ? "dean" : "kalab" });
      }
    } else {
      if (tag in BLOCK_STYLE) flush();
      else if (tag === "div") {
        flush();
        if (alignStack.length > 1) alignStack.pop();
      } else if (tag === "b" || tag === "strong") bold = Math.max(0, bold - 1);
      else if (tag === "ol" || tag === "ul") lists.pop();
      else if (tag === "td" || tag === "th") {
        if (tag === "th") bold = Math.max(0, bold - 1);
        if (row && cell) row.cells.push(cell);
        cell = null;
      } else if (tag === "tr") {
        if (row) blocks.push({ kind: "row", ...row });
        row = null;
      } else if (tag === "table") flush();
    }
  }
  flush();
  return blocks;
}

type Word = { text: string; bold: boolean; br?: boolean };

function words(runs: Run[]): Word[] {
  const out: Word[] = [];
  for (const r of runs) {
    const parts = sanitize(r.text).split(/(\n| )/);
    for (const p of parts) {
      if (p === "\n") out.push({ text: "", bold: r.bold, br: true });
      else if (p && p !== " ") out.push({ text: p, bold: r.bold });
    }
  }
  return out;
}

export type RenderOptions = {
  /** KaLab signature (data-signature="1"). */
  signature?: { bytes: Uint8Array; mime: string } | null;
  /** Dekan signature (data-signature="dean"), added when the request is endorsed. */
  deanSignature?: { bytes: Uint8Array; mime: string } | null;
  /** Small grey text at the bottom of every page. */
  footer?: string;
};

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;

export async function htmlToPdf(html: string, opts: RenderOptions = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // Official letters use Times New Roman (PDF standard font Times-Roman).
  const regular = await doc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await doc.embedFont(StandardFonts.TimesRomanBold);
  const embed = async (s: { bytes: Uint8Array; mime: string }) => (s.mime.includes("png") ? doc.embedPng(s.bytes) : doc.embedJpg(s.bytes));
  const sig: PDFImage | null = opts.signature ? await embed(opts.signature) : null;
  const deanSig: PDFImage | null = opts.deanSignature ? await embed(opts.deanSignature) : null;
  const ink = rgb(0.12, 0.14, 0.18);
  const muted = rgb(0.45, 0.48, 0.52);
  const width = A4[0] - MARGIN * 2;
  let page: PDFPage = doc.addPage(A4);
  let y = A4[1] - MARGIN;

  const ensure = (h: number) => {
    if (y - h < MARGIN + 20) {
      page = doc.addPage(A4);
      y = A4[1] - MARGIN;
    }
  };
  const fontOf = (b: boolean): PDFFont => (b ? boldFont : regular);

  /** Wraps words into lines no wider than maxW. */
  const wrap = (ws: Word[], size: number, maxW: number) => {
    const lines: { words: Word[]; width: number }[] = [];
    let line: Word[] = [];
    let lw = 0;
    const space = regular.widthOfTextAtSize(" ", size);
    for (const w of ws) {
      if (w.br) {
        lines.push({ words: line, width: lw });
        line = [];
        lw = 0;
        continue;
      }
      const ww = fontOf(w.bold).widthOfTextAtSize(w.text, size);
      const add = line.length ? space + ww : ww;
      if (line.length && lw + add > maxW) {
        lines.push({ words: line, width: lw });
        line = [w];
        lw = ww;
      } else {
        line.push(w);
        lw += add;
      }
    }
    if (line.length) lines.push({ words: line, width: lw });
    return lines;
  };

  /** Draws same-weight words as one string so viewers keep real spaces between them. */
  const drawLine = (ws: Word[], x: number, size: number) => {
    let cx = x;
    let i = 0;
    while (i < ws.length) {
      const bold = ws[i]!.bold;
      const group: string[] = [];
      while (i < ws.length && ws[i]!.bold === bold) group.push(ws[i++]!.text);
      const f = fontOf(bold);
      const text = group.join(" ");
      page.drawText(text, { x: cx, y, size, font: f, color: ink });
      cx += f.widthOfTextAtSize(text + " ", size);
    }
  };

  const blocks = parseHtml(html);
  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi]!;
    if (b.kind === "hr") {
      ensure(14);
      y -= 4;
      page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + width, y }, thickness: 1.2, color: ink });
      y -= 14;
    } else if (b.kind === "signature") {
      // Consecutive signature blocks (Dekan and KaLab) are drawn side by side on the same line.
      const next = blocks[bi + 1];
      const group = next && next.kind === "signature" ? [b, next] : [b];
      if (group.length === 2) bi++;
      const h = 58;
      ensure(h + 6);
      for (const g of group) {
        const img = g.who === "dean" ? deanSig : sig;
        if (!img) continue;
        const scale = Math.min(h / img.height, 170 / img.width);
        const w = img.width * scale;
        const sh = img.height * scale;
        const x = g.align === "right" ? MARGIN + width - w : g.align === "center" ? MARGIN + (width - w) / 2 : MARGIN;
        page.drawImage(img, { x, y: y - sh, width: w, height: sh });
      }
      y -= h + 6;
    } else if (b.kind === "row") {
      const size = 11;
      const lh = size * 1.45;
      const n = Math.max(b.cells.length, 1);
      const labelLayout = n === 2 && !b.equal;
      const colW = labelLayout ? [140, width - 152] : Array.from({ length: n }, () => width / n);
      const wrapped = b.cells.map((c, i) => wrap(words(c.map((r) => ({ ...r, bold: r.bold || b.header }))), size, colW[i]! - 8));
      const rows = Math.max(1, ...wrapped.map((l) => l.length));
      ensure(rows * lh);
      const top = y - size;
      let x = MARGIN;
      wrapped.forEach((lines, i) => {
        y = top;
        lines.forEach((l) => {
          drawLine(l.words, x, size);
          y -= lh;
        });
        if (labelLayout && i === 0) page.drawText(":", { x: MARGIN + colW[0]! - 2, y: top, size, font: regular, color: ink });
        x += colW[i]! + (labelLayout && i === 0 ? 12 : 0);
      });
      y = top - (rows - 1) * lh - (lh - size) - 2;
      if (b.header) {
        page.drawLine({ start: { x: MARGIN, y: y + 6 }, end: { x: MARGIN + width, y: y + 6 }, thickness: 0.6, color: muted });
        y -= 2;
      }
      const next = blocks[bi + 1];
      if (!next || next.kind !== "row") y -= 8;
    } else {
      const size = b.size;
      const lh = size * 1.45;
      const indent = b.bullet ? 18 : 0;
      const ws = words(b.runs.map((r) => ({ ...r, bold: r.bold || b.bold })));
      const lines = wrap(ws, size, width - indent);
      lines.forEach((l, i) => {
        ensure(lh);
        y -= size;
        const x =
          b.align === "center"
            ? MARGIN + (width - l.width) / 2
            : b.align === "right"
              ? MARGIN + width - l.width
              : MARGIN + indent;
        if (i === 0 && b.bullet) page.drawText(b.bullet, { x: MARGIN + 2, y, size, font: regular, color: ink });
        drawLine(l.words, x, size);
        y -= lh - size;
      });
      y -= b.space;
    }
  }

  if (opts.footer) {
    const pages = doc.getPages();
    pages.forEach((p, i) => {
      const text = sanitize(`${opts.footer} · Halaman ${i + 1} dari ${pages.length}`);
      p.drawText(text, { x: MARGIN, y: MARGIN - 24, size: 8, font: regular, color: muted });
    });
  }
  return doc.save();
}
