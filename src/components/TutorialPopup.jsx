// ============================================================
// TUTORIAL POPUP
// ============================================================
import {useState} from "react";
import {DV, DV_FONT_MONO, DV_FONT_DISPLAY} from "../constants/theme";
import {GENERIC_TUTORIAL_STEPS} from "../constants/tutorialSteps";

const TutorialPopup = ({onClose, steps = GENERIC_TUTORIAL_STEPS}) => {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const progressPct = ((step + 1) / steps.length) * 100;
  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(4,8,6,0.82)",display:"flex",alignItems:"center",justifyContent:"center",padding:"14px",boxSizing:"border-box",fontFamily:DV_FONT_MONO}}>
      <div style={{width:"min(640px,92%)",height:"min(300px,72dvh)",background:"#050c08",border:`1px solid ${DV.phosphorDim}`,borderRadius:"12px",display:"flex",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(77,255,143,0.08)"}}>
        <div style={{width:"34%",flexShrink:0,position:"relative",background:"#08120d",borderRight:`1px solid ${DV.bezelLine}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{position:"absolute",top:"6px",left:"6px",width:"8px",height:"8px",borderTop:`2px solid ${DV.phosphor}`,borderLeft:`2px solid ${DV.phosphor}`,opacity:0.8}} />
          <span style={{position:"absolute",bottom:"6px",left:"6px",width:"8px",height:"8px",borderBottom:`2px solid ${DV.phosphor}`,borderLeft:`2px solid ${DV.phosphor}`,opacity:0.8}} />
          <span style={{fontSize:"38px",filter:"drop-shadow(0 0 12px rgba(77,255,143,0.4))"}}>{current.icon}</span>
          <span style={{position:"absolute",bottom:"6px",left:0,right:0,textAlign:"center",fontSize:"6px",letterSpacing:"1.5px",color:DV.phosphorDim}}>TRANSMISSION {step+1} / {steps.length}</span>
        </div>
        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",padding:"12px 14px",gap:"7px"}}>
          <div style={{height:"3px",background:"#08120d",borderRadius:"2px",overflow:"hidden",flexShrink:0}}>
            <div style={{height:"100%",width:`${progressPct}%`,background:DV.phosphor,boxShadow:"0 0 8px rgba(77,255,143,0.5)",transition:"width 0.3s ease"}} />
          </div>
          <h2 style={{fontFamily:DV_FONT_DISPLAY,fontSize:"10.5px",color:DV.phosphor,margin:"1px 0",letterSpacing:"0.5px",textShadow:"0 0 8px rgba(77,255,143,0.5)",flexShrink:0}}>{current.title.toUpperCase()}</h2>
          <p style={{flex:1,margin:0,fontSize:"9.5px",color:DV.ink,lineHeight:"1.55",overflowY:"auto"}}>{current.body}</p>
          <div style={{display:"flex",gap:"6px",alignItems:"center",flexShrink:0}}>
            <button onClick={() => setStep(s => s-1)} style={{visibility:isFirst?"hidden":"visible",fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:"8.5px",letterSpacing:"0.5px",borderRadius:"6px",padding:"6px 11px",cursor:"pointer",background:"transparent",border:`1px solid ${DV.bezelLine}`,color:DV.inkDim}}>← BACK</button>
            <button onClick={() => isLast ? onClose() : setStep(s => s+1)} style={{flex:1,fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:"8.5px",letterSpacing:"0.5px",borderRadius:"6px",padding:"6px 10px",cursor:"pointer",background:DV.phosphor,color:"#0a1712",border:"none",textAlign:"center"}}>{isLast ? "🎮 START PLAYING!" : "NEXT →"}</button>
            {!isLast && <button onClick={onClose} style={{fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:"8.5px",letterSpacing:"0.5px",borderRadius:"6px",padding:"6px 11px",cursor:"pointer",background:"transparent",border:`1px solid ${DV.bezelLine}`,color:DV.inkDim}}>SKIP</button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialPopup;
