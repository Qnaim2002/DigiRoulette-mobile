// ============================================================
// BESTIARY MODAL — tier categorized, capture/hatch only
// ============================================================
import React, {useState, useRef, useCallback} from "react";
import {DV, DV_FONT_MONO, DV_FONT_DISPLAY} from "../constants/theme";

const TIER_CONFIG = [
  {key: "Baby",     label: "🥚 Baby",     color: "#9b59b6", match: (l) => l.toLowerCase().startsWith("baby")},
  {key: "Child",    label: "⚡ Child",    color: "#3498db", match: (l) => l.toLowerCase() === "child"},
  {key: "Adult",    label: "🔥 Adult",    color: "#e67e22", match: (l) => l.toLowerCase() === "adult"},
  {key: "Perfect",  label: "💎 Perfect",  color: "#2ecc71", match: (l) => l.toLowerCase() === "perfect"},
  {key: "Ultimate", label: "👑 Ultimate", color: "#e74c3c", match: (l) => l.toLowerCase() === "ultimate"},
  {key: "Mega",     label: "💀 Mega",     color: "#f1c40f", match: (l) => l.toLowerCase() === "ultra" || l.toLowerCase() === "mega"},
  {key: "Omega",    label: "🌟 Ultra+",   color: "#ffffff", match: (l) => ["ultra+","ultraplus","omega"].includes(l.toLowerCase())},
  {key: "Other",    label: "❓ Other",    color: "#8b949e", match: () => true},
];

function getTier(level) {
  return TIER_CONFIG.find((t) => t.match(level || "")) || TIER_CONFIG[TIER_CONFIG.length - 1];
}

