// ============================================================
// LOADING SCREEN — scan-ring style. Real loading has no discrete step list
// (just a single rolling loadingMsg string), so the ring animates as an
// indeterminate scan rather than tracking a fake percentage.
// ============================================================
import React from "react";
import {DV, DV_FONT_MONO, DV_FONT_DISPLAY} from "../constants/theme";

const LoadingScreen = ({loadingMsg, loadError = false, onRetry}) => (
  <div style={{position:"fixed",inset:0,zIndex:500,background:"radial-gradient(120% 140% at 50% -10%, #0d1f16, #081410 60%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"10px",fontFamily:DV_FONT_MONO,color:DV.ink,overflow:"hidden"}}>
    <style>{`
      @keyframes loadRingSpin{from{transform:rotate(-90deg);}to{transform:rotate(270deg);}}
      @keyframes loadBlink{0%,49%{opacity:1;}50%,100%{opacity:0.15;}}
      .load-ring-fg{animation:loadRingSpin 1.6s linear infinite;transform-origin:60px 60px;}
    `}</style>
    <div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(to bottom, rgba(77,255,143,0.05) 0px, rgba(77,255,143,0.05) 1px, transparent 2px, transparent 4px)",pointerEvents:"none",mixBlendMode:"screen"}} />
    <div style={{position:"absolute",top:"14px",left:"18px",right:"18px",display:"flex",justifyContent:"space-between",fontSize:"8px",letterSpacing:"1.5px",color:DV.inkDim}}>
      <span style={{display:"flex",alignItems:"center",gap:"5px",color:loadError?"#ff5c5c":DV.phosphor}}>
        <span style={{width:"5px",height:"5px",borderRadius:"50%",background:loadError?"#ff5c5c":DV.phosphor,display:"inline-block",animation:loadError?"none":"loadBlink 1.6s steps(1) infinite"}} />
        {loadError ? "FIELD LINK: LOST" : "FIELD LINK: CONNECTING"}
      </span>
      <span>SYS.04 · DIGIVICE — MODEL RX</span>
    </div>

    <div style={{position:"relative",width:"min(130px,22vh)",height:"min(130px,22vh)"}}>
      <svg viewBox="0 0 120 120" width="100%" height="100%">
        <circle cx="60" cy="60" r="52" fill="none" stroke={DV.bezelLine} strokeWidth="6" />
        {/* ✅ FIX (stuck-forever loading): the ring no longer spins once loadError is true —
            a static ring plus a Retry button below tells the player the sync genuinely failed
            instead of leaving an infinite spinner with no way forward. Paired with a 15s
            per-request timeout in the data hook, so a hung network call now surfaces here
            instead of hanging silently. */}
        <circle className={loadError ? "" : "load-ring-fg"} cx="60" cy="60" r="52" fill="none" stroke={loadError?"#ff5c5c":DV.phosphor} strokeWidth="6" strokeLinecap="round" strokeDasharray="90 236.7" style={{filter:loadError?"drop-shadow(0 0 6px rgba(255,92,92,0.6))":"drop-shadow(0 0 6px rgba(77,255,143,0.7))"}} />
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:"20px",marginBottom:"2px"}}>{loadError ? "⚠️" : "📡"}</span>
      </div>
    </div>

    <div style={{textAlign:"center"}}>
      <h1 style={{fontFamily:DV_FONT_DISPLAY,fontSize:"clamp(11px,2vw,14px)",letterSpacing:"1px",color:loadError?"#ff5c5c":DV.phosphor,textShadow:loadError?"0 0 12px rgba(255,92,92,0.5)":"0 0 12px rgba(77,255,143,0.5)",margin:"0 0 4px"}}>{loadError ? "SYNC FAILED" : "SYNCHRONIZING"}</h1>
      <div style={{fontSize:"7.5px",color:DV.inkDim,letterSpacing:"0.5px",minHeight:"10px"}}>{loadError ? "Unable to reach the Digimon database." : "Establishing cloud connection…"}</div>
    </div>

    <div style={{width:"min(420px,90%)",background:"#050c08",border:`1px solid ${loadError?"#7a2e2e":DV.bezelLine}`,borderRadius:"8px",padding:"6px 10px",textAlign:"center"}}>
      <div style={{fontSize:"8px",color:loadError?"#ff9b8a":DV.phosphorDim,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{"> "}{loadingMsg || "Booting…"}</div>
    </div>

    {loadError && onRetry && (
      <button onClick={onRetry} style={{fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:"9px",letterSpacing:"1px",borderRadius:"9px",padding:"9px 24px",cursor:"pointer",background:"#ff5c5c",color:"#1a0a0a",border:"none"}}>🔄 RETRY</button>
    )}
  </div>
);

export default LoadingScreen;
