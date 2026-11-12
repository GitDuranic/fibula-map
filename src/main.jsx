// Development harness: shows the map the way it would sit on a page.
import React from 'react';
import { createRoot } from 'react-dom/client';
import TibiaMap from './map/TibiaMap.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TibiaMap dataUrl="/map-data" height="calc(100vh - 16px)" />
  </React.StrictMode>,
);
