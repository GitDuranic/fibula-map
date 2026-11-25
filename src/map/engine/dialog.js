// Dialog lines from an NPC's conversation (entries: see tools/lib/talk.js). Plain JS so the tools (13j drafts) build
// lines exactly as the Dialog builder does (13f-1, 13g).

export const sayText = (words) => words.map((w) => (w === '#' ? '<number>' : w)).join(' ');

// The other outcomes when you say words w at a point of the conversation (entries: that level), chosen: the entry
// the dialog follows ("if it goes wrong", 13g).
export function altsFor(entries, chosen, w) {
  const said = sayText(w);
  return entries
    .filter((o) => o !== chosen && (o.k ? o.k.some((ow) => sayText(ow) === said) : !o.s))
    .map((o) => {
      // An entry with per-words conditions (kc) keeps the ones of the words said (user 2026-11-25: Kevin's "dress
      // pattern" showed the queen's samples reply as if unconditional; its condition, quest 233 is 6, was in kc).
      const j = o.k && o.kc ? o.k.findIndex((ow) => sayText(ow) === said) : -1;
      const cond = [...(o.c || []), ...(j >= 0 ? o.kc[j] : [])];
      return { ...(o.k ? {} : { other: true }), ...(cond.length ? { cond } : {}), ...(o.r ? { reply: o.r } : {}), ...(o.x?.length ? { fx: o.x } : {}) };
    })
    .filter((a) => a.reply || a.fx);
}

// The dialog line for saying entry e's j-th words at a level (here: the entries you can say there).
// line: { say, reply?, fx?: [text], cond?: [text], alts?: [alt] }
export function dialogLine(here, e, j) {
  const cond = [...(e.c || []), ...(e.kc?.[j] || [])];
  const alts = altsFor(here, e, e.k[j]);
  return { say: sayText(e.k[j]), ...(e.r ? { reply: e.r } : {}), ...(e.x?.length ? { fx: e.x } : {}), ...(cond.length ? { cond } : {}), ...(alts.length ? { alts } : {}) };
}
