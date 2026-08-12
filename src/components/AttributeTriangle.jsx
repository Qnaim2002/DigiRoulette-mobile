// ============================================================
// ATTRIBUTE TRIANGLE — Vaccine beats Virus beats Data beats Vaccine
// ============================================================
import React, {useState} from "react";

const AttributeTriangle = React.memo(({compact = false}) => {
  const [showTip, setShowTip] = useState(false);
  const iconSize = compact ? 38 : 88;
  return (
    <div
      style={{background:"#081410",border:"1px solid #333",borderRadius:"10px",padding:compact?"2px 3px":"4px 6px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative",cursor:"help"}}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <svg viewBox="0 0 100 100" width={iconSize} height={iconSize}>
        <defs>
          <marker id="attrArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0,0 6,3 0,6" fill="#5f8c72" />
          </marker>
        </defs>
        <line x1="50" y1="28" x2="72" y2="65" stroke="#5f8c72" strokeWidth="1.65" markerEnd="url(#attrArrow)" />
        <line x1="74" y1="80" x2="26" y2="80" stroke="#5f8c72" strokeWidth="1.65" markerEnd="url(#attrArrow)" />
        <line x1="28" y1="65" x2="46" y2="28" stroke="#5f8c72" strokeWidth="1.65" markerEnd="url(#attrArrow)" />
        <circle cx="50" cy="16" r="16" fill="#050c08" stroke="#4dff8f" strokeWidth="1" />
        <text x="50" y="23" textAnchor="middle" fontSize="24">💉</text>
        <circle cx="84" cy="84" r="16" fill="#050c08" stroke="#e74c3c" strokeWidth="1" />
        <text x="84" y="91" textAnchor="middle" fontSize="24">🦠</text>
        <circle cx="16" cy="84" r="16" fill="#050c08" stroke="#4dff8f" strokeWidth="1" />
        <text x="16" y="91" textAnchor="middle" fontSize="24">💾</text>
      </svg>
      {showTip && (
        <div style={{position:"absolute",top:"100%",right:"0",marginTop:"8px",zIndex:50,background:"#050c08",border:"1px solid #4dff8f",borderRadius:"8px",padding:"8px 10px",width:"150px",boxShadow:"0 4px 14px rgba(0,0,0,0.6)",textAlign:"left",cursor:"default"}}>
          <div style={{fontSize:"10px",color:"#bfe8cf",lineHeight:"1.7"}}>
            <div>💉 Vaccine ➜ 🦠 Virus</div>
            <div>🦠 Virus ➜ 💾 Data</div>
            <div>💾 Data ➜ 💉 Vaccine</div>
          </div>
          <hr style={{border:"none",borderTop:"1px solid #2c3a33",margin:"6px 0"}} />
          <div style={{fontSize:"10px",lineHeight:"1.6"}}>
            <div style={{color:"#4dff8f"}}>⚡ Attacking the type you beat: +10% dmg</div>
            <div style={{color:"#ff7b72"}}>🛡️ Attacking the type that beats you: −10% dmg</div>
          </div>
        </div>
      )}
    </div>
  );
});

export default AttributeTriangle;
