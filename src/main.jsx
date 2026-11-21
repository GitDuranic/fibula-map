// Development harness: shows the map the way it would sit on a page.
import React from 'react';
import { createRoot } from 'react-dom/client';
import TibiaMap from './map/TibiaMap.jsx';

// ?map=72 shows another map's data (public/map-data-72, built with convert-map.js --out), for trying other versions.
const map = new URLSearchParams(window.location.search).get('map');
const dataUrl = map && /^\w+$/.test(map) ? `/map-data-${map}` : '/map-data';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TibiaMap dataUrl={dataUrl} height="calc(100vh - 16px)" />
  </React.StrictMode>,
);
