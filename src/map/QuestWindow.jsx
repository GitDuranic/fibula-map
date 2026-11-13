// The quest window in the side panel (slice 10): a quest chest on the 7.1 map, what's in it for 7.1 according to
// TibiaWiki, and the quest's whole reward as the wiki gives it.
import React from 'react';
import { ItemIcon } from './NpcWindow.jsx';

// chest: { p, id, items: [[item id, count, key?]], quest: { n, v, reward, chests } }.
export default function QuestWindow({ world, chest, onItem, onClose }) {
  const q = chest.quest;
  const [x, y, z] = chest.p;
  return (
    <div className="tm-panel tm-window tm-door">
      <div className="tm-window-title">
        <span className="tm-window-name">{q.n}</span>
        <button type="button" className="tm-close" onClick={onClose} title="Close" aria-label="Close">×</button>
      </div>
      <div className="tm-window-body">
        <div className="tm-muted">{q.v ? `Came in ${q.v}` : 'Version unknown'} · {x}, {y}, {z}{q.chests.length > 1 ? ` · ${q.chests.length} chests` : ''}</div>
        <div className="tm-section">
          <div className="tm-section-title">Found here</div>
          {chest.items.map(([id, count, key]) => {
            const name = world.itemName(id);
            return (
              <button type="button" className="tm-offer tm-loot" key={`${id}:${key || ''}`} onClick={() => onItem(id)} title={`Who buys ${name}`}>
                <div className="tm-slot"><ItemIcon world={world} id={id} count={count} /></div>
                <span className="tm-offer-name">{name}{key ? <span className="tm-town"> (key {key})</span> : null}</span>
                <span className="tm-offer-price">{count > 1 ? `${count}x` : ''}</span>
              </button>
            );
          })}
        </div>
        <div className="tm-section">
          <div className="tm-section-title">Quest reward (TibiaWiki)</div>
          <div>{q.reward}</div>
          <div className="tm-muted">Only the items TibiaWiki gives for this quest are shown.</div>
        </div>
      </div>
    </div>
  );
}
