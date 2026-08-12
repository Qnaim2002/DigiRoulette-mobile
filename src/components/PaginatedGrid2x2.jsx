// ============================================================
// PAGINATED 2x2 GRID — always renders as a 2-column x 2-row grid; if more than
// 4 items are handed in, they're chunked into pages of 4 and the player can
// swipe left/right (touch) or tap the arrow buttons / dots to turn pages.
// ============================================================
import React, {useState, useRef, useEffect} from "react";

const PaginatedGrid2x2 = ({items, compact = false, gap, page: controlledPage, onPageChange, hideNav = false}) => {
  const [internalPage, setInternalPage] = useState(0);
  const isControlled = controlledPage !== undefined && !!onPageChange;
  const page = isControlled ? controlledPage : internalPage;
  const setPage = isControlled ? onPageChange : setInternalPage;
  const touchStartX = useRef(null);
  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  // ✅ Reset to page 1 whenever the item SET changes (e.g. switching Battle Items <-> Evolution
  // tabs) — keyed off item count since that's what actually changes between tabs here. Only
  // applies in uncontrolled mode; a controlled parent is responsible for its own reset.
  useEffect(() => {if (!isControlled) setInternalPage(0);}, [items.length, isControlled]);

  const goTo = (p) => setPage(((p % totalPages) + totalPages) % totalPages);
  const handleTouchStart = (e) => {touchStartX.current = e.touches[0].clientX;};
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 28) return;
    goTo(safePage + (dx < 0 ? 1 : -1));
  };

  const pageItems = items.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div>
      <div
        onTouchStart={totalPages > 1 ? handleTouchStart : undefined}
        onTouchEnd={totalPages > 1 ? handleTouchEnd : undefined}
        style={{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gridTemplateRows:"repeat(2, 1fr)",gap: gap ?? (compact?"2px":"5px"),touchAction: totalPages > 1 ? "pan-y" : undefined}}
      >
        {pageItems.map((item, i) => <React.Fragment key={item.key ?? i}>{item}</React.Fragment>)}
      </div>
      {!hideNav && totalPages > 1 && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:compact?"4px":"6px",marginTop:compact?"3px":"5px"}}>
          <button onClick={() => goTo(safePage - 1)} aria-label="Previous page" style={{background:"transparent",border:"1px solid #2c3a33",color:"#5f8c72",borderRadius:"5px",width:compact?"14px":"18px",height:compact?"14px":"18px",padding:0,fontSize:compact?"8px":"10px",lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <div style={{display:"flex",gap:"4px"}}>
            {Array.from({length: totalPages}, (_, p) => (
              <button key={p} onClick={() => goTo(p)} aria-label={`Page ${p+1}`} style={{width:"5px",height:"5px",borderRadius:"50%",padding:0,border:"none",background: p===safePage ? "#4dff8f" : "#2c3a33",cursor:"pointer"}} />
            ))}
          </div>
          <button onClick={() => goTo(safePage + 1)} aria-label="Next page" style={{background:"transparent",border:"1px solid #2c3a33",color:"#5f8c72",borderRadius:"5px",width:compact?"14px":"18px",height:compact?"14px":"18px",padding:0,fontSize:compact?"8px":"10px",lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        </div>
      )}
    </div>
  );
};

export default PaginatedGrid2x2;
