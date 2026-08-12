// ============================================================
// SETTINGS MODAL
// ============================================================
import {useState} from "react";
import {DV, DV_FONT_MONO, DV_FONT_DISPLAY} from "../constants/theme";

const SETTINGS_NAV = [
  {key: "audio", glyph: "🔊", label: "AUDIO"},
  {key: "evo", glyph: "🎬", label: "EVOLUTION"},
  {key: "gameplay", glyph: "🎮", label: "GAMEPLAY"},
  {key: "display", glyph: "🩹", label: "DISPLAY"},
  {key: "danger", glyph: "⚠️", label: "DANGER ZONE", danger: true},
];

const SettingsModal = ({onClose, musicVolume, onMusicVolumeChange, sfxVolume, onSfxVolumeChange, isMuted, onToggleMute, reducedMotion, onToggleReducedMotion, fastSpin, onToggleFastSpin, enemyAutoSpin, onToggleEnemyAutoSpin, reduceEvoAnim, onToggleReduceEvoAnim, longerEvoAnim, onToggleLongerEvoAnim, hapticsEnabled, onToggleHaptics, colorblindMode, onToggleColorblindMode, evoAnimSettings, onToggleEvoAnimSetting, onRestart, onHome}) => {
  const [activeSection, setActiveSection] = useState("audio");
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  const EVO_ANIM_TOGGLES = [
    {key: "evoChipBasic", label: "Evolution"},
    {key: "evoChipSuper", label: "Super Evolution"},
    {key: "evoChipMega", label: "Mega Evolution"},
    {key: "evoChipUltra", label: "Ultra Evolution"},
    {key: "evoChipOmega", label: "Omega Evolution"},
  ];

  const Switch = ({on, onClick}) => (
    <div onClick={(e) => {e.stopPropagation(); onClick(e);}} style={{width:"32px",height:"17px",borderRadius:"10px",background:on?"#0d2818":"#0a1712",border:`1px solid ${on?DV.phosphor:DV.bezelLine}`,position:"relative",flexShrink:0,cursor:"pointer",transition:"background 0.2s, border-color 0.2s"}}>
      <div style={{position:"absolute",top:"1px",left:on?"15px":"1px",width:"13px",height:"13px",borderRadius:"50%",background:on?DV.phosphor:DV.inkDim,boxShadow:on?"0 0 6px rgba(77,255,143,0.7)":"none",transition:"left 0.2s, background 0.2s"}} />
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(4,8,6,0.85)",display:"flex",alignItems:"center",justifyContent:"center",padding:"12px",boxSizing:"border-box",fontFamily:DV_FONT_MONO}}>
      <div style={{position:"relative",width:"min(720px,92%)",height:"min(540px,84dvh)",background:"#050c08",border:`1px solid ${DV.phosphorDim}`,borderRadius:"12px",display:"flex",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(77,255,143,0.08)"}}>
        <button onClick={onClose} style={{position:"absolute",top:"9px",right:"9px",zIndex:2,background:"#08120d",border:`1px solid ${DV.bezelLine}`,color:DV.ink,borderRadius:"6px",padding:"4px 9px",fontFamily:DV_FONT_MONO,fontSize:"7.5px",fontWeight:"bold",cursor:"pointer"}}>✕ CLOSE</button>

        <div style={{width:"34%",flexShrink:0,background:"#08120d",borderRight:`1px solid ${DV.bezelLine}`,display:"flex",flexDirection:"column",padding:"11px 9px",gap:"9px",boxSizing:"border-box"}}>
          <h2 style={{fontFamily:DV_FONT_DISPLAY,fontSize:"9.5px",color:DV.phosphor,margin:"2px 2px 0",letterSpacing:"0.5px",textShadow:"0 0 8px rgba(77,255,143,0.5)"}}>⚙️ SETTINGS</h2>
          <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
            {SETTINGS_NAV.map((n) => {
              const isActive = activeSection === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => setActiveSection(n.key)}
                  style={{
                    display:"flex",alignItems:"center",gap:"8px",
                    background:isActive?(n.danger?"#1a0a0a":"#0a1712"):"transparent",
                    border:`1px solid ${isActive?(n.danger?"#ff5c5c":DV.phosphor):"transparent"}`,
                    borderRadius:"8px",padding:"8px 9px",cursor:"pointer",
                    fontFamily:DV_FONT_MONO,fontSize:"8px",fontWeight:"bold",letterSpacing:"0.3px",
                    color:isActive?(n.danger?"#ff5c5c":DV.phosphor):DV.inkDim,
                    textAlign:"left",
                  }}
                >
                  <span style={{fontSize:"13px"}}>{n.glyph}</span>{n.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{flex:1,minWidth:0,padding:"13px 15px",display:"flex",flexDirection:"column",gap:"10px",overflowY:"auto",boxSizing:"border-box"}}>
          {activeSection === "audio" && (
            <>
              <div style={{fontSize:"8px",letterSpacing:"1.5px",color:DV.phosphor,fontWeight:"bold",flexShrink:0}}>🔊 AUDIO SETTINGS</div>

              <div style={{background:"#08120d",border:`1px solid ${DV.bezelLine}`,borderRadius:"8px",padding:"8px 10px",opacity:isMuted?0.45:1,transition:"opacity 0.2s"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                  <label style={{fontSize:"9px",color:DV.ink,fontWeight:"bold"}}>🎵 Music Volume</label>
                  <span style={{fontSize:"8px",color:DV.inkDim}}>{Math.round(musicVolume * 100)}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={Math.round(musicVolume * 100)}
                  onChange={(e) => onMusicVolumeChange(parseInt(e.target.value, 10) / 100)}
                  disabled={isMuted}
                  style={{width:"100%",accentColor:DV.phosphor,height:"14px"}}
                />
              </div>

              <div style={{background:"#08120d",border:`1px solid ${DV.bezelLine}`,borderRadius:"8px",padding:"8px 10px",opacity:isMuted?0.45:1,transition:"opacity 0.2s"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                  <label style={{fontSize:"9px",color:DV.ink,fontWeight:"bold"}}>💥 SFX Volume</label>
                  <span style={{fontSize:"8px",color:DV.inkDim}}>{Math.round(sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={Math.round(sfxVolume * 100)}
                  onChange={(e) => onSfxVolumeChange(parseInt(e.target.value, 10) / 100)}
                  disabled={isMuted}
                  style={{width:"100%",accentColor:DV.amber,height:"14px"}}
                />
              </div>

              <div onClick={onToggleMute} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",background:"#08120d",border:`1px solid ${isMuted?DV.phosphor:DV.bezelLine}`,borderRadius:"8px",padding:"8px 10px"}}>
                <span style={{fontSize:"8.5px",color:DV.ink,fontWeight:"bold"}}>🔇 Mute all audio</span>
                <Switch on={isMuted} onClick={onToggleMute} />
              </div>

              <div style={{fontSize:"6.3px",color:DV.inkDim,lineHeight:"1.5"}}>Mute overrides both sliders without changing your saved levels.</div>
            </>
          )}

          {activeSection === "evo" && (
            <>
              <div style={{fontSize:"8px",letterSpacing:"1.5px",color:DV.phosphor,fontWeight:"bold",flexShrink:0}}>🎬 EVOLUTION ANIMATION</div>

              <div onClick={onToggleReduceEvoAnim} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",background:"#08120d",border:`1px solid ${reduceEvoAnim?DV.phosphor:DV.bezelLine}`,borderRadius:"8px",padding:"8px 10px"}}>
                <span style={{fontSize:"8.5px",color:DV.ink,fontWeight:"bold"}}>🪶 Reduce Evolution Effects</span>
                <Switch on={reduceEvoAnim} onClick={onToggleReduceEvoAnim} />
              </div>
              <div style={{fontSize:"6.3px",color:DV.inkDim,lineHeight:"1.5"}}>Trims shard/ring/glyph counts and turns off the chromatic-aberration layer on the evolution overlay — lighter on weaker devices. Separate from Reduced Motion, which is about photosensitivity, not performance.</div>

              <div onClick={onToggleLongerEvoAnim} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",background:"#08120d",border:`1px solid ${longerEvoAnim?DV.phosphor:DV.bezelLine}`,borderRadius:"8px",padding:"8px 10px"}}>
                <span style={{fontSize:"8.5px",color:DV.ink,fontWeight:"bold"}}>⏳ Longer Evolution Animation</span>
                <Switch on={longerEvoAnim} onClick={onToggleLongerEvoAnim} />
              </div>
              <div style={{fontSize:"6.3px",color:DV.inkDim,lineHeight:"1.5"}}>Stretches the evolution sequence from ~2s to ~3s so there's more time to enjoy it.</div>

              <div style={{height:"1px",background:DV.bezelLine,margin:"2px 0"}} />

              <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                {EVO_ANIM_TOGGLES.map((t) => {
                  const isOn = evoAnimSettings ? evoAnimSettings[t.key] !== false : true;
                  return (
                    <div
                      key={t.key}
                      onClick={() => onToggleEvoAnimSetting(t.key)}
                      style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#08120d",border:`1px solid ${isOn?DV.phosphor:DV.bezelLine}`,borderRadius:"8px",padding:"8px 10px",cursor:"pointer"}}
                    >
                      <span style={{fontSize:"8.5px",color:DV.ink,fontWeight:"bold"}}>🧬 {t.label}</span>
                      <Switch on={isOn} onClick={() => onToggleEvoAnimSetting(t.key)} />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeSection === "gameplay" && (
            <>
              <div style={{fontSize:"8px",letterSpacing:"1.5px",color:DV.phosphor,fontWeight:"bold",flexShrink:0}}>🎮 GAMEPLAY</div>
              <div onClick={onToggleFastSpin} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",background:"#08120d",border:`1px solid ${fastSpin?DV.phosphor:DV.bezelLine}`,borderRadius:"8px",padding:"8px 10px"}}>
                <span style={{fontSize:"8.5px",color:DV.ink,fontWeight:"bold"}}>⚡ Fast Spins (2–3s)</span>
                <Switch on={fastSpin} onClick={onToggleFastSpin} />
              </div>
              <div style={{fontSize:"6.3px",color:DV.inkDim,lineHeight:"1.5"}}>Shortens every wheel spin from the default 2.5–6s down to a flat 2–3s. Great for speeding through Nemesis Raids.</div>

              <div onClick={onToggleEnemyAutoSpin} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",background:"#08120d",border:`1px solid ${enemyAutoSpin?DV.phosphor:DV.bezelLine}`,borderRadius:"8px",padding:"8px 10px"}}>
                <span style={{fontSize:"8.5px",color:DV.ink,fontWeight:"bold"}}>🤖 Enemies Spin Themselves</span>
                <Switch on={enemyAutoSpin} onClick={onToggleEnemyAutoSpin} />
              </div>
              <div style={{fontSize:"6.3px",color:DV.inkDim,lineHeight:"1.5"}}>The enemy's turn spins automatically instead of waiting for you to tap the wheel.</div>
            </>
          )}

          {activeSection === "display" && (
            <>
              <div style={{fontSize:"8px",letterSpacing:"1.5px",color:DV.phosphor,fontWeight:"bold",flexShrink:0}}>🩹 DISPLAY &amp; MOTION</div>
              <div onClick={onToggleReducedMotion} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",background:"#08120d",border:`1px solid ${reducedMotion?DV.phosphor:DV.bezelLine}`,borderRadius:"8px",padding:"8px 10px"}}>
                <span style={{fontSize:"8.5px",color:DV.ink,fontWeight:"bold"}}>Reduced motion (screen shake &amp; evolution flashing)</span>
                <Switch on={reducedMotion} onClick={onToggleReducedMotion} />
              </div>
              <div style={{fontSize:"6.3px",color:DV.inkDim,lineHeight:"1.5"}}>Also disables the double-flash, hue-invert glitch, and rapid lightning flicker in evolution animations for photosensitivity.</div>

              <div onClick={onToggleColorblindMode} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",background:"#08120d",border:`1px solid ${colorblindMode?DV.phosphor:DV.bezelLine}`,borderRadius:"8px",padding:"8px 10px"}}>
                <span style={{fontSize:"8.5px",color:DV.ink,fontWeight:"bold"}}>🎨 Colorblind-Friendly Mode</span>
                <Switch on={colorblindMode} onClick={onToggleColorblindMode} />
              </div>
              <div style={{fontSize:"6.3px",color:DV.inkDim,lineHeight:"1.5"}}>Swaps HP bar colors (party, enemies, Party Setup) from red/green to blue/orange — easier to read for red-green color blindness.</div>

              <div onClick={onToggleHaptics} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",background:"#08120d",border:`1px solid ${hapticsEnabled?DV.phosphor:DV.bezelLine}`,borderRadius:"8px",padding:"8px 10px"}}>
                <span style={{fontSize:"8.5px",color:DV.ink,fontWeight:"bold"}}>📳 Haptic Feedback (mobile)</span>
                <Switch on={hapticsEnabled} onClick={onToggleHaptics} />
              </div>
              <div style={{fontSize:"6.3px",color:DV.inkDim,lineHeight:"1.5"}}>Vibrates on critical hits, captures, and evolutions. Only has an effect on devices/browsers that support vibration.</div>
            </>
          )}

          {activeSection === "danger" && (
            <>
              <div style={{fontSize:"8px",letterSpacing:"1.5px",color:"#ff5c5c",fontWeight:"bold",flexShrink:0}}>⚠️ DANGER ZONE</div>
              {onHome && (
                <button
                  onClick={() => {onHome(); onClose();}}
                  style={{background:"transparent",border:`1px solid ${DV.bezelLine}`,color:DV.inkDim,borderRadius:"8px",padding:"9px 0",fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:"8.5px",cursor:"pointer"}}
                >
                  🏠 HOME
                </button>
              )}
              {onRestart && (
                <div style={{background:"#1a0a0a",border:"1px solid #a13a3a",borderRadius:"9px",padding:"10px",display:"flex",flexDirection:"column",gap:"7px"}}>
                  <p style={{margin:0,fontSize:"7.5px",color:"#ff9b8a",lineHeight:"1.5"}}>⚠️ Restarting erases your current run. This cannot be undone.</p>
                  {confirmingRestart ? (
                    <div style={{display:"flex",gap:"6px"}}>
                      <button onClick={() => setConfirmingRestart(false)} style={{flex:1,fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:"8px",borderRadius:"7px",padding:"7px 0",cursor:"pointer",background:"transparent",border:`1px solid ${DV.bezelLine}`,color:DV.inkDim}}>CANCEL</button>
                      <button onClick={() => {onRestart(); onClose();}} style={{flex:1,fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:"8px",borderRadius:"7px",padding:"7px 0",cursor:"pointer",background:"#ff5c5c",color:"#1a0a0a",border:"none"}}>CONFIRM</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmingRestart(true)} style={{fontFamily:DV_FONT_MONO,fontWeight:"bold",fontSize:"8.5px",borderRadius:"8px",padding:"8px 0",cursor:"pointer",background:"#ff5c5c",color:"#1a0a0a",border:"none"}}>🔄 RESTART RUN</button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
