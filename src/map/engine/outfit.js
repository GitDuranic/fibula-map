// The client's outfit colours (shared by the converter, tools/lib/npcs.js, and the map: players in houses, slice 17b).
// The client's 133-colour HSI palette: colour number -> [r, g, b].
export function outfitColor(color) {
  const H = 19, SI = 7;
  if (color >= H * SI) color = 0;
  let h = 0, s = 0, i;
  if (color % H !== 0) {
    h = (color % H) / 18;
    [s, i] = [[0.25, 1], [0.25, 0.75], [0.5, 0.75], [0.667, 0.75], [1, 1], [1, 0.75], [1, 0.5]][Math.floor(color / H)];
  } else {
    i = 1 - color / H / SI;
  }
  if (i === 0) return [0, 0, 0];
  if (s === 0) return [i * 255, i * 255, i * 255].map(Math.round);
  let r, g, b;
  if (h < 1 / 6) { r = i; b = i * (1 - s); g = b + (i - b) * 6 * h; }
  else if (h < 2 / 6) { g = i; b = i * (1 - s); r = g - (i - b) * (6 * h - 1); }
  else if (h < 3 / 6) { g = i; r = i * (1 - s); b = r + (i - r) * (6 * h - 2); }
  else if (h < 4 / 6) { b = i; r = i * (1 - s); g = b - (i - r) * (6 * h - 3); }
  else if (h < 5 / 6) { b = i; g = i * (1 - s); r = g + (i - g) * (6 * h - 4); }
  else { r = i; g = i * (1 - s); b = r - (i - g) * (6 * h - 5); }
  return [r * 255, g * 255, b * 255].map(Math.round);
}


// Colours a player outfit (slice 17b): base and mask are ImageData of the same size (the plain sprite and its colour
// mask: yellow head, red body, green legs, blue feet). colors: [head, body, legs, feet] colour numbers. As the
// client: a masked pixel is the plain pixel times the colour. Returns new ImageData.
export function colourOutfit(base, mask, colors) {
  const [head, body, legs, feet] = colors.map(outfitColor);
  const out = new ImageData(base.width, base.height), b = base.data, m = mask.data, o = out.data;
  for (let p = 0; p < b.length; p += 4) {
    if (!b[p + 3]) continue;
    let c = null;
    if (m[p + 3]) {
      const r = m[p], g = m[p + 1], bl = m[p + 2];
      if (r && g && !bl) c = head; else if (r && !g && !bl) c = body; else if (!r && g && !bl) c = legs; else if (!r && !g && bl) c = feet;
    }
    for (let k = 0; k < 3; k++) o[p + k] = c ? Math.round(b[p + k] * c[k] / 255) : b[p + k];
    o[p + 3] = 255;
  }
  return out;
}
