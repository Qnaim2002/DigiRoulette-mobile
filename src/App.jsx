import React, { useState, useEffect, useCallback } from 'react';
import GameScreen from './GameScreen';
import './App.css';

// ✅ FULLSCREEN TOGGLE — sits outside GameScreen entirely so it works on every
// phase (menu, starter picker, gameplay, game over, victory) without needing
// to be wired into each screen individually. Reclaims the address-bar space
// that was eating into the game's already-tight landscape viewport height.
const FullscreenButton = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const el = document.documentElement;
    const supported = !!(el.requestFullscreen || el.webkitRequestFullscreen);
    setIsSupported(supported);

    const handleChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = document.documentElement;
    const isCurrentlyFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (!isCurrentlyFullscreen) {
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }, []);

  // iOS Safari (non-PWA) doesn't support the Fullscreen API on arbitrary
  // elements — hide the button rather than showing one that silently fails.
  if (!isSupported) return null;

  return (
    <button
      onClick={toggleFullscreen}
      className="fullscreen-toggle-btn"
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
    >
      {isFullscreen ? '⤢' : '⛶'}
    </button>
  );
};

function App() {
  return (
    <>
      {/* ✅ ORIENTATION LOCK: always mounted, CSS-only visibility (see App.css) —
          shows automatically in portrait on phone/tablet-sized screens and
          hides the game underneath. No JS orientation listener needed, so
          there's zero extra work on rotate/resize. */}
      <div className="orientation-lock-overlay">
        <div className="orientation-lock-statusbar">
          <span className="orientation-lock-live"><span className="orientation-lock-dot" aria-hidden="true" />FIELD LINK: STANDBY</span>
        </div>
        <div className="orientation-lock-phone-wrap" aria-hidden="true">
          <div className="orientation-lock-phone">
            <div className="orientation-lock-notch" />
            <div className="orientation-lock-glow-screen" />
          </div>
        </div>
        <div className="orientation-lock-content">
          <h1>ROTATE YOUR DEVICE</h1>
          <p>DigiRoulette runs in landscape mode. Please rotate your device sideways to continue.</p>
        </div>
      </div>
      <FullscreenButton />
      <div className="fullscreen-game-container">
        <GameScreen />
      </div>
    </>
  );
}

export default App;