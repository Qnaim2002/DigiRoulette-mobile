// ============================================================
// MAIN MENU — per-mode Continue / New Run / Dex / Board
// ============================================================

import {DV, DV_FONT_MONO, DV_FONT_DISPLAY} from "../constants/theme";
import {useViewportInfo} from "../hooks/useViewportInfo";
import MenuModeCard from "./MenuModeCard";
import {SAVE_KEY as SHOP_SAVE_KEY, HIGHSCORE_KEY as SHOP_HIGHSCORE_KEY} from "../DigimonRoulette";
import {SAVE_KEY as RNG_SAVE_KEY, HIGHSCORE_KEY as RNG_HIGHSCORE_KEY} from "../DigimonRouletteRNG";

const MainMenuScreen = ({onContinue, onNewRun, onBestiary, onLeaderboard, onTutorial, onSettings}) => {
  // ✅ FIX: the outer wrapper centered its content with alignItems:"center" and
  // no overflow handling. On a short landscape phone the menu box is taller than
  // the viewport, so centering pushed the top off-screen and it got clipped by a
  // parent's overflow:hidden instead of being visible or scrollable. Now it
  // scrolls when it doesn't fit, and shrinks proportionally on short screens.
  const {isCompactLandscape, isSpacious} = useViewportInfo();
  return (
    <div style={{display:"flex",alignItems:"stretch",justifyContent:"center",height:"100dvh",background:DV.void,padding:isCompactLandscape?"6px":"10px",boxSizing:"border-box",overflowY:"auto",fontFamily:DV_FONT_MONO}}>
      <style>{`
        @keyframes dvBlink{0%,49%{opacity:1;}50%,100%{opacity:0.15;}}
        .dv-dot{animation:dvBlink 1.6s steps(1) infinite;}
        .dv-screen::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(to bottom,rgba(77,255,143,0.05) 0px,rgba(77,255,143,0.05) 1px,transparent 2px,transparent 4px);pointer-events:none;mix-blend-mode:screen;}
        .dv-screen::after{content:"";position:absolute;inset:0;box-shadow:inset 0 0 90px rgba(0,0,0,0.65);pointer-events:none;}
      `}</style>
      <div style={{width:"100%",maxWidth:isSpacious?"1340px":"820px",height:"100%",display:"flex",flexDirection:"column",background:`linear-gradient(180deg,#1b2620,${DV.bezel} 40%)`,border:`1px solid ${DV.bezelLine}`,borderRadius:"20px",padding:isCompactLandscape?"7px":isSpacious?"22px":"10px",boxShadow:"0 30px 60px rgba(0,0,0,0.55)",boxSizing:"border-box"}}>

        <div style={{display:"flex",justifyContent:"flex-start",alignItems:"center",padding:"2px 8px 4px",flexShrink:0}}>
          <div style={{display:"flex",gap:"5px"}}>
            {[0,1,2].map((i) => <span key={i} style={{width:"5px",height:"5px",borderRadius:"50%",background:DV.bezelLine,display:"inline-block"}} />)}
          </div>
        </div>

        <div className="dv-screen" style={{position:"relative",flex:1,display:"flex",flexDirection:"column",background:`radial-gradient(120% 140% at 50% -10%,#0d1f16,${DV.screen} 60%)`,border:`1px solid ${DV.bezelLine}`,borderRadius:"14px",padding:0,overflow:"hidden"}}>

          <div style={{position:"relative",zIndex:1,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:isSpacious?"13px":"9px",letterSpacing:"1.5px",color:DV.inkDim,marginBottom:isCompactLandscape?"8px":isSpacious?"18px":"12px",padding:isCompactLandscape?"10px 12px 0":isSpacious?"22px 26px 0":"14px 16px 0"}}>
            <span style={{display:"flex",alignItems:"center",gap:"6px",color:DV.phosphor}}>
              <span className="dv-dot" style={{width:"6px",height:"6px",borderRadius:"50%",background:DV.phosphor,display:"inline-block"}} />
              DIGITAL FIELD LINK: ONLINE
            </span>
            <span>SYS.04 · SAVE OK · DIGIVICE — MODEL RX</span>
          </div>

          <div style={{position:"relative",zIndex:1,fontFamily:DV_FONT_DISPLAY,fontSize:isCompactLandscape?"clamp(14px,3.4vw,18px)":isSpacious?"clamp(30px,4.2vw,46px)":"clamp(18px,4vw,28px)",letterSpacing:"1px",color:DV.phosphor,textShadow:"0 0 14px rgba(77,255,143,0.55)",textAlign:"center",marginBottom:isCompactLandscape?"10px":isSpacious?"22px":"14px",padding:isCompactLandscape?"0 12px":isSpacious?"0 26px":"0 16px"}}>
            DIGI<span style={{color:DV.ink}}>ROULETTE</span>
          </div>

          <div style={{position:"relative",zIndex:1,display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:isCompactLandscape?"7px":isSpacious?"30px":"10px",marginTop:"auto",marginBottom:"auto",padding:isCompactLandscape?"0 12px":isSpacious?"0 34px":"0 16px"}}>
            <MenuModeCard
              glyph="◈" label="SHOP MODE" accent={DV.amber} accentDim={DV.amberDim}
              highscoreKey={SHOP_HIGHSCORE_KEY} saveKey={SHOP_SAVE_KEY}
              onContinue={() => onContinue("shop")}
              onNewRun={() => onNewRun("shop")}
              onBestiary={() => onBestiary("shop")}
              onLeaderboard={() => onLeaderboard("shop")}
              compact={isCompactLandscape}
              spacious={isSpacious}
            />
            <MenuModeCard
              glyph="◆" label="FULL RNG MODE" accent={DV.violet} accentDim={DV.violetDim}
              highscoreKey={RNG_HIGHSCORE_KEY} saveKey={RNG_SAVE_KEY}
              onContinue={() => onContinue("rng")}
              onNewRun={() => onNewRun("rng")}
              onBestiary={() => onBestiary("rng")}
              onLeaderboard={() => onLeaderboard("rng")}
              compact={isCompactLandscape}
              spacious={isSpacious}
            />
          </div>

          <div style={{position:"relative",zIndex:1,display:"flex",gap:isSpacious?"14px":"8px",flexWrap:"wrap",padding:isCompactLandscape?"0 12px 4px":isSpacious?"0 34px 20px":"0 16px 6px"}}>
            <button onClick={onTutorial} style={{flex:"1 1 160px",background:"transparent",border:`1px solid ${DV.bezelLine}`,borderRadius:"10px",padding:isSpacious?"22px 24px":"8px 12px",fontFamily:DV_FONT_MONO,fontSize:isSpacious?"17px":"9.5px",letterSpacing:"0.5px",color:DV.phosphor,cursor:"pointer",textAlign:"left"}}>
              &gt; HOW_TO_PLAY<span className="dv-dot" style={{display:"inline-block",width:"7px",height:"11px",background:DV.phosphor,marginLeft:"2px",verticalAlign:"-1px"}} />
            </button>
            <button onClick={onSettings} style={{flex:"1 1 160px",background:"transparent",border:`1px solid ${DV.bezelLine}`,borderRadius:"10px",padding:isSpacious?"22px 24px":"8px 12px",fontFamily:DV_FONT_MONO,fontSize:isSpacious?"17px":"9.5px",letterSpacing:"0.5px",color:DV.phosphor,cursor:"pointer",textAlign:"left"}}>
              &gt; SETTINGS<span className="dv-dot" style={{display:"inline-block",width:"7px",height:"11px",background:DV.phosphor,marginLeft:"2px",verticalAlign:"-1px"}} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainMenuScreen;
