import {useState, useEffect, useRef, useCallback} from "react";
import {createCsvWorker, parseCsvViaWorker} from "./utils/csvParseWorker";
import {useDigimonGame, WHEEL_COLORS, getRank, SAVE_KEY as SHOP_SAVE_KEY, HIGHSCORE_KEY as SHOP_HIGHSCORE_KEY, BESTIARY_KEY as SHOP_BESTIARY_KEY, getLeaderboard as getShopLeaderboard, URLS as SHOP_URLS, getAttributeEmoji, SHOP_ITEMS, EVO_CHIP_FOR_LEVEL, EVO_CHIP_LABEL, EVO_CHIP_TARGET_TIER, EVO_CHIP_KEYS, EVO_ANIM_SETTINGS_KEY, loadEvoAnimSettings, computeSellPrice} from "./DigimonRoulette";
import {
  useDigimonGame as useDigimonGameRNG,
  WHEEL_COLORS as RNG_WHEEL_COLORS,
  SAVE_KEY as RNG_SAVE_KEY,
  HIGHSCORE_KEY as RNG_HIGHSCORE_KEY,
  BESTIARY_KEY as RNG_BESTIARY_KEY,
  getLeaderboard as getRngLeaderboard,
  EVO_CHIP_FOR_LEVEL as RNG_EVO_CHIP_FOR_LEVEL,
  EVO_CHIP_LABEL as RNG_EVO_CHIP_LABEL,
  EVO_CHIP_TARGET_TIER as RNG_EVO_CHIP_TARGET_TIER,
  EVO_CHIP_KEYS as RNG_EVO_CHIP_KEYS,
} from "./DigimonRouletteRNG";
import Wheel from "./Wheel";
import {sfx} from "./utils/audio";
import {DV, DV_FONT_MONO, DV_FONT_DISPLAY} from "./constants/theme";
import {SHOP_TUTORIAL_STEPS, RNG_TUTORIAL_STEPS} from "./constants/tutorialSteps";
import {getHpColors} from "./utils/hpColors";
import {getSaveSummary, menuGetStatVariance} from "./utils/menuHelpers";
import TutorialPopup from "./components/TutorialPopup";
import GuideModal from "./components/GuideModal";
import BestiaryModal from "./components/BestiaryModal";
import InventoryPanel from "./components/InventoryPanel";
import ShopPanel from "./components/ShopPanel";
import AttributeTriangle from "./components/AttributeTriangle";
import WaveProgressBar from "./components/WaveProgressBar";
import DigimonInfoPopup from "./components/DigimonInfoPopup";
import PartySlot from "./components/PartySlot";
import LeaderboardModal from "./components/LeaderboardModal";
import SettingsModal from "./components/SettingsModal";
import ReserveFullModal from "./components/ReserveFullModal";
import LoadingScreen from "./components/LoadingScreen";
import EvolutionOverlay from "./components/EvolutionOverlay";
import ReminderModal from "./components/ReminderModal";
import AuthorizationModal, {OverwriteConfirmModal} from "./components/AuthorizationModal";
import MenuLoadingOverlay from "./components/MenuLoadingOverlay";
import MainMenuScreen from "./components/MainMenuScreen";

