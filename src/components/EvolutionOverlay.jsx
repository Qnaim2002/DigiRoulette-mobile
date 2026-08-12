// ============================================================
// EVOLUTION OVERLAY — "Vortex Shatter": a full-screen shatter/reconstruction
// treatment that scales STRUCTURALLY (not just numerically) with tier — Baby
// gets a single quiet ring and a handful of shards; Ultra+ gets a screen-wide
// crack, chromatic aberration, a hue-invert flash, and a shard storm. Ported
// from the approved HTML mockup, with real Digimon sprites standing in for
// the mockup's placeholder emoji.
// Mirrors the hook's own ~2s timing (1000ms pre-swap + 1000ms post-swap):
// shows the pre-evolution sprite while the vortex builds, swaps to the
// post-evolution sprite around the midpoint flash, then fades out.
// ============================================================
import {useState, useEffect, useMemo} from "react";
import {sfx} from "../utils/audio";
import {DV_FONT_MONO, DV_FONT_DISPLAY} from "../constants/theme";

const EVOLUTION_ANIM_MS_NORMAL = 2000;
const EVOLUTION_ANIM_MS_LONG = 3000;

// ✅ PER-TIER VISUAL THEME — seven distinct palettes/labels/intensities, one per evolution
// bracket (baby→child, child→adult, adult→perfect, perfect→ultimate, ultimate→ultra,
// ultra→ultra, and the new ultra→ultra+ capstone). `intensity` is the single number that
// drives shake amplitude, shard/ember counts, ring thickness, and sprite scale, so climbing
// higher tiers reads as genuinely bigger/bolder rather than just "more of the same".
const EVO_TIER_THEMES = {
  baby:     {primary:"#ffb3de", secondary:"#fff0f7", intensity:0.3, label:"BABY EVOLUTION"},
  child:    {primary:"#4dff8f", secondary:"#ffb238", intensity:0.8, label:"EVOLUTION"},
  adult:    {primary:"#58a6ff", secondary:"#ffb238", intensity:1.4, label:"ADULT EVOLUTION"},
  perfect:  {primary:"#b98bff", secondary:"#4dff8f", intensity:2.1, label:"PERFECT EVOLUTION"},
  ultimate: {primary:"#ff9b3e", secondary:"#ff5c5c", intensity:2.9, label:"ULTIMATE EVOLUTION"},
  ultra:    {primary:"#ffe14d", secondary:"#ff5c5c", intensity:3.8, label:"ULTRA REFORGE"},
  ultraplus:{primary:"#ffffff", secondary:"#ffe14d", intensity:5.0, label:"OMEGA EVOLUTION"},
};
const EVO_TIER_KEYS = Object.keys(EVO_TIER_THEMES);

function vxRand(min, max) { return min + Math.random() * (max - min); }

// Jagged crack lines radiating from a center point — used both for the sprite-level crack
// overlay and (scaled up) the Ultra+ screen-wide crack.
function buildCrackLines(radius, count, jag) {
  const lines = [];
  for (let i = 0; i < count; i++) {
    const ang = (360 / count) * i + vxRand(-14, 14);
    const rad = (ang * Math.PI) / 180;
    const segs = 3 + Math.floor(Math.random() * 2);
    const pts = [`${radius},${radius}`];
    for (let s = 1; s <= segs; s++) {
      const rr = radius * 0.25 + radius * 0.75 * (s / segs);
      const wob = vxRand(-jag, jag);
      const px = radius + Math.cos(rad) * rr + Math.cos(rad + Math.PI / 2) * wob;
      const py = radius + Math.sin(rad) * rr + Math.sin(rad + Math.PI / 2) * wob;
      pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }
    lines.push({points: pts.join(" "), thick: i % 3 === 0});
  }
  return lines;
}

