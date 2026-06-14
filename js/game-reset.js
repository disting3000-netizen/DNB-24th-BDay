(function () {
  const LOCAL_KEYS = [
    'map-intro-complete',
    'dars-intro-complete',
    'dars-game-phase',
    'dars-sticker-positions',
    'dars-challenge-complete',
    'nose-challenge-complete',
    'baby-challenge-complete',
    'baby-level-unlocked'
  ];

  const SESSION_KEYS = [
    'dars-map-animate',
    'nose-map-animate',
    'baby-map-animate',
    'game-audio-unlocked',
    'game-bgm-track'
  ];

  function resetGameProgress() {
    LOCAL_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        // Ignore storage failures in private mode.
      }
    });

    SESSION_KEYS.forEach((key) => {
      try {
        sessionStorage.removeItem(key);
      } catch (error) {
        // Ignore storage failures in private mode.
      }
    });
  }

  window.GameReset = {
    resetGameProgress
  };
})();