const BestiaryModal = ({fullRoster, onClose, bestiaryKey}) => {
  const [activeTab, setActiveTab] = useState("Baby");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [sortBy, setSortBy] = useState("default"); // "default" | "name" | "hp" | "power"
  // ✅ "Missing" filter: independent of sort (which only reorders) — this narrows the grid
  // down to undiscovered entries only, for hunting down the last few % toward completion.
  const [missingOnly, setMissingOnly] = useState(false);
  const discovered = (() => {try {return JSON.parse(localStorage.getItem(bestiaryKey) || "[]");} catch {return [];}})();
  const discoveredSet = new Set(discovered);
  const total = fullRoster.length;
  const found = discovered.length;

  // Group roster by tier
  const grouped = {};
  TIER_CONFIG.forEach((t) => {grouped[t.key] = [];});
  fullRoster.forEach((d) => {
    const tier = getTier(d.level);
    grouped[tier.key].push(d);
  });

  const visibleTiers = TIER_CONFIG.filter((t) => grouped[t.key].length > 0);
  const currentList = grouped[activeTab] || [];
  const displayedList = currentList.filter((d) => {
    if (searchQuery.trim() && !d.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
    if (missingOnly && discoveredSet.has(d.name)) return false;
    return true;
  });
  // ✅ Sort tabs: A–Z by name, or highest-first by HP/Power. "Default" keeps the sheet's
  // original order. Sorting reads the real underlying stat even for undiscovered entries —
  // it only changes ORDER, never reveals the "❓" stat display for anything not yet captured.
  const sortedList = React.useMemo(() => {
    const list = [...displayedList];
    if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "hp") list.sort((a, b) => b.hp - a.hp);
    else if (sortBy === "power") list.sort((a, b) => b.power - a.power);
    return list;
  }, [displayedList, sortBy]);
  const selectedDigi = selected || sortedList[0] || currentList[0] || null;
  const selectedFound = selectedDigi ? discoveredSet.has(selectedDigi.name) : false;

  // ✅ MOBILE PERF (useCallback audit): tier tabs, sort buttons, and grid tiles were each
  // mapped with a fresh inline arrow per item per render — same PartySlot/InventoryPanel
  // pattern applied here: one stable handler per interaction, reading which item was
  // clicked off a `data-*` attribute. sortedListRef keeps the grid-tile handler's identity
  // stable across renders even though the underlying list itself changes every render.
  const sortedListRef = useRef(sortedList);
  sortedListRef.current = sortedList;
  const handleTierTabClick = useCallback((e) => {
    setActiveTab(e.currentTarget.dataset.tierKey);
    setSelected(null);
  }, []);
  const handleSortClick = useCallback((e) => setSortBy(e.currentTarget.dataset.sortKey), []);
  const handleToggleMissingOnly = useCallback(() => setMissingOnly((prev) => !prev), []);
  const handleSelectDigi = useCallback((e) => {
    const name = e.currentTarget.dataset.name;
    const found = sortedListRef.current.find((d) => d.name === name);
    if (found) setSelected(found);
  }, []);

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(4,8,6,0.86)",display:"flex",alignItems:"center",justifyContent:"center",padding:"12px",boxSizing:"border-box",fontFamily:DV_FONT_MONO}}>
      <div style={{width:"min(900px,94%)",height:"min(580px,86dvh)",background:"#050c08",border:`1px solid ${DV.phosphorDim}`,borderRadius:"12px",display:"flex",flexDirection:"column",padding:"10px 12px",boxShadow:"0 20px 50px rgba(0,0,0,0.6)",boxSizing:"border-box"}}>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",flexShrink:0,marginBottom:"8px"}}>
          <span style={{display:"flex",alignItems:"baseline",gap:"8px"}}>
            <h2 style={{fontFamily:DV_FONT_DISPLAY,fontSize:"12px",color:DV.phosphor,margin:0,letterSpacing:"1px",textShadow:"0 0 10px rgba(77,255,143,0.5)"}}>📖 BESTIARY</h2>
            <span style={{fontSize:"8px",color:DV.inkDim}}>{Math.round((found / Math.max(total,1)) * 100)}% complete</span>
          </span>
          <button onClick={onClose} style={{background:"#08120d",border:`1px solid ${DV.bezelLine}`,color:DV.ink,borderRadius:"6px",padding:"4px 9px",fontFamily:DV_FONT_MONO,fontSize:"8px",fontWeight:"bold",cursor:"pointer"}}>✕ CLOSE</button>
        </div>

        <div style={{flex:1,minHeight:0,display:"flex",gap:"9px"}}>
          {/* SIDEBAR */}
          <div style={{width:"26%",display:"flex",flexDirection:"column",gap:"6px"}}>
            <div style={{background:"#08120d",border:`1px solid ${DV.bezelLine}`,borderRadius:"8px",padding:"7px 8px",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"7px",color:DV.inkDim,fontWeight:"bold"}}>
                <span>TOTAL CAPTURED</span><b style={{color:DV.phosphor}}>{found}/{total}</b>
              </div>
              <div style={{height:"5px",background:"#0a1712",borderRadius:"3px",overflow:"hidden",marginTop:"4px"}}>
                <div style={{height:"100%",background:DV.phosphor,width:`${(found/Math.max(total,1))*100}%`,transition:"width 0.4s"}} />
              </div>
            </div>
            <div style={{flexShrink:0}}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Search..."
                style={{width:"100%",background:"#08120d",border:`1px solid ${DV.bezelLine}`,borderRadius:"6px",padding:"4px 7px",color:DV.ink,fontFamily:DV_FONT_MONO,fontSize:"7px",outline:"none",boxSizing:"border-box"}}
              />
            </div>
            <div style={{flex:1,minHeight:0,display:"flex",flexDirection:"column",gap:"4px",overflowY:"auto"}}>
              {visibleTiers.map((t) => {
                const tList = grouped[t.key];
                const tFound = tList.filter((d) => discoveredSet.has(d.name)).length;
                const isActive = activeTab === t.key;
                return (
                  <button key={t.key} data-tier-key={t.key} onClick={handleTierTabClick} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:isActive?"#0a1712":"#08120d",border:`1px solid ${isActive?DV.phosphor:DV.bezelLine}`,borderRadius:"7px",padding:"6px 9px",cursor:"pointer",fontSize:"7.5px",color:isActive?DV.phosphor:DV.inkDim,fontWeight:"bold"}}>
                    <span>{t.label}</span><span style={{fontSize:"6.5px",opacity:0.8}}>{tFound}/{tList.length}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MAIN */}
          <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:"8px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"4px",flexShrink:0,flexWrap:"wrap"}}>
              <span style={{fontSize:"6.5px",color:DV.inkDim,letterSpacing:"1px",marginRight:"1px"}}>SORT</span>
              {[{key:"default",label:"Default"},{key:"name",label:"A–Z"},{key:"hp",label:"HP"},{key:"power",label:"PWR"}].map((opt) => {
                const isActive = sortBy === opt.key;
                return (
                  <button key={opt.key} data-sort-key={opt.key} onClick={handleSortClick} style={{fontSize:"6.5px",fontWeight:"bold",padding:"3px 8px",borderRadius:"6px",border:`1px solid ${isActive?DV.phosphor:DV.bezelLine}`,background:isActive?"#0a1712":"#08120d",color:isActive?DV.phosphor:DV.inkDim,cursor:"pointer",fontFamily:DV_FONT_MONO}}>{opt.label}</button>
                );
              })}
              <span style={{width:"1px",height:"12px",background:DV.bezelLine,margin:"0 2px"}} />
              <button
                onClick={handleToggleMissingOnly}
                title="Show only Digimon you haven't captured or hatched yet"
                style={{fontSize:"6.5px",fontWeight:"bold",padding:"3px 8px",borderRadius:"6px",border:`1px solid ${missingOnly?DV.amber:DV.bezelLine}`,background:missingOnly?"#2d2410":"#08120d",color:missingOnly?DV.amber:DV.inkDim,cursor:"pointer",fontFamily:DV_FONT_MONO}}
              >
                ❓ Missing
              </button>
            </div>
            <div style={{flex:1,minHeight:0,overflowY:"auto"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(48px, 1fr))",gap:"6px"}}>
                {sortedList.length === 0 && (
                  <p style={{gridColumn:"1 / -1",color:DV.inkDim,fontSize:"9px",fontStyle:"italic",textAlign:"center",padding:"14px 0"}}>{missingOnly ? "✅ Fully caught in this tier — nothing missing!" : "No Digimon match your search."}</p>
                )}
                {sortedList.map((d, i) => {
                  const isFound = discoveredSet.has(d.name);
                  const isSelected = selectedDigi && selectedDigi.name === d.name;
                  return (
                    <div key={i} data-name={d.name} onClick={handleSelectDigi} style={{background:"#08120d",border:`1px solid ${isSelected?DV.phosphor:DV.bezelLine}`,boxShadow:isSelected?`0 0 0 1px ${DV.phosphor}`:"none",borderRadius:"8px",padding:"5px 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",opacity:isFound?1:0.4,cursor:"pointer",transition:"opacity 0.2s"}}>
                      <div style={{width:"100%",aspectRatio:"1/1",borderRadius:"6px",background:"radial-gradient(circle at 50% 35%,#12241a,#081410 75%)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",filter:isFound?"none":"grayscale(1) brightness(0.35)"}}>
                        {isFound && d.imageUrl
                          ? <img src={d.imageUrl} alt={d.name} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}} />
                          : <span style={{fontSize:"17px"}}>❓</span>
                        }
                      </div>
                      <span style={{fontSize:"6px",fontWeight:"bold",color:isFound?DV.ink:DV.inkDim,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{d.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedDigi && (
              <div style={{flexShrink:0,background:"#08120d",border:`1px solid ${DV.phosphorDim}`,borderRadius:"8px",padding:"7px 10px",display:"flex",alignItems:"center",gap:"10px"}}>
                <div style={{width:"44px",height:"44px",flexShrink:0,borderRadius:"7px",background:"radial-gradient(circle at 50% 35%,#12241a,#081410 75%)",border:`1px solid ${DV.phosphorDim}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                  {selectedFound && selectedDigi.imageUrl
                    ? <img src={selectedDigi.imageUrl} alt={selectedDigi.name} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}} />
                    : <span style={{fontSize:"20px",filter:selectedFound?"none":"grayscale(1) brightness(0.4)"}}>{selectedFound ? "🟢" : "❓"}</span>
                  }
                </div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:"10px",fontWeight:"bold",color:DV.phosphor,letterSpacing:"0.5px"}}>{selectedDigi.name.toUpperCase()}</div>
                  <div style={{fontSize:"7.5px",color:DV.inkDim,marginTop:"3px"}}>
                    LEVEL: <b style={{color:DV.ink}}>{selectedDigi.level || "Unknown"}</b>
                    &nbsp;·&nbsp; STATUS: <b style={{color:selectedFound?DV.phosphor:"#ff9b8a"}}>{selectedFound ? "✓ Captured" : "❓ Undiscovered"}</b>
                    &nbsp;·&nbsp; HP: <b style={{color:DV.ink}}>{selectedFound ? selectedDigi.hp : "❓"}</b>
                    &nbsp;·&nbsp; PWR: <b style={{color:DV.amber}}>{selectedFound ? selectedDigi.power : "❓"}</b>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BestiaryModal;
