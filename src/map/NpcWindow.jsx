// The NPC window in the side panel: what an NPC sells, buys and where it travels to.
import React, { useEffect, useRef } from 'react';

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

// onTalk: opens the NPC's conversation next to it on the map (NpcTalk.jsx), for NPCs that have one (npc.t).
export default function NpcWindow({ world, npc, onClose, onTravel, onRoute, onTalk }) {
  const [x, y, z] = npc.p;
  const nothing = !npc.sells.length && !npc.buys.length && !npc.travel.length;
  return (
    <div className="tm-panel tm-window">
      <div className="tm-window-title">
        <span className="tm-window-name">{npc.n}</span>
        <button type="button" className="tm-close" onClick={onClose} title="Close" aria-label="Close">×</button>
      </div>
      <div className="tm-window-body">
        <div className="tm-npc-pos">{x}, {y}, {z}</div>
        <div className="tm-npc-acts">
          <button type="button" className="tm-btn" onClick={onRoute} title="Find the way to this NPC">Route here</button>
          {npc.t && <button type="button" className="tm-btn" onClick={onTalk} title="What you can say to this NPC and what it answers">Conversation</button>}
        </div>
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
      </div>
    </div>
  );
}
