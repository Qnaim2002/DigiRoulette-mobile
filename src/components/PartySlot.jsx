// ============================================================
// PARTY SLOT
// ============================================================
import React from "react";
import {getHpColors} from "../utils/hpColors";
import {computeSellPrice, getAttributeEmoji, EVO_CHIP_FOR_LEVEL} from "../DigimonRoulette";
import DigimonInfoPopup from "./DigimonInfoPopup";

const getSlotStyle = (maxSize) => ({
  width:"100%",aspectRatio:"1 / 1",maxWidth:`${maxSize}px`,
  borderRadius:"10px",border:"2px solid #2c3a33",boxSizing:"border-box",
  display:"flex",alignItems:"center",justifyContent:"center",
  background:"#1e1e24",overflow:"hidden",cursor:"pointer",padding:0,
  transition:"border-color 0.3s, box-shadow 0.3s",
});

const PartySlot = React.memo(({digimon, slotType, slotIndex, onSlotClick, selected, animClass, animKey, hitFlash, isEvolving, floatEvent = null, reducedMotion = false, colorblindMode = false, showInfo = false, onInfoToggle, evoChipCount = 0, onEvolveRequest, isHighlightedForEvo = false, onReleaseRequest, sellEnabled = false, onSellRequest, evoChipForLevel = EVO_CHIP_FOR_LEVEL, compact = false, sizeScale = 1, disableDoubleClick = false}) => {
  // ✅ MOBILE FIX: this was a hardcoded 90px maxWidth — on a narrow landscape
  // phone, 3 party slots + gaps (270px+) don't fit inside col-right's ~28%
  // share of the screen, so the column blew past its box and got hard-clipped
  // by the parent's overflow:hidden. Compact mode shrinks the slot instead.
  // sizeScale lets Reserve Box render smaller cards than Party without a second component.
  const maxSize = Math.round((compact ? 58 : 90) * sizeScale);
  const slotStyle = getSlotStyle(maxSize);
  const isLowHp = digimon && digimon.hp > 0 && (digimon.hp / digimon.maxHp) <= 0.2;
  const hpColors = getHpColors(colorblindMode);
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    // ✅ BUGFIX: reordering the party fast enough could land two real clicks on the SAME
    // physical slot button (the first click just selects it — nothing moves yet — so a
    // slightly mistimed second tap lands on that identical, still-unmoved element). The
    // browser then correctly fires its own native dblclick on top of the two clicks, popping
    // the info card open mid-reorder. Suppressing this while a slot is actively selected for
    // a swap (disableDoubleClick, driven by selectedSlot upstream) keeps a fast reorder from
    // ever being reinterpreted as "inspect this Digimon."
    if (disableDoubleClick) return;
    if (digimon && onInfoToggle) onInfoToggle(slotType, slotIndex);
  };
  const neededChip = digimon ? evoChipForLevel[digimon.level] : null;
  const hasNextEvolution = digimon && digimon.nextFormName && digimon.nextFormName.toLowerCase().trim() !== "peak form";
  const showEvoPulse = isHighlightedForEvo && hasNextEvolution;
  // ✅ Sell is only ever offered when sellEnabled is true (already gated upstream on being in
  // the Digital Shop) AND the Digimon is still alive — fainted Digimon can't be sold.
  const canSellNow = !!(sellEnabled && digimon && digimon.hp > 0);
  const handleClick = (e) => {
    if (showEvoPulse && evoChipCount > 0 && onEvolveRequest) {
      e.stopPropagation();
      onEvolveRequest(slotType, slotIndex);
      return;
    }
    if (onSlotClick) onSlotClick(slotType, slotIndex, e);
  };
  return (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:`${maxSize}px`,gap:"0px",position:"relative"}}>
    {floatEvent && (
      <div key={floatEvent.ts} className="float-num" style={{position:"absolute",top:"12px",left:"78%",color:floatEvent.color,zIndex:20}}>{floatEvent.text}</div>
    )}
    {showInfo && digimon && (
      <DigimonInfoPopup
        digimon={digimon}
        onClose={() => onInfoToggle && onInfoToggle(slotType, slotIndex)}
        compact={compact}
        showEvoHint={!!(neededChip && evoChipCount > 0 && hasNextEvolution)}
        onRelease={() => onReleaseRequest && onReleaseRequest(slotType, slotIndex)}
        onSell={canSellNow ? () => onSellRequest && onSellRequest(slotType, slotIndex) : undefined}
        sellPrice={digimon ? computeSellPrice(digimon) : 0}
      />
    )}
    {digimon?.name && (
      <span style={{fontSize:compact?"7px":"8.5px",fontWeight:"bold",color:isEvolving?"#fff8dc":"#ffd700",textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",width:"100%",lineHeight:"1.1",transition:"color 0.3s"}}>
        {digimon.name}
      </span>
    )}
    <button
      onClick={digimon ? handleClick : undefined}
      onDoubleClick={handleDoubleClick}
      disabled={!digimon}
      className={`party-slot-btn ${isEvolving && !reducedMotion ? "evo-glow" : ""} ${isLowHp && !reducedMotion ? "low-hp-pulse" : ""} ${showEvoPulse && !reducedMotion ? "evo-chip-pulse" : ""}`}
      style={{...slotStyle,marginTop:"3px",border:showEvoPulse?"2px solid #ffb238":selected?"3px solid #4dff8f":isEvolving?"2px solid #ffb238":isLowHp?`2px solid ${hpColors.low}`:slotStyle.border,opacity:digimon?.hp<=0?0.6:1,"--lowhp-glow-a":hpColors.lowGlowA,"--lowhp-glow-b":hpColors.lowGlowB}}
    >
      {digimon?.image ? (
        <div style={{textAlign:"center",position:"relative",width:"100%",height:"100%"}}>
          {/* ✅ BUGFIX (HP bar snap): the shake-restart trick (remounting via key={animKey} on
              repeat hits) used to live on the outer <button>, which meant the HP bar div below
              got destroyed and recreated on every single hit too — a freshly mounted element
              has no "previous width" to transition from, so it just appeared already at the
              lower value instead of visibly draining. Scoping the remount to only this
              image wrapper keeps the shake-restart working while leaving the HP bar's DOM
              node stable across hits, so its width transition can actually animate. */}
          <div key={animKey} className={animClass || ""} style={{width:"100%",height:"100%"}}>
            <img src={digimon.image} alt={digimon.name} style={{width:"90%",height:"90%",objectFit:"contain",marginTop:"5%",filter:digimon.hp<=0?"grayscale(100%)":isEvolving?"brightness(4) saturate(0)":"none",transition:isEvolving?"filter 0.4s ease":"filter 0.6s ease"}} />
          </div>
          <span style={{position:"absolute",top:"2px",left:"2px",fontSize:compact?"9px":"12px",background:"rgba(0,0,0,0.65)",borderRadius:"5px",padding:"1px 3px",lineHeight:1}} title={digimon.attribute || "Unknown"}>{getAttributeEmoji(digimon.attribute)}</span>
          <div style={{position:"absolute",bottom:0,left:0,right:0,height:compact?"9px":"12px",background:"#331c1c",overflow:"hidden"}}>
            <div style={{background:digimon.hp<=0?"#555":isLowHp?hpColors.low:hpColors.healthy,height:"100%",width:`${Math.max(0,Math.min(100,(digimon.hp/digimon.maxHp)*100))}%`,transition:"width 0.4s ease-out"}} />
            <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:compact?"6px":"8px",fontWeight:"bold",color:"#fff",textShadow:"0 1px 2px rgba(0,0,0,0.9)"}}>
              {digimon.hp<=0?"DEAD":`${digimon.hp}/${digimon.maxHp}`}
            </span>
            {hitFlash && <div style={{position:"absolute",inset:0,background:"rgba(231,76,60,0.7)",animation:"hpFlash 0.35s ease-out forwards"}} />}
          </div>
        </div>
      ) : (
        <span style={{color:"#5f8c72",fontSize:compact?"18px":"20px"}}>🥚</span>
      )}
    </button>
  </div>
  );
});

export default PartySlot;
