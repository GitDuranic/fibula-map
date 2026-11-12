// Bitmap text using the client's own fonts (from Tibia.pic).

export function textWidth(font, str) {
  let w = 0;
  for (const ch of str) {
    const c = ch.charCodeAt(0);
    const gw = c >= 32 && c < 256 ? font.widths[c - 32] : 0;
    w += (c === 32 ? Math.max(3, Math.round(font.cellW / 2)) : gw) + 1;
  }
  return Math.max(0, w - 1);
}

export function drawText(ctx, font, str, x, y, color = '#ffffff') {
  const src = font.tint(color);
  let cx = x;
  for (const ch of str) {
    const c = ch.charCodeAt(0);
    if (c < 32 || c > 255) continue;
    const i = c - 32;
    const gw = font.widths[i];
    if (c === 32) { cx += Math.max(3, Math.round(font.cellW / 2)) + 1; continue; }
    ctx.drawImage(src, (i % font.cols) * font.cellW, Math.floor(i / font.cols) * font.cellH, gw, font.cellH, cx, y, gw, font.cellH);
    cx += gw + 1;
  }
  return cx - x;
}

// Word-wraps into lines that fit maxWidth.
export function wrapText(font, str, maxWidth) {
  const lines = [];
  for (const para of str.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (line && textWidth(font, test) > maxWidth) { lines.push(line); line = word; } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

// Centered multi-line text, like the client's in-game messages.
export function drawCenteredLines(ctx, font, lines, cx, y, color) {
  lines.forEach((line, i) => drawText(ctx, font, line, Math.round(cx - textWidth(font, line) / 2), y + i * (font.cellH - 2), color));
}
