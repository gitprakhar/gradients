figma.showUI(__html__, { width: 320, height: 240 });

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function hexToRgb(hex) {
  const s = String(hex || '').trim().replace('#', '');
  if (s.length !== 6) return { r: 0, g: 0, b: 0 };
  const n = parseInt(s, 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

function toGradientStops(stops) {
  return stops.map((s) => ({
    position: clamp01((Number(s.stop) || 0) / 100),
    color: hexToRgb(s.color),
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

function applyGradientToNode(node, stops) {
  if (!('fills' in node)) return false;
  const paint = makeLinearPaint(stops);
  node.fills = [paint];
  return true;
}

figma.ui.onmessage = (msg) => {
  if (!msg || msg.type !== 'apply-gradient') return;

  const stops = Array.isArray(msg.stops) ? msg.stops : [];
  if (stops.length < 2) {
    figma.notify('Need at least 2 color stops');
    return;
  }

  const selection = figma.currentPage.selection;
  let applied = 0;

  if (selection.length === 0) {
    const rect = figma.createRectangle();
    rect.resize(512, 512);
    applyGradientToNode(rect, stops);
    figma.currentPage.appendChild(rect);
    figma.currentPage.selection = [rect];
    figma.viewport.scrollAndZoomIntoView([rect]);
    applied = 1;
  } else {
    for (const node of selection) {
      if (applyGradientToNode(node, stops)) applied += 1;
    }
  }

  if (applied === 0) {
    figma.notify('Select a shape or frame with fills');
  } else {
    figma.notify(`Applied gradient to ${applied} node${applied === 1 ? '' : 's'}`);
  }
};
