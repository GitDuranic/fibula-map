// The NPC window in the side panel: what an NPC sells, buys and where it travels to, or its conversation.
import React, { useEffect, useRef, useState } from 'react';

// An item as a 32x32 icon in a client-style slot. count: stack size or fluid type.
export function ItemIcon({ world, id, count }) {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 32, 32);
    world.drawIcon(ctx, id, count);
  }, [world, id, count]);
  return <canvas ref={ref} className="tm-icon" width={32} height={32} />;
}

function Offers({ world, title, offers }) {
  const rows = offers
    .map(([id, price, fluid]) => ({ id, price, fluid, name: world.itemName(id, fluid) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="tm-section">
      <div className="tm-section-title">{title}</div>
      {rows.map((r) => (
        <div className="tm-offer" key={`${r.id}:${r.fluid}`} title={r.name}>
          <div className="tm-slot"><ItemIcon world={world} id={r.id} count={r.fluid ?? 1} /></div>
          <span className="tm-offer-name">{r.name}</span>
          <span className="tm-offer-price">{r.price} gp</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Conversation (slice 13a): what you can say, from the NPC's script ----------
const sayText = (words) => words.map((w) => (w === '#' ? '<number>' : w)).join(' ');

// Something you can say: a button that copies it.
function Say({ words, cond }) {
  const [copied, setCopied] = useState(false);
  const text = sayText(words);
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    }, () => {});
  };
  return (
    <span className="tm-say-wrap">
      <button type="button" className={`tm-say${copied ? ' tm-copied' : ''}`} onClick={copy} title={`Copy "${text}"`}>
        {copied ? 'copied' : text}
      </button>
      {cond?.length > 0 && <span className="tm-talk-cond"> ({cond.join(', ')})</span>}
    </span>
  );
}

function TalkEntry({ e }) {
  return (
    <div className="tm-talk-entry">
      <div className="tm-talk-says">
        {e.k ? e.k.map((w, i) => <React.Fragment key={i}>{i > 0 && <span className="tm-talk-or"> / </span>}<Say words={w} cond={e.kc?.[i]} /></React.Fragment>)
          : <span className="tm-talk-else">{e.s === 'vanish' ? 'when you walk away' : 'anything else'}</span>}
        {e.s === 'greet' && <span className="tm-talk-cond"> (greeting)</span>}
      </div>
      {e.c && <div className="tm-talk-cond">{e.c.join(', ')}</div>}
      {e.r && <div className="tm-talk-reply">{e.r}</div>}
      {e.x && <div className="tm-talk-fx">{e.x.join(', ')}</div>}
      {e.n && <div className="tm-talk-next">{e.n.map((n, i) => <TalkEntry key={i} e={n} />)}</div>}
    </div>
  );
}

// Does an entry (or anything said after it) contain the filter text?
const entryHas = (e, q) => (e.k || []).some((w) => sayText(w).includes(q)) || (e.r || '').toLowerCase().includes(q)
  || (e.n || []).some((n) => entryHas(n, q));

function Conversation({ world, npc }) {
  const [talk, setTalk] = useState(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => {
    let live = true;
    setTalk(null); setFailed(false);
    world.talk(npc.t).then((t) => live && setTalk(t), () => live && setFailed(true));
    return () => { live = false; };
  }, [world, npc.t]);
  if (failed) return <div className="tm-section">Could not load the conversation.</div>;
  if (!talk) return <div className="tm-section">Loading...</div>;
  const query = q.trim().toLowerCase();
  const shown = query ? talk.filter((e) => entryHas(e, query)) : talk;
  return (
    <div className="tm-section tm-talk">
      <input className="tm-input tm-talk-filter" value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Find a word" />
      {shown.map((e, i) => <TalkEntry key={i} e={e} />)}
      {!shown.length && <div className="tm-talk-cond">Nothing found.</div>}
    </div>
  );
}

let lastView = 'trade'; // the Trade / Conversation choice is kept from NPC to NPC

export default function NpcWindow({ world, npc, onClose, onTravel, onRoute }) {
  const [x, y, z] = npc.p;
  const nothing = !npc.sells.length && !npc.buys.length && !npc.travel.length;
  const [view, setViewState] = useState(lastView);
  const setView = (v) => { lastView = v; setViewState(v); };
  // An NPC without trade opens on its conversation, one without a conversation on trade.
  const talking = npc.t && (view === 'talk' || nothing);
  return (
    <div className="tm-panel tm-window">
      <div className="tm-window-title">
        <span className="tm-window-name">{npc.n}</span>
        <button type="button" className="tm-close" onClick={onClose} title="Close" aria-label="Close">×</button>
      </div>
      <div className="tm-window-body">
        <div className="tm-npc-pos">{x}, {y}, {z}</div>
        <button type="button" className="tm-btn tm-route-here" onClick={onRoute} title="Find the way to this NPC">Route here</button>
        {npc.t && !nothing && (
          <div className="tm-npc-views">
            <button type="button" className={`tm-btn${!talking ? ' tm-pressed' : ''}`} onClick={() => setView('trade')}>Trade</button>
            <button type="button" className={`tm-btn${talking ? ' tm-pressed' : ''}`} onClick={() => setView('talk')}>Conversation</button>
          </div>
        )}
        {talking ? <Conversation world={world} npc={npc} /> : <>
        {npc.sells.length > 0 && <Offers world={world} title="Sells" offers={npc.sells} />}
        {npc.buys.length > 0 && <Offers world={world} title="Buys" offers={npc.buys} />}
        {npc.travel.length > 0 && (
          <div className="tm-section">
            <div className="tm-section-title">Travel</div>
            {npc.travel.map((t) => (
              <button type="button" className="tm-travel" key={t[0]} onClick={() => onTravel(t)} title={`Show ${t[0]} on the map`}>
                <span className="tm-offer-name">{t[0]}</span>
                <span className="tm-offer-price">{t[1] ? `${t[1]} gp` : 'free'}</span>
              </button>
            ))}
          </div>
        )}
        {nothing && <div className="tm-section">Nothing to trade.</div>}
        </>}
      </div>
    </div>
  );
}
