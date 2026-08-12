// ============================================================
// MENU MODE CARD — the Shop Mode / Full RNG Mode selector card, shared
// between MainMenuScreen for per-mode Continue / New Run / Dex / Board.
// ============================================================

import {DV, DV_FONT_MONO} from "../constants/theme";
import {getSaveSummary} from "../utils/menuHelpers";

const MenuModeCard = ({glyph, label, accent, accentDim, highscoreKey, saveKey, onContinue, onNewRun, onBestiary, onLeaderboard, compact = false, spacious = false}) => {
  const bestScore = parseInt(localStorage.getItem(highscoreKey) || "0");
  const save = getSaveSummary(saveKey);
  return (
    <div style={{background:"#0a1712",border:`1px solid ${accentDim}`,borderRadius:"14px",padding:compact?"8px 10px":spacious?"28px 30px":"11px 12px",display:"flex",flexDirection:"column",gap:compact?"5px":spacious?"18px":"7px",boxSizing:"border-box",fontFamily:DV_FONT_MONO}}>
      <div style={{display:"flex",alignItems:"center",gap:spacious?"18px":"8px"}}>
        <div style={{width:compact?"24px":spacious?"60px":"28px",height:compact?"24px":spacious?"60px":"28px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"10px",fontSize:compact?"12px":spacious?"30px":"14px",flexShrink:0,background:`${accent}1f`,color:accent}}>{glyph}</div>
        <span style={{fontSize:compact?"10.5px":spacious?"26px":"12px",letterSpacing:"1px",fontWeight:"bold",color:accent}}>{label}</span>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",background:"#050c08",border:`1px solid ${DV.bezelLine}`,borderRadius:"8px",padding:spacious?"16px 20px":"5px 9px"}}>
        <span style={{fontSize:spacious?"16px":"8px",letterSpacing:"1px",color:DV.inkDim}}>BEST SCORE</span>
        <span style={{fontSize:spacious?"26px":"12px",letterSpacing:"1px",color:accent}}>{String(bestScore).padStart(5,"0")}</span>
      </div>

      {save ? (
        <div style={{display:"flex",gap:spacious?"14px":"6px"}}>
          <button onClick={onContinue} style={{flex:1,background:accent,color:"#0a1712",border:"none",borderRadius:"9px",padding:compact?"6px 0":spacious?"20px 0":"8px 0",cursor:"pointer",fontFamily:DV_FONT_MONO,fontSize:compact?"8.5px":spacious?"18px":"9.5px",letterSpacing:"1px",fontWeight:"bold"}}>&gt; CONTINUE_</button>
          <button onClick={onNewRun} style={{flex:1,background:"transparent",border:`1px solid ${accentDim}`,color:accent,borderRadius:"9px",padding:compact?"6px 0":spacious?"20px 0":"8px 0",cursor:"pointer",fontFamily:DV_FONT_MONO,fontSize:compact?"8.5px":spacious?"18px":"9.5px",letterSpacing:"1px",fontWeight:"bold"}}>NEW RUN</button>
        </div>
      ) : (
        <button onClick={onNewRun} style={{width:"100%",background:accent,color:"#0a1712",border:"none",borderRadius:"9px",padding:compact?"6px 0":spacious?"20px 0":"8px 0",cursor:"pointer",fontFamily:DV_FONT_MONO,fontSize:compact?"8.5px":spacious?"18px":"9.5px",letterSpacing:"1px",fontWeight:"bold"}}>&gt; NEW RUN_</button>
      )}

      <div style={{display:"flex",gap:spacious?"14px":"6px"}}>
        <button onClick={onBestiary} style={{flex:1,background:"transparent",border:`2px solid ${DV.bezelLine}`,borderRadius:"9px",padding:compact?"5px 0":spacious?"17px 0":"6px 0",cursor:"pointer",color:DV.inkDim,fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:compact?"8.5px":spacious?"17px":"9px",letterSpacing:"1.5px"}}>DEX</button>
        <button onClick={onLeaderboard} style={{flex:1,background:"transparent",border:`2px solid ${DV.bezelLine}`,borderRadius:"9px",padding:compact?"5px 0":spacious?"17px 0":"6px 0",cursor:"pointer",color:DV.inkDim,fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:compact?"8.5px":spacious?"17px":"9px",letterSpacing:"1.5px"}}>BOARD</button>
      </div>
    </div>
  );
};

export default MenuModeCard;
