"use client";
import { useState, CSSProperties } from "react";
import { RotateCcw, X, AlarmClock } from "lucide-react";

interface Props {
  answering: boolean;
  hasMoreCards: boolean;
  onSkipOption: (option: "back" | "remove" | "snooze", snoozeHours?: number) => void;
}

const itemStyle: CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "9px 14px", background: "none", border: "none",
  cursor: "pointer", width: "calc(100% - 8px)", textAlign: "left",
  fontFamily: "var(--font-sans)", color: "var(--text)",
  borderRadius: 8, transition: "background 0.15s ease",
  margin: "0 4px",
};

export default function SkipMenu({ answering, hasMoreCards, onSkipOption }: Props) {
  const [open, setOpen] = useState(false);

  const handleOption = (option: "back" | "remove" | "snooze", hours?: number) => {
    setOpen(false);
    onSkipOption(option, hours);
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 10, position: "relative" }}>
      <button
        onClick={() => !answering && setOpen(p => !p)}
        disabled={answering}
        style={{
          background: "none", border: "none", cursor: answering ? "default" : "pointer",
          fontSize: 12, fontWeight: 700,
          color: open ? "var(--text-dim)" : "var(--text-muted)",
          padding: "4px 12px", borderRadius: 20,
          opacity: answering ? 0.4 : 1,
          transition: "color 0.15s",
        }}
        onMouseEnter={e => { if (!answering) (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
      >
        Skip ↑
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 200 }} />
          <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", zIndex: 201 }}>
            <div style={{ transform: "translateX(-50%)" }}>
              <div style={{
                background: "var(--bg-card)", border: "2px solid var(--border)", borderRadius: 14,
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                minWidth: 230, overflow: "hidden",
                animation: "popIn 0.18s cubic-bezier(0.34,1.56,0.64,1)",
              }}>
                <div style={{ padding: "8px 4px 4px", display: "flex", flexDirection: "column" }}>

                  {hasMoreCards && (
                    <button
                      onClick={() => handleOption("back")}
                      style={itemStyle}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                    >
                      <RotateCcw size={15} style={{ flexShrink: 0, color: "var(--text-dim)" }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13 }}>Move to back</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>See it again later this session</div>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => handleOption("remove")}
                    style={itemStyle}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                  >
                    <X size={15} style={{ flexShrink: 0, color: "var(--text-dim)" }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>Hide indefinitely</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Won&apos;t appear unless re-added</div>
                    </div>
                  </button>

                  <div style={{ margin: "4px 12px", borderTop: "1.5px solid var(--border)" }} />
                  <div style={{ padding: "4px 14px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
                      <AlarmClock size={11} style={{ color: "var(--text-muted)" }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        Snooze for…
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {([ ["1h", 1], ["4h", 4], ["1 day", 24], ["3 days", 72] ] as [string, number][]).map(([label, hrs]) => (
                        <button
                          key={label}
                          onClick={() => handleOption("snooze", hrs)}
                          style={{
                            fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 12,
                            padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                            border: "2px solid var(--border)",
                            background: "var(--bg)", color: "var(--text-dim)",
                            transition: "all 0.12s",
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = "var(--purple)";
                            (e.currentTarget as HTMLElement).style.color = "var(--purple)";
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                            (e.currentTarget as HTMLElement).style.color = "var(--text-dim)";
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
