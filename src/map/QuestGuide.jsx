// The guide in the quest window (slice 13d-1): the quest's segments and steps as a list. Players tick steps off
// (the tick moves the guide on; it never moves by itself), go Back a step or start over; their place is kept in
// the browser. Clicking a step goes to its spot. Editors also add, change, reorder (drag) and delete steps, tick
// each one as checked, and add, rename and delete segments.
import React, { useEffect, useRef, useState } from 'react';
import { ItemIcon } from './NpcWindow.jsx';
import { MonsterIcon } from './MonsterWindow.jsx';
import DialogBuilder, { DialogView } from './DialogBuilder.jsx';
import { ItemPicker } from './QuestWindow.jsx';
import { KINDS, CHEST_ICON, KEY_ICON, keyDoor, stepPos, stepTitle, currentIndex, bringList } from './engine/questguide.js';
import { fmtTime } from './RoutePanel.jsx';

// An NPC's outfit, fitted into a 32x32 slot like an item icon (13f-0b).
function NpcIcon({ world, npc }) {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d'), img = npc.img;
    if (!ctx) return;
    ctx.clearRect(0, 0, 32, 32);
    if (!img || !world.npcSheet) return;
    const sc = Math.min(1, 32 / Math.max(img[2], img[3]));
    const w = img[2] * sc, h = img[3] * sc;
    ctx.imageSmoothingEnabled = sc < 1;
    ctx.drawImage(world.npcSheet, img[0], img[1], img[2], img[3], 32 - w, 32 - h, w, h);
  }, [world, npc]);
  return <canvas ref={ref} className="tm-icon" width={32} height={32} />;
}

const COPIED_KEY = 'tm-dialog-copied';

// Game sprites for steps without an NPC, monster or item of their own (13f-0b, user: authentic icons).
const MAP_ICON = 2822, SCROLL_ICON = 2815;

// What a step's card shows (13f-0b): { icon, title, text, npc (a Talk step's NPC), items (Get, shown under the text) }.
// Talk / Kill / Get: the NPC, monster or items are the title and the step's text goes below; Go / Note: the text is
// the title.
function stepCard(world, t) {
  const lower = (x) => (x || '').toLowerCase();
  if (t.kind === 'talk') {
    const npc = t.npc && world.npcs?.find((m) => lower(m.n) === lower(t.npc));
    return { npc, icon: npc ? <NpcIcon world={world} npc={npc} /> : <ItemIcon world={world} id={SCROLL_ICON} count={1} />, title: t.npc || 'Talk', text: t.text };
  }
  if (t.kind === 'kill') {
    const k = t.monster ? (world.monKinds || []).findIndex((m) => lower(m.n) === lower(t.monster)) : -1;
    return { icon: k >= 0 ? <MonsterIcon world={world} kind={k} /> : <ItemIcon world={world} id={SCROLL_ICON} count={1} />, title: t.monster ? `Kill ${t.monster}` : 'Kill', text: t.text };
  }
  if (t.kind === 'get') {
    const [id, n] = t.items[0] || [];
    return {
      icon: <ItemIcon world={world} id={id || SCROLL_ICON} count={id ? n : 1} />,
      title: stepTitle(world, { ...t, text: '' }), text: t.text, items: t.items.length > 1 ? t.items : null,
    };
  }
  // Key (13l): the door's key as the icon, "Use key N on the door" as the title.
  if (t.kind === 'key') return { icon: <ItemIcon world={world} id={keyDoor(world, t)?.keyId || KEY_ICON} count={1} />, title: stepTitle(world, { ...t, text: '' }), text: t.text };
  // Reward (user 2026-11-20): the chest (its object) as the icon, its items as icons, a gold card.
  if (t.kind === 'reward') return { icon: <ItemIcon world={world} id={t.object || CHEST_ICON} count={1} />, title: 'Reward', text: t.text, items: t.items.length ? t.items : null };
  return { icon: <ItemIcon world={world} id={t.kind === 'go' ? MAP_ICON : SCROLL_ICON} count={1} />, title: stepTitle(world, t), text: null };
}

