// ✅ Tiny loading veil shown while the main menu fetches the shared species roster for its
// standalone Bestiary view (only needed the first time Dex is opened from the menu; cached after).

import React from "react";
import {DV, DV_FONT_MONO} from "../constants/theme";

const MenuLoadingOverlay = () => (
  <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(4,8,6,0.88)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"12px",color:DV.ink,fontFamily:DV_FONT_MONO}}>
    <style>{`@keyframes menuLoadSpin{from{transform:rotate(-90deg);}to{transform:rotate(270deg);}}`}</style>
    <div style={{position:"relative",width:"64px",height:"64px"}}>
      <svg viewBox="0 0 120 120" width="100%" height="100%">
        <circle cx="60" cy="60" r="52" fill="none" stroke={DV.bezelLine} strokeWidth="8" />
        <circle cx="60" cy="60" r="52" fill="none" stroke={DV.phosphor} strokeWidth="8" strokeLinecap="round" strokeDasharray="90 236.7" style={{filter:"drop-shadow(0 0 6px rgba(77,255,143,0.7))",animation:"menuLoadSpin 1.6s linear infinite",transformOrigin:"60px 60px"}} />
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px"}}>📡</div>
    </div>
    <p style={{color:DV.phosphor,fontWeight:"bold",fontSize:"9px",letterSpacing:"1px",margin:0,textShadow:"0 0 10px rgba(77,255,143,0.5)"}}>LOADING SPECIES DATA…</p>
  </div>
);

export default MenuLoadingOverlay;
