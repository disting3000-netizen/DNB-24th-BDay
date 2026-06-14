(function () {
  const TYPING_SRC = 'audio/keyboard_type.mp3';
  const typingPool = Array.from({ length: 5 }, () => {
    const audio = new Audio(TYPING_SRC);
    audio.volume = 0.28;
    return audio;
  });

  let typingPoolIndex = 0;
  let activeBgm = null;

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
    playTypeChar,
    replacePlayerText
  };
})();
