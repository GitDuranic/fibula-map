// Building a Talk step's dialog (slice 13f-1): a wider window next to the quest panel, with the NPC's conversation
// from its script (13a). It starts at what you can say first; clicking a word adds that line (with the NPC's answer,
// what happens and its conditions) to the dialog and moves on to what you can say next, or back to the start when
// the line has no follow-ups. Lines can be removed, and a line typed by hand added (for things not in the script).
// The dialog is a copy of the lines: it stays as it was checked when the scripts change.
// line: { say, reply?, fx?: [text], cond?: [text], alts?: [alt], free?: true }
// alt (13g, "if it goes wrong"): what else can happen at that point: the same words with other conditions
// { cond, reply, fx }, or the NPC's answer to anything else you say there { other: true, reply, fx }.

// The other outcomes when you say words w at a point of the conversation (entries: that level), chosen: the entry
// the dialog follows.
function altsFor(entries, chosen, w) {
  const said = sayText(w);
  return entries
    .filter((o) => o !== chosen && (o.k ? o.k.some((ow) => sayText(ow) === said) : !o.s))
    .map((o) => ({ ...(o.k ? {} : { other: true }), ...(o.c?.length ? { cond: o.c } : {}), ...(o.r ? { reply: o.r } : {}), ...(o.x?.length ? { fx: o.x } : {}) }))
    .filter((a) => a.reply || a.fx);
}

