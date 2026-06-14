(function () {
  const TYPING_SRC = 'audio/keyboard_type.mp3';
  const UNLOCK_KEY = 'game-audio-unlocked';
  const BGM_TRACK_KEY = 'game-bgm-track';
  const RETRY_MS = 350;

  const typingPool = Array.from({ length: 5 }, () => {
    const audio = new Audio(TYPING_SRC);
    audio.volume = 0.28;
    audio.preload = 'auto';
    return audio;
  });

  let typingPoolIndex = 0;
  let activeBgm = null;
  let unlockListenersAttached = false;
  let retryIntervalId = null;
  let bgmSuppressed = false;

  function markUnlocked() {
    try {
      sessionStorage.setItem(UNLOCK_KEY, 'true');
    } catch (error) {
      // Ignore storage failures in private mode.
    }
  }

  function saveBgmTrack(filename) {
    try {
      sessionStorage.setItem(BGM_TRACK_KEY, filename);
    } catch (error) {
      // Ignore storage failures in private mode.
    }
  }

  function isBgmPlaying() {
    return Boolean(activeBgm && !activeBgm.paused && !activeBgm.ended);
  }

  function stopAutoRetry() {
    if (retryIntervalId !== null) {
      window.clearInterval(retryIntervalId);
      retryIntervalId = null;
    }
  }

  function tryPlayBgm() {
    if (!activeBgm || bgmSuppressed) {
      return Promise.resolve(false);
    }

    if (isBgmPlaying()) {
      stopAutoRetry();
      return Promise.resolve(true);
    }

    return activeBgm.play()
      .then(() => {
        markUnlocked();
        stopAutoRetry();
        return true;
      })
      .catch(() => false);
  }

  function startAutoRetry() {
    if (bgmSuppressed) {
      return;
    }

    stopAutoRetry();
    tryPlayBgm();

    retryIntervalId = window.setInterval(() => {
      if (isBgmPlaying()) {
        stopAutoRetry();
        return;
      }

      tryPlayBgm();
    }, RETRY_MS);
  }

  function unlockAudio() {
    return tryPlayBgm();
  }

  function pauseBgm() {
    bgmSuppressed = true;
    stopAutoRetry();
    if (activeBgm) {
      activeBgm.pause();
    }
  }

  function resumeBgm() {
    bgmSuppressed = false;
    if (!activeBgm) {
      return;
    }
    startAutoRetry();
  }

  function attachUnlockListeners() {
    if (unlockListenersAttached) {
      return;
    }

    unlockListenersAttached = true;

    const onInteraction = () => {
      tryPlayBgm();
    };

    document.addEventListener('pointerdown', onInteraction, true);
    document.addEventListener('touchstart', onInteraction, true);
    document.addEventListener('keydown', onInteraction, true);
    document.addEventListener('click', onInteraction, true);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !isBgmPlaying()) {
        startAutoRetry();
      }
    });

    window.addEventListener('pageshow', () => {
      if (!isBgmPlaying()) {
        startAutoRetry();
      }
    });
  }

  function playTypeChar(char) {
    if (!char || char === ' ' || char === '\n') {
      return;
    }

    const audio = typingPool[typingPoolIndex];
    typingPoolIndex = (typingPoolIndex + 1) % typingPool.length;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  function initBgm(filename) {
    saveBgmTrack(filename);

    if (activeBgm) {
      const currentSrc = activeBgm.getAttribute('src') || activeBgm.src || '';
      if (currentSrc.endsWith(filename) && isBgmPlaying()) {
        return activeBgm;
      }

      activeBgm.pause();
      activeBgm = null;
    }

    activeBgm = new Audio(`audio/${filename}`);
    activeBgm.loop = true;
    activeBgm.volume = 0.42;
    activeBgm.preload = 'auto';

    attachUnlockListeners();
    startAutoRetry();

    return activeBgm;
  }

  function replacePlayerText(text) {
    return String(text).replace(/\bPLAYER\b/gi, 'DNB');
  }

  window.GameAudio = {
    initBgm,
    unlockAudio,
    pauseBgm,
    resumeBgm,
    tryPlayBgm,
    startAutoRetry,
    playTypeChar,
    replacePlayerText
  };
})();
