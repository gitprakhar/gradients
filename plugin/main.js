figma.showUI(__html__, { width: 320, height: 460 });

function sendSelectionState() {
  const selection = figma.currentPage.selection;
  figma.ui.postMessage({
    type: 'selection-change',
    hasSelection: selection.length > 0,
  });
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function hexToRgba(hex) {
  const s = String(hex || '').trim().replace('#', '');
  if (s.length !== 6) return { r: 0, g: 0, b: 0 };
  const n = parseInt(s, 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
    a: 1,
  };
}

function toGradientStops(stops) {
  return stops.map((s) => ({
    position: clamp01((Number(s.stop) || 0) / 100),
    color: hexToRgba(s.color),
  }));
}

function makeLinearPaint(stops) {
  return {
    type: 'GRADIENT_LINEAR',
    gradientStops: toGradientStops(stops),
    // Rotate default left->right to top->bottom
    gradientTransform: [
      [0, 1, 0],
      [-1, 0, 1],
    ],
  };
}

function positionToCenter(position) {
  const map = {
    center: [0.5, 0.5],
    'top': [0.5, 0.2],
    'bottom': [0.5, 0.8],
    'left': [0.2, 0.5],
    'right': [0.8, 0.5],
    'top-left': [0.2, 0.2],
    'top-right': [0.8, 0.2],
    'bottom-left': [0.2, 0.8],
    'bottom-right': [0.8, 0.8],
    'top-center': [0.5, 0.2],
    'bottom-center': [0.5, 0.8],
    'off-left': [-0.2, 0.5],
    'off-right': [1.2, 0.5],
    'off-top': [0.5, -0.2],
    'off-bottom': [0.5, 1.2],
  };
  return map[position] || map.center;
}

function makeRadialPaint(stops, position, width, height) {
  const [cx, cy] = positionToCenter(position);
  const w = Number(width) || 1;
  const h = Number(height) || 1;
  const rx = w / 2;
  const ry = h / 2;
  const r = Math.sqrt(rx * rx + ry * ry) || 1;
  // Scale down so the radial reaches the farthest corner (CSS "farthest-corner" feel)
  const scaleX = rx / r;
  const scaleY = ry / r;
  // Keep the center anchored when scaling (otherwise it drifts toward top-left)
  const tx = cx - 0.5 * scaleX;
  const ty = cy - 0.5 * scaleY;
  return {
    type: 'GRADIENT_RADIAL',
    gradientStops: toGradientStops(stops),
    gradientTransform: [
      [scaleX, 0, tx],
      [0, scaleY, ty],
    ],
  };
}

function applyGradientToNode(node, stops, gradientType, radialPosition) {
  if (!('fills' in node)) return false;
  const paint =
    gradientType === 'radial'
      ? makeRadialPaint(stops, radialPosition, node.width, node.height)
      : makeLinearPaint(stops);
  node.fills = [paint];
  return true;
}

figma.ui.onmessage = (msg) => {
  if (!msg || msg.type !== 'apply-gradient') return;

  const stops = Array.isArray(msg.stops) ? msg.stops : [];
  const gradientType = msg.gradientType === 'radial' ? 'radial' : 'linear';
  const radialPosition = typeof msg.radialPosition === 'string' ? msg.radialPosition : 'center';
  if (stops.length < 2) {
    figma.notify('Need at least 2 color stops');
    return;
  }

  const selection = figma.currentPage.selection;
  let applied = 0;

  if (selection.length === 0) {
    figma.notify('Select a layer to apply');
    sendSelectionState();
    return;
  } else {
    for (const node of selection) {
      if (applyGradientToNode(node, stops, gradientType, radialPosition)) applied += 1;
    }
  }

  if (applied === 0) {
    figma.notify('Select a shape or frame with fills');
  } else {
    figma.notify(`Applied gradient to ${applied} node${applied === 1 ? '' : 's'}`);
  }
};

figma.on('selectionchange', () => {
  sendSelectionState();
});

sendSelectionState();
