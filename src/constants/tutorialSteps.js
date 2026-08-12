// ============================================================
// TUTORIAL STEP CONTENT — a generic overview (main menu) plus mode-specific
// step sets (shown from inside each mode, where economy/items differ)
// ============================================================
export const COMMON_STEPS_HEAD = [
  {icon:"🌍", title:"Welcome to DigiRoulette!", body:"A turn-based Digimon adventure powered by a spin wheel. Every action, battling, evolving is decided by fate. Choose your starter and begin your journey!"},
];
export const COMMON_STEPS_TAIL = [
  {icon:"🛡️", title:"Party Setup", body:"Right before every battle — Wild, Legendary, or Nemesis Raid — you'll get a Party Setup screen. Freely reorder, heal, revive, and swap in Reserve Digimon at no cost, then tap ⚔️ ENGAGE BATTLE when your squad is ready."},
  {icon:"⚔️", title:"Combat", body:"You and the enemy take turns spinning the Combat Wheel. Land on 💥 Normal Attack, 🔥 Critical Hit, or 💨 Miss. Enemies can also 💚 Heal. Defeat all enemies to win!"},
  {icon:"🕸️", title:"Wild Capture", body:"After defeating a Wild Digimon, spin for a capture chance! Success adds it to your party or reserve box. Build a diverse team!"},
  {icon:"✨", title:"Evolution", body:"After battle, spin for an evolution chance. Higher-tier enemies give better odds. Watch your Digimon card light up and transform when evolution triggers — each tier, all the way from Baby→Child up through the new Ultra→Ultra+ capstone, plays its own unique animation and sound!"},
  {icon:"📖", title:"Bestiary", body:"The Bestiary tracks every Digimon you've captured or hatched from eggs. Capture wild Digimon, legendary encounters, and hatch eggs to fill your collection."},
  {icon:"🚨", title:"Nemesis Raids", body:"Every 4 world spins, a Nemesis Raid triggers — 8 escalating waves. Wave 8 is CHRONOMON DM. Clear all 8 waves to save the Digital World! Shortcuts: Space=Spin, H=Heal."},
];

export const GENERIC_TUTORIAL_STEPS = [
  ...COMMON_STEPS_HEAD,
  {icon:"🎲", title:"The World Wheel", body:"Spin the World Wheel each turn to explore — encounter Digimon, hatch eggs, train, and more. Every 4 spins triggers a Nemesis Raid!"},
  ...COMMON_STEPS_TAIL,
  {icon:"🛒🎲", title:"Two Ways to Play", body:"Shop Mode: earn Digi Coin from battles and spend it in the Digital Shop on your own terms. Full RNG Mode: no currency at all — potions, items, and evolution chips are all found straight from the wheel. Pick a mode from the main menu to see its full rules!"},
];

export const SHOP_TUTORIAL_STEPS = [
  ...COMMON_STEPS_HEAD,
  {icon:"🎲", title:"The World Wheel", body:"Spin the World Wheel each turn. It lands on: ⚔️ Wild Encounter, 🥚 Digi-Egg hatch, 🛒 Visit Digital Shop, 👑 Legendary encounter, or 🏋️ Train to evolve. Every 4 spins triggers a Nemesis Raid!"},
  ...COMMON_STEPS_TAIL,
  {icon:"🪙", title:"Digi Coin & the Shop", body:"Defeating Wild or Legendary Digimon earns Digi Coin. Spend it in the Digital Shop on Potions, Chips, Revives, Evolution Chips, and Escape Portals — buy what you want, whenever you want. While in the Shop, you can also Sell a healthy Digimon from its info popup for extra coin — fainted Digimon can't be sold, and price drops with lower HP."},
];

export const RNG_TUTORIAL_STEPS = [
  ...COMMON_STEPS_HEAD,
  {icon:"🎲", title:"The World Wheel", body:"Spin the World Wheel each turn. It lands on: ⚔️ Wild Encounter, 🥚 Digi-Egg hatch, 🧪 Buy a Potion, 💎 Find Battle Item Mod, 👑 Legendary encounter, 🧬 Found Evolution Chip, or 🏋️ Train to evolve. Every 4 spins triggers a Nemesis Raid!"},
  ...COMMON_STEPS_TAIL,
  {icon:"💎", title:"No Shop — Everything's a Drop", body:"There's no currency here. Potions, battle items (Overdrive Chip, Shield Matrix, Revive Potion, Escape Portal), and Evolution Chips are all found directly from World Wheel spins."},
];
