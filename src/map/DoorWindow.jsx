// The door window in the side panel: the key a locked door needs, and unlocking it.
import React from 'react';
import { ItemIcon } from './NpcWindow.jsx';

// door: { p, key, keyId }; open: is it open now; all: are all locked doors opened (the tick);
// same: how many locked doors take this key (one key opens them all).
export default function DoorWindow({ world, door, open, all, same, onToggle, onAll, onClose }) {
  const [x, y, z] = door.p;
  const name = door.key ? world.itemName(door.keyId) : 'key';
  const keyName = name.charAt(0).toUpperCase() + name.slice(1);
  return (
    <div className="tm-panel tm-window tm-door">
      <div className="tm-window-title">
        <span className="tm-window-name">Locked door</span>
        <button type="button" className="tm-close" onClick={onClose} title="Close" aria-label="Close">×</button>
      </div>
      <div className="tm-window-body">
        <div className="tm-offer tm-door-key">
          <div className="tm-slot"><ItemIcon world={world} id={door.keyId} count={1} /></div>
          <div className="tm-door-text">
            <div>{door.key ? keyName : 'Key unknown'}</div>
            <div className="tm-door-num">{door.key ? `Key ${door.key}` : 'No key number in the map data'}</div>
          </div>
        </div>
        <div className="tm-door-pos">{x}, {y}, {z}</div>
        <div className="tm-route-actions">
          <button type="button" className="tm-btn" onClick={onToggle} disabled={all} title={all ? 'All locked doors are open (untick below)' : undefined}>
            {open ? 'Lock' : 'Unlock'}{door.key && same > 1 ? ` (${same} doors)` : ''}
          </button>
        </div>
        <label className="tm-check">
          <input type="checkbox" checked={all} onChange={(e) => onAll(e.target.checked)} /> Open all locked doors
        </label>
      </div>
    </div>
  );
}
