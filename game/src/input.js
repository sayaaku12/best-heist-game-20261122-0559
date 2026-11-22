// input.js — one clear job: keyboard and mouse state, nothing else.
// The game reads this each frame; it never touches the DOM itself.

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    keys,
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    /** The last click-to-move target in canvas coordinates, or null. */
    clickTarget: null,
    /** True for one frame after a key is pressed (edge trigger). */
    pressed: new Set(),
  };

  const KEYMAP = {
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ShiftLeft: 'sneak',
    ShiftRight: 'sneak',
    KeyC: 'coin',
    KeyP: 'pause',
    Escape: 'pause',
    KeyR: 'restart',
    KeyM: 'mute',
    KeyH: 'hint',
    Enter: 'confirm',
    Space: 'confirm',
  };

  function canvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (e) => {
    const name = KEYMAP[e.code];
    if (!name) return;
    if (['up', 'down', 'left', 'right', 'confirm'].includes(name)) e.preventDefault();
    if (!e.repeat) state.pressed.add(name);
    keys.add(name);
  });
  window.addEventListener('keyup', (e) => {
    const name = KEYMAP[e.code];
    if (name) keys.delete(name);
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const p = canvasPoint(e.clientX, e.clientY);
    state.mouseX = p.x;
    state.mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = canvasPoint(e.clientX, e.clientY);
    state.mouseX = p.x;
    state.mouseY = p.y;
    state.mouseDown = true;
    state.clickTarget = { x: p.x, y: p.y };
  });
  window.addEventListener('mouseup', () => {
    state.mouseDown = false;
  });

  /** A unit movement vector from the held keys, or null when none are held. */
  state.moveVector = () => {
    let x = 0;
    let y = 0;
    if (keys.has('left')) x -= 1;
    if (keys.has('right')) x += 1;
    if (keys.has('up')) y -= 1;
    if (keys.has('down')) y += 1;
    if (x === 0 && y === 0) return null;
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  };

  /** True once for the frame after the key went down; call after reading. */
  state.wasPressed = (name) => state.pressed.has(name);
  state.endFrame = () => state.pressed.clear();

  return state;
}
