// The quest checklist (slice 12, development only): the user's Project Fibula quests, to go through one by one.
// A row: the list's ✅/⬜, the name, how many spots are on the map, and a tick once checked (area and reward in its
// tooltip: the side panel is narrow).
// Clicking a row goes to the quest's first spot and opens its window.
import React, { useState } from 'react';

const FILTERS = {
  todo: ['Not checked', (q) => q.onList && !q.checked],
  nospot: ['No spot on the map', (q) => q.onList && !q.chests.length],
  done: ['Checked', (q) => q.onList && q.checked],
  all: ['All on the list', (q) => q.onList],
  extra: ['Not on the list', (q) => !q.onList],
};

export default function QuestList({ world, selected, onPick, onClose }) {
  const [filter, setFilter] = useState('todo');
  const quests = world.quests || [];
  const onList = quests.filter((q) => q.onList);
  const shown = quests.filter(FILTERS[filter][1]);
  return (
    <div className="tm-panel tm-window tm-quest-list">
      <div className="tm-window-title">
        <span className="tm-window-name">Quests</span>
        <button type="button" className="tm-close" onClick={onClose} title="Close" aria-label="Close">×</button>
      </div>
      <div className="tm-window-body">
        <div className="tm-muted">{onList.filter((q) => q.checked).length} of {onList.length} checked</div>
        <select className="tm-input tm-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {Object.entries(FILTERS).map(([k, [label, f]]) => <option key={k} value={k}>{label} ({quests.filter(f).length})</option>)}
        </select>
        <div className="tm-quest-rows">
          {shown.map((q) => (
            <button
              type="button" key={q.n} className={q === selected ? 'tm-result tm-quest-row tm-active' : 'tm-result tm-quest-row'}
              onClick={() => onPick(q)} title={`${q.n}${q.area ? ` (${q.area})` : ''}: ${q.reward || q.wiki}`}
            >
              <span className="tm-quest-mark">{q.onList ? (q.mark ? '✅' : '⬜') : ''}</span>
              <span className="tm-offer-name">{q.n.replace(/ Quest$/, '')}</span>
              <span className="tm-result-kind" title="Spots on the map">{q.chests.length || '–'}</span>
              <span className="tm-quest-done">{q.checked ? '✓' : ''}</span>
            </button>
          ))}
          {!shown.length && <div className="tm-muted">None.</div>}
        </div>
      </div>
    </div>
  );
}
