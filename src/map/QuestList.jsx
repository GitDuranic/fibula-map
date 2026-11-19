// The quest list (slice 13b, was the slice 12 checklist): the quests players can follow, from the quest database
// (or the converted list without one). A search field, the quest you're on at the top, rows with name and level
// (area and rewards in the tooltip: the side panel is narrow). Clicking a row opens the quest (and goes to its
// first spot).
// In development (world.questEditable) the slice 12 checklist filters and columns stay, for checking spots.
import React, { useState } from 'react';

const DEV_FILTERS = {
  all: ['All quests', (q) => q.listed],
  todo: ['Spots not checked', (q) => q.onList && !q.checked],
  nospot: ['No spot on the map', (q) => q.onList && !q.chests.length],
  done: ['Spots checked', (q) => q.onList && q.checked],
  extra: ['Not on the list', (q) => !q.listed],
};

const rewardsOf = (q) => q.db?.rewards ?? (q.reward || q.wiki);
const levelOf = (q) => (q.db ? q.db.level : q.level);
const areaOf = (q) => (q.db ? q.db.area : q.area);
const matches = (q, text) => [q.n, areaOf(q), rewardsOf(q)].some((s) => (s || '').toLowerCase().includes(text));

export default function QuestList({ world, selected, onQuest, onPick, onClose }) {
  const [filter, setFilter] = useState('all');
  const [text, setText] = useState('');
  const dev = !!world.questEditable;
  const quests = world.quests || [];
  const listed = quests.filter((q) => q.listed);
  const t = text.trim().toLowerCase();
  const shown = quests.filter(dev ? DEV_FILTERS[filter][1] : (q) => q.listed).filter((q) => !t || matches(q, t));
  const on = onQuest && quests.find((q) => q.n === onQuest);
  const row = (q, extra = '') => (
    <button
      type="button" key={q.n + extra} className={`tm-result tm-quest-row${q === selected ? ' tm-active' : ''}${extra}`}
      onClick={() => onPick(q)} title={[q.n, areaOf(q), rewardsOf(q)].filter(Boolean).join(' · ')}
    >
      {dev && <span className="tm-quest-mark">{q.onList ? (q.mark ? '✅' : '⬜') : ''}</span>}
      <span className="tm-offer-name">{q.n.replace(/ Quest$/, '')}</span>
      {levelOf(q) ? <span className="tm-result-kind" title="Level needed">{levelOf(q)}</span> : null}
      {dev && <span className="tm-result-kind" title="Spots on the map">{q.chests.length || '–'}</span>}
      {dev && <span className="tm-quest-done">{q.checked ? '✓' : ''}</span>}
    </button>
  );
  return (
    <div className="tm-panel tm-window tm-quest-list">
      <div className="tm-window-title">
        <span className="tm-window-name">Quests</span>
        <button type="button" className="tm-close" onClick={onClose} title="Close" aria-label="Close">×</button>
      </div>
      <div className="tm-window-body">
        {on && (
          <div className="tm-quest-on">
            <div className="tm-muted">You're on</div>
            {row(on, ' tm-quest-on-row')}
          </div>
        )}
        <input className="tm-input tm-quest-search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Find a quest, area or reward" spellCheck={false} />
        {world.questDbError && <div className="tm-muted">Quest database not reachable: showing the built-in list.</div>}
        {dev && (
          <>
            <div className="tm-muted">{quests.filter((q) => q.onList && q.checked).length} of {quests.filter((q) => q.onList).length} spots checked</div>
            <select className="tm-input tm-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
              {Object.entries(DEV_FILTERS).map(([k, [label, f]]) => <option key={k} value={k}>{label} ({quests.filter(f).length})</option>)}
            </select>
          </>
        )}
        {!dev && <div className="tm-muted">{listed.length} quests</div>}
        <div className="tm-quest-rows">
          {shown.map((q) => row(q))}
          {!shown.length && <div className="tm-muted">None.</div>}
        </div>
      </div>
    </div>
  );
}
