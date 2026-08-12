import React, {useEffect, useRef, useState, useMemo} from "react";
import {sfx} from "./utils/audio";

const Wheel = ({segments = [], colors = [], onSpinComplete, onSpinStart, size = 460, buttonContext = "", buttonClassName = "", disabled = false, compact = false, fastSpin = false}) => {
  const [currentRotation, setCurrentRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const rotationRef = useRef(0);
  const animFrameId = useRef(null);
  const startTimeRef = useRef(0);
  const durationRef = useRef(0);
  const startAngleRef = useRef(0);
  const totalRotationRef = useRef(0);
  const lastTickSegmentRef = useRef(-1);
  const spinSeedRef = useRef(0);
  const isSpinningRef = useRef(false); // 🔒 synchronous lock — React state alone isn't fast enough to block a rapid double-click

  // ✅ MOBILE PERF: updatePhysicsFrame below calls setCurrentRotation on every animation
  // frame (~60x/sec) while spinning, which re-renders this component. Without memoizing,
  // this angle geometry was being recomputed from scratch 60 times a second even though
  // `segments` itself only changes when the wheel's option set changes — a real chunk of
  // avoidable work during the one moment (the spin) where frame budget matters most.
  const configuredSegments = useMemo(() => {
    const totalWeight = segments.reduce((sum, s) => sum + (s.weight || 1), 0);
    let accumulatedAngle = 0;
    return segments.map((seg) => {
      const sliceAngle = ((seg.weight || 1) / totalWeight) * 360;
      const start = accumulatedAngle;
      const end = accumulatedAngle + sliceAngle;
      accumulatedAngle += sliceAngle;
      return {...seg, startAngle: start, endAngle: end, midAngle: start + (sliceAngle / 2)};
    });
  }, [segments]);

  const startPhysicsSpin = () => {
    // ✅ BUGFIX: isSpinningRef is set synchronously below, so even two click events fired back-to-back
    // (before React re-renders with isSpinning:true) can't both pass this guard and start two
    // overlapping spins — which was the root cause of duplicate floating damage numbers.
    if (isSpinningRef.current || disabled || segments.length === 0) return;
    isSpinningRef.current = true;
    setIsSpinning(true);
    if (onSpinStart) onSpinStart();

    // ✅ "Fast Spins" setting: flattens the normal 2.5–6s cinematic range down to a snappy
    // 2–3s. Revolutions are trimmed too (not just compressed into less time) — keeping the
    // full 4–12 revolution range at 1/2 the duration would nearly double the angular speed
    // and make the segments unreadable as they fly by.
    const chosenDuration = fastSpin ? (2000 + Math.random() * 1000) : (2500 + Math.random() * 3500);
    const minRevolutions = fastSpin ? 3 : 4;
    const maxRevolutions = fastSpin ? 7 : 12;
    const totalRevolutions = minRevolutions + Math.random() * (maxRevolutions - minRevolutions);
    const totalDegrees = totalRevolutions * 360;

    spinSeedRef.current = Math.random() * 360;

    startTimeRef.current = performance.now();
    durationRef.current = chosenDuration;
    startAngleRef.current = rotationRef.current % 360;
    totalRotationRef.current = totalDegrees + spinSeedRef.current;

    lastTickSegmentRef.current = -1;

    const updatePhysicsFrame = (now) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / durationRef.current, 1);
      const easeOutQuintic = 1 - Math.pow(1 - progress, 5);

      const nextRotation = (startAngleRef.current + (totalRotationRef.current * easeOutQuintic)) % 360;
      rotationRef.current = nextRotation;
      setCurrentRotation(nextRotation);

      const pointerAngle = (360 - (nextRotation % 360)) % 360;
      const currentSegmentIdx = configuredSegments.findIndex(
        (seg) => pointerAngle >= seg.startAngle && pointerAngle < seg.endAngle
      );

      if (currentSegmentIdx !== lastTickSegmentRef.current && currentSegmentIdx !== -1) {
        const remainingProgress = 1 - progress;
        const currentSpeedEst = (totalRotationRef.current / durationRef.current) * remainingProgress * 15;
        const pitchModifier = Math.min(1200, 600 + (currentSpeedEst * 10));
        if (remainingProgress > 0.05) sfx.playTick(pitchModifier);
        lastTickSegmentRef.current = currentSegmentIdx;
      }

      if (progress < 1) {
        animFrameId.current = requestAnimationFrame(updatePhysicsFrame);
      } else {
        setIsSpinning(false);
        isSpinningRef.current = false;
        cancelAnimationFrame(animFrameId.current);

        const finalPointerAngle = (360 - (rotationRef.current % 360)) % 360;
        const finalSelectedIdx = configuredSegments.findIndex(
          (seg) => finalPointerAngle >= seg.startAngle && finalPointerAngle < seg.endAngle
        );

        if (onSpinComplete && finalSelectedIdx !== -1) onSpinComplete(finalSelectedIdx);
      }
    };

    animFrameId.current = requestAnimationFrame(updatePhysicsFrame);
  };

  useEffect(() => {
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, []);

  const getLabelLines = (label) => {
    if (label.length <= 12) return [label, ""];
    const midIdx = Math.floor(label.length / 2);
    const spaceBefore = label.lastIndexOf(" ", midIdx);
    const spaceAfter = label.indexOf(" ", midIdx);
    let splitPoint = spaceBefore;
    if (spaceBefore === -1 || (spaceAfter !== -1 && (midIdx - spaceBefore > spaceAfter - midIdx))) {
      splitPoint = spaceAfter;
    }
    if (splitPoint === -1) return [label.slice(0, 11), label.slice(11)];
    return [label.slice(0, splitPoint).trim(), label.slice(splitPoint).trim()];
  };

  // ✅ MOBILE FIX: the pointer arrow sits at top:-20 relative to the wheel's own
  // box (an absolutely-positioned element outside its parent's layout flow), so
  // on a cramped landscape phone it was overlapping the announcement box sitting
  // above it. Compact mode shrinks the arrow and reserves a marginTop equal to
  // its own overhang so it has room to render without overlapping a sibling.
  const pointerWidth = compact ? 24 : 46;
  const pointerHeight = compact ? 20 : 40;
  const pointerTopOffset = compact ? -10 : -20;
  const wheelTopMargin = Math.abs(pointerTopOffset) + 4;

  return (
    <div style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%"}}>
      <div
        onClick={startPhysicsSpin}
        style={{
          position: "relative",
          width: size, height: size,
          marginTop: `${wheelTopMargin}px`,
          cursor: (isSpinning || disabled) ? "not-allowed" : "pointer",
          WebkitTapHighlightColor: "transparent",
          outline: "none"
        }}
      >
        {/* Pointer arrow */}
        <svg
          width={pointerWidth} height={pointerHeight} viewBox="0 0 28 24"
          style={{position: "absolute", top: pointerTopOffset, left: "50%", transform: "translateX(-50%)", zIndex: 10, pointerEvents: "none"}}
        >
          <polygon points="14,22 2,2 26,2" fill="#e74c3c" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>

        <svg
          viewBox="0 0 200 200" width={size} height={size}
          style={{transform: `rotate(${currentRotation}deg)`, width: "100%", height: "100%", willChange: "transform"}}
        >
          {configuredSegments.map((seg, i) => {
            const rad1 = ((seg.startAngle - 90) * Math.PI) / 180;
            const rad2 = ((seg.endAngle - 90) * Math.PI) / 180;
            const x1 = 100 + 96 * Math.cos(rad1);
            const y1 = 100 + 96 * Math.sin(rad1);
            const x2 = 100 + 96 * Math.cos(rad2);
            const y2 = 100 + 96 * Math.sin(rad2);
            const sliceSize = seg.endAngle - seg.startAngle;
            const largeArcFlag = sliceSize > 180 ? 1 : 0;
            const textRad = ((seg.midAngle - 90) * Math.PI) / 180;
            const labelX = 100 + 56 * Math.cos(textRad);
            const labelY = 100 + 56 * Math.sin(textRad);
            const labelRotation = seg.midAngle + 90;
            const [line1, line2] = getLabelLines(seg.label);

            return (
              <g key={i}>
                <path
                  d={`M100,100 L${x1},${y1} A96,96 0 ${largeArcFlag} 1 ${x2},${y2} Z`}
                  fill={colors[i % colors.length] || "#444"}
                  stroke="#16171d" strokeWidth="1.5"
                />
                {line2 ? (
                  <text
                    x={labelX} y={labelY} fill="#fff" fontSize="7.2" fontWeight="900" textAnchor="middle"
                    transform={`rotate(${labelRotation}, ${labelX}, ${labelY})`}
                  >
                    <tspan x={labelX} dy="-3.5">{line1}</tspan>
                    <tspan x={labelX} dy="7.5">{line2}</tspan>
                  </text>
                ) : (
                  <text
                    x={labelX} y={labelY} fill="#fff" fontSize="8.5" fontWeight="900" textAnchor="middle"
                    transform={`rotate(${labelRotation}, ${labelX}, ${labelY})`}
                    dy="2"
                  >
                    {line1}
                  </text>
                )}
              </g>
            );
          })}
          <circle cx="100" cy="100" r="14" fill="#16171d" stroke="#333" strokeWidth="2" />
        </svg>
      </div>

      {/* ✅ The visible "ACTIVATE CHANCE WHEEL"-style button was removed — the wheel
          graphic itself is already clickable via the onClick above. This stays in
          the DOM only so the existing Space-key shortcut (which looks up .spin-btn)
          keeps working; it renders with zero size/visibility and isn't reachable by touch. */}
      <button
        onClick={startPhysicsSpin}
        disabled={isSpinning || disabled}
        className={`spin-btn ${buttonClassName}`}
        aria-hidden="true"
        tabIndex={-1}
        style={{position: "absolute", width: 0, height: 0, padding: 0, margin: 0, border: "none", overflow: "hidden", opacity: 0, pointerEvents: "none"}}
      />
    </div>
  );
};

export default Wheel;
