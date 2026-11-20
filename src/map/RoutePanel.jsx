// The route panel in the side panel: From / To fields (using the search) and the route found.
import React, { useState } from 'react';
import { routeTime, routeLegs, LEVITATE_MANA, CLIMB_SPELL, CLIMB_PARCELS } from './engine/router.js';

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

// What the character may climb and drop with (the router's "climb" option): exani hur and/or 3 parcels.
export const climbOf = (c) => (c.levitate ? CLIMB_SPELL : 0) | (c.parcels ? CLIMB_PARCELS : 0);

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

export const fmtTime = (ms) => {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const gp = (n) => (n ? `${n} gp` : 'free');

// One leg of the route: a walk, or a passage with an NPC.
function legText(l) {
  if (l.kind === 'npc') return <><b>{l.npc}</b>: to {l.dest}, {gp(l.price)}</>;
  const extra = [l.floors && plural(l.floors, 'floor change'), l.teleports && plural(l.teleports, 'forcefield'),
    l.levitate && `${l.levitate}× exani hur`, l.parcels && `${l.parcels}× parcels`].filter(Boolean);
  return <>Walk {plural(l.steps, 'step')}{extra.length ? `, ${extra.join(', ')}` : ''} ({fmtTime(l.time)})</>;
}

export default function RoutePanel({ world, route, char, onChar, onFrom, onTo, onSwap, onClose, onShow, onPick, doorsAll, onDoorsAll }) {
  const routes = route.result?.routes || [];
  const r = routes[route.pick] || routes[0];
  const speed = speedOf(char);
  const time = r ? routeTime(r.path, speed) : 0;
  const spell = HASTE[char.haste];
  const casts = spell && time ? Math.ceil(time / spell.ms) : 0; // recast the moment it runs out (user's choice)
  const legs = r ? routeLegs(r.path, speed) : [];
  const levitates = r ? r.path.filter((e) => e[3] === 'levitate').length : 0;
  const parcelClimbs = r ? r.path.filter((e) => e[3] === 'parcels').length : 0;
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
        <label className="tm-check" title="Go a floor up or down with exani hur up / exani hur down, 50 mana each">
          <input type="checkbox" checked={!!char.levitate} onChange={(e) => onChar({ ...char, levitate: e.target.checked })} /> Exani hur (levitate)
        </label>
        <label className="tm-check" title="Climb with 3 parcels under you, or drop down onto 3 parcels thrown down first">
          <input type="checkbox" checked={!!char.parcels} onChange={(e) => onChar({ ...char, parcels: e.target.checked })} /> 3 parcels
        </label>
        <label className="tm-check" title="Locked doors block routes; unlock them one by one by clicking them on the map, or all at once here">
          <input type="checkbox" checked={doorsAll} onChange={(e) => onDoorsAll(e.target.checked)} /> Open all locked doors
        </label>
        <div className="tm-route-actions">
          <button type="button" className="tm-btn" onClick={onSwap} disabled={!route.from && !route.to} title="Swap start and destination">Swap</button>
          <button type="button" className="tm-btn" onClick={onShow} disabled={!r} title="Show the whole route">Show</button>
        </div>
        <div className="tm-route-result">
          {route.busy && 'Finding the way...'}
          {!route.busy && route.result?.error && <span className="tm-error">{route.result.error}</span>}
          {!route.busy && route.result?.locked && (
            <div className="tm-route-locked">
              Locked doors are in the way: {route.result.locked.map((d) => (d.key ? `key ${d.key}` : `a door at ${d.p.join(', ')} (key unknown)`)).join(', ')}.
              Unlock them on the map, or tick "Open all locked doors".
            </div>
          )}
          {!route.busy && routes.length > 1 && (
            <div className="tm-route-choice" role="tablist">
              {routes.map((x, i) => (
                <button
                  type="button" key={x.name} role="tab" aria-selected={x === r}
                  className={x === r ? 'tm-btn tm-route-pick tm-pressed' : 'tm-btn tm-route-pick'} onClick={() => onPick(i)}
                >
                  <span>{x.name}</span><span>{fmtTime(routeTime(x.path, speed))}, {gp(x.gold)}</span>
                </button>
              ))}
            </div>
          )}
          {!route.busy && route.cheapBusy && <div className="tm-route-note">Looking for a cheaper way...</div>}
          {!route.busy && r && (
            <>
              <div className="tm-route-time">{fmtTime(time)}{r.gold ? `, ${r.gold} gp` : ''}</div>
              {spell && <div>{spell.name}: {plural(casts, 'cast')}, {casts * spell.mana} mana</div>}
              {levitates > 0 && <div>Exani hur: {plural(levitates, 'cast')}, {levitates * LEVITATE_MANA} mana</div>}
              {parcelClimbs > 0 && <div>Parcels: 3 each time, {3 * parcelClimbs} in all (they stay behind)</div>}
              <ol className="tm-route-legs">
                {legs.map((l, i) => <li key={i} className={l.kind === 'npc' ? 'tm-leg-npc' : undefined}>{legText(l)}</li>)}
              </ol>
            </>
          )}
          {!route.busy && !route.result && 'Right-click the map, or fill in both fields.'}
        </div>
      </div>
    </div>
  );
}
