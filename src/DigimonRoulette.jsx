import React, {useState, useEffect, useRef} from "react";
import {sfx} from "./utils/audio";
import {createCsvWorker, parseCsvViaWorker} from "./utils/csvParseWorker";

export const URLS = {
  STARTERS:   "https://docs.google.com/spreadsheets/d/e/2PACX-1vQnn90HQjoCBCPbb9Y35juXme0I3Xdyd9JDJe91SwRI26IGVMT4EO-kSH7HU4i10c3_L8JXGAoKtgI8/pub?gid=0&single=true&output=csv",
  WILD:       "https://docs.google.com/spreadsheets/d/e/2PACX-1vQnn90HQjoCBCPbb9Y35juXme0I3Xdyd9JDJe91SwRI26IGVMT4EO-kSH7HU4i10c3_L8JXGAoKtgI8/pub?gid=1732577563&single=true&output=csv",
  EGGS:       "https://docs.google.com/spreadsheets/d/e/2PACX-1vQnn90HQjoCBCPbb9Y35juXme0I3Xdyd9JDJe91SwRI26IGVMT4EO-kSH7HU4i10c3_L8JXGAoKtgI8/pub?gid=1281144117&single=true&output=csv",
  LEGENDARY:  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQnn90HQjoCBCPbb9Y35juXme0I3Xdyd9JDJe91SwRI26IGVMT4EO-kSH7HU4i10c3_L8JXGAoKtgI8/pub?gid=2023870481&single=true&output=csv",
  VILLAINS:   "https://docs.google.com/spreadsheets/d/e/2PACX-1vQnn90HQjoCBCPbb9Y35juXme0I3Xdyd9JDJe91SwRI26IGVMT4EO-kSH7HU4i10c3_L8JXGAoKtgI8/pub?gid=1466808519&single=true&output=csv",
  EVOLUTIONS: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQnn90HQjoCBCPbb9Y35juXme0I3Xdyd9JDJe91SwRI26IGVMT4EO-kSH7HU4i10c3_L8JXGAoKtgI8/pub?gid=1064530306&single=true&output=csv",
  BOSSES:     "https://docs.google.com/spreadsheets/d/e/2PACX-1vQnn90HQjoCBCPbb9Y35juXme0I3Xdyd9JDJe91SwRI26IGVMT4EO-kSH7HU4i10c3_L8JXGAoKtgI8/pub?gid=926401702&single=true&output=csv",
};

export const STAGE_STATS = {
  "Baby":    {maxHp: 100, power: 1},
  "Child":   {maxHp: 150, power: 3},
  "Adult":   {maxHp: 250, power: 4},
  "Perfect": {maxHp: 350, power: 5},
  "Ultimate":{maxHp: 450, power: 6},
  "Ultra":   {maxHp: 600, power: 9},
  "Ultra+":  {maxHp: 800, power: 12},
  "Armor":   {maxHp: 200, power: 4},
  "Unknown": {maxHp: 150, power: 3},
  "Hybrid":  {maxHp: 350, power: 5}
};

export const WORLD_WHEEL = [
  {type: "WILD",      label: "⚔️ Encounter Wild Digimon",  weight: 28},
  {type: "TRAIN",     label: "🏋️ Train & Evolve Partner",   weight: 19},
  {type: "EGG",       label: "🥚 Search for Digi-Egg",      weight: 14},
  {type: "LEGENDARY", label: "👑 Encounter Legendary Mega",  weight: 8},
  {type: "SHOP",      label: "🛒 Visit Digital Shop",        weight: 23}
];

// ✅ Below 2 Digi Coin the player can't afford the cheapest shop item (Potion, 2 coin), so
// landing on Shop would just be a wasted spin. Computed fresh from the CURRENT coin balance
// wherever the World Wheel is (re)built, rather than a one-time filter — so the option
// reappears the instant they can afford something again. Wheel.jsx derives slice sizes from
// each segment's weight/totalWeight, so removing SHOP here automatically redistributes its
// share across the remaining options with no manual rescaling needed.
function getWorldWheelSegments(digiCoin) {
  if (digiCoin < 2) return WORLD_WHEEL.filter((s) => s.type !== "SHOP");
  return WORLD_WHEEL;
}

// ✅ Digi Coin economy: shop catalog (single source of truth for both purchase logic and UI)
export const SHOP_ITEMS = [
  {key: "potion",       icon: "🧪", label: "Potion",                 desc: "Heals +50 HP in battle", price: 2},
  {key: "chipStrength", icon: "💪", label: "Strength Chip",          desc: "+15% dmg for 1 battle", price: 3},
  {key: "chipEndurance",icon: "🛡️", label: "Endurance Chip",         desc: "+20% Max HP for 1 battle", price: 3},
  {key: "revivePotion", icon: "✨", label: "Revive Potion",          desc: "Auto-revives a fainted ally", price: 4},
  {key: "evoChipBasic", icon: "🧬", label: "Evolution Chip",         desc: "Instantly evolve a Child → Adult", price: 3,  evoTier: "Child"},
  {key: "evoChipSuper", icon: "🧬", label: "Super Evolve Chip",   desc: "Instantly evolve an Adult → Perfect", price: 7,  evoTier: "Adult"},
  {key: "evoChipMega",  icon: "🧬", label: "Mega Evolve Chip",    desc: "Instantly evolve a Perfect → Ultimate", price: 12, evoTier: "Perfect"},
  {key: "evoChipUltra", icon: "🧬", label: "Ultra Evolve Chip",   desc: "Instantly evolve an Ultimate → Ultra", price: 16, evoTier: "Ultimate"},
  {key: "evoChipOmega", icon: "🌟", label: "Omega Evolve Chip",   desc: "Instantly evolve an Ultra → Ultra+", price: 22, evoTier: "Ultra"},
  {key: "escapePortal", icon: "🌀", label: "Escape Portal",          desc: "Flee 1 Wild/Legendary battle safely (not usable in Nemesis Raids)", price: 5},
];
const SHOP_PRICES = Object.fromEntries(SHOP_ITEMS.map((i) => [i.key, i.price]));
// ✅ Maps a Digimon's current tier to the chip needed to instantly evolve it
export const EVO_CHIP_FOR_LEVEL = Object.fromEntries(SHOP_ITEMS.filter((i) => i.evoTier).map((i) => [i.evoTier, i.key]));
export const EVO_CHIP_LABEL = Object.fromEntries(SHOP_ITEMS.filter((i) => i.evoTier).map((i) => [i.key, i.label]));
// ✅ Reverse of the above: chip key -> the tier it targets (used to highlight eligible Digimon)
export const EVO_CHIP_TARGET_TIER = Object.fromEntries(SHOP_ITEMS.filter((i) => i.evoTier).map((i) => [i.key, i.evoTier]));
export const EVO_CHIP_KEYS = SHOP_ITEMS.filter((i) => i.evoTier).map((i) => i.key);

// ✅ Digi Coin reward per tier defeated (Wild/Legendary encounters only — Nemesis waves don't pay out)
const TIER_COIN_REWARD = {
  "Baby": 1, "Child": 1, "Adult": 2, "Perfect": 3, "Ultimate": 4, "Ultra": 6,
  "Armor": 2, "Unknown": 1, "Hybrid": 3,
};
function getCoinReward(level) {
  return TIER_COIN_REWARD[level] || 1;
}
export const STARTING_DIGICOIN = 5;
export const RESERVE_CAPACITY = 6;

export const COMBAT_WHEEL_PLAYER = [
  {type: "ATTACK",   label: "💥 Normal Attack", weight: 50},
  {type: "CRITICAL", label: "🔥 Critical Hit!",  weight: 20},
  {type: "MISS",     label: "💨 Miss/Defend",    weight: 30},
];

export const COMBAT_WHEEL_ENEMY = [
  {type: "ATTACK",   label: "💥 Normal Attack",        weight: 40},
  {type: "CRITICAL", label: "🔥 Critical Hit!",         weight: 15},
  {type: "MISS",     label: "💨 Miss/Defend",           weight: 25},
  {type: "HEAL",     label: "💚 Circuit Repair (Heal)", weight: 20},
];

export const WHEEL_COLORS = ["#3498db","#e67e22","#2ecc71","#9b59b6","#e74c3c","#f1c40f","#1abc9c"];

// ✅ Classic Digimon attribute triangle: Vaccine beats Virus, Virus beats Data, Data beats Vaccine.
// Attacking with the advantaged attribute grants a damage bonus; attacking into a disadvantage
// (i.e. the defender's attribute beats yours) applies a damage penalty instead.
export const ATTRIBUTE_ADVANTAGE = {
  "Vaccine": "Virus",
  "Virus": "Data",
  "Data": "Vaccine",
};
export const ATTRIBUTE_EMOJI = {
  "Vaccine": "💉",
  "Virus": "🦠",
  "Data": "💾",
  "Free": "🔷",
  "Variable": "🔶",
};
export function getAttributeEmoji(attr) {
  return ATTRIBUTE_EMOJI[attr] || "❓";
}
export const ATTRIBUTE_DAMAGE_BONUS = 1.10;
export const ATTRIBUTE_DAMAGE_PENALTY = 0.90;
function hasAttributeAdvantage(attackerAttr, defenderAttr) {
  return ATTRIBUTE_ADVANTAGE[attackerAttr] === defenderAttr;
}
function hasAttributeDisadvantage(attackerAttr, defenderAttr) {
  return ATTRIBUTE_ADVANTAGE[defenderAttr] === attackerAttr;
}

const CHRONOMON_DM_NAME = "Chronomon DM";
export const SAVE_KEY = "digiroulette_save";
export const BESTIARY_KEY = "digiroulette_bestiary_shop";
export const HIGHSCORE_KEY = "digiroulette_highscore_shop";
export const LEADERBOARD_KEY = "digiroulette_leaderboard_shop";

// ✅ CSV CACHING: the Google Sheets CSV endpoints (URLS above) rarely change mid-session, so
// re-fetching all 7 of them on every single load (including every "Continue" from the main
// menu) was pure wasted latency — and left the game dead in the water if the sheet was
// briefly unreachable, even though nothing about the data had actually changed. Cached copies
// are keyed by URL, timestamped, and treated as fresh for CSV_CACHE_TTL_MS; a normal load
// within that window skips the network entirely. Stale/expired cache is still kept as a
// fallback if a fresh fetch fails, so a flaky connection degrades to "slightly out of date"
// instead of "broken".
const CSV_CACHE_PREFIX = "digiroulette_csv_cache_";
const CSV_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function loadCsvCache(url) {
  try {
    const raw = localStorage.getItem(CSV_CACHE_PREFIX + url);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.data) || typeof parsed.savedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}
function saveCsvCache(url, data) {
  try {
    localStorage.setItem(CSV_CACHE_PREFIX + url, JSON.stringify({data, savedAt: Date.now()}));
  } catch {} // localStorage can be full/unavailable (private browsing, quota) — cache is a
  // pure bonus, never a requirement, so a failed write is silently ignored.
}

