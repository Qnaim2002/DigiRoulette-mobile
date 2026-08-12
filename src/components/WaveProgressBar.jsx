// ============================================================
// WAVE PROGRESS BAR
// ============================================================
import React from "react";

const WaveProgressBar = React.memo(({villainWaveStage, compact = false}) => (
  <div style={{background:"#050c08",border:"1px solid #2c3a33",borderRadius:"8px",padding:compact?"3px 6px":"6px 10px",display:"flex",flexDirection:"column",gap:compact?"2px":"4px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:compact?"8px":"10px",color:"#5f8c72",fontWeight:"bold"}}>🚨 NEMESIS RAID PROGRESS</span>
      <span style={{fontSize:compact?"8px":"10px",fontWeight:"bold",color:villainWaveStage>=8?"#4dff8f":villainWaveStage>=6?"#e74c3c":"#ffb238"}}>
        {villainWaveStage>=8?"✅ CLEARED":`Wave ${villainWaveStage}/8`}
      </span>
    </div>
    <div style={{display:"flex",gap:"3px"}}>
      {Array.from({length:8},(_,i) => (
        <div key={i} style={{flex:1,height:compact?"5px":"8px",borderRadius:"3px",background:i<villainWaveStage?(i===7?"#e74c3c":"#4dff8f"):(i===7?"#3d1a1a":"#0a1712"),border:i===7?"1px solid #e74c3c":"1px solid #2c3a33",transition:"background 0.3s"}} />
      ))}
    </div>
    {!compact && (
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <span style={{fontSize:"9px",color:"#5f8c72"}}>Start</span>
        <span style={{fontSize:"9px",color:"#e74c3c"}}>💀 Boss</span>
      </div>
    )}
  </div>
));

export default WaveProgressBar;
