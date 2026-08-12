// ============================================================
// INVENTORY PANEL — compact tabbed Battle Items / Evolution Chips
// ============================================================
import React, {useState, useEffect, useCallback} from "react";
import {EVO_CHIP_KEYS, EVO_CHIP_TARGET_TIER, EVO_CHIP_LABEL} from "../DigimonRoulette";
import PaginatedGrid2x2 from "./PaginatedGrid2x2";

const InventoryPanel = React.memo(({inventory, digiCoin, phase, isVillainBattle, isWildBattle, isLegendaryBattle, onUseStrength, onUseEndurance, onUseEscape, highlightedEvoTier, onToggleEvoHighlight, evoChipKeys = EVO_CHIP_KEYS, evoChipTargetTier = EVO_CHIP_TARGET_TIER, evoChipLabel = EVO_CHIP_LABEL, compact = false, spacious = false}) => {
  const [tab, setTab] = useState("battle");
  const canEscape = phase === "combat" && !isVillainBattle && (isWildBattle || isLegendaryBattle);
  // ✅ Page state now lives here (not inside PaginatedGrid2x2) so the prev/next arrows can be
  // rendered up in the header, beside the "Inventory" title, instead of below the grid. Reset
  // to page 1 whenever the tab changes, since Battle Items and Evolution have separate item
  // counts/pages.
  const [page, setPage] = useState(0);
  useEffect(() => {setPage(0);}, [tab]);

  const CHIP_ROWS = [
    {key: "chipStrength", icon: "💪", label: "Strength Chip", count: inventory.chipStrength, onUse: onUseStrength, disabled: inventory.chipStrength <= 0 || phase !== "combat"},
    {key: "chipEndurance", icon: "🛡️", label: "Endurance Chip", count: inventory.chipEndurance, onUse: onUseEndurance, disabled: inventory.chipEndurance <= 0 || phase !== "combat"},
    {key: "escapePortal", icon: "🌀", label: "Escape Portal", count: inventory.escapePortal, onUse: onUseEscape, disabled: inventory.escapePortal <= 0 || !canEscape},
  ];
  const CHIP_ACTIONS = {chipStrength: onUseStrength, chipEndurance: onUseEndurance, escapePortal: onUseEscape};
  // ✅ Battle tab always has exactly 4 cards (Potion/Revive combo + the 3 chip rows above);
  // Evolution tab has one card per evoChipKeys entry. Used to size the header's page arrows.
  const activeItemCount = tab === "battle" ? (1 + CHIP_ROWS.length) : evoChipKeys.length;
  const totalPages = Math.max(1, Math.ceil(activeItemCount / 4));
  const safePage = Math.min(page, totalPages - 1);
  const goToPage = useCallback((p) => {
    const pages = Math.max(1, Math.ceil((tab === "battle" ? 4 : evoChipKeys.length) / 4));
    setPage(((p % pages) + pages) % pages);
  }, [tab, evoChipKeys.length]);
  const handlePrevPage = useCallback(() => goToPage(safePage - 1), [goToPage, safePage]);
  const handleNextPage = useCallback(() => goToPage(safePage + 1), [goToPage, safePage]);
  const handleTabClick = useCallback((e) => setTab(e.currentTarget.dataset.tab), []);
  const handleChipClick = useCallback((e) => {
    const key = e.currentTarget.dataset.chipKey;
    const fn = CHIP_ACTIONS[key];
    if (fn) fn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onUseStrength, onUseEndurance, onUseEscape]);
  const handleEvoClick = useCallback((e) => {
    const count = parseInt(e.currentTarget.dataset.count, 10) || 0;
    const tier = e.currentTarget.dataset.tier;
    if (count > 0 && onToggleEvoHighlight) onToggleEvoHighlight(tier);
  }, [onToggleEvoHighlight]);

  return (
    <div style={{background:"#0a1712",padding:compact?"4px":spacious?"20px":"10px",borderRadius:"12px",border:"1px solid #2c3a33",flexShrink:0}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:0}}>
        <span style={{fontSize:compact?"0.58rem":spacious?"1.3rem":"0.85rem",fontWeight:"bold",color:"#bfe8cf"}}>🎒 Inventory</span>
        <div style={{display:"flex",alignItems:"center",gap:compact?"4px":"6px"}}>
          {typeof digiCoin === "number" && <span style={{fontSize:compact?"0.58rem":spacious?"1.3rem":"0.85rem",fontWeight:"bold",color:"#ffb238"}}>🪙 {digiCoin}</span>}
          {totalPages > 1 && (
            <div style={{display:"flex",alignItems:"center",gap:"3px"}}>
              <button onClick={handlePrevPage} aria-label="Previous page" style={{background:"transparent",border:"1px solid #2c3a33",color:"#5f8c72",borderRadius:"5px",width:compact?"13px":spacious?"20px":"16px",height:compact?"13px":spacious?"20px":"16px",padding:0,fontSize:compact?"8px":spacious?"12px":"9px",lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
              <span style={{fontSize:compact?"6px":spacious?"11px":"8px",color:"#5f8c72",fontWeight:"bold",minWidth:compact?"14px":spacious?"24px":"18px",textAlign:"center"}}>{safePage+1}/{totalPages}</span>
              <button onClick={handleNextPage} aria-label="Next page" style={{background:"transparent",border:"1px solid #2c3a33",color:"#5f8c72",borderRadius:"5px",width:compact?"13px":spacious?"20px":"16px",height:compact?"13px":spacious?"20px":"16px",padding:0,fontSize:compact?"8px":spacious?"12px":"9px",lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
            </div>
          )}
        </div>
      </div>
      <div style={{display:"flex",gap:"4px",marginTop:compact?"3px":"5px",marginBottom:compact?"3px":"6px",alignItems:"stretch"}}>
        <button data-tab="battle" onClick={handleTabClick} style={{flex:1,height:compact?"16px":spacious?"46px":"26px",padding:0,fontSize:compact?"7px":spacious?"17px":"10px",fontWeight:"bold",borderRadius:"6px",border:`1px solid ${tab==="battle"?"#4dff8f":"#2c3a33"}`,background:tab==="battle"?"#0d2137":"transparent",color:tab==="battle"?"#4dff8f":"#5f8c72",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",whiteSpace:"nowrap"}}>Battle Items</button>
        <button data-tab="evo" onClick={handleTabClick} style={{flex:1,height:compact?"16px":spacious?"46px":"26px",padding:0,fontSize:compact?"7px":spacious?"17px":"10px",fontWeight:"bold",borderRadius:"6px",border:`1px solid ${tab==="evo"?"#b98bff":"#2c3a33"}`,background:tab==="evo"?"#221a2e":"transparent",color:tab==="evo"?"#b98bff":"#5f8c72",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",whiteSpace:"nowrap"}}>Evolution</button>
      </div>

      <div style={{paddingRight:"2px"}}>
        {tab === "battle" ? (
          <PaginatedGrid2x2 compact={compact} page={safePage} onPageChange={goToPage} hideNav items={[
            // ✅ Potion + Revive Potion combined into one card — both are used from a
            // Digimon's own Heal/Revive button rather than from here, so they share
            // a single "reference" card instead of taking up two separate slots.
            <div
              key="potion-revive"
              title="Used from a Digimon's Heal/Revive button"
              style={{background:"#050c08",border:"1px solid #2c3a33",borderRadius:"7px",padding:compact?"2px 5px":spacious?"7px 12px":"4px 8px",display:"flex",flexDirection:"column",justifyContent:"center",gap:compact?"1px":spacious?"3px":"1px",height:compact?"22px":spacious?"48px":"34px",minWidth:0,boxSizing:"border-box"}}
            >
              <span style={{display:"flex",alignItems:"center",gap:"3px",minWidth:0,lineHeight:1}}>
                <span style={{fontSize:compact?"8px":spacious?"16px":"11px",flexShrink:0}}>🧪</span>
                <span style={{fontSize:compact?"6.8px":spacious?"14px":"10px",color:"#bfe8cf",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Potion</span>
                <span style={{fontSize:compact?"6.8px":spacious?"14px":"10px",fontWeight:"bold",color:"#fff",flexShrink:0}}>{inventory.potion}</span>
              </span>
              <span style={{display:"flex",alignItems:"center",gap:"3px",minWidth:0,lineHeight:1}}>
                <span style={{fontSize:compact?"8px":spacious?"16px":"11px",flexShrink:0}}>✨</span>
                <span style={{fontSize:compact?"6.8px":spacious?"14px":"10px",color:"#bfe8cf",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Revive</span>
                <span style={{fontSize:compact?"6.8px":spacious?"14px":"10px",fontWeight:"bold",color:"#fff",flexShrink:0}}>{inventory.revivePotion}</span>
              </span>
            </div>,
            ...CHIP_ROWS.map((row) => {
              const isClickable = !!row.onUse && !row.disabled;
              return (
                <div
                  key={row.label}
                  data-chip-key={row.key}
                  onClick={isClickable ? handleChipClick : undefined}
                  style={{background:"#050c08",border:`1px solid ${isClickable?"#6c4fa3":"#2c3a33"}`,borderRadius:"7px",padding:compact?"2px 5px":spacious?"12px 14px":"7px 8px",display:"flex",alignItems:"center",gap:compact?"4px":spacious?"9px":"5px",height:compact?"22px":spacious?"48px":"34px",minWidth:0,boxSizing:"border-box",cursor:isClickable?"pointer":row.onUse?"not-allowed":"default",opacity:row.onUse&&row.disabled?0.5:1}}
                >
                  <span style={{fontSize:compact?"9px":spacious?"23px":"16px",flexShrink:0}}>{row.icon}</span>
                  <span style={{fontSize:compact?"6.8px":spacious?"15.5px":"10.5px",color:"#bfe8cf",flex:1,minWidth:0,lineHeight:"1.15",whiteSpace:"normal",wordBreak:"break-word"}}>{row.label}</span>
                  <span style={{fontSize:compact?"7.5px":spacious?"17px":"12.5px",fontWeight:"bold",color:isClickable?"#b98bff":"#fff",flexShrink:0}}>{row.count}</span>
                </div>
              );
            }),
          ]} />
        ) : (
          <PaginatedGrid2x2 compact={compact} page={safePage} onPageChange={goToPage} hideNav items={evoChipKeys.map((key) => {
            const count = inventory[key] || 0;
            const tier = evoChipTargetTier[key];
            const isActive = highlightedEvoTier === tier;
            return (
              <button
                key={key}
                data-tier={tier}
                data-count={count}
                onClick={handleEvoClick}
                disabled={count <= 0}
                style={{background:isActive?"#2d2410":"#050c08",border:`1px solid ${isActive?"#ffb238":"#2c3a33"}`,borderRadius:"9px",padding:compact?"2px 5px":spacious?"12px 14px":"7px 8px",display:"flex",alignItems:"center",gap:compact?"4px":spacious?"9px":"5px",height:compact?"22px":spacious?"48px":"34px",minWidth:0,boxSizing:"border-box",cursor:count>0?"pointer":"default",opacity:count>0?1:0.45,textAlign:"left"}}
              >
                <span style={{fontSize:compact?"9px":spacious?"23px":"16px",flexShrink:0}}>🧬</span>
                <span style={{fontSize:compact?"6.8px":spacious?"15.5px":"10.5px",color:isActive?"#ffb238":"#bfe8cf",flex:1,minWidth:0,lineHeight:compact?"1.12":"1.30",whiteSpace:"normal",wordBreak:"break-word"}}>{evoChipLabel[key]}</span>
                <span style={{fontSize:compact?"7.5px":spacious?"17px":"12.5px",fontWeight:"bold",color:"#fff",flexShrink:0}}>{count}</span>
              </button>
            );
          })} />
        )}
      </div>
    </div>
  );
});

export default InventoryPanel;
