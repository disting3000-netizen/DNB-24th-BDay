(function (global) {
  const DESIGN_W = 1920;
  const DESIGN_H = 1080;

  let scale = 1;
  let stageEl = null;
  let wrapperEl = null;

  function applyScale() {
    if (!stageEl || !wrapperEl) {
      return scale;
    }

    const viewportW = global.innerWidth;
    const viewportH = global.innerHeight;

    // Cover the viewport so the scene fills the screen (may crop edges slightly).
    scale = Math.max(viewportW / DESIGN_W, viewportH / DESIGN_H);

    wrapperEl.style.width = `${DESIGN_W * scale}px`;
    wrapperEl.style.height = `${DESIGN_H * scale}px`;
    stageEl.style.transform = `scale(${scale})`;

    global.document.documentElement.style.setProperty('--scene-scale', String(scale));
    global.document.documentElement.style.setProperty('--design-w', `${DESIGN_W}px`);
    global.document.documentElement.style.setProperty('--design-h', `${DESIGN_H}px`);

    return scale;
  }

  function wrapStage(stage) {
    const viewport = stage.parentElement;
    if (!viewport) {
      return stage;
    }

    const wrapper = global.document.createElement('div');
    wrapper.className = 'scene-scale-wrapper';
    viewport.replaceChild(wrapper, stage);
    wrapper.appendChild(stage);
    return wrapper;
  }

  function init(stageId = 'scene-stage') {
    stageEl = global.document.getElementById(stageId);
    if (!stageEl) {
      return;
    }

    wrapperEl = stageEl.parentElement;
    if (!wrapperEl.classList.contains('scene-scale-wrapper')) {
      wrapperEl = wrapStage(stageEl);
    }

    stageEl.style.width = `${DESIGN_W}px`;
    stageEl.style.height = `${DESIGN_H}px`;
    stageEl.style.transformOrigin = '0 0';

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