const EvolutionOverlay = ({digimon, tier, reducedMotion = false, reduceEvoAnim = false, longerAnim = false}) => {
  const safeTier = EVO_TIER_THEMES[tier] ? tier : "child";
  const theme = EVO_TIER_THEMES[safeTier];
  const idx = EVO_TIER_KEYS.indexOf(safeTier);
  const isUltraPlus = idx === 6;
  // ✅ "Longer Evolution Animation" setting: stretches the whole sequence from ~2s to ~3s.
  // Every `${animMs}ms` reference below drives the outer duration of a CSS animation whose
  // internal keyframe percentages are relative — so scaling this one number up automatically
  // stretches every beat of the sequence proportionally, no other timing math needed.
  const animMs = longerAnim ? EVOLUTION_ANIM_MS_LONG : EVOLUTION_ANIM_MS_NORMAL;

  const [preSprite, setPreSprite] = useState(digimon);
  const [postSprite, setPostSprite] = useState(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Fresh mount = a new evolution cycle starting. Snapshot the current
    // (pre-evolution) sprite and arm the midpoint reveal timer.
    setPreSprite(digimon);
    setPostSprite(null);
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), animMs * 0.46);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // ✅ Swap to a dedicated evolution theme for the duration of the overlay, then restore
    // whatever gameplay track (World/Battle/Boss) was actually playing beforehand — captured
    // up front since sfx's own last-requested-track will be overwritten to "EVOLUTION" below.
    const previousTrack = sfx.getLastRequestedTrack();
    if (sfx.startBGM) sfx.startBGM("EVOLUTION");
    return () => {
      if (previousTrack && sfx.startBGM) sfx.startBGM(previousTrack);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Once the hook flips party/reserve state mid-animation, this prop changes
    // to the evolved form — capture it as the post-evolution sprite.
    if (digimon && preSprite && digimon.name !== preSprite.name) {
      setPostSprite(digimon);
    }
  }, [digimon, preSprite]);

  // ✅ Structural feature gates: low tiers simply don't render these layers at all — rather
  // than a weaker version of them — which is what makes Baby feel like a small quiet sparkle
  // and Ultra+ feel like a screen-filling event.
  const showLightning  = idx >= 1 && !reducedMotion;
  const showVignette   = idx >= 1;
  const showPulseRings = idx >= 2;
  // ✅ "Reduce Evolution Effects" setting: chromatic aberration is two full-screen blend-mode
  // layers — one of the pricier pieces of this overlay on weaker GPUs — so it's the first
  // thing switched off. Ring count is also capped at 1 regardless of tier, since concurrent
  // spinning rings (each its own infinite CSS animation) are the other big recurring cost.
  const showChroma     = idx >= 2 && !reduceEvoAnim;
  const showHueInvert  = idx >= 3 && !reducedMotion;
  const ringCount       = reduceEvoAnim ? 1 : (idx < 2 ? 1 : idx < 5 ? 2 : 3);

  const spriteSize = [72, 84, 98, 112, 128, 148, 172][idx];
  const preSize    = Math.round(spriteSize * 0.72);
  const ringBase   = 100 + idx * 24;
  const ringBorder = 2 + idx * 0.6;
  const beamWidth  = 26 + idx * 14;
  const ringSpeed  = 1.5 / theme.intensity;
  const dimPeak    = 0.5 + idx * 0.06;

  // ✅ Procedural per-tier VFX data (shard trajectories, glyph-rain columns, lightning bolts,
  // pulse-ring delays, embers, crack geometry) — generated once per mount via useMemo so it
  // doesn't reshuffle mid-animation, but is freshly randomized every time an evolution fires.
  const vfx = useMemo(() => {
    // ✅ "Reduce Evolution Effects" setting: scales down every particle/element count below
    // (shards, glyph columns, lightning bolts, embers, screen-crack line count) rather than
    // toggling any of them off outright — every tier keeps its distinct shape and character,
    // it's just lighter to render.
    const perfScale = reduceEvoAnim ? 0.45 : 1;

    const shCount = Math.max(2, Math.min(34, Math.round((3 + idx * idx * 0.9) * perfScale)));
    const shards = Array.from({length: shCount}, (_, i) => {
      const ang = (i / shCount) * 360 + vxRand(-8, 8);
      const dist = vxRand(60, 120) + idx * 16;
      const rad = (ang * Math.PI) / 180;
      const size = vxRand(5, 9) + idx * 1.1;
      return {
        tx: (Math.cos(rad) * dist).toFixed(0) + "px",
        ty: (Math.sin(rad) * dist).toFixed(0) + "px",
        trot: vxRand(-260, 260).toFixed(0) + "deg",
        w: size, h: size * 1.6,
        color: i % 3 === 0 ? theme.secondary : theme.primary,
        delay: (0.42 + i * 0.006).toFixed(2),
      };
    });

    const colCount = reduceEvoAnim ? 4 : 10;
    const glyphChars = ["0","1","0","1","ﾊ","ﾐ","ｹ","ｦ","ｳ","1","0"];
    const glyphCols = Array.from({length: colCount}, (_, i) => {
      const lines = 20 + Math.floor(Math.random() * 6);
      let str = "";
      for (let l = 0; l < lines; l++) str += glyphChars[Math.floor(Math.random() * glyphChars.length)] + "\n";
      return {
        left: (10 + (i / colCount) * 80 + vxRand(-2, 2)).toFixed(1) + "%",
        color: i % 3 === 0 ? theme.secondary : theme.primary,
        text: str,
      };
    });

    const bCount = showLightning ? Math.max(0, Math.min(10, Math.round((1 + idx * 1.6) * perfScale))) : 0;
    const bolts = Array.from({length: bCount}, (_, i) => {
      const ang = vxRand(0, 360);
      const len = vxRand(40, 60) + idx * 8;
      const pts = [];
      for (let s = 0; s <= 4; s++) pts.push(`${(len / 4) * s},${s % 2 === 0 ? 0 : vxRand(-5, 5)}`);
      return {
        ang, len,
        points: pts.join(" "),
        color: i % 2 === 0 ? theme.primary : theme.secondary,
        delay: (i * 0.035).toFixed(2),
      };
    });

    const pulseDelaysBase = idx >= 5 ? [0,0.26,0.15,0.08,0.045,0.02,0.01] : [0,0.30,0.17,0.095];
    let acc = 0;
    const pulseRings = pulseDelaysBase.map((gap, i) => {
      acc += gap;
      return {size: 60 + idx * 8 + i * 5, delay: acc.toFixed(2)};
    });

    const emCount = Math.max(1, Math.round((2 + idx * 3) * perfScale));
    const embers = Array.from({length: emCount}, (_, i) => ({
      size: vxRand(2.5, 4.5) + idx * 0.35,
      color: i % 2 === 0 ? theme.secondary : theme.primary,
      offsetX: vxRand(-30 - idx * 8, 30 + idx * 8).toFixed(0) + "px",
      delay: (0.78 + i * 0.04).toFixed(2),
    }));

    const preCrack = buildCrackLines(Math.round(preSize * 0.65), 3 + idx, 5 + idx);
    const screenCrack = isUltraPlus ? buildCrackLines(320, reduceEvoAnim ? 5 : 10, 34) : null;

    return {shards, glyphCols, bolts, pulseRings, embers, preCrack, screenCrack};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeTier, reduceEvoAnim]);

  const shown = revealed && postSprite ? postSprite : preSprite;
  if (!shown) return null;

  return (
    <div style={{position:"fixed",inset:0,zIndex:9500,overflow:"hidden",pointerEvents:"none",fontFamily:DV_FONT_MONO}}>
      <style>{`
        @keyframes vxShake{0%,44%,100%{transform:translate(0,0);}
          46%{transform:translate(calc(var(--shakeAmp) * -7px), calc(var(--shakeAmp) * 4px));}
          48%{transform:translate(calc(var(--shakeAmp) * 7px), calc(var(--shakeAmp) * -5px));}
          50%{transform:translate(calc(var(--shakeAmp) * -5px), calc(var(--shakeAmp) * 3px));}
          52%{transform:translate(calc(var(--shakeAmp) * 5px), calc(var(--shakeAmp) * -3px));}
          54%{transform:translate(0,0);}}
        @keyframes vxDim{0%{background:rgba(2,4,3,0.15);}13%,87%{background:rgba(2,4,3,var(--dimPeak,0.6));}100%{background:rgba(2,4,3,0.15);}}
        @keyframes vxBeamPulse{0%,100%{opacity:0;}22%,78%{opacity:0.85;}}
        @keyframes vxFadeInOut{0%{opacity:0;}15%{opacity:1;}85%{opacity:0.9;}100%{opacity:0;}}
        @keyframes vxSpinCW{from{transform:translate(-50%,-50%) rotate(0deg);}to{transform:translate(-50%,-50%) rotate(360deg);}}
        @keyframes vxSpinCCW{from{transform:translate(-50%,-50%) rotate(0deg);}to{transform:translate(-50%,-50%) rotate(-360deg);}}
        @keyframes vxFlash{0%,40%{opacity:0;}45%{opacity:0.97;}56%{opacity:0;}100%{opacity:0;}}
        @keyframes vxFlash2{0%,63%{opacity:0;}67%{opacity:0.85;}75%{opacity:0;}100%{opacity:0;}}
        @keyframes vxTagFade{0%,100%{opacity:0;}14%,85%{opacity:0.8;}}
        @keyframes vxCrackFadeIn{0%,30%{opacity:0;}40%,44%{opacity:1;}50%,100%{opacity:0;}}
        @keyframes vxPreSpriteFade{0%{opacity:1;transform:translate(-50%,-50%) scale(0.92);}
          38%{opacity:1;transform:translate(-50%,-50%) scale(1.05);}
          44%{opacity:0;transform:translate(-50%,-50%) scale(1.3);}
          100%{opacity:0;transform:translate(-50%,-50%) scale(1.3);}}
        @keyframes vxPulseRingSmall{0%{transform:translate(-50%,-50%) scale(0.35);opacity:0.85;}100%{transform:translate(-50%,-50%) scale(1.7);opacity:0;}}
        @keyframes vxVignettePulse{0%{box-shadow:inset 0 0 0 0 rgba(0,0,0,0);}
          36%{box-shadow:inset 0 0 150px 40px rgba(0,0,0,0.85);}
          44%,100%{box-shadow:inset 0 0 0 0 rgba(0,0,0,0);}}
        @keyframes vxLightningFlicker{0%,100%{opacity:0;}5%{opacity:1;}9%{opacity:0;}14%{opacity:0.9;}18%{opacity:0;}24%{opacity:1;}29%{opacity:0;}35%{opacity:0.7;}40%{opacity:0;}}
        @keyframes vxChromaFlicker{0%,38%{opacity:0;}41%{opacity:0.55;}44%{opacity:0.15;}47%{opacity:0.6;}52%,100%{opacity:0;}}
        @keyframes vxHueInvertFlicker{0%,41%{opacity:0;}43%{opacity:0.9;}45%{opacity:0;}47%{opacity:0.7;}49%,100%{opacity:0;}}
        @keyframes vxGlyphFall{0%{transform:translateY(-40px);opacity:0;}6%{opacity:1;}94%{opacity:1;}100%{transform:translateY(320px);opacity:0;}}
        @keyframes vxShardFly{
          0%{transform:translate(-50%,-50%) rotate(0deg) scale(0.2);opacity:0;}
          42%{transform:translate(-50%,-50%) rotate(0deg) scale(1);opacity:1;}
          55%{transform:translate(-50%,-50%) rotate(0deg) scale(1);opacity:1;}
          100%{transform:translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(var(--trot)) scale(0.4);opacity:0;}
        }
        @keyframes vxSpriteReveal{
          0%,43%{opacity:0;filter:brightness(0) saturate(0);transform:translate(-50%,-50%) scale(0.7);}
          46%{opacity:1;filter:brightness(0) saturate(0);transform:translate(-50%,-50%) scale(calc(1.1 + var(--intensity) * 0.045));}
          58%{opacity:1;filter:brightness(0) saturate(0) drop-shadow(0 0 14px var(--primary));transform:translate(-50%,-50%) scale(calc(1.2 + var(--intensity) * 0.05));}
          68%{filter:brightness(1) saturate(1) drop-shadow(0 0 16px var(--primary));transform:translate(-50%,-50%) scale(calc(1.15 + var(--intensity) * 0.04));}
          100%{opacity:1;filter:brightness(1) saturate(1) drop-shadow(0 0 10px var(--primary));transform:translate(-50%,-50%) scale(calc(1.05 + var(--intensity) * 0.025));}
        }
        @keyframes vxEmberDrift{0%{opacity:0;transform:translate(-50%,-50%) translateY(0);}12%{opacity:1;}100%{opacity:0;transform:translate(-50%,-50%) translateY(-64px);}}
        @keyframes vxNameGlitch{0%,63%{opacity:0;transform:translate(0,0);text-shadow:none;}
          66%{opacity:1;transform:translate(-4px,1px);text-shadow:2px 0 #ff2b6d,-2px 0 #2bdcff;}
          69%{opacity:0.25;transform:translate(3px,-1px);text-shadow:none;}
          72%{opacity:1;transform:translate(-2px,0);text-shadow:2px 0 #ff2b6d,-2px 0 #2bdcff;}
          76%,100%{opacity:1;transform:translate(0,0);text-shadow:none;}}
        @keyframes vxScreenCrackFade{0%,22%{opacity:0;}38%{opacity:1;}44%,100%{opacity:0;}}
        .vx-shake-wrap{animation:vxShake ${animMs}ms ease-in-out both;}
      `}</style>

      <div className="vx-shake-wrap" style={{position:"absolute",inset:0,"--shakeAmp":theme.intensity}}>
        <div style={{position:"absolute",inset:0,animation:`vxDim ${animMs}ms ease-in-out both`,"--dimPeak":dimPeak}} />
        <div style={{position:"absolute",inset:0,background:`repeating-linear-gradient(to bottom, ${theme.primary}0d 0px, ${theme.primary}0d 1px, transparent 2px, transparent 4px)`,mixBlendMode:"screen",zIndex:5,pointerEvents:"none"}} />

        {/* readout tag — names the specific evolution bracket in progress */}
        <div style={{position:"absolute",top:"12%",left:0,right:0,textAlign:"center",fontSize:"9px",letterSpacing:"2.5px",color:theme.primary,zIndex:10,animation:`vxTagFade ${animMs}ms ease-in-out both`}}>// {theme.label} //</div>

        {/* screen-edge vignette darkening (buildup, releases right at the flash) — Child+ only */}
        {showVignette && (
          <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:2,animation:`vxVignettePulse ${animMs}ms ease-in-out both`}} />
        )}

        {/* ULTRA+ ONLY: cracks spread edge-to-edge across the whole screen before the shatter */}
        {isUltraPlus && vfx.screenCrack && (
          <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:2,animation:`vxScreenCrackFade ${animMs}ms ease both`}}>
            <svg width="640" height="640" style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",overflow:"visible"}}>
              {vfx.screenCrack.map((line, i) => (
                <polyline key={i} points={line.points} stroke={theme.primary} strokeWidth={line.thick?1.6:1} fill="none" opacity={line.thick?0.9:0.55} />
              ))}
            </svg>
          </div>
        )}

        {/* portal rings + beam frame the whole animation — count/size/thickness grow with tier */}
        {Array.from({length: ringCount}, (_, r) => {
          const size = ringBase + r * 44;
          return (
            <div key={r} style={{position:"absolute",top:"50%",left:"50%",width:size,height:size,borderRadius:"50%",border:`${ringBorder.toFixed(1)}px ${r%2===0?"dashed":"solid"} ${r%2===0?theme.primary:theme.secondary}`,opacity:0.7,animation:`${r%2===0?"vxSpinCW":"vxSpinCCW"} ${(ringSpeed*(1+r*0.3)).toFixed(2)}s linear infinite, vxFadeInOut ${animMs}ms ease-in-out both`}} />
          );
        })}
        <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:beamWidth,marginLeft:-beamWidth/2,background:`linear-gradient(to bottom, transparent, ${theme.primary}${idx>=3?"77":"44"}, ${theme.primary}${idx>=3?"77":"44"}, transparent)`,animation:`vxBeamPulse ${animMs}ms ease-in-out both`}} />

        {/* pre-evolution sprite: cracks appear across it, then it breaks apart at the flash.
            ✅ FIX: explicit z-index here (paired with the crack svg right below) so both sit
            above the glyph-rain layer — previously neither had a z-index set, which put them
            in the default stacking layer BELOW glyph rain's z-index:3, letting the falling
            data-glyphs render in front of (obscuring) the Digimon picture during the buildup. */}
        {preSprite?.image && (
          <img src={preSprite.image} alt={preSprite.name} style={{position:"absolute",top:"50%",left:"50%",width:preSize,height:preSize,objectFit:"contain",filter:"brightness(0.5) saturate(0.35)",zIndex:4,animation:`vxPreSpriteFade ${animMs}ms ease both`}} />
        )}
        <svg width={Math.round(preSize*0.65)*2} height={Math.round(preSize*0.65)*2} style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",overflow:"visible",zIndex:4,animation:`vxCrackFadeIn ${animMs}ms ease both`,pointerEvents:"none"}}>
          {vfx.preCrack.map((line, i) => (
            <polyline key={i} points={line.points} stroke={theme.secondary} strokeWidth={line.thick?1.6:1} fill="none" opacity={line.thick?0.9:0.55} />
          ))}
        </svg>

        {/* small pulsing rings around the sprite, firing faster and faster as climax nears — Adult+ only */}
        {showPulseRings && vfx.pulseRings.map((pr, i) => (
          <div key={i} style={{position:"absolute",top:"50%",left:"50%",width:pr.size,height:pr.size,borderRadius:"50%",border:`2px solid ${theme.primary}`,pointerEvents:"none",animation:`vxPulseRingSmall 0.32s ease-out ${pr.delay}s both`}} />
        ))}

        {/* lightning crackle building up around the old form — absent for Baby, grows from Child up */}
        {showLightning && vfx.bolts.map((b, i) => (
          <div key={i} style={{position:"absolute",top:"50%",left:"50%",transformOrigin:"0 0",transform:`rotate(${b.ang}deg)`,animation:`vxLightningFlicker 0.62s steps(1) ${b.delay}s both`}}>
            <svg width={b.len} height="10" style={{overflow:"visible"}}>
              <polyline points={b.points} stroke={b.color} strokeWidth={1.4+idx*0.25} fill="none" style={{filter:`drop-shadow(0 0 4px ${theme.primary})`}} />
            </svg>
          </div>
        ))}

        {/* the old form shatters into shards — a handful for Baby, a screen full for Ultra+ */}
        {vfx.shards.map((sh, i) => (
          <div key={i} style={{position:"absolute",top:"50%",left:"50%",width:sh.w,height:sh.h,background:sh.color,boxShadow:`0 0 6px ${theme.primary}`,clipPath:"polygon(50% 0%, 100% 100%, 0% 100%)",animation:`vxShardFly 1.05s cubic-bezier(.25,.6,.3,1) ${sh.delay}s both`,"--tx":sh.tx,"--ty":sh.ty,"--trot":sh.trot}} />
        ))}

        {/* chromatic aberration across the WHOLE screen at climax — Adult+ only */}
        {showChroma && (() => {
          const offset = 2 + idx * 1.8;
          return (
            <>
              <div style={{position:"absolute",inset:0,mixBlendMode:"screen",pointerEvents:"none",zIndex:6,background:`rgba(255,20,80,${(0.16+idx*0.03).toFixed(2)})`,transform:`translateX(${(-offset).toFixed(0)}px)`,animation:`vxChromaFlicker ${animMs}ms steps(2) both`}} />
              <div style={{position:"absolute",inset:0,mixBlendMode:"screen",pointerEvents:"none",zIndex:6,background:`rgba(30,220,255,${(0.16+idx*0.03).toFixed(2)})`,transform:`translateX(${offset.toFixed(0)}px)`,animation:`vxChromaFlicker ${animMs}ms steps(2) both`}} />
            </>
          );
        })()}

        {/* brief hue-invert flash across the whole screen — Perfect+ only */}
        {showHueInvert && (
          <div style={{position:"absolute",inset:0,background:"#fff",mixBlendMode:"difference",pointerEvents:"none",zIndex:7,animation:`vxHueInvertFlicker ${animMs}ms steps(1) both`}} />
        )}

        {/* data/glyph rain falling through the rings — present at every tier.
            ✅ FIX: zIndex dropped from 3 to 1 so it now sits behind BOTH the pre-evolution
            sprite (zIndex:4, above) and the post-evolution reveal sprite (zIndex:8, below) —
            the falling glyphs read as a backdrop effect instead of overlapping the Digimon. */}
        {vfx.glyphCols.map((col, i) => (
          <div key={i} style={{position:"absolute",top:"0%",left:col.left,lineHeight:1.4,whiteSpace:"pre",textAlign:"center",pointerEvents:"none",zIndex:1,fontSize:9+idx,color:col.color,textShadow:`0 0 6px ${theme.primary}`,animation:`vxGlyphFall 1.44s linear both`}}>{col.text}</div>
        ))}

        {/* new form reveal: pure silhouette first, then fills in with real color — size itself
            scales with tier, so Baby stays small and humble, Ultra+ dominates the screen */}
        {shown.image && (
          <img
            src={shown.image}
            alt={shown.name}
            style={{position:"absolute",top:"50%",left:"50%",width:spriteSize,height:spriteSize,objectFit:"contain",zIndex:8,animation:`vxSpriteReveal ${animMs}ms ease both`,"--primary":theme.primary,"--intensity":theme.intensity}}
          />
        )}

        {/* trailing embers drifting upward after the burst — a couple for Baby, a shower for Ultra+ */}
        {vfx.embers.map((em, i) => (
          <div key={i} style={{position:"absolute",top:"50%",left:"50%",marginLeft:em.offsetX,width:em.size,height:em.size,borderRadius:"50%",background:em.color,boxShadow:`0 0 6px ${theme.primary}`,pointerEvents:"none",animation:`vxEmberDrift 0.85s ease-out ${em.delay}s both`}} />
        ))}

        {/* climax flash(es) — Ultra+ gets a second hit a beat after the first, unless
            Reduced Motion is on (double-flash is exactly the kind of rapid high-contrast
            flash that's a photosensitivity concern) */}
        <div style={{position:"absolute",inset:0,background:"#fff",animation:`vxFlash ${animMs}ms ease both`}} />
        {isUltraPlus && !reducedMotion && (
          <div style={{position:"absolute",inset:0,background:"#fff",pointerEvents:"none",animation:`vxFlash2 ${animMs}ms ease both`}} />
        )}

        {/* name banner — glitch-in treatment */}
        <div style={{position:"absolute",top:"65%",left:0,right:0,textAlign:"center",zIndex:10}}>
          <div style={{fontFamily:DV_FONT_DISPLAY,fontSize:"clamp(13px,3vw,18px)",color:theme.primary,textShadow:`0 0 16px ${theme.primary}b3`,animation:`vxNameGlitch ${animMs}ms steps(1) both`}}>{postSprite ? postSprite.name.toUpperCase() : ""}</div>
        </div>
      </div>
    </div>
  );
};

export default EvolutionOverlay;