// ✅ Local leaderboard: keeps the best 5 runs (by score) with a bit of context per run
export function addToLeaderboard({score, wave, victory}) {
  try {
    const current = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
    const rank = getRank(score);
    const entry = {score, wave, victory: !!victory, rankLabel: `${rank.rank} — ${rank.label}`, date: Date.now()};
    const updated = [...current, entry].sort((a, b) => b.score - a.score).slice(0, 5);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function getLeaderboard() {
  try {return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");} catch {return [];}
}

export const SCORE_EVENTS = {
  WILD_DEFEATED:      50,
  VILLAIN_WAVE:       100,
  WAVE_NO_ITEMS:      200,
  WILD_CAPTURED:      150,
  LEGENDARY_CAPTURED: 300,
  CHRONOMON_DEFEATED: 500,
};

// ✅ Score breakdown: a structured, per-category tally (instead of just a running total) so
// the Game Over screen can show the player exactly where their points came from — enemies
// defeated, captures, and a per-wave record of what each Nemesis Raid wave paid out (clear
// bonus, no-items bonus, boss bonus). Built fresh via this factory (not a shared constant
// object) so every reset gets its own independent object, never an accidentally-shared one.
export function getDefaultScoreBreakdown() {
  return {
    enemiesDefeated: {count: 0, points: 0},
    wildCaptured: {count: 0, points: 0},
    legendaryCaptured: {count: 0, points: 0},
    waves: [], // [{wave, clearPoints, noItemBonus, bossBonus, total}]
  };
}

export const SCORE_RANKS = [
  {min: 10000, rank: "SS", label: "Chrono Savior"},
  {min: 8000,  rank: "S",  label: "Legendary Tamer"},
  {min: 5000,  rank: "A",  label: "Elite Commander"},
  {min: 2500,  rank: "B",  label: "Senior Tamer"},
  {min: 1000,  rank: "C",  label: "Field Agent"},
  {min: 0,     rank: "D",  label: "Rookie Tamer"},
];

export function getRank(score) {
  return SCORE_RANKS.find((r) => score >= r.min) || SCORE_RANKS[SCORE_RANKS.length - 1];
}

function loadBestiary() {
  try {return JSON.parse(localStorage.getItem(BESTIARY_KEY) || "[]");} catch {return [];}
}

// ✅ Only called on capture and egg hatch — not on encounter/battle
function saveBestiaryEntry(name) {
  try {
    const current = loadBestiary();
    if (!current.includes(name)) localStorage.setItem(BESTIARY_KEY, JSON.stringify([...current, name]));
  } catch {}
}

function loadSave() {
  try {return JSON.parse(localStorage.getItem(SAVE_KEY) || "null");} catch {return null;}
}

function clearSave() {
  try {localStorage.removeItem(SAVE_KEY);} catch {}
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickUniqueRandom(pool, count, recentlyUsed = []) {
  if (!pool.length) return [];
  const preferred = pool.filter((n) => !recentlyUsed.includes(n));
  const source = preferred.length >= count ? preferred : pool;
  const shuffled = shuffleArray(source);
  const picks = [];
  for (let i = 0; i < count; i++) picks.push(shuffled[i % shuffled.length]);
  return picks;
}

// ✅ SPECIES STAT VARIANCE: deterministic ±15% hp/power multiplier hashed from the Digimon's
// name, so two Digimon sharing a tier no longer have identical stats. Same species always
// gets the same multiplier — it's stable, not re-rolled per encounter. Applied only where a
// Digimon's stats are first built from the sheet (findDigimonInSheetData/fallbackStatsObject),
// so Legendary encounters and the Wave 8 boss — which explicitly force fixed stats afterward —
// stay untouched by it, on purpose.
// ✅ PER-TIER EVOLUTION FX: normalizes a level string into one of the seven buckets the
// evolution overlay/SFX are themed around. When called with the PRE-evolution level, it's
// the origin bucket (e.g. "Ultimate → Ultra" and "Ultra → Ultra" land in different origin
// buckets only via the destination check the callers do — see evoTier logic at each call
// site). "Ultra+" is the new capstone tier that sits above Ultra.
function normalizeEvoTier(level) {
  const l = (level || "").toLowerCase().trim();
  if (l.startsWith("baby")) return "baby";
  if (l === "child") return "child";
  if (l === "adult") return "adult";
  if (l === "perfect") return "perfect";
  if (l === "ultimate") return "ultimate";
  if (l === "ultra+" || l === "ultraplus" || l === "omega") return "ultraplus";
  if (l === "ultra" || l === "mega") return "ultra";
  return "child";
}

function hashNameToUnit(name) {
  let hash = 0;
  const str = name || "";
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000; // 0 .. 0.999
}
function getStatVariance(name) {
  return 0.85 + hashNameToUnit(name) * 0.30; // 0.85 .. 1.15
}

// ✅ DIFFICULTY: a single global Easy/Normal/Hard toggle (shared with RNG mode via the same
// localStorage key, set from the Settings modal). Scales every enemy's hp/power — including
// Legendary and the boss, unlike species variance above — and nudges capture/evolution odds.
// Never touches the player's own party.
const DIFFICULTY_KEY = "digiroulette_difficulty";
const DIFFICULTY_LEVELS = {
  easy:   {enemyMult: 0.85, oddsMult: 1.15},
  normal: {enemyMult: 1.00, oddsMult: 1.00},
  hard:   {enemyMult: 1.15, oddsMult: 0.85},
};
function getDifficultySettings() {
  try {
    const saved = localStorage.getItem(DIFFICULTY_KEY) || "normal";
    return DIFFICULTY_LEVELS[saved] || DIFFICULTY_LEVELS.normal;
  } catch {
    return DIFFICULTY_LEVELS.normal;
  }
}
function scaleEnemyForDifficulty(digi) {
  const {enemyMult} = getDifficultySettings();
  const scaledHp = Math.max(1, Math.round(digi.maxHp * enemyMult));
  const scaledPower = Math.max(1, Math.round(digi.power * enemyMult));
  return {...digi, hp: scaledHp, maxHp: scaledHp, baseMaxHp: scaledHp, power: scaledPower};
}

// ✅ EVOLUTION ANIMATION SETTINGS: one on/off toggle per evolution tier (Evolution/Super/Mega/
// Ultra), keyed by the same chip keys as EVO_CHIP_FOR_LEVEL so the source tier of an evolution
// (chip-based or wheel-based) maps directly to a setting. Shared localStorage key/shape with
// RNG mode, same as music/SFX/reduced-motion settings.
export const EVO_ANIM_SETTINGS_KEY = "digiroulette_evo_anim_settings";
export const EVO_ANIM_DEFAULT_SETTINGS = {evoChipBasic: true, evoChipSuper: true, evoChipMega: true, evoChipUltra: true, evoChipOmega: true};
export function loadEvoAnimSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(EVO_ANIM_SETTINGS_KEY) || "null");
    if (!stored || typeof stored !== "object") return {...EVO_ANIM_DEFAULT_SETTINGS};
    return {...EVO_ANIM_DEFAULT_SETTINGS, ...stored};
  } catch {
    return {...EVO_ANIM_DEFAULT_SETTINGS};
  }
}
function scaleOddsForDifficulty(basePercent) {
  const {oddsMult} = getDifficultySettings();
  return Math.max(5, Math.min(95, Math.round(basePercent * oddsMult)));
}

// ✅ SELLING: base coin value by species tier (matches the sheet's raw `level` values —
// same bucket set as STAGE_STATS), scaled down by the Digimon's current HP fraction so a
// battered Digimon fetches less at the counter. Exported as a pure function (no hook state
// needed) so the UI can preview the exact payout before the player actually sells.
const SELL_BASE_PRICE = {
  baby: 1, child: 2, adult: 3, perfect: 5, ultimate: 6, ultra: 7, "ultra+": 9,
  armor: 3, unknown: 2, hybrid: 5,
};
export function computeSellPrice(digimon) {
  if (!digimon || digimon.hp <= 0) return 0;
  const l = (digimon.level || "").toLowerCase().trim();
  const key = (l === "ultraplus" || l === "omega") ? "ultra+" : l;
  const basePrice = key.startsWith("baby") ? SELL_BASE_PRICE.baby : (SELL_BASE_PRICE[key] ?? SELL_BASE_PRICE.unknown);
  const hpRatio = digimon.maxHp > 0 ? digimon.hp / digimon.maxHp : 0;
  return Math.max(1, Math.round(basePrice * hpRatio));
}

const DEFAULT_INVENTORY = {potion: 4, chipStrength: 2, chipEndurance: 2, revivePotion: 3, evoChipBasic: 0, evoChipSuper: 0, evoChipMega: 0, evoChipUltra: 0, evoChipOmega: 0, escapePortal: 1};
const DEFAULT_BUFFS = {strengthMultiplier: 1.0, enduranceMultiplier: 1.0};

// ✅ ONE-TIME MIGRATION: before high score/leaderboard/bestiary were split per-mode, both Shop
// and RNG mode read/wrote the same three shared keys. Shop mode keeps those old keys' data
// (RNG mode starts fresh, since it can't tell which prior runs were RNG vs Shop). Copies only
// if the new key doesn't exist yet, so this is safe to run on every mount and never clobbers
// progress made since the split.
function migrateLegacySharedProgress() {
  try {
    const LEGACY_HIGHSCORE_KEY = "digiroulette_highscore";
    const LEGACY_LEADERBOARD_KEY = "digiroulette_leaderboard";
    const LEGACY_BESTIARY_KEY = "digiroulette_bestiary";
    [
      [LEGACY_HIGHSCORE_KEY, HIGHSCORE_KEY],
      [LEGACY_LEADERBOARD_KEY, LEADERBOARD_KEY],
      [LEGACY_BESTIARY_KEY, BESTIARY_KEY],
    ].forEach(([legacyKey, newKey]) => {
      const legacyValue = localStorage.getItem(legacyKey);
      if (legacyValue !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, legacyValue);
      }
    });
  } catch {}
}

