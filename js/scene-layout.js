(function (global) {
  const DESIGN_W = 1920;
  const DESIGN_H = 1080;

  let scale = 1;
  let stageEl = null;

  function applyScale() {
    if (!stageEl) {
      return scale;
    }

    scale = Math.min(global.innerWidth / DESIGN_W, global.innerHeight / DESIGN_H);
    stageEl.style.transform = `scale(${scale})`;
    global.document.documentElement.style.setProperty('--scene-scale', String(scale));
    return scale;
  }

  function init(stageId = 'scene-stage') {
    stageEl = global.document.getElementById(stageId);
    if (!stageEl) {
      return;
    }

    global.document.body.classList.add('has-scene-layout');
    applyScale();
    global.addEventListener('resize', applyScale);
  }

  function getScale() {
    return scale;
  }

  function getStageRect() {
    return stageEl ? stageEl.getBoundingClientRect() : null;
  }

  function clientToStage(clientX, clientY) {
    const rect = getStageRect();
    if (!rect) {
      return { x: clientX, y: clientY };
    }

    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale
    };
  }

  function rectToStage(rect) {
    const origin = clientToStage(rect.left, rect.top);
    const stageWidth = rect.width / scale;
    const stageHeight = rect.height / scale;

    return {
      x: origin.x,
      y: origin.y,
      width: stageWidth,
      height: stageHeight,
      centerX: origin.x + stageWidth / 2,
      centerY: origin.y + stageHeight / 2
    };
  }

  function stagePointFromElement(element) {
    return rectToStage(element.getBoundingClientRect());
  }

  function setElementCenter(element, stageX, stageY) {
    element.style.left = `${stageX}px`;
    element.style.top = `${stageY}px`;
    element.style.transform = 'translate(-50%, -50%)';
  }

  global.SceneLayout = {
    DESIGN_W,
    DESIGN_H,
    init,
    applyScale,
    getScale,
    getStageRect,
    clientToStage,
    rectToStage,
    stagePointFromElement,
    setElementCenter
  };
})(window);
