// The quest window in the side panel (slices 10, 12): a quest, its spots on the map and what each spot gives.
// In development (world.questEditable) it's also the quest editor: tick a quest as checked, add, change or remove
// the items of a spot and its object, remove a spot (spots are added by right-clicking the map). Changes are saved
// to tools/data/fibula-quests.json through the dev server.
import React, { useState } from 'react';
import { ItemIcon } from './NpcWindow.jsx';

// An item search field: type a name, pick an item (onPick(id)).
export function ItemPicker({ world, placeholder, onPick }) {
  const [text, setText] = useState('');
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0);
  const pick = (r) => { if (!r) return; setText(''); setResults([]); onPick(r.id); };
  return (
    <div className="tm-route-input tm-quest-picker">
      <input
        className="tm-input" value={text} placeholder={placeholder} spellCheck={false} autoComplete="off"
        onChange={(e) => { setText(e.target.value); setResults(world.searchItems(e.target.value)); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
          else if (e.key === 'Enter') { e.preventDefault(); pick(results[active]); }
          else if (e.key === 'Escape') { setText(''); setResults([]); }
        }}
        onBlur={() => setTimeout(() => setResults([]), 150)}
      />
      {results.length > 0 && (
        <div className="tm-results tm-results-float" role="listbox">
          {results.map((r, i) => (
            <button
              type="button" key={r.id} role="option" aria-selected={i === active}
              className={i === active ? 'tm-result tm-quest-pick tm-active' : 'tm-result tm-quest-pick'}
              onMouseDown={(e) => { e.preventDefault(); pick(r); }} onMouseEnter={() => setActive(i)}
            >
              <div className="tm-slot"><ItemIcon world={world} id={r.id} count={1} /></div>
              <span className="tm-offer-name">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const markText = (q) => (!q.onList ? 'Not on your Fibula list' : q.mark ? '✅ on your list' : '⬜ on your list');

// chest: a spot { p, id, items: [[item id, count, key?]], quest, i }, or { quest, i: null } for a quest without one.
// onEdit(quest, change(raw), select spot index?): saves a change (see TibiaMap editQuest). onGo(spot): go to a spot.
// onQuest: the quest you're on (name) and setOn(name | null) for "I'm on this quest" (slice 13b).
export default function QuestWindow({ world, chest, editable, onEdit, onGo, onItem, onClose, onQuest, setOn }) {
  const q = chest.quest, spot = chest.i == null ? null : q.chests[chest.i];
  const editSpot = (fn) => onEdit(q, (raw) => fn(raw.spots[chest.i]), chest.i);
  const d = q.db; // the quest database's row (13b), if there is one
  const level = d ? d.level : q.level, area = d ? d.area : q.area, version = d?.wiki_version || q.v;
  const info = [level ? `Level ${level}` : null, area || null, version ? `came in ${version}` : null].filter(Boolean).join(' · ');
  const rewards = d ? d.rewards : q.reward, wiki = d ? d.wiki_reward : q.wiki;
  const isOn = onQuest === q.n;
  return (
    <div className="tm-panel tm-window tm-quest">
      <div className="tm-window-title">
        <span className="tm-window-name">{q.n}</span>
        <button type="button" className="tm-close" onClick={onClose} title="Close" aria-label="Close">×</button>
      </div>
      <div className="tm-window-body">
        {editable ? <div className="tm-muted">{markText(q)}{info ? ` · ${info}` : ''}</div> : info && <div className="tm-muted">{info}</div>}
        {d && d.status !== 'checked' && <div className="tm-quest-draft" title="Nobody has gone through this quest's guide yet: it may be wrong">Not checked yet</div>}
        {q.listed && setOn && (
          <button type="button" className={`tm-btn tm-quest-follow${isOn ? ' tm-pressed' : ''}`} onClick={() => setOn(isOn ? null : q.n)}
            title={isOn ? 'Stop following this quest' : 'Keep this quest at the top of the quest list (saved in this browser)'}
          >{isOn ? "I'm on this quest ✓" : "I'm on this quest"}</button>
        )}
        {d?.notes && <div className="tm-quest-notes">{d.notes}</div>}
        {editable && (
          <label className="tm-check" title="You went through this quest on the map and its spots and items are right">
            <input type="checkbox" checked={q.checked} onChange={(e) => onEdit(q, (raw) => { raw.checked = e.target.checked; }, chest.i)} /> Checked
          </label>
        )}
        <div className="tm-section">
          <div className="tm-section-title">Reward</div>
          <div>{rewards || wiki || 'Not known'}</div>
          {rewards && wiki && <div className="tm-muted">TibiaWiki: {wiki}</div>}
        </div>
        <div className="tm-section">
          <div className="tm-section-title">Spots on the map ({q.chests.length})</div>
          {q.chests.length === 0 && <div className="tm-muted">None yet.{editable ? ' Right-click the map: "Add quest spot here".' : ''}</div>}
          <div className="tm-quest-spots">
            {q.chests.map((c, i) => (
              <button
                type="button" key={i} className={i === chest.i ? 'tm-btn tm-pressed' : 'tm-btn'} onClick={() => onGo(i)}
                title={`Go to ${c.p.join(', ')}`}
              >{i + 1}</button>
            ))}
          </div>
        </div>
        {spot && (
          <div className="tm-section">
            <div className="tm-section-title">Spot {chest.i + 1}: {spot.p.join(', ')}</div>
            <div className="tm-offer tm-quest-object" title="The object shown on the map for this spot">
              <div className="tm-slot">{spot.id ? <ItemIcon world={world} id={spot.id} count={1} /> : null}</div>
              <span className="tm-offer-name">{spot.id ? world.itemName(spot.id) : 'No object'}</span>
            </div>
            {editable && <ItemPicker world={world} placeholder="Change the object (chest, crate, body...)" onPick={(id) => editSpot((s) => { s.id = id; })} />}
            <div className="tm-section-title tm-quest-gives">Gives</div>
            {spot.items.length === 0 && <div className="tm-muted">Nothing yet.</div>}
            {spot.items.map(([id, count, key], j) => {
              const name = world.itemName(id);
              return (
                <div className="tm-offer tm-quest-item" key={`${id}:${key || ''}:${j}`}>
                  <button type="button" className="tm-loot tm-quest-item-name" onClick={() => onItem(id)} title={`Who buys ${name}`}>
                    <div className="tm-slot"><ItemIcon world={world} id={id} count={count} /></div>
                    <span className="tm-offer-name">{name}{key ? <span className="tm-town"> (key {key})</span> : null}</span>
                  </button>
                  {editable ? (
                    <>
                      <input
                        className="tm-input tm-quest-count" type="number" min={1} max={10000} value={count} title="How many"
                        onChange={(e) => { const n = Math.max(1, Math.min(10000, parseInt(e.target.value, 10) || 1)); editSpot((s) => { s.items[j][1] = n; }); }}
                      />
                      <button type="button" className="tm-close tm-quest-remove" onClick={() => editSpot((s) => { s.items.splice(j, 1); })} title="Remove this item" aria-label="Remove this item">×</button>
                    </>
                  ) : <span className="tm-offer-price">{count > 1 ? `${count}x` : ''}</span>}
                </div>
              );
            })}
            {editable && <ItemPicker world={world} placeholder="Add an item" onPick={(id) => editSpot((s) => { s.items.push([id, 1]); })} />}
            {editable && (
              <button type="button" className="tm-btn tm-quest-del" onClick={() => onEdit(q, (raw) => { raw.spots.splice(chest.i, 1); }, Math.max(0, chest.i - 1))}>
                Remove this spot
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
