"use client";
import { Question } from "@/lib/types";
import DifficultyBadge from "@/components/DifficultyBadge";

interface Props {
  question: Question;
  onClose: () => void;
}

export default function ProblemModal({ question: q, onClose }: Props) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(26,31,54,0.5)",
          backdropFilter: "blur(3px)", zIndex: 1100,
          animation: "fadeIn 0.15s ease",
        }}
      />
      <div style={{
        position: "fixed", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1101, pointerEvents: "none",
      }}>
        <div style={{
          pointerEvents: "auto",
          width: "min(640px, calc(100vw - 32px))",
          maxHeight: "80vh",
          background: "var(--bg-card)", borderRadius: 20,
          border: "2px solid var(--border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
          animation: "popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          {/* Header */}
          <div style={{
            padding: "18px 22px 14px", borderBottom: "2px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <DifficultyBadge difficulty={q.difficulty} />
              <span style={{ fontWeight: 900, fontSize: 16 }}>{q.title}</span>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 16,
                background: "var(--bg-2)", border: "2px solid var(--border)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 900, color: "var(--text-dim)",
              }}
            >✕</button>
          </div>

          {/* Body */}
          <div style={{ overflow: "auto", padding: "18px 22px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "var(--bg)", borderRadius: 10, padding: "14px 16px" }}>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, color: "var(--text-dim)", lineHeight: 1.7, margin: 0 }}>
                {q.description}
              </pre>
            </div>

            {q.examples.map((ex, i) => (
              <div key={i} style={{ background: "var(--bg)", borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Example {i + 1}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)", lineHeight: 1.8 }}>
                  <div><b style={{ color: "var(--text-muted)" }}>Input: </b>{ex.input}</div>
                  <div><b style={{ color: "var(--text-muted)" }}>Output: </b>{ex.output}</div>
                  {ex.explanation && <div style={{ color: "var(--text-muted)", marginTop: 3 }}>{ex.explanation}</div>}
                </div>
              </div>
            ))}

            {q.constraints.length > 0 && (
              <div style={{ background: "var(--bg)", borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Constraints
                </div>
                {q.constraints.map((c, i) => (
                  <div key={i} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)", lineHeight: 1.9 }}>
                    <span style={{ color: "var(--purple)", marginRight: 8 }}>•</span>{c}
                  </div>
                ))}
              </div>
            )}

            {q.follow_up && (
              <div style={{ background: "var(--purple-lt)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "var(--purple)", fontWeight: 600 }}>
                Follow-up: {q.follow_up}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
