// ============================================================
// REMINDER MODAL — shared "don't show this again" dismissible reminder,
// used for the fainted-can't-evolve notice and the hot-swap-costs-a-turn
// warning.
// ============================================================
import React, {useState} from "react";
import {DV, DV_FONT_MONO, DV_FONT_DISPLAY} from "../constants/theme";

const ReminderModal = ({icon = "⚠️", title, message, confirmLabel = "GOT IT", cancelLabel = "CANCEL", onConfirm, onCancel}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(4,8,6,0.85)",display:"flex",alignItems:"center",justifyContent:"center",padding:"12px",boxSizing:"border-box",fontFamily:DV_FONT_MONO}}>
      <div style={{width:"min(460px,90%)",background:"#050c08",border:`1px solid ${DV.amberDim}`,borderRadius:"14px",padding:"16px 18px",display:"flex",flexDirection:"column",gap:"11px",boxShadow:"0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(255,178,56,0.1)",boxSizing:"border-box",alignItems:"center",textAlign:"center"}}>
        <span style={{fontSize:"26px"}}>{icon}</span>
        <h2 style={{fontFamily:DV_FONT_DISPLAY,fontSize:"10.5px",color:DV.amber,margin:0,letterSpacing:"0.5px"}}>{title}</h2>
        <p style={{margin:0,fontSize:"9px",color:DV.ink,lineHeight:"1.6"}}>{message}</p>

        <div onClick={() => setDontShowAgain((v) => !v)} style={{display:"flex",alignItems:"center",gap:"7px",cursor:"pointer",width:"100%",background:"#08120d",border:`1px solid ${DV.bezelLine}`,borderRadius:"8px",padding:"8px 10px",boxSizing:"border-box"}}>
          <div style={{width:"16px",height:"16px",flexShrink:0,borderRadius:"4px",border:`1.5px solid ${dontShowAgain?DV.amber:DV.bezelLine}`,background:dontShowAgain?DV.amber:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",color:"#0a1712",fontWeight:"bold"}}>{dontShowAgain?"✓":""}</div>
          <span style={{fontSize:"8px",color:DV.inkDim,textAlign:"left"}}>Don't show this again</span>
        </div>

        <div style={{display:"flex",gap:"8px",width:"100%"}}>
          {onCancel && (
            <button onClick={onCancel} style={{flex:1,fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:"8.5px",letterSpacing:"0.5px",borderRadius:"9px",padding:"9px 0",cursor:"pointer",background:"transparent",border:`1px solid ${DV.bezelLine}`,color:DV.inkDim}}>{cancelLabel}</button>
          )}
          <button onClick={() => onConfirm(dontShowAgain)} style={{flex:1,fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:"8.5px",letterSpacing:"0.5px",borderRadius:"9px",padding:"9px 0",cursor:"pointer",background:DV.amber,color:"#0a1712",border:"none"}}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default ReminderModal;
