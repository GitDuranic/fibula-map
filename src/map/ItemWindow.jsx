// The item window in the side panel: which NPCs sell an item (cheapest first) and buy it (best price first).
import React from 'react';
import { ItemIcon } from './NpcWindow.jsx';

function Traders({ world, title, rows, onNpc }) {
  return (
    <div className="tm-section">
      <div className="tm-section-title">{title}</div>
      {rows.map(({ npc, price }) => (
        <button type="button" className="tm-travel" key={npc.n + npc.p.join(',')} onClick={() => onNpc(npc)} title={`Show ${npc.n} on the map`}>
          <span className="tm-offer-name">{npc.n}<span className="tm-town">, {world.townOf(npc.p)}</span></span>
          <span className="tm-offer-price">{price} gp</span>
        </button>
      ))}
    </div>
  );
}

export default function ItemWindow({ world, item, onClose, onNpc }) {
  const name = world.itemName(item.id, item.fluid);
  const { sells, buys } = world.traders(item);
  return (
    <div className="tm-panel tm-window">
      <div className="tm-window-title">
        <span className="tm-window-name">{name}</span>
        <button type="button" className="tm-close" onClick={onClose} title="Close" aria-label="Close">×</button>
      </div>
      <div className="tm-window-body">
        <div className="tm-offer">
          <div className="tm-slot"><ItemIcon world={world} id={item.id} count={item.fluid ?? 1} /></div>
          <span className="tm-offer-name">{name}</span>
        </div>
        {sells.length > 0 && <Traders world={world} title="Sold by" rows={sells} onNpc={onNpc} />}
        {buys.length > 0 && <Traders world={world} title="Bought by" rows={buys} onNpc={onNpc} />}
      </div>
    </div>
  );
}
