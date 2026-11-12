// The route panel in the side panel: From / To fields (using the search) and the route found.
import React, { useState } from 'react';
import { routeTime } from './engine/router.js';

// The character's speed (the client's speed value), from the TVP server (see the design doc, run times):
// base = 70 + (level - 1); haste adds base * 30 / 100, strong haste base * 70 / 100 (whole numbers);
// boots of haste add 20; speed = 2 * (base + extra) + 80.
export function speedOf({ level, haste, boh }) {
  const base = 70 + Math.max(0, (level || 1) - 1);
  const extra = (haste === 'haste' ? Math.floor(base * 30 / 100) : haste === 'strong' ? Math.floor(base * 70 / 100) : 0) + (boh ? 20 : 0);
  return 2 * (base + extra) + 80;
}
// Haste spells (TVP data/scripts/spells/support): how long they last and what they cost.
export const HASTE = { haste: { name: 'Haste', ms: 60000, mana: 60 }, strong: { name: 'Strong haste', ms: 42500, mana: 100 } };

// A place for a route (from a search result): { label, pos: [x, y, z] }, or null for results without a spot.
export function routePoint(r) {
  if (r.kind === 'Position') return { label: r.name, pos: [r.pos.x, r.pos.y, r.pos.z] };
  if (r.kind === 'NPC') return { label: r.npc.n, pos: r.npc.p };
  if (r.place) return { label: r.name, pos: r.place.p };
  return null;
}

function RouteField({ world, label, point, onPick, placeholder }) {
  const [text, setText] = useState(null); // null: show the chosen point's label
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0);
  const value = text ?? point?.label ?? '';
  const search = (t) => {
    setText(t);
    setResults(world.search(t, 20).filter((r) => r.kind !== 'Item').slice(0, 10));
    setActive(0);
  };
  const pick = (r) => {
    const p = r && routePoint(r);
    if (!p) return;
    setText(null);
    setResults([]);
    onPick(p);
  };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(results[active] || world.search(value, 20).find((r) => r.kind !== 'Item')); }
    else if (e.key === 'Escape') { setText(null); setResults([]); }
  };
  return (
    <div className="tm-route-field">
      <span className="tm-route-label">{label}</span>
      <div className="tm-route-input">
        <input
          className="tm-input" value={value} placeholder={placeholder} spellCheck={false} autoComplete="off"
          onChange={(e) => search(e.target.value)} onKeyDown={onKey}
          onBlur={() => setTimeout(() => { setResults([]); setText(null); }, 150)}
        />
        {results.length > 0 && (
          <div className="tm-results tm-results-float" role="listbox">
            {results.map((r, i) => (
              <button
                type="button" key={`${r.kind}:${r.name}:${i}`} role="option" aria-selected={i === active}
                className={i === active ? 'tm-result tm-active' : 'tm-result'}
                onMouseDown={(e) => { e.preventDefault(); pick(r); }} onMouseEnter={() => setActive(i)}
              >
                <span className="tm-offer-name">{r.name}</span>
                <span className="tm-result-kind">{r.kind}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const fmtTime = (ms) => {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
};

export default function RoutePanel({ world, route, char, onChar, onFrom, onTo, onSwap, onClose, onShow }) {
  const r = route.result;
  const speed = speedOf(char);
  const time = r?.path ? routeTime(r.path, speed) : 0;
  const spell = HASTE[char.haste];
  const casts = spell && time ? Math.ceil(time / spell.ms) : 0; // recast the moment it runs out (user's choice)
  const changes = r?.path ? r.path.filter((p) => !['start', 'walk', 'diagonal'].includes(p[3])).length : 0;
  return (
    <div className="tm-panel tm-route">
      <div className="tm-window-title">
        <span className="tm-window-name">Route</span>
        <button type="button" className="tm-close" onClick={onClose} title="Close the route" aria-label="Close the route">×</button>
      </div>
      <div className="tm-route-body">
        <RouteField world={world} label="From" point={route.from} onPick={onFrom} placeholder="Town, NPC or x, y, z" />
        <RouteField world={world} label="To" point={route.to} onPick={onTo} placeholder="Town, NPC or x, y, z" />
        <div className="tm-route-char">
          <label className="tm-route-level">Level
            <input
              className="tm-input" type="number" min={1} max={999} value={char.level}
              onChange={(e) => onChar({ ...char, level: e.target.value === '' ? '' : Math.max(1, Math.min(999, parseInt(e.target.value, 10) || 1)) })}
            />
          </label>
          <select className="tm-input tm-select" value={char.haste} onChange={(e) => onChar({ ...char, haste: e.target.value })} title="Haste spell, recast whenever it runs out">
            <option value="none">No haste</option>
            <option value="haste">Haste</option>
            <option value="strong">Strong haste</option>
          </select>
        </div>
        <label className="tm-check">
          <input type="checkbox" checked={char.boh} onChange={(e) => onChar({ ...char, boh: e.target.checked })} /> Boots of haste
          <span className="tm-speed">speed {speed}</span>
        </label>
        <div className="tm-route-actions">
          <button type="button" className="tm-btn" onClick={onSwap} disabled={!route.from && !route.to} title="Swap start and destination">Swap</button>
          <button type="button" className="tm-btn" onClick={onShow} disabled={!r?.path} title="Show the whole route">Show</button>
        </div>
        <div className="tm-route-result">
          {route.busy && 'Finding the way...'}
          {!route.busy && r?.error && <span className="tm-error">{r.error}</span>}
          {!route.busy && r?.path && (
            <>
              <div>{r.steps} steps{changes ? `, ${changes} floor change${changes > 1 ? 's' : ''}` : ''}</div>
              <div className="tm-route-time">{fmtTime(time)}</div>
              {spell && <div>{spell.name}: {casts} cast{casts > 1 ? 's' : ''}, {casts * spell.mana} mana</div>}
            </>
          )}
          {!route.busy && !r && 'Right-click the map, or fill in both fields.'}
        </div>
      </div>
    </div>
  );
}
