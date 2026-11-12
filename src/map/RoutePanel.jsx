// The route panel in the side panel: From / To fields (using the search) and the route found.
import React, { useState } from 'react';

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

export default function RoutePanel({ world, route, onFrom, onTo, onSwap, onClose, onShow }) {
  const r = route.result;
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
              <div>about {fmtTime(r.time)} (level 50, no haste)</div>
            </>
          )}
          {!route.busy && !r && 'Right-click the map, or fill in both fields.'}
        </div>
      </div>
    </div>
  );
}
