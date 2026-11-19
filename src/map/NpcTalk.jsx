// An NPC's conversation (slice 13a, reworked 2026-11-19): a window that comes out of the NPC on the map (placed by
// TibiaMap's draw, which moves it along when the map pans), with the NPC's script as a tree that stays folded until
// you choose: click something you can say to see the answer and what you can say next. Opening one line folds the
// others on its level, so one path shows at a time. Clicking a word also copies it, ready to paste in the game.
// Entries: see tools/lib/talk.js.
import React, { useEffect, useState } from 'react';

const sayText = (words) => words.map((w) => (w === '#' ? '<number>' : w)).join(' ');

// Does the text appear below an entry's own words (in its reply, what happens, or anything said after it)?
const below = (e, q) => (e.r || '').toLowerCase().includes(q) || (e.x || []).some((x) => x.includes(q))
  || (e.n || []).some((n) => has(n, q));
// ... or anywhere in it, its words included?
const has = (e, q) => (e.k || []).some((w) => sayText(w).includes(q)) || below(e, q);

function copyText(text, done) {
  navigator.clipboard?.writeText(text).then(done, () => {});
}

// One level of the tree. q: the filter text (lower case): entries that hold it open by themselves.
function TalkLevel({ entries, q }) {
  const [open, setOpen] = useState(null);
  const [copied, setCopied] = useState(null); // "entry:way" just copied
  return entries.map((e, i) => {
    const isOpen = q ? below(e, q) || open === i : open === i;
    const toggle = () => setOpen(open === i ? null : i);
    const say = (w, j) => {
      setOpen(i);
      copyText(sayText(w), () => { setCopied(`${i}:${j}`); setTimeout(() => setCopied((c) => (c === `${i}:${j}` ? null : c)), 900); });
    };
    return (
      <div className={`tm-talk-entry${isOpen ? ' tm-talk-open' : ''}`} key={i}>
        <div className="tm-talk-line">
          <button type="button" className="tm-talk-fold" onClick={toggle} aria-expanded={isOpen} title={isOpen ? 'Fold' : 'Show the answer'}>
            {isOpen ? '▾' : '▸'}
          </button>
          <span className="tm-talk-says">
            {e.k ? e.k.map((w, j) => (
              <React.Fragment key={j}>
                {j > 0 && <span className="tm-talk-or"> / </span>}
                <button
                  type="button" className={`tm-say${copied === `${i}:${j}` ? ' tm-copied' : ''}`}
                  onClick={() => say(w, j)} title={`Say "${sayText(w)}" (copies it)`}
                >{sayText(w)}</button>
                {e.kc?.[j]?.length > 0 && <span className="tm-talk-cond"> ({e.kc[j].join(', ')})</span>}
              </React.Fragment>
            )) : (
              <button type="button" className="tm-talk-else" onClick={toggle}>
                {e.s === 'vanish' ? 'when you walk away' : 'anything else'}
              </button>
            )}
            {e.s === 'greet' && <span className="tm-talk-cond"> (greeting)</span>}
            {e.c && <span className="tm-talk-cond"> ({e.c.join(', ')})</span>}
          </span>
        </div>
        {isOpen && (
          <div className="tm-talk-more">
            {e.r && <div className="tm-talk-reply">{e.r}</div>}
            {e.x && <div className="tm-talk-fx">{e.x.join(', ')}</div>}
            {e.n && <div className="tm-talk-next"><TalkLevel entries={e.n} q={q} /></div>}
          </div>
        )}
      </div>
    );
  });
}

// The window. elRef: the outer element, positioned by the map next to the NPC; zoom: client pixels to CSS pixels
// (as the side panel), on the inner window so the position stays in CSS pixels.
export default function NpcTalk({ world, npc, elRef, zoom, onResize, onClose }) {
  const [talk, setTalk] = useState(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => {
    let live = true;
    setTalk(null); setFailed(false); setQ('');
    world.talk(npc.t).then((t) => live && setTalk(t), () => live && setFailed(true));
    return () => { live = false; };
  }, [world, npc.t]);
  // Its size changes when the script loads or a line opens: the map places it again (it may need to move to stay
  // inside the map).
  useEffect(() => {
    const el = elRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => onResize?.());
    ro.observe(el);
    return () => ro.disconnect();
  }, [elRef, onResize]);
  const query = q.trim().toLowerCase();
  const shown = talk && (query ? talk.filter((e) => has(e, query)) : talk);
  return (
    <div className="tm-talk-at" ref={elRef}>
      <div className="tm-panel tm-window tm-talk-window" style={{ zoom }}>
        <div className="tm-window-title">
          <span className="tm-window-name">{npc.n}</span>
          <button type="button" className="tm-close" onClick={onClose} title="Close" aria-label="Close">×</button>
        </div>
        <div className="tm-window-body">
          <input className="tm-input tm-talk-filter" value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Find a word" spellCheck={false} />
          {failed && <div className="tm-talk-cond">Could not load the conversation.</div>}
          {!talk && !failed && <div className="tm-talk-cond">Loading...</div>}
          {shown && <TalkLevel key={`${npc.t}|${query}`} entries={shown} q={query} />}
          {shown && !shown.length && <div className="tm-talk-cond">Nothing found.</div>}
        </div>
      </div>
    </div>
  );
}