// ============================================================
// MAIN GAME SCREEN
// ============================================================
function GameCore({game, mode, wheelColors, evoChipForLevel, evoChipLabel, evoChipTargetTier, evoChipKeys, shopItems, saveKey, highscoreKey, bestiaryKey, getLeaderboard, onExitMode, onSwitchMode}) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [pendingSwap, setPendingSwap] = useState(null); // {fromType, fromIndex, toType, toIndex} awaiting hot-swap confirmation
  const [showEvoFaintedReminder, setShowEvoFaintedReminder] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  // ✅ Difficulty now lives on the starter-selection screen instead of the main menu —
  // same localStorage key as before, so scaleEnemyForDifficulty/scaleOddsForDifficulty
  // (which read it directly, not via props) keep working unchanged.
  const [difficulty, setDifficulty] = useState(() => {
    try {return localStorage.getItem("digiroulette_difficulty") || "normal";} catch {return "normal";}
  });
  const handleDifficultyChange = (next) => {
    setDifficulty(next);
    try {localStorage.setItem("digiroulette_difficulty", next);} catch {}
  };
  // ✅ Starter-selection scanner: which page of 4 is showing, and which unit is selected
  // (selection persists across page navigation — it's a separate concept from "what's visible").
  const [pickerPage, setPickerPage] = useState(0);
  const [selectedStarterIdx, setSelectedStarterIdx] = useState(0);
  const [showBestiary, setShowBestiary] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [releaseConfirm, setReleaseConfirm] = useState(null);
  // ✅ Confirm-before-sell: mirrors releaseConfirm's pattern exactly — selling was previously
  // instant on tap, with no "are you sure" step, unlike Release which already had one. Reuses
  // the same AuthorizationModal component, just with sell-specific copy and the actual payout.
  const [sellConfirm, setSellConfirm] = useState(null);
  // ✅ Small auto-dismissing popup telling the player a Potion/Revive Potion is out of stock —
  // shown from the Party Setup screen's Heal/Revive buttons instead of just silently disabling
  // them, since that screen has no battle log visible to fall back on.
  const [itemEmptyToast, setItemEmptyToast] = useState(null);
  useEffect(() => {
    if (!itemEmptyToast) return;
    const t = setTimeout(() => setItemEmptyToast(null), 1800);
    return () => clearTimeout(t);
  }, [itemEmptyToast]);
  const [isWheelSpinning, setIsWheelSpinning] = useState(false);
  const [infoPopup, setInfoPopup] = useState(null); // {type: 'party'|'reserve', idx} | null
  const [highlightedEvoTier, setHighlightedEvoTier] = useState(null);

  const [enemyAnimState, setEnemyAnimState] = useState(null);
  const [playerAnimState, setPlayerAnimState] = useState(null);
  const [screenFlash, setScreenFlash] = useState(null);
  const [partyHpFlash, setPartyHpFlash] = useState({});

  // ✅ Settings: independent music/SFX volume, mute, and reduced motion — persisted across sessions
  const [musicVolume, setMusicVolume] = useState(() => {
    try {const v = localStorage.getItem("digiroulette_music_volume"); return v === null ? 1.0 : parseFloat(v);} catch {return 1.0;}
  });
  const [sfxVolume, setSfxVolume] = useState(() => {
    try {const v = localStorage.getItem("digiroulette_sfx_volume"); return v === null ? 1.0 : parseFloat(v);} catch {return 1.0;}
  });
  const [isMuted, setIsMuted] = useState(() => {
    try {return localStorage.getItem("digiroulette_muted") === "true";} catch {return false;}
  });
  const [reducedMotion, setReducedMotion] = useState(() => {
    try {return localStorage.getItem("digiroulette_reduced_motion") === "true";} catch {return false;}
  });
  const [fastSpin, setFastSpin] = useState(() => {
    try {return localStorage.getItem("digiroulette_fast_spin") === "true";} catch {return false;}
  });
  const [enemyAutoSpin, setEnemyAutoSpin] = useState(() => {
    try {return localStorage.getItem("digiroulette_enemy_auto_spin") === "true";} catch {return false;}
  });
  // ✅ Two settings that tune the evolution overlay independently of Reduced Motion (which is
  // specifically about photosensitivity — disabling flashing/glitch effects). These two are
  // about performance and pacing instead: "Reduce Evolution Effects" trims particle/ring
  // counts on the Vortex Shatter overlay for weaker devices; "Longer Evolution Animation"
  // stretches the whole ~2s sequence to ~3s for players who want more time to savor it.
  const [reduceEvoAnim, setReduceEvoAnim] = useState(() => {
    try {return localStorage.getItem("digiroulette_reduce_evo_anim") === "true";} catch {return false;}
  });
  const [longerEvoAnim, setLongerEvoAnim] = useState(() => {
    try {return localStorage.getItem("digiroulette_longer_evo_anim") === "true";} catch {return false;}
  });
  // ✅ Haptics on/off — default true so mobile players get the feedback out of the box, with
  // an easy way to turn it off if it's unwanted/draining battery. Independent of audio mute.
  const [hapticsEnabled, setHapticsEnabled] = useState(() => {
    try {const v = localStorage.getItem("digiroulette_haptics_enabled"); return v === null ? true : v === "true";} catch {return true;}
  });
  // ✅ Colorblind-Friendly Mode: swaps the red/green pairing used to encode HP state (healthy
  // vs critical) for a blue/orange pairing — the standard accessibility fix for deuteranopia/
  // protanopia (red-green color blindness, the most common forms). Scoped to HP bars only
  // (PartySlot, enemy-squad tiles, Party Setup enemy cards) since that's the one place in the
  // UI where color alone carries game-state information; the rest of the phosphor-green theme
  // is branding, not a signal, so leaving it untouched doesn't cost colorblind players anything.
  const [colorblindMode, setColorblindMode] = useState(() => {
    try {return localStorage.getItem("digiroulette_colorblind_mode") === "true";} catch {return false;}
  });

  useEffect(() => {
    sfx.setHapticsEnabled(hapticsEnabled);
  }, [hapticsEnabled]);

  useEffect(() => {
    sfx.setMusicVolume(musicVolume);
  }, [musicVolume]);

  useEffect(() => {
    sfx.setSfxVolume(sfxVolume);
  }, [sfxVolume]);

  const handleMusicVolumeChange = (v) => {
    setMusicVolume(v);
    try {localStorage.setItem("digiroulette_music_volume", String(v));} catch {}
  };
  const handleSfxVolumeChange = (v) => {
    setSfxVolume(v);
    try {localStorage.setItem("digiroulette_sfx_volume", String(v));} catch {}
  };
  const handleToggleMute = () => {
    const nowMuted = sfx.toggleMute();
    setIsMuted(nowMuted);
    try {localStorage.setItem("digiroulette_muted", String(nowMuted));} catch {}
  };
  const handleToggleReducedMotion = () => {
    setReducedMotion((prev) => {
      const next = !prev;
      try {localStorage.setItem("digiroulette_reduced_motion", String(next));} catch {}
      return next;
    });
  };
  const handleToggleFastSpin = () => {
    setFastSpin((prev) => {
      const next = !prev;
      try {localStorage.setItem("digiroulette_fast_spin", String(next));} catch {}
      return next;
    });
  };
  const handleToggleEnemyAutoSpin = () => {
    setEnemyAutoSpin((prev) => {
      const next = !prev;
      try {localStorage.setItem("digiroulette_enemy_auto_spin", String(next));} catch {}
      return next;
    });
  };
  const handleToggleReduceEvoAnim = () => {
    setReduceEvoAnim((prev) => {
      const next = !prev;
      try {localStorage.setItem("digiroulette_reduce_evo_anim", String(next));} catch {}
      return next;
    });
  };
  const handleToggleLongerEvoAnim = () => {
    setLongerEvoAnim((prev) => {
      const next = !prev;
      try {localStorage.setItem("digiroulette_longer_evo_anim", String(next));} catch {}
      return next;
    });
  };
  const handleToggleHaptics = () => {
    setHapticsEnabled((prev) => {
      const next = !prev;
      try {localStorage.setItem("digiroulette_haptics_enabled", String(next));} catch {}
      return next;
    });
  };
  const handleToggleColorblindMode = () => {
    setColorblindMode((prev) => {
      const next = !prev;
      try {localStorage.setItem("digiroulette_colorblind_mode", String(next));} catch {}
      return next;
    });
  };


  // ✅ Portrait is now blocked by the orientation-lock overlay (App.jsx/App.css),
  // so this no longer needs to handle a stacked-portrait layout — it only needs
  // to keep the wheel from overflowing a SHORT landscape viewport (phones in
  // landscape are wide but often only ~330-420px tall).
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);
  // ✅ RESPONSIVE SCALE SYSTEM: covers everything from a flip-phone cover screen up through
  // an unfolded tablet or a desktop browser window. Rather than one boolean flipping between
  // exactly two fixed sizes (which either collided on anything smaller than the "normal" tier
  // was tuned for, or looked tiny/wasted space on anything much bigger), this adds:
  //  - isCompactLandscape now reacts to narrow WIDTH too, not just short height, so a narrow
  //    window that isn't technically "short" still gets the safer compact layout.
  //  - isUltraCompact for genuinely tiny screens (old flip-phone cover displays, the
  //    narrowest foldable cover screens) that need an extra notch below "compact".
  //  - isSpacious for tablets/iPads/unfolded foldables/desktop, so the biggest, most visible
  //    elements (the wheel, Digimon portraits) actually grow to use the extra room instead of
  //    staying pinned at phone-sized dimensions forever.
  //  - uiScale: a smooth, continuously-varying multiplier (not a jump) used to size the
  //    Digimon portraits, so screens BETWEEN the named tiers scale gradually rather than
  //    snapping between two fixed sizes right at a breakpoint edge.
  const isUltraCompact = (viewportHeight <= 360 || viewportWidth <= 380);
  const isCompactLandscape = viewportHeight <= 500 || viewportWidth <= 620;
  const isSpacious = viewportHeight >= 820 && viewportWidth >= 900;
  const uiScale = Math.max(0.62, Math.min(1.35, viewportHeight / 560));
  const wheelSize = isUltraCompact
    ? Math.max(70, Math.min(118, viewportHeight * 0.32))
    : isCompactLandscape
      ? Math.max(90, Math.min(150, viewportHeight * 0.36))
      : isSpacious
        ? Math.min(300, viewportWidth * 0.20, viewportHeight * 0.36)
        : Math.min(280, viewportWidth * 0.28);
  // Continuous size multipliers for party/reserve portraits (fed into PartySlot's
  // `sizeScale` prop), layered on TOP of the `compact` boolean's own base-size choice —
  // so a phone right at the compact threshold and a huge tablet no longer render Digimon
  // portraits at the exact same fixed pixel size.
  const mainPartyScale = Math.max(0.8, Math.min(1.3, uiScale));
  const mainReserveScale = Math.max(0.68, Math.min(1.15, uiScale * 0.88));

  const lastEnemyTs = useRef(0);
  const lastPlayerTs = useRef(0);
  const lowHpWarnedRef = useRef(new Set());

  useEffect(() => {
    const seen = localStorage.getItem("digiroulette_tutorial_seen");
    if (!seen) setShowTutorial(true);
  }, []);

  // ✅ The story-level Tutorial popup above shows on the start/starter-picker screen. This is
  // separate and deliberately gated on actually reaching gameplay: first-time players now also
  // get the Guide (button/gesture reference) once, right when they land on the World Wheel —
  // by then the Tutorial has already been closed via its own SKIP/START PLAYING button, so the
  // two never stack on top of each other.
  useEffect(() => {
    if (!["world_wheel","combat","sub_wheel","shop"].includes(game.phase)) return;
    const seen = localStorage.getItem("digiroulette_guide_seen");
    if (!seen) {
      setShowGuide(true);
      localStorage.setItem("digiroulette_guide_seen", "true");
    }
  }, [game.phase]);

  // ✅ Fainted Digimon can't evolve (enforced in the game-logic hook) — this surfaces that
  // rule right as an evolution-related wheel is about to appear, so the player sees it BEFORE
  // they can spin rather than discovering it after landing on a smaller-than-expected member
  // pool. Edge-triggered (via prevIsEvoWheelRef) so it fires once per fresh entry into that
  // wheel state, not on every render while it's showing.
  const prevIsEvoWheelRef = useRef(false);
  useEffect(() => {
    const isEvoWheel = game.phase === "sub_wheel" && (game.activeWheelType === "POST_BATTLE_CHANCE" || game.activeWheelType === "POST_BATTLE_TARGET");
    if (isEvoWheel && !prevIsEvoWheelRef.current) {
      const dismissed = localStorage.getItem("digiroulette_evo_wheel_reminder_dismissed") === "true";
      if (!dismissed) setShowEvoFaintedReminder(true);
    }
    prevIsEvoWheelRef.current = isEvoWheel;
  }, [game.phase, game.activeWheelType]);

  useEffect(() => {
    if (game.phase === "start") {
      setHighlightedEvoTier(null);
      setInfoPopup(null);
    }
  }, [game.phase]);

  // ✅ Low-HP urgency cue: play a one-shot warning the moment the active fighter first drops
  // below 20% HP, and clear the flag once they recover or a new fighter takes over.
  useEffect(() => {
    const activeIdx = game.party.findIndex((d) => d && d.hp > 0);
    if (activeIdx === -1) return;
    const digi = game.party[activeIdx];
    if (!digi || !digi.maxHp) return;
    const ratio = digi.hp / digi.maxHp;
    if (ratio <= 0.2) {
      if (!lowHpWarnedRef.current.has(activeIdx)) {
        lowHpWarnedRef.current.add(activeIdx);
        if (sfx.playLowHpWarning) sfx.playLowHpWarning();
      }
    } else {
      lowHpWarnedRef.current.delete(activeIdx);
    }
  }, [game.party]);

  useEffect(() => {
    if (!game.enemyHitAnim) return;
    if (game.enemyHitAnim.ts === lastEnemyTs.current) return;
    lastEnemyTs.current = game.enemyHitAnim.ts;
    const {type} = game.enemyHitAnim;
    setEnemyAnimState({type, ts: game.enemyHitAnim.ts});
    setScreenFlash(type);
    const dur = type === "crit" ? 500 : 350;
    const t = setTimeout(() => {setEnemyAnimState(null); setScreenFlash(null);}, dur);
    return () => clearTimeout(t);
  }, [game.enemyHitAnim]);

  useEffect(() => {
    if (!game.playerHitAnim) return;
    if (game.playerHitAnim.ts === lastPlayerTs.current) return;
    lastPlayerTs.current = game.playerHitAnim.ts;
    const {type, idx} = game.playerHitAnim;
    setPlayerAnimState({type, ts: game.playerHitAnim.ts});
    setScreenFlash(type);
    const targetIdx = idx !== undefined && idx !== -1 ? idx : game.party.findIndex((d) => d && d.hp > 0);
    if (targetIdx !== -1) {
      setPartyHpFlash((prev) => ({...prev, [targetIdx]: true}));
      setTimeout(() => setPartyHpFlash((prev) => ({...prev, [targetIdx]: false})), 400);
    }
    const dur = type === "crit" ? 500 : 350;
    const t = setTimeout(() => {setPlayerAnimState(null); setScreenFlash(null);}, dur);
    return () => clearTimeout(t);
  }, [game.playerHitAnim]);

  const handleCloseTutorial = () => {
    localStorage.setItem("digiroulette_tutorial_seen", "true");
    setShowTutorial(false);
  };

  const handleSpinComplete = (selectedIndex) => {
    setIsWheelSpinning(false);
    if (game.wheelSegments?.[selectedIndex]) setLastResult(game.wheelSegments[selectedIndex].label);
    game.handlePhysicsSpinStopped(selectedIndex);
  };

  // ✅ "Enemies Spin Themselves": when it's the enemy's turn in combat, auto-trigger the wheel
  // instead of waiting for the player to tap it. Reuses the same hidden .spin-btn the Space-bar
  // shortcut already drives (see handleKeyDown below), so it goes through the exact same click
  // path a manual spin would — no separate "auto spin" code path to keep in sync. A short delay
  // lets the player actually read the "enemy turn" announcement before the wheel takes off.
  useEffect(() => {
    if (!enemyAutoSpin) return;
    if (game.phase !== "combat" || game.activeWheelType !== "COMBAT" || game.combatTurn !== "ENEMY") return;
    if (isWheelSpinning) return;
    if (game.evolvingPartyIdx !== null || game.evolvingReserveIdx !== null) return;
    const t = setTimeout(() => {
      const btn = document.querySelector(".spin-btn");
      if (btn && !btn.disabled) btn.click();
    }, 550);
    return () => clearTimeout(t);
  }, [enemyAutoSpin, game.phase, game.activeWheelType, game.combatTurn, isWheelSpinning, game.evolvingPartyIdx, game.evolvingReserveIdx]);

  // ✅ BUGFIX v2: the previous global cooldown (arming on every tap) over-corrected — it also
  // armed on the FIRST tap of a genuine same-slot double-tap, self-blocking the info popup
  // that gesture is supposed to open. The real distinction that matters: two taps landing on
  // DIFFERENT slots in quick succession (fast reorder) risk a mobile "ghost click" duplicate
  // misfiring a native dblclick on whichever slot the second tap hit — that's what needs
  // suppressing. Two taps on the SAME slot in quick succession is the intentional "view info"
  // gesture and must never be suppressed. Tracked per-slot (not globally) so only the specific
  // slot that just received a cross-slot tap gets its dblclick suppressed.
  const lastSlotTapRef = useRef({type: null, index: null, ts: 0});
  const [suppressedSlot, setSuppressedSlot] = useState(null); // {type, index} | null
  const suppressedSlotTimeoutRef = useRef(null);
  useEffect(() => () => {
    if (suppressedSlotTimeoutRef.current) clearTimeout(suppressedSlotTimeoutRef.current);
  }, []);

  // ✅ Executes the actual swap given resolved from/to slot params — shared by the direct
  // path (reminder already dismissed, or not in combat) and the reminder modal's Confirm.
  const executeHotSwap = useCallback(({fromType, fromIndex, toType, toIndex}) => {
    if (fromType === "party" && toType === "reserve") game.swapPartyAndReserve(fromIndex, toIndex, true);
    else if (fromType === "reserve" && toType === "party") game.swapPartyAndReserve(toIndex, fromIndex, true);
    else if (fromType === "party" && toType === "party") game.swapPartyAndReserve(fromIndex, toIndex, false);
  }, [game.swapPartyAndReserve]);

  const handleSlotClick = useCallback((type, index) => {
    // ✅ Party order changes / hot-swaps are locked out while the wheel is actively spinning
    if (isWheelSpinning) return;

    const now = Date.now();
    const prevTap = lastSlotTapRef.current;
    const crossedFromDifferentSlot = prevTap.type !== null && (prevTap.type !== type || prevTap.index !== index) && (now - prevTap.ts < 450);
    lastSlotTapRef.current = {type, index, ts: now};
    if (crossedFromDifferentSlot) {
      setSuppressedSlot({type, index});
      if (suppressedSlotTimeoutRef.current) clearTimeout(suppressedSlotTimeoutRef.current);
      suppressedSlotTimeoutRef.current = setTimeout(() => setSuppressedSlot(null), 400);
    }

    if (!selectedSlot) {setSelectedSlot({type, index}); return;}
    const isValidSwap = (selectedSlot.type === "party" && type === "reserve")
      || (selectedSlot.type === "reserve" && type === "party")
      || (selectedSlot.type === "party" && type === "party" && selectedSlot.index !== index);
    const swapParams = {fromType: selectedSlot.type, fromIndex: selectedSlot.index, toType: type, toIndex: index};
    setSelectedSlot(null);
    if (!isValidSwap) return;

    // ✅ Hot-swapping only costs a turn during combat — that's the only context where the
    // reminder matters, so it's the only context that gates on it.
    if (game.phase === "combat") {
      const dismissed = localStorage.getItem("digiroulette_hotswap_reminder_dismissed") === "true";
      if (!dismissed) {setPendingSwap(swapParams); return;}
    }
    executeHotSwap(swapParams);
  }, [isWheelSpinning, selectedSlot, game.phase, executeHotSwap]);

  // ✅ MOBILE PERF (fix #1): these four handlers used to be recreated as fresh inline arrow
  // functions at EVERY PartySlot call site, on every render — 18 slots × 5 props each,
  // regenerated even when nothing about that slot had changed. That defeated the React.memo
  // wrap on PartySlot entirely, since a new function reference always fails memo's shallow
  // prop comparison. Now each slot receives its own stable `slotType`/`slotIndex` (primitives,
  // cheap to compare) plus ONE shared handler reused across every slot — so an unrelated
  // re-render (e.g. a combat HP tick on party slot 0) no longer forces reserve slots 1–6 to
  // re-render along with it.
  const handleInfoToggle = useCallback((type, index) => {
    setInfoPopup((prev) => (prev && prev.type === type && prev.idx === index) ? null : {type, idx: index});
  }, []);
  const handleEvolveRequest = useCallback((type, index) => {
    game.evolveWithChip(index, type === "reserve");
    setHighlightedEvoTier(null);
  }, [game.evolveWithChip]);
  const handleReleaseRequest = useCallback((type, index) => {
    setReleaseConfirm({index, isReserve: type === "reserve"});
  }, []);
  const handleSellRequest = useCallback((type, index) => {
    setSellConfirm({index, isReserve: type === "reserve"});
  }, []);
  // ✅ Same PartySlot-style stabilization applied to InventoryPanel's evolution-chip
  // highlight toggle — this used to be a fresh inline arrow at the InventoryPanel call site,
  // recreated on every GameCore render.
  const handleToggleEvoHighlight = useCallback((tier) => {
    setHighlightedEvoTier((prev) => prev === tier ? null : tier);
  }, []);
  // ✅ Primitive boolean instead of `game.sellDigimon && game.phase==="shop" ? fn : undefined`
  // at each call site — that ternary was also producing a fresh value shape per render.
  const canSellFromHere = !!(game.sellDigimon && game.phase === "shop");



  const confirmHotSwap = (dontShowAgain) => {
    if (dontShowAgain) {
      try {localStorage.setItem("digiroulette_hotswap_reminder_dismissed", "true");} catch {}
    }
    if (pendingSwap) executeHotSwap(pendingSwap);
    setPendingSwap(null);
  };

  const cancelHotSwap = () => setPendingSwap(null);

  const handleKeyDown = useCallback((e) => {
    if (["loading","resume_prompt"].includes(game.phase) || showTutorial || showGuide || showBestiary || showSettings || showLeaderboard || releaseConfirm || sellConfirm || game.pendingCapture) return;
    if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT") return;
    if (e.code === "Space") {
      e.preventDefault();
      // ✅ FIX 2: Blur focused element first so Space never re-fires Heal/Revive/Release
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
      const btn = document.querySelector(".spin-btn");
      if (btn && !btn.disabled) btn.click();
    }
    if (e.code === "KeyH") {
      const idx = game.party.findIndex((d) => d && d.hp > 0 && d.hp < d.maxHp);
      if (idx !== -1 && game.inventory.potion > 0) game.usePotionOnDigimon(idx, false);
    }
  }, [game, showTutorial, showGuide, showBestiary, showSettings, showLeaderboard, releaseConfirm, sellConfirm]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const isBossWave = game.villainWaveStage === 8;
  const activePartyIdx = game.party.findIndex((d) => d && d.hp > 0);
  // ✅ FIX: this used to be inferred as "first alive party member," recomputed AFTER the
  // party array already reflected a fatal hit — so the moment a hit was fatal, the shake,
  // hit-flash, and floating damage number all silently jumped to the NEXT teammate instead
  // of the one who actually took the hit. The event itself now carries who was hit.
  const lastHitPartyIdx = game.playerHitAnim?.idx;
  const enemyAnimClass = reducedMotion ? "" : (enemyAnimState?.type === "crit" ? "enemy-shake-crit" : enemyAnimState?.type === "hit" ? "enemy-shake" : "");
  const enemyAnimKey = enemyAnimState?.ts || 0;
  const playerAnimClass = reducedMotion ? "" : (playerAnimState?.type === "crit" ? "player-shake-crit" : playerAnimState?.type === "hit" ? "player-shake" : "");
  const playerAnimKey = playerAnimState?.ts || 0;

  // ✅ Floating damage/heal numbers — derived directly from state every render, keyed by their
  // event timestamp. No array, no push, no effect: React's own keyed reconciliation guarantees
  // exactly one node per event, so a duplicate number is structurally impossible here.
  const enemyFloatEvent = (() => {
    const hit = game.enemyHitAnim?.amount ? {ts: game.enemyHitAnim.ts, text: `-${game.enemyHitAnim.amount}`, color: game.enemyHitAnim.type === "crit" ? "#ffcf40" : "#ff5c5c"} : null;
    const heal = game.enemyHealAnim?.amount ? {ts: game.enemyHealAnim.ts, text: `+${game.enemyHealAnim.amount}`, color: "#56d364"} : null;
    if (hit && heal) return hit.ts >= heal.ts ? hit : heal;
    return hit || heal || null;
  })();
  const partyFloatEvents = {};
  if (game.playerHitAnim?.amount && lastHitPartyIdx !== undefined && lastHitPartyIdx !== -1) {
    partyFloatEvents[lastHitPartyIdx] = {ts: game.playerHitAnim.ts, text: `-${game.playerHitAnim.amount}`, color: game.playerHitAnim.type === "crit" ? "#ffcf40" : "#ff5c5c"};
  }
  if (game.partyHealAnim?.amount) {
    const existing = partyFloatEvents[game.partyHealAnim.idx];
    if (!existing || game.partyHealAnim.ts >= existing.ts) {
      partyFloatEvents[game.partyHealAnim.idx] = {ts: game.partyHealAnim.ts, text: `+${game.partyHealAnim.amount}`, color: "#56d364"};
    }
  }

  // ── RESUME PROMPT ─────────────────────────────────────────
  if (game.phase === "resume_prompt" || game.showResumePrompt) {
    const save = (() => {try {return JSON.parse(localStorage.getItem(saveKey) || "{}");} catch {return {};}})();
    const savedDate = save.savedAt ? new Date(save.savedAt).toLocaleString() : "Unknown";
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#16171d",color:"#fff"}}>
        <div style={{background:"#1b1c24",border:"2px solid #3498db",borderRadius:"16px",padding:"32px 28px",maxWidth:"420px",width:"90%",textAlign:"center",display:"flex",flexDirection:"column",gap:"20px"}}>
          <div style={{fontSize:"2.5rem"}}>💾</div>
          <h2 style={{margin:0,color:"#58a6ff"}}>Resume Previous Run?</h2>
          <p style={{margin:0,color:"#c9d1d9",fontSize:"0.9rem"}}>
            A saved run was found from <b>{savedDate}</b>.<br />
            Wave <b>{save.villainWaveStage || 0}</b> reached, Score: <b>{save.score || 0}</b>.
          </p>
          <div style={{display:"flex",gap:"12px",justifyContent:"center"}}>
            <button onClick={() => game.handleResume(false)} style={{padding:"12px 24px",background:"#21262d",color:"#fff",border:"1px solid #30363d",borderRadius:"8px",cursor:"pointer",fontWeight:"bold",fontSize:"0.95rem"}}>🆕 New Run</button>
            <button onClick={() => game.handleResume(true)} style={{padding:"12px 24px",background:"#3498db",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:"bold",fontSize:"0.95rem"}}>▶️ Resume</button>
          </div>
          {onExitMode && <button onClick={onExitMode} style={{background:"transparent",border:"none",color:"#6e7681",fontSize:"0.8rem",cursor:"pointer",textDecoration:"underline"}}>🏠 Back to Main Menu</button>}
        </div>
      </div>
    );
  }

  // ── LOADING ──────────────────────────────────────────────
  if (game.phase === "loading") {
    return <LoadingScreen loadingMsg={game.loadingMsg} loadError={game.loadError} onRetry={game.retryDataLoad} />;
  }

  // ── START SCREEN ─────────────────────────────────────────
  if (game.phase === "start") {
    const highScore = parseInt(localStorage.getItem(highscoreKey) || "0");
    const starters = game.starters || [];
    // ✅ Big screens (tablet/iPad/desktop) have room for a 4x2 grid (8 per page) instead of
    // just one row of 4 — smaller/compact screens keep the original single row of 4.
    const perPage = isSpacious ? 8 : 4;
    const totalPages = Math.max(1, Math.ceil(starters.length / perPage));
    const safePage = ((pickerPage % totalPages) + totalPages) % totalPages;
    const pageStart = safePage * perPage;
    const pageSlice = starters.slice(pageStart, pageStart + perPage);
    const selected = starters[selectedStarterIdx] || starters[0] || null;
    const goToPage = (p) => setPickerPage(((p % totalPages) + totalPages) % totalPages);

    return (
      <>
        {showTutorial && <TutorialPopup onClose={handleCloseTutorial} steps={mode === "shop" ? SHOP_TUTORIAL_STEPS : RNG_TUTORIAL_STEPS} />}
        {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
        {showBestiary && <BestiaryModal fullRoster={game.fullRoster} onClose={() => setShowBestiary(false)} bestiaryKey={bestiaryKey} />}
        {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} getLeaderboard={getLeaderboard} />}
        {showSettings && <SettingsModal
          onClose={() => setShowSettings(false)}
          musicVolume={musicVolume} onMusicVolumeChange={handleMusicVolumeChange}
          sfxVolume={sfxVolume} onSfxVolumeChange={handleSfxVolumeChange}
          isMuted={isMuted} onToggleMute={handleToggleMute}
          reducedMotion={reducedMotion} onToggleReducedMotion={handleToggleReducedMotion}
          fastSpin={fastSpin} onToggleFastSpin={handleToggleFastSpin}
          enemyAutoSpin={enemyAutoSpin} onToggleEnemyAutoSpin={handleToggleEnemyAutoSpin}
          reduceEvoAnim={reduceEvoAnim} onToggleReduceEvoAnim={handleToggleReduceEvoAnim}
          longerEvoAnim={longerEvoAnim} onToggleLongerEvoAnim={handleToggleLongerEvoAnim}
          hapticsEnabled={hapticsEnabled} onToggleHaptics={handleToggleHaptics}
          colorblindMode={colorblindMode} onToggleColorblindMode={handleToggleColorblindMode}
          evoAnimSettings={game.evoAnimSettings} onToggleEvoAnimSetting={game.toggleEvoAnimSetting}
          onHome={onExitMode}
        />}

        <div style={{display:"flex",alignItems:"stretch",justifyContent:"center",height:"100dvh",background:DV.void,padding:isCompactLandscape?"6px":"10px",boxSizing:"border-box",overflow:"hidden",fontFamily:DV_FONT_MONO}}>
          <style>{`
            @keyframes dvBlink{0%,49%{opacity:1;}50%,100%{opacity:0.15;}}
            .dv-dot{animation:dvBlink 1.6s steps(1) infinite;}
            @keyframes dvScan{0%{top:-10%;}100%{top:110%;}}
            .dv-screen::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(to bottom,rgba(77,255,143,0.05) 0px,rgba(77,255,143,0.05) 1px,transparent 2px,transparent 4px);pointer-events:none;mix-blend-mode:screen;}
            .dv-screen::after{content:"";position:absolute;inset:0;box-shadow:inset 0 0 90px rgba(0,0,0,0.65);pointer-events:none;}
          `}</style>

          <div style={{width:"100%",maxWidth:isSpacious?"1240px":"900px",height:"100%",display:"flex",flexDirection:"column",background:`linear-gradient(180deg,#1b2620,${DV.bezel} 40%)`,border:`1px solid ${DV.bezelLine}`,borderRadius:"18px",padding:isCompactLandscape?"6px":isSpacious?"14px":"9px",boxShadow:"0 30px 60px rgba(0,0,0,0.55)",boxSizing:"border-box"}}>

            {/* Top chrome row — Home + all utility buttons live together here now,
                truly centered via a 3-column grid (dots | buttons | spacer) so the
                button group centers regardless of how wide the dots are. */}
            <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",padding:"2px 8px 3px",flexShrink:0,gap:"6px"}}>
              <div style={{display:"flex",gap:"5px"}}>
                {[0,1,2].map((i) => <span key={i} style={{width:"5px",height:"5px",borderRadius:"50%",background:DV.bezelLine,display:"inline-block"}} />)}
              </div>
              <div style={{display:"flex",gap:"5px",flexWrap:"wrap",justifyContent:"center"}}>
                {onExitMode && <button onClick={onExitMode} style={{background:"transparent",border:`1px solid ${DV.bezelLine}`,color:DV.inkDim,borderRadius:"5px",padding:"3px 8px",fontFamily:DV_FONT_MONO,fontSize:"7.5px",fontWeight:"bold",cursor:"pointer"}}>HOME</button>}
                <button onClick={() => setShowTutorial(true)} style={{background:"transparent",border:`1px solid ${DV.bezelLine}`,color:DV.inkDim,borderRadius:"5px",padding:"3px 8px",fontFamily:DV_FONT_MONO,fontSize:"7.5px",fontWeight:"bold",cursor:"pointer"}}>HELP</button>
                <button onClick={() => setShowGuide(true)} style={{background:"transparent",border:`1px solid ${DV.bezelLine}`,color:DV.inkDim,borderRadius:"5px",padding:"3px 8px",fontFamily:DV_FONT_MONO,fontSize:"7.5px",fontWeight:"bold",cursor:"pointer"}}>GUIDE</button>
                <button onClick={() => setShowBestiary(true)} style={{background:"transparent",border:`1px solid ${DV.bezelLine}`,color:DV.inkDim,borderRadius:"5px",padding:"3px 8px",fontFamily:DV_FONT_MONO,fontSize:"7.5px",fontWeight:"bold",cursor:"pointer"}}>DEX</button>
                <button onClick={() => setShowLeaderboard(true)} style={{background:"transparent",border:`1px solid ${DV.bezelLine}`,color:DV.inkDim,borderRadius:"5px",padding:"3px 8px",fontFamily:DV_FONT_MONO,fontSize:"7.5px",fontWeight:"bold",cursor:"pointer"}}>BOARD</button>
                <button onClick={() => setShowSettings(true)} style={{background:"transparent",border:`1px solid ${DV.bezelLine}`,color:DV.inkDim,borderRadius:"5px",padding:"3px 8px",fontFamily:DV_FONT_MONO,fontSize:"7.5px",fontWeight:"bold",cursor:"pointer"}}>SET</button>
                {onSwitchMode && <button onClick={onSwitchMode} style={{background:"transparent",border:`1px solid ${DV.bezelLine}`,color:DV.inkDim,borderRadius:"5px",padding:"3px 8px",fontFamily:DV_FONT_MONO,fontSize:"7.5px",fontWeight:"bold",cursor:"pointer"}}>SWITCH: {mode==="shop"?"RNG":"SHOP"}</button>}
              </div>
              <div />
            </div>

            <div className="dv-screen" style={{position:"relative",flex:1,minHeight:0,display:"flex",flexDirection:"column",background:`radial-gradient(120% 140% at 50% -10%,#0d1f16,${DV.screen} 60%)`,border:`1px solid ${DV.bezelLine}`,borderRadius:"13px",overflow:"hidden",padding:isCompactLandscape?"7px 10px":"9px 14px"}}>

              {/* Status + best-score row */}
              <div style={{position:"relative",zIndex:2,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"4px 10px",flexShrink:0}}>
                <span style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"8px",letterSpacing:"1px",color:DV.phosphor,flexShrink:0}}>
                  <span className="dv-dot" style={{width:"5px",height:"5px",borderRadius:"50%",background:DV.phosphor,display:"inline-block"}} />
                  DIGITAL FIELD LINK: ONLINE
                </span>
                <span style={{fontSize:"8px",letterSpacing:"1px",color:DV.amber,flexShrink:0}}>{highScore > 0 ? `🏆 BEST ${highScore.toLocaleString()} — ${getRank(highScore).rank}` : ""}</span>
              </div>

              {/* Title, now its own fully-centered row */}
              <div style={{position:"relative",zIndex:2,textAlign:"center",flexShrink:0,margin:"4px 0 6px"}}>
                <h1 style={{fontFamily:DV_FONT_DISPLAY,fontSize:isCompactLandscape?"clamp(11px,2.4vw,15px)":isSpacious?"clamp(20px,3vw,30px)":"clamp(13px,2.8vw,19px)",letterSpacing:"1px",color:DV.phosphor,textShadow:"0 0 14px rgba(77,255,143,0.55)",margin:0}}>
                  SCAN<span style={{color:DV.ink}}>_FOR_PARTNER</span>
                </h1>
              </div>

              {/* Difficulty toggle — the only thing left in this row now that the
                  utility buttons moved up to the top chrome row */}
              <div style={{position:"relative",zIndex:2,display:"flex",justifyContent:"center",alignItems:"center",flexShrink:0,marginBottom:"6px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                  <span style={{fontSize:"7.5px",color:DV.inkDim,letterSpacing:"1px"}}>DIFF</span>
                  <div style={{display:"flex",gap:"2px"}}>
                    {[{key:"easy",label:"EASY"},{key:"normal",label:"NORM"},{key:"hard",label:"HARD"}].map((d) => (
                      <button key={d.key} onClick={() => handleDifficultyChange(d.key)} style={{fontSize:"7px",fontWeight:"bold",letterSpacing:"0.5px",padding:"3px 7px",borderRadius:"5px",border:`1px solid ${difficulty===d.key?DV.phosphor:DV.bezelLine}`,background:difficulty===d.key?"#0a1712":"transparent",color:difficulty===d.key?DV.phosphor:DV.inkDim,cursor:"pointer",fontFamily:DV_FONT_MONO}}>{d.label}</button>
                    ))}
                  </div>
                </div>
              </div>

              {game.loadingMsg && <p style={{position:"relative",zIndex:2,textAlign:"center",color:DV.amber,fontSize:"9px",flexShrink:0,margin:"0 0 6px"}}>⏳ {game.loadingMsg}</p>}

              <div style={{position:"relative",zIndex:2,display:"grid",gridTemplateColumns:"auto minmax(0,1fr) auto",alignItems:"stretch",gap:isCompactLandscape?"6px":"10px",flex:1,minHeight:0}}>
                <button onClick={() => goToPage(safePage - 1)} disabled={starters.length===0} style={{flexShrink:0,alignSelf:"center",width:isCompactLandscape?"28px":isSpacious?"40px":"34px",height:isCompactLandscape?"48px":isSpacious?"68px":"58px",background:"#050c08",border:`1px solid ${DV.bezelLine}`,borderRadius:"8px",color:DV.inkDim,fontSize:isSpacious?"20px":"16px",fontWeight:"bold",cursor:starters.length?"pointer":"default",opacity:starters.length?1:0.3}}>&lt;</button>

                {/* Border removed per feedback — corner brackets alone now frame the pane.
                    ✅ margin:"0 auto" is what actually centers this pane: the grid's middle
                    track already spans the full remaining width evenly between the two nav
                    buttons (which sit pinned to the true left/right edges via their own
                    "auto" columns), so centering the maxWidth-capped pane inside that track
                    no longer depends on flex-grow reaching its cap before justify-content had
                    any leftover space to distribute — which is what let it drift off-center
                    on wide screens before. */}
                <div style={{flex:1,minWidth:0,maxWidth:isSpacious?"760px":"560px",width:"100%",margin:"0 auto",minHeight:0,background:"#050c08",border:"none",borderRadius:"12px",padding:isCompactLandscape?"7px 8px":isSpacious?"14px 16px":"10px 12px",position:"relative",display:"flex",flexDirection:"column",overflowY:"auto"}}>

                  <div style={{display:"flex",justifyContent:"space-between",fontSize:isSpacious?"11px":"8px",color:DV.inkDim,letterSpacing:"1px",marginBottom:isSpacious?"10px":"6px",flexShrink:0}}>
                    <span>UNITS <span style={{color:DV.phosphor}}>{String(pageStart+1).padStart(2,"0")}–{String(Math.min(pageStart+perPage,starters.length)).padStart(2,"0")}</span> / {String(starters.length).padStart(2,"0")}</span>
                    <span>SCAN COMPLETE</span>
                  </div>

                  <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",alignItems:"flex-start",gap:isCompactLandscape?"6px":isSpacious?"14px":"8px",flexShrink:0,marginTop:isSpacious?"auto":0,marginBottom:isSpacious?"auto":0}}>
                    {pageSlice.map((s, i) => {
                      const globalIdx = pageStart + i;
                      const isSel = globalIdx === selectedStarterIdx;
                      const portraitSize = isCompactLandscape ? "62px" : isSpacious ? "128px" : "78px";
                      return (
                        <div key={s.dapiName} onClick={() => setSelectedStarterIdx(globalIdx)} style={{background:isSel?"#0a1712":"#08120d",border:`1px solid ${isSel?DV.phosphor:DV.bezelLine}`,borderRadius:"8px",padding:isCompactLandscape?"4px 3px":isSpacious?"10px 8px":"6px 5px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0px",cursor:"pointer",boxShadow:isSel?`0 0 0 1px ${DV.phosphor}, 0 0 14px rgba(77,255,143,0.3)`:"none",flex:"0 1 21%",minWidth:isCompactLandscape?"64px":isSpacious?"140px":"84px",maxWidth:"170px",boxSizing:"border-box",textAlign:"center"}}>
                          <div style={{position:"relative",width:portraitSize,height:portraitSize,borderRadius:"7px",background:"radial-gradient(circle at 50% 35%, #12241a, #081410 75%)",border:`1px solid ${isSel?DV.phosphor:DV.bezelLine}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                            <img src={s.image} alt={s.dapiName} style={{width:"78%",height:"78%",objectFit:"contain"}} />
                            {isSel && <span style={{position:"absolute",left:0,right:0,height:"26%",background:"linear-gradient(to bottom,transparent,rgba(77,255,143,0.28),transparent)",animation:"dvScan 2.6s linear infinite"}} />}
                          </div>
                          <span style={{fontSize:isCompactLandscape?"6.5px":isSpacious?"11px":"7.5px",fontWeight:"bold",color:isSel?DV.phosphor:DV.ink,letterSpacing:"0.5px",textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",width:"100%",marginTop:isSpacious?"3px":"-2px"}}>{s.dapiName}</span>

                          {/* HP + PWR + Attribute together on one compact line, attribute now beside PWR on the right */}
                          <div style={{display:"flex",gap:isSpacious?"8px":"5px",flexWrap:"wrap",justifyContent:"center",lineHeight:1,marginTop:isSpacious?"3px":0}}>
                            <span style={{fontSize:isSpacious?"9.5px":"6px",color:DV.inkDim}}>HP <b style={{color:DV.phosphor}}>{s.hp}</b></span>
                            <span style={{fontSize:isSpacious?"9.5px":"6px",color:DV.inkDim}}>PWR <b style={{color:DV.amber}}>{s.power}</b></span>
                            <span style={{fontSize:isSpacious?"9.5px":"6px",color:DV.inkDim}}>{s.attribute}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button onClick={() => goToPage(safePage + 1)} disabled={starters.length===0} style={{flexShrink:0,alignSelf:"center",width:isCompactLandscape?"28px":isSpacious?"40px":"34px",height:isCompactLandscape?"48px":isSpacious?"68px":"58px",background:"#050c08",border:`1px solid ${DV.bezelLine}`,borderRadius:"8px",color:DV.inkDim,fontSize:isSpacious?"20px":"16px",fontWeight:"bold",cursor:starters.length?"pointer":"default",opacity:starters.length?1:0.3}}>&gt;</button>
              </div>

              <div style={{position:"relative",zIndex:2,display:"flex",justifyContent:"center",gap:"5px",padding:"6px 0 4px",flexShrink:0}}>
                {Array.from({length:totalPages},(_,p) => (
                  <span key={p} onClick={() => goToPage(p)} style={{width:"6px",height:"6px",borderRadius:"50%",background:p===safePage?DV.phosphor:DV.bezelLine,boxShadow:p===safePage?"0 0 6px rgba(77,255,143,0.7)":"none",cursor:"pointer",display:"inline-block"}} />
                ))}
              </div>

              <div style={{position:"relative",zIndex:2,padding:"2px 0 2px",display:"flex",justifyContent:"center",flexShrink:0}}>
                <button onClick={() => selected && game.chooseStarter(selected)} disabled={!selected} style={{background:DV.phosphor,color:"#0a1712",border:"none",borderRadius:"9px",padding:isSpacious?"13px 34px":"9px 28px",fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:isCompactLandscape?"9px":isSpacious?"13px":"10px",letterSpacing:"1.5px",cursor:selected?"pointer":"default",opacity:selected?1:0.5}}>
                  {selected ? `> BOND WITH ${selected.dapiName.toUpperCase()}_` : "> LOADING..."}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── GAME OVER ────────────────────────────────────────────
  if (game.phase === "game_over") {
    const rank = getRank(game.score);
    const highScore = parseInt(localStorage.getItem(highscoreKey) || "0");
    const isNewHigh = game.score > 0 && game.score >= highScore;
    const GO = {void:"#100707", bezel:"#1c1414", bezelLine:"#3a2c2c", screen:"#140808", danger:"#ff5c5c", dangerDim:"#a13a3a", dangerDeep:"#7a2e2e", ink:"#e8c9c9", inkDim:"#8c5f5f"};
    // ✅ Score Calculation: falls back to an all-zero shape for saves from before this feature
    // existed, so an older save's Game Over screen still renders instead of crashing.
    const sb = game.scoreBreakdown || {enemiesDefeated:{count:0,points:0}, wildCaptured:{count:0,points:0}, legendaryCaptured:{count:0,points:0}, waves:[]};
    const hasAnyScoreEvents = sb.enemiesDefeated.count > 0 || sb.wildCaptured.count > 0 || sb.legendaryCaptured.count > 0 || sb.waves.length > 0;
    // ✅ Squad status now shows the full roster — party (defeated in the final battle) plus
    // any Digimon still sitting in Reserve when the run ended (never fainted, just benched).
    const fullSquadForDisplay = [
      ...game.party.map((d) => ({...d, _wasReserve: false})),
      ...game.reserve.map((d) => ({...d, _wasReserve: true})),
    ];
    return (
      <>
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} getLeaderboard={getLeaderboard} />}
      <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",background:GO.void,padding:isCompactLandscape?"6px":"10px",boxSizing:"border-box",fontFamily:DV_FONT_MONO}}>
        <style>{`@keyframes goBlink{0%,49%{opacity:1;}50%,100%{opacity:0.15;}} @keyframes goGlow{0%,100%{text-shadow:0 0 14px rgba(255,92,92,0.55);}50%{text-shadow:0 0 26px rgba(255,92,92,0.9), 0 0 44px rgba(255,92,92,0.4);}}`}</style>
        <div style={{width:"100%",maxWidth:"760px",height:isCompactLandscape?"96dvh":"min(480px,92dvh)",background:`linear-gradient(180deg,#261818,${GO.bezel} 40%)`,border:`1px solid ${GO.bezelLine}`,borderRadius:"18px",padding:isCompactLandscape?"5px":"7px",boxShadow:"0 30px 60px rgba(0,0,0,0.6)",display:"flex",flexDirection:"column",boxSizing:"border-box"}}>
          <div style={{display:"flex",gap:"5px",padding:"2px 8px 3px",flexShrink:0}}>
            {[0,1,2].map((i) => <span key={i} style={{width:"5px",height:"5px",borderRadius:"50%",background:GO.bezelLine,display:"inline-block"}} />)}
          </div>

          <div style={{position:"relative",flex:1,minHeight:0,background:`radial-gradient(120% 140% at 50% -10%, #291414, ${GO.screen} 60%)`,border:`1px solid ${GO.dangerDeep}`,borderRadius:"13px",overflow:"hidden",padding:isCompactLandscape?"7px 9px":"10px 14px",display:"flex",flexDirection:"column",boxSizing:"border-box"}}>
            <div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(to bottom, rgba(255,92,92,0.05) 0px, rgba(255,92,92,0.05) 1px, transparent 2px, transparent 4px)",pointerEvents:"none",mixBlendMode:"screen"}} />

            <div style={{position:"relative",zIndex:2,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:"8px",letterSpacing:"1.5px",color:GO.inkDim,marginBottom:isCompactLandscape?"2px":"3px"}}>
              <span style={{display:"flex",alignItems:"center",gap:"5px",color:GO.danger}}>
                <span style={{width:"5px",height:"5px",borderRadius:"50%",background:GO.danger,display:"inline-block",animation:"goBlink 1.1s steps(1) infinite"}} />
                MISSION UPLINK: LOST
              </span>
              {!isCompactLandscape && <span>SYS.04 · ALL UNITS DOWN</span>}
            </div>

            {/* ✅ "// TRANSMISSION INTERRUPTED //" removed — RUN TERMINATED now sits directly
                under the status row with just enough gap to breathe, moving it up. */}
            <div style={{position:"relative",zIndex:2,textAlign:"center",flexShrink:0,marginBottom:isCompactLandscape?"4px":"6px"}}>
              <h1 style={{fontFamily:DV_FONT_DISPLAY,fontSize:isCompactLandscape?"clamp(11px,2.6vw,15px)":"clamp(14px,2.8vw,20px)",letterSpacing:"1.5px",color:GO.danger,margin:0,animation:"goGlow 1.8s ease-in-out infinite"}}>RUN TERMINATED</h1>
            </div>

            <div style={{position:"relative",zIndex:2,flex:1,minHeight:0,display:"flex",gap:"10px"}}>
              <div style={{width:"52%",background:"#150a0a",border:`1px solid ${GO.bezelLine}`,borderRadius:"10px",padding:"9px 11px",display:"flex",flexDirection:"column",minHeight:0,boxSizing:"border-box"}}>
                <div style={{fontSize:"8px",letterSpacing:"1.5px",color:GO.danger,fontWeight:"bold",marginBottom:"6px",flexShrink:0}}>🧮 SCORE CALCULATION</div>
                {/* ✅ Replaces the raw battle log with an itemized breakdown of exactly where
                    every point came from — enemy kills, captures, and a per-wave record of
                    each Nemesis Raid wave's clear/no-items/boss bonuses. */}
                <div style={{flex:1,minHeight:0,overflowY:"auto",display:"flex",flexDirection:"column",gap:"6px"}}>
                  {!hasAnyScoreEvents && <div style={{fontSize:"8px",color:GO.inkDim,fontStyle:"italic"}}>No points earned this run.</div>}
                  {sb.enemiesDefeated.count > 0 && (
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:"8px",lineHeight:"1.4"}}>
                      <span style={{color:GO.inkDim}}><span style={{color:GO.dangerDim}}>{"> "}</span>⚔️ Enemies Defeated ×{sb.enemiesDefeated.count}</span>
                      <span style={{color:DV.amber,fontWeight:"bold",flexShrink:0,marginLeft:"6px"}}>+{sb.enemiesDefeated.points}</span>
                    </div>
                  )}
                  {sb.wildCaptured.count > 0 && (
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:"8px",lineHeight:"1.4"}}>
                      <span style={{color:GO.inkDim}}><span style={{color:GO.dangerDim}}>{"> "}</span>🕸️ Wild Captures ×{sb.wildCaptured.count}</span>
                      <span style={{color:DV.amber,fontWeight:"bold",flexShrink:0,marginLeft:"6px"}}>+{sb.wildCaptured.points}</span>
                    </div>
                  )}
                  {sb.legendaryCaptured.count > 0 && (
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:"8px",lineHeight:"1.4"}}>
                      <span style={{color:GO.inkDim}}><span style={{color:GO.dangerDim}}>{"> "}</span>👑 Legendary Captures ×{sb.legendaryCaptured.count}</span>
                      <span style={{color:DV.amber,fontWeight:"bold",flexShrink:0,marginLeft:"6px"}}>+{sb.legendaryCaptured.points}</span>
                    </div>
                  )}
                  {sb.waves.map((w, i) => (
                    <div key={i} style={{display:"flex",flexDirection:"column",gap:"1px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:"8px",lineHeight:"1.4"}}>
                        <span style={{color:GO.inkDim}}><span style={{color:GO.dangerDim}}>{"> "}</span>🚨 Wave {w.wave} Cleared</span>
                        <span style={{color:DV.amber,fontWeight:"bold",flexShrink:0,marginLeft:"6px"}}>+{w.total}</span>
                      </div>
                      {(w.noItemBonus > 0 || w.bossBonus > 0) && (
                        <div style={{fontSize:"6.5px",color:GO.inkDim,paddingLeft:"11px",lineHeight:"1.3"}}>
                          clear +{w.clearPoints}{w.noItemBonus > 0 ? ` · no items +${w.noItemBonus}` : ""}{w.bossBonus > 0 ? ` · boss +${w.bossBonus}` : ""}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{marginTop:"7px",paddingTop:"7px",borderTop:`1px dashed ${GO.bezelLine}`,display:"flex",justifyContent:"space-between",alignItems:"baseline",flexShrink:0}}>
                  <span style={{fontSize:"7.5px",color:GO.inkDim,letterSpacing:"1px"}}>SCORE AT TERMINATION</span>
                  <span style={{fontFamily:DV_FONT_DISPLAY,fontSize:"15px",color:DV.amber,textShadow:"0 0 12px rgba(255,178,56,0.5)"}}>{game.score.toLocaleString()}</span>
                </div>
              </div>

              <div style={{width:"48%",display:"flex",flexDirection:"column",gap:"6px",minHeight:0}}>
                {/* ✅ Rank card made shorter/more compact: smaller icon, tighter padding & gaps */}
                <div style={{background:"#150a0a",border:`1px solid ${GO.dangerDeep}`,borderRadius:"9px",padding:"6px 8px",display:"flex",alignItems:"center",gap:"7px",flexShrink:0}}>
                  <div style={{width:"32px",height:"32px",borderRadius:"7px",background:"#0d0505",border:`1px solid ${GO.dangerDeep}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:DV_FONT_DISPLAY,fontSize:"13px",color:GO.ink,flexShrink:0}}>{rank.rank}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"8.5px",fontWeight:"bold",color:GO.ink,lineHeight:"1.2"}}>{rank.label.toUpperCase()}</div>
                    <div style={{fontSize:"6.5px",color:GO.inkDim,marginTop:"1px",lineHeight:"1.3"}}>Wave {game.villainWaveStage}/8 &nbsp;·&nbsp; Squad wiped</div>
                    {isNewHigh && <div style={{fontSize:"6px",color:DV.amber,marginTop:"1px"}}>🏆 New High Score!</div>}
                  </div>
                </div>

                {/* ✅ Squad status: even more compact than before — name sits right against the
                    picture and the status tag sits right against the name (gap:0 on the card,
                    tight lineHeight + a 2px nudge instead of the old 4px flex gap). */}
                <div style={{flex:1,minHeight:0,background:"#150a0a",border:`1px solid ${GO.bezelLine}`,borderRadius:"10px",padding:"6px 7px",display:"flex",flexDirection:"column"}}>
                  <div style={{fontSize:"7.5px",letterSpacing:"1.5px",color:GO.danger,fontWeight:"bold",marginBottom:"3px",flexShrink:0}}>💀 SQUAD STATUS</div>
                  <div style={{flex:1,minHeight:0,overflowY:"auto",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"3px",alignContent:"start"}}>
                    {fullSquadForDisplay.map((d, i) => (
                      <div key={i} style={{background:"#0d0505",border:`1px solid ${GO.dangerDeep}`,borderRadius:"6px",padding:"3px",display:"flex",flexDirection:"column",alignItems:"center",gap:"0px",opacity:0.75,minWidth:0,minHeight:0}}>
                        {/* ✅ FIX: minWidth:0 is required here — without it a flex/grid item's
                            default min-size is its content's min-content size, so a Digimon
                            with a larger natural image resolution than its neighbors was
                            refusing to shrink to the grid column's width, ballooning that one
                            card (and its whole row) while every other card stayed correctly
                            sized. aspectRatio alone doesn't prevent this. */}
                        <div style={{width:"100%",aspectRatio:"1/1",minWidth:0,minHeight:0,borderRadius:"5px",background:"radial-gradient(circle at 50% 35%,#1a1010,#0d0505 75%)",border:`1px solid ${GO.bezelLine}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                          <img src={d.image} alt={d.name} style={{maxWidth:"88%",maxHeight:"88%",objectFit:"contain",filter:"grayscale(100%) brightness(0.7)"}} />
                        </div>
                        <span style={{fontSize:"6px",fontWeight:"bold",color:GO.inkDim,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%",lineHeight:"1.15",marginTop:"2px"}}>{d.name}</span>
                        <span style={{fontSize:"5.5px",fontWeight:"bold",color:d._wasReserve?GO.inkDim:GO.danger,letterSpacing:"0.5px",lineHeight:"1.1"}}>{d._wasReserve ? "RESERVE" : "DEFEATED"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{position:"relative",zIndex:2,display:"flex",gap:"8px",justifyContent:"center",marginTop:isCompactLandscape?"5px":"8px",flexShrink:0,flexWrap:"wrap"}}>
              <button onClick={game.resetToStart} style={{fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:isCompactLandscape?"8px":"9px",letterSpacing:"1.5px",borderRadius:"9px",padding:isCompactLandscape?"7px 14px":"9px 20px",cursor:"pointer",background:GO.danger,color:"#1a0a0a",border:"none"}}>🔄 INITIALIZE NEW RUN</button>
              <button onClick={() => setShowLeaderboard(true)} style={{fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:isCompactLandscape?"8px":"9px",letterSpacing:"1.5px",borderRadius:"9px",padding:isCompactLandscape?"7px 12px":"9px 18px",cursor:"pointer",background:"transparent",border:`1px solid ${DV.amberDim}`,color:DV.amber}}>🏆 LEADERBOARD</button>
              {onExitMode && (
                <button onClick={onExitMode} style={{fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:isCompactLandscape?"8px":"9px",letterSpacing:"1.5px",borderRadius:"9px",padding:isCompactLandscape?"7px 12px":"9px 18px",cursor:"pointer",background:"transparent",border:`1px solid ${GO.bezelLine}`,color:GO.inkDim}}>🏠 HOME</button>
              )}
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  // ── VICTORY ──────────────────────────────────────────────
  if (game.phase === "victory") {
    const allDigimon = [...game.party,...game.reserve].filter(Boolean);
    const rank = getRank(game.score);
    const highScore = parseInt(localStorage.getItem(highscoreKey) || "0");
    const isNewHigh = game.score >= highScore;
    const totalHp = game.party.reduce((sum, d) => sum + (d?.hp || 0), 0);
    const totalMaxHp = game.party.reduce((sum, d) => sum + (d?.maxHp || 1), 0);
    const hpBonusMult = 1 + (totalHp / Math.max(totalMaxHp, 1));
    // ✅ Same Score Calculation breakdown as the Game Over screen. Note: game.score here is
    // the FINAL score after the Squad HP Bonus multiplier is applied, but the category tallies
    // below are the raw pre-bonus points — so they're shown as their own line items, with the
    // HP bonus multiplier and the final (post-bonus) total each called out separately, rather
    // than silently not adding up.
    const sb = game.scoreBreakdown || {enemiesDefeated:{count:0,points:0}, wildCaptured:{count:0,points:0}, legendaryCaptured:{count:0,points:0}, waves:[]};
    const hasAnyScoreEvents = sb.enemiesDefeated.count > 0 || sb.wildCaptured.count > 0 || sb.legendaryCaptured.count > 0 || sb.waves.length > 0;
    return (
      <>
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} getLeaderboard={getLeaderboard} />}
      <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",background:DV.void,padding:isCompactLandscape?"6px":"10px",boxSizing:"border-box",fontFamily:DV_FONT_MONO}}>
        <style>{`@keyframes vicBlink{0%,49%{opacity:1;}50%,100%{opacity:0.15;}} @keyframes vicGlow{0%,100%{text-shadow:0 0 14px rgba(77,255,143,0.55);}50%{text-shadow:0 0 26px rgba(77,255,143,0.9), 0 0 44px rgba(77,255,143,0.4);}}`}</style>
        <div style={{width:"100%",maxWidth:"760px",height:isCompactLandscape?"96dvh":"min(480px,92dvh)",background:`linear-gradient(180deg,#1b2620,${DV.bezel} 40%)`,border:`1px solid ${DV.bezelLine}`,borderRadius:"18px",padding:isCompactLandscape?"5px":"7px",boxShadow:"0 30px 60px rgba(0,0,0,0.55)",display:"flex",flexDirection:"column",boxSizing:"border-box"}}>
          <div style={{display:"flex",gap:"5px",padding:"2px 8px 3px",flexShrink:0}}>
            {[0,1,2].map((i) => <span key={i} style={{width:"5px",height:"5px",borderRadius:"50%",background:DV.bezelLine,display:"inline-block"}} />)}
          </div>

          <div style={{position:"relative",flex:1,minHeight:0,background:`radial-gradient(120% 140% at 50% -10%, #10281b, ${DV.screen} 60%)`,border:`1px solid ${DV.phosphorDim}`,borderRadius:"13px",overflow:"hidden",padding:isCompactLandscape?"7px 9px":"10px 14px",display:"flex",flexDirection:"column",boxSizing:"border-box"}}>
            <div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(to bottom, rgba(77,255,143,0.06) 0px, rgba(77,255,143,0.06) 1px, transparent 2px, transparent 4px)",pointerEvents:"none",mixBlendMode:"screen"}} />

            <div style={{position:"relative",zIndex:2,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:"8px",letterSpacing:"1.5px",color:DV.inkDim,marginBottom:isCompactLandscape?"3px":"5px"}}>
              <span style={{display:"flex",alignItems:"center",gap:"5px",color:DV.phosphor}}>
                <span style={{width:"5px",height:"5px",borderRadius:"50%",background:DV.phosphor,display:"inline-block",animation:"vicBlink 1.6s steps(1) infinite"}} />
                MISSION UPLINK: STABLE
              </span>
              {!isCompactLandscape && <span>SYS.04 · CHRONOMON DM NEUTRALIZED</span>}
            </div>

            <div style={{position:"relative",zIndex:2,textAlign:"center",flexShrink:0,marginBottom:isCompactLandscape?"5px":"8px"}}>
              <div style={{fontSize:"7px",letterSpacing:"2.5px",color:DV.phosphorDim,marginBottom:"2px"}}>// TRANSMISSION COMPLETE //</div>
              <h1 style={{fontFamily:DV_FONT_DISPLAY,fontSize:isCompactLandscape?"clamp(11px,2.6vw,15px)":"clamp(14px,2.8vw,20px)",letterSpacing:"1.5px",color:DV.phosphor,margin:0,animation:"vicGlow 2.4s ease-in-out infinite"}}>DIGITAL WORLD SAVED</h1>
            </div>

            <div style={{position:"relative",zIndex:2,flex:1,minHeight:0,display:"flex",gap:"10px"}}>
              <div style={{width:"52%",background:"#050c08",border:`1px solid ${DV.bezelLine}`,borderRadius:"10px",padding:"9px 11px",display:"flex",flexDirection:"column",minHeight:0,boxSizing:"border-box"}}>
                <div style={{fontSize:"8px",letterSpacing:"1.5px",color:DV.phosphor,fontWeight:"bold",marginBottom:"6px",flexShrink:0}}>🧮 SCORE CALCULATION</div>
                <div style={{flex:1,minHeight:0,overflowY:"auto",display:"flex",flexDirection:"column",gap:"6px"}}>
                  {!hasAnyScoreEvents && <div style={{fontSize:"8px",color:DV.inkDim,fontStyle:"italic"}}>No points earned this run.</div>}
                  {sb.enemiesDefeated.count > 0 && (
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:"8px",lineHeight:"1.4"}}>
                      <span style={{color:DV.inkDim}}><span style={{color:DV.phosphorDim}}>{"> "}</span>⚔️ Enemies Defeated ×{sb.enemiesDefeated.count}</span>
                      <span style={{color:DV.amber,fontWeight:"bold",flexShrink:0,marginLeft:"6px"}}>+{sb.enemiesDefeated.points}</span>
                    </div>
                  )}
                  {sb.wildCaptured.count > 0 && (
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:"8px",lineHeight:"1.4"}}>
                      <span style={{color:DV.inkDim}}><span style={{color:DV.phosphorDim}}>{"> "}</span>🕸️ Wild Captures ×{sb.wildCaptured.count}</span>
                      <span style={{color:DV.amber,fontWeight:"bold",flexShrink:0,marginLeft:"6px"}}>+{sb.wildCaptured.points}</span>
                    </div>
                  )}
                  {sb.legendaryCaptured.count > 0 && (
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:"8px",lineHeight:"1.4"}}>
                      <span style={{color:DV.inkDim}}><span style={{color:DV.phosphorDim}}>{"> "}</span>👑 Legendary Captures ×{sb.legendaryCaptured.count}</span>
                      <span style={{color:DV.amber,fontWeight:"bold",flexShrink:0,marginLeft:"6px"}}>+{sb.legendaryCaptured.points}</span>
                    </div>
                  )}
                  {sb.waves.map((w, i) => (
                    <div key={i} style={{display:"flex",flexDirection:"column",gap:"1px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:"8px",lineHeight:"1.4"}}>
                        <span style={{color:DV.inkDim}}><span style={{color:DV.phosphorDim}}>{"> "}</span>🚨 Wave {w.wave} Cleared</span>
                        <span style={{color:DV.amber,fontWeight:"bold",flexShrink:0,marginLeft:"6px"}}>+{w.total}</span>
                      </div>
                      {(w.noItemBonus > 0 || w.bossBonus > 0) && (
                        <div style={{fontSize:"6.5px",color:DV.inkDim,paddingLeft:"11px",lineHeight:"1.3"}}>
                          clear +{w.clearPoints}{w.noItemBonus > 0 ? ` · no items +${w.noItemBonus}` : ""}{w.bossBonus > 0 ? ` · boss +${w.bossBonus}` : ""}
                        </div>
                      )}
                    </div>
                  ))}
                  <div style={{fontSize:"8px",color:DV.amber,lineHeight:"1.4"}}>
                    <span style={{color:DV.phosphorDim}}>{"> "}</span>SQUAD HP BONUS APPLIED <b>×{hpBonusMult.toFixed(2)}</b>
                  </div>
                </div>
                <div style={{marginTop:"7px",paddingTop:"7px",borderTop:`1px dashed ${DV.bezelLine}`,display:"flex",justifyContent:"space-between",alignItems:"baseline",flexShrink:0}}>
                  <span style={{fontSize:"7.5px",color:DV.inkDim,letterSpacing:"1px"}}>FINAL SCORE (incl. HP bonus)</span>
                  <span style={{fontFamily:DV_FONT_DISPLAY,fontSize:"15px",color:DV.amber,textShadow:"0 0 12px rgba(255,178,56,0.5)"}}>{game.score.toLocaleString()}</span>
                </div>
              </div>

              <div style={{width:"48%",display:"flex",flexDirection:"column",gap:"8px",minHeight:0}}>
                <div style={{background:"#050c08",border:`1px solid ${DV.phosphorDim}`,borderRadius:"10px",padding:"9px",display:"flex",alignItems:"center",gap:"10px",flexShrink:0}}>
                  <div style={{width:"42px",height:"42px",borderRadius:"8px",background:"#08120d",border:`1px solid ${DV.phosphorDim}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:DV_FONT_DISPLAY,fontSize:"16px",color:DV.phosphor,flexShrink:0}}>{rank.rank}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"9.5px",fontWeight:"bold",color:DV.phosphor}}>{rank.label.toUpperCase()}</div>
                    <div style={{fontSize:"7px",color:DV.inkDim,marginTop:"2px"}}>Waves cleared 8/8 &nbsp;·&nbsp; Boss defeated</div>
                    {isNewHigh && <div style={{fontSize:"6.5px",color:DV.amber,marginTop:"2px"}}>🌟 NEW HIGH SCORE</div>}
                  </div>
                </div>

                <div style={{flex:1,minHeight:0,background:"#050c08",border:`1px solid ${DV.bezelLine}`,borderRadius:"10px",padding:"9px",display:"flex",flexDirection:"column"}}>
                  <div style={{fontSize:"8px",letterSpacing:"1.5px",color:DV.phosphor,fontWeight:"bold",marginBottom:"6px",flexShrink:0}}>🏅 FINAL TEAM</div>
                  <div style={{flex:1,minHeight:0,overflowY:"auto",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"6px",alignContent:"start"}}>
                    {allDigimon.map((digi, i) => (
                      <div key={i} style={{background:"#08120d",border:`1px solid ${DV.phosphorDim}`,borderRadius:"7px",padding:"5px",display:"flex",flexDirection:"column",alignItems:"center",gap:"2px",minWidth:0,minHeight:0}}>
                        <div style={{width:"100%",aspectRatio:"1/1",minWidth:0,minHeight:0,borderRadius:"6px",background:"radial-gradient(circle at 50% 35%,#12241a,#081410 75%)",border:`1px solid ${DV.bezelLine}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                          <img src={digi.image} alt={digi.name} style={{maxWidth:"88%",maxHeight:"88%",objectFit:"contain"}} />
                        </div>
                        <span style={{fontSize:"6.5px",fontWeight:"bold",color:DV.phosphor,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{digi.name}</span>
                        <span style={{fontSize:"5.5px",color:DV.inkDim}}>{digi.level}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{position:"relative",zIndex:2,display:"flex",gap:"8px",justifyContent:"center",marginTop:isCompactLandscape?"5px":"8px",flexShrink:0,flexWrap:"wrap"}}>
              <button onClick={game.resetToStart} style={{fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:isCompactLandscape?"8px":"9px",letterSpacing:"1.5px",borderRadius:"9px",padding:isCompactLandscape?"7px 14px":"9px 20px",cursor:"pointer",background:DV.phosphor,color:"#0a1712",border:"none"}}>🔄 PLAY AGAIN</button>
              <button onClick={() => setShowLeaderboard(true)} style={{fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:isCompactLandscape?"8px":"9px",letterSpacing:"1.5px",borderRadius:"9px",padding:isCompactLandscape?"7px 12px":"9px 18px",cursor:"pointer",background:"transparent",border:`1px solid ${DV.amberDim}`,color:DV.amber}}>🏆 LEADERBOARD</button>
              {onExitMode && (
                <button onClick={onExitMode} style={{fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:isCompactLandscape?"8px":"9px",letterSpacing:"1.5px",borderRadius:"9px",padding:isCompactLandscape?"7px 12px":"9px 18px",cursor:"pointer",background:"transparent",border:`1px solid ${DV.bezelLine}`,color:DV.inkDim}}>🏠 HOME</button>
              )}
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  // ── PARTY SETUP ──────────────────────────────────────────
  // Shown right before every battle (Wild/Legendary encounter or Nemesis wave/boss) — lets the
  // player freely reorder, heal, revive, and hot-swap party/reserve members with zero turn
  // cost (swapPartyAndReserve only charges a turn while phase === "combat", which it isn't
  // yet here) before tapping ENGAGE to actually start the fight. Rendered as a compact modal
  // card (hugs its content) rather than a fullscreen frame, so it doesn't dwarf the screen.
  if (game.phase === "party_setup") {
    const setupInfo = game.pendingBattleInit || {};
    const previewSquad = setupInfo.enemySquad || [];
    const headerLabel = setupInfo.isVillainBattle
      ? (setupInfo.isBossWave ? "💀 FINAL BOSS INCOMING" : "🚨 NEMESIS RAID INCOMING")
      : setupInfo.isLegendaryBattle ? "👑 LEGENDARY ENCOUNTER" : "⚔️ WILD ENCOUNTER";
    const headerColor = setupInfo.isVillainBattle ? "#e74c3c" : DV.phosphor;
    const aliveCount = game.party.filter((d) => d && d.hp > 0).length;
    // ✅ Wave counter only means anything for a Nemesis Raid — Wild/Legendary encounters get a
    // plain target label instead of a wave fraction that wouldn't apply to them.
    const waveTag = setupInfo.isVillainBattle
      ? `NEMESIS WAVE ${Math.min(game.villainWaveStage, 8)}/8`
      : setupInfo.isLegendaryBattle ? "LEGENDARY TARGET" : "WILD TARGET";
    // ✅ Continuous scale (see uiScale above) instead of two fixed states — a phone just
    // over the old 500px threshold and a full-size tablet no longer render this screen's
    // portraits at the exact same size.
    const partySizeScale = Math.max(0.62, Math.min(1.3, uiScale));
    const reserveSizeScale = Math.max(0.5, Math.min(1.15, uiScale * 0.86));

    return (
      <>
        {releaseConfirm && (() => {
          const pool = releaseConfirm.isReserve ? game.reserve : game.party;
          const target = pool[releaseConfirm.index];
          return (
            <AuthorizationModal
              title="⚠️ RELEASE AUTHORIZATION"
              tag="// ACTION CANNOT BE UNDONE //"
              rows={[
                {t:"TARGET_UNIT", v:target?.name || "Unknown"},
                {t:"ACTION", v:"RETURN TO DIGITAL WORLD", warn:true},
                {t:"REVERSIBLE", v:"NO", warn:true},
              ]}
              confirmLabel="CONFIRM RELEASE"
              onCancel={() => setReleaseConfirm(null)}
              onConfirm={() => {game.releaseDigimon(releaseConfirm.index,releaseConfirm.isReserve); setReleaseConfirm(null);}}
            />
          );
        })()}
        {sellConfirm && (() => {
          const pool = sellConfirm.isReserve ? game.reserve : game.party;
          const target = pool[sellConfirm.index];
          const price = target ? computeSellPrice(target) : 0;
          return (
            <AuthorizationModal
              title="💰 SELL AUTHORIZATION"
              tag="// ACTION CANNOT BE UNDONE //"
              rows={[
                {t:"TARGET_UNIT", v:target?.name || "Unknown"},
                {t:"PAYOUT", v:`+${price} DIGI COIN`},
                {t:"ACTION", v:"REMOVE FROM SQUAD", warn:true},
                {t:"REVERSIBLE", v:"NO", warn:true},
              ]}
              confirmLabel="CONFIRM SALE"
              onCancel={() => setSellConfirm(null)}
              onConfirm={() => {if (game.sellDigimon) game.sellDigimon(sellConfirm.index, sellConfirm.isReserve); setSellConfirm(null);}}
            />
          );
        })()}
        <ReserveFullModal pendingCapture={game.pendingCapture} reserve={game.reserve} onResolve={game.resolvePendingCapture} />

        <style>{`@keyframes partySetupBlink{0%,49%{opacity:1;}50%,100%{opacity:0.15;}}`}</style>

        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(4,8,6,0.92)",display:"flex",alignItems:"stretch",justifyContent:"center",padding:isCompactLandscape?"6px":"10px",boxSizing:"border-box",fontFamily:DV_FONT_MONO}}>
          <div style={{position:"relative",width:"min(900px,98%)",height:"100%",overflowY:"auto",display:"flex",flexDirection:"column",background:`linear-gradient(180deg,#1b2620,${DV.bezel} 40%)`,border:`1px solid ${setupInfo.isVillainBattle?"#e74c3c":DV.bezelLine}`,borderRadius:"16px",padding:isCompactLandscape?"8px 10px":"12px 16px",boxShadow:"0 24px 50px rgba(0,0,0,0.6)",boxSizing:"border-box"}}>

            {/* HEADER — title + subtitle share one line; wave counter sits directly beside
                ENGAGE on the right so the row stays compact and the threat strip below can
                move up. */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"10px",flexShrink:0,marginBottom:isCompactLandscape?"5px":"8px"}}>
              <div style={{display:"flex",alignItems:"baseline",gap:isCompactLandscape?"8px":"12px",flexWrap:"wrap"}}>
                <h1 style={{fontFamily:DV_FONT_DISPLAY,fontSize:isCompactLandscape?"clamp(10px,2.4vw,13px)":"clamp(13px,2.8vw,17px)",letterSpacing:"1px",color:headerColor,textShadow:`0 0 10px ${headerColor}88`,margin:0,lineHeight:1}}>{headerLabel}</h1>
                <span style={{fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:isCompactLandscape?"9px":"11.5px",color:DV.inkDim,letterSpacing:"1.5px",lineHeight:1}}>PREPARE YOUR SQUAD</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"3px",flexShrink:0}}>
                <div style={{display:"flex",alignItems:"center",gap:isCompactLandscape?"8px":"12px"}}>
                  <span style={{fontSize:isCompactLandscape?"7.5px":"9px",letterSpacing:"1.5px",color:DV.amber,fontWeight:"bold",whiteSpace:"nowrap"}}>{waveTag}</span>
                  <button
                    onClick={() => game.confirmBattleSetup()}
                    disabled={aliveCount === 0}
                    style={{background:setupInfo.isVillainBattle ? "#e74c3c" : DV.phosphor,color:"#0a1712",border:"none",borderRadius:"8px",padding:isCompactLandscape?"6px 12px":"7px 16px",fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:isCompactLandscape?"7.5px":"8.5px",letterSpacing:"1px",cursor:aliveCount===0?"not-allowed":"pointer",opacity:aliveCount===0?0.5:1,whiteSpace:"nowrap"}}
                  >
                    ⚔️ ENGAGE BATTLE
                  </button>
                </div>
                {aliveCount === 0 && (
                  <div style={{fontSize:"6px",color:"#ff9b8a",letterSpacing:"0.3px",textAlign:"right",maxWidth:"220px"}}>⚠️ Revive/swap in a healthy Digimon first.</div>
                )}
              </div>
            </div>

            {itemEmptyToast && (
              <div style={{position:"fixed",top:"16px",left:"50%",transform:"translateX(-50%)",zIndex:1200,background:"#2d1a1a",border:"1px solid #ff5c5c",borderRadius:"8px",padding:"7px 14px",color:"#ff9b8a",fontSize:"9px",fontWeight:"bold",fontFamily:DV_FONT_MONO,boxShadow:"0 8px 20px rgba(0,0,0,0.5)",whiteSpace:"nowrap"}}>
                ⚠️ {itemEmptyToast}
              </div>
            )}

            {/* FULL-WIDTH THREAT STRIP — every enemy in the squad gets an equal-width card in
                one horizontal row, portrait beside its HP bar, tap to inspect. */}
            <div style={{flexShrink:0,background:"linear-gradient(180deg,#1a0a0a,#0d0505)",border:"1px solid rgba(231,76,60,0.4)",borderRadius:"10px",padding:isCompactLandscape?"6px 8px":"9px 12px 10px",marginBottom:isCompactLandscape?"6px":"10px"}}>
              <div style={{fontSize:"7px",letterSpacing:"2px",color:"#e74c3c",fontWeight:"bold",display:"flex",alignItems:"center",gap:"5px",marginBottom:isCompactLandscape?"5px":"8px"}}>
                <span style={{width:"5px",height:"5px",borderRadius:"50%",background:"#e74c3c",display:"inline-block",animation:"partySetupBlink 1.2s steps(1) infinite"}} />
                THREAT ASSESSMENT — {previewSquad.length} HOSTILE{previewSquad.length===1?"":"S"}
              </div>
              <div style={{display:"flex",gap:isCompactLandscape?"5px":"10px"}}>
                {previewSquad.map((enemy, i) => {
                  const hpPct = enemy.maxHp > 0 ? Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100)) : 100;
                  return (
                    <div
                      key={i}
                      onClick={() => setInfoPopup((prev) => (prev && prev.type === "enemy" && prev.idx === i) ? null : {type: "enemy", idx: i})}
                      style={{flex:1,minWidth:0,cursor:"pointer",background:DV.panelDeep,border:"1px solid rgba(231,76,60,0.3)",borderRadius:"8px",padding:isCompactLandscape?"4px":"7px",display:"flex",alignItems:"center",gap:isCompactLandscape?"6px":"10px"}}
                    >
                      <div style={{width:isCompactLandscape?"44px":"72px",height:isCompactLandscape?"44px":"72px",flexShrink:0,borderRadius:"8px",background:"radial-gradient(circle,#1c0f0f,#0d0505 75%)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                        <img src={enemy.image} alt={enemy.name} style={{maxWidth:"88%",maxHeight:"88%",objectFit:"contain",filter:enemy.hp<=0?"grayscale(100%)":"none"}} />
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:isCompactLandscape?"7px":"9px",fontWeight:"bold",color:DV.ink,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{enemy.name}</div>
                        <div style={{fontSize:isCompactLandscape?"6px":"7px",color:DV.inkDim,marginBottom:"4px"}}>{enemy.level || "Child"}</div>
                        <div style={{height:isCompactLandscape?"7px":"9px",background:"#331c1c",borderRadius:"3px",overflow:"hidden",position:"relative"}}>
                          <div style={{height:"100%",width:`${hpPct}%`,background:hpPct<=20?getHpColors(colorblindMode).low:getHpColors(colorblindMode).healthy,transition:"width 0.3s"}} />
                          <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isCompactLandscape?"5.5px":"6.5px",fontWeight:"bold",color:"#fff",textShadow:"0 1px 1px rgba(0,0,0,0.9)"}}>{enemy.hp}/{enemy.maxHp}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {infoPopup?.type === "enemy" && previewSquad[infoPopup.idx] && (
                <DigimonInfoPopup digimon={previewSquad[infoPopup.idx]} onClose={() => setInfoPopup(null)} compact={isCompactLandscape} />
              )}
            </div>

            {/* BODY — Party and Reserve as two EQUAL-width panels, split by a clear central divider. */}
            <div style={{flex:1,minHeight:0,display:"flex",gap:isCompactLandscape?"6px":"14px"}}>

              <div style={{flex:1,minWidth:0,background:DV.panel,border:`1px solid ${DV.bezelLine}`,borderRadius:"10px",padding:isCompactLandscape?"6px 7px":"10px 12px",display:"flex",flexDirection:"column",minHeight:0,overflowY:"auto"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:isCompactLandscape?"5px":"9px",flexShrink:0,gap:"6px"}}>
                  <h3 style={{margin:0,color:DV.phosphor,fontSize:isCompactLandscape?"7px":"8.5px",letterSpacing:"1.5px",fontWeight:"bold"}}>⚔ PARTY</h3>
                  <div style={{display:"flex",gap:isCompactLandscape?"6px":"9px",flexShrink:0}}>
                    <span title="Potions" style={{display:"flex",alignItems:"center",gap:"4px",fontSize:isCompactLandscape?"6.5px":"8px",fontWeight:"bold",color:DV.ink,background:DV.panelDeep,border:`1px solid ${DV.bezelLine}`,borderRadius:"6px",padding:isCompactLandscape?"2px 6px":"3px 8px",whiteSpace:"nowrap"}}>🧪 Potion <b style={{color:DV.phosphor}}>{game.inventory.potion}</b></span>
                    <span title="Revive Potions" style={{display:"flex",alignItems:"center",gap:"4px",fontSize:isCompactLandscape?"6.5px":"8px",fontWeight:"bold",color:DV.ink,background:DV.panelDeep,border:`1px solid ${DV.bezelLine}`,borderRadius:"6px",padding:isCompactLandscape?"2px 6px":"3px 8px",whiteSpace:"nowrap"}}>✨ Revive <b style={{color:DV.violet}}>{game.inventory.revivePotion}</b></span>
                  </div>
                </div>
                <div style={{display:"flex",gap:isCompactLandscape?"5px":"9px",justifyContent:"space-between"}}>
                  {[0,1,2].map((idx) => {
                    const digi = game.party[idx];
                    return (
                      <div key={idx} style={{display:"flex",flexDirection:"column",gap:"0px",alignItems:"center",flex:1}}>
                        <PartySlot digimon={digi} slotType="party" slotIndex={idx} onSlotClick={handleSlotClick} selected={selectedSlot?.type==="party"&&selectedSlot.index===idx} reducedMotion={reducedMotion} colorblindMode={colorblindMode} showInfo={infoPopup?.type==="party"&&infoPopup.idx===idx} onInfoToggle={handleInfoToggle} evoChipCount={digi ? (game.inventory[evoChipForLevel[digi.level]] || 0) : 0} evoChipForLevel={evoChipForLevel} onEvolveRequest={handleEvolveRequest} isHighlightedForEvo={digi ? highlightedEvoTier === digi.level : false} onReleaseRequest={handleReleaseRequest} sellEnabled={canSellFromHere} onSellRequest={handleSellRequest} compact sizeScale={partySizeScale} disableDoubleClick={suppressedSlot?.type === "party" && suppressedSlot?.index === idx} />
                        {digi && (
                          <div style={{width:"78%",marginTop:"-6px"}}>
                            {digi.hp <= 0 ? (
                              <button onClick={() => {if (game.inventory.revivePotion<=0) {setItemEmptyToast("Out of Revive Potions!"); return;} game.useRevivePotionOnDigimon(idx,false);}} style={{width:"100%",fontSize:"6px",fontWeight:"bold",background:DV.violet,color:"#fff",border:"none",borderRadius:"4px",padding:"2px 0",cursor:"pointer"}}>Revive</button>
                            ) : (
                              <button onClick={() => {if (game.inventory.potion<=0) {setItemEmptyToast("Out of Potions!"); return;} game.usePotionOnDigimon(idx,false);}} disabled={digi.hp>=digi.maxHp} style={{width:"100%",fontSize:"6px",fontWeight:"bold",background:"#2c8a52",color:"#fff",border:"none",borderRadius:"4px",padding:"2px 0",cursor:"pointer"}}>Heal</button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CENTRAL DIVIDER — a glowing vertical rule marking the clean split between
                  the Party and Reserve panels. */}
              <div style={{flexShrink:0,width:"2px",alignSelf:"stretch",background:`linear-gradient(to bottom,transparent,${DV.phosphorDim},transparent)`,boxShadow:`0 0 8px ${DV.phosphorDim}`,opacity:0.7}} />

              <div style={{flex:1,minWidth:0,background:DV.panel,border:`1px solid ${DV.bezelLine}`,borderRadius:"10px",padding:isCompactLandscape?"6px 7px":"10px 12px",display:"flex",flexDirection:"column",minHeight:0,overflowY:"auto"}}>
                <h3 style={{margin:isCompactLandscape?"0 0 5px 0":"0 0 9px 0",color:DV.inkDim,fontSize:isCompactLandscape?"6.5px":"8px",letterSpacing:"1.5px",fontWeight:"bold",flexShrink:0}}>📦 RESERVE BOX — {game.reserve.length}/6</h3>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",columnGap:isCompactLandscape?"4px":"8px",rowGap:isCompactLandscape?"5px":"9px"}}>
                  {[0,1,2,3,4,5].map((idx) => {
                    const resDigi = game.reserve[idx];
                    return (
                      <div key={idx} style={{display:"flex",flexDirection:"column",gap:"0px",alignItems:"center",minWidth:0}}>
                        <PartySlot digimon={resDigi} slotType="reserve" slotIndex={idx} onSlotClick={handleSlotClick} selected={selectedSlot?.type==="reserve"&&selectedSlot.index===idx} reducedMotion={reducedMotion} colorblindMode={colorblindMode} showInfo={infoPopup?.type==="reserve"&&infoPopup.idx===idx} onInfoToggle={handleInfoToggle} evoChipCount={resDigi ? (game.inventory[evoChipForLevel[resDigi.level]] || 0) : 0} evoChipForLevel={evoChipForLevel} onEvolveRequest={handleEvolveRequest} isHighlightedForEvo={resDigi ? highlightedEvoTier === resDigi.level : false} onReleaseRequest={handleReleaseRequest} sellEnabled={canSellFromHere} onSellRequest={handleSellRequest} compact sizeScale={reserveSizeScale} disableDoubleClick={suppressedSlot?.type === "reserve" && suppressedSlot?.index === idx} />
                        {resDigi && (
                          <div style={{width:"100%",marginTop:"-6px"}}>
                            {resDigi.hp <= 0 ? (
                              <button onClick={() => {if (game.inventory.revivePotion<=0) {setItemEmptyToast("Out of Revive Potions!"); return;} game.useRevivePotionOnDigimon(idx,true);}} style={{fontSize:"5.5px",fontWeight:"bold",background:DV.violet,color:"#fff",border:"none",borderRadius:"3px",padding:"1px 0",cursor:"pointer",width:"100%"}}>Revive</button>
                            ) : (
                              <button onClick={() => {if (game.inventory.potion<=0) {setItemEmptyToast("Out of Potions!"); return;} game.usePotionOnDigimon(idx,true);}} disabled={resDigi.hp>=resDigi.maxHp} style={{fontSize:"5.5px",fontWeight:"bold",background:"#2c8a52",color:"#fff",border:"none",borderRadius:"3px",padding:"1px 0",cursor:"pointer",width:"100%"}}>Heal</button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── MAIN GAME ────────────────────────────────────────────
  return (
    <>
      {showTutorial && <TutorialPopup onClose={handleCloseTutorial} steps={mode === "shop" ? SHOP_TUTORIAL_STEPS : RNG_TUTORIAL_STEPS} />}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
      {showBestiary && <BestiaryModal fullRoster={game.fullRoster} onClose={() => setShowBestiary(false)} bestiaryKey={bestiaryKey} />}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} getLeaderboard={getLeaderboard} />}
      {showSettings && <SettingsModal
        onClose={() => setShowSettings(false)}
        musicVolume={musicVolume} onMusicVolumeChange={handleMusicVolumeChange}
        sfxVolume={sfxVolume} onSfxVolumeChange={handleSfxVolumeChange}
        isMuted={isMuted} onToggleMute={handleToggleMute}
        reducedMotion={reducedMotion} onToggleReducedMotion={handleToggleReducedMotion}
        fastSpin={fastSpin} onToggleFastSpin={handleToggleFastSpin}
        enemyAutoSpin={enemyAutoSpin} onToggleEnemyAutoSpin={handleToggleEnemyAutoSpin}
        reduceEvoAnim={reduceEvoAnim} onToggleReduceEvoAnim={handleToggleReduceEvoAnim}
        longerEvoAnim={longerEvoAnim} onToggleLongerEvoAnim={handleToggleLongerEvoAnim}
        hapticsEnabled={hapticsEnabled} onToggleHaptics={handleToggleHaptics}
        colorblindMode={colorblindMode} onToggleColorblindMode={handleToggleColorblindMode}
        evoAnimSettings={game.evoAnimSettings} onToggleEvoAnimSetting={game.toggleEvoAnimSetting}
        onRestart={game.resetToStart}
        onHome={onExitMode}
      />}

      {releaseConfirm && (() => {
        const pool = releaseConfirm.isReserve ? game.reserve : game.party;
        const target = pool[releaseConfirm.index];
        return (
          <AuthorizationModal
            title="⚠️ RELEASE AUTHORIZATION"
            tag="// ACTION CANNOT BE UNDONE //"
            rows={[
              {t:"TARGET_UNIT", v:target?.name || "Unknown"},
              {t:"ACTION", v:"RETURN TO DIGITAL WORLD", warn:true},
              {t:"REVERSIBLE", v:"NO", warn:true},
            ]}
            confirmLabel="CONFIRM RELEASE"
            onCancel={() => setReleaseConfirm(null)}
            onConfirm={() => {game.releaseDigimon(releaseConfirm.index,releaseConfirm.isReserve); setReleaseConfirm(null);}}
          />
        );
      })()}
      {sellConfirm && (() => {
        const pool = sellConfirm.isReserve ? game.reserve : game.party;
        const target = pool[sellConfirm.index];
        const price = target ? computeSellPrice(target) : 0;
        return (
          <AuthorizationModal
            title="💰 SELL AUTHORIZATION"
            tag="// ACTION CANNOT BE UNDONE //"
            rows={[
              {t:"TARGET_UNIT", v:target?.name || "Unknown"},
              {t:"PAYOUT", v:`+${price} DIGI COIN`},
              {t:"ACTION", v:"REMOVE FROM SQUAD", warn:true},
              {t:"REVERSIBLE", v:"NO", warn:true},
            ]}
            confirmLabel="CONFIRM SALE"
            onCancel={() => setSellConfirm(null)}
            onConfirm={() => {if (game.sellDigimon) game.sellDigimon(sellConfirm.index, sellConfirm.isReserve); setSellConfirm(null);}}
          />
        );
      })()}

      <ReserveFullModal pendingCapture={game.pendingCapture} reserve={game.reserve} onResolve={game.resolvePendingCapture} />

      {showEvoFaintedReminder && (
        <ReminderModal
          icon="💤"
          title="FAINTED DIGIMON CAN'T EVOLVE"
          message="Any Digimon at 0 HP is skipped for this evolution roll. Revive them first if you want them in the running."
          confirmLabel="GOT IT"
          onConfirm={(dontShowAgain) => {
            if (dontShowAgain) {
              try {localStorage.setItem("digiroulette_evo_wheel_reminder_dismissed", "true");} catch {}
            }
            setShowEvoFaintedReminder(false);
          }}
        />
      )}

      {pendingSwap && (
        <ReminderModal
          icon="🔄"
          title="HOT-SWAP COSTS YOUR TURN"
          message="Swapping party members mid-battle uses up your turn — the enemy will act right after. Continue?"
          confirmLabel="SWAP"
          cancelLabel="CANCEL"
          onConfirm={confirmHotSwap}
          onCancel={cancelHotSwap}
        />
      )}

      {/* ✅ The hook only ever sets evolvingPartyIdx/evolvingReserveIdx non-null when the
          relevant tier's animation toggle (Evolution/Super/Mega/Ultra, set in Settings) is
          already on — so no extra gating is needed here beyond checking the index itself. */}
      {(game.evolvingPartyIdx !== null || game.evolvingReserveIdx !== null) && (
        <EvolutionOverlay
          digimon={game.evolvingPartyIdx !== null ? game.party[game.evolvingPartyIdx] : game.reserve[game.evolvingReserveIdx]}
          tier={game.evolvingTier}
          reducedMotion={reducedMotion}
          reduceEvoAnim={reduceEvoAnim}
          longerAnim={longerEvoAnim}
        />
      )}

      <style>{`
        .game-root{display:flex;flex-direction:row;gap:10px;padding:10px;width:100%;height:100dvh;max-height:100dvh;box-sizing:border-box;background:${DV.screen};color:${DV.ink};overflow:hidden;position:relative;}
        .col-left{width:26%;min-width:0;display:flex;flex-direction:column;gap:8px;overflow:hidden;height:100%;box-sizing:border-box;}
        .col-center{width:46%;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:space-between;overflow:hidden;height:100%;box-sizing:border-box;}
        .col-right{width:28%;min-width:0;display:flex;flex-direction:column;gap:10px;overflow:hidden;height:100%;box-sizing:border-box;}
        @keyframes shake{0%,100%{transform:translateX(0) rotate(0deg);}15%{transform:translateX(-9px) rotate(-2.5deg);}30%{transform:translateX(9px) rotate(2.5deg);}45%{transform:translateX(-6px) rotate(-1.5deg);}60%{transform:translateX(6px) rotate(1.5deg);}75%{transform:translateX(-3px);}90%{transform:translateX(3px);}}
        @keyframes shake-crit{0%,100%{transform:translateX(0) rotate(0deg) scale(1);}10%{transform:translateX(-12px) rotate(-3deg) scale(1.04);}25%{transform:translateX(12px) rotate(3deg) scale(1.04);}40%{transform:translateX(-8px) rotate(-2deg) scale(1.02);}55%{transform:translateX(8px) rotate(2deg) scale(1.02);}70%{transform:translateX(-4px);}85%{transform:translateX(4px);}}
        .enemy-shake{animation:shake 0.35s ease-in-out;}
        .enemy-shake-crit{animation:shake-crit 0.50s ease-in-out;}
        .player-shake{animation:shake 0.35s ease-in-out;}
        .player-shake-crit{animation:shake-crit 0.50s ease-in-out;}
        @keyframes flash-hit{0%,100%{box-shadow:none}50%{box-shadow:inset 0 0 0 4px rgba(231,76,60,0.55)}}
        @keyframes flash-crit{0%,100%{box-shadow:none}25%{box-shadow:inset 0 0 0 7px rgba(240,136,62,0.80)}75%{box-shadow:inset 0 0 0 7px rgba(231,76,60,0.80)}}
        .screen-flash-hit{animation:flash-hit 0.35s ease-in-out;}
        .screen-flash-crit{animation:flash-crit 0.50s ease-in-out;}
        @keyframes evo-glow-pulse{0%,100%{box-shadow:0 0 8px 2px ${DV.amber},0 0 20px 4px rgba(255,178,56,0.4);}50%{box-shadow:0 0 20px 8px #fff,0 0 40px 12px rgba(255,178,56,0.9);}}
        .evo-glow{animation:evo-glow-pulse 0.6s ease-in-out infinite;border:2px solid ${DV.amber} !important;}
        @keyframes hpFlash{0%{opacity:1;}100%{opacity:0;}}
        @keyframes floatUp{0%{opacity:1;transform:translate(-50%,0);}100%{opacity:0;transform:translate(-50%,-38px);}}
        .float-num{font-size:22px;font-weight:900;letter-spacing:0.5px;pointer-events:none;animation:floatUp 0.9s ease-out forwards;text-shadow:-1.5px -1.5px 0 #000,1.5px -1.5px 0 #000,-1.5px 1.5px 0 #000,1.5px 1.5px 0 #000,0 2px 4px rgba(0,0,0,0.6);}
        @keyframes lowHpPulse{0%,100%{box-shadow:0 0 6px 2px var(--lowhp-glow-a, rgba(231,76,60,0.5));}50%{box-shadow:0 0 16px 6px var(--lowhp-glow-b, rgba(231,76,60,0.95));}}
        .low-hp-pulse{animation:lowHpPulse 0.9s ease-in-out infinite;}
        @keyframes evoChipPulse{0%,100%{box-shadow:0 0 6px 2px rgba(255,178,56,0.5);border-color:${DV.amber};}50%{box-shadow:0 0 18px 7px rgba(255,178,56,0.95);border-color:#fff8dc;}}
        .evo-chip-pulse{animation:evoChipPulse 0.8s ease-in-out infinite;}
        /* ✅ App.css applies a global button:active{transform:scale(0.97)} tap effect to
           every button — including the digimon picture and the spin button, which made
           both visibly shrink/shift on every tap. These two are pinned in place instead. */
        .party-slot-btn:active, .spin-btn:active { transform: none; }
        @keyframes dvBlink2{0%,49%{opacity:1;}50%,100%{opacity:0.15;}}
        .dv-dot2{animation:dvBlink2 1.6s steps(1) infinite;}
        .dv-gscreen::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(to bottom,rgba(77,255,143,0.04) 0px,rgba(77,255,143,0.04) 1px,transparent 2px,transparent 4px);pointer-events:none;mix-blend-mode:screen;z-index:0;}
        @media(max-width:768px) and (orientation:landscape){.game-root{gap:4px;padding:4px;}.col-left{width:24%;}.col-center{width:42%;}.col-right{width:34%;}}
        @media(max-height:500px) and (orientation:landscape){
          .game-root{gap:3px;padding:3px;}
          .col-left,.col-center,.col-right{gap:3px;}
          .mobile-header-bar{gap:3px !important;}
          .mobile-header-bar button{padding:2px 6px !important;font-size:8px !important;}
        }
        /* ✅ ULTRA-NARROW TIER: flip-phone cover screens, the narrowest folded-cover states —
           narrower than the phone tier above was ever tuned for. Squeezes column widths and
           gaps further so the three columns still fit side-by-side instead of overlapping. */
        @media(max-width:380px) and (orientation:landscape){
          .game-root{gap:2px;padding:2px;}
          .col-left{width:23%;}
          .col-center{width:39%;}
          .col-right{width:38%;}
        }
        @media(max-height:360px) and (orientation:landscape){
          .game-root{gap:2px;padding:2px;}
          .col-left,.col-center,.col-right{gap:2px;}
        }
        /* ✅ SPACIOUS TIER: iPads, unfolded foldables, and desktop browser windows. Gives the
           three panels real breathing room instead of the same tight phone-tuned gap/padding,
           and stops the layout from stretching edge-to-edge (and the three columns from
           drifting far apart) on very wide screens by capping and centering it. */
        @media(min-width:1100px) and (min-height:700px){
          .game-root{gap:18px;padding:18px;max-width:1900px;margin:0 auto;}
          .col-left,.col-center,.col-right{gap:14px;}
        }
      `}</style>

      <div className={`game-root ${reducedMotion?"":(screenFlash==="crit"?"screen-flash-crit":screenFlash==="hit"?"screen-flash-hit":"")}`}>

        {/* ── COL 1: BATTLE ZONE ── */}
        <div className="col-left" style={{background:DV.panel,padding:isCompactLandscape?"4px":"10px",borderRadius:"12px",border:"1px solid #2c3a33"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h2 style={{margin:0,color:"#e74c3c",fontSize:isCompactLandscape?"0.65rem":"clamp(0.9rem,2vw,1.2rem)"}}>⚔️ Battle</h2>
            <span style={{fontSize:isCompactLandscape?"8px":"10px",fontWeight:"bold",background:DV.bezelLine,padding:isCompactLandscape?"2px 5px":"3px 7px",borderRadius:"8px",color:DV.amber}}>{game.worldSpinCount}/4</span>
          </div>
          <WaveProgressBar villainWaveStage={game.villainWaveStage} compact={isCompactLandscape} />
          {game.enemySquad[game.currentEnemyIdx] ? (
            <div style={{display:"flex",flexDirection:"column",gap:isCompactLandscape?"2px":"4px"}}>
              {isBossWave && (
                <div style={{textAlign:"center",fontSize:"10px",fontWeight:"bold",color:"#e74c3c",letterSpacing:"1px"}}>💀 FINAL BOSS</div>
              )}
              {/* ✅ Two-tier squad layout: the active target is always sorted FIRST here,
                  so it's the one that lands in the big bottom row with the red border.
                  As it's defeated and currentEnemyIdx advances, the next active enemy
                  is simply whichever ends up first on the next render — the "swap into
                  the big slot" behavior falls out of this sort, no extra state needed. */}
              {(() => {
                const sortedSquad = [
                  {...game.enemySquad[game.currentEnemyIdx], _idx: game.currentEnemyIdx},
                  ...game.enemySquad
                    .map((enemy, idx) => ({...enemy, _idx: idx}))
                    .filter((enemy) => enemy._idx !== game.currentEnemyIdx)
                ];
                const [firstEnemy, ...restEnemies] = sortedSquad;

                const renderEnemyTile = (enemy, sizePx, nameFontPx) => {
                  const isActive = enemy._idx === game.currentEnemyIdx;
                  return (
                    <div key={enemy._idx} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0px",width:`${sizePx}px`,flexShrink:0,opacity:enemy.hp<=0?0.45:1}}>
                      <span style={{fontSize:nameFontPx,fontWeight:"bold",color:isActive?(isBossWave?"#ff4444":"#ff7b72"):DV.inkDim,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%",lineHeight:"1.3"}}>
                        {enemy.name}
                      </span>
                      <div
                        onClick={(e) => {e.stopPropagation(); setInfoPopup((prev) => (prev && prev.type === "enemy" && prev.idx === enemy._idx) ? null : {type: "enemy", idx: enemy._idx});}}
                        style={{position:"relative",width:"100%",aspectRatio:"1 / 1",background:isBossWave&&isActive?"#1a0a0a":DV.screen,borderRadius:"8px",overflow:"hidden",border:`2px solid ${isActive?(isBossWave?"#e74c3c":"#ff7b72"):DV.bezelLine}`,boxShadow:isActive&&isBossWave?"0 0 12px rgba(231,76,60,0.4)":"none",cursor:"pointer"}}
                      >
                        <div key={isActive?`${enemy.id}-${enemyAnimKey}`:enemy.id} className={isActive?enemyAnimClass:""} style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <img src={enemy.image} alt={enemy.name} style={{maxWidth:"88%",maxHeight:"88%",objectFit:"contain",filter:enemy.hp<=0?"grayscale(100%)":"none"}} />
                        </div>
                        <span style={{position:"absolute",top:"2px",left:"2px",fontSize:isCompactLandscape?"9px":"12px",background:"rgba(0,0,0,0.65)",borderRadius:"4px",padding:"1px 3px",lineHeight:1}} title={enemy.attribute || "Unknown"}>{getAttributeEmoji(enemy.attribute)}</span>
                        {isActive && enemyFloatEvent && (
                          <div key={enemyFloatEvent.ts} className="float-num" style={{position:"absolute",top:"18%",left:"58%",color:enemyFloatEvent.color,zIndex:20}}>{enemyFloatEvent.text}</div>
                        )}
                        <div style={{position:"absolute",bottom:0,left:0,right:0,height:isCompactLandscape?"9px":"12px",background:"#331c1c",overflow:"hidden"}}>
                          <div style={{background:enemy.hp<=0?"#555":(enemy.hp/enemy.maxHp)<=0.2?getHpColors(colorblindMode).low:getHpColors(colorblindMode).healthy,height:"100%",width:`${(enemy.hp/enemy.maxHp)*100}%`,transition:"width 0.3s"}} />
                          <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isCompactLandscape?"6px":"8px",fontWeight:"bold",color:"#fff",textShadow:"0 1px 2px rgba(0,0,0,0.9)"}}>
                            {enemy.hp<=0?"DEAD":`${enemy.hp}/${enemy.maxHp}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                };

                const bigSize = isCompactLandscape ? 72 : 112;
                const bigNameFont = isCompactLandscape ? "7.5px" : "10px";
                const smallSize = isCompactLandscape ? 46 : 72;
                const smallNameFont = isCompactLandscape ? "6px" : "8px";

                return (
                  <div style={{display:"flex",flexDirection:"column",gap:isCompactLandscape?"4px":"6px",alignItems:"center"}}>
                    {restEnemies.length > 0 && (
                      <div style={{display:"flex",gap:isCompactLandscape?"4px":"6px",justifyContent:"center"}}>
                        {restEnemies.map((enemy) => renderEnemyTile(enemy, smallSize, smallNameFont))}
                      </div>
                    )}
                    {firstEnemy && renderEnemyTile(firstEnemy, bigSize, bigNameFont)}
                  </div>
                );
              })()}
              {/* ✅ BUGFIX: rendered OUTSIDE the per-enemy opacity wrapper above (fainted
                  enemies get opacity<1 for the grayscale-DEAD look), because opacity<1
                  creates a new CSS stacking context — that was trapping the popup's
                  z-index:9999 *inside* that context instead of letting it escape to the
                  page root, so it painted behind col-center's later-in-DOM panels. */}
              {infoPopup?.type === "enemy" && game.enemySquad[infoPopup.idx] && (
                <DigimonInfoPopup digimon={game.enemySquad[infoPopup.idx]} onClose={() => setInfoPopup(null)} compact={isCompactLandscape} />
              )}
            </div>
          ) : (
            <div style={{padding:isCompactLandscape?"6px 4px":"16px 8px",textAlign:"center",background:DV.panelDeep,borderRadius:"10px",color:DV.inkDim,fontSize:isCompactLandscape?"0.65rem":"0.8rem",fontStyle:"italic",border:"1px dashed #2c3a33"}}>No active threat.<br />Spin the wheel!</div>
          )}
          <div style={{marginTop:"auto"}}>
            <InventoryPanel
              inventory={game.inventory}
              digiCoin={game.digiCoin}
              phase={game.phase}
              isVillainBattle={game.isVillainBattle}
              isWildBattle={game.isWildBattle}
              isLegendaryBattle={game.isLegendaryBattle}
              onUseStrength={game.consumeStrengthChip}
              onUseEndurance={game.consumeEnduranceChip}
              onUseEscape={game.useEscapePortal}
              highlightedEvoTier={highlightedEvoTier}
              onToggleEvoHighlight={handleToggleEvoHighlight}
              evoChipKeys={evoChipKeys}
              evoChipTargetTier={evoChipTargetTier}
              evoChipLabel={evoChipLabel}
              compact={isCompactLandscape}
              spacious={isSpacious}
            />
          </div>
        </div>

        {/* ── COL 2: WHEEL / DIGITAL SHOP ── */}
        <div className="col-center" style={{background:DV.panel,padding:isCompactLandscape?"4px":"12px",borderRadius:"12px",border:`1px solid ${isBossWave?"#e74c3c":"#2c3a33"}`}}>
          {game.phase === "shop" ? (
            // ✅ Shop takes over the ENTIRE middle column (no header buttons, status box, or
            // battle log) — it's a dedicated screen you visit and then leave via its own button.
            <ShopPanel digiCoin={game.digiCoin} onBuy={game.buyShopItem} onLeave={game.leaveShop} shopItems={shopItems} />
          ) : (
            <>
              <div className="mobile-header-bar" style={{display:"flex",gap:"8px",flexWrap:"wrap",justifyContent:"center"}}>
                <button onClick={() => setShowTutorial(true)} style={{background:DV.panel,color:DV.phosphor,border:"1px solid #4dff8f",borderRadius:"6px",padding:"5px 10px",fontWeight:"bold",fontSize:"11px",cursor:"pointer"}}>📖 Help</button>
                <button onClick={() => setShowGuide(true)} style={{background:DV.panel,color:DV.phosphor,border:"1px solid #4dff8f",borderRadius:"6px",padding:"5px 10px",fontWeight:"bold",fontSize:"11px",cursor:"pointer"}}>🧭 Guide</button>
                <button onClick={() => setShowBestiary(true)} style={{background:DV.panel,color:DV.amber,border:"1px solid #ffb238",borderRadius:"6px",padding:"5px 10px",fontWeight:"bold",fontSize:"11px",cursor:"pointer"}}>📖 Dex</button>
                <button onClick={() => setShowLeaderboard(true)} style={{background:DV.panel,color:DV.amber,border:"1px solid #ffb238",borderRadius:"6px",padding:"5px 10px",fontWeight:"bold",fontSize:"11px",cursor:"pointer"}}>🏆 Board</button>
                <button onClick={() => setShowSettings(true)} style={{background:DV.panel,color:DV.ink,border:"1px solid #2c3a33",borderRadius:"6px",padding:"5px 10px",fontWeight:"bold",fontSize:"11px",cursor:"pointer"}}>⚙️ Settings</button>
              </div>
              <div style={{width:"100%",display:"flex",gap:isCompactLandscape?"4px":"6px",alignItems:"stretch",marginTop:isCompactLandscape?"4px":"8px"}}>
                <div style={{flex:1,background:isBossWave?"#1a0808":DV.panel,border:`1px solid ${isBossWave?"#e74c3c":DV.bezelLine}`,borderRadius:"10px",padding:isCompactLandscape?"3px 6px":"8px 10px",boxSizing:"border-box"}}>
                  <h4 style={{margin:0,color:isBossWave?"#e74c3c":DV.phosphor,fontSize:isCompactLandscape?"8px":"10px",letterSpacing:"1px"}}>{isBossWave?"💀 FINAL BOSS ALERT":"📢 SYSTEM STATUS"}</h4>
                  <p style={{margin:"3px 0 0 0",fontSize:isCompactLandscape?"0.6rem":"clamp(0.75rem,1.8vw,0.95rem)",fontWeight:"bold",color:"#fff",lineHeight:"1.25"}}>{game.announcement}</p>
                </div>
                <AttributeTriangle compact={isCompactLandscape} />
              </div>
              {/* ✅ Compact battle log — just the messages, no "Battle Log" heading, capped
                  at 3 lines so it never grows the column; older lines simply scroll out. */}
              <div style={{width:"100%",boxSizing:"border-box",background:DV.panelDeep,border:"1px solid #2c3a33",borderRadius:"8px",padding:isCompactLandscape?"3px 6px":"5px 8px"}}>
                {game.log.length === 0 ? (
                  <p style={{margin:0,fontSize:isCompactLandscape?"8px":"10px",color:DV.inkDim,fontStyle:"italic"}}>No activity yet.</p>
                ) : game.log.slice(0, 3).map((l, idx) => (
                  <p key={idx} style={{margin:isCompactLandscape?"1px 0":"2px 0",fontSize:isCompactLandscape?"8px":"11px",fontFamily:"monospace",lineHeight:"1.3",color:l.includes("🎉")||l.includes("👑")||l.includes("💚")?DV.phosphor:l.includes("🚨")||l.includes("💀")?"#ff7b72":DV.inkDim,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{l}</p>
                ))}
              </div>
              <div style={{width:"100%",background:DV.panelDeep,border:"2px solid #2c3a33",borderRadius:"10px",padding:isCompactLandscape?"2px 8px":"8px 12px",boxSizing:"border-box",textAlign:"center",minHeight:isCompactLandscape?"16px":"38px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {lastResult
                  ? <p style={{margin:0,fontWeight:"bold",color:DV.phosphor,fontSize:isCompactLandscape?"0.6rem":"clamp(0.8rem,1.8vw,1rem)"}}>🎯 Landed: {lastResult}</p>
                  : <p style={{margin:0,color:DV.inkDim,fontSize:isCompactLandscape?"0.58rem":"0.8rem",fontStyle:"italic"}}>Spin the wheel to see your result</p>
                }
              </div>
              <div style={{display:"flex",flexGrow:1,alignItems:"center",justifyContent:"center",minHeight:0,width:"100%"}}>
                <Wheel
                  segments={game.wheelSegments}
                  colors={isBossWave?["#e74c3c","#c0392b","#922b21","#7b241c","#e74c3c","#c0392b","#922b21"]:wheelColors}
                  onSpinComplete={handleSpinComplete}
                  onSpinStart={() => {setIsWheelSpinning(true); setInfoPopup(null); setHighlightedEvoTier(null);}}
                  size={wheelSize}
                  buttonContext={game.activeWheelType}
                  buttonClassName="spin-btn"
                  disabled={game.evolvingPartyIdx !== null || game.evolvingReserveIdx !== null}
                  compact={isCompactLandscape}
                  fastSpin={fastSpin}
                />
              </div>
              {!isCompactLandscape && <div style={{fontSize:"9px",color:DV.inkDim,textAlign:"center"}}>Space: Spin &nbsp;|&nbsp; H: Heal</div>}
            </>
          )}
        </div>

        {/* ── COL 3: SQUAD + BOX + ITEMS ── */}
        <div className="col-right">
          <div style={{background:DV.panel,padding:isCompactLandscape?"4px":"10px",borderRadius:"12px",border:"1px solid #2c3a33",flexShrink:0}}>
            <h3 style={{margin:isCompactLandscape?"0 0 3px 0":"0 0 8px 0",color:DV.phosphor,fontSize:isCompactLandscape?"0.6rem":"clamp(0.8rem,1.8vw,1rem)",fontWeight:"bold"}}>⚔️ Party (Max 3){isWheelSpinning && !isCompactLandscape && <span style={{fontSize:"9px",color:DV.inkDim,fontWeight:"normal",marginLeft:"6px"}}>🔒 locked while spinning</span>}</h3>
            <div style={{display:"flex",gap:isCompactLandscape?"3px":"6px",justifyContent:"space-between",alignItems:"flex-start"}}>
              {[0,1,2].map((idx) => {
                const digi = game.party[idx];
                const isActiveFighter = idx === (lastHitPartyIdx ?? activePartyIdx);
                const isEvolving = game.evolvingPartyIdx === idx;
                return (
                  <div key={idx} style={{display:"flex",flexDirection:"column",gap:"0px",alignItems:"center",flex:1}}>
                    <PartySlot digimon={digi} slotType="party" slotIndex={idx} onSlotClick={handleSlotClick} selected={selectedSlot?.type==="party"&&selectedSlot.index===idx} animClass={isActiveFighter?playerAnimClass:""} animKey={isActiveFighter?playerAnimKey:0} hitFlash={isActiveFighter&&partyHpFlash[idx]} isEvolving={isEvolving} floatEvent={partyFloatEvents[idx]} reducedMotion={reducedMotion} colorblindMode={colorblindMode} showInfo={infoPopup?.type==="party"&&infoPopup.idx===idx} onInfoToggle={handleInfoToggle} evoChipCount={digi ? (game.inventory[evoChipForLevel[digi.level]] || 0) : 0} evoChipForLevel={evoChipForLevel} onEvolveRequest={handleEvolveRequest} isHighlightedForEvo={digi ? highlightedEvoTier === digi.level : false} onReleaseRequest={handleReleaseRequest} sellEnabled={canSellFromHere} onSellRequest={handleSellRequest} compact={isCompactLandscape} sizeScale={mainPartyScale} disableDoubleClick={suppressedSlot?.type === "party" && suppressedSlot?.index === idx} />
                    {digi && (
                      <div style={{width:"100%",marginTop:"-6px"}}>
                        {/* ✅ FIX 2: onMouseUp blur prevents Space from re-firing this button.
                            One button now covers both roles: it reads/acts as Heal while the
                            Digimon is alive, and flips to Revive the moment it faints. */}
                        {digi.hp <= 0 ? (
                          <button onClick={() => game.useRevivePotionOnDigimon(idx,false)} onMouseUp={(e) => e.currentTarget.blur()} disabled={game.inventory.revivePotion<=0} style={{width:"100%",fontSize:isCompactLandscape?"6px":"9px",fontWeight:"bold",background:DV.violet,color:"#fff",border:"none",borderRadius:"4px",padding:isCompactLandscape?"1px 0":"2px 0",cursor:"pointer"}}>Revive</button>
                        ) : (
                          <button onClick={() => game.usePotionOnDigimon(idx,false)} onMouseUp={(e) => e.currentTarget.blur()} disabled={game.inventory.potion<=0||digi.hp>=digi.maxHp} style={{width:"100%",fontSize:isCompactLandscape?"6px":"9px",fontWeight:"bold",background:"#2c8a52",color:"#fff",border:"none",borderRadius:"4px",padding:isCompactLandscape?"1px 0":"2px 0",cursor:"pointer"}}>Heal [H]</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{background:DV.panel,padding:isCompactLandscape?"4px":"10px",borderRadius:"12px",border:"1px solid #2c3a33",flexGrow:1,minHeight:0,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <h3 style={{margin:isCompactLandscape?"0 0 2px 0":"0 0 8px 0",color:DV.inkDim,fontSize:isCompactLandscape?"0.58rem":"clamp(0.8rem,1.8vw,1rem)",fontWeight:"bold",flexShrink:0}}>📦 Reserve Box</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",columnGap:isCompactLandscape?"3px":"6px",rowGap:isCompactLandscape?"4px":"8px",alignItems:"flex-start",minHeight:0,overflowY:"visible",paddingRight:"2px"}}>
              {[0,1,2,3,4,5].map((idx) => {
                const resDigi = game.reserve[idx];
                return (
                  <div key={idx} style={{display:"flex",flexDirection:"column",gap:"0px",alignItems:"center"}}>
                    <PartySlot digimon={resDigi} slotType="reserve" slotIndex={idx} onSlotClick={handleSlotClick} selected={selectedSlot?.type==="reserve"&&selectedSlot.index===idx} animClass="" animKey={0} hitFlash={false} isEvolving={game.evolvingReserveIdx===idx} reducedMotion={reducedMotion} colorblindMode={colorblindMode} showInfo={infoPopup?.type==="reserve"&&infoPopup.idx===idx} onInfoToggle={handleInfoToggle} evoChipCount={resDigi ? (game.inventory[evoChipForLevel[resDigi.level]] || 0) : 0} evoChipForLevel={evoChipForLevel} onEvolveRequest={handleEvolveRequest} isHighlightedForEvo={resDigi ? highlightedEvoTier === resDigi.level : false} onReleaseRequest={handleReleaseRequest} sellEnabled={canSellFromHere} onSellRequest={handleSellRequest} compact={isCompactLandscape} sizeScale={mainReserveScale} disableDoubleClick={suppressedSlot?.type === "reserve" && suppressedSlot?.index === idx} />
                    {resDigi && (
                      <div style={{width:"100%",marginTop:"-6px"}}>
                        {resDigi.hp <= 0 ? (
                          <button onClick={() => game.useRevivePotionOnDigimon(idx,true)} onMouseUp={(e) => e.currentTarget.blur()} disabled={game.inventory.revivePotion<=0} style={{fontSize:isCompactLandscape?"7px":"9px",fontWeight:"bold",background:DV.violet,color:"#fff",border:"none",borderRadius:"4px",padding:isCompactLandscape?"1px 0":"2px 0",cursor:"pointer",width:"100%"}}>Revive</button>
                        ) : (
                          <button onClick={() => game.usePotionOnDigimon(idx,true)} onMouseUp={(e) => e.currentTarget.blur()} disabled={game.inventory.potion<=0||resDigi.hp>=resDigi.maxHp} style={{fontSize:isCompactLandscape?"7px":"9px",fontWeight:"bold",background:"#2c8a52",color:"#fff",border:"none",borderRadius:"4px",padding:isCompactLandscape?"1px 0":"2px 0",cursor:"pointer",width:"100%"}}>Heal</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ============================================================
// PER-MODE WRAPPERS — each calls exactly one game-logic hook,
// keeping the two gameplay files fully independent of each other
// ============================================================
const ShopModeApp = ({onExitMode, onSwitchMode, autoResume}) => {
  const game = useDigimonGame(autoResume);
  return (
    <GameCore
      game={game}
      mode="shop"
      wheelColors={WHEEL_COLORS}
      evoChipForLevel={EVO_CHIP_FOR_LEVEL}
      evoChipLabel={EVO_CHIP_LABEL}
      evoChipTargetTier={EVO_CHIP_TARGET_TIER}
      evoChipKeys={EVO_CHIP_KEYS}
      shopItems={SHOP_ITEMS}
      saveKey={SHOP_SAVE_KEY}
      highscoreKey={SHOP_HIGHSCORE_KEY}
      bestiaryKey={SHOP_BESTIARY_KEY}
      getLeaderboard={getShopLeaderboard}
      onExitMode={onExitMode}
      onSwitchMode={onSwitchMode}
    />
  );
};

const RngModeApp = ({onExitMode, onSwitchMode, autoResume}) => {
  const game = useDigimonGameRNG(autoResume);
  return (
    <GameCore
      game={game}
      mode="rng"
      wheelColors={RNG_WHEEL_COLORS}
      evoChipForLevel={RNG_EVO_CHIP_FOR_LEVEL}
      evoChipLabel={RNG_EVO_CHIP_LABEL}
      evoChipTargetTier={RNG_EVO_CHIP_TARGET_TIER}
      evoChipKeys={RNG_EVO_CHIP_KEYS}
      shopItems={null}
      saveKey={RNG_SAVE_KEY}
      highscoreKey={RNG_HIGHSCORE_KEY}
      bestiaryKey={RNG_BESTIARY_KEY}
      getLeaderboard={getRngLeaderboard}
      onExitMode={onExitMode}
      onSwitchMode={onSwitchMode}
    />
  );
};

// ============================================================
// TOP-LEVEL EXPORT — main menu is always the entry point
// ============================================================
export default function GameScreen() {
  const [mode, setMode] = useState(null);
  const [autoResume, setAutoResume] = useState(false);
  const [overwriteConfirm, setOverwriteConfirm] = useState(null); // "shop" | "rng" | null
  const [showMenuTutorial, setShowMenuTutorial] = useState(false);
  const [showMenuSettings, setShowMenuSettings] = useState(false);
  const [menuBestiaryMode, setMenuBestiaryMode] = useState(null); // "shop" | "rng" | null
  const [menuLeaderboardMode, setMenuLeaderboardMode] = useState(null); // "shop" | "rng" | null
  const [menuFullRoster, setMenuFullRoster] = useState([]);
  const [menuRosterLoading, setMenuRosterLoading] = useState(false);

  // ✅ Menu theme plays on the main menu, and keeps playing straight through the mode's
  // starter-picker screen too (that mode doesn't call startBGM again until a starter is
  // chosen or a save is resumed, so the same track just carries over — no extra wiring needed).
  useEffect(() => {
    if (!mode && sfx.startBGM) sfx.startBGM("MENU");
  }, [mode]);

  // ✅ UNIVERSAL BUTTON CLICK SFX: one capture-phase listener on `document`, attached once for
  // the entire lifetime of the app (GameScreen never unmounts — only the mode below it does),
  // covers every <button> anywhere in the tree (menus, modals, party setup, combat, inventory,
  // settings, everything) without having to wire an onClick sound into each button
  // individually. Capture phase means it fires before any button's own onClick — including
  // ones that call e.stopPropagation() — so it can never be silently swallowed. Disabled
  // buttons are skipped since they can't actually be activated.
  useEffect(() => {
    const handleGlobalClick = (e) => {
      const btn = e.target.closest && e.target.closest('button, [role="button"]');
      if (!btn || btn.disabled) return;
      if (sfx.playUIClick) sfx.playUIClick();
    };
    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, []);

  // ✅ FIX: music kept playing after "closing Chrome" — on mobile, backgrounding a tab
  // (switching apps, locking the screen) or even swiping it away doesn't always kill
  // its JS/audio immediately, so background music could keep running unheard. Stopping
  // on visibilitychange (tab hidden) and pagehide/beforeunload (tab closing/navigating
  // away) covers both cases without needing changes to the audio module itself.
  // ✅ FIX (part 2): the above used to only stop, never resume — so reopening the app
  // left it silent. Now it remembers whether IT was the one that stopped playback, and
  // if so, resumes the same track once the tab is visible again. It never resumes a
  // track that was stopped for another reason (e.g. game over, explicit mute).
  const autoStoppedRef = useRef(false);
  // ✅ PERF: the menu-level Bestiary roster fetch also parses via the shared CSV worker
  // instead of the main thread — see utils/csvWorker.js.
  const menuCsvWorkerRef = useRef(null);
  useEffect(() => () => {
    if (menuCsvWorkerRef.current) {menuCsvWorkerRef.current.terminate(); menuCsvWorkerRef.current = null;}
  }, []);
  useEffect(() => {
    const stopAudio = () => {
      autoStoppedRef.current = true;
      if (sfx.stopBGM) sfx.stopBGM();
    };
    const resumeAudio = () => {
      const lastTrack = sfx.getLastRequestedTrack ? sfx.getLastRequestedTrack() : null;
      if (autoStoppedRef.current && lastTrack && sfx.startBGM) {
        sfx.startBGM(lastTrack);
      }
      autoStoppedRef.current = false;
    };
    const handleVisibilityChange = () => {
      if (document.hidden) stopAudio();
      else resumeAudio();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", stopAudio);
    window.addEventListener("beforeunload", stopAudio);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", stopAudio);
      window.removeEventListener("beforeunload", stopAudio);
    };
  }, []);

  const [menuMusicVolume, setMenuMusicVolume] = useState(() => {
    try {const v = localStorage.getItem("digiroulette_music_volume"); return v === null ? 1.0 : parseFloat(v);} catch {return 1.0;}
  });
  const [menuSfxVolume, setMenuSfxVolume] = useState(() => {
    try {const v = localStorage.getItem("digiroulette_sfx_volume"); return v === null ? 1.0 : parseFloat(v);} catch {return 1.0;}
  });
  const [menuIsMuted, setMenuIsMuted] = useState(() => {
    try {return localStorage.getItem("digiroulette_muted") === "true";} catch {return false;}
  });
  const [menuReducedMotion, setMenuReducedMotion] = useState(() => {
    try {return localStorage.getItem("digiroulette_reduced_motion") === "true";} catch {return false;}
  });
  const [menuFastSpin, setMenuFastSpin] = useState(() => {
    try {return localStorage.getItem("digiroulette_fast_spin") === "true";} catch {return false;}
  });
  const [menuEnemyAutoSpin, setMenuEnemyAutoSpin] = useState(() => {
    try {return localStorage.getItem("digiroulette_enemy_auto_spin") === "true";} catch {return false;}
  });
  const [menuReduceEvoAnim, setMenuReduceEvoAnim] = useState(() => {
    try {return localStorage.getItem("digiroulette_reduce_evo_anim") === "true";} catch {return false;}
  });
  const [menuLongerEvoAnim, setMenuLongerEvoAnim] = useState(() => {
    try {return localStorage.getItem("digiroulette_longer_evo_anim") === "true";} catch {return false;}
  });
  const [menuHapticsEnabled, setMenuHapticsEnabled] = useState(() => {
    try {const v = localStorage.getItem("digiroulette_haptics_enabled"); return v === null ? true : v === "true";} catch {return true;}
  });
  const [menuColorblindMode, setMenuColorblindMode] = useState(() => {
    try {return localStorage.getItem("digiroulette_colorblind_mode") === "true";} catch {return false;}
  });
  const [menuEvoAnimSettings, setMenuEvoAnimSettings] = useState(loadEvoAnimSettings);

  const handleMenuMusicVolumeChange = (v) => {
    setMenuMusicVolume(v);
    sfx.setMusicVolume(v);
    try {localStorage.setItem("digiroulette_music_volume", String(v));} catch {}
  };
  const handleMenuSfxVolumeChange = (v) => {
    setMenuSfxVolume(v);
    sfx.setSfxVolume(v);
    try {localStorage.setItem("digiroulette_sfx_volume", String(v));} catch {}
  };
  const handleMenuToggleMute = () => {
    const nowMuted = sfx.toggleMute();
    setMenuIsMuted(nowMuted);
    try {localStorage.setItem("digiroulette_muted", String(nowMuted));} catch {}
  };
  const handleMenuToggleReducedMotion = () => {
    setMenuReducedMotion((prev) => {
      const next = !prev;
      try {localStorage.setItem("digiroulette_reduced_motion", String(next));} catch {}
      return next;
    });
  };
  const handleMenuToggleFastSpin = () => {
    setMenuFastSpin((prev) => {
      const next = !prev;
      try {localStorage.setItem("digiroulette_fast_spin", String(next));} catch {}
      return next;
    });
  };
  const handleMenuToggleEnemyAutoSpin = () => {
    setMenuEnemyAutoSpin((prev) => {
      const next = !prev;
      try {localStorage.setItem("digiroulette_enemy_auto_spin", String(next));} catch {}
      return next;
    });
  };
  const handleMenuToggleReduceEvoAnim = () => {
    setMenuReduceEvoAnim((prev) => {
      const next = !prev;
      try {localStorage.setItem("digiroulette_reduce_evo_anim", String(next));} catch {}
      return next;
    });
  };
  const handleMenuToggleLongerEvoAnim = () => {
    setMenuLongerEvoAnim((prev) => {
      const next = !prev;
      try {localStorage.setItem("digiroulette_longer_evo_anim", String(next));} catch {}
      return next;
    });
  };
  const handleMenuToggleHaptics = () => {
    setMenuHapticsEnabled((prev) => {
      const next = !prev;
      sfx.setHapticsEnabled(next);
      try {localStorage.setItem("digiroulette_haptics_enabled", String(next));} catch {}
      return next;
    });
  };
  const handleMenuToggleColorblindMode = () => {
    setMenuColorblindMode((prev) => {
      const next = !prev;
      try {localStorage.setItem("digiroulette_colorblind_mode", String(next));} catch {}
      return next;
    });
  };
  const handleMenuToggleEvoAnimSetting = (chipKey) => {
    setMenuEvoAnimSettings((prev) => {
      const next = {...prev, [chipKey]: !prev[chipKey]};
      try {localStorage.setItem(EVO_ANIM_SETTINGS_KEY, JSON.stringify(next));} catch {}
      return next;
    });
  };

  const enterMode = (m, resume = false) => {
    setAutoResume(resume);
    setMode(m);
  };

  // ✅ Instant Switch Mode: jumps straight into the other mode. If it has a save, resume it
  // immediately (same instant-resume path as Continue); otherwise land on its starter picker.
  const switchMode = (target) => {
    const saveKey = target === "shop" ? SHOP_SAVE_KEY : RNG_SAVE_KEY;
    const hasSave = getSaveSummary(saveKey) !== null;
    enterMode(target, hasSave);
  };

  const handleNewRun = (m) => {
    const saveKey = m === "shop" ? SHOP_SAVE_KEY : RNG_SAVE_KEY;
    const hasSave = (() => {try {return localStorage.getItem(saveKey) !== null;} catch {return false;}})();
    if (hasSave) setOverwriteConfirm(m);
    else enterMode(m);
  };

  const confirmOverwrite = () => {
    const m = overwriteConfirm;
    const saveKey = m === "shop" ? SHOP_SAVE_KEY : RNG_SAVE_KEY;
    try {localStorage.removeItem(saveKey);} catch {}
    setOverwriteConfirm(null);
    enterMode(m);
  };

  const handleExitMode = () => {
    setMode(null);
  };

  // ✅ Fetches the shared species roster once (cached in state) so the main menu's Bestiary
  // can open instantly without entering a mode. Both modes draw from the same Google Sheets,
  // so this reuses Shop mode's URLs as a read-only data source — it doesn't touch either
  // mode's own logic or its save/progress data.
  const fetchMenuRosterOnce = () => {
    if (menuFullRoster.length > 0 || menuRosterLoading) return;
    setMenuRosterLoading(true);
    if (!menuCsvWorkerRef.current) menuCsvWorkerRef.current = createCsvWorker();
    const fetchAndParse = (url) => parseCsvViaWorker(menuCsvWorkerRef.current, url, url);
    Promise.all(Object.values(SHOP_URLS).map(fetchAndParse))
      .then((results) => {
        const master = results.flat();
        // ✅ BUGFIX: same dedup as the in-mode roster build — a species can appear on more
        // than one sheet tab, which would otherwise show it twice in the menu's Bestiary too.
        // hp/power use the same deterministic per-species variance as in-game so numbers match.
        const seen = new Set();
        const deduped = [];
        master.forEach((d) => {
          if (!d || !d.name) return;
          const key = d.name.toLowerCase().trim();
          if (seen.has(key)) return;
          seen.add(key);
          const variance = menuGetStatVariance(d.name);
          deduped.push({
            name: d.name,
            imageUrl: d.imageUrl || "",
            level: d.level || "Child",
            hp: Math.max(1, Math.round((parseInt(d.hp) || 100) * variance)),
            power: Math.max(1, Math.round((parseInt(d.power) || 3) * variance)),
          });
        });
        setMenuFullRoster(deduped);
      })
      .catch((err) => console.error("Menu roster fetch failed:", err))
      .finally(() => setMenuRosterLoading(false));
  };

  const openMenuBestiary = (m) => {
    fetchMenuRosterOnce();
    setMenuBestiaryMode(m);
  };

  if (!mode) {
    return (
      <>
        <MainMenuScreen
          onContinue={(m) => enterMode(m, true)}
          onNewRun={handleNewRun}
          onBestiary={openMenuBestiary}
          onLeaderboard={(m) => setMenuLeaderboardMode(m)}
          onTutorial={() => setShowMenuTutorial(true)}
          onSettings={() => setShowMenuSettings(true)}
        />
        {showMenuTutorial && <TutorialPopup onClose={() => setShowMenuTutorial(false)} />}
        {showMenuSettings && <SettingsModal
          onClose={() => setShowMenuSettings(false)}
          musicVolume={menuMusicVolume} onMusicVolumeChange={handleMenuMusicVolumeChange}
          sfxVolume={menuSfxVolume} onSfxVolumeChange={handleMenuSfxVolumeChange}
          isMuted={menuIsMuted} onToggleMute={handleMenuToggleMute}
          reducedMotion={menuReducedMotion} onToggleReducedMotion={handleMenuToggleReducedMotion}
          fastSpin={menuFastSpin} onToggleFastSpin={handleMenuToggleFastSpin}
          enemyAutoSpin={menuEnemyAutoSpin} onToggleEnemyAutoSpin={handleMenuToggleEnemyAutoSpin}
          reduceEvoAnim={menuReduceEvoAnim} onToggleReduceEvoAnim={handleMenuToggleReduceEvoAnim}
          longerEvoAnim={menuLongerEvoAnim} onToggleLongerEvoAnim={handleMenuToggleLongerEvoAnim}
          hapticsEnabled={menuHapticsEnabled} onToggleHaptics={handleMenuToggleHaptics}
          colorblindMode={menuColorblindMode} onToggleColorblindMode={handleMenuToggleColorblindMode}
          evoAnimSettings={menuEvoAnimSettings} onToggleEvoAnimSetting={handleMenuToggleEvoAnimSetting}
        />}
        {menuLeaderboardMode && (
          <LeaderboardModal
            onClose={() => setMenuLeaderboardMode(null)}
            getLeaderboard={menuLeaderboardMode === "shop" ? getShopLeaderboard : getRngLeaderboard}
          />
        )}
        {menuBestiaryMode && (menuRosterLoading
          ? <MenuLoadingOverlay />
          : <BestiaryModal
              fullRoster={menuFullRoster}
              bestiaryKey={menuBestiaryMode === "shop" ? SHOP_BESTIARY_KEY : RNG_BESTIARY_KEY}
              onClose={() => setMenuBestiaryMode(null)}
            />
        )}
        {overwriteConfirm && (
          <OverwriteConfirmModal
            modeLabel={overwriteConfirm === "shop" ? "Shop mode" : "Full RNG mode"}
            onCancel={() => setOverwriteConfirm(null)}
            onConfirm={confirmOverwrite}
          />
        )}
      </>
    );
  }
  if (mode === "shop") return <ShopModeApp onExitMode={handleExitMode} onSwitchMode={() => switchMode("rng")} autoResume={autoResume} />;
  return <RngModeApp onExitMode={handleExitMode} onSwitchMode={() => switchMode("shop")} autoResume={autoResume} />;
}
