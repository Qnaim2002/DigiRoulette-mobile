// ============================================================
// RESERVE FULL MODAL — shown when a capture/hatch can't fit
// ============================================================
import React from "react";
import {DV, DV_FONT_MONO, DV_FONT_DISPLAY} from "../constants/theme";

const ReserveFullModal = ({pendingCapture, reserve, onResolve}) => {
  if (!pendingCapture) return null;
  const {reward} = pendingCapture;
  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(4,8,6,0.85)",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",boxSizing:"border-box",fontFamily:DV_FONT_MONO}}>
      <div style={{position:"relative",width:"min(480px,88%)",background:"#050c08",border:`1px solid ${DV.amberDim}`,borderRadius:"14px",padding:"16px 18px",maxHeight:"90dvh",overflowY:"auto",display:"flex",flexDirection:"column",alignItems:"center",gap:"10px",boxSizing:"border-box",boxShadow:"0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(255,178,56,0.08)"}}>
        <span style={{position:"absolute",top:"7px",left:"7px",width:"9px",height:"9px",borderTop:`2px solid ${DV.amber}`,borderLeft:`2px solid ${DV.amber}`,opacity:0.8}} />
        <span style={{position:"absolute",top:"7px",right:"7px",width:"9px",height:"9px",borderTop:`2px solid ${DV.amber}`,borderRight:`2px solid ${DV.amber}`,opacity:0.8}} />
        <span style={{position:"absolute",bottom:"7px",left:"7px",width:"9px",height:"9px",borderBottom:`2px solid ${DV.amber}`,borderLeft:`2px solid ${DV.amber}`,opacity:0.8}} />
        <span style={{position:"absolute",bottom:"7px",right:"7px",width:"9px",height:"9px",borderBottom:`2px solid ${DV.amber}`,borderRight:`2px solid ${DV.amber}`,opacity:0.8}} />

        <span style={{fontSize:"26px"}}>📦</span>
        <h2 style={{fontFamily:DV_FONT_DISPLAY,fontSize:"11px",color:DV.amber,margin:0,letterSpacing:"0.5px",textAlign:"center",textShadow:"0 0 10px rgba(255,178,56,0.5)"}}>RESERVE BOX IS FULL!</h2>

        <div style={{width:"100%",background:"#08120d",border:`1px solid ${DV.bezelLine}`,borderRadius:"9px",padding:"8px 10px",display:"flex",gap:"9px",alignItems:"center",boxSizing:"border-box"}}>
          <div style={{width:"38px",height:"38px",flexShrink:0,borderRadius:"7px",background:"radial-gradient(circle at 50% 35%,#12241a,#081410 75%)",border:`1px solid ${DV.amberDim}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
            <img src={reward.image} alt={reward.name} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}} />
          </div>
          <p style={{margin:0,fontSize:"7.5px",color:DV.inkDim,lineHeight:"1.5",textAlign:"left"}}>
            <b style={{color:DV.phosphor}}>{reward.name}</b> wants to join, but your Reserve Box is full. Release a current member to make room, or let it go.
          </p>
        </div>

        <div style={{width:"100%",fontSize:"7px",color:DV.inkDim,letterSpacing:"1px",textAlign:"left"}}>SELECT MEMBER TO RELEASE &amp; SWAP</div>

        <div style={{width:"100%",display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"7px"}}>
          {reserve.map((d, idx) => (
            <button key={idx} onClick={() => onResolve(idx)} style={{background:"#08120d",border:`1px solid ${DV.bezelLine}`,borderRadius:"8px",padding:"6px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",fontFamily:DV_FONT_MONO}}>
              <div style={{width:"32px",height:"32px",background:"#0d1712",borderRadius:"6px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <img src={d.image} alt={d.name} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}} />
              </div>
              <span style={{fontSize:"6.5px",color:DV.ink,fontWeight:"bold",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{d.name}</span>
              <span style={{fontSize:"6px",color:"#ff5c5c",fontWeight:"bold"}}>RELEASE &amp; SWAP</span>
            </button>
          ))}
        </div>

        <button onClick={() => onResolve(null)} style={{width:"100%",fontSize:"8px",fontWeight:"bold",padding:"9px 0",borderRadius:"9px",cursor:"pointer",background:"#2d1a1a",border:"1px solid #ff5c5c",color:"#ff5c5c",fontFamily:DV_FONT_MONO}}>
          🌐 LET {reward.name.toUpperCase()} GO INSTEAD
        </button>
      </div>
    </div>
  );
};

export default ReserveFullModal;
