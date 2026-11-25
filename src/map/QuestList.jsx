// The quest list (slice 13b): the quests players can follow, from the quest database (or the converted list
// without one). A search field, rows with a tick when done, name and level (area and rewards in the
// tooltip). Clicking a row opens the quest. (The slice 12 spot checklist was removed in 13i.)
import React, { useState } from 'react';
import { displayName } from './engine/questauth.js';
import { questDoneKey } from './engine/questdb.js';

const rewardsOf = (q) => q.db?.rewards ?? (q.reward || q.wiki);
const levelOf = (q) => (q.db ? q.db.level : q.level);
const areaOf = (q) => (q.db ? q.db.area : q.area);
const matches = (q, text) => [q.n, areaOf(q), rewardsOf(q)].some((s) => (s || '').toLowerCase().includes(text));

// login (13c): null without the quest database, else { user, editor }: a small line at the bottom to log in with
// Discord (only the two editors can edit; anyone else who logs in is told so).
// done: the Set of quest keys ticked Done (user 2026-11-24): a green tick before the name (user 2026-11-25: kept;
// the client checkbox is only for the steps list and settings).
export default function QuestList({ world, selected, done, onPick, onClose, login, onLogIn, onLogOut }) {
  const [text, setText] = useState('');
  const quests = world.quests || [];
  const listed = quests.filter((q) => q.listed);
  const t = text.trim().toLowerCase();
  const shown = listed.filter((q) => !t || matches(q, t));
  const row = (q) => (
    <button
      type="button" key={q.n} className={`tm-result tm-quest-row${q === selected ? ' tm-active' : ''}`}
      onClick={() => onPick(q)} title={[q.n, areaOf(q), rewardsOf(q)].filter(Boolean).join(' · ')}
    >
      <span className="tm-quest-tick">{done?.has(questDoneKey(q)) ? '✓' : ''}</span>
      <span className="tm-offer-name">{q.n.replace(/ Quest$/, '')}</span>
      {levelOf(q) ? <span className="tm-result-kind" title="Level needed">{levelOf(q)}</span> : null}
    </button>
  );
  return (
    <div className="tm-panel tm-window tm-quest-list">
      <div className="tm-window-title">
        <span className="tm-window-name">Quests</span>
        <button type="button" className="tm-close" onClick={onClose} title="Fold the quest panel in" aria-label="Fold in">‹</button>
      </div>
      <div className="tm-window-body">
        <input className="tm-input tm-quest-search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Find a quest, area or reward" spellCheck={false} />
        {world.questDbError && <div className="tm-muted">Quest database not reachable: showing the built-in list.</div>}
        <div className="tm-muted">{listed.length} quests</div>
        <div className="tm-quest-rows">
          {shown.map((q) => row(q))}
          {!shown.length && <div className="tm-muted">None.</div>}
        </div>
        {login && (
          <div className="tm-quest-login tm-muted">
            {login.user ? (
              <>
                <span title={login.editor ? 'You can edit quests' : 'Only the quest editors can change quests'}>
                  {displayName(login.user)}{login.editor ? ' · editor' : ' · not an editor'}
                </span>
                <button type="button" className="tm-link" onClick={onLogOut}>Log out</button>
              </>
            ) : <button type="button" className="tm-link" onClick={onLogIn} title="For the quest editors: log in with Discord">Editor login</button>}
          </div>
        )}
      </div>
    </div>
  );
}
