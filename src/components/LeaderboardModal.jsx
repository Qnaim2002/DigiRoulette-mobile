// ============================================================
// LEADERBOARD MODAL
// ============================================================

import {DV, DV_FONT_MONO, DV_FONT_DISPLAY} from "../constants/theme";
import {SCORE_EVENTS} from "../DigimonRoulette";

const SCORE_EXPLAINERS = [
  {icon: "⚔️", label: "Defeat a Wild Digimon", pts: SCORE_EVENTS.WILD_DEFEATED},
  {icon: "🕸️", label: "Capture a Wild Digimon", pts: SCORE_EVENTS.WILD_CAPTURED},
  {icon: "👑", label: "Capture a Legendary", pts: SCORE_EVENTS.LEGENDARY_CAPTURED},
  {icon: "🚨", label: "Clear a Nemesis wave", pts: SCORE_EVENTS.VILLAIN_WAVE},
  {icon: "🎯", label: "Clear a wave without using items", pts: SCORE_EVENTS.WAVE_NO_ITEMS},
  {icon: "💀", label: "Defeat the Wave 8 boss", pts: SCORE_EVENTS.CHRONOMON_DEFEATED},
];

const LeaderboardModal = ({onClose, getLeaderboard}) => {
  const entries = getLeaderboard();
  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(4,8,6,0.85)",display:"flex",alignItems:"center",justifyContent:"center",padding:"12px",boxSizing:"border-box",fontFamily:DV_FONT_MONO}}>
      <div style={{width:"min(780px,94%)",height:"min(460px,80dvh)",background:"#050c08",border:`1px solid ${DV.amberDim}`,borderRadius:"12px",display:"flex",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(255,178,56,0.08)"}}>
        <div style={{flex:1.3,minWidth:0,display:"flex",flexDirection:"column",padding:"11px 12px",gap:"8px",borderRight:`1px solid ${DV.bezelLine}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <h2 style={{fontFamily:DV_FONT_DISPLAY,fontSize:"10.5px",color:DV.amber,margin:0,letterSpacing:"0.5px",textShadow:"0 0 8px rgba(255,178,56,0.5)"}}>🏆 LEADERBOARD</h2>
            <button onClick={onClose} style={{background:"#08120d",border:`1px solid ${DV.bezelLine}`,color:DV.ink,borderRadius:"6px",padding:"4px 9px",fontFamily:DV_FONT_MONO,fontSize:"7.5px",fontWeight:"bold",cursor:"pointer"}}>✕ CLOSE</button>
          </div>

          {entries.length === 0 ? (
            <p style={{margin:"8px 0",color:DV.inkDim,fontSize:"9px",textAlign:"center",fontStyle:"italic"}}>No runs recorded yet. Finish a run to claim the top spot!</p>
          ) : (
            <div style={{flex:1,minHeight:0,overflowY:"auto",display:"flex",flexDirection:"column",gap:"6px"}}>
              {entries.map((e, i) => {
                const medal = ["🥇","🥈","🥉"][i];
                const dateStr = e.date ? new Date(e.date).toLocaleDateString() : "";
                return (
                  <div key={i} style={{background:"#08120d",border:`1px solid ${i<3?DV.amberDim:DV.bezelLine}`,borderRadius:"8px",padding:"7px 9px",display:"flex",alignItems:"center",gap:"9px"}}>
                    {medal ? <span style={{fontSize:"14px",minWidth:"20px",textAlign:"center",flexShrink:0}}>{medal}</span> : <span style={{fontSize:"9px",color:DV.inkDim,minWidth:"20px",textAlign:"center",flexShrink:0}}>#{i+1}</span>}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:"9.5px",fontWeight:"bold",color:"#fff"}}>{e.score.toLocaleString()} pts</div>
                      <div style={{fontSize:"6.5px",color:DV.inkDim,marginTop:"2px"}}>{e.rankLabel} · {e.victory ? <span style={{color:DV.amber}}>👑 Victory</span> : <span style={{color:"#ff9b8a"}}>💀 Wave {e.wave}</span>} · {dateStr}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{width:"38%",flexShrink:0,background:"#08120d",padding:"11px 12px",display:"flex",flexDirection:"column",gap:"7px"}}>
          <div style={{fontSize:"7.5px",letterSpacing:"1.5px",color:DV.phosphor,fontWeight:"bold",flexShrink:0}}>📊 HOW SCORING WORKS</div>
          <div style={{flex:1,minHeight:0,overflowY:"auto",display:"flex",flexDirection:"column",gap:"4px"}}>
            {SCORE_EXPLAINERS.map((s, i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:"7px",color:DV.ink,background:"#050c08",border:`1px solid ${DV.bezelLine}`,borderRadius:"6px",padding:"5px 7px",gap:"6px"}}>
                <span style={{flex:1}}>{s.icon} {s.label}</span>
                <b style={{color:DV.amber,flexShrink:0}}>+{s.pts}</b>
              </div>
            ))}
          </div>
          <div style={{fontSize:"6.3px",color:DV.inkDim,lineHeight:"1.5",flexShrink:0}}>
            🏆 Clearing all 8 waves multiplies your score by your team's remaining HP (~1×–2×).
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardModal;
