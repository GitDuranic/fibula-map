// The monster window in the side panel: a monster's health, experience and loot, and, for a spawn with more than
// one kind of monster, every kind in it and all the loot you can get there. No drop chances: none are known for 7.1.
import React, { useEffect, useRef } from 'react';
import { ItemIcon } from './NpcWindow.jsx';

// A monster's outfit, fitted into a 32x32 slot (big monsters scaled down), like an item icon.
export function MonsterIcon({ world, kind }) {
  const ref = useRef(null);
  const img = world.monKinds[kind]?.img;
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 32, 32);
    if (!img || !world.monSheet) return;
    const sc = Math.min(1, 32 / Math.max(img[2], img[3]));
    const w = img[2] * sc, h = img[3] * sc;
    ctx.imageSmoothingEnabled = sc < 1;
    ctx.drawImage(world.monSheet, img[0], img[1], img[2], img[3], 32 - w, 32 - h, w, h);
  }, [world, img]);
  return <canvas ref={ref} className="tm-icon" width={32} height={32} />;
}

const countText = (n) => (n > 1 ? `up to ${n}` : '');

// Loot rows: icon, name, max count; `who` (optional): which monsters drop it. Click: the item window.
function Loot({ world, rows, onItem }) {
  if (!rows.length) return <div className="tm-muted">No loot.</div>;
  return rows.map((r) => (
    <button type="button" className="tm-offer tm-loot" key={r.id} onClick={() => onItem(r.id)} title={`Who buys ${r.name}`}>
      <div className="tm-slot"><ItemIcon world={world} id={r.id} count={1} /></div>
      <span className="tm-offer-name">{r.name}{r.who && <span className="tm-town"> ({r.who})</span>}</span>
      <span className="tm-offer-price">{countText(r.count)}</span>
    </button>
  ));
}

// sel: { kind (or 'all' for the whole spawn), group }.
export default function MonsterWindow({ world, sel, onPick, onItem, onClose }) {
  const group = world.spawnGroups.get(sel.group);
  const kinds = group ? [...group.kinds].sort((a, b) => b[1] - a[1]) : [[sel.kind, 1]];
  const mixed = kinds.length > 1;
  const all = sel.kind === 'all';
  const mon = all ? null : world.monKinds[sel.kind];
  let rows;
  if (all) {
    // Every item any monster here drops: the highest max count, and who drops it.
    const items = new Map();
    for (const [k] of kinds) {
      for (const [id, count] of world.monKinds[k].loot) {
        const it = items.get(id) || { id, name: world.itemName(id), count: 0, who: [] };
        it.count = Math.max(it.count, count);
        it.who.push(world.monKinds[k].n.toLowerCase());
        items.set(id, it);
      }
    }
    rows = [...items.values()].map((it) => ({ ...it, who: it.who.join(', ') }));
  } else {
    rows = mon.loot.map(([id, count]) => ({ id, name: world.itemName(id), count }));
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="tm-panel tm-window">
      <div className="tm-window-title">
        <span className="tm-window-name">{all ? 'Spawn' : mon.n}</span>
        <button type="button" className="tm-close" onClick={onClose} title="Close" aria-label="Close">×</button>
      </div>
      <div className="tm-window-body">
        {mixed && (
          <div className="tm-section">
            <div className="tm-section-title">In this spawn</div>
            {kinds.map(([k, n]) => (
              <button type="button" key={k} className={k === sel.kind ? 'tm-offer tm-loot tm-active' : 'tm-offer tm-loot'} onClick={() => onPick(k)}>
                <div className="tm-slot"><MonsterIcon world={world} kind={k} /></div>
                <span className="tm-offer-name">{world.monKinds[k].n}</span>
                <span className="tm-offer-price">{n}x</span>
              </button>
            ))}
            <button type="button" className={all ? 'tm-offer tm-loot tm-active' : 'tm-offer tm-loot'} onClick={() => onPick('all')}>
              <span className="tm-offer-name">All loot in this spawn</span>
            </button>
          </div>
        )}
        {!all && (
          <div className="tm-offer">
            <div className="tm-slot"><MonsterIcon world={world} kind={sel.kind} /></div>
            <span className="tm-offer-name">{mon.hp} HP, {mon.xp} XP{!mixed && kinds[0][1] > 1 ? ` (${kinds[0][1]} here)` : ''}</span>
          </div>
        )}
        <div className="tm-section">
          <div className="tm-section-title">Loot</div>
          <Loot world={world} rows={rows} onItem={onItem} />
          <div className="tm-muted">No drop chances: none are known for 7.1.</div>
        </div>
      </div>
    </div>
  );
}
