// ============================================================
// SHOP PANEL — replaces the wheel in col-center when phase === "shop"
// ============================================================
import React, {useCallback} from "react";
import {DV, DV_FONT_MONO, DV_FONT_DISPLAY} from "../constants/theme";
import {SHOP_ITEMS} from "../DigimonRoulette";

const ShopPanel = React.memo(({digiCoin, onBuy, onLeave, shopItems = SHOP_ITEMS}) => {
  const handleBuyClick = useCallback((e) => {
    const key = e.currentTarget.dataset.itemKey;
    if (key && onBuy) onBuy(key);
  }, [onBuy]);
  return (
  <div style={{width:"100%",height:"100%",flexGrow:1,display:"flex",flexDirection:"column",gap:"6px",minHeight:0,fontFamily:DV_FONT_MONO}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:DV.panelDeep,border:`1px solid ${DV.amberDim}`,borderRadius:"9px",padding:"6px 10px",flexShrink:0}}>
      <span style={{fontFamily:DV_FONT_DISPLAY,fontSize:"10px",fontWeight:"bold",color:DV.amber,letterSpacing:"0.5px",textShadow:"0 0 8px rgba(255,178,56,0.5)"}}>🛒 DIGITAL SHOP</span>
      <span style={{fontSize:"11px",fontWeight:"bold",color:DV.amber}}>🪙 {digiCoin}</span>
    </div>
    <div style={{flexGrow:1,minHeight:0,overflowY:"auto",display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:"4px",paddingRight:"2px",alignContent:"start"}}>
      {shopItems.map((item) => {
        const affordable = digiCoin >= item.price;
        return (
          <div key={item.key} style={{background:DV.panelDeep,border:`1px solid ${DV.bezelLine}`,borderRadius:"7px",padding:"4px 5px",display:"flex",flexDirection:"column",gap:"1px",minWidth:0}}>
            <div style={{fontSize:"8px",fontWeight:"bold",color:DV.ink,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.icon} {item.label}</div>
            <div style={{fontSize:"6.3px",color:DV.inkDim,lineHeight:"1.25",flexGrow:1}}>{item.desc}</div>
            <button
              data-item-key={item.key}
              onClick={handleBuyClick}
              disabled={!affordable}
              style={{fontFamily:DV_FONT_MONO,fontSize:"8px",fontWeight:"bold",padding:"3px 0",marginTop:"1px",borderRadius:"5px",border:"none",cursor:affordable?"pointer":"not-allowed",background:affordable?DV.amber:"#2c3a33",color:affordable?"#0a1712":DV.inkDim}}
            >
              🪙 {item.price}
            </button>
          </div>
        );
      })}
    </div>
    <button onClick={onLeave} style={{flexShrink:0,padding:"9px 0",background:DV.panelDeep,color:DV.ink,border:`1px solid ${DV.bezelLine}`,borderRadius:"9px",fontWeight:"bold",cursor:"pointer",fontSize:"9px",fontFamily:DV_FONT_MONO,letterSpacing:"0.5px"}}>🚪 LEAVE SHOP</button>
  </div>
  );
});

export default ShopPanel;
