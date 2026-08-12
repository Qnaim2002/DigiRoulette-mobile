// ✅ Colorblind-Friendly Mode: the game's one place where color alone encodes information is
// the HP bar (healthy vs critical) — everywhere else phosphor-green is just branding, not a
// signal, so it's left alone. When enabled, swaps the red/green pair for blue/orange, which
// is far more distinguishable under deuteranopia/protanopia (red-green color blindness, the
// most common forms). Shared by PartySlot, the enemy-squad tiles, and the Party Setup enemy
// cards, so all three HP displays in the game stay visually consistent with each other.
const HP_COLORS_STANDARD = {healthy: "#4dff8f", low: "#e74c3c", lowGlowA: "rgba(231,76,60,0.5)", lowGlowB: "rgba(231,76,60,0.95)"};
const HP_COLORS_COLORBLIND = {healthy: "#4d9fff", low: "#ff8c42", lowGlowA: "rgba(255,140,66,0.5)", lowGlowB: "rgba(255,140,66,0.95)"};

export function getHpColors(colorblindMode) {
  return colorblindMode ? HP_COLORS_COLORBLIND : HP_COLORS_STANDARD;
}
