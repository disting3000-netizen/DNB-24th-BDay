(function () {
  let activeBgm = null;

  function initBgm(filename) {
    if (activeBgm) {
      activeBgm.pause();
      activeBgm = null;
    }

    activeBgm = new Audio(`audio/${filename}`);
    activeBgm.loop = true;
    activeBgm.volume = 0.42;

    const start = () => {
      if (!activeBgm) {
        return;
      }
      activeBgm.play().catch(() => {});
    };

    start();
    document.addEventListener('pointerdown', start, { once: true });
    document.addEventListener('keydown', start, { once: true });

    return activeBgm;
  }

  function replacePlayerText(text) {
    return String(text).replace(/\bPLAYER\b/gi, 'DNB');
  }

  window.GameAudio = {
    initBgm,
    replacePlayerText
  };
})();