export function useDigimonGame(autoResume = false) {
  const [db, setDb] = useState([]);
  const [starters, setStarters] = useState([]);
  const [catchablePool, setCatchablePool] = useState(["Veemon"]);
  const [babyPool, setBabyPool] = useState(["Botamon"]);
  const [legendaryPool, setLegendaryPool] = useState(["Omegamon"]);
  const [villainPool, setVillainPool] = useState([]);
  const [bossPool, setBossPool] = useState([CHRONOMON_DM_NAME]);
  const [fullRoster, setFullRoster] = useState([]);

  const [party, setParty] = useState([]);
  const [reserve, setReserve] = useState([]);
  const [inventory, setInventory] = useState(DEFAULT_INVENTORY);
  const [digiCoin, setDigiCoin] = useState(STARTING_DIGICOIN);
  const [temporaryBuffs, setTemporaryBuffs] = useState(DEFAULT_BUFFS);

  const [phase, setPhase] = useState("loading");
  const [loadingMsg, setLoadingMsg] = useState("Synchronizing Multi-Array Databases...");
  const [loadError, setLoadError] = useState(false);
  const [log, setLog] = useState([]);
  const [announcement, setAnnouncement] = useState("Establishing cloud connections...");

  const [activeWheelType, setActiveWheelType] = useState("WORLD");
  const [wheelSegments, setWheelSegments] = useState(WORLD_WHEEL);
  const [pendingSubPool, setPendingSubPool] = useState([]);

  const [worldSpinCount, setWorldSpinCount] = useState(0);
  const [villainWaveStage, setVillainWaveStage] = useState(0);
  const [isVillainBattle, setIsVillainBattle] = useState(false);

  const [enemySquad, setEnemySquad] = useState([]);
  const [currentEnemyIdx, setCurrentEnemyIdx] = useState(0);
  const [isLegendaryBattle, setIsLegendaryBattle] = useState(false);
  const [isWildBattle, setIsWildBattle] = useState(false);
  const [lastDefeatedEnemy, setLastDefeatedEnemy] = useState(null);
  const [lastDefeatedEnemyTier, setLastDefeatedEnemyTier] = useState("Child");
  const [wildCaptureQueue, setWildCaptureQueue] = useState([]);
  const [pendingCapture, setPendingCapture] = useState(null); // {reward, onDone} | null
  const [combatTurn, setCombatTurn] = useState("PLAYER");

  const [score, setScore] = useState(0);
  const [scoreBreakdown, setScoreBreakdown] = useState(getDefaultScoreBreakdown);
  const [waveUsedItems, setWaveUsedItems] = useState(false);
  const [evolvingPartyIdx, setEvolvingPartyIdx] = useState(null);
  const [evolvingReserveIdx, setEvolvingReserveIdx] = useState(null);
  // ✅ Which of the 6 evolution FX buckets (baby/child/adult/perfect/ultimate/ultra) the
  // CURRENT in-progress evolution belongs to — only one evolution can run at a time
  // (isEvolvingRef), so a single piece of state covers both party and reserve evolutions.
  const [evolvingTier, setEvolvingTier] = useState(null);
  const [evoAnimSettings, setEvoAnimSettings] = useState(loadEvoAnimSettings);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);
  const [enemyHitAnim, setEnemyHitAnim] = useState(null);
  const [playerHitAnim, setPlayerHitAnim] = useState(null);
  const [partyHealAnim, setPartyHealAnim] = useState(null);
  const [enemyHealAnim, setEnemyHealAnim] = useState(null);
  // ✅ PRE-BATTLE PARTY SETUP: when an encounter (Wild/Legendary/Nemesis wave) is about to
  // start, the enemy squad and all the "how combat should begin" data (announcement, BGM
  // track, log line) are staged here instead of being applied immediately. Phase flips to
  // "party_setup" so the player can freely reorder/heal/revive/swap before confirming —
  // confirmBattleSetup() below is what actually applies this and starts combat.
  const [pendingBattleInit, setPendingBattleInit] = useState(null);

  const recentVillainsRef = useRef({});
  const isEvolvingRef = useRef(false);
  // ✅ BUGFIX: switchToWorldWheel() can be invoked synchronously in the same tick as the
  // setWorldSpinCount(prev => prev+1) call above it (e.g. TRAIN landing on a squad already at
  // peak form) — React batches that state update, so a plain `worldSpinCount` read inside
  // switchToWorldWheel would still see the OLD value and never trip the >=4 check, letting the
  // count silently climb past 4 without ever triggering a Nemesis Raid. This ref is updated
  // synchronously alongside every setWorldSpinCount call so the trigger check always sees the
  // true current count regardless of timing.
  const worldSpinCountRef = useRef(0);
  // ✅ PERF: debounced save timer + a ref that always points at the CURRENT render's
  // buildSaveState closure, so a delayed flush never writes stale pre-hit HP numbers —
  // see the persistSave useEffect below for how these are used together.
  const persistTimeoutRef = useRef(null);
  const buildSaveStateRef = useRef(null);
  // ✅ PERF: one shared CSV-parse worker per hook instance — see utils/csvWorker.js. Created
  // lazily on first use (loadGameData) rather than up front, and torn down on unmount so a
  // switch back to the main menu doesn't leave a dangling worker thread running.
  const csvWorkerRef = useRef(null);
  useEffect(() => () => {
    if (csvWorkerRef.current) {csvWorkerRef.current.terminate(); csvWorkerRef.current = null;}
  }, []);

  const addLog = (msg) => setLog((prev) => [msg, ...prev]);
  const addScore = (points) => setScore((prev) => prev + points);
  // ✅ Records a scoring event into the breakdown AND applies it to the running total in one
  // call, so every "why did my score go up" moment is captured for the Game Over recap.
  const recordScoreEvent = (category, points) => {
    addScore(points);
    setScoreBreakdown((prev) => ({
      ...prev,
      [category]: {count: prev[category].count + 1, points: prev[category].points + points},
    }));
  };
  // ✅ One Nemesis Raid wave can pay out up to three components at once (clear bonus, no-items
  // bonus, wave-8 boss bonus) — bundled into a single wave record so the recap can show
  // "Wave 3: +300 (clear +100, no items +200)" instead of three anonymous line items.
  const recordWaveScore = (waveNum, clearPoints, noItemBonus, bossBonus) => {
    const total = clearPoints + noItemBonus + bossBonus;
    addScore(total);
    setScoreBreakdown((prev) => ({...prev, waves: [...prev.waves, {wave: waveNum, clearPoints, noItemBonus, bossBonus, total}]}));
  };
  const triggerEnemyHit = (isCrit = false, amount = 0) => {
    const ts = Date.now();
    setEnemyHitAnim({type: isCrit ? "crit" : "hit", ts, amount});
    setTimeout(() => setEnemyHitAnim((prev) => (prev && prev.ts === ts ? null : prev)), 1000);
  };
  const triggerPlayerHit = (idx, isCrit = false, amount = 0) => {
    const ts = Date.now();
    setPlayerHitAnim({idx, type: isCrit ? "crit" : "hit", ts, amount});
    setTimeout(() => setPlayerHitAnim((prev) => (prev && prev.ts === ts ? null : prev)), 1000);
  };
  const triggerPartyHeal = (idx, amount) => {
    const ts = Date.now();
    setPartyHealAnim({idx, amount, ts});
    setTimeout(() => setPartyHealAnim((prev) => (prev && prev.ts === ts ? null : prev)), 1000);
  };
  const triggerEnemyHeal = (amount) => {
    const ts = Date.now();
    setEnemyHealAnim({amount, ts});
    setTimeout(() => setEnemyHealAnim((prev) => (prev && prev.ts === ts ? null : prev)), 1000);
  };
  // ✅ BUGFIX: clear leftover hit/heal state before starting a new encounter — otherwise a stale
  // float (e.g. from the previous enemy healing itself) would replay when the new enemy's
  // display subtree mounts, since the "no active threat" placeholder unmounts it in between.
  const resetCombatFloats = () => {
    setEnemyHitAnim(null);
    setEnemyHealAnim(null);
    setPlayerHitAnim(null);
    setPartyHealAnim(null);
  };

  const buildSaveState = () => ({
    party, reserve, inventory, digiCoin, log,
    worldSpinCount, villainWaveStage, isVillainBattle,
    enemySquad, currentEnemyIdx, isLegendaryBattle, isWildBattle,
    lastDefeatedEnemyTier, combatTurn, score, scoreBreakdown, waveUsedItems,
    activeWheelType, wheelSegments, pendingSubPool, phase, announcement,
    pendingBattleInit,
    recentVillains: recentVillainsRef.current,
    savedAt: Date.now(),
  });

  const persistSave = (state) => {
    try {localStorage.setItem(SAVE_KEY, JSON.stringify(state));} catch {}
  };

  // ✅ Always kept current so a debounced/deferred flush (below, or from the
  // visibilitychange/pagehide guard) never serializes a stale closure.
  buildSaveStateRef.current = buildSaveState;

  // ✅ Bypasses the debounce and writes immediately — used for checkpoint phases and for
  // "the tab is about to go away" safety nets, where losing the last few seconds of state
  // to a pending debounce timer would actually cost the player progress.
  const flushSaveNow = () => {
    if (persistTimeoutRef.current) {clearTimeout(persistTimeoutRef.current); persistTimeoutRef.current = null;}
    if (buildSaveStateRef.current) persistSave(buildSaveStateRef.current());
  };

  const restoreFromSave = (save) => {
    setParty(save.party || []);
    setReserve(save.reserve || []);
    setInventory(save.inventory || DEFAULT_INVENTORY);
    setDigiCoin(save.digiCoin ?? STARTING_DIGICOIN);
    setLog(save.log || []);
    setWorldSpinCount(save.worldSpinCount || 0);
    worldSpinCountRef.current = save.worldSpinCount || 0;
    setVillainWaveStage(save.villainWaveStage || 0);
    setIsVillainBattle(save.isVillainBattle || false);
    setEnemySquad(save.enemySquad || []);
    setCurrentEnemyIdx(save.currentEnemyIdx || 0);
    setIsLegendaryBattle(save.isLegendaryBattle || false);
    setIsWildBattle(save.isWildBattle || false);
    setLastDefeatedEnemyTier(save.lastDefeatedEnemyTier || "Child");
    setCombatTurn(save.combatTurn || "PLAYER");
    setScore(save.score || 0);
    setScoreBreakdown(save.scoreBreakdown || getDefaultScoreBreakdown());
    setWaveUsedItems(save.waveUsedItems || false);
    setActiveWheelType(save.activeWheelType || "WORLD");
    setWheelSegments(save.wheelSegments || getWorldWheelSegments(save.digiCoin ?? STARTING_DIGICOIN));
    setPendingSubPool(save.pendingSubPool || []);
    setAnnouncement(save.announcement || "");
    setPendingBattleInit(save.pendingBattleInit || null);
    recentVillainsRef.current = save.recentVillains || {};
    setPhase(save.phase || "world_wheel");
  };

  useEffect(() => {
    migrateLegacySharedProgress();
  }, []);

  // ✅ FIX: a slow/hung network request (flaky mobile connection) could leave Promise.all
  // waiting forever — no timeout meant no error, no retry, just an infinite spinner. Each
  // fetch now races against a 15s timeout so a stuck request surfaces as a real, retryable
  // error instead of silently hanging. Extracted into its own function so both the initial
  // mount AND a manual retry can call the exact same load sequence.
  const DATA_FETCH_TIMEOUT_MS = 15000;
  const withTimeout = (promise, label) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out loading ${label}`)), DATA_FETCH_TIMEOUT_MS)),
  ]);

  const loadGameData = (forceRefresh = false) => {
    setLoadError(false);
    setLoadingMsg("Synchronizing Multi-Array Databases...");
    const fetchAndParse = (url, label) => {
      const cached = loadCsvCache(url);
      // ✅ A manual Retry (forceRefresh=true) always goes to the network — that's specifically
      // what Retry is for — but a normal load happily serves a cache entry under an hour old.
      const isFresh = !forceRefresh && cached && (Date.now() - cached.savedAt < CSV_CACHE_TTL_MS);
      if (isFresh) return Promise.resolve(cached.data);

      // ✅ PERF: the actual download + CSV parse now happens inside a Web Worker (see
      // utils/csvWorker.js) instead of blocking the main thread — parsing all 7 sheets used
      // to run synchronously right as the loading screen mounted, which could visibly hitch
      // its scan-ring animation on lower-end phones.
      if (!csvWorkerRef.current) csvWorkerRef.current = createCsvWorker();
      return withTimeout(
        parseCsvViaWorker(csvWorkerRef.current, url, label).then((data) => {
          saveCsvCache(url, data);
          return data;
        }),
        label
      ).catch((err) => {
        // ✅ Offline resilience: a failed fetch falls back to ANY previously cached copy,
        // however stale, rather than taking the whole game down over one dead connection.
        if (cached) {
          console.warn(`CSV cache fallback for ${label} (network fetch failed):`, err);
          return cached.data;
        }
        throw err;
      });
    };

    Promise.all([
      fetchAndParse(URLS.STARTERS, "Starters"),
      fetchAndParse(URLS.WILD, "Wild Digimon"),
      fetchAndParse(URLS.EGGS, "Digi-Eggs"),
      fetchAndParse(URLS.LEGENDARY, "Legendary"),
      fetchAndParse(URLS.VILLAINS, "Villains"),
      fetchAndParse(URLS.EVOLUTIONS, "Evolutions"),
      fetchAndParse(URLS.BOSSES, "Bosses")
    ])
    .then(([startersData, wildData, eggsData, legendaryData, villainsData, evolutionsData, bossesData]) => {
      const masterDatabase = [...startersData, ...wildData, ...eggsData, ...legendaryData, ...villainsData, ...evolutionsData, ...bossesData];
      setDb(masterDatabase);
      // ✅ fullRoster includes level + hp/power (with the same species variance used in
      // battle) for tier categorization and stat display in the Bestiary.
      // ✅ BUGFIX: the same species can legitimately appear on more than one sheet tab (e.g.
      // as both a Wild encounter row AND the target of an Evolutions row) — deduping here by
      // name (first occurrence wins) keeps the Bestiary from showing that Digimon twice,
      // regardless of how many tabs reference it.
      const seenRosterNames = new Set();
      const dedupedRoster = [];
      masterDatabase.forEach((d) => {
        if (!d || !d.name) return;
        const key = d.name.toLowerCase().trim();
        if (seenRosterNames.has(key)) return;
        seenRosterNames.add(key);
        const variance = getStatVariance(d.name);
        dedupedRoster.push({
          name: d.name,
          imageUrl: d.imageUrl || "",
          level: d.level || "Child",
          hp: Math.max(1, Math.round((parseInt(d.hp) || 100) * variance)),
          power: Math.max(1, Math.round((parseInt(d.power) || 3) * variance)),
        });
      });
      setFullRoster(dedupedRoster);
      setStarters(startersData.map((d) => {
        // ✅ FIX: this preview used to show RAW sheet hp/power, but chooseStarter() actually
        // hands off to findDigimonInSheetData(), which applies the ±15% species variance —
        // so the number shown here often didn't match what the player actually got. Applying
        // the same getStatVariance(d.name) here makes the preview exactly match gameplay.
        const variance = getStatVariance(d.name);
        return {
          dapiName: d.name,
          displayLabel: d.name,
          image: d.imageUrl || `https://placehold.co/150x150/16171d/fff?text=${encodeURIComponent(d.name)}`,
          attribute: d.attribute || "Vaccine",
          level: (d.level || "Child").toLowerCase().startsWith("baby") ? "Baby" : (d.level || "Child"),
          power: Math.max(1, Math.round((parseInt(d.power) || 3) * variance)),
          hp: Math.max(1, Math.round((parseInt(d.hp) || 100) * variance)),
        };
      }));
      setCatchablePool(wildData.length ? wildData.map((d) => d.name) : ["Veemon"]);
      setBabyPool(eggsData.length ? eggsData.map((d) => d.name) : ["Botamon"]);
      setLegendaryPool(legendaryData.length ? legendaryData.map((d) => d.name) : ["Omegamon"]);
      setVillainPool(villainsData);
      setBossPool(bossesData.length ? bossesData.map((d) => d.name) : [CHRONOMON_DM_NAME]);

      const save = loadSave();
      if (save && save.phase && save.phase !== "start") {
        if (autoResume) {
          restoreFromSave(save);
          addLog("▶️ Run resumed from saved state.");
          if (sfx.startBGM) sfx.startBGM(save.villainWaveStage === 8 ? "BOSS" : save.isVillainBattle ? "BATTLE" : "WORLD");
        } else {
          setPendingSave(save);
          setShowResumePrompt(true);
          setPhase("resume_prompt");
        }
      } else {
        setPhase("start");
        setAnnouncement("Select your partner to begin your journey!");
      }
      setLoadingMsg("");
    })
    .catch((err) => {
      console.error("Database sync failed:", err);
      setLoadError(true);
      setLoadingMsg("Connection timed out or failed. Check your network and tap Retry.");
    });
  };

  useEffect(() => {
    loadGameData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!["world_wheel","combat","sub_wheel","shop","party_setup","victory","game_over"].includes(phase)) return;
    // ✅ PERF: this effect's own deps (party/reserve/inventory/score/etc.) fire on every
    // single combat tick — a hit, a heal, a wheel result — which used to mean a synchronous
    // JSON.stringify + localStorage.setItem on the main thread for every one of those, right
    // in the middle of the busiest UI moments. Debouncing lets a burst of rapid-fire changes
    // settle for 800ms before actually writing, collapsing dozens of writes into one. Run-
    // ending checkpoints (victory/game_over) skip the debounce and write immediately, since
    // there's no "next tick" coming to catch a missed save.
    if (persistTimeoutRef.current) {clearTimeout(persistTimeoutRef.current); persistTimeoutRef.current = null;}
    if (phase === "victory" || phase === "game_over") {
      persistSave(buildSaveState());
    } else {
      persistTimeoutRef.current = setTimeout(() => {
        persistTimeoutRef.current = null;
        persistSave(buildSaveState());
      }, 800);
    }
  }, [phase, party, reserve, inventory, digiCoin, worldSpinCount, villainWaveStage, score, pendingBattleInit]);

  // ✅ Guarantees a pending debounced save isn't lost if the player backgrounds/closes the
  // tab mid-battle — the same safety net pattern already used for audio in GameScreen.jsx.
  useEffect(() => {
    const handleVisibility = () => {if (document.hidden) flushSaveNow();};
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", flushSaveNow);
    window.addEventListener("beforeunload", flushSaveNow);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", flushSaveNow);
      window.removeEventListener("beforeunload", flushSaveNow);
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResume = (yes) => {
    setShowResumePrompt(false);
    if (yes && pendingSave) {
      restoreFromSave(pendingSave);
      addLog("▶️ Run resumed from saved state.");
      if (sfx.startBGM) sfx.startBGM(pendingSave.villainWaveStage === 8 ? "BOSS" : pendingSave.isVillainBattle ? "BATTLE" : "WORLD");
    } else {
      clearSave();
      setPhase("start");
      setAnnouncement("Select your partner to begin your journey!");
    }
    setPendingSave(null);
  };

  const resetToStart = () => {
    setParty([]); setReserve([]);
    setInventory(DEFAULT_INVENTORY);
    setDigiCoin(STARTING_DIGICOIN);
    setTemporaryBuffs(DEFAULT_BUFFS);
    setLog([]); setWorldSpinCount(0); setVillainWaveStage(0);
    worldSpinCountRef.current = 0;
    setIsVillainBattle(false); setIsWildBattle(false);
    setEnemySquad([]); setCurrentEnemyIdx(0);
    setIsLegendaryBattle(false); setLastDefeatedEnemy(null);
    setLastDefeatedEnemyTier("Child");
    setWildCaptureQueue([]);
    setPendingCapture(null);
    setPendingBattleInit(null);
    setEnemyHitAnim(null); setPlayerHitAnim(null);
    setEnemyHealAnim(null); setPartyHealAnim(null);
    setScore(0); setScoreBreakdown(getDefaultScoreBreakdown()); setWaveUsedItems(false);
    setEvolvingPartyIdx(null);
    setEvolvingReserveIdx(null);
    recentVillainsRef.current = {};
    isEvolvingRef.current = false;
    clearSave();
    if (sfx.stopBGM) sfx.stopBGM();
    setPhase("start");
    setCombatTurn("PLAYER");
    setAnnouncement("Select your partner to begin your journey!");
  };

  function findDigimonInSheetData(dapiName) {
    if (!dapiName) return fallbackStatsObject("Unknown");
    const matched = db.find((d) => d && d.name && d.name.toLowerCase().trim() === dapiName.toLowerCase().trim());
    if (matched) {
      let matchedLevel = matched.level || "Child";
      if (matchedLevel.toLowerCase().startsWith("baby")) matchedLevel = "Baby";
      const parsedHp = parseInt(matched.hp) || 100;
      const parsedPower = parseInt(matched.power) || 3;
      const variance = getStatVariance(matched.name);
      const variedHp = Math.max(1, Math.round(parsedHp * variance));
      const variedPower = Math.max(1, Math.round(parsedPower * variance));
      return {
        id: Math.floor(Math.random() * 100000) + Date.now(),
        name: matched.name, level: matchedLevel,
        attribute: matched.attribute || "Virus",
        image: matched.imageUrl || `https://placehold.co/150x150/16171d/fff?text=${encodeURIComponent(matched.name)}`,
        hp: variedHp, maxHp: variedHp, baseMaxHp: variedHp,
        power: variedPower, nextFormName: matched.nextEvolution || null
      };
    }
    return fallbackStatsObject(dapiName);
  }

  function fallbackStatsObject(dapiName) {
    const s = STAGE_STATS["Child"];
    const variance = getStatVariance(dapiName);
    const variedHp = Math.max(1, Math.round(s.maxHp * variance));
    const variedPower = Math.max(1, Math.round(s.power * variance));
    return {
      id: Math.floor(Math.random() * 100000) + Date.now(),
      name: dapiName, level: "Child", attribute: "Virus",
      image: `https://placehold.co/150x150/16171d/fff?text=${encodeURIComponent(dapiName)}`,
      hp: variedHp, maxHp: variedHp, baseMaxHp: variedHp,
      power: variedPower, nextFormName: null
    };
  }

  const chooseStarter = async (starterObj) => {
    if (!starterObj) return;
    setLoadingMsg(`Summoning ${starterObj.displayLabel || "Starter"}...`);
    try {
      const detailed = findDigimonInSheetData(starterObj.dapiName);
      // ✅ Starters do NOT fill bestiary — only captures and hatches do
      setParty([detailed]);
      addLog(`Selected ${detailed.name} as your partner!`);
      setPhase("world_wheel");
      setActiveWheelType("WORLD");
      setWheelSegments(getWorldWheelSegments(STARTING_DIGICOIN));
      setWorldSpinCount(0); setScore(0); setScoreBreakdown(getDefaultScoreBreakdown()); setDigiCoin(STARTING_DIGICOIN);
      worldSpinCountRef.current = 0;
      setAnnouncement("Roll the wheel to explore! (Nemesis Raid in 4 spins)");
      if (sfx.startBGM) sfx.startBGM("WORLD");
    } catch {
      addLog("Failed to process initialization.");
    } finally {
      setLoadingMsg("");
    }
  };

  const switchToWorldWheel = () => {
    if (isVillainBattle && villainWaveStage >= 8) {
      removeTemporaryBattleBuffs();
      const totalHp = party.reduce((sum, d) => sum + (d?.hp || 0), 0);
      const totalMaxHp = party.reduce((sum, d) => sum + (d?.maxHp || 1), 0);
      const multiplier = 1 + (totalHp / totalMaxHp);
      const finalScore = Math.round(score * multiplier);
      setScore(finalScore);
      try {
        const prev = parseInt(localStorage.getItem(HIGHSCORE_KEY) || "0");
        if (finalScore > prev) localStorage.setItem(HIGHSCORE_KEY, String(finalScore));
      } catch {}
      addToLeaderboard({score: finalScore, wave: 8, victory: true});
      setPhase("victory");
      setAnnouncement("👑 VICTORY! All 8 waves cleared! The Digital World is saved!");
      addLog("🏆 CHRONO CORE SECURED: Grand Nemesis threat terminated.");
      clearSave();
      return;
    }
    setIsVillainBattle(false); setIsWildBattle(false);
    if (worldSpinCountRef.current >= 4) {
      setWorldSpinCount(0);
      worldSpinCountRef.current = 0;
      triggerForcedVillainBattle();
      return;
    }
    setPhase("world_wheel");
    setActiveWheelType("WORLD");
    setWheelSegments(getWorldWheelSegments(digiCoin));
    setAnnouncement(`Exploration clear. [Spins until Nemesis Raid: ${4 - worldSpinCount}]`);
    if (sfx.startBGM) sfx.startBGM("WORLD");
  };

  const executeEvolutionForIndex = async (index, member) => {
    // ✅ FIX 1: Guard — prevent re-entry if evolution animation already running
    if (isEvolvingRef.current) return false;
    if (!member) return false;
    const lookupDetails = findDigimonInSheetData(member.name);
    const nextFormName = lookupDetails.nextFormName;
    if (!nextFormName || nextFormName.toLowerCase().trim() === "peak form" || nextFormName.trim() === "") {
      addLog(`🏋️ ${member.name} has achieved peak physical output.`);
      return false;
    }
    isEvolvingRef.current = true; // 🔒 Lock — wheel can still spin, but evolution won't re-trigger
    const evolvedDetails = findDigimonInSheetData(nextFormName);
    // ✅ MOBILE PERF: warm the browser's image cache during the ~1s pre-swap wait below,
    // so by the time the overlay reveals this sprite it's already decoded — no pop-in.
    if (evolvedDetails.image) {
      const preloadImg = new Image();
      preloadImg.src = evolvedDetails.image;
    }
    const evoChipKey = EVO_CHIP_FOR_LEVEL[member.level];
    const shouldAnimate = evoChipKey ? (evoAnimSettings[evoChipKey] !== false) : true;
    // ✅ PER-TIER FX: bucket by the Digimon's level BEFORE it evolves, so the overlay/SFX
    // shown match the transition actually happening (e.g. Baby→Child looks/sounds different
    // from Ultra→Ultra even though both end on their respective sheet's "next form"). Special
    // case: Ultra climbing all the way to the new Ultra+ capstone tier gets its OWN bucket
    // instead of sharing the same-tier Ultra→Ultra "reforge" bucket.
    const originTier = normalizeEvoTier(member.level);
    const destTier = normalizeEvoTier(evolvedDetails.level);
    const evoTier = (originTier === "ultra" && destTier === "ultraplus") ? "ultraplus" : originTier;
    setEvolvingTier(evoTier);

    if (shouldAnimate) {
      setLoadingMsg("Restructuring digital data blocks...");
      setEvolvingPartyIdx(index);
      if (sfx.playEvolutionTierSFX) sfx.playEvolutionTierSFX(evoTier);
      else if (sfx.playTransformSFX) sfx.playTransformSFX();
      if (sfx.hapticEvolutionTier) sfx.hapticEvolutionTier(evoTier);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setParty((prevParty) => {
      const updated = [...prevParty];
      updated[index] = evolvedDetails;
      return updated;
    });
    addLog(`✨ EVOLUTION: ${member.name} → ${evolvedDetails.name}!`);
    setAnnouncement(`✨ Evolution Complete: ${member.name} → ${evolvedDetails.name}!`);

    if (shouldAnimate) {
      setLoadingMsg("");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setEvolvingPartyIdx(null);
    } else if (sfx.playEvolutionTierSFX) {
      sfx.playEvolutionTierSFX(evoTier);
      if (sfx.hapticEvolutionTier) sfx.hapticEvolutionTier(evoTier);
    } else if (sfx.playTransformSFX) {
      sfx.playTransformSFX();
    }
    setEvolvingTier(null);
    isEvolvingRef.current = false; // 🔓 Unlock
    return true;
  };

  const removeTemporaryBattleBuffs = () => {
    setTemporaryBuffs(DEFAULT_BUFFS);
    setParty((prevParty) => prevParty.map((member) => {
      const base = member.baseMaxHp || member.maxHp;
      return {...member, maxHp: base, hp: Math.min(member.hp, base)};
    }));
  };

  const triggerEvolutionSelectionOrExecution = (eligibleMembers) => {
    if (eligibleMembers.length === 0) return switchToWorldWheel();
    if (eligibleMembers.length === 1) {
      const target = eligibleMembers[0];
      executeEvolutionForIndex(target.originalIdx, target.member).then(() => {
        switchToWorldWheel();
      });
    } else {
      const partySegments = eligibleMembers.map((item) => ({
        type: `CHOOSE_MEMBER_${item.originalIdx}`,
        label: `🧬 Evolve ${item.member.name}`,
        weight: 100 / eligibleMembers.length,
        metaIndex: item.originalIdx
      }));
      setPendingSubPool(partySegments);
      setActiveWheelType("POST_BATTLE_TARGET");
      setWheelSegments(partySegments);
      setPhase("sub_wheel");
      setAnnouncement("🧬 Spin to choose who evolves!");
    }
  };

  const proceedToEvolutionWheel = (tierString) => {
    if (isVillainBattle && villainWaveStage >= 8) return switchToWorldWheel();
    let normalizedTier = tierString.toLowerCase().trim();
    if (normalizedTier.startsWith("baby")) normalizedTier = "baby";
    const tierOddsMap = {
      "baby": 35, "child": 40, "adult": 55,
      "perfect": 65, "ultimate": 70, "ultra": 85
    };
    const successChance = scaleOddsForDifficulty(tierOddsMap[normalizedTier] || 45);
    setPhase("sub_wheel");
    setActiveWheelType("POST_BATTLE_CHANCE");
    setWheelSegments([
      {type: "EVO_YES", label: `✨ Evolution! (${successChance}%)`, weight: successChance},
      {type: "EVO_NO",  label: `❌ No Evolution (${100 - successChance}%)`, weight: 100 - successChance}
    ]);
    setAnnouncement(`🎰 Evolution chance: ${successChance}% window detected!`);
  };

  const proceedToWildCaptureWheel = (defeatedEnemy) => {
    setLastDefeatedEnemy(defeatedEnemy);
    setPhase("sub_wheel");
    setActiveWheelType("WILD_CAPTURE_CHANCE");
    const captureChance = scaleOddsForDifficulty(40);
    setWheelSegments([
      {type: "WILD_CAPTURE_SUCCESS", label: "🕸️ Capture! ", weight: captureChance},
      {type: "WILD_CAPTURE_FAIL",    label: "❌ Fled ",      weight: 100 - captureChance}
    ]);
    setAnnouncement(`🕸️ ${defeatedEnemy.name} is weakened! Spin to attempt capture!`);
  };

  // ✅ Resolves capture wheel spins one at a time, AFTER the whole wild squad has been defeated.
  const advanceWildCaptureQueue = (queue) => {
    if (!queue || queue.length === 0) {
      proceedToEvolutionWheel(lastDefeatedEnemyTier);
      return;
    }
    const [next, ...rest] = queue;
    setWildCaptureQueue(rest);
    proceedToWildCaptureWheel(next);
  };

  const toggleEvoAnimSetting = (chipKey) => {
    setEvoAnimSettings((prev) => {
      const next = {...prev, [chipKey]: !prev[chipKey]};
      try {localStorage.setItem(EVO_ANIM_SETTINGS_KEY, JSON.stringify(next));} catch {}
      return next;
    });
  };

  const releaseDigimon = (index, isReserve = false) => {
    const pool = isReserve ? reserve : party;
    const target = pool[index];
    if (!target) return;
    if (isReserve) setReserve((prev) => prev.filter((_, i) => i !== index));
    else setParty((prev) => prev.filter((_, i) => i !== index));
    addLog(`🌐 ${target.name} released back to the Digital World.`);
  };

  // ✅ SELL-TO-SHOP: only usable while actually standing in the Digital Shop, never on a
  // fainted Digimon. Price comes from computeSellPrice (tier base × current HP ratio).
  const sellDigimon = (index, isReserve = false) => {
    if (phase !== "shop") { addLog("❌ You can only sell Digimon at the Digital Shop."); return; }
    const pool = isReserve ? reserve : party;
    const target = pool[index];
    if (!target) return;
    if (target.hp <= 0) { addLog(`❌ ${target.name} has fainted and can't be sold.`); return; }
    const price = computeSellPrice(target);
    if (isReserve) setReserve((prev) => prev.filter((_, i) => i !== index));
    else setParty((prev) => prev.filter((_, i) => i !== index));
    setDigiCoin((prev) => prev + price);
    addLog(`💰 Sold ${target.name} for ${price} Digi Coin.`);
    if (sfx.playItemSFX) sfx.playItemSFX();
  };

  // ✅ BUGFIX: capture/hatch used to silently push past the Reserve Box's visible 6 slots when
  // both Party and Reserve were full, losing the Digimon from view. Now it pauses and asks the
  // player to either release the new arrival or swap it in for an existing Reserve member.
  const addCapturedDigimon = (reward, onDone) => {
    if (party.length < 3) {
      setParty((p) => [...p, reward]);
      addLog(`🎉 ${reward.name} added to party!`);
      onDone();
      return;
    }
    if (reserve.length < RESERVE_CAPACITY) {
      setReserve((r) => [...r, reward]);
      addLog(`📦 ${reward.name} sent to Reserve Box!`);
      onDone();
      return;
    }
    addLog(`📦 Reserve Box is full! Choose who to release for ${reward.name}.`);
    setPendingCapture({reward, onDone});
  };

  const resolvePendingCapture = (releaseReserveIdx) => {
    if (!pendingCapture) return;
    const {reward, onDone} = pendingCapture;
    if (releaseReserveIdx === null) {
      addLog(`🌐 ${reward.name} was released back to the Digital World (Reserve full).`);
    } else {
      setReserve((prev) => {
        const next = [...prev];
        const released = next[releaseReserveIdx];
        addLog(`🌐 ${released ? released.name : "A Digimon"} released to make room for ${reward.name}.`);
        next[releaseReserveIdx] = reward;
        return next;
      });
    }
    setPendingCapture(null);
    onDone();
  };

  const handlePhysicsSpinStopped = (selectedIndex) => {
    // 🔒 BUGFIX: refs are always live (unlike closed-over state), so this blocks any
    // stale/duplicate spin result that resolves while an evolution animation is still playing —
    // this is what previously let a rapid double-click evolve the same Digimon twice.
    if (isEvolvingRef.current) return;
    if (activeWheelType === "WORLD") {
      // ✅ Must read from wheelSegments (what Wheel.jsx actually rendered and spun), not the
      // static WORLD_WHEEL constant — once SHOP can be filtered out below 2 coin, the two
      // arrays can have different lengths/order, and indexing the wrong one would resolve to
      // a different option than the one the player actually landed on.
      const choice = wheelSegments[selectedIndex];
      if (!choice) return;
      setAnnouncement(`🎯 Landed On: ${choice.label}`);
      setWorldSpinCount((prev) => prev + 1);
      worldSpinCountRef.current += 1;
      setWaveUsedItems(false);
      resolveWorldWheelOption(choice);

    } else if (activeWheelType === "EGG_SUB") {
      if (pendingSubPool[selectedIndex]) claimSubWheelDigimon(pendingSubPool[selectedIndex].label);
      else switchToWorldWheel();

    } else if (activeWheelType === "COMBAT") {
      const action = combatTurn === "PLAYER" ? COMBAT_WHEEL_PLAYER[selectedIndex] : COMBAT_WHEEL_ENEMY[selectedIndex];
      if (action) evaluateCombatTurn(action);

    } else if (activeWheelType === "LEGENDARY_CAPTURE_CHANCE") {
      const defeatedLegendary = enemySquad[0];
      if (selectedIndex === 0 && defeatedLegendary) {
        if (sfx.playItemSFX) sfx.playItemSFX();
        if (sfx.hapticCapture) sfx.hapticCapture();
        const reward = {...defeatedLegendary, hp: defeatedLegendary.maxHp};
        // ✅ Legendary capture fills bestiary
        saveBestiaryEntry(reward.name);
        recordScoreEvent("legendaryCaptured", SCORE_EVENTS.LEGENDARY_CAPTURED);
        addCapturedDigimon(reward, () => proceedToEvolutionWheel(lastDefeatedEnemyTier));
      } else {
        addLog(`❌ ${defeatedLegendary ? defeatedLegendary.name : "Legendary"} fled.`);
        proceedToEvolutionWheel(lastDefeatedEnemyTier);
      }

    } else if (activeWheelType === "WILD_CAPTURE_CHANCE") {
      const target = lastDefeatedEnemy;
      if (selectedIndex === 0 && target) {
        if (sfx.playItemSFX) sfx.playItemSFX();
        if (sfx.hapticCapture) sfx.hapticCapture();
        const reward = {...target, hp: target.maxHp};
        // ✅ Wild capture fills bestiary
        saveBestiaryEntry(reward.name);
        recordScoreEvent("wildCaptured", SCORE_EVENTS.WILD_CAPTURED);
        // ✅ Both (or all) wild Digimon are already defeated by this point — spin the capture
        // wheel for the next one in the queue, or move on to the evolution chance once done.
        addCapturedDigimon(reward, () => advanceWildCaptureQueue(wildCaptureQueue));
      } else {
        addLog(`❌ ${target ? target.name : "Wild Digimon"} broke free!`);
        advanceWildCaptureQueue(wildCaptureQueue);
      }

    } else if (activeWheelType === "POST_BATTLE_CHANCE") {
      if (selectedIndex === 0) {
        if (sfx.playItemSFX) sfx.playItemSFX();
        const eligibleMembers = party
          .map((member, idx) => ({member, originalIdx: idx}))
          .filter((item) => {
            // ✅ Fainted Digimon can't evolve — revive them first. Excluded here so the
            // member-selection wheel (if it appears) never offers a downed Digimon.
            if (item.member.hp <= 0) return false;
            const rowData = findDigimonInSheetData(item.member.name);
            return rowData.nextFormName && rowData.nextFormName.toLowerCase().trim() !== "peak form" && rowData.nextFormName.trim() !== "";
          });
        if (eligibleMembers.length === 0) {
          addLog("🚨 No eligible squad members (fainted, or all at peak form).");
          switchToWorldWheel(); return;
        }
        triggerEvolutionSelectionOrExecution(eligibleMembers);
      } else {
        addLog("❌ No evolution detected.");
        switchToWorldWheel();
      }

    } else if (activeWheelType === "POST_BATTLE_TARGET") {
      const targetSelection = pendingSubPool[selectedIndex];
      if (targetSelection) {
        executeEvolutionForIndex(targetSelection.metaIndex, party[targetSelection.metaIndex]).then(() => {
          switchToWorldWheel();
        });
      } else switchToWorldWheel();
    }
  };

  const triggerForcedVillainBattle = async () => {
    setLoadingMsg("⚠️ ALERT: Dark Reality Network Incursion Detected...");
    try {
      const WAVE_CONFIGS = [
        {level: "Child",    count: 3},
        {level: "Adult",    count: 3},
        {level: "Perfect",  count: 3},
        {level: "Ultimate", count: 2},
        {level: "Ultimate", count: 3},
        {level: "Ultra",    count: 2},
        {level: "Ultra",    count: 3},
        {level: "Ultra",    count: 1, boss: true}
      ];
      const currentWaveConfig = WAVE_CONFIGS[villainWaveStage % WAVE_CONFIGS.length];
      const isBossWave = !!currentWaveConfig.boss;
      let builtSquad = [];

      if (isBossWave) {
        // ✅ Boss is now drawn randomly from the Bosses Google Sheet — not always Chronomon DM
        const bossPicks = bossPool.length ? bossPool : [CHRONOMON_DM_NAME];
        const chosenBossName = bossPicks[Math.floor(Math.random() * bossPicks.length)];
        const bossDetails = findDigimonInSheetData(chosenBossName);
        // ✅ HP is still forced for consistent end-of-run difficulty, but power now comes
        // straight from the boss's own row in the Bosses sheet (via findDigimonInSheetData
        // above) instead of a flat hardcoded number — different bosses can hit differently.
        bossDetails.hp = 1550; bossDetails.maxHp = 1550;
        bossDetails.baseMaxHp = 1550;
        builtSquad = [scaleEnemyForDifficulty(bossDetails)];
      } else {
        const targetLevel = currentWaveConfig.level;
        const filteredPool = villainPool
          .filter((d) => d && d.level && d.level.toLowerCase().trim() === targetLevel.toLowerCase().trim())
          .map((d) => d.name);
        const backupPool = filteredPool.length ? filteredPool : (catchablePool.length ? catchablePool : ["Veemon"]);
        const recentForLevel = recentVillainsRef.current[targetLevel] || [];
        const picks = pickUniqueRandom(backupPool, currentWaveConfig.count, recentForLevel);
        recentVillainsRef.current[targetLevel] = [...recentForLevel, ...picks].slice(-5);
        // ✅ Villain encounters do NOT fill bestiary
        for (const name of picks) builtSquad.push(scaleEnemyForDifficulty(findDigimonInSheetData(name)));
      }

      // ✅ PARTY SETUP: the wave/boss is now fully determined, but combat doesn't actually
      // begin yet — stage everything needed to start it and hand control to the party-setup
      // screen. confirmBattleSetup() applies this once the player taps ENGAGE.
      setVillainWaveStage((prev) => prev + 1);
      const announcementText = isBossWave
        ? `💀 FINAL BOSS! ${builtSquad[0].name} has awakened!`
        : `🚨 NEMESIS ATTACK! Wave [${villainWaveStage + 1}/8]: ${currentWaveConfig.count} ${currentWaveConfig.level}-level enemies!`;
      setPendingBattleInit({
        enemySquad: builtSquad,
        isVillainBattle: true, isLegendaryBattle: false, isWildBattle: false, isBossWave,
        announcement: announcementText,
        bgmTrack: isBossWave ? "BOSS" : "BATTLE",
        logMsg: isBossWave ? `💀 WAVE 8 BOSS: ${builtSquad[0].name} — destroyer of timelines!` : null,
      });
      setPhase("party_setup");
    } catch {switchToWorldWheel();}
    finally {setLoadingMsg("");}
  };

  // ✅ Called when the player taps ENGAGE on the party-setup screen — applies whatever was
  // staged by resolveWorldWheelOption (Wild/Legendary) or triggerForcedVillainBattle (Nemesis
  // wave/boss) and actually starts combat. Free reordering/healing/reviving/swapping happens
  // on the party-setup screen beforehand and costs nothing (swapPartyAndReserve only charges a
  // turn while phase === "combat", which it deliberately isn't yet at this point).
  const confirmBattleSetup = () => {
    const init = pendingBattleInit;
    if (!init) {setPhase("world_wheel"); return;}
    setIsVillainBattle(init.isVillainBattle);
    setIsLegendaryBattle(init.isLegendaryBattle);
    setIsWildBattle(init.isWildBattle);
    setEnemySquad(init.enemySquad);
    setCurrentEnemyIdx(0);
    setActiveWheelType("COMBAT");
    setWheelSegments(COMBAT_WHEEL_PLAYER);
    setCombatTurn("PLAYER");
    setWaveUsedItems(false);
    resetCombatFloats();
    setAnnouncement(init.announcement);
    if (init.logMsg) addLog(init.logMsg);
    if (sfx.startBGM) sfx.startBGM(init.bgmTrack);
    setPhase("combat");
    setPendingBattleInit(null);
  };

  const resolveWorldWheelOption = async (choice) => {
    addLog(`🌍 ${choice.label}`);
    if (choice.type === "SHOP") {
      setPhase("shop");
      setAnnouncement("🛒 Welcome to the Digital Shop! Spend your Digi Coins wisely.");
      if (sfx.startBGM) sfx.startBGM("SHOP");
    } else if (choice.type === "TRAIN") {
      if (party.length === 0) return switchToWorldWheel();
      const eligibleMembers = party
        .map((member, idx) => ({member, originalIdx: idx}))
        .filter((item) => {
          // ✅ Fainted Digimon can't evolve — revive them first.
          if (item.member.hp <= 0) return false;
          const rowData = findDigimonInSheetData(item.member.name);
          return rowData.nextFormName && rowData.nextFormName.toLowerCase().trim() !== "peak form" && rowData.nextFormName.trim() !== "";
        });
      if (eligibleMembers.length === 0) {
        addLog("🚨 No eligible squad members (fainted, or all at peak form)."); return switchToWorldWheel();
      }
      triggerEvolutionSelectionOrExecution(eligibleMembers);
    } else if (choice.type === "WILD" || choice.type === "EGG" || choice.type === "LEGENDARY") {
      const poolMap = {EGG: babyPool, LEGENDARY: legendaryPool, WILD: catchablePool};
      let selectedPool = poolMap[choice.type]?.length ? poolMap[choice.type] : ["Veemon"];
      // ✅ Early game safety net: before Nemesis Wave 3, Wild encounters won't roll Ultimate/Ultra tier Digimon
      if (choice.type === "WILD" && villainWaveStage < 3) {
        const filtered = selectedPool.filter((name) => {
          const row = db.find((d) => d && d.name && d.name.toLowerCase().trim() === name.toLowerCase().trim());
          const lvl = (row?.level || "").toLowerCase().trim();
          return lvl !== "ultimate" && lvl !== "ultra";
        });
        if (filtered.length) selectedPool = filtered;
      }
      if (choice.type === "EGG") {
        const constructedPool = selectedPool.map((item) => ({label: item, weight: 100 / selectedPool.length}));
        setPendingSubPool(constructedPool);
        setActiveWheelType("EGG_SUB"); setWheelSegments(constructedPool);
        setPhase("sub_wheel");
        setAnnouncement("🥚 Incubator active! Spin to hatch a Digi-Egg!");
      } else if (choice.type === "LEGENDARY") {
        setLoadingMsg("Generating encounter data...");
        try {
          const shuffled = shuffleArray(selectedPool);
          const details = findDigimonInSheetData(shuffled[0]);
          details.level = "Ultra";
          details.maxHp = STAGE_STATS["Ultra"].maxHp;
          details.hp = STAGE_STATS["Ultra"].maxHp;
          details.baseMaxHp = STAGE_STATS["Ultra"].maxHp;
          // ✅ HP is still forced to Ultra-tier for consistent encounter difficulty, but
          // power now stays whatever findDigimonInSheetData already pulled from the
          // Legendary sheet row for this species — no longer flattened to one fixed number.
          const scaledDetails = scaleEnemyForDifficulty(details);
          setPendingBattleInit({
            enemySquad: [scaledDetails],
            isVillainBattle: false, isLegendaryBattle: true, isWildBattle: false, isBossWave: false,
            announcement: `⚔️ Your turn! Spin to attack ${scaledDetails.name}!`,
            bgmTrack: "BATTLE",
          });
          setPhase("party_setup");
        } catch {switchToWorldWheel();}
        finally {setLoadingMsg("");}
      } else {
        // ✅ WILD: usually a single Digimon, but 30% of the time a pair shows up together
        setLoadingMsg("Generating encounter data...");
        try {
          const squadSize = Math.random() < 0.30 ? 2 : 1;
          const picks = pickUniqueRandom(selectedPool, squadSize);
          const builtSquad = picks.map((name) => scaleEnemyForDifficulty(findDigimonInSheetData(name)));
          if (squadSize === 2) addLog(`⚠️ Two Wild Digimon detected!`);
          setPendingBattleInit({
            enemySquad: builtSquad,
            isVillainBattle: false, isLegendaryBattle: false, isWildBattle: true, isBossWave: false,
            announcement: `⚔️ Your turn! Spin to attack ${builtSquad[0].name}!`,
            bgmTrack: "BATTLE",
          });
          setPhase("party_setup");
        } catch {switchToWorldWheel();}
        finally {setLoadingMsg("");}
      }
    }
  };

  const claimSubWheelDigimon = async (name) => {
    try {
      const details = findDigimonInSheetData(name);
      // ✅ Egg hatch fills bestiary
      saveBestiaryEntry(details.name);
      if (sfx.playItemSFX) sfx.playItemSFX();
      addCapturedDigimon(details, () => switchToWorldWheel());
    } catch {
      addLog("Data pipeline write error.");
      switchToWorldWheel();
    }
  };

  const evaluateCombatTurn = (action) => {
    const activeOwnIdx = party.findIndex((d) => d.hp > 0);
    const activeOwn = party[activeOwnIdx];
    let activeEnemy = enemySquad[currentEnemyIdx];
    if (activeOwnIdx === -1 || !activeOwn || !activeEnemy) return;

    if (combatTurn === "PLAYER") {
      let ownDmg = 0;
      const playerHasAdvantage = hasAttributeAdvantage(activeOwn.attribute, activeEnemy.attribute);
      const playerHasDisadvantage = hasAttributeDisadvantage(activeOwn.attribute, activeEnemy.attribute);
      if (action.type === "ATTACK" || action.type === "CRITICAL") {
        let base = activeOwn.power * 15 * temporaryBuffs.strengthMultiplier;
        if (action.type === "CRITICAL") base *= 1.8;
        if (playerHasAdvantage) base *= ATTRIBUTE_DAMAGE_BONUS;
        else if (playerHasDisadvantage) base *= ATTRIBUTE_DAMAGE_PENALTY;
        ownDmg = Math.round(base);
      }
      let nextEnemyHp = Math.max(0, activeEnemy.hp - ownDmg);
      const updatedSquad = [...enemySquad];
      updatedSquad[currentEnemyIdx] = {...activeEnemy, hp: nextEnemyHp};
      setEnemySquad(updatedSquad);

      if (action.type === "MISS") {
        if (sfx.playMiss) sfx.playMiss();
        addLog(`💨 ${activeOwn.name} missed!`);
      } else {
        triggerEnemyHit(action.type === "CRITICAL", ownDmg);
        if (action.type === "CRITICAL") {if (sfx.playCriticalHit) sfx.playCriticalHit(); if (sfx.hapticCrit) sfx.hapticCrit();}
        else if (sfx.playHit) sfx.playHit();
        const playerTag = playerHasAdvantage ? " ⚡ADVANTAGE" : playerHasDisadvantage ? " 🛡️disadvantage" : "";
        addLog(`💥 ${activeOwn.name} dealt ${ownDmg}${action.type === "CRITICAL" ? " CRITICAL" : ""}${playerTag} dmg to ${activeEnemy.name}!`);
      }

      if (nextEnemyHp <= 0) {
        addLog(`💀 ${activeEnemy.name} defeated!`);
        recordScoreEvent("enemiesDefeated", SCORE_EVENTS.WILD_DEFEATED);
        const enemyTierStr = activeEnemy.level || "Child";
        setLastDefeatedEnemyTier(enemyTierStr);

        // ✅ Digi Coin reward — only for exploration encounters (Wild/Legendary), not Nemesis waves
        if (!isVillainBattle && (isWildBattle || isLegendaryBattle)) {
          const coinReward = getCoinReward(enemyTierStr);
          setDigiCoin((prev) => prev + coinReward);
          addLog(`🪙 +${coinReward} Digi Coin!`);
        }

        const nextTargetIdx = currentEnemyIdx + 1;
        if (nextTargetIdx < enemySquad.length) {
          setCurrentEnemyIdx(nextTargetIdx);
          setAnnouncement(`🎯 Next target: ${enemySquad[nextTargetIdx].name}! Your turn!`);
          return;
        }

        // ✅ Whole encounter cleared — battle item effects (Overdrive/Shield chips) only last one battle
        removeTemporaryBattleBuffs();

        if (sfx.playVictory) sfx.playVictory();
        if (isVillainBattle) {
          recordWaveScore(
            villainWaveStage,
            SCORE_EVENTS.VILLAIN_WAVE,
            !waveUsedItems ? SCORE_EVENTS.WAVE_NO_ITEMS : 0,
            villainWaveStage === 8 ? SCORE_EVENTS.CHRONOMON_DEFEATED : 0
          );
        }
        if (isLegendaryBattle) {
          setPhase("sub_wheel");
          setActiveWheelType("LEGENDARY_CAPTURE_CHANCE");
          const legendaryCaptureChance = scaleOddsForDifficulty(65);
          setWheelSegments([
            {type: "CAPTURE_SUCCESS", label: "👑 Capture! ", weight: legendaryCaptureChance},
            {type: "CAPTURE_FAIL",    label: "❌ Fled ",     weight: 100 - legendaryCaptureChance}
          ]);
          setAnnouncement(`🎰 Legendary weakened! Spin to capture!`);
          return;
        }
        if (isWildBattle) {
          // ✅ Both/all wild Digimon are down now — line up a capture wheel spin for each one in turn
          advanceWildCaptureQueue(updatedSquad);
          return;
        }
        proceedToEvolutionWheel(enemyTierStr);
      } else {
        setCombatTurn("ENEMY");
        setWheelSegments(COMBAT_WHEEL_ENEMY);
        setAnnouncement(`⚠️ Enemy turn! ${activeEnemy.name} is preparing to attack...`);
      }

    } else {
      if (action.type === "HEAL") {
        if (sfx.playPotionSFX) sfx.playPotionSFX();
        const healAmount = Math.floor(activeEnemy.maxHp * 0.20);
        const updatedSquad = [...enemySquad];
        updatedSquad[currentEnemyIdx] = {...activeEnemy, hp: Math.min(activeEnemy.hp + healAmount, activeEnemy.maxHp)};
        setEnemySquad(updatedSquad);
        addLog(`💚 ${activeEnemy.name} healed +${healAmount} HP.`);
        triggerEnemyHeal(healAmount);
        setCombatTurn("PLAYER"); setWheelSegments(COMBAT_WHEEL_PLAYER);
        setAnnouncement(`⚔️ Your turn! ${activeEnemy.name} healed — spin to attack!`);
        return;
      }
      let enemyDmg = 0;
      const enemyHasAdvantage = hasAttributeAdvantage(activeEnemy.attribute, activeOwn.attribute);
      const enemyHasDisadvantage = hasAttributeDisadvantage(activeEnemy.attribute, activeOwn.attribute);
      if (action.type === "ATTACK" || action.type === "CRITICAL") {
        let base = activeEnemy.power * 15;
        if (action.type === "CRITICAL") base *= 1.5;
        if (enemyHasAdvantage) base *= ATTRIBUTE_DAMAGE_BONUS;
        else if (enemyHasDisadvantage) base *= ATTRIBUTE_DAMAGE_PENALTY;
        enemyDmg = Math.max(10, Math.round(base));
      }
      let nextOwnHp = Math.max(0, activeOwn.hp - enemyDmg);
      let isEmergencyRevive = false;
      if (nextOwnHp <= 0) {
        const aliveTeammates = party.filter((p, idx) => idx !== activeOwnIdx && p.hp > 0).length;
        if (aliveTeammates === 0 && inventory.revivePotion > 0) isEmergencyRevive = true;
      }
      const updatedParty = party.map((p, idx) => {
        if (idx !== activeOwnIdx) return p;
        if (isEmergencyRevive) return {...p, hp: Math.round(p.maxHp * 0.40)};
        return {...p, hp: nextOwnHp};
      });
      setParty(updatedParty);
      // ✅ Fires the instant THIS Digimon actually goes down (skipped if an emergency
      // revive just saved them) — independent of whether the whole squad ends up wiped.
      if (nextOwnHp <= 0 && !isEmergencyRevive && sfx.hapticFaint) sfx.hapticFaint();

      if (action.type === "MISS") {
        if (sfx.playMiss) sfx.playMiss();
        addLog(`💨 ${activeEnemy.name} missed!`);
      } else {
        triggerPlayerHit(activeOwnIdx, action.type === "CRITICAL", enemyDmg);
        if (sfx.playHit) sfx.playHit();
        if (action.type === "CRITICAL" && sfx.hapticCrit) sfx.hapticCrit();
        const enemyTag = enemyHasAdvantage ? " ⚡ADVANTAGE" : enemyHasDisadvantage ? " 🛡️disadvantage" : "";
        addLog(`🚨 ${activeEnemy.name} hit ${activeOwn.name} for ${enemyDmg}${action.type === "CRITICAL" ? " CRITICAL" : ""}${enemyTag} dmg!`);
      }

      if (isEmergencyRevive) {
        setInventory((prev) => ({...prev, revivePotion: Math.max(0, prev.revivePotion - 1)}));
        setWaveUsedItems(true);
        addLog(`✨ EMERGENCY: ${activeOwn.name} auto-revived to 40% HP!`);
        triggerPartyHeal(activeOwnIdx, Math.round(activeOwn.maxHp * 0.40));
        if (sfx.playPotionSFX) sfx.playPotionSFX();
        setCombatTurn("PLAYER"); setWheelSegments(COMBAT_WHEEL_PLAYER);
        setAnnouncement(`⚔️ Emergency revival! Fight back against ${activeEnemy.name}!`);
        return;
      }
      const aliveCount = updatedParty.filter((d) => d.hp > 0).length;
      if (aliveCount === 0) {
        removeTemporaryBattleBuffs();
        addLog("🚨 OVERRIDE TERMINATED: All squad members fainted.");
        if (sfx.playGameOver) sfx.playGameOver();
        addToLeaderboard({score, wave: villainWaveStage, victory: false});
        clearSave();
        setPhase("game_over");
      } else {
        setCombatTurn("PLAYER"); setWheelSegments(COMBAT_WHEEL_PLAYER);
        setAnnouncement(`⚔️ Your turn! Spin to counter ${activeEnemy.name}!`);
      }
    }
  };

  // ✅ Shop: buy any catalog item with Digi Coin — multiple purchases per visit are allowed
  const leaveShop = () => switchToWorldWheel();
  const buyShopItem = (key) => {
    const price = SHOP_PRICES[key];
    if (!price) return;
    if (digiCoin < price) {addLog("❌ Not enough Digi Coin."); return;}
    setDigiCoin((prev) => prev - price);
    setInventory((prev) => ({...prev, [key]: (prev[key] || 0) + 1}));
    const item = SHOP_ITEMS.find((i) => i.key === key);
    addLog(`🛒 Purchased ${item ? item.label : key} for ${price} Digi Coin.`);
    if (sfx.playItemSFX) sfx.playItemSFX();
  };

  // ✅ Evolution chips: guaranteed instant evolution for a specific party/reserve Digimon,
  // gated to the exact tier jump the chip covers. Blocked if the target has no next evolution.
  const evolveWithChip = async (index, isReserve = false) => {
    if (isEvolvingRef.current) return;
    const pool = isReserve ? reserve : party;
    const target = pool[index];
    if (!target) return;
    // ✅ Fainted Digimon can't evolve — revive them first.
    if (target.hp <= 0) {addLog(`❌ ${target.name} is fainted and can't evolve. Revive it first!`); return;}
    const neededChip = EVO_CHIP_FOR_LEVEL[target.level];
    if (!neededChip) {addLog(`❌ ${target.name}'s tier can't be evolved with a chip.`); return;}
    if ((inventory[neededChip] || 0) <= 0) {addLog(`❌ You don't own an ${EVO_CHIP_LABEL[neededChip]}.`); return;}
    const lookupDetails = findDigimonInSheetData(target.name);
    const nextFormName = lookupDetails.nextFormName;
    if (!nextFormName || nextFormName.toLowerCase().trim() === "peak form" || nextFormName.trim() === "") {
      addLog(`🏋️ ${target.name} has achieved peak physical output.`);
      return;
    }

    isEvolvingRef.current = true;
    const evolvedDetails = findDigimonInSheetData(nextFormName);
    // ✅ MOBILE PERF: same preload as executeEvolutionForIndex above — avoids a pop-in
    // delay when the evolution overlay reveals this sprite ~1s from now.
    if (evolvedDetails.image) {
      const preloadImg = new Image();
      preloadImg.src = evolvedDetails.image;
    }
    const setter = isReserve ? setReserve : setParty;
    const setEvolvingIdx = isReserve ? setEvolvingReserveIdx : setEvolvingPartyIdx;
    const shouldAnimate = evoAnimSettings[neededChip] !== false;
    const originTier = normalizeEvoTier(target.level);
    const destTier = normalizeEvoTier(evolvedDetails.level);
    const evoTier = (originTier === "ultra" && destTier === "ultraplus") ? "ultraplus" : originTier;
    setEvolvingTier(evoTier);

    if (shouldAnimate) {
      setLoadingMsg("Restructuring digital data blocks...");
      setEvolvingIdx(index);
      if (sfx.playEvolutionTierSFX) sfx.playEvolutionTierSFX(evoTier);
      else if (sfx.playTransformSFX) sfx.playTransformSFX();
      if (sfx.hapticEvolutionTier) sfx.hapticEvolutionTier(evoTier);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setter((prev) => prev.map((digi, idx) => idx !== index ? digi : evolvedDetails));
    setInventory((prev) => ({...prev, [neededChip]: prev[neededChip] - 1}));
    addLog(`🧬 Used ${EVO_CHIP_LABEL[neededChip]} — ${target.name} evolved into ${evolvedDetails.name}!`);

    if (shouldAnimate) {
      setLoadingMsg("");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setEvolvingIdx(null);
    } else if (sfx.playEvolutionTierSFX) {
      sfx.playEvolutionTierSFX(evoTier);
      if (sfx.hapticEvolutionTier) sfx.hapticEvolutionTier(evoTier);
    } else if (sfx.playTransformSFX) {
      sfx.playTransformSFX();
    }
    setEvolvingTier(null);
    isEvolvingRef.current = false;
  };

  // ✅ Escape Portal: safely flee an active Wild/Legendary battle (blocked during Nemesis Raids)
  const useEscapePortal = () => {
    if (inventory.escapePortal <= 0) {addLog("❌ No Escape Portals left."); return;}
    if (isVillainBattle) {addLog("❌ Escape Portals can't be used during a Nemesis Raid!"); return;}
    if (!isWildBattle && !isLegendaryBattle) return;
    setInventory((prev) => ({...prev, escapePortal: prev.escapePortal - 1}));
    addLog("🌀 Escaped the battle using an Escape Portal!");
    if (sfx.playItemSFX) sfx.playItemSFX();
    removeTemporaryBattleBuffs();
    resetCombatFloats();
    setEnemySquad([]); setCurrentEnemyIdx(0);
    setIsWildBattle(false); setIsLegendaryBattle(false);
    setWildCaptureQueue([]);
    switchToWorldWheel();
  };

  const usePotionOnDigimon = (index, isReserve = false) => {
    if (inventory.potion <= 0) {addLog("❌ No potions left."); return;}
    const pool = isReserve ? reserve : party;
    const target = pool[index];
    if (!target || target.hp <= 0 || target.hp >= target.maxHp) {addLog("❌ Potion aborted: invalid target."); return;}
    const healAmt = Math.min(50, target.maxHp - target.hp);
    const setter = isReserve ? setReserve : setParty;
    setter((prev) => prev.map((digi, idx) => idx !== index ? digi : {...digi, hp: Math.min(digi.maxHp, digi.hp + 50)}));
    setInventory((prev) => ({...prev, potion: Math.max(0, prev.potion - 1)}));
    setWaveUsedItems(true);
    addLog("🧪 Healed +50 HP.");
    if (!isReserve) triggerPartyHeal(index, healAmt);
    if (sfx.playPotionSFX) sfx.playPotionSFX();
  };

  const useRevivePotionOnDigimon = (index, isReserve = false) => {
    if (inventory.revivePotion <= 0) {addLog("❌ No revives left."); return;}
    const pool = isReserve ? reserve : party;
    const target = pool[index];
    if (!target || target.hp > 0) {addLog("❌ Revive aborted: target still operational."); return;}
    const reviveAmt = Math.round(target.maxHp * 0.40);
    const setter = isReserve ? setReserve : setParty;
    setter((prev) => prev.map((digi, idx) => idx !== index ? digi : {...digi, hp: Math.round(digi.maxHp * 0.40)}));
    setInventory((prev) => ({...prev, revivePotion: Math.max(0, prev.revivePotion - 1)}));
    setWaveUsedItems(true);
    addLog(`✨ Revived ${target.name} to 40% HP!`);
    if (!isReserve) triggerPartyHeal(index, reviveAmt);
    if (sfx.playPotionSFX) sfx.playPotionSFX();
  };

  const consumeStrengthChip = () => {
    if (inventory.chipStrength <= 0 || phase !== "combat") return;
    setTemporaryBuffs((prev) => ({...prev, strengthMultiplier: 1.15}));
    setInventory((prev) => ({...prev, chipStrength: prev.chipStrength - 1}));
    setWaveUsedItems(true);
    addLog(`💪 Overdrive online! +15% damage!`);
    if (sfx.playItemSFX) sfx.playItemSFX();
  };

  const consumeEnduranceChip = () => {
    if (inventory.chipEndurance <= 0 || phase !== "combat") return;
    const activeIdx = party.findIndex((d) => d.hp > 0);
    if (activeIdx === -1) return;
    setTemporaryBuffs((prev) => ({...prev, enduranceMultiplier: 1.20}));
    setParty((prevParty) => prevParty.map((member, idx) => {
      if (idx !== activeIdx) return member;
      const base = member.baseMaxHp || member.maxHp;
      return {...member, baseMaxHp: base, maxHp: Math.round(base * 1.20), hp: Math.round(member.hp * 1.20)};
    }));
    setInventory((prev) => ({...prev, chipEndurance: prev.chipEndurance - 1}));
    setWaveUsedItems(true);
    addLog(`🛡️ Shield online! +20% Max HP!`);
    if (sfx.playItemSFX) sfx.playItemSFX();
  };

  const swapPartyAndReserve = (partyIdx, targetIdx, isReserveTarget = false) => {
    if (isReserveTarget) {
      let nextParty = [...party];
      let nextReserve = [...reserve];
      const pTarget = party[partyIdx];
      const rTarget = reserve[targetIdx];
      if (rTarget) {nextParty[partyIdx] = rTarget; nextReserve[targetIdx] = pTarget;}
      else if (nextParty[partyIdx]) {nextParty.splice(partyIdx, 1); nextReserve.push(pTarget);}
      setParty(nextParty.filter(Boolean));
      setReserve(nextReserve.filter(Boolean));
      addLog(`🔄 Hot-swap complete.`);
    } else {
      if (partyIdx < 0 || partyIdx >= party.length || targetIdx < 0 || targetIdx >= party.length) return;
      setParty((prevParty) => {
        const next = [...prevParty];
        [next[partyIdx], next[targetIdx]] = [next[targetIdx], next[partyIdx]];
        return next;
      });
      addLog(`🔄 Party order updated.`);
    }
    // ✅ Hot-swapping during combat costs the player's turn — same enemy-turn handoff used
    // after a MISS action. Free outside of combat, where "turn" has no meaning.
    if (phase === "combat" && combatTurn === "PLAYER") {
      const activeEnemy = enemySquad[currentEnemyIdx];
      setCombatTurn("ENEMY");
      setWheelSegments(COMBAT_WHEEL_ENEMY);
      setAnnouncement(`🔄 Hot-swap used your turn! ${activeEnemy ? activeEnemy.name + " is" : "The enemy is"} preparing to attack...`);
    }
  };

  return {
    party, reserve, inventory, digiCoin, phase, loadingMsg, loadError, retryDataLoad: () => loadGameData(true), log, announcement, setAnnouncement, starters,
    activeWheelType, wheelSegments, enemySquad, currentEnemyIdx, worldSpinCount, combatTurn,
    lastDefeatedEnemyTier, villainWaveStage, isVillainBattle, isWildBattle, isLegendaryBattle,
    enemyHitAnim, playerHitAnim,
    partyHealAnim, enemyHealAnim,
    score, scoreBreakdown, evolvingPartyIdx, evolvingReserveIdx, evolvingTier, showResumePrompt, handleResume, fullRoster,
    evoAnimSettings, toggleEvoAnimSetting,
    chooseStarter, usePotionOnDigimon, useRevivePotionOnDigimon, consumeStrengthChip,
    consumeEnduranceChip, swapPartyAndReserve, handlePhysicsSpinStopped, resetToStart, releaseDigimon, sellDigimon,
    buyShopItem, evolveWithChip, useEscapePortal, leaveShop,
    pendingBattleInit, confirmBattleSetup,
    pendingCapture, resolvePendingCapture
  };
}
