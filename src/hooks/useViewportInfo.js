import {useState, useEffect} from "react";

// ============================================================
// SHARED VIEWPORT HOOK — used by the main menu, gameplay screen, and
// modals so every screen reacts the same way to a short landscape
// viewport (phones in landscape are wide but often only ~330-420px tall).
// ============================================================
export function useViewportInfo() {
  const [width, setWidth] = useState(window.innerWidth);
  const [height, setHeight] = useState(window.innerHeight);
  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);
  // ✅ Width now also triggers compact mode, not just height — a narrow-but-tall window
  // (resized desktop browser, an unusual foldable state, a small phone held at an angle)
  // used to fall through to "normal" sizing purely because it wasn't SHORT, even though it
  // was too narrow for normal sizing to fit without collisions.
  // ✅ isSpacious mirrors GameCore's own tablet/desktop tier, exposed here too so the main
  // menu (which lives outside GameCore and can't see its local consts) can size up instead
  // of staying pinned at phone dimensions on a big screen.
  return {width, height, isCompactLandscape: height <= 500 || width <= 620, isSpacious: height >= 820 && width >= 900};
}