// The muted "if it goes wrong" lines under a dialog line (13g).
export function Alts({ alts, npcName }) {
  if (!alts?.length) return null;
  return (
    <div className="tm-dialog-alts">
      {alts.map((a, i) => (
        <div key={i}>
          <span className="tm-dialog-alt-when">{a.other ? 'If you say anything else' : `If ${(a.cond || ['other conditions']).join(', ')}`}:</span>
          {a.reply && <> {npcName}: {a.reply}</>}
          {a.fx && <span className="tm-dialog-alt-fx"> ({a.fx.join(', ')})</span>}
        </div>
      ))}
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { sayText, has } from './NpcTalk.jsx';

// npc: the NPC ({ n, t }); lines: the dialog so far; onDone(lines): keep these (the step form saves them);
// onClose(): leave without keeping.
export default function DialogBuilder({ world, npc, lines: start, onDone, onClose }) {
  const [talk, setTalk] = useState(null);
  const [failed, setFailed] = useState(false);
  const [lines, setLines] = useState(start);
  const [level, setLevel] = useState(null); // the entries you can say now (null: the start)
  const [q, setQ] = useState('');
  const [free, setFree] = useState('');
  useEffect(() => {
    let live = true;
    if (!npc?.t) { setFailed(true); return undefined; }
    world.talk(npc.t).then((t) => live && setTalk(t), () => live && setFailed(true));
    return () => { live = false; };
  }, [world, npc]);

  const here = level || talk || [];
  const query = q.trim().toLowerCase();
  const shown = here.filter((e) => e.k && (!query || has(e, query))); // "anything else" lines can't be said
  const add = (e, j) => {
    const cond = [...(e.c || []), ...(e.kc?.[j] || [])];
    const alts = altsFor(here, e, e.k[j]);
    setLines([...lines, { say: sayText(e.k[j]), ...(e.r ? { reply: e.r } : {}), ...(e.x?.length ? { fx: e.x } : {}), ...(cond.length ? { cond } : {}), ...(alts.length ? { alts } : {}) }]);
    setLevel(e.n?.length ? e.n : null);
    setQ('');
  };
  const addFree = () => {
    const t = free.trim();
    if (!t) return;
    setLines([...lines, { say: t, free: true }]);
    setFree('');
  };
  return (
    <div className="tm-panel tm-window tm-dialog-build" onClick={(e) => e.stopPropagation()}>
      <div className="tm-window-title">
        <span className="tm-window-name">Dialog with {npc?.n || 'the NPC'}</span>
        <button type="button" className="tm-close" onClick={onClose} title="Close without keeping" aria-label="Close">×</button>
      </div>
      <div className="tm-window-body tm-dialog-cols">
        <div className="tm-dialog-pick">
          <div className="tm-section-title">{level ? 'You can say next' : 'You can say'}</div>
          {level && <button type="button" className="tm-link" onClick={() => setLevel(null)}>◂ back to the start</button>}
          <input className="tm-input tm-talk-filter" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a word" spellCheck={false} />
          {failed && <div className="tm-talk-cond">No conversation for this NPC.</div>}
          {!talk && !failed && <div className="tm-talk-cond">Loading...</div>}
          {shown.map((e, i) => (
            <div className="tm-dialog-opt" key={i}>
              <div>
                {e.k.map((w, j) => (
                  <React.Fragment key={j}>
                    {j > 0 && <span className="tm-talk-or"> / </span>}
                    <button type="button" className="tm-say" onClick={() => add(e, j)} title="Add this line to the dialog">{sayText(w)}</button>
                    {e.kc?.[j]?.length > 0 && <span className="tm-talk-cond"> ({e.kc[j].join(', ')})</span>}
                  </React.Fragment>
                ))}
                {e.s === 'greet' && <span className="tm-talk-cond"> (greeting)</span>}
                {e.c && <span className="tm-talk-cond"> ({e.c.join(', ')})</span>}
                {e.n?.length > 0 && <span className="tm-talk-cond"> ▸</span>}
              </div>
              {e.r && <div className="tm-talk-reply tm-dialog-preview">{e.r}</div>}
            </div>
          ))}
          {talk && !shown.length && <div className="tm-talk-cond">Nothing to say here.</div>}
        </div>
        <div className="tm-dialog-lines">
          <div className="tm-section-title">The dialog ({lines.length})</div>
          {!lines.length && <div className="tm-muted">Click what you say on the left, in order.</div>}
          <ol className="tm-dialog-list">
            {lines.map((l, i) => (
              <li key={i}>
                <span className="tm-say">{l.say}</span>{l.free && <span className="tm-talk-cond"> (typed)</span>}
                <button type="button" className="tm-close tm-quest-remove" onClick={() => setLines(lines.filter((_, k) => k !== i))} title="Remove this line" aria-label="Remove this line">×</button>
                {l.cond && <div className="tm-talk-cond">{l.cond.join(', ')}</div>}
                {l.reply && <div className="tm-talk-reply">{l.reply}</div>}
                {l.fx && <div className="tm-talk-fx">{l.fx.join(', ')}</div>}
                <Alts alts={l.alts} npcName={npc?.n || 'NPC'} />
              </li>
            ))}
          </ol>
          <form className="tm-dialog-free" onSubmit={(e) => { e.preventDefault(); addFree(); }}>
            <input className="tm-input" value={free} onChange={(e) => setFree(e.target.value)} placeholder="Type a line yourself" maxLength={200} spellCheck={false} />
            <button type="submit" className="tm-btn" disabled={!free.trim()}>Add</button>
          </form>
          <div className="tm-quest-edit-buttons">
            <button type="button" className="tm-btn" onClick={() => onDone(lines)}>Done</button>
            <button type="button" className="tm-btn" onClick={onClose}>Cancel</button>
          </div>
          <div className="tm-muted">Done keeps the dialog in the step's form; Save there stores it.</div>
        </div>
      </div>
    </div>
  );
}

// The dialog window for players (slice 13f-2): a Talk step's dialog next to the quest panel, as the full
// conversation (your lines, the NPC's answers, what happens and the conditions) or only your lines. Clicking a line
// copies it and marks it green (the same marks as on the step's card); clicking a green line unmarks it.
// lines: the step's dialog; copied: the marked line indexes; onCopy(index): copy / unmark; full / onFull: the mode.
export function DialogView({ npcName, lines, copied, onCopy, full, onFull, onClose }) {
  return (
    <div className="tm-panel tm-window tm-dialog-build tm-dialog-view" onClick={(e) => e.stopPropagation()}>
      <div className="tm-window-title">
        <span className="tm-window-name">Dialog with {npcName}</span>
        <button type="button" className="tm-close" onClick={onClose} title="Close" aria-label="Close">×</button>
      </div>
      <div className="tm-window-body">
        <div className="tm-route-choice" role="tablist">
          <button type="button" role="tab" aria-selected={full} className={full ? 'tm-btn tm-pressed' : 'tm-btn'} onClick={() => onFull(true)}>Full conversation</button>
          <button type="button" role="tab" aria-selected={!full} className={!full ? 'tm-btn tm-pressed' : 'tm-btn'} onClick={() => onFull(false)}>Only my lines</button>
        </div>
        <div className="tm-muted">Click a line to copy it (it turns green); click it again to unmark it.</div>
        <ol className={`tm-dialog-list tm-dialog-read${full ? '' : ' tm-dialog-mine'}`}>
          {lines.map((l, i) => (
            <li key={i}>
              <button type="button" className={`tm-say${copied.includes(i) ? ' tm-copied' : ''}`} onClick={() => onCopy(i)} title={copied.includes(i) ? 'Unmark' : 'Copy'}>{l.say}</button>
              {full && l.cond && <div className="tm-talk-cond">only {l.cond.join(', ')}</div>}
              {full && l.reply && <div className="tm-talk-reply"><b>{npcName}:</b> {l.reply}</div>}
              {full && l.fx && <div className="tm-talk-fx">{l.fx.join(', ')}</div>}
              {full && <Alts alts={l.alts} npcName={npcName} />}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
