// ✅ Mirrors the deterministic species stat variance from DigimonRoulette.jsx/RNG.jsx so the
// menu-level Bestiary (fetched independently, before entering a mode) shows the same HP/Power
// numbers the player would see in-game.
function menuHashNameToUnit(name) {
  let hash = 0;
  const str = name || "";
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}
export function menuGetStatVariance(name) {
  return 0.85 + menuHashNameToUnit(name) * 0.30;
}

// eslint-disable-next-line no-unused-vars -- kept for parity with the pre-split file; not
// currently called anywhere, but preserved rather than silently dropped during the refactor.
export const timeAgoLabel = (ts) => {
  if (!ts) return "";
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
};

export const getSaveSummary = (saveKey) => {
  try {
    const save = JSON.parse(localStorage.getItem(saveKey) || "null");
    if (!save || !save.phase || save.phase === "start") return null;
    return save;
  } catch {return null;}
};
