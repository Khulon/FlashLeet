"use client";
import { useRef } from "react";

interface Props {
  /** Number of injected slots (0–10) */
  left: number;
  /** Number of injected + due slots (left–10) */
  right: number;
  onChange: (left: number, right: number) => void;
}

export default function DualRangeSlider({ left, right, onChange }: Props) {
  const trackRef   = useRef<HTMLDivElement>(null);
  // Always-current refs so drag closures never see stale values
  const leftRef    = useRef(left);
  const rightRef   = useRef(right);
  const onChangeRef = useRef(onChange);
  leftRef.current    = left;
  rightRef.current   = right;
  onChangeRef.current = onChange;

  const snapToVal = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const { left: tLeft, width } = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - tLeft) / width));
    return Math.round(pct * 10);
  };

  const startDrag = (which: "left" | "right") => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();

    const handleMove = (me: PointerEvent) => {
      const val = snapToVal(me.clientX);
      if (which === "left") {
        onChangeRef.current(Math.min(val, rightRef.current), rightRef.current);
      } else {
        onChangeRef.current(leftRef.current, Math.max(val, leftRef.current));
      }
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup",   handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup",   handleUp);
  };

  const leftPct  = `${left * 10}%`;
  const rightPct = `${right * 10}%`;
  const THUMB_SIZE = 22;

  return (
    <div style={{ position: "relative", height: THUMB_SIZE, userSelect: "none" }}>
      {/* Track */}
      <div
        ref={trackRef}
        style={{
          position: "absolute",
          top: "50%", left: 0, right: 0,
          height: 8,
          transform: "translateY(-50%)",
          borderRadius: 4,
          background: "var(--bg-2)",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: leftPct, background: "var(--purple)" }} />
        <div style={{ position: "absolute", left: leftPct, top: 0, bottom: 0, width: `${(right - left) * 10}%`, background: "#ff9f43" }} />
        <div style={{ position: "absolute", left: rightPct, top: 0, bottom: 0, right: 0, background: "var(--green)" }} />
      </div>

      {/* When both knobs are at position 10, only the left thumb can move — bring it to the front */}
      {(() => {
        const bothAtMax = left === right && left === 10;
        return (
          <>
            <Thumb pct={left / 10}  color="var(--purple)" size={THUMB_SIZE} zIndex={bothAtMax ? 2 : 1} onPointerDown={startDrag("left")}  />
            <Thumb pct={right / 10} color="#ff9f43"        size={THUMB_SIZE} zIndex={bothAtMax ? 1 : 2} onPointerDown={startDrag("right")} />
          </>
        );
      })()}
    </div>
  );
}

function Thumb({ pct, color, size, zIndex, onPointerDown }: {
  pct: number; color: string; size: number; zIndex: number;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        left: `${pct * 100}%`,
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: size, height: size,
        borderRadius: "50%",
        background: color,
        border: "3px solid #fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
        cursor: "grab",
        touchAction: "none",
        zIndex,
      }}
    />
  );
}
