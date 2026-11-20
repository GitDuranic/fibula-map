// The guide in the quest window (slice 13d-1): the quest's segments and steps as a list. Players tick steps off
// (the tick moves the guide on; it never moves by itself), go Back a step or start over; their place is kept in
// the browser. Clicking a step goes to its spot. Editors also add, change, reorder (drag) and delete steps, tick
// each one as checked, and add, rename and delete segments.
import React, { useState } from 'react';
import { ItemIcon } from './NpcWindow.jsx';
import { ItemPicker } from './QuestWindow.jsx';
import { KINDS, stepPos, stepTitle, currentIndex } from './engine/questguide.js';

// The editors' form for one step. onSave(changes), onDelete(), onDone().
function StepEdit({ world, step, onSave, onDelete, onDone }) {
  const [f, setF] = useState(() => ({
    kind: step.kind, text: step.text || '', npc: step.npc || '', monster: step.monster || '', items: step.items || [], checked: step.checked,
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const act = async (fn) => {
    setBusy(true); setErr(null);
    try { await fn(); onDone(); } catch (e) { setErr(e.message || String(e)); setBusy(false); }
  };
  const save = () => act(() => onSave({
    kind: f.kind, text: f.text.trim() || null, npc: f.kind === 'talk' ? f.npc.trim() || null : null,
    monster: f.kind === 'kill' ? f.monster.trim() || null : null, items: f.kind === 'get' ? f.items : [], checked: f.checked,
  }));
  return (
    <div className="tm-quest-edit tm-step-edit" onClick={(e) => e.stopPropagation()}>
      <label className="tm-quest-field">Kind
        <select className="tm-input tm-select" value={f.kind} onChange={set('kind')}>
          {Object.entries(KINDS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </label>
      <label className="tm-quest-field">What to do<textarea className="tm-input" rows={2} value={f.text} onChange={set('text')} maxLength={1000} placeholder={stepTitle(world, { ...step, ...f, text: '' })} /></label>
      {f.kind === 'talk' && (
        <label className="tm-quest-field">NPC
          <input className="tm-input" value={f.npc} onChange={set('npc')} list="tm-npc-names" maxLength={40} spellCheck={false} />
        </label>
      )}
      {f.kind === 'kill' && (
        <label className="tm-quest-field">Monster
          <input className="tm-input" value={f.monster} onChange={set('monster')} list="tm-monster-names" maxLength={40} spellCheck={false} />
        </label>
      )}
      {f.kind === 'get' && (
        <div className="tm-quest-field">Items
          {f.items.map(([id, count], j) => (
            <div className="tm-offer tm-quest-item" key={`${id}:${j}`}>
              <div className="tm-slot"><ItemIcon world={world} id={id} count={count} /></div>
              <span className="tm-offer-name">{world.itemName(id)}</span>
              <input
                className="tm-input tm-quest-count" type="number" min={1} max={10000} value={count} title="How many"
                onChange={(e) => { const n = Math.max(1, Math.min(10000, parseInt(e.target.value, 10) || 1)); setF({ ...f, items: f.items.map((it, k) => (k === j ? [it[0], n] : it)) }); }}
              />
              <button type="button" className="tm-close tm-quest-remove" onClick={() => setF({ ...f, items: f.items.filter((_, k) => k !== j) })} title="Remove this item" aria-label="Remove this item">×</button>
            </div>
          ))}
          <ItemPicker world={world} placeholder="Add an item" onPick={(id) => setF({ ...f, items: [...f.items, [id, 1]] })} />
        </div>
      )}
      <div className="tm-muted">
        {step.x != null ? `Spot: ${step.x}, ${step.y}, ${step.z}` : 'No spot on the map'} · right-click the map: "Move step here"
        {step.x != null && <> · <button type="button" className="tm-link" disabled={busy} onClick={() => act(() => onSave({ x: null, y: null, z: null }))}>remove spot</button></>}
      </div>
      <label className="tm-check" title="You went through this step and it's right">
        <input type="checkbox" checked={f.checked} onChange={set('checked')} /> Checked
      </label>
      {err && <div className="tm-quest-error">{err}</div>}
      <div className="tm-quest-edit-buttons">
        <button type="button" className="tm-btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="tm-btn" onClick={onDone} disabled={busy}>Cancel</button>
        <button type="button" className="tm-btn" onClick={() => act(onDelete)} disabled={busy} title="Delete this step">Delete</button>
      </div>
    </div>
  );
}

// guide: from fetchGuide (null while loading); error: why it couldn't load. ed: the editors' actions (null for
// players), each returning a promise: addNote(segId), saveStep(id, changes), deleteStep(id), moveStep(id, segId,
// beforeId), addSegment(), renameSegment(id, name), deleteSegment(id). editStep / setEditStep: the step whose form
// is open (TibiaMap keeps it, for "Move step here"). onGo(pos): go to a spot. at / setAt(step id | 'done' | null):
// where you are in this guide (TibiaMap keeps it in the browser, and the map's markers follow it, 13d-2).
export default function QuestGuide({ world, guide, error, ed, editStep, setEditStep, onGo, at, setAt }) {
  const [open, setOpen] = useState({}); // segment id -> shown (default: the segment you're on; every one for editors)
  const [drag, setDrag] = useState(null); // the step being dragged (id)
  const [renaming, setRenaming] = useState(null); // { id, name }
  const [err, setErr] = useState(null);
  if (error) return <div className="tm-section"><div className="tm-muted">Guide not reachable: {error}</div></div>;
  if (!guide) return <div className="tm-section"><div className="tm-muted">Loading the guide…</div></div>;
  if (guide.missing && !ed) return null; // database step 3 not run yet
  const steps = guide.steps;
  if (!steps.length && !guide.segments.length && !ed) return null;

  const cur = currentIndex(guide, at);
  const go = (i) => { // i: the step you're on now (steps.length: all done)
    const id = i <= 0 ? null : i >= steps.length ? 'done' : steps[i].id;
    setAt(id);
  };
  const curSeg = steps[Math.min(cur, steps.length - 1)]?.segment_id;
  const isOpen = (s) => open[s.id] ?? (!!ed || s.id === curSeg || guide.segments.length === 1);
  const checked = steps.filter((t) => t.checked).length;
  const tryEd = async (fn) => { setErr(null); try { await fn(); } catch (e) { setErr(e.message || String(e)); } };
  const drop = (segId, beforeId) => (e) => {
    e.preventDefault(); e.stopPropagation();
    if (drag != null) tryEd(() => ed.moveStep(drag, segId, beforeId));
    setDrag(null);
  };
  let n = 0;
  return (
    <div className="tm-section tm-guide">
      <div className="tm-section-title">Guide</div>
      {guide.missing && <div className="tm-quest-error">Run database step 3 (0003_map_quest_steps.sql) to add steps.</div>}
      {steps.length > 0 && (
        <div className="tm-muted" title="Steps an editor went through and found right">
          {checked} of {steps.length} steps checked{cur >= steps.length ? ' · all done' : ''}
        </div>
      )}
      {steps.length > 0 && (cur > 0) && (
        <div className="tm-quest-edit-buttons">
          <button type="button" className="tm-btn" onClick={() => go(cur - 1)} title="Go back one step">Back a step</button>
          <button type="button" className="tm-btn" onClick={() => go(0)} title="Untick every step">Start over</button>
        </div>
      )}
      {guide.segments.map((s, si) => {
        const many = guide.segments.length > 1 || ed;
        const shown = isOpen(s);
        return (
          <div key={s.id} className="tm-guide-seg" onDragOver={ed ? (e) => e.preventDefault() : undefined} onDrop={ed ? drop(s.id, null) : undefined}>
            {many && (renaming?.id === s.id ? (
              <form className="tm-guide-rename" onSubmit={(e) => { e.preventDefault(); tryEd(() => ed.renameSegment(s.id, renaming.name.trim())); setRenaming(null); }}>
                <input className="tm-input" autoFocus value={renaming.name} maxLength={60} placeholder={`Part ${si + 1}`}
                  onChange={(e) => setRenaming({ id: s.id, name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Escape') setRenaming(null); }} />
              </form>
            ) : (
              <div className="tm-guide-seg-head">
                <button type="button" className="tm-guide-seg-name" onClick={() => setOpen({ ...open, [s.id]: !shown })}>
                  {shown ? '▾' : '▸'} {s.name || `Part ${si + 1}`} <span className="tm-muted">({s.steps.length})</span>
                </button>
                {ed && <button type="button" className="tm-link" onClick={() => setRenaming({ id: s.id, name: s.name || '' })}>rename</button>}
                {ed && !s.steps.length && <button type="button" className="tm-link" onClick={() => tryEd(() => ed.deleteSegment(s.id))}>delete</button>}
              </div>
            ))}
            {s.steps.map((t) => {
              const i = n++;
              if (!shown) return null;
              const pos = stepPos(world, t), done = i < cur;
              return (
                <div
                  key={t.id} className={`tm-step${i === cur ? ' tm-step-cur' : ''}${done ? ' tm-step-done' : ''}${drag === t.id ? ' tm-step-drag' : ''}`}
                  draggable={!!ed && editStep !== t.id} onDragStart={() => setDrag(t.id)} onDragEnd={() => setDrag(null)}
                  onDragOver={ed ? (e) => e.preventDefault() : undefined} onDrop={ed ? drop(s.id, t.id) : undefined}
                >
                  <div className="tm-step-row">
                    <input type="checkbox" checked={done} onChange={(e) => go(e.target.checked ? i + 1 : i)} title={done ? 'Not done yet' : 'Done: on to the next step'} />
                    <button
                      type="button" className="tm-step-main" onClick={() => pos && onGo(pos)}
                      title={pos ? `Go to ${pos.join(', ')}` : t.source ? `From: ${t.source}` : undefined}
                    >
                      <span className="tm-step-num">{i + 1}.</span>
                      <span className={`tm-step-kind tm-kind-${t.kind}`}>{KINDS[t.kind]}</span>
                      <span className="tm-step-text">{stepTitle(world, t)}</span>
                    </button>
                    {!t.checked && <span className="tm-step-unchecked" title="Not checked yet: may be wrong">•</span>}
                    {ed && editStep !== t.id && <button type="button" className="tm-link" onClick={() => setEditStep(t.id)} title="Change this step">edit</button>}
                  </div>
                  {t.kind === 'get' && t.items.length > 0 && t.text && (
                    <div className="tm-step-items">
                      {t.items.map(([id, c], j) => <div className="tm-slot" key={j} title={world.itemName(id)}><ItemIcon world={world} id={id} count={c} /></div>)}
                    </div>
                  )}
                  {ed && editStep === t.id && (
                    <StepEdit world={world} step={t} onSave={(c) => ed.saveStep(t.id, c)} onDelete={() => ed.deleteStep(t.id)} onDone={() => setEditStep(null)} />
                  )}
                </div>
              );
            })}
            {shown && !s.steps.length && <div className="tm-muted">No steps yet.</div>}
          </div>
        );
      })}
      {err && <div className="tm-quest-error">{err}</div>}
      {ed && !guide.missing && (
        <>
          <datalist id="tm-npc-names">{(world.npcs || []).map((m) => <option key={m.n} value={m.n} />)}</datalist>
          <datalist id="tm-monster-names">{(world.monKinds || []).map((m) => <option key={m.n} value={m.n} />)}</datalist>
          <div className="tm-quest-edit-buttons">
            <button type="button" className="tm-btn" onClick={() => tryEd(() => ed.addNote(guide.segments.at(-1)?.id))}>Add note step</button>
            <button type="button" className="tm-btn" onClick={() => tryEd(() => ed.addSegment())}>Add segment</button>
          </div>
          <div className="tm-muted">More steps: right-click the map ("Add step here") or an NPC's window ("Add talk step"). Drag steps to reorder them.</div>
        </>
      )}
      {cur >= steps.length && steps.length > 0 && <div className="tm-muted">You're through this guide.</div>}
    </div>
  );
}
