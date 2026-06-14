(function () {
  const REPLAY_KEY = 'game-replay-mode';

  function isActive() {
    try {
      return sessionStorage.getItem(REPLAY_KEY) === 'true';
    } catch (error) {
      return false;
    }
  }

  function enable() {
    try {
      sessionStorage.setItem(REPLAY_KEY, 'true');
    } catch (error) {
      // Ignore storage failures in private mode.
    }
  }

  function disable() {
    try {
      sessionStorage.removeItem(REPLAY_KEY);
    } catch (error) {
      // Ignore storage failures in private mode.
    }
  }

  window.GameReplay = {
    isActive,
    enable,
    disable
  };
})();
