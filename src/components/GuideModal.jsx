// ============================================================
// GUIDE MODAL — UI/interaction reference (double-tap, hot-swap,
// evolution chip highlighting, etc.) separate from the story-level
// "How to Play" tutorial.
// ============================================================
import {useState} from "react";
import {DV, DV_FONT_MONO, DV_FONT_DISPLAY} from "../constants/theme";

const GUIDE_CATEGORIES = {
  "⚔ SQUAD": [
    {icon:"👆", title:"Inspect a Digimon", body:"Double-tap your own Digimon (Party or Reserve) to open its info popup — name, attribute, level, and next evolution. Tap an enemy portrait once to inspect it the same way."},
    {icon:"🔄", title:"Hot-swap Positions", body:"Tap a Party slot, then tap a Reserve slot to swap them into each other's spot. Tap two Party slots to reorder your team."},
    {icon:"🧬", title:"Evolution Chips", body:"Tap an Evolution Chip in your Inventory to make every Digimon it can evolve glow. Tap the glowing Digimon to evolve it instantly, no wheel spin needed."},
    {icon:"🌐", title:"Release a Digimon", body:"Open a Digimon's info popup and tap Release to send it back to the Digital World and free up a Party or Reserve slot."},
    {icon:"💰", title:"Sell a Digimon", body:"While visiting the Digital Shop, open a Digimon's info popup and tap Sell (beside Release) to trade it for Digi Coin. Fainted Digimon can't be sold, and a battered Digimon fetches less — price scales down with its current HP. Shop Mode only."},
  ],
  "🩸 COMBAT": [
    {icon:"🛡️", title:"Party Setup Screen", body:"Every battle starts with a Party Setup screen — hot-swap, heal, and revive freely before tapping ENGAGE. None of it costs a turn since combat hasn't started yet."},
    {icon:"❤️", title:"Heal & Revive", body:"The button under each Digimon reads Heal while they're alive, and automatically switches to Revive the moment they faint."},
    {icon:"🌀", title:"Escape Portal", body:"During a Wild or Legendary battle (not Nemesis Raids), use an Escape Portal from Inventory to flee safely and keep your items for next time."},
    {icon:"💪🛡️", title:"Battle Chips", body:"Strength and Endurance chips are one-battle boosts — tap them from Inventory during combat to activate."},
  ],
  "⚙ SYSTEM": [
    {icon:"⌨️", title:"Keyboard Shortcuts", body:"Space bar spins the wheel. H heals your active fighter if you have a potion available."},
    {icon:"⛶", title:"Fullscreen", body:"Tap the ⛶ icon in the corner to enter fullscreen and reclaim your browser's address bar space on mobile."},
  ],
};

const GuideModal = ({onClose}) => {
  const keys = Object.keys(GUIDE_CATEGORIES);
  const [activeCat, setActiveCat] = useState(keys[0]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(4,8,6,0.85)",display:"flex",alignItems:"center",justifyContent:"center",padding:"12px",boxSizing:"border-box",fontFamily:DV_FONT_MONO}}>
      <div style={{width:"min(640px,92%)",height:"min(500px,82dvh)",background:"#050c08",border:`1px solid ${DV.phosphorDim}`,borderRadius:"12px",display:"flex",flexDirection:"column",padding:"11px 13px",gap:"8px",boxShadow:"0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(77,255,143,0.08)",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontFamily:DV_FONT_DISPLAY,fontSize:"10.5px",color:DV.phosphor,margin:0,letterSpacing:"0.5px",textShadow:"0 0 8px rgba(77,255,143,0.5)"}}>🧭 PLAYER GUIDE</h2>
          <button onClick={onClose} style={{background:"#08120d",border:`1px solid ${DV.bezelLine}`,color:DV.ink,borderRadius:"6px",padding:"4px 9px",fontFamily:DV_FONT_MONO,fontSize:"7.5px",fontWeight:"bold",cursor:"pointer"}}>✕ CLOSE</button>
        </div>
        <div style={{fontSize:"7px",color:DV.inkDim,flexShrink:0}}>How to work every button and gesture in the game.</div>
        <div style={{display:"flex",gap:"5px",flexShrink:0}}>
          {keys.map((k) => (
            <button key={k} onClick={() => setActiveCat(k)} style={{flex:1,background:activeCat===k?"#0a1712":"#08120d",border:`1px solid ${activeCat===k?DV.phosphor:DV.bezelLine}`,color:activeCat===k?DV.phosphor:DV.inkDim,borderRadius:"7px",padding:"6px 4px",fontFamily:DV_FONT_MONO,fontSize:"7px",fontWeight:"bold",letterSpacing:"0.5px",cursor:"pointer"}}>{k}</button>
          ))}
        </div>
        <div style={{flex:1,minHeight:0,overflowY:"auto",display:"flex",flexDirection:"column",gap:"6px"}}>
          {GUIDE_CATEGORIES[activeCat].map((tip, i) => (
            <div key={i} style={{background:"#08120d",border:`1px solid ${DV.bezelLine}`,borderRadius:"8px",padding:"7px 9px",display:"flex",gap:"8px",alignItems:"flex-start"}}>
              <span style={{fontSize:"15px",flexShrink:0,lineHeight:1.2}}>{tip.icon}</span>
              <div style={{minWidth:0}}>
                <div style={{fontSize:"7.5px",fontWeight:"bold",color:DV.phosphor,marginBottom:"3px"}}>{tip.title}</div>
                <div style={{fontSize:"7px",color:DV.ink,lineHeight:"1.5"}}>{tip.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GuideModal;
