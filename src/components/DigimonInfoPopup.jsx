// ============================================================
// DIGIMON INFO POPUP — shared centered modal used by both PartySlot
// (party/reserve members) and the enemy squad row, so enemy digimon
// get the same tap-to-inspect popup as the player's own team.
// ============================================================
import React from "react";
import {DV, DV_FONT_MONO} from "../constants/theme";

const DigimonInfoPopup = React.memo(({digimon, onClose, compact = false, showEvoHint = false, onRelease, onSell, sellPrice = 0}) => {
  if (!digimon) return null;
  const rows = [
    {t:"ATTRIBUTE", v:digimon.attribute || "Unknown"},
    {t:"LEVEL", v:digimon.level || "Unknown"},
    {t:"NEXT_EVO", v:digimon.nextFormName || "Peak Form", next:true},
  ];
  return (
    <>
      <style>{`
        @keyframes diRowIn{to{opacity:1;transform:translateY(0);}}
        .di-row{opacity:0;transform:translateY(2px);animation:diRowIn 0.2s ease forwards;}
      `}</style>
      {/* ✅ Full-screen backdrop — tapping anywhere outside the popup closes it */}
      <div
        onClick={(e) => {e.stopPropagation(); if (onClose) onClose();}}
        style={{position:"fixed",inset:0,zIndex:9998,background:"rgba(4,8,6,0.6)"}}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%, -50%)",zIndex:9999,background:"#050c08",border:`1px solid ${DV.phosphorDim}`,borderRadius:"12px",padding:compact?"11px 13px":"14px 16px",width:compact?"170px":"min(280px,90vw)",boxShadow:"0 20px 50px rgba(0,0,0,0.7), 0 0 30px rgba(77,255,143,0.08)",textAlign:"left",fontFamily:DV_FONT_MONO}}
      >
        <span style={{position:"absolute",top:"6px",left:"6px",width:"8px",height:"8px",borderTop:`2px solid ${DV.phosphor}`,borderLeft:`2px solid ${DV.phosphor}`,opacity:0.8}} />
        <span style={{position:"absolute",top:"6px",right:"6px",width:"8px",height:"8px",borderTop:`2px solid ${DV.phosphor}`,borderRight:`2px solid ${DV.phosphor}`,opacity:0.8}} />
        <span style={{position:"absolute",bottom:"6px",left:"6px",width:"8px",height:"8px",borderBottom:`2px solid ${DV.phosphor}`,borderLeft:`2px solid ${DV.phosphor}`,opacity:0.8}} />
        <span style={{position:"absolute",bottom:"6px",right:"6px",width:"8px",height:"8px",borderBottom:`2px solid ${DV.phosphor}`,borderRight:`2px solid ${DV.phosphor}`,opacity:0.8}} />

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:compact?"6px":"8px"}}>
          <span style={{fontSize:compact?"10px":"11.5px",fontWeight:"bold",color:DV.phosphor,letterSpacing:"0.5px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{digimon.name.toUpperCase()}{digimon.hp<=0?" 💀":""}</span>
          <button onClick={(e) => {e.stopPropagation(); if (onClose) onClose();}} style={{background:"none",border:"none",color:DV.inkDim,cursor:"pointer",fontSize:compact?"12px":"13px",padding:0,lineHeight:1,flexShrink:0,marginLeft:"4px"}}>✕</button>
        </div>

        <div style={{width:compact?"48px":"56px",height:compact?"48px":"56px",margin:"0 auto 8px",borderRadius:"8px",background:"radial-gradient(circle at 50% 35%,#12241a,#081410 75%)",border:`1px solid ${DV.phosphorDim}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
          {digimon.image ? <img src={digimon.image} alt={digimon.name} style={{maxWidth:"85%",maxHeight:"85%",objectFit:"contain",filter:digimon.hp<=0?"grayscale(100%)":"none"}} /> : <span style={{fontSize:"24px"}}>❓</span>}
        </div>

        <div style={{background:"#08120d",border:`1px solid ${DV.bezelLine}`,borderRadius:"8px",padding:"7px 9px",display:"flex",flexDirection:"column",gap:"3px"}}>
          {rows.map((row, i) => (
            <div key={row.t} className="di-row" style={{fontSize:compact?"7.5px":"8.5px",color:DV.inkDim,animationDelay:`${i*0.12}s`}}>
              <span style={{color:DV.phosphorDim}}>{"> "}</span>{row.t}: <b style={{color:row.next?DV.amber:DV.ink}}>{row.v}</b>
            </div>
          ))}
        </div>

        {showEvoHint && (
          <p style={{margin:"8px 0 0 0",fontSize:compact?"6.5px":"7px",color:DV.violet,lineHeight:"1.4"}}>🧬 Tap this Digimon while its chip is highlighted in Inventory to evolve.</p>
        )}
        {(onSell || onRelease) && (
          <div style={{display:"flex",gap:"6px",marginTop:compact?"7px":"8px"}}>
            {onSell && (
              <button
                onClick={(e) => {e.stopPropagation(); onSell(); if (onClose) onClose();}}
                style={{flex:1,fontSize:compact?"8px":"9px",fontWeight:"bold",padding:compact?"6px 0":"7px 0",borderRadius:"7px",border:"1px solid #ffb238",cursor:"pointer",background:"#2d2410",color:"#ffb238",fontFamily:DV_FONT_MONO}}
              >
                💰 SELL (+{sellPrice})
              </button>
            )}
            {onRelease && (
              <button
                onClick={(e) => {e.stopPropagation(); onRelease(); if (onClose) onClose();}}
                style={{flex:1,fontSize:compact?"8px":"9px",fontWeight:"bold",padding:compact?"6px 0":"7px 0",borderRadius:"7px",border:"1px solid #ff5c5c",cursor:"pointer",background:"#2d1a1a",color:"#ff5c5c",fontFamily:DV_FONT_MONO}}
              >
                🌐 RELEASE
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
});

export default DigimonInfoPopup;
