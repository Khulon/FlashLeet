"use client";
import { RefObject } from "react";
import { Flame, Sparkles } from "lucide-react";
import { Question, CardState } from "@/lib/types";
import DifficultyBadge from "@/components/DifficultyBadge";
import ProgressBadge from "@/components/ProgressBadge";

const CARD_HEIGHT = 340;

interface Props {
  // Drag wrapper refs (managed by swipe system in parent)
  cardWrapRef: RefObject<HTMLDivElement>;
  knowLabelRef: RefObject<HTMLDivElement>;
  dontLabelRef: RefObject<HTMLDivElement>;
  // Pointer handlers (mouse — touch is registered imperatively in parent)
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: () => void;
  isDragging: boolean;
  // Card state
  flipped: boolean;
  hasFlippedOnce: boolean;
  currentQ: Question;
  cardState: CardState | undefined;
  // Notes (back face)
  notes: string;
  onNotesChange: (n: string) => void;
  // AI
  hasAiKey: boolean;
  aiLoadingNotes: boolean;
  aiError: string | null;
  onGenerateNotes: () => void;
  onClearAiError: () => void;
  // Problem modal trigger
  onOpenModal: () => void;
}

export default function FlashCard({
  cardWrapRef, knowLabelRef, dontLabelRef,
  onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
  isDragging, flipped, hasFlippedOnce,
  currentQ, cardState,
  notes, onNotesChange,
  hasAiKey, aiLoadingNotes, aiError, onGenerateNotes, onClearAiError,
  onOpenModal,
}: Props) {
  return (
    <>
      {/* Swipe labels — opacity driven imperatively via refs in parent */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, height: 32, alignItems: "center", pointerEvents: "none" }}>
        <div ref={dontLabelRef} style={{
          background: "var(--red-lt)", color: "var(--red-dk)", borderRadius: 20, padding: "5px 16px",
          fontWeight: 900, fontSize: 12, border: "2px solid var(--red-dk)", opacity: 0,
        }}>← Don&apos;t Know</div>
        <div ref={knowLabelRef} style={{
          background: "var(--green-lt)", color: "var(--green-dk)", borderRadius: 20, padding: "5px 16px",
          fontWeight: 900, fontSize: 12, border: "2px solid var(--green-dk)", opacity: 0,
        }}>Know It →</div>
      </div>

      {/* Drag wrapper — transform applied imperatively by swipe system */}
      <div
        ref={cardWrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{
          transformOrigin: "bottom center",
          transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          willChange: "transform",
          touchAction: "pan-y",
          position: "relative",
          cursor: isDragging ? "grabbing" : "default",
          userSelect: "none",
        }}
      >
        {/* Swipe tint overlays */}
        <div id="swipe-tint-know" style={{ position: "absolute", inset: 0, borderRadius: "var(--radius)", zIndex: 10, pointerEvents: "none", background: "transparent" }} />
        <div id="swipe-tint-dont" style={{ position: "absolute", inset: 0, borderRadius: "var(--radius)", zIndex: 10, pointerEvents: "none", background: "transparent" }} />

        {/* 3D flip shell */}
        <div style={{ perspective: "1400px" }}>
          <div style={{
            position: "relative",
            height: CARD_HEIGHT,
            transformStyle: "preserve-3d",
            transition: "transform 0.55s cubic-bezier(0.4,0.2,0.2,1)",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}>

            {/* ── FRONT ── */}
            <div className="card-surface" style={{
              position: "absolute", inset: 0,
              backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
              padding: "24px 24px 20px",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  <DifficultyBadge difficulty={currentQ.difficulty} />
                  {cardState && <ProgressBadge state={cardState.progress} />}
                  {(cardState?.successStreak ?? 0) > 0 && (
                    <span style={{ background: "var(--yellow-lt)", color: "#c47c00", fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 2 }}>
                      <Flame size={12} />×{cardState!.successStreak}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>#{currentQ.id}</span>
              </div>

              <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 10, lineHeight: 1.25 }}>{currentQ.title}</h1>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                {currentQ.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
              </div>

              {/* Problem preview — tap opens modal */}
              <div
                data-no-drag="true"
                onClick={e => { e.stopPropagation(); onOpenModal(); }}
                style={{
                  flex: 1, background: "var(--bg)", borderRadius: 10, padding: "12px 14px",
                  cursor: "pointer", overflow: "hidden", position: "relative",
                  border: "2px solid transparent", transition: "border-color 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--text-dim)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}
              >
                <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.55, margin: 0 }}>
                  {currentQ.description.replace(/\n+/g, " ").slice(0, 160)}
                  {currentQ.description.length > 160 ? "…" : ""}
                </p>
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, height: 44,
                  background: "linear-gradient(transparent, var(--bg))",
                  display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
                  padding: "0 10px 8px",
                }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "var(--purple)" }}>View full →</span>
                </div>
              </div>
            </div>

            {/* ── BACK ── */}
            <div className="card-surface" style={{
              position: "absolute", inset: 0,
              backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              padding: "24px 24px 20px",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <DifficultyBadge difficulty={currentQ.difficulty} />
                <span style={{ fontWeight: 900, fontSize: 14 }}>{currentQ.title}</span>
              </div>

              {aiError && (
                <div data-no-drag="true" style={{
                  background: "var(--red-lt)", border: "2px solid var(--red)", borderRadius: 8,
                  padding: "8px 12px", marginBottom: 10, fontSize: 12, color: "var(--red-dk)",
                  fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span>⚠️ {aiError}</span>
                  <button data-no-drag="true" onClick={onClearAiError} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 900, color: "var(--red-dk)", padding: "0 4px" }}>✕</button>
                </div>
              )}

              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Notes
                  </label>
                  {hasAiKey && (
                    <button
                      data-no-drag="true"
                      onClick={e => { e.stopPropagation(); onGenerateNotes(); }}
                      disabled={aiLoadingNotes}
                      style={{
                        fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 11,
                        padding: "4px 10px", borderRadius: 20, cursor: "pointer",
                        border: "2px solid var(--purple)", background: "var(--purple-lt)", color: "var(--purple)",
                        opacity: aiLoadingNotes ? 0.6 : 1,
                      }}
                    >
                      {aiLoadingNotes ? "…" : <><Sparkles size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }} />AI</>}
                    </button>
                  )}
                </div>
                <textarea
                  data-no-drag="true"
                  value={notes}
                  onClick={e => e.stopPropagation()}
                  onChange={e => onNotesChange(e.target.value)}
                  placeholder={hasAiKey ? "Your notes, or click AI to generate…" : "Key insights, patterns, complexity…"}
                  style={{ flex: 1, width: "100%", padding: "9px 12px", fontSize: 12, lineHeight: 1.6, resize: "none", minHeight: 0 }}
                />
              </div>

              {!hasAiKey && (
                <div data-no-drag="true" style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textAlign: "center" }}>
                  <a href="/settings" style={{ color: "var(--purple)", fontWeight: 800 }}>Add AI key in Settings</a> to auto-generate notes &amp; code
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
