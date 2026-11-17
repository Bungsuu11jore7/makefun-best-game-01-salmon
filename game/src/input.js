// Salmon Song — mouse and keyboard. The world reads a plain input
// object each step; this file only fills it in from events.
export function createInput() {
  return {
    pointerX: 330,
    pointerY: 420,
    pointerActive: false,
    leapPressed: false,
    diveHeld: false,
    // One-frame action flags the main loop consumes.
    startPressed: false,
    restartPressed: false,
    pausePressed: false,
    mutePressed: false,
  };
}

export function attachInput(canvas, input) {
  function pointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.pointerX = (event.clientX - rect.left) * scaleX;
    input.pointerY = (event.clientY - rect.top) * scaleY;
    input.pointerActive = true;
  }

  canvas.addEventListener('pointermove', pointerFromEvent);
  canvas.addEventListener('pointerdown', (event) => {
    pointerFromEvent(event);
    input.leapPressed = true;
    input.startPressed = true;
  });
  window.addEventListener('keydown', (event) => {
    if (event.repeat) {
      if (event.code === 'KeyS' || event.code === 'ArrowDown') input.diveHeld = true;
      return;
    }
    switch (event.code) {
      case 'Space':
        input.leapPressed = true;
        input.startPressed = true;
        event.preventDefault();
        break;
      case 'Enter':
        input.startPressed = true;
        break;
      case 'KeyR':
        input.restartPressed = true;
        break;
      case 'KeyP':
      case 'Escape':
        input.pausePressed = true;
        break;
      case 'KeyM':
        input.mutePressed = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        input.diveHeld = true;
        break;
      default:
        break;
    }
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'KeyS' || event.code === 'ArrowDown') input.diveHeld = false;
  });
  canvas.addEventListener('pointerup', () => {
    // Leap is edge-triggered in the main loop; nothing to clear here.
  });
}

// Clear the one-frame flags after the main loop has read them.
export function clearEdgeFlags(input) {
  input.leapPressed = false;
  input.startPressed = false;
  input.restartPressed = false;
  input.pausePressed = false;
  input.mutePressed = false;
}
