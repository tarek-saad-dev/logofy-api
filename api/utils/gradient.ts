// utils/gradient.js
function toLegacyGradient(bg) {
  if (!bg || bg.type !== "gradient" || !bg.gradient?.stops) return bg;
  const { angle = 0, stops = [] } = bg.gradient;
  return {
    type: "gradient",
    gradient: {
      angle,
      stops: stops.map((s) => ({
        color: s.hex ?? s.color ?? "#000000",
        position: typeof s.offset === "number" ? s.offset : 0,
      })),
    },
  };
}

function applyLegacyIfRequested(canvas, wantLegacy) {
  if (!wantLegacy || !canvas?.background) return canvas;
  const bg = canvas.background;
  const legacy = toLegacyGradient(bg);
  // لا نرجّع solidColor/image في legacy
  return { ...canvas, background: legacy };
}

module.exports = { toLegacyGradient, applyLegacyIfRequested };
