// Development harness: shows the map the way it would sit on a page.
import React from 'react';
import { createRoot } from 'react-dom/client';
import TibiaMap from './map/TibiaMap.jsx';

// The map version (7.1 / 7.2) is switched in the map's panel, and ?map=71 or ?map=72 in the link opens that one
// (slice 15a; TibiaMap reads it itself, so this works on any page that embeds the map).
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TibiaMap height="calc(100vh - 16px)" fibulaApi="/fibula-api" />
  </React.StrictMode>,
);
