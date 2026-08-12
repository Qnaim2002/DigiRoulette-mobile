// ============================================================
// AUTHORIZATION MODAL — shared typewriter-readout confirm dialog used by
// both Release Confirm and Overwrite Confirm.
// ============================================================
import React, {useState, useEffect} from "react";
import {DV, DV_FONT_MONO, DV_FONT_DISPLAY} from "../constants/theme";

const AuthorizationModal = ({title, tag, rows, cancelLabel = "CANCEL", confirmLabel, onCancel, onConfirm}) => {
  const [visibleCount, setVisibleCount] = useState(0);
  useEffect(() => {
    setVisibleCount(0);
    if (rows.length === 0) return;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= rows.length) clearInterval(timer);
    }, 220);
    return () => clearInterval(timer);
  }, [rows]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(4,8,6,0.85)",display:"flex",alignItems:"center",justifyContent:"center",padding:"12px",boxSizing:"border-box",fontFamily:DV_FONT_MONO}}>
      <style>{`@keyframes authRowIn{to{opacity:1;transform:translateY(0);}} @keyframes authCaretBlink{0%,49%{opacity:1;}50%,100%{opacity:0.15;}}`}</style>
      <div style={{width:"min(460px,90%)",background:"#050c08",border:"1px solid #ff5c5c",borderRadius:"14px",padding:"14px 16px",display:"flex",flexDirection:"column",gap:"9px",boxShadow:"0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(255,92,92,0.1)",boxSizing:"border-box"}}>
        <h2 style={{fontFamily:DV_FONT_DISPLAY,fontSize:"10px",color:"#ff9b8a",margin:0,letterSpacing:"0.5px",textAlign:"center"}}>{title}</h2>
        <div style={{fontSize:"6.5px",color:"#ff5c5c",opacity:0.7,letterSpacing:"2px",textAlign:"center"}}>{tag}</div>

        <div style={{background:"#08120d",border:`1px solid ${DV.bezelLine}`,borderRadius:"9px",padding:"8px 10px",display:"flex",flexDirection:"column",gap:"2px",minHeight:"56px"}}>
          {rows.slice(0, visibleCount).map((row, i) => (
            <div key={i} style={{fontSize:"7.5px",color:DV.inkDim,opacity:0,transform:"translateY(2px)",animation:"authRowIn 0.2s ease forwards"}}>
              <span style={{color:"#ff5c5c",opacity:0.6}}>{"> "}</span>{row.t}: <b style={{color:row.warn?"#ff9b8a":DV.ink}}>{row.v}</b>
            </div>
          ))}
          {visibleCount >= rows.length && (
            <div style={{fontSize:"7.5px",color:DV.inkDim}}>
              AWAITING CONFIRMATION<span style={{display:"inline-block",width:"5px",height:"8px",background:"#ff5c5c",animation:"authCaretBlink 1s steps(1) infinite",verticalAlign:"-1px",marginLeft:"2px"}} />
            </div>
          )}
        </div>

        <div style={{display:"flex",gap:"8px",width:"100%"}}>
          <button onClick={onCancel} style={{flex:1,fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:"8.5px",letterSpacing:"0.5px",borderRadius:"9px",padding:"9px 0",cursor:"pointer",background:"transparent",border:`1px solid ${DV.bezelLine}`,color:DV.inkDim}}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{flex:1,fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:"8.5px",letterSpacing:"0.5px",borderRadius:"9px",padding:"9px 0",cursor:"pointer",background:"#ff5c5c",color:"#1a0a0a",border:"none"}}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

const OverwriteConfirmModal = ({modeLabel, onCancel, onConfirm}) => (
  <AuthorizationModal
    title="⚠️ SAVE OVERWRITE WARNING"
    tag="// ACTION CANNOT BE UNDONE //"
    rows={[
      {t:"TARGET_SLOT", v:modeLabel.toUpperCase()},
      {t:"ACTION", v:"ERASE SAVED PROGRESS", warn:true},
      {t:"REVERSIBLE", v:"NO", warn:true},
    ]}
    confirmLabel="CONFIRM OVERWRITE"
    onCancel={onCancel}
    onConfirm={onConfirm}
  />
);

export {OverwriteConfirmModal};
export default AuthorizationModal;