// The bring list of the segment you're on (13h): item icons with counts; players tick what they've packed (click a
// slot; kept in the browser), editors hide worked-out entries that are wrong, add items by hand and can show the
// hidden ones again. paths: the segment's route (for keys, rope, shovel and fares), when known.
const PACKED_KEY = 'tm-bring-packed';
function BringBox({ world, guide, seg, paths, ed, onErr }) {
  const [packed, setPackedState] = useState(() => { try { return JSON.parse(localStorage.getItem(PACKED_KEY)) || {}; } catch { return {}; } });
  const [showHidden, setShowHidden] = useState(false);
  const list = bringList(world, guide, seg.id, paths || [], !!ed && showHidden);
  const hiddenCount = ed ? bringList(world, guide, seg.id, paths || [], true).filter((e) => e.hidden).length : 0;
  const mine = packed[seg.id] || [];
  const toggle = (key) => {
    const next = { ...packed, [seg.id]: mine.includes(key) ? mine.filter((k) => k !== key) : [...mine, key] };
    if (!next[seg.id].length) delete next[seg.id];
    setPackedState(next);
    try { localStorage.setItem(PACKED_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  };
  const canEdit = ed && seg.bring !== undefined; // database step 8 run (0008_map_quest_bring.sql)
  const b = seg.bring || {};
  const save = (bring) => ed.saveBring(seg.id, bring).catch((e) => onErr(e.message || String(e)));
  const hide = (e) => save(e.auto
    ? { ...b, hide: e.hidden ? (b.hide || []).filter((k) => k !== e.key) : [...(b.hide || []), e.key] }
    : { ...b, add: (b.add || []).filter((_, j) => j !== e.j) });
  if (!list.length && !ed) return null;
  return (
    <div className="tm-bring">
      <div className="tm-section-title">Bring</div>
      {!list.length && <div className="tm-muted">Nothing worked out for this part.</div>}
      <div className="tm-bring-items">
        {list.map((e) => {
          const name = e.label || world.itemName(e.id), done = mine.includes(e.key);
          return (
            <div className={`tm-bring-item${done ? ' tm-bring-packed' : ''}${e.hidden ? ' tm-bring-hidden' : ''}`} key={e.key}>
              <button type="button" className="tm-slot" onClick={() => toggle(e.key)} title={`${e.count > 1 ? `${e.count} ` : ''}${name}: ${e.why}. Click: ${done ? 'not packed yet' : 'packed'}`}>
                <ItemIcon world={world} id={e.id} count={e.count} />
              </button>
              {done && <span className="tm-bring-tick">✓</span>}
              {canEdit && (
                <button type="button" className="tm-close tm-bring-x" onClick={() => hide(e)} title={e.hidden ? 'Show it again' : e.auto ? 'Wrong: hide it for everyone' : 'Remove it'} aria-label="Hide">{e.hidden ? '+' : '×'}</button>
              )}
            </div>
          );
        })}
      </div>
      {canEdit && (
        <>
          <ItemPicker world={world} placeholder="Add to the bring list" onPick={(id) => save({ ...b, add: [...(b.add || []), [id, 1]] })} />
          {(hiddenCount > 0 || showHidden) && <button type="button" className="tm-link" onClick={() => setShowHidden(!showHidden)}>{showHidden ? 'hide the hidden ones' : `show hidden (${hiddenCount})`}</button>}
        </>
      )}
      {ed && seg.bring === undefined && <div className="tm-quest-error">Run database step 8 (0008_map_quest_bring.sql) to change the bring list.</div>}
    </div>
  );
}

// The editors' form for one step. onSave(changes), onDelete(), onDone(); onAddNext(changes): save, add a step below
// it and open that one's form (so this form isn't closed afterwards).
// versions: the map versions ('7.1', '7.2'; none: no Map setting); mapLabel / otherLabel and onSplit(): "different on
// this map" (15d), offered on a step that's on every map.
function StepEdit({ world, step, onSave, onDelete, onDone, onAddNext, versions = [], mapLabel, otherLabel, onSplit }) {
  const [f, setF] = useState(() => ({
    kind: step.kind, text: step.text || '', npc: step.npc || '', monster: step.monster || '', items: step.items || [], checked: step.checked,
    object: step.object ?? null, dialog: step.dialog || [], mapOnly: step.map_only || '',
  }));
  const hasMap = step.map_only !== undefined && versions.length > 1; // database step 25 run (0025_map_quest_versions.sql)
  const hasDialog = step.dialog !== undefined; // database step 7 run (0007_map_quest_step_dialogs.sql)
  const [building, setBuilding] = useState(false); // the dialog builder is open (13f-1)
  const formNpc = f.npc.trim() && world.npcs?.find((m) => m.n.toLowerCase() === f.npc.trim().toLowerCase());
  const hasReward = step.object !== undefined; // database step 6 run (0006_map_quest_reward_steps.sql)
  const withItems = f.kind === 'get' || f.kind === 'reward';
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const act = async (fn, close = true) => {
    setBusy(true); setErr(null);
    try { await fn(); if (close) onDone(); else setBusy(false); } catch (e) { setErr(e.message || String(e)); setBusy(false); }
  };
  const changes = () => ({
    kind: f.kind, text: f.text.trim() || null, npc: f.kind === 'talk' ? f.npc.trim() || null : null,
    monster: f.kind === 'kill' ? f.monster.trim() || null : null, items: withItems ? f.items : [], checked: f.checked,
    ...(hasReward ? { object: f.kind === 'reward' ? f.object : null } : {}),
    ...(hasDialog ? { dialog: f.kind === 'talk' ? f.dialog : [] } : {}),
    ...(hasMap ? { map_only: f.mapOnly || null } : {}),
  });
  const save = () => act(() => onSave(changes()));
  return (
    <div className="tm-quest-edit tm-step-edit" onClick={(e) => e.stopPropagation()}>
      <label className="tm-quest-field">Kind
        <select className="tm-input tm-select" value={f.kind} onChange={set('kind')}>
          {Object.entries(KINDS).filter(([k]) => k !== 'reward' || hasReward || step.kind === 'reward').map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </label>
      <label className="tm-quest-field">What to do<textarea className="tm-input" rows={2} value={f.text} onChange={set('text')} maxLength={1000} placeholder={stepTitle(world, { ...step, ...f, text: '' })} /></label>
      {f.kind === 'talk' && (
        <label className="tm-quest-field">NPC
          <input className="tm-input" value={f.npc} onChange={set('npc')} list="tm-npc-names" maxLength={40} spellCheck={false} />
        </label>
      )}
      {f.kind === 'talk' && (hasDialog ? (
        <div className="tm-quest-field">Dialog
          <div className="tm-muted">
            {f.dialog.length ? f.dialog.map((l) => l.say).join(' › ') : 'None yet.'}
          </div>
          <button type="button" className="tm-btn" onClick={() => setBuilding(true)} disabled={!formNpc} title={formNpc ? "Click through the NPC's conversation" : 'Fill in an NPC first'}>Build dialog</button>
          {building && formNpc && (
            <DialogBuilder world={world} npc={formNpc} lines={f.dialog} onDone={(dialog) => { setF({ ...f, dialog }); setBuilding(false); }} onClose={() => setBuilding(false)} />
          )}
        </div>
      ) : <div className="tm-quest-error">Run database step 7 (0007_map_quest_step_dialogs.sql) to add dialogs.</div>)}
      {f.kind === 'kill' && (
        <label className="tm-quest-field">Monster
          <input className="tm-input" value={f.monster} onChange={set('monster')} list="tm-monster-names" maxLength={40} spellCheck={false} />
        </label>
      )}
      {f.kind === 'reward' && (
        <div className="tm-quest-field">Object on the map
          <div className="tm-offer tm-quest-item">
            <div className="tm-slot"><ItemIcon world={world} id={f.object || CHEST_ICON} count={1} /></div>
            <span className="tm-offer-name">{f.object ? world.itemName(f.object) : 'chest (default)'}</span>
            {f.object && <button type="button" className="tm-close tm-quest-remove" onClick={() => setF({ ...f, object: null })} title="Back to the default chest" aria-label="Back to the default chest">×</button>}
          </div>
          <ItemPicker world={world} placeholder="Chest, box, corpse..." onPick={(id) => setF({ ...f, object: id })} />
        </div>
      )}
      {withItems && (
        <div className="tm-quest-field">{f.kind === 'reward' ? 'What it gives' : 'Items'}
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
      {hasMap && (
        <div className="tm-quest-field">Map
          <div className="tm-step-map">
            <select className="tm-input tm-select" value={f.mapOnly} onChange={set('mapOnly')} title="Which map versions this step is on">
              <option value="">Every map</option>
              {versions.map((v) => <option key={v} value={v}>Only {v}</option>)}
            </select>
            {!step.map_only && mapLabel && otherLabel && onSplit && (
              <button
                type="button" className="tm-btn" disabled={busy} onClick={() => act(onSplit, false)}
                title={`This step becomes "only ${otherLabel}", and a copy "only ${mapLabel}" goes right below it, for you to change`}
              >Different on {mapLabel}</button>
            )}
          </div>
        </div>
      )}
      <label className="tm-check" title="You went through this step and it's right">
        <input type="checkbox" checked={f.checked} onChange={set('checked')} /> Checked
      </label>
      {err && <div className="tm-quest-error">{err}</div>}
      <div className="tm-quest-edit-buttons">
        <button type="button" className="tm-btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        {onAddNext && <button type="button" className="tm-btn" onClick={() => act(() => onAddNext(changes()), false)} disabled={busy} title="Save this step and add a new step right below it">Add next step</button>}
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
// legs (13e, only for the guide on the map): { byStep: { [step id]: { time, show() } | { error, locked } | { busy } },
// total, all (every leg found), show() } for the walk to each step of the current segment (show: fit the view to it).
// onRouteTo(label, pos): the step you're on as the Route panel's To (only when you ask; the guide's route is separate).
// onTalk(npc): open that NPC's conversation (going to it), from a Talk step's icon or name (13f-0b).
// seg: the segment the map shows (its route and markers; null when this guide isn't on the map); onSeg(segment id):
// a click on a step's icon, title or text shows its segment on the map (user 2026-11-22).
// versions, mapLabel, otherLabel (15d): the map versions and the one shown; guide is the view for this map
// (questguide.js forMap): editors also see the other version's parts and steps, greyed out with their tag.
export default function QuestGuide({ world, guide, error, ed, editStep, setEditStep, onGo, at, setAt, legs, onRouteTo, onTalk, seg, onSeg, versions = [], mapLabel, otherLabel }) {
  const [open, setOpen] = useState({}); // segment id -> shown (default: all of them, user 2026-11-21)
  const [drag, setDrag] = useState(null); // the step being dragged (id)
  const [renaming, setRenaming] = useState(null); // { id, name }
  const [err, setErr] = useState(null);
  const [more, setMore] = useState({}); // step id -> long text shown in full
  // Dialog lines you copied (13f-1): { [step id]: [line index] }, kept in the browser; a copied line turns green,
  // clicking it again unmarks it (without copying).
  const [copied, setCopiedState] = useState(() => { try { return JSON.parse(localStorage.getItem(COPIED_KEY)) || {}; } catch { return {}; } });
  // The dialog window (13f-2): which Talk step's dialog is open, and full conversation or only your lines (kept).
  const [viewing, setViewing] = useState(null);
  const [full, setFullState] = useState(() => { try { return localStorage.getItem('tm-dialog-mode') !== 'mine'; } catch { return true; } });
  const setFull = (v) => { setFullState(v); try { localStorage.setItem('tm-dialog-mode', v ? 'full' : 'mine'); } catch { /* private mode */ } };
  const toggleCopied = (id, j, text) => {
    const was = copied[id] || [], on = was.includes(j);
    if (!on) navigator.clipboard?.writeText(text).catch(() => {});
    const next = { ...copied, [id]: on ? was.filter((k) => k !== j) : [...was, j] };
    if (!next[id].length) delete next[id];
    setCopiedState(next);
    try { localStorage.setItem(COPIED_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  };
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
  const curSeg = seg ?? steps[Math.min(cur, steps.length - 1)]?.segment_id;
  const pick = (t, c, pos) => () => { onSeg?.(t.segment_id); if (c?.npc && onTalk) onTalk(c.npc); else if (pos) onGo(pos); };
  const isOpen = (s) => open[s.id] ?? true;
  const checked = steps.filter((t) => t.checked).length;
  const tryEd = async (fn) => { setErr(null); try { await fn(); } catch (e) { setErr(e.message || String(e)); } };
  const drop = (segId, beforeId) => (e) => {
    e.preventDefault(); e.stopPropagation();
    if (drag != null) tryEd(() => ed.moveStep(drag, segId, beforeId));
    setDrag(null);
  };
  const card = (t) => stepCard(world, t);
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
      {legs && Object.keys(legs.byStep).length > 0 && (
        <div className="tm-guide-route" title="Walking time through this part with your character's speed (Route panel settings), fastest way">
          Route: {legs.total ? fmtTime(legs.total) : ''}{legs.all ? '' : legs.total ? ' + …' : '…'}
          {legs.show && <> · <button type="button" className="tm-link" onClick={legs.show}>Show route</button></>}
        </div>
      )}
      {steps.length > 0 && (cur > 0) && (
        <div className="tm-quest-edit-buttons">
          <button type="button" className="tm-btn" onClick={() => go(cur - 1)} title="Go back one step">Back a step</button>
          <button type="button" className="tm-btn" onClick={() => go(0)} title="Untick every step">Start over</button>
        </div>
      )}
      {(ed && guide.allSegments ? guide.allSegments : guide.segments).map((s, si) => {
        const many = guide.segments.length > 1 || ed;
        const shown = isOpen(s);
        const segOn = s.onMap !== false; // (false: a part of the other map version, shown only to editors, 15d)
        const segMap = ed && versions.length > 1 && s.map_only !== undefined && (
          <select
            className="tm-input tm-select tm-seg-map" value={s.map_only || ''} title="Which map versions this part is on"
            onChange={(e) => tryEd(() => ed.setSegmentMap(s.id, e.target.value))}
          >
            <option value="">Every map</option>
            {versions.map((v) => <option key={v} value={v}>Only {v}</option>)}
          </select>
        );
        return (
          <div key={s.id} className="tm-guide-seg" onDragOver={ed ? (e) => e.preventDefault() : undefined} onDrop={ed ? drop(s.id, null) : undefined}>
            {many && (renaming?.id === s.id ? (
              <form className="tm-guide-rename" onSubmit={(e) => { e.preventDefault(); tryEd(() => ed.renameSegment(s.id, renaming.name.trim())); setRenaming(null); }}>
                <input className="tm-input" autoFocus value={renaming.name} maxLength={60} placeholder={`Part ${si + 1}`}
                  onChange={(e) => setRenaming({ id: s.id, name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Escape') setRenaming(null); }} />
              </form>
            ) : (
              <div className={`tm-guide-seg-head${segOn ? '' : ' tm-step-other'}`}>
                <button type="button" className="tm-guide-seg-name" onClick={() => setOpen({ ...open, [s.id]: !shown })}>
                  {shown ? '▾' : '▸'} {s.name || `Part ${si + 1}`} <span className="tm-muted">({s.steps.length})</span>
                </button>
                {s.map_only && <span className="tm-map-tag" title={`Only on the ${s.map_only} map`}>{s.map_only}</span>}
                {segMap}
                {ed && <button type="button" className="tm-link" onClick={() => setRenaming({ id: s.id, name: s.name || '' })}>rename</button>}
                {ed && !s.steps.length && <button type="button" className="tm-link" onClick={() => tryEd(() => ed.deleteSegment(s.id))}>delete</button>}
              </div>
            ))}
            {shown && segOn && s.id === curSeg && <BringBox world={world} guide={guide} seg={s} paths={legs?.paths} ed={ed} onErr={setErr} />}
            {(ed && s.allSteps ? s.allSteps : s.steps).map((t) => {
              // A step of the other map version (editors only, 15d): greyed out, its tag, no number or tick.
              if (!segOn || !s.steps.includes(t)) {
                if (!shown) return null;
                return (
                  <div key={t.id} className="tm-step tm-step-card tm-step-other" title={`Only on the ${t.map_only || s.map_only} map: players on this map don't see it`}>
                    <div className="tm-step-head">
                      <span className="tm-map-tag">{t.map_only || s.map_only}</span>
                      <span className="tm-step-title">{card(t).title}</span>
                      {editStep !== t.id && <button type="button" className="tm-link" onClick={() => setEditStep(t.id)} title="Change this step">edit</button>}
                    </div>
                    {editStep === t.id && (
                      <StepEdit world={world} step={t} versions={versions} onSave={(ch) => ed.saveStep(t.id, ch)} onDelete={() => ed.deleteStep(t.id)} onDone={() => setEditStep(null)} />
                    )}
                  </div>
                );
              }
              const i = n++;
              if (!shown) return null;
              const pos = stepPos(world, t), done = i < cur, c = card(t);
              const l = legs?.byStep[t.id];
              const why = l?.locked?.length ? `Locked doors are in the way: ${l.locked.map((d) => (d.key ? `key ${d.key}` : `a door at ${d.p.join(', ')}`)).join(', ')}` : l?.error;
              const long = c.text && c.text.length > 90;
              return (
                <div
                  key={t.id} className={`tm-step tm-step-card${t.kind === 'reward' ? ' tm-step-reward' : ''}${i === cur ? ' tm-step-cur' : ''}${done ? ' tm-step-done' : ''}${drag === t.id ? ' tm-step-drag' : ''}`}
                  draggable={!!ed && editStep !== t.id} onDragStart={() => setDrag(t.id)} onDragEnd={() => setDrag(null)}
                  onDragOver={ed ? (e) => e.preventDefault() : undefined} onDrop={ed ? drop(s.id, t.id) : undefined}
                >
                  <div className="tm-step-row">
                    <input type="checkbox" checked={done} onChange={(e) => go(e.target.checked ? i + 1 : i)} title={done ? 'Not done yet' : 'Done: on to the next step'} />
                    <button
                      type="button" className="tm-slot tm-step-icon" onClick={pick(t, c, pos)}
                      title={c.npc ? `Talk to ${c.npc.n}: open the conversation` : pos ? `Go to ${pos.join(', ')}` : KINDS[t.kind]}
                    >{c.icon}</button>
                    <div className="tm-step-body">
                      <div className="tm-step-head">
                        <span className="tm-step-num">{i + 1}.</span>
                        <button
                          type="button" className="tm-step-title" onClick={pick(t, c, pos)}
                          title={c.npc ? `Talk to ${c.npc.n}: open the conversation` : pos ? `Go to ${pos.join(', ')}` : t.source ? `From: ${t.source}` : undefined}
                        >{c.title}</button>
                        {!t.checked && <span className="tm-step-unchecked" title="Not checked yet: may be wrong">•</span>}
                        {ed && t.map_only && <span className="tm-map-tag" title={`Only on the ${t.map_only} map`}>{t.map_only}</span>}
                        {ed && editStep !== t.id && <button type="button" className="tm-link" onClick={() => setEditStep(t.id)} title="Change this step">edit</button>}
                      </div>
                      {c.text && (
                        <div className={`tm-step-text${long && !more[t.id] ? ' tm-step-clamp' : ''}`} onClick={pick(t, null, pos)}>{c.text}</div>
                      )}
                      {long && <button type="button" className="tm-link tm-step-more" onClick={() => setMore({ ...more, [t.id]: !more[t.id] })}>{more[t.id] ? 'less' : 'more'}</button>}
                      {t.kind === 'talk' && t.dialog?.length > 0 && (
                        <ol className="tm-step-dialog" title="Click a line to copy it; click it again to unmark it">
                          {t.dialog.map((l, j) => {
                            const done = copied[t.id]?.includes(j);
                            return (
                              <li key={j}>
                                <button type="button" className={`tm-say${done ? ' tm-copied' : ''}`} onClick={() => toggleCopied(t.id, j, l.say)}>{l.say}</button>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                      {t.kind === 'talk' && t.dialog?.length > 0 && (
                        <button type="button" className="tm-link tm-step-more" onClick={() => setViewing(viewing === t.id ? null : t.id)} title="The whole conversation, with what the NPC answers">
                          {viewing === t.id ? 'close conversation' : 'conversation'}
                        </button>
                      )}
                      {viewing === t.id && (
                        <DialogView
                          raw={!!ed}
                          npcName={t.npc || 'the NPC'} lines={t.dialog} copied={copied[t.id] || []} full={full} onFull={setFull}
                          onCopy={(j) => toggleCopied(t.id, j, t.dialog[j].say)} onClose={() => setViewing(null)}
                        />
                      )}
                      {c.items && (
                        <div className="tm-step-items">
                          {c.items.map(([id, n2], j) => <div className="tm-slot" key={j} title={world.itemName(id)}><ItemIcon world={world} id={id} count={n2} /></div>)}
                        </div>
                      )}
                      {(l?.error || (i === cur && pos && onRouteTo)) && (
                        <div className="tm-step-foot">
                          {l?.error && <span className="tm-step-leg-err" title={why}>no route from the step before</span>}
                          {i === cur && pos && onRouteTo && (
                            <button type="button" className="tm-link" onClick={() => onRouteTo(`${i + 1}. ${stepTitle(world, t)}`, pos)} title="Plan a route from where you are (Route panel) to this step">route here</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {ed && editStep === t.id && (
                    <StepEdit
                      world={world} step={t} onSave={(ch) => ed.saveStep(t.id, ch)} onDelete={() => ed.deleteStep(t.id)} onDone={() => setEditStep(null)} onAddNext={(ch) => ed.addAfter(t.id, ch)}
                      versions={versions} mapLabel={mapLabel} otherLabel={otherLabel} onSplit={() => ed.splitStep(t.id)}
                    />
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
